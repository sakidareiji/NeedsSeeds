# Needs Seeds

日常や業務の「困りごと」を投稿すると、AIが解析して解決策(アフィリエイト案件・一般アドバイス)を自動提示し、良質な投稿には AI 査定による**貢献スコア**(換金不可)が蓄積される Web サービス。

- 仕様書: [`needs_seeds_mvp_spec.md`](./needs_seeds_mvp_spec.md)
- スタック: Next.js (App Router, TypeScript) / Supabase (PostgreSQL, Auth, RLS) / Gemini API(Anthropic API にも切替可) / Tailwind CSS / Vercel

## 実装状況(マイルストーン)

| | 内容 | 状態 |
|---|---|---|
| M1 | 骨格 — 認証、投稿CRUD、カテゴリ、一覧・詳細(SSR) | ✅ 完了 |
| M2 | 核 — AI解析パイプライン、解決策マスタ、自動提示、PR表記、クリック計測 | ✅ 完了 |
| M3 | 循環 — わかる、解決報告、貢献スコア・グレード、通知、プロフィール実績 | ✅ 完了 |
| M4 | 運営 — 管理画面、種投稿インポート、モデレーション、通報 | ✅ 完了 |
| M5 | 公開準備 — SEO、静的ページ、レートリミット、デプロイ | ✅ 完了 |

## セットアップ

### 前提

- **Node.js 22+** / npm(@supabase/supabase-js がグローバルの WebSocket を要求するため。
  20 系だと `createClient` の時点で例外になり、全ページが 500 になります)
- [Supabase CLI](https://supabase.com/docs/guides/cli)(ローカル DB 用。内部で Docker を使用)
- Gemini API キー(M2 のAI解析用。Anthropic API キーでも可)

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
| `LLM_PROVIDER` | AI解析のプロバイダ: `gemini` / `anthropic`。未指定ならキーがある方(両方なら gemini) |
| `GEMINI_API_KEY` | Gemini API キー(既定プロバイダ。M2 以降) |
| `GEMINI_MODEL` | 解析に使うモデル ID(既定 `gemini-2.5-flash`) |
| `ANTHROPIC_API_KEY` | Anthropic API キー(切替用。実装は残している) |
| `ANTHROPIC_MODEL` | 同モデル ID(既定 `claude-sonnet-4-6`) |
| `ANALYSIS_WORKER_SECRET` | 解析ワーカー(`/api/analyze`)の共有シークレット。未設定だと 503 |
| `CONTACT_EMAIL` | 問い合わせ(`/contact`)受信時の通知先。未設定なら通知だけスキップ(受付・保存は動く) |

### AI 解析パイプライン(M2)の動作

- 投稿・編集時に `ai_status='pending'` で保存し、AI 解析を **非同期** に起動する(保存はブロックしない)。
- 解析は **1 投稿 1 回の LLM 呼び出し**(forced tool call → zod 検証、失敗時は最大2回リトライ→ `ai_status='failed'` で人力確認キューへ)。
- `ai_status='pending' / 'failed'` を DB フラグ(=簡易キュー)として、Vercel Cron が毎分 `/api/analyze`(GET)で拾い直す。ローカル開発では投稿直後に fire-and-forget で走る。
- **Vercel Cron の認可**: `ANALYSIS_WORKER_SECRET` と同じ値を `CRON_SECRET` に設定すると、Cron の `Authorization: Bearer` が通る。手動実行は `curl -XPOST -H "x-worker-secret: <secret>" $SITE/api/analyze`(`{"postId":"..."}` で単一投稿も可)。
- **⚠️ 毎分 Cron は Vercel Pro 以上が必要**(Hobby は1日1回まで。短い間隔だとデプロイが失敗する)。無料で運用する場合は `vercel.json` の `crons` を削除し、外部の Cron サービスから上記の `curl` を叩く。詳細は [`docs/release.md`](./docs/release.md) の「4-4. Cron の確認」。
- **排他制御(0017)**: 拾った投稿は `ai_status='processing'` にして確保するため、Cron と手動実行・投稿直後の起動が重なっても二重に LLM を呼ばない。確保したまま落ちたワーカーの投稿は10分後に回収される。
- 解決策マスタが空でもパイプラインは動作し、マッチ0件時は一般アドバイスを提示する。ローカルでは `supabase/seed.sql` にサンプル解決策を投入済み。

### 運営管理画面(M4)

- `/admin` は `users.role = 'admin'` のみアクセス可。管理操作はサービスロール(admin client)で実行する。
- 機能: 投稿一覧/検索/公開状態変更・通報キュー・解析失敗キュー(再解析)・解決策マスタCRUD・カテゴリCRUD・KPI簡易表示・**種投稿の CSV/JSON 一括インポート**。
- 最初の管理者は手動で付与する(ローカル): `supabase start` 後に SQL で `update public.users set role='admin' where id='<自分のauth uid>';`(Studio か psql で実行)。
- **運営(admin)アカウントの投稿はユーザー向け一覧・プロフィールに表示されない**(運用・テスト投稿の混入防止。種投稿=seed は表示される)。
- **企業アカウント**(将来用): `update public.users set role='company' where id='<uid>';` で指定すると投稿・プロフィールに「企業」バッジが付く。企業からの投稿はまだ正式な仕様ではなく、一覧の絞り込み等は未実装。
- 種投稿インポート: 管理画面でシードアカウント(role=seed)を作成 → CSV/JSON を貼り付けて割り当て。CSV ヘッダは `title,body,category,severity,frequency`(category はカテゴリ slug)。

### Google OAuth(任意)

既定では**メール+パスワードのみ**で動作し、Google ボタンは表示されません
(`NEXT_PUBLIC_GOOGLE_AUTH_ENABLED` が未設定/`false` のため)。有効化する場合:

1. `supabase/config.toml` の `[auth.external.google]` を `enabled = true` にする。
2. `SUPABASE_AUTH_GOOGLE_CLIENT_ID` / `SUPABASE_AUTH_GOOGLE_SECRET` を環境変数に設定して `supabase start` を再実行(ホスト版は Dashboard → Authentication → Providers → Google で設定)。
3. `.env.local` に `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true` を追加して Google ボタンを表示。

> ⚠️ プロバイダを有効化せずに Google ボタンを押すと Supabase が
> `Unsupported provider: provider is not enabled` を返します。有効化するまでは
> `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=false`(既定)のままにしてください。

### メール確認(F1)

新規登録には確認メールのリンクを開く必要があります(`enable_confirmations = true`)。

- 確認リンクは `/auth/confirm?token_hash=...&type=email` に着地し、`verifyOtp` で検証します
  (登録したブラウザと別のブラウザでリンクを開いても動作します)。
  テンプレートは `supabase/templates/confirmation.html`。
- ローカルで届いたメールは http://localhost:54324 (Mailpit/Inbucket) で確認できます。
- 未確認のままログインしようとするとエラーになり、確認メールの再送ボタンが表示されます。
- 本番は Dashboard → Authentication で **Confirm email を有効化**し、
  Email Templates の Confirm signup に `supabase/templates/confirmation.html` と
  同じ内容(リンク先 `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email`)を設定します。

### パスワード再設定(F1)

メール+パスワードで登録したユーザーが、パスワードを忘れても復帰できるようにします
(これが無いと、忘れた時点で投稿の編集も退会もできなくなります)。

```
/login の「パスワードをお忘れですか?」
  → /forgot-password        resetPasswordForEmail でメール送信
  → メールのリンク            /auth/confirm?token_hash=...&type=recovery&next=/reset-password
  → /reset-password         セッションが張られた状態で updateUser({ password })
```

- 確認メールと同じ **token_hash 方式**なので、スマホのメールアプリなど別のブラウザで
  開いても検証できます。テンプレートは `supabase/templates/recovery.html`。
- **アカウントの有無は伝えません**。登録が無いメールアドレスでも同じ完了画面を出します
  (第三者に登録の有無を教えないため)。
- `/auth/confirm` の `next` は自サイト内の相対パスのみ許可します(オープンリダイレクト防止)。
- リンクが期限切れ・無効の場合と、セッション無しで `/reset-password` を直接開いた場合は、
  どちらも `/forgot-password?error=expired` に戻して再送を促します。
- 本番は Dashboard → Authentication → Email Templates → **Reset Password** に
  `supabase/templates/recovery.html` と同じ内容を設定します(`next=/reset-password` を落とさないこと)。
- Google ログインのアカウントにはパスワードがないため、この導線は使いません。

### 通知メール(再訪トリガー)

AI解析で解決のヒントが**初めて提示されたとき**、投稿者に1通だけお知らせメールを
送ります(`src/lib/email.ts` / `emailSolutionPresented`)。編集による再解析では
重複送信しません。退会済みユーザーには送りません。

- ローカル: 設定不要。Mailpit の SMTP(127.0.0.1:54325、`config.toml` の
  `smtp_port`)へ送信され、http://localhost:54324 で確認できます。
- 本番: `.env` に `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` /
  `EMAIL_FROM` を設定します(`.env.example` 参照)。**未設定の場合は送信を
  スキップ**するだけで、投稿・解析には影響しません。

### 問い合わせ窓口(`/contact`)

個人情報の開示・訂正・削除の請求、権利侵害の申告を受け付ける公開窓口です
(個人情報を取得し広告を掲載する以上、窓口の設置は公開の前提)。未ログインでも送信できます。

- 受信内容は `contact_messages` に保存され、**運営は `/admin/contact` から読む**
  (RLS + GRANT 剥奪でサービスロール専用。一般ユーザーからは読めません)。
- `CONTACT_EMAIL` を設定すると、受信時に運営へメール通知も飛びます(**保存が正・通知は副**。
  SMTP 障害で問い合わせを取りこぼさないため)。
- スパム対策: 同一IPから 5件/時(`config/limits.ts` の `contactsPerHour`)+ ハニーポット。

### 一覧の並び(0019)

注目順・新着の並び替え、運営投稿の除外、ページング、キーワード検索は
**DB 関数 `feed_post_ids()` に集約**している(アプリは並んだ id を受け取り、
本体を通常の RLS 経由で引くだけ)。以前の「100件だけ取ってアプリ側でソート」では
窓より古い高共感の投稿がランク外に落ち、ページ境界もずれていた。

- 注目順の重みは `ranking_weights` テーブル(1行)。**デプロイなしで調整できる**:
  ```sql
  update public.ranking_weights set empathy_weight = 0.8, half_life_hours = 72;
  ```
- 重みと `quality_score` はクライアントから読めない(並び順から査定値を逆算されないため)。
- 並びの性質は `src/lib/__tests__/feed-ranking.integration.test.ts` で実 DB に対して検証する。

### 非公開の情報について(0015 / 0016)

anon キーは公開されるため、「UIに出していない = 秘密」ではありません。以下は
RLS(行)ではなく**列単位の GRANT / テーブル分離**で塞いでいます。

- `users.gender` / `age` → `user_private` テーブル(本人のみ RLS で読み書き)。
- `posts.quality_score`(AI査定) → anon/authenticated から列単位で revoke。
  注目順の算出だけがサービスロールで読みます(`fetchQualityScores`)。
- 「わかる」「私も解決した」は RLS 側でも自己リアクション・非公開投稿・連投を拒否
  (Server Action だけの検証では REST 直叩きで回避できるため)。
- **posts を読むクエリは列を必ず明示すること**(`select=*` は permission denied になります)。

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
config/             運用中に調整する設定(貢献スコア・グレード・レートリミット。コード変更不要)
prompts/            LLM プロンプト(M2。コード変更なしで調整可能)
supabase/migrations 各マイルストーンごとの SQL マイグレーション
supabase/seed.sql   初期カテゴリのシード
```

## 公開準備(M5)

- **SEO**: 投稿詳細は SSR + `title/本文` から meta/OGP を生成。`/sitemap.xml`(公開投稿・カテゴリ・静的ページ)と `/robots.txt`(`/admin` `/api` `/go` などを除外)を自動生成。
- **レートリミット(§7)**: 投稿 10件/日/ユーザー、わかる 200回/日/ユーザー。しきい値は `config/limits.ts`。
- **静的ページ**: 利用規約 / プライバシー / 運営者情報(内容はプレースホルダ、ルートは用意済み)。
- **アナリティクス(任意)**: Vercel の Web Analytics をダッシュボードで有効化(§F9「Vercel Analytics 程度でよい」)。SPA 遷移も計測したい場合は `@vercel/analytics` を追加し `<Analytics />` を `app/layout.tsx` に挿入(現状は依存衝突回避のため未同梱)。

## デプロイ(Vercel + Supabase)

1. **Supabase(本番)**: プロジェクトを作成し、`supabase link` → `supabase db push` でマイグレーションを適用、`supabase/seed.sql` のカテゴリを投入。Auth の Google プロバイダ設定と、Site URL / Redirect URL に本番ドメインを登録。メール確認を有効化し、Confirm signup テンプレートを設定(上記「メール確認(F1)」参照)。
2. **Vercel**: リポジトリを import。環境変数(`.env.example` 参照)を設定:
   - `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY`
   - `LLM_PROVIDER` / `GEMINI_API_KEY` / `GEMINI_MODEL`(Anthropic を使う場合は `ANTHROPIC_API_KEY` / `ANTHROPIC_MODEL`)
   - `NEXT_PUBLIC_SITE_URL`(本番ドメイン)
   - `ANALYSIS_WORKER_SECRET` と、同値の `CRON_SECRET`(`vercel.json` の毎分 Cron が `/api/analyze` を叩く際の認可)
3. **初回管理者**: 自分のアカウントで登録後、`update public.users set role='admin' where id='<auth uid>';` を実行。
4. LLM 障害時もサイト閲覧・投稿は継続する設計(解析だけ遅延)。ランニングコスト目標は月 5,000円以下。

## 設計上の約束

- **金銭・換金機能は一切実装しない**(仕様書 §1.4 / §10)。貢献スコアは reputation 型の累積値で、換金・交換・購入に繋がるテーブル・カラム・UI を持たない。
- プロンプト・カテゴリ・解決策はハードコードせず、データ/設定として外出しする。
- 投稿の削除は論理削除(データ資産保全)。ユーザーには「削除」と表示する。
