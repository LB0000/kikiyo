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

### 全フィールド対応表

| TikTok CSVヘッダー | CsvRow | csv_data DB列 | UI表示 | 用途 |
|---|---|---|---|---|
| Data Month | data_month | data_month | データ月 | 期間識別 |
| Creator ID | creator_id | creator_id | クリエイターID | ライバー紐付けキー |
| Creator nickname | creator_nickname | creator_nickname | ニックネーム | 表示名 |
| Handle | handle | handle | ハンドル | TikTokハンドル |
| Creator Network manager | creator_network_manager | creator_network_manager | — | 代理店紐付けキー |
| Group | group | "group" | グループ | 分類 |
| Group manager | group_manager | group_manager | — | 未使用 |
| Is violative creators | is_violative_creators | is_violative | — | 非表示 |
| The creator was Rookie... | the_creator_was_rookie... | was_rookie | — | 非表示 |
| Diamonds | diamonds | diamonds | ダイヤモンド | 収益指標 |
| Valid days(d) | valid_days | valid_days | 有効日数 | 活動指標 |
| LIVE duration(h) | live_duration | live_duration | 有効時間 | 活動指標 |
| Estimated bonus | estimated_bonus | estimated_bonus | 推定ボーナス | 主要指標(USD) |
| — (派生) | — | total_reward_jpy | — | = estimated_bonus × rate |
| — (派生) | — | agency_reward_jpy | — | = estimated_bonus × rate × commission_rate |
| — (FK) | — | liver_id | — | creator_id → livers.liver_id |
| — (FK) | — | agency_id | — | creator_network_manager → agencies.name |

### Bubble ↔ Next.js ボーナスフィールド対応表

IMPORTANT: Bubbleは汎用名（task1〜task6+）、Next.jsは説明的な名前を使用。フィールド数も異なる（6 vs 7）。
部分一致キーで TikTok CSVヘッダーをマッチングする（`getByPartial` in dashboard.ts）。

| Bubble | Next.js DB列 | 実TikTok CSVヘッダー | 部分一致キー |
|--------|-------------|---------------------|-------------|
| task1 | bonus_rookie_half_milestone | Estimated bonus - Rookie half-milestone bonus task | `rookie half-milestone` |
| task2 | bonus_activeness | Estimated bonus - Activeness task task | `activeness` |
| task3 | bonus_revenue_scale | Estimated bonus - Revenue scale task task | `revenue scale` |
| task4 | bonus_rookie_milestone_1 | Estimated bonus - Rookie milestone 1 bonus task | `rookie milestone 1 bonus task` |
| task5 | bonus_rookie_milestone_2 | Estimated bonus - Rookie milestone 2 bonus task | `rookie milestone 2` |
| task6+ | bonus_off_platform | Estimated bonus - Off-platform creator task task | `off-platform` |
| (なし) | bonus_rookie_retention | Estimated bonus - Rookie milestone 1 retention bonus task | `milestone 1 retention` |

### リンクロジック

- **ライバー紐付け**: `csv_data.creator_id` = `livers.liver_id`（TEXT完全一致）
- **代理店紐付け**: `csv_data.creator_network_manager` = `agencies.name`（名前完全一致）
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
