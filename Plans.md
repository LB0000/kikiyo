# 開発計画 (Plans.md)

> **SoT**: このファイルがタスク計画の信頼できる情報源。
> **現行コードベース**: `tiktok-live-tool/` (Next.js 16 + Supabase)
> **Bubble版 (`tiktoklivetool.bubble`)**: ⛔ 開発停止。移行元の参考用のみ。新機能・修正は一切Bubble側に入れない。

最終更新: 2026-05-30

---

## 現状サマリ

| レイヤ | 状態 |
|---|---|
| プラットフォーム移行 (Bubble → Next.js) | ✅ 完了（本番運用中） |
| 認証・RLS | ✅ 実装済み（親代理店階層自動同期トリガーあり） |
| 代理店／ライバー／ダッシュボード／返金／特別ボーナス／申請／請求書 | ✅ 実装済み |
| TikTok申請機能の2026ルール対応（チケット4種・million_special削除・異議申し立て拡充） | ✅ 完了（下部アーカイブ参照） |
| **3月ルール変更に伴う推定ボーナス項目の刷新** | ✅ コード・デプロイ・マイグレ029適用済（過払いなし。3月データ未取込） |
| **代理店登録: 会社名／契約者氏名の追加** | ✅ コード・デプロイ済（マイグレ030 + 発注元判断反映）。残: 既存6件の値入力・030適用最終確認 |
| **ログイン画面エラー（ERR_CONNECTION_RESET）** | ✅ コード側2件修正・デプロイ済。残: 発注元の再現確認 |

---

## 📋 デプロイ・検証ステータス（2026-05-30 調査）

PDF要望#1〜#3（＝「2週間約束の修正」）の実体を、git / Vercel / Supabase で裏取りした結果。

### 確定事項
- **コード**: 3要望とも実装・コミット済み。`origin/main` に push 済み（未pushなし）。
- **Vercel**: プロジェクト `kikiyo`（team: LIBEO's projects）。**最新の本番デプロイ = `311ce83`（HEAD）、state READY、target production**。
  - `0daf6f9`（推定ボーナス2026.3）/ `f33e38b`（会社名）/ ログイン修正 `3f886c6` すべて本番にLIVE。
- **Supabase マイグレ029**: ✅ **適用済み**（本番DBの `csv_data` に `payment_bonus` / `bonus_ranked_up` / `bonus_incremental_revenue` 列が存在しデータを返すことを診断SQLで確認）。
- **過払い（要望#2の最大リスク）**: ✅ **発生なし**。
  - 本番に入っているのは 202511 / 202512 / 202601 / 202602 の**旧ルール4か月のみ**。旧ルールに売上増加項目はなく `estimated_bonus = payment_bonus` が正常。
  - **3月（202603）以降は未取込**。新コードLIVE後に取り込めば最初から正しく計算される。

### 残タスク（コードではなく運用）
- [ ] **R2** 発注元に「ログアウト→再ログインを複数回」の再現確認を依頼（要望#3クローズ条件）
- [ ] **R3** 既存代理店6件に会社名・契約者氏名を管理画面から入力 ＋ マイグレ030の適用最終確認
- [x] **R5** 3月（202603）データを取込 → ✅ 2026-06-02 取込・検算完了（下記参照）

### R5 検算結果（2026-06-02）
3月（202603）データを本番に取込み、仕様書 `3月タスク（システムへ反映項目）.xlsx` と突合。**完全一致・過払いなし**。
- 行数 42 / Σ支払ボーナス(payment_bonus) = 206.7666 / Σ売上増加 = 290.067 / Σ推定ボーナス実値 = 496.8336（検算: 206.7666+290.067=496.8336 ✓）
- 金額が出る4人（yu59042=198.675 / 2002__ak=3.8253 / yu__nnnnnn=3.6317 / fukuoka_caffe=0.6346）も個別一致
- レート150。実支払 = payment_bonus×150（売上増加は支払に含まれない＝旧挙動なら約43,510円の過払いだったが回避）

### UI監査と権限マスク修正（2026-06-02）
ダッシュボード表示・サマリ・請求書・権限を4観点で並列監査。表示/計算/請求書は仕様通り（payment_bonusベース、契約者氏名はPDF非印字 等）で問題なし。1件のセキュリティ不備を修正:
- **修正内容**: `getDashboardData`（dashboard.ts）で、代理店ユーザー向けに `estimated_bonus`・`bonus_incremental_revenue`（売上増加）をサーバー側で 0 にマスク。従来は画面・CSVのみ adminOnly で隠れていたが、Server Action のレスポンスを直接読むと取得できる状態だった。管理者は従来通り元の値を取得。
- **併せて修正**: `data-table.tsx` の `detectIsNewRule` の判定キーから `bonus_incremental_revenue` を除外。マスクとの干渉で「①②⑤が全行0かつ売上増加のみの月」に管理者=新UI／代理店=旧UIと割れるリグレッションを解消。
- 検証: tsc / eslint / next build 全クリーン。
- **残論点（受容・将来対応）**:
  1. DB SELECT には2列が残る（DB→サーバー間は流れる）。多層防御として代理店向けSELECTから2列除外も可（MEDIUM、必須でない）。
  2. RLSが行単位のため、代理店ユーザーが anon key でブラウザから直接 `csv_data` を叩く経路は残存。完全防御にはビュー or 列単位権限が必要（情報の機微度しだいで判断）。

### 診断SQL（過払い検査・再利用可、読み取り専用）
Supabase → SQL Editor で実行。判定列が「✅新コードで取込済み」なら正常、「⚠️旧コード取込の疑い」は新ルール月（2026.3以降）の行でのみ要注意。
```sql
SELECT mr.data_month AS 月, mr.rate AS レート, COUNT(*) AS 行数,
  ROUND(SUM(c.estimated_bonus)::numeric,2) AS 推定ボーナス合計,
  ROUND(SUM(c.payment_bonus)::numeric,2) AS 支払ボーナス合計,
  ROUND(SUM(c.bonus_ranked_up+c.bonus_maintained_tiers+c.bonus_off_platform_2026_03)::numeric,2) AS 新列合計_①②⑤,
  ROUND(SUM(c.bonus_incremental_revenue)::numeric,2) AS 売上増加合計,
  ROUND(SUM(c.total_reward_jpy)::numeric,0) AS 実支払額合計,
  CASE WHEN SUM(c.bonus_ranked_up+c.bonus_maintained_tiers+c.bonus_off_platform_2026_03)>0 THEN '✅ 新コードで取込済み（正常）'
       WHEN SUM(c.estimated_bonus)=SUM(c.payment_bonus) THEN '⚠️ 旧コード取込の疑い（3月分なら要再取込）'
       ELSE '要確認' END AS 判定
FROM monthly_reports mr JOIN csv_data c ON c.monthly_report_id = mr.id
GROUP BY mr.id, mr.data_month, mr.rate ORDER BY mr.data_month;
```
2026-05-30 実行結果: 202511〜202602 の4か月のみ／全て旧ルールで正常／過払いなし。

> **未登録の別スコープ**: 2026-05 の会議で出た「グループ単位→マネージャー単位の管理移行」「代理店50%/スカウト10%/マネージャー40%の報酬分配ロジック改修」「マネージャー管理画面・代理店/スカウト管理ページ新設」は、本Plans.mdの要望#1〜#3とは別の大型スコープ（別見積もり・オーナー承認待ち）。着手時に「要望#4」として追記する。

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
- [ ] **1-1** マイグレ新規 (`030_add_agency_company_info.sql`)
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

### 発注元決定（2026-04-27 受領）
- **Q1-1 → 案B**: 代理店一覧の主表示は **会社名**。Backstageグループ名は副表示として併記（CSV紐付けキーのため admin の識別性を維持）
- **Q1-2 → 載せない**: 請求書PDFには **契約者氏名は表示しない**。データフィールドは管理用に保持し続ける（将来再表示の可能性に備える）

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

### 発注元決定（2026-04-27 受領）
- **Q2-1 → 案C**: CSVダウンロードは **管理者は売上増加・実Estimated bonus含む／代理店は含まない**。実装は `data-table.tsx` の visibleColumns で adminOnly フィルタ済み（追加対応不要）
- **Q2-2 → 案A**: 過去分（2026.2以前）は **旧UI・旧項目のまま表示**。3月分から新UIに自動切替。実装は `detectIsNewRule` ベースで列セット出し分け済み（追加対応不要）

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

## 優先度と進め方（2026-05-30 更新）

実装・デプロイは要望#1〜#3とも完了。残りは運用タスクのみ。

| 順 | タスク | 状態 | 根拠 |
|---|---|---|---|
| 1 | 要望#3 発注元に再現確認依頼（R2） | ⬜ 未 | コード・デプロイ済。あとは発注元確認でクローズ |
| 2 | 3月（202603）データ取込（R5） | ⬜ 未 | 新コードLIVE済、取込めば正しく計算される |
| 3 | 要望#1 既存代理店6件の会社名入力＋030適用確認（R3） | ⬜ 未 | データ入力作業。ローリスク |
| 4 | 要望#3 E2E回帰テスト追加（ログイン→ログアウト→再ログイン） | ⬜ 任意 | ログイン系の安定性担保 |

> 実装タスク（2-1〜2-9 / 1-1〜1-10 / B-1〜B-2）は各セクションのチェックリスト上は未チェックのままだが、コミット `0daf6f9`（要望#2）/ `f33e38b`+`311ce83`（要望#1）/ `3f886c6`（要望#3）で**実装・本番デプロイ済み**。チェックボックスは履歴記録として残置。

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
