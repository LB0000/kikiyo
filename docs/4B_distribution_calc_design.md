# 要望#4 / 4-B 多段分配計算ロジック 詳細設計（2026-06-25）

> 4-A（マイグレ032〜038）完成を前提に、計算をどう実装するかの設計。
> 中核は冪等RPC `recalculate_distributions(p_monthly_report_id)`。
> **%の掛け方（並列(あ)/カスケード(い)）は発注元回答待ち** → 039 の戦略関数に隔離し、回答後に1〜2行差替で切替。

## 設計方針
- 月次レポート単位で `csv_data` 元本（`payment_bonus × monthly_reports.rate`）を `distribution_rules`＋`agencies.commission_rate` で各 payee へ分配し `distributions` にスナップショット保存。
- **冪等**（当該月を DELETE+INSERT 再生成）。何度呼んでも安全。
- 既存4経路（import / `update_exchange_rate` / `update_commission_rate` / `update_liver_agency`）は**無改変**、後段で本RPCを呼ぶ。既存 `agency_reward_jpy`（代理店本体請求＝invoices経路）には**一切触れない**。
- 並列/カスケード切替を **039 の `calc_distribution_amount` / `calc_distribution_base`（各数行）に物理隔離**。中核RPC（040）は不変。

## マイグレ・コード分割
| ファイル | 目的 |
|---|---|
| `039_distribution_calc_helpers.sql` | 率解決 `get_distribution_rate(...)` ＋ 戦略関数 `calc_distribution_amount/base(...)`（並列/カスケード切替の唯一の隔離点） |
| `040_recalculate_distributions.sql` | 中核RPC（admin限定・冪等・`SECURITY DEFINER SET search_path=public`） |
| `041_wire_recalc_into_existing_rpcs.sql` | 既存3RPC末尾に `PERFORM recalculate_distributions(...)` 追記（ロジック本体は不変） |
| `042_distributions_replace_cleanup.sql` | import置換時の孤児確認（036の `ON DELETE CASCADE` で自動・明示検証） |
| `src/lib/actions/distributions.ts`（新規） | `recalculateDistributions(monthlyReportId)` Server Action（admin検証＋rpc呼出） |
| `src/lib/actions/dashboard.ts`（修正） | import成功直後（L946後）に recalc を1回 await（warnハンドリング） |
| `src/lib/supabase/types.ts`（追従） | `distributions`/`distribution_rules` Row型・RPCシグネチャ・`PayeeKind` union |

## 中核RPC ロジック（040）
1. admin ガード（既存4本と同一）＋ `monthly_reports` を `FOR UPDATE` ロック、`rate` 取得（NULLなら何もしない）。
2. 当該月の `distributions` を全DELETE（冪等再生成）。
3. `csv_data.manager_id` を `manager_agencies` から無条件同期（キャッシュ。真実は `manager_agencies`）。
4. source_agency 単位で元本集計 `gross = ROUND(SUM(payment_bonus) × rate, 2)`。
5. source ごとに段階ループ:
   - tier=1 マネージャー分配（`distribution_rules` payee_kind='manager'）→ `v_running` 加算
   - tier=2 三次代理店分配（`agency_hierarchy` で source の子を辿り payee_kind='agency'）→ `v_running` 加算
   - `total_side = gross − v_running` を1行INSERT（**残差吸収＝元本一致を保証**）
6. スカウト分配（別軸）: `liver_scouts` 経由。**スカウト報酬 = Σ(担当ライバー payment_bonus) × rate × scout率**。常に元本ベース（並列固定）。代理店分配と非合算・total_side残差に寄与しない。請求書は出さず distributions 明細のみ（トータルサイド集約は集計側で扱う）。

各明細: `base_amount_jpy`（計算に使ったbase）、`applied_rate`（スナップショット）、`amount_jpy = ROUND(base × rate, 2)`。

## 既存経路への接続（041 + Server Action）
- **SQL内 PERFORM を採用**（既存RPCと同一トランザクション＝原子性、複数月波及の呼び漏れ防止、RLSコンテキスト継承）。
  - exchange_rate: 末尾に `PERFORM recalculate_distributions(p_monthly_report_id)`。
  - commission_rate / liver_agency: 影響月のみループ（`SELECT DISTINCT monthly_report_id WHERE agency_id=対象 AND IS NOT NULL`）。
- **import経路のみ Server Action 呼び出し**（import本体はTSバッチINSERTでSQL差込先がないため）。csv_data INSERT後に1回 await、失敗は warn（次回再計算で復旧）。

## 丸め・残差
- `amount_jpy = ROUND(base × rate, 2)`。source集計は合計後丸め（`ROUND(SUM(payment_bonus)×rate,2)`）。
- 元本一致: `Σ(amount WHERE source=X) = gross(X)`。丸め誤差は total_side が吸収。スカウトは別軸（一致対象外）。

## 検証（数値シナリオ：rate=15, A元本=$300→4500円, M率0.30/三次B率0.20/scout S率0.05, S担当=L1($100→1500円)）
| payee | tier | 並列(あ) amount | カスケード(い) amount |
|---|---|---|---|
| Manager M | 1 | ROUND(4500×0.30)=1350 | ROUND(4500×0.30)=1350 |
| 三次代理店 B | 2 | ROUND(4500×0.20)=900 | ROUND((4500−1350)×0.20)=630 |
| total_side | 1 | 4500−1350−900=2250 | 4500−1350−630=2520 |
| **source A 合計** | | **4500** ✓ | **4500** ✓ |
| Scout S（別軸） | 1 | ROUND(1500×0.05)=75 | 75（同値） |

- **pgTAP**（`supabase/tests/distributions_test.sql`）第一選択: 上表をアサート＋冪等性（2回実行で不変）＋率変更後の当月反映/過去月非遡及＋合計一致。並列/カスケード両方の期待値テーブルを先行作成し回答後に有効化。
- アプリ統合テスト・手動突合クエリで補完。カバレッジ80%+。

## リスク（抜粋）
- R2 丸め誤差→ total_side 残差吸収で恒久保証。R3 既存 agency_reward と二重管理→ distributions は invoices に非干渉、境界コメント明記。R4 SECURITY DEFINER で RLS バイパス→ 書込はRPC内のみ・読取は037のSELECTポリシーで担当分限定。R5 孤児→ `ON DELETE CASCADE`。R6 性能→ distributions行数は数十〜数百、影響月のみループ。R9 仕様未確定→ 039の2関数に隔離。

## 成功基準
冪等／全sourceで合計一致／切替が039の2関数差替のみ／スカウト非合算式／既存4経路の `agency_reward_jpy` 無変化／率変更は当月のみ非遡及／孤児なし／admin以外は拒否／テスト80%+。

## 未確定対応
- %の掛け方（あ/い）: 039 戦略関数に隔離。回答到着で該当関数本体のみ差替。両方式の pgTAP 先行作成。
- 前提（確定済み）: スカウト計算単位＝`liver_scouts`、total_side＝起点（実体なし・明細集約・請求書なし）。
