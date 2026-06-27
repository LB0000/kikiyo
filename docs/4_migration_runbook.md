# 要望#4 マイグレーション適用ランブック（本番反映）

> 対象: マネージャー単位管理（4-A〜4-D）の DB 変更。**未適用**のため本番 Supabase へまとめて適用する。
> ローカル PG16 で 032→042 の全適用＋計算/ RLS を実機検証済み（2026-06-27）。

## 0. 前提・確認
- 本番に **029（`csv_data.payment_bonus` 追加）・031（RPC を payment_bonus ベースへ）** が適用済みか確認する。
  040/041 は `payment_bonus` 列に依存。未適用なら 029・031 を先に適用する。
- 適用状況の確認（Supabase SQL Editor 等）:
  ```sql
  -- 既存列の有無
  SELECT 1 FROM information_schema.columns WHERE table_name='csv_data' AND column_name='payment_bonus';
  -- 既存マイグレ管理表があれば
  SELECT version FROM supabase_migrations.schema_migrations ORDER BY version;
  ```

## 1. 適用順序（必ずこの順）
032 → 033 → 034 → 035 → 036 → 037 → 038 → 039 → 040 → 041 → 042

- **032 は単独で適用すること**（`ALTER TYPE ... ADD VALUE` はトランザクション内で直後に使用不可）。
  新ロールを参照する 037 は別ファイルに分離済み＝この順序を守れば問題ない。
- `supabase db push` は各ファイルを個別トランザクションで流すため、この順序のまま安全。
- SQL Editor で手動適用する場合も **1ファイルずつ** 実行する（特に 032 を単独で）。

## 2. 適用方法（いずれか）

### A. supabase CLI（推奨）
```bash
# プロジェクト参照は NEXT_PUBLIC_SUPABASE_URL の https://<ref>.supabase.co の <ref>
supabase link --project-ref <ref>        # 初回のみ。DBパスワードを要求される
supabase db push                          # supabase/migrations/ を順に適用
```
> DBパスワードは .env に無い（APIキーのみ）。**ユーザー本人が**入力すること。

### B. Supabase ダッシュボード SQL Editor
`supabase/migrations/032_*.sql` 〜 `042_*.sql` を**番号順に1つずつ**貼り付けて実行。

## 3. 適用後の検証
```bash
# pgTAP（要 pgtap 拡張）
supabase db test            # supabase/tests/distributions_test.sql を実行
```
または手動突合: 任意の月次レポートで
```sql
SELECT recalculate_distributions('<monthly_report_id>');
SELECT payee_kind, source_agency_id, base_amount_jpy, applied_rate, amount_jpy
FROM distributions WHERE monthly_report_id='<id>' ORDER BY source_agency_id, payee_kind;
-- 各 source で SUM(amount WHERE payee_kind<>'scout') = ROUND(SUM(payment_bonus)*rate,2) を確認
```

## 4. %の掛け方（発注元 v5 回答後）
- 現状デフォルトは **並列(あ)**。`039` の `calc_distribution_base` 1関数に隔離。
- 回答が **カスケード(い)** なら `039` の本体を `RETURN p_gross - p_running;` に差し替えて再適用
  （`CREATE OR REPLACE` のため 039 を再実行するだけ）し、当該月を `recalculate_distributions` で再生成。
- `supabase/tests/distributions_test.sql` のカスケード期待値（コメント）を有効化して再検証。

## 5. 初期データ登録（4-E・適用後）
管理 UI（次フェーズ）まではマスタを手動 INSERT:
- `managers` / `scouts`（必要なら `user_id` に代表者の auth ユーザー）
- `manager_agencies`（agency_id → manager_id）/ `scout_agencies` / `liver_scouts`
- `distribution_rules`（agency_id × payee_kind × 率）
- 登録後、対象月で `recalculate_distributions(<id>)` を実行して明細生成。

## ローカル検証サマリ（2026-06-27, postgresql@16）
- 032→042 全11ファイルが順に適用成功（enum=4値、041の再配線RPC含む全関数作成）。
- 計算: 並列で manager/三次/total_side/scout = 期待値一致・元本一致・冪等。
- RLS: マネージャーは担当代理店のみ（livers/csv_data/agencies/distributions）、total_side 不可視。スカウトは自分の明細のみ。CASCADE 削除で孤児なし。
