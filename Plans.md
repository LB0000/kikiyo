# 開発計画 (Plans.md)

> **SoT**: このファイルがタスク計画の信頼できる情報源。
> **現行コードベース**: `tiktok-live-tool/` (Next.js 16 + Supabase)
> **Bubble版 (`tiktoklivetool.bubble`)**: ⛔ 開発停止。移行元の参考用のみ。新機能・修正は一切Bubble側に入れない。

最終更新: 2026-04-24

---

## 現状サマリ

| レイヤ | 状態 |
|---|---|
| プラットフォーム移行 (Bubble → Next.js) | ✅ 完了（本番運用中） |
| 認証・RLS | ✅ 実装済み（親代理店階層自動同期トリガーあり） |
| 代理店／ライバー／ダッシュボード／返金／特別ボーナス／申請／請求書 | ✅ 実装済み |
| TikTok申請機能の2026ルール対応（チケット4種・million_special削除・異議申し立て拡充） | ✅ 完了（下部アーカイブ参照） |
| **3月ルール変更に伴う推定ボーナス項目の刷新** | 🔴 **未着手（要対応）** |
| **代理店登録: 会社名／契約者氏名の追加** | 🔴 **未着手（要対応）** |
| **ログイン画面エラー（ERR_CONNECTION_RESET）** | 🟢 コード側2件修正適用済・ステージング検証待ち |

---

## 入力資料（プロジェクトルート `../` 配下）

- `修正事項等（ご相談）(1).pdf` — 発注元の要望書（3項目）
- `3月タスク（システムへ反映項目）.xlsx` — 推定ボーナス項目マッピング仕様（①〜⑤＋非表示＋実値）
- `_Task_202603_UTC+0_2026_04_12_13_54_07.xlsx` — 2026.3実データサンプル（Backstageダウンロード）

---

## 🔴 要望#1: 代理店登録／請求書の改修 (PDF項目①)

### 背景
Backstageのグループ名（`kikiyo@onishi` / `KOOL` / `ききよ` / `CANDY` / `VENKEI` 等）をそのまま代理店名として登録しており、それが請求書の宛名に出てしまう。
請求書には「会社名」と「契約者氏名」を別枠で持たせたい。

### 現状スキーマ
```
agencies:
  name                       TEXT  -- Backstageグループ名が入っている
  representative_name        TEXT  -- 012マイグレで追加。用途はいまは「代表者名」
  company_address            TEXT  -- あり
  (invoice関連、銀行情報)       あり

invoices:  -- 発行時スナップショット
  agency_name                TEXT
  agency_address             TEXT
  agency_representative      TEXT
```

### 不足フィールド
- `agencies.company_name` (例: 「KIKIYO合同会社」)
- `agencies.contract_person_name` (契約者氏名)
- invoicesスナップショット側も `agency_company_name` / `agency_contract_person_name` を追加

### タスク
- [ ] **1-1** マイグレ新規 (`028_add_agency_company_info.sql`)
  - `agencies` に `company_name TEXT`, `contract_person_name TEXT` 追加
  - `invoices` に `agency_company_name TEXT`, `agency_contract_person_name TEXT` 追加（スナップショット）
- [ ] **1-2** `src/lib/supabase/types.ts` 手動反映
- [ ] **1-3** `src/lib/validations/agency.ts` に2フィールドのZodスキーマ追加
- [ ] **1-4** `src/app/(dashboard)/agencies/_components/agency-form-dialog.tsx` 入力欄追加
  - 会社名・契約者氏名（任意入力）
  - 既存データへの後方互換: 空の場合は `name` を fallback
- [ ] **1-5** `src/lib/actions/agencies.ts` 登録/更新アクションに2フィールド追加
- [ ] **1-6** `src/lib/actions/invoices.ts` 請求書作成時、`agencies.company_name` / `contract_person_name` をスナップショット
- [ ] **1-7** `src/lib/pdf/invoice-pdf.ts` 宛名ロジック改修
  - 宛名（御中）: `agency_company_name || agency_name`
  - 会社名の下もしくは適切な位置に契約者氏名を表示（レイアウト要相談）
  - `InvoicePdfData` 型に2フィールド追加
- [ ] **1-8** `src/app/(dashboard)/invoices/_components/invoice-detail-dialog.tsx` の表示更新
- [ ] **1-9** 既存代理店6件（kikiyo@onishi / KOOL / ききよ / CANDY / VENKEI / test代理店）への値投入手順メモ
- [ ] **1-10** E2E: 代理店フォーム・請求書プレビュー

### 要相談（発注元へ）
- 請求書レイアウト上の「契約者氏名」の置き位置（宛名の下 / 請求書備考欄 / 別欄）
- `name` と `company_name` が両方ある場合、一覧画面ではどちらを第一表示にするか
  - 案: 一覧は `name`（Backstageグループ名）、請求書宛名だけ `company_name`

---

## 🔴 要望#2: 3月ルール変更 — 推定ボーナス項目の刷新 (PDF項目②)

### 背景
TikTok Backstage側でボーナス項目の構造が2026.3から変わった。

- **旧ルール (〜2026.2)**: Rookie milestones / Revenue scale / Activeness / Off-platform
- **新ルール (2026.3〜)**: Ranked up / Maintained tiers / Activeness incentive / Off-platform / Off-platform (2026.3) / Incremental revenue

支払い対象は ①〜⑤ の合計のみ。売上増加（Incremental revenue）は**社内参照のみで代理店には見せず、支払いにも含めない**。

### 2026.3 CSVフィールド対応表

| # | Backstage CSV ヘッダー | UI表示名 | 支払 | 代理店表示 |
|---|---|---|---|---|
| ① | `Estimated bonus - Ranked up` | ランクアップインセンティブ | ✅含む | ✅ |
| ② | `Estimated bonus - Maintained tiers` | ランク維持 | ✅含む | ✅ |
| ③ | `Estimated bonus - Activeness incentive` | アクティブ度インセンティブ | ✅含む | ✅ |
| ④ | `Estimated bonus - Off-platform creator task` | 新優良クリエイタータスク | ✅含む | ✅ |
| ⑤ | `Estimated bonus - Off-platform creator task (2026.3)` | 他社プラットフォームクリエイター | ✅含む | ✅ |
| — | `Estimated bonus - Incremental revenue incentive` | 売上増加 | ❌含まず | ❌**非表示** |
| — | `Estimated bonus` (列名のまま) | 実際の推定ボーナス | — | ❌**非表示** |

**支払ボーナス = ① + ② + ③ + ④ + ⑤** （`Estimated bonus` 列は使わない！）

### 既知の不具合／危険箇所

1. **過払いリスク**: `src/lib/actions/dashboard.ts:407` で CSV の `Estimated bonus` 列（= ①〜⑤ + 売上増加）を `estimated_bonus` としてDB投入し、`:716-718` でそのまま報酬・代理店報酬の計算に使用している。**売上増加分だけ過払い**になる。
2. **④⑤混線リスク**: `dashboard.ts:431` の `getByPartial("off-platform")` は `Off-platform creator task` と `Off-platform creator task (2026.3)` の**最初にマッチしたほうだけ**を拾うため、5列目が無視される。
3. **列が足りない**: DB (`csv_data`) に `Ranked up` / `Maintained tiers` / `Incremental revenue` / `Off-platform (2026.3)` 用の列が存在しない。旧列（`bonus_rookie_*`, `bonus_revenue_scale`）は2026.3以降使われない。

### タスク

#### 2-A. スキーマ改修
- [ ] **2-1** マイグレ新規 (`029_bonus_fields_2026_03.sql`)
  - `csv_data` に追加:
    - `bonus_ranked_up NUMERIC DEFAULT 0` (①)
    - `bonus_maintained_tiers NUMERIC DEFAULT 0` (②)
    - `bonus_off_platform_2026_03 NUMERIC DEFAULT 0` (⑤)
    - `bonus_incremental_revenue NUMERIC DEFAULT 0` (売上増加、非表示用)
    - `payment_bonus NUMERIC DEFAULT 0` (支払ボーナス = ①〜⑤合計、派生値だがDB保存してクエリ効率化)
  - 旧列 `bonus_rookie_*` / `bonus_revenue_scale` は**削除しない**（過去データ保存）
  - `update_exchange_rate` 関数が `estimated_bonus` を参照していれば、`payment_bonus` ベースに切替

#### 2-B. CSVパーサ
- [ ] **2-2** `dashboard.ts` `parseCsv` を新列対応に改修
  - 部分一致マップを厳密化: `"ranked up"` / `"maintained tier"` / `"activeness"` / `"off-platform creator task (2026.3)"` / `"off-platform creator task"` （完全一致で4列目 vs 5列目を区別）／ `"incremental revenue"`
  - ④と⑤の衝突対策: `Off-platform creator task (2026.3)` を先にマッチ、残りのoff-platform列を④にする順序ロジック
- [ ] **2-3** `importCsvData` 投入ロジックを新列対応
  - `payment_bonus = bonus_ranked_up + bonus_maintained_tiers + bonus_activeness + bonus_off_platform + bonus_off_platform_2026_03`
  - 総支払計算（`total_reward_jpy`, `agency_reward_jpy`）は `payment_bonus × rate` ベースに変更
  - CSV上の `Estimated bonus` 列は `estimated_bonus` に保存継続（社内参照用）
  - 旧列（rookie_*, revenue_scale）は新CSVでは0として投入

#### 2-C. 表示
- [ ] **2-4** `dashboard-client.tsx` / `data-table.tsx` で新ボーナス列を表示
  - 管理者: ①〜⑤ + 売上増加 + 合計 + 実際の推定ボーナス（参考）すべて表示
  - 代理店ユーザー: ①〜⑤ + 支払ボーナス合計のみ（売上増加は非表示、実ボーナス列も非表示）
- [ ] **2-5** CSVエクスポート (`csv-export.ts`) も同じ権限ルールで列制御
- [ ] **2-6** 月次サマリ表示（ダッシュボードのカード）を支払ボーナスベースに統一
- [ ] **2-7** 請求書金額を `payment_bonus × rate × commission_rate` ベースに修正

#### 2-D. バックフィル（任意）
- [ ] **2-8** 2026.3以降のレポートを再インポートして新列を埋める（要決裁）

#### 2-E. ドキュメント
- [ ] **2-9** `AGENTS.md` のボーナスフィールドマッピング表を2026.3ルールに書き換え
  - 旧表は「〜2026.2」として残す（歴史記録）
  - 新表を追加
  - `estimated_bonus` と `payment_bonus` の使い分けを明文化

### 要相談（発注元へ）
- CSVダウンロードで代理店側に渡す場合、売上増加と実際の推定ボーナスを**完全に消す**か、管理者DL用と代理店DL用で分けるか
- 過去分（2026.2以前）のボーナス表示を旧列のまま残すか、統合テーブルに寄せるか（現推奨: 旧列はそのまま保存＆旧レポートは旧UI、新レポートから新UIに切替）

---

## 🟢 要望#3: システムログイン画面エラー (PDF項目③) — コード側修正適用済

### 症状（ユーザー報告）
- Backoffice → システム初回アクセスは成功
- 一度ログアウトすると次回から `ERR_CONNECTION_RESET`「このページに到達できません」
- 環境: Microsoft Edge

### コードレビューで発見した実装バグ（2件・修正済）

調査メモ: `../tmp/20260424_ログインエラー調査メモ.md`

- [x] **B-1** ブラウザ側 `supabase.auth.signOut()` のみで HTTP Cookie が残存
  - `src/components/shared/app-sidebar.tsx` をサーバーアクション呼び出しに変更
  - `src/lib/actions/auth.ts` に `signOutAction()` 追加（`cookies()` API で `sb-*` / `supabase` Cookie を明示削除 + `redirect("/login")`）
- [x] **B-2** ミドルウェアのリダイレクト時に `supabaseResponse` の Set-Cookie が欠落
  - `src/lib/supabase/middleware.ts` に `redirectWithCookies` ヘルパー追加
  - Supabase 公式警告「browser and server go out of sync」パターンの是正

いずれも `npx tsc --noEmit` / `npx eslint` / `npm run build` 全てクリーン。

### 残タスク

- [ ] **3-1** ステージングへデプロイ
- [ ] **3-2** 発注元に再現確認依頼（logout → re-login を複数回）
- [ ] **3-3** 再現しなければクローズ。再現すればQ3-1〜Q3-6の切り分けへ
- [ ] **3-4** E2E: ログイン→ログアウト→再ログインの回帰テスト追加（`e2e/auth.spec.ts` 想定）

### 切り分けチェックリスト（再現時に発注元へ確認）
`../tmp/20260424_発注元への確認事項.md` に送付用フォーム済み。
- **3-Q1** 接続先URL
- **3-Q2** 他ブラウザでの再現
- **3-Q3** プライベートブラウジングでの再現
- **3-Q4** 他ユーザーでの再現
- **3-Q5** 発生タイミング
- **3-Q6** 接続元ネットワーク

### 残留仮説（B-1/B-2 修正後も再現する場合に調査）
1. Edgeの企業プロキシキャッシュ（他ブラウザで再現しなければこちら）
2. Supabase Auth の Site URL / Redirect URL 許可リスト設定
3. ミドルウェアを `getSession()` → `getUser()` に変更（Supabase公式推奨）
4. `middleware` → `proxy` リネーム（Next.js 16 警告対応、関連は低いが近々対応したい）

---

## 優先度と進め方

| 順 | タスク | 着手可否 | 根拠 |
|---|---|---|---|
| 1 | 要望#3 ステージング検証 + 発注元に再現確認依頼 | コード修正済 | 早めに閉じる |
| 2 | 要望#2 スキーマ改修 (マイグレ029ドラフト済) | 即時 | 3月支払に直結、過払いリスクあり |
| 3 | 要望#2 CSVパーサ・計算ロジック改修 | 2-1後 | |
| 4 | 要望#2 表示・CSV出力権限分け | 2-3後 | |
| 5 | 要望#1 マイグレ028 + UI改修 | 即時〜並行可 | データ変更はローリスク |
| 6 | 要望#3 E2E回帰テスト追加 | 並行可 | ログイン系の安定性担保 |

---

## 📦 完了済みアーカイブ

### TikTok申請機能 修正計画 (〜2026.4) — ✅ 完了

PDF「TikTok申請について」に基づく修正。以下すべて完了。

関連コミット: `0a63e62` (申請フォーム改修), `78b73e3` (チケット種類ドロップダウン化), `f3a9a4d` (バッジ色別), `8484671` (異議申し立て拡充), `0e2de1f` (レビュー指摘対応), マイグレ `027_remove_million_special_form_tab.sql`。

- [x] Phase 1: ラベル変更（「事務所（所属）登録申請」「所属解除（退所）申請」）
- [x] Phase 2-A: `million_special` 削除（constants / validation / マイグレ027）
- [x] Phase 2-B: チケット4種類（一般／ゴールドチケット／フォロワー多数クリエイター／プレミアム）を `affiliation_check` の `form_data.ticket_type` に統合。ドロップダウン＋バッジ色別
- [x] Phase 3: 異議申し立てフォームのフィールド拡充（チェックボックス項目追加）
- [x] Phase 4: ビルド確認／E2E／サーバーバリデーション強化

### Bubble → Next.js 基盤移行 — ✅ 完了

Bubble版（`tiktoklivetool.bubble`）は参考用アーカイブとして凍結。すべての現行開発は `tiktok-live-tool/` のNext.js版で行う。URL路径・RLS厳格化・申請編集制限・代理店カスケード回避など差分は `AGENTS.md` 参照。
