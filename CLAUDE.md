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

## Bubble ↔ Next.js CSVボーナスフィールド対応表

IMPORTANT: Bubbleは汎用名（task1〜task6+）、Next.jsは説明的な名前を使用。フィールド数も異なる（6 vs 7）。

| Bubble | Next.js | TikTok CSVヘッダー |
|--------|---------|-------------------|
| Estimated bonus(task1) | bonus_rookie_half_milestone | Bonus - Rookie Half Milestone |
| Estimated bonus(task2) | bonus_activeness | Bonus - Activeness |
| Estimated bonus(task3) | bonus_revenue_scale | Bonus - Revenue Scale |
| Estimated bonus(task4) | bonus_rookie_milestone_1 | Bonus - Rookie Milestone 1 |
| Estimated bonus(task5) | bonus_rookie_milestone_2 | Bonus - Rookie Milestone 2 |
| Estimated bonus(task6+) | bonus_off_platform | Bonus - Off Platform |
| (なし) | bonus_rookie_retention | Bonus - Rookie Retention |

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
