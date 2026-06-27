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
| **ログイン画面エラー（ERR_CONNECTION_RESET）** | ✅ 完了（2026-06-11 発注元が再現確認「完了済み」と回答、クローズ） |

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
- [x] **R2** 発注元に「ログアウト→再ログインを複数回」の再現確認を依頼 → ✅ 2026-06-11 発注元「完了済み」回答。**要望#3クローズ**
- [x] **R3** 既存代理店の会社名を入力 ＋ マイグレ030の適用最終確認 → ✅ 2026-06-04 完了
  - ✅ マイグレ030 適用済み確認（agencies に company_name / contract_person_name 列が存在）
  - ✅ 発注元から会社名受領 → 既存5件に投入（全角スペース統一）:
    - kikiyo@onishi → 「スカウト　大西皇」
    - VENKEI → 「VENKEI　株式会社」
    - CANDY → 「CANDY店　大木新太朗」
    - ききよ → 「KIKIYO　合同会社」
    - KOOL → 「KOOL　横内優一朗」
  - contract_person_name は発注元指定なしのため空のまま（請求書PDFには元々印字しない管理用）
  - test代理店は対象外（null のまま）
- [ ] **R6** トータルサイド（株式会社トータルサイド）を新規代理店として登録
  - 代理店テーブルに未登録。createAgency 仕様上、会社名のほかに ①ログイン用メール ②Backstageグループ名（CSV Group 列と一致）③手数料率 ④親代理店有無 が必要
  - 正式ルートは管理画面「代理店追加」（認証ユーザー・RLS・階層が正しくセットされる）。SQL直INSERTは不完全になるため非推奨
  - 🕓 発注元に上記4点を確認待ち
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

### コードレビュー指摘の記録（2026-06-04、code-reviewer / security-reviewer の2観点）
コミット `d6111a0` をレビュー。CRITICAL 0件。今回のマスク修正は目的（Server Action経由の漏洩遮断）を達成し後退なし。
- ✅ **対応済**: [HIGH] `DashboardData` 型の `estimated_bonus`/`bonus_incremental_revenue` に「代理店には0で返る」JSDoc追記。旧ルールマスクの意図＋RLS残存経路をコメント明記（次コミット）。
- ⬜ **将来対応（保留）**:
  - [MEDIUM/sec] 直接クエリ経路（anon keyで`csv_data`直クエリ）の根本対応＝View化 or RLSサービスロール限定（DB設計変更・中〜大）。
  - [MEDIUM] `detectIsNewRule` の別エッジケース: ①②⑤全0で③activenessのみの新ルール月は旧UI判定になりうる。堅牢化は `data_month >= "202603"` の月ベース判定（設計変更）。
  - [MEDIUM] `isAdmin`（`user.role === "system_admin"`）が dashboard.ts と dashboard/page.tsx に分散。`isSystemAdmin()` ヘルパー化を推奨。
  - [LOW] `commission_rate` は代理店が自分のものを直接クエリで閲覧可。機密扱いか仕様確認。
  - [LOW] `CsvDataRow`（data-table.tsx）が `DashboardData['csvRows'][number]` と重複。名前付き型へ切り出し推奨。
  - テスト: getDashboardData の role別マスク（agency時0／admin時実値）のユニットテスト追加を推奨。

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
- [x] **3-2** 発注元に再現確認依頼（logout → re-login を複数回）→ ✅ 2026-06-11 発注元確認済み
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

## 🟡 要望#4: マネージャー単位管理への移行（2026-05〜06 会議2回分）

> 出典: 2026-05 / 2026-06 の2回のZoom会議。**追加開発費 約20万円で合意**（Kouyama44＝企業側へ請求）。
> 別スコープ（要望#1〜#3とは独立）。仕様の最終確定はオーナー承認・Kouyama44/kana 確認待ちの項目が残る。

### 背景・目的
- 現状は Backstage の「グループ単位」（kikiyo@onishi / KOOL / CANDY 等）で管理。これを「マネージャー単位」の管理へ移行し、手作業の報酬計算を自動化する。
- Backstage 側ではグループとマネージャーのID分離は不可（kana が TikTok に確認済み）→ **アプリ側で紐付け・分配を持つ**。

### 確定した報酬フロー（2026-06 会議）
```
KIKIYO（企業）
  └─ トータルサイド（統括）へ全額支払い
       └─ そこからマネージャー報酬を計算・分配
            └─ 代理店 / スカウト / Kouyama44側 へ分配
                 └─ （クールの下に）三次代理店があれば同方式でさらに1段分配
```
- Backstage から取り込むのは**報酬データのみ**に統一。グループ／マネージャーの構造は**システム側がマスタとして保持**（Backstage のグループ分けに依存しない）。
- 紐付けは**ライバーID（liver_id）ベースで月次に積み分け**。初期登録は手動。マネージャー変更時もシステム上で統一管理。
- 管理パーセンテージは代理店の育成要件で変動しうる。

### 現状コードのギャップ（2026-06-06 調査・3観点並列）
- **ロールは `system_admin` / `agency_user` の2種のみ** → `manager_user`（マネージャー専用ログイン）が必要。
- **報酬は1対1**（1ライバー→1代理店→1 `commission_rate`、`agency_reward_jpy = payment_bonus × rate × commission_rate`）→ **多段・多者の階層分配が無い**。
- **「マネージャー」はDBエンティティとして存在しない**。`csv_data.group_manager`（Backstage の Group manager 列）は**保存only・未使用** → 活用 or マスタ化の余地。
- **`agency_hierarchy`（親子）は閲覧権限の伝播のみ**で報酬には無関与 → 階層分配に使うなら計算ロジック側の新規実装が必要。
- **`liver_agencies`（多対多）はスキーマのみ・コード未使用** → 多代理店紐付けの土台にはなる。
- **請求書は `UNIQUE(agency_id, monthly_report_id)`＝1代理店1請求書** → 代理店/スカウト/マネージャーへ別発行するなら制約・設計変更。
- `commission_rate` の本番値: CANDY=0.1 / KOOL=0.5 / ききよ=1.0 / kikiyo@onishi=0.2 / VENKEI=0.0（代理店取り分率）。

### 実装フェーズ（たたき台。最終工数は仕様確定後）
- **4-A. データモデル**: ✅詳細設計完了（2026-06-24）→ **[docs/4A_data_model_design.md](docs/4A_data_model_design.md)**。要点: 分配先は案B（`managers`/`scouts` 独立テーブル＋代理店は既存 `agencies` 再利用、`payee_kind` enum＋排他的アークCHECK）／固定マスタは案②（現在値上書き＋change_log、確定値は `distributions` スナップショット）／マイグレ **032〜038** に分割（032 enum追加は単独Tx必須）。`user_role` に `manager_user`＋`scout_user` 追加。`csv_data.manager_id` は派生・任意列。
  - ✅ **マイグレ 032〜038 作成完了・database-reviewer 2回実施・指摘反映済み（2026-06-24）**。
    - 032〜036: テーブル定義＋管理者RLS（値域CHECK・監査ログ種別CHECK 反映）。
    - 037: manager_user/scout_user の RLS ＋ ヘルパ `get_user_manager_agency_ids()`/`get_user_scout_id()` ＋ 既存 agencies/livers/csv_data へマネージャー閲覧拡張。**CRITICAL（manager_agencies ポリシーの再帰リスク）を managers 直接結合に修正**、scouts/liver_scouts ポリシーを EXISTS 化、total_side 行・監査ログの admin 限定を意図明示。
    - 038: `csv_data.manager_id`（派生キャッシュ・`ON DELETE SET NULL`）。
  - ⚠️ **マイグレ未適用**（031含め Supabase SQL Editor 適用は本番反映フェーズでまとめて実施）。
  - ✅ **TS側追従 完了（2026-06-27）**: `types.ts` の `UserRole` に `manager_user`/`scout_user` を追加（DB enum 032 と一致）、`constants.ts` `USER_ROLE_LABELS` にラベル追加（`Record<UserRole>` 網羅）。`auth.ts` は `UserRole` 経由のため自動追従（app_metadata.role 受理）。`tsc --noEmit`／`eslint` クリーン。実アクセス制御（担当分のみ・専用画面）の配線は 4-D。
  - ✅ **暫定セキュリティガード追加（2026-06-27, code-reviewer HIGH指摘対応）**: `(dashboard)/layout.tsx` に `DASHBOARD_ALLOWED_ROLES`（system_admin/agency_user）のフェイルクローズ判定を追加。新ロールはマイグレ適用順に関わらずダッシュボード到達不可（`monthly_reports` RLS が `auth.uid() IS NOT NULL` のため、ガードなしだと032適用直後に全レポート＝為替レート等が漏洩する穴を塞ぐ）。
  - ⚠️ **4-D 実装時の必須同時更新（code-reviewer MEDIUM）**: manager_user/scout_user を解放する際、①`(dashboard)/layout.tsx` の `DASHBOARD_ALLOWED_ROLES` ②`NAV_ITEMS`（constants.ts）③請求書系の `agency_user` ホワイトリスト3箇所（`invoices-client.tsx:83,96` 表示条件／`actions/invoices.ts:206` getInvoicePreview／`actions/invoices.ts:363` createAndSendInvoice）を必ず同時更新。見落とすと「UIは見えるが Server Action で拒否」等の非対称状態になる。
  - 🔲 **未着手**: 4-B（多段分配計算・マイグレ039〜042＋Server Action）。4-D（マネージャー/スカウト UI）。
  - 確認3点 → ✅ **回答受領（2026-06-24）**: ①スカウト報酬は**担当ライバーの売上ベース**＝`liver_scouts` を計算単位に採用（`scout_agencies` は補助）。②マネージャー代表者は**ライバー別の生データ（csv_data）まで閲覧可**＝037 で `csv_data`/`livers` に `manager_user` 閲覧ポリシー追加。③トータルサイドの実体＝R6 で代理店登録・取り分は手数料率で表現（v4 ④で取得、設計側で吸収）。
  - 残: **R6 トータルサイド登録4点**（メール/グループ名/手数料率/親代理店）— データ入力でスキーマ非依存・実装と並行取得可。
- **4-B. 報酬計算ロジック**: ✅詳細設計完了（2026-06-25）→ **[docs/4B_distribution_calc_design.md](docs/4B_distribution_calc_design.md)**。中核は冪等RPC `recalculate_distributions(p_monthly_report_id)`（マイグレ039〜042＋Server Action）。既存4経路は無改変で後段 `PERFORM`、`agency_reward_jpy`/invoices には非干渉。並列/カスケードの%掛け方は **039 の戦略関数に隔離**（v5 回答待ち・1〜2行差替で切替）。スカウトは `liver_scouts` ベース別軸、total_side が丸め残差吸収で元本一致。検証は pgTAP（両方式の期待値表を先行作成）。
  - ✅ **実装完了（2026-06-27, コード）**: マイグレ **039〜042** ＋ Server Action `recalculateDistributions`（`src/lib/actions/distributions.ts`）＋ import経路接続（`dashboard.ts` 取込成功直後に冪等RPCを1回await・失敗はwarn）＋ types.ts追従（`PayeeKind`／`distributions`／`distribution_rules` 型）＋ pgTAP `supabase/tests/distributions_test.sql`（並列(あ)を有効・カスケード(い)期待値はコメントで先行作成）。
    - 039: `get_distribution_rate`／`calc_distribution_base`（★%掛け方の唯一の切替点・**デフォルト並列(あ)**）／`calc_distribution_amount`。
    - 040: 中核RPC（admin限定・`FOR UPDATE`ロック・冪等DELETE+INSERT・manager_id同期・source毎にmanager→三次→total_side残差・スカウト別軸）。over-allocation（率合計>100%）は `RAISE` で検知。
    - 041: 既存3RPC（exchange/commission/liver_agency）を最新定義（029/031）踏襲＋末尾 `PERFORM`。影響月のみループ。
    - 042: distributions FK の `ON DELETE CASCADE` を `information_schema` で明示検証（孤児防止）。
  - ⚠️ **未適用・DB未実行検証**: 本セッションは適用先DBなし（Docker不調）。**SQLは手動レビューのみ・pgTAPは未実行**。マイグレ032〜042 をSupabase適用後に pgTAP（`supabase db test`）で並列/カスケード両期待値を実測する必要あり。
  - ✅ **database-reviewer 静的レビュー実施（2026-06-27）**: 計算正確性＝並列/カスケード両方式で設計数値例と一致・元本一致は恒等式として成立を確認。指摘反映:
    - HIGH#1: 040 スカウトループに `JOIN scouts sc ... is_deleted=false` 追加（削除済みスカウトへの誤分配防止）。
    - HIGH#2: 041 の2ループに `ORDER BY monthly_report_id` 追加（並行更新時のデッドロック防止）。
    - HIGH#3: distributions.ts の service_role コメントを実挙動（auth.uid()=NULL は admin ガードを**素通り**＝権限担保はTS層＋userセッション利用に依存）に訂正。
    - MEDIUM#4: 039 に複合インデックス `idx_distribution_rules_agency_kind(agency_id,payee_kind)` 追加。
    - LOW#8: 040 manager_id同期に `AND agency_id IS NOT NULL`。LOW#7(GRANT): 全マイグレが PUBLIC デフォルト依存の慣習 → 明示不要で整合。
    - 任意フォロー（未対応）: MEDIUM#5 = 037 の `scout_id = (SELECT get_user_scout_id())` サブクエリ化（RLS perf・4-B範囲外・pre-existing）。
  - 🔲 **v5 回答到着後**: 039 `calc_distribution_base` をカスケードに差替（必要時）＋ pgTAP のカスケード期待値を有効化。
  - `tsc --noEmit`／`eslint` クリーン（TS側）。SQLは静的レビュー済み・DB未実行（適用後 pgTAP 実測が必須）。
- **4-C. 請求書**: ✅仕様確定（2026-06-24）。**代理店宛PDFは従来通り（代理店ごとに1枚、既存 `UNIQUE(agency_id, monthly_report_id)` 維持）**。マネージャー・スカウト分はPDF発行せず**分配明細を画面表示**するのみ（→ `invoices` の制約変更は不要、分配明細テーブル/ビューを新設）。
- **4-D. UI/権限**: ✅仕様確定（2026-06-24）。マネージャー代表者ログイン（`manager_user`・**代表者1アカウント**・**閲覧範囲は自分の担当分のみ**）、スカウト用閲覧ログイン（請求書なし・自分の分配明細のみ）。代理店ページは既存流用。`profile_viewable_agencies`／`profile_viewable_agencies` 相当の仕組みを流用・拡張し「担当分のみ表示」を強制。
- **4-E. 移行・運用**: マネージャー↔代理店↔ライバーの初期手動登録、月次の紐付け更新フロー。

### ⚠️ 着手前に潰す既存の地雷（今回の調査で発見、マネージャー＝複数代理店管理で顕在化）
- [x] **4-Bug1** `getInvoices`（invoices.ts:120 付近）が閲覧可能代理店の**先頭1件しか見ない** → 複数代理店を持つユーザーは2件目以降の請求書が見えない。→ ✅ 2026-06-10 修正（`.in()` で閲覧可能な全代理店をフィルタ。閲覧可能0件なら空配列を返す）
- [x] **4-Bug2** `update_commission_rate`（マイグレ020）だけ `estimated_bonus` ベースのまま（他は `payment_bonus` に修正済み）→ 手数料率変更時に売上増加が混入。→ ✅ マイグレ **031** で `payment_bonus` ベースに修正。**⚠️ Supabase SQL Editor での適用が必要（未適用）**
- [x] **4-Bug3**（2026-06-10 再調査で発見）`update_liver_agency`（マイグレ021が最新定義）も同様に `estimated_bonus` ベース → **ライバーの代理店変更**時に売上増加が混入し過払いになる。→ ✅ マイグレ **031** で同時修正。**⚠️ 同上、要適用**

> 031 の適用後の影響: 旧ルール行は `payment_bonus = estimated_bonus` でバックフィル済み（029）のため結果不変。新ルール月（202603〜）の行のみ、手数料率変更・代理店変更を実行した場合の再計算が正しくなる。適用しない限り既存データは変わらない（関数定義の置き換えのみ）。

### 残る不明点（Kouyama44 / kana / オーナーへ確認）→ 2026-06-11 発注元回答を反映
- [x] 1人が複数ロール（例: キャンディーさんがスカウト10%＋担当40%）のとき、**同一人物への支払いを合算するか分離するか**。→ 🔶 **2026-06-24 回答: 代理店とスカウトは「分けて」計算・記録する（合算しない）**。ただし**スカウトの請求は（現時点では）すべてトータルサイドにまとめる**。→ 請求書の発行先詳細は下記で確認中。
- [x] スカウト・マネージャーは**ログインできる主体**か、**集計上の区分だけ**か。→ ✅ **確定（2026-06-24）**: マネージャー代表者はログインする＝`manager_user` ロール＋専用画面。**①アカウントは「代表者おひとり分」**。**③スカウトもログインする**（＝閲覧用ログインあり、ただし請求書はトータルサイドに集約）。**②代表者の閲覧範囲＝「ご自分の担当分だけ」**（自分が担当するマネージャー/代理店/スカウト分のみ。他社は不可）。→ ✅ **全項目確定**。
- [x] 請求書は**分配先ごとに別発行**か、**1枚にまとめる**か。発行方向（誰→誰）。→ ✅ **確定（2026-06-24）**: **代理店宛は従来通り「代理店ごとに1枚ずつ」PDF発行**。**マネージャー・スカウトには請求書を発行せず、画面で内訳が見えれば十分（請求書はトータルサイドに集約）**。＝既存の `UNIQUE(agency_id, monthly_report_id)` 制約は代理店請求書としてそのまま維持可。マネージャー/スカウト分は**画面表示用の分配明細**として保持（PDF自動発行は追加しない）。
- [x] マネージャー↔ライバーの紐付けは**月ごとに変わりうるか** → ✅ 回答「**変更があるまでは固定**」＝固定マスタ方式。月次積み分けは不要。変更時のみ管理画面で更新（確定済み請求書はスナップショットなので過去に遡及しない設計とする）
- [x] 各階層のパーセンテージの**確定値**と運用 → ✅ 回答「**管理画面側で入力**」＝率はハードコードせず、**管理者が管理画面から入力・変更できるUIが要件**（`distribution_rules` のCRUD画面が確定スコープ入り）
- [x] 三次代理店（クール配下）の分配率・請求単位 → ✅ 回答「**管理画面側で入力**」＝同上、画面から設定できれば良い
- [x] グループ名変更時の請求書への影響 → ✅ 回答「**過去の請求書はそのまま保存**」＝現行のスナップショット方式（invoices に代理店情報を複製保存）で**要件充足済み。追加開発不要**

### 発注元への確認文ドラフト（2026-06-10 作成、R2・R6 と同送可）
> 上記不明点を発注元（Kouyama44 / kana）へ投げるための文面。送付は未実施。
```
お世話になっております。マネージャー単位管理への移行（追加開発分）に着手するにあたり、
仕様確定のため以下をご確認させてください。

【報酬分配】
1. 1人が複数の役割を兼ねる場合（例：スカウト10%＋マネージャー40%）、
   お支払いは1件に合算しますか？役割ごとに分けますか？
2. 分配率は「代理店50%／スカウト10%／マネージャー40%」で確定でよいですか？
   育成要件による変動がある場合、誰がいつ・どの単位（人／月）で変更しますか？
3. クール様配下の三次代理店の分配率と請求単位を教えてください。

【請求書】
4. 請求書は分配先ごとに別発行ですか？1枚にまとめますか？（どなた様からどなた様宛か）

【ログイン・画面】
5. スカウト・マネージャーはご自身でログインして画面を確認する運用ですか？
   それとも集計上の区分のみで、画面はトータルサイド様が見られれば十分ですか？

【運用】
6. マネージャーとライバーの紐付けは月ごとに変わる前提でよいですか（毎月更新する運用）？
7. グループ名を変更した場合、過去の請求書・以後の請求書の表示はどう扱いますか？

あわせて、以前ご依頼の以下2点もご確認をお願いいたします。
・ログイン不具合の再現確認（先日修正をデプロイ済みです）
・新規代理店のご登録に必要な情報4点
  （①ログイン用メールアドレス ②Backstageのグループ名 ③手数料率 ④親代理店の有無）
```

> ✅ 2026-06-11 発注元回答受領。Q2/Q3/Q6/Q7 解消・R2 完了。Q1/Q5 未回答、Q4 は質問が伝わらず、R6 未回答 → 下記 v2 で再確認。

### 見積もり方針（2026-06-12 決定）
会議合意済みの **20万円（税別）** で見積書を出す。実工数は13〜19人日相当（市場価格50〜90万規模）だが、合意済み金額の引き上げはしない。代わりに**内訳と「別途見積もり」の注記でスコープを固定**する。
- 内訳: ①DB設計・構築 4万 ②報酬分配の自動計算 6万 ③管理画面拡張（分配率入力・マネージャー登録・紐付け管理）5万 ④マネージャー代表者用ログイン・閲覧画面 4万 ⑤検証・本番反映・初期データ登録支援 1万 ＝ 計20万（税別）
- **別途見積もり注記（必須）**: (a) ~~分配先ごとの請求書PDF自動発行~~ → **不要に確定（2026-06-24）**: 代理店宛は従来通り・マネージャー/スカウトは画面表示のみ。 (b) スカウト用ログイン・専用画面 → **20万に含めることで確定（2026-06-24）**。追加請求なし。閲覧専用ページとして実装（請求書なし・自分の分配明細のみ）。内訳④に内包。 (c) マネージャーごとの個別アカウント発行 → **不要に確定（代表者おひとり分）**。
- 送付状況: ✅ 2026-06-24 発注元より **20万円（税別）で承認** 受領。要望#4 実装フェーズへ移行。

### 発注元への再確認文 v2（2026-06-11 作成、未回答3件＋Q4言い直し）
> 送付状況は送付時に追記。
```
ご回答ありがとうございます。分配率・三次代理店は管理画面から入力できる形で
設計いたします。残り4点だけ、追加でご確認させてください。

1.【請求書の作り方】（前回の質問が分かりにくく失礼しました）
   現在のシステムは、月ごとに「代理店ごとの請求書PDF」を自動作成しています。
   マネージャー単位の管理に移行した後、システムが作る請求書は
   次のどちらのイメージでしょうか？
   (a) 今まで通り、分配先（マネージャー様・スカウト様・代理店様）ごとに
       それぞれ請求書PDFを分けて作成する
   (b) 請求書は全体で1枚にまとめ、分配の内訳は画面上で確認できれば良い

2.【お支払いの単位】
   お一人が複数の役割を兼ねる場合（例：スカウト分10%＋マネージャー担当分40%）、
   その方への金額は「合算して1件（50%分）」で表示・請求書化しますか？
   それとも「役割ごとに2件」に分けますか？

3.【ログインアカウント】
   マネージャー代表者様がログインされる件、承知しました。確認させてください。
   (a) アカウントは代表者様の1つですか？マネージャーごとに個別発行ですか？
   (b) 代表者様の画面では、全マネージャー分を見られる想定ですか？
   (c) スカウト様もログインしますか？（しない場合、スカウト分は
       管理画面の集計表示のみとなります）

4.【新規代理店のご登録】（再掲）
   ご登録に必要な情報4点をお願いいたします。
   ①ログイン用メールアドレス ②Backstageのグループ名 ③手数料率 ④親代理店の有無
```

### 発注元への再確認文 v3（2026-06-24 作成、具体例つき・かみ砕き版）
> v2 が Q4「意味がわかりません」と返ったため、具体的な人名・数字・選択肢で言い直す。送付状況は送付時に追記。
```
お世話になっております。マネージャー単位の管理への移行について、設計を始める前に
3点だけ、具体例でご確認させてください。どちらか選ぶ／番号でお答えいただくだけで
大丈夫です。

① 同じ方が2つの役割を持つときの「お支払い」
   例：キャンディーさんがスカウト10%・マネージャー担当40%を受け取るとき、
   画面・請求書での見せ方は—
   (あ) 合算する … 「50%ぶん＝1件」でまとめて表示・請求
   (い) 分ける  … 「スカウト10%ぶん」「マネージャー40%ぶん」の2件に分ける
   → （あ）か（い）どちらが良いですか？

② 請求書（PDF）の作り方
   現在は毎月、代理店ごとに請求書PDFを1枚ずつ自動作成しています。移行後は—
   (あ) 相手ごとに分けて作る … マネージャー様・スカウト様・代理店様それぞれに別PDF
   (い) 1枚にまとめる … 請求書は全体で1枚。内訳は画面で確認できればOK
   → （あ）か（い）どちらが良いですか？
   （補足：(あ)は PDF自動発行が別途お見積りになります）

③ ログインする人
   (a) アカウントの数 … 「代表者おひとり分」で良いですか？マネージャーごとに別発行ですか？
   (b) 見える範囲 … 代表者様の画面は「全マネージャー分」？「ご自分の担当分だけ」？
   (c) スカウト様 … ご自身もログインしますか？（しない場合は集計表示のみ）

あわせて、新規代理店「トータルサイド」様のご登録に必要な4点もお願いします。
①ログイン用メールアドレス ②Backstageのグループ名（CSVのGroup列と一致するもの）
③手数料率（取り分の％） ④親代理店の有無
```

> ✅ 2026-06-24 見積もり **20万円（税別）** 承認受領（発注元）。要望#4は実装フェーズへ。v3 の Q1/Q4/Q5 は全て回答受領・確定（上記「要望#4 仕様 確定サマリ」参照）。

### 発注元への確認文 v4（2026-06-24 作成、4-A 着手後の追加確認＋トータルサイド登録）
> 4-A データモデル設計で生じた残り2点（スカウト計算単位・マネージャー閲覧範囲）＋ R6 トータルサイド登録情報。
> ②トータルサイドの取り分は下記④手数料率で解決（payee設計はこちらで吸収）。送付状況は送付時に追記。
```
お世話になっております。マネージャー単位管理の設計を進めております。
あと2点だけ仕様のご確認と、新しく登録する「トータルサイド」様の情報をお願いします。
番号でお答えいただくだけで大丈夫です。

■ 確認① スカウトさんの報酬は「何」に対して発生しますか？
   例：スカウトAさんがライバーを3人獲得しているとします。Aさんの報酬は—
   (あ) 獲得したライバーごと … その3人それぞれの売上に応じてAさんの報酬が決まる
   (い) 代理店まとめて … Aさんが所属する代理店全体の売上に対する割合で決まる
   → （あ）か（い）どちらですか？

■ 確認② マネージャー代表者がログインしたとき、画面で見えるのは—
   (あ) 分配の金額（誰にいくら）だけ見えればOK
   (い) その元になる、ライバーごとの細かい売上データ（Backstage取込の生データ）まで見せる
   → （あ）か（い）どちらですか？

■ 新規登録「トータルサイド」様の情報（4点）
   ①ログイン用メールアドレス
   ②Backstageのグループ名（CSVの Group 列と一致するもの。無ければ「なし」）
   ③取り分（手数料率）… マネージャー・代理店へ配る前にトータルサイドが受け取る％
   ④親代理店の有無（トータルサイドの上にさらに別の代理店があるか）
```

> ✅ 2026-06-24 ①②回答受領＝①スカウトは担当ライバー売上ベース（`liver_scouts`）／②生データまで閲覧可。トータルサイド4点（R6）は外部待ち継続。

### 発注元への確認文 v5（2026-06-25 作成、4-B 設計の前提＝%の掛け方＋R6再掲）
> 4-B（多段分配計算）の計算式を左右する「割合の掛け方」を確定する。送付状況は送付時に追記。
```
お世話になっております。設計の詰めであと1点だけご確認と、先日お願いした
トータルサイド様の情報を改めてお願いします。

■ 確認 報酬の「割合の掛け方」について
   ある月、あるライバーさんの対象額が 10万円 だったとします。
   これを関係者へ分けるとき、どちらの考え方ですか？
   (あ) みんな同じ10万円が基準 … 代理店◯%・スカウト◯%・マネージャー◯% を
        それぞれ「10万円」に対して計算する（並列）
   (い) 上から順に取って残りを分ける … トータルサイドがまず取り、その残りから
        マネージャー、さらにその残りから代理店…と段階的に計算する（カスケード）
   → （あ）か（い）どちらですか？（具体的な％は管理画面で設定できるようにします）

■ 新規登録「トータルサイド」様の情報（4点・再掲）
   ①ログイン用メールアドレス
   ②Backstageのグループ名（CSVの Group 列と一致するもの。無ければ「なし」）
   ③取り分（手数料率）… マネージャー・代理店へ配る前にトータルサイドが受け取る％
   ④親代理店の有無
```

---

## 優先度と進め方（2026-05-30 更新）

実装・デプロイは要望#1〜#3とも完了。残りは運用タスクのみ。

| 順 | タスク | 状態 | 根拠 |
|---|---|---|---|
| 1 | 要望#3 発注元に再現確認依頼（R2） | ✅ 完了 | 2026-06-11 発注元「完了済み」回答でクローズ |
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
