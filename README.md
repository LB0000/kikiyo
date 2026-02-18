# TikTok Live Tool (KIKIYO)

TikTok Live配信者（ライバー）を管理する代理店向け内部業務アプリ。

## 技術スタック

- **Next.js 16** (App Router) / React 19 / TypeScript
- **Supabase** (PostgreSQL + Auth + RLS)
- **Tailwind CSS v4** / shadcn/ui
- **Zod v4** / react-hook-form / @tanstack/react-table
- **PapaParse** (CSV解析) / **Resend** (メール送信) / **sonner** (トースト通知)

## セットアップ

### 1. 依存パッケージのインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.example` をコピーして `.env.local` を作成し、値を設定:

```bash
cp .env.example .env.local
```

| 変数名 | 説明 |
|--------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase プロジェクトURL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon キー |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role キー |
| `RESEND_API_KEY` | Resend API キー |
| `EMAIL_FROM` | 送信元メールアドレス |
| `NEXT_PUBLIC_APP_URL` | アプリの公開URL |

### 3. Supabase マイグレーション

マイグレーションファイルを順番に適用:

```bash
supabase db push
```

または Supabase ダッシュボードの SQL Editor で `supabase/migrations/` 内のファイルを番号順に実行。

### 4. 開発サーバーの起動

```bash
npm run dev
```

## コマンド

```bash
npm run dev          # 開発サーバー起動
npm run build        # 本番ビルド
npm start            # 本番サーバー起動
npm run lint         # ESLint 実行
```

## デプロイ (Vercel)

1. [Vercel](https://vercel.com) でこのリポジトリを Import
2. 環境変数を設定（上記の6つ）
3. `NEXT_PUBLIC_APP_URL` を本番ドメインに変更
4. デプロイ実行

Supabase のマイグレーションは本番 DB に対して別途適用が必要。
