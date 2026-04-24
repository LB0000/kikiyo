# TikTok Live Tool (KIKIYO)

TikTok Live配信者（ライバー）を管理する代理店向け内部業務アプリ。
Bubble版（tiktoklivetool.bubble）からの移行プロジェクト。

## 技術スタック

- **Next.js 16** (App Router) / React 19 / TypeScript
- **Supabase** (PostgreSQL + Auth + RLS)
- **Tailwind CSS v4** / shadcn/ui (New York style)
- **Zod v4** / react-hook-form / @tanstack/react-table
- **PapaParse** (CSV解析) / **Resend** (メール送信) / **sonner** (トースト通知)

## 開発コマンド

```bash
npm run dev          # 開発サーバー起動
npm run build        # 本番ビルド
npx eslint src/      # Lint実行
npx tsc --noEmit     # 型チェック
```

## コード規約

- **Server Component** がデフォルト。`"use client"` は対話的UIのみ
- **Server Action** は `"use server"` + 認証→認可→バリデーション→DB操作→`revalidatePath` パターン
- **UIテキスト・エラーメッセージは全て日本語**
- パスエイリアス: `@/` → `src/`
- **Zod v4**: エラーアクセスは `.issues`（`.errors` ではない）
- `Math.random()` 禁止 → `crypto.getRandomValues()` を使用
- useEffect内のsetState → key-based remount パターンで回避

## プロジェクト構造

```
src/
  app/
    (auth)/          # ログイン・パスワードリセット
    (dashboard)/     # 保護されたルート（sidebar付きレイアウト）
      dashboard/     # メインダッシュボード（CSV/返金/為替レート）
      agencies/      # 代理店管理（admin only）
      livers/        # ライバー名簿
      applications/  # 申請フォーム
      all-applications/ # 申請一覧（admin only）
  components/
    shared/          # app-sidebar等
    ui/              # shadcn/uiコンポーネント（24種）
  lib/
    actions/         # Server Actions（agencies, livers, dashboard, applications）
    supabase/        # client.ts, server.ts, middleware.ts, types.ts
    validations/     # Zodスキーマ（agency, liver, application, refund）
    auth.ts          # getAuthUser() ヘルパー
    constants.ts     # ラベル定数・NAV_ITEMS・TAX_RATE
supabase/migrations/ # 001_initial_schema.sql, 002_add_constraints.sql
```

## 認証・認可

- **ロール**: `system_admin`（全権限）, `agency_user`（閲覧可能代理店のみ）
- **Server Action パターン**:
  ```typescript
  const user = await getAuthUser();
  if (!user) return { error: "認証が必要です" };
  if (user.role !== "system_admin") return { error: "権限がありません" };
  ```
- **RLSヘルパー関数**: `get_user_role()`, `get_viewable_agency_ids()`
- **Supabaseクライアント**: `createClient()`（一般）, `createAdminClient()`（RLSバイパス）

## データベース（10テーブル）

agencies, agency_hierarchy, profiles, profile_viewable_agencies,
livers, liver_agencies, monthly_reports, csv_data, refunds, applications

## TikTok CSV → DB データフロー

### ⚠️ ボーナス項目は2026.3でルール変更

TikTok Backstage が2026.3からボーナス構造を刷新。旧ルール（Rookie milestones / Revenue scale）は廃止、
新ルール（Ranked up / Maintained tiers / Off-platform (2026.3) / Incremental revenue incentive）に置換。
実装は**両方のデータ形式を共存**させる（過去データ保護）。

- 旧レポート（〜2026.2）: 旧DB列（`bonus_rookie_*`, `bonus_revenue_scale`）を使用
- 新レポート（2026.3〜）: 新DB列（`bonus_ranked_up` ほか）を使用
- 支払計算には `payment_bonus`（①+②+③+④+⑤合計）を使用。`estimated_bonus` は参考値

### 全フィールド対応表（2026.3〜・最新ルール）

| # | TikTok CSVヘッダー | csv_data DB列 | UI表示名 | 代理店表示 |
|---|---|---|---|---|
| 1 | Data Month | data_month | データ月 | ✅ |
| 2 | — (結合) | liver_id → livers.name | 氏名 | ✅ |
| 3 | Creator nickname | creator_nickname | ニックネーム | ✅ |
| 4 | Handle | handle | クリエイターID | ✅ |
| 5 | Group | group | グループ | ✅ |
| 6 | Diamonds | diamonds | ダイヤモンド | ✅ |
| 7 | Valid days(d) | valid_days | 有効日数 | ✅ |
| 8 | LIVE duration(h) | live_duration | 有効時間 | ✅ |
| ① | Estimated bonus - Ranked up | bonus_ranked_up | ランクアップインセンティブ | ✅ |
| ② | Estimated bonus - Maintained tiers | bonus_maintained_tiers | ランク維持 | ✅ |
| ③ | Estimated bonus - Activeness incentive | bonus_activeness | アクティブ度インセンティブ | ✅ |
| ④ | Estimated bonus - Off-platform creator task | bonus_off_platform | 新優良クリエイタータスク | ✅ |
| ⑤ | Estimated bonus - Off-platform creator task (2026.3) | bonus_off_platform_2026_03 | 他社プラットフォームクリエイター | ✅ |
| — | Estimated bonus - Incremental revenue incentive | bonus_incremental_revenue | 売上増加 | ❌**非表示** |
| — | Estimated bonus | estimated_bonus | (内部値・参考) | ❌**非表示** |
| 派生 | (①+②+③+④+⑤) | **payment_bonus** | 推定ボーナス（支払対象） | ✅ |
| — | Creator ID | creator_id | (非表示) | — |
| — | Creator Network manager | creator_network_manager | (非表示・紐付けキー) | — |
| — | Group manager | group_manager | (非表示・未使用) | — |
| — | Is violative creators | is_violative | (非表示) | — |
| — | The creator was Rookie... | was_rookie | (非表示) | — |
| 派生 | — | total_reward_jpy | = **payment_bonus × rate** | ✅ |
| 派生 | — | agency_reward_jpy | = **payment_bonus × rate × commission** | ✅ |
| FK | — | liver_id | (非表示) | — |
| FK | — | agency_id | (非表示) | — |

### CSVパーサの実装ルール（重要）

`src/lib/actions/dashboard.ts` の `parseCsv` / `importCsvData` 実装時の注意:

1. **`estimated_bonus` 列を報酬計算に使わない**（2026.3以降は売上増加が混入する）
2. `payment_bonus = bonus_ranked_up + bonus_maintained_tiers + bonus_activeness + bonus_off_platform + bonus_off_platform_2026_03` を計算して保存
3. ④と⑤の区別: ヘッダー `Off-platform creator task (2026.3)` は⑤、`Off-platform creator task` は④。部分一致で検索する際は ⑤を先にマッチさせて除外してから ④ をマッチ
4. 旧レポート（〜2026.2）は新列が0、`payment_bonus = estimated_bonus` でバックフィル済み（マイグレ029）
5. 代理店ユーザー向けの画面・CSV出力では `bonus_incremental_revenue` と `estimated_bonus` を**非表示**

### 旧ルール対応表（〜2026.2・歴史記録）

2026.2以前のレポートに保存されているデータ。新規CSVインポートでは使わない。

| 旧 Bubble | 旧 Next.js DB列 | 旧TikTok CSVヘッダー |
|--------|-------------|---------------------|
| task1 | bonus_rookie_half_milestone | Estimated bonus - Rookie half-milestone bonus task |
| task2 | bonus_activeness | Estimated bonus - Activeness task task |
| task3 | bonus_revenue_scale | Estimated bonus - Revenue scale task task |
| task4 | bonus_rookie_milestone_1 | Estimated bonus - Rookie milestone 1 bonus task |
| task5 | bonus_rookie_milestone_2 | Estimated bonus - Rookie milestone 2 bonus task |
| task6+ | bonus_off_platform | Estimated bonus - Off-platform creator task task |
| (なし) | bonus_rookie_retention | Estimated bonus - Rookie milestone 1 retention bonus task |

新ルールと共存する列（同じ意味で2026.3以降も存続）:
- `bonus_activeness` (③ Activeness incentive と同じ列に保存)
- `bonus_off_platform` (④ Off-platform creator task と同じ列に保存)

### リンクロジック

- **ライバー紐付け**: `csv_data.handle` ↔ `livers.tiktok_username`（大文字小文字無視で一致）
- **代理店紐付け**: `csv_data.creator_network_manager` = `agencies.name`（名前完全一致、Backstage グループ名）
- 紐付け失敗 → `NULL`（件数はトーストで通知）

## Bubble ↔ Next.js 既知の差分

### URL路径（意図的変更）
- `client` → `/agencies`, `liver` → `/livers`, `application` → `/applications`
- `all-application` → `/all-applications`, `reset_pw` → `/reset-password`

### 実装済み（Bubble差分対応）

- **CSVインポートリンク統計**: インポート後にライバー/代理店の紐付け状況をトースト表示（未紐付け行は警告色）
- **親代理店ユーザーRLS**: `agency_hierarchy` INSERT/DELETE時に `profile_viewable_agencies` を自動同期するDBトリガー（`004_parent_agency_sync_trigger.sql`）
- **Combobox/MultiCombobox**: 検索付き選択コンポーネント。ライバー選択、代理店フィルター、上位代理店選択、一括変更で使用

### 未対応（意図的）

- **`million_special` (100万人以上特別申請)**: TikTok招待チケットルール変更に伴い削除。チケット4種類（一般/ゴールドチケット/フォロワー多数クリエイター/プレミアム）は `affiliation_check` の `form_data.ticket_type` に統合（027マイグレーション）
- **代理店ランク rank_1**: Bubble版で削除済みのため意図的に省略
- **代理店削除**: カスケード問題を回避するため Server Action なし
- **申請の編集/削除**: ステータス変更のみ許可（改ざん防止）
- **`liver_agencies` テーブル**: スキーマに定義済みだがコード未使用（`livers.agency_id` で一対多管理）。将来必要になったら実装

### RLS厳格化（セキュリティ改善）

- 代理店ユーザーのagencies操作: Bubble=Full → Next.js=SELECT only
- ライバー削除: Bubble=可能 → Next.js=DELETE不可
- 自プロフィール更新: Bubble=Full → Next.js=SELECT only

### 型の差異

- `Application.contact`: Bubble=Number → Next.js=TEXT（電話番号先頭0対応）
- `Refund.is_delete` → `is_deleted`（命名改善）

## 環境変数

`.env.local` に設定が必要（`.env.example` 参照）:
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY` / `EMAIL_FROM`
- `NEXT_PUBLIC_APP_URL`

IMPORTANT: `.env.local` は絶対にコミットしない。
