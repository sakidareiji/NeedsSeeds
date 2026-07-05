# Needs Seeds

日常や業務の「困りごと」を投稿すると、AIが解析して解決策(アフィリエイト案件・一般アドバイス)を自動提示し、良質な投稿には AI 査定による**貢献スコア**(換金不可)が蓄積される Web サービス。

- 仕様書: [`needs_seeds_mvp_spec.md`](./needs_seeds_mvp_spec.md)
- スタック: Next.js (App Router, TypeScript) / Supabase (PostgreSQL, Auth, RLS) / Anthropic API / Tailwind CSS / Vercel

## 実装状況(マイルストーン)

| | 内容 | 状態 |
|---|---|---|
| M1 | 骨格 — 認証、投稿CRUD、カテゴリ、一覧・詳細(SSR) | ✅ 完了 |
| M2 | 核 — AI解析パイプライン、解決策マスタ、自動提示、PR表記、クリック計測 | 未着手 |
| M3 | 循環 — わかる、解決報告、貢献スコア・グレード、通知、プロフィール実績 | 未着手 |
| M4 | 運営 — 管理画面、種投稿インポート、モデレーション、通報 | 未着手 |
| M5 | 公開準備 — SEO、静的ページ、レートリミット、デプロイ | 未着手 |

## セットアップ

### 前提

- Node.js 20+ / npm
- [Supabase CLI](https://supabase.com/docs/guides/cli)(ローカル DB 用。内部で Docker を使用)
- Anthropic API キー(M2 以降)

### 手順

```bash
# 1. 依存インストール
npm install

# 2. 環境変数
cp .env.example .env.local

# 3. ローカル Supabase を起動(Docker が必要)
supabase start
#   → 表示される API URL / anon key / service_role key を .env.local に貼る

# 4. マイグレーション + シードカテゴリを適用
supabase db reset      # supabase/migrations/*.sql と supabase/seed.sql を流し込む

# 5. 開発サーバ
npm run dev            # http://localhost:3000
```

`supabase start` が出力する値を `.env.local` に設定してください:

| 変数 | 説明 |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ローカルは `http://127.0.0.1:54321` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `supabase start` が出力する anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | 同 service_role key(**サーバ専用**・RLS をバイパス。M2/M4 で使用) |
| `NEXT_PUBLIC_SITE_URL` | 例 `http://localhost:3000` |
| `ANTHROPIC_API_KEY` | Anthropic API キー(M2 以降) |
| `ANTHROPIC_MODEL` | 解析に使うモデル ID(既定 `claude-sonnet-4-6`) |
| `ANALYSIS_WORKER_SECRET` | 解析ワーカー起動用の共有シークレット(M2) |

### Google OAuth(任意)

`supabase/config.toml` の `[auth.external.google]` を `enabled = true` にし、
`SUPABASE_AUTH_GOOGLE_CLIENT_ID` / `SUPABASE_AUTH_GOOGLE_SECRET` を環境変数に設定してから `supabase start` を再実行します。設定しない場合はメール+パスワードのみで動作します(ローカルではメール確認は無効: `enable_confirmations = false`)。

## スクリプト

```bash
npm run dev         # 開発サーバ
npm run build       # 本番ビルド
npm run typecheck   # tsc --noEmit
npm run lint        # next lint
npm run test        # vitest(ユニット/コンポーネントテスト)
npm run db:reset    # ローカル DB をマイグレーション+シードで再構築
```

## ディレクトリ構成

```
src/app/            App Router のページ・ルート
src/components/     UI コンポーネント
src/lib/            Supabase クライアント、クエリ、Server Actions、ヘルパー
config/             運用中に調整する設定(ランキング係数など。コード変更不要)
prompts/            LLM プロンプト(M2。コード変更なしで調整可能)
supabase/migrations 各マイルストーンごとの SQL マイグレーション
supabase/seed.sql   初期カテゴリのシード
```

## 設計上の約束

- **金銭・換金機能は一切実装しない**(仕様書 §1.4 / §10)。貢献スコアは reputation 型の累積値で、換金・交換・購入に繋がるテーブル・カラム・UI を持たない。
- プロンプト・カテゴリ・解決策はハードコードせず、データ/設定として外出しする。
- 投稿の削除は論理削除(データ資産保全)。ユーザーには「削除」と表示する。
