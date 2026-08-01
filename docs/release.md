# 本番リリース手順

ローカルで動いている Needs Seeds を本番公開するまでの全手順。上から順に進めれば公開できる。
所要時間の目安: **半日〜1日**(ドメインのDNS反映待ちを除く)。

> 以下、ドメインは `needsseeds.com` を例にする。別のドメインにした場合は読み替えること。

---

## 0. 事前に手元に揃えるもの

- [ ] クレジットカード(ドメイン代 年約$10)
- [ ] Google アカウント(GCP・Search Console 用)
- [ ] GitHub アカウント(リポジトリは push 済み: `sakidareiji/NeedsSeeds`)
- [ ] Gemini API キー(ローカルの `.env.local` で使用中のものでも可。本番用に分けるなら新規発行)

---

## 1. ドメイン取得(Cloudflare Registrar)

1. https://dash.cloudflare.com でアカウント作成
2. 「ドメイン登録」→「ドメインを登録」→ `needsseeds.com` を検索して購入(約$10/年、原価販売で更新料の吊り上げなし)
3. 購入すると自動で Cloudflare DNS の管理下に入る(後の手順でレコードを追加していく)

> **注意**: Cloudflare のプロキシ(オレンジ雲)は、後で Vercel に向ける CNAME/A レコードでは **オフ(DNS only / グレー雲)** にすること。Vercel が自前で SSL を張るため、二重プロキシは不具合の元。

---

## 2. Supabase 本番プロジェクト

### 2-1. プロジェクト作成

1. https://supabase.com/dashboard → New project
2. リージョンは **Tokyo (ap-northeast-1)**、DB パスワードは生成して保管
3. 作成後、Settings → API から以下を控える:
   - `Project URL`(例: `https://abcd1234.supabase.co`)→ `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` キー → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` キー → `SUPABASE_SERVICE_ROLE_KEY`(**絶対に公開しない**)

### 2-2. マイグレーションとシード投入

ローカルのプロジェクトディレクトリで:

```bash
supabase login
supabase link --project-ref <プロジェクトRef>   # URL の abcd1234 の部分
supabase db push                                # migration 0001〜0019 を適用
```

シード(カテゴリ・解決策マスタのサンプル)は SQL Editor から `supabase/seed.sql` の内容を貼り付けて実行する。
※ 解決策マスタのサンプル4件は URL がプレースホルダなので、公開前に管理画面(/admin/solutions)から実案件に差し替えるか無効化する。

### 2-3. Auth 基本設定

Dashboard → Authentication → URL Configuration:

- **Site URL**: `https://needsseeds.com`
- **Redirect URLs**: `https://needsseeds.com/auth/callback` を追加

### 2-4. メール確認の有効化(F1)

1. Authentication → Sign In / Up → Email → **Confirm email を ON**
2. Authentication → Email Templates → **Confirm signup** を開き、
   件名を `【Needs Seeds】メールアドレスの確認`、本文を `supabase/templates/confirmation.html` の内容に差し替える
   (確認リンクは `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email` になっていること)

### 2-4-2. パスワード再設定メールの設定(F1)

Authentication → Email Templates → **Reset Password** を開き、
件名を `【Needs Seeds】パスワードの再設定`、本文を `supabase/templates/recovery.html` の内容に差し替える。

リンクが以下の形になっていること(`next` が抜けると検証後にトップへ飛んでしまい、
新しいパスワードを入力できない):

```
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password
```

> 既定のテンプレート(`{{ .ConfirmationURL }}`)のままだと、別のブラウザ(スマホのメールアプリ等)で
> リンクを開いたときに PKCE の code 交換に失敗する。確認メールと同じ token_hash 方式に揃えること。

### 2-5. Google OAuth(本番)

1. https://console.cloud.google.com → 既存の OAuth クライアント(ローカル用に作成済み)を開く
2. 「承認済みのリダイレクト URI」に本番用を**追加**:
   ```
   https://<プロジェクトRef>.supabase.co/auth/v1/callback
   ```
3. OAuth 同意画面が「テスト」状態のままなら「本番」へ公開(テストのままだとテストユーザー以外弾かれる)
4. Supabase Dashboard → Authentication → Sign In / Up → Google を ON にし、
   クライアントID / シークレットを貼り付ける

---

## 3. メール送信(Resend)

認証メール(Supabase)と通知メール(アプリ)の両方に使う。無料枠は 100通/日・3,000通/月で当面十分。

### 3-1. ドメイン認証

1. https://resend.com でアカウント作成 → Domains → Add Domain → `needsseeds.com`
2. 表示される **SPF / DKIM の DNSレコード**を Cloudflare DNS にそのまま追加
3. Resend 側で Verify が通るまで待つ(数分〜1時間)

### 3-2. SMTP 資格情報の発行

Resend → API Keys ではなく **SMTP** の接続情報を使う:

- Host: `smtp.resend.com` / Port: `465`
- User: `resend` / Pass: (発行した API キー)

### 3-3. Supabase の SMTP 設定(認証メール用)

Dashboard → Project Settings → Auth → SMTP Settings を ON:

- Sender email: `noreply@needsseeds.com` / Sender name: `Needs Seeds`
- Host/Port/User/Pass: 上記 Resend の値

> これを設定しないと Supabase 内蔵メールのまま(1時間数通の制限付き・迷惑メール行きやすい)。

---

## 4. Vercel デプロイ

### 4-1. プロジェクト作成

1. https://vercel.com → Add New → Project → GitHub の `NeedsSeeds` リポジトリを Import
2. Framework は Next.js が自動検出される。そのままではまだ Deploy しない(先に環境変数)

### 4-2. 環境変数(Settings → Environment Variables、Production)

| 変数 | 値 |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<プロジェクトRef>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | (2-1 で控えた anon キー) |
| `SUPABASE_SERVICE_ROLE_KEY` | (2-1 で控えた service_role キー) |
| `LLM_PROVIDER` | `gemini` |
| `GEMINI_API_KEY` | (Gemini API キー) |
| `GEMINI_MODEL` | `gemini-2.5-flash` |
| `NEXT_PUBLIC_SITE_URL` | `https://needsseeds.com` |
| `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED` | `true`(2-5 を完了した場合のみ。未完なら `false`) |
| `ANALYSIS_WORKER_SECRET` | ランダム文字列(`openssl rand -hex 32` で生成) |
| `CRON_SECRET` | **`ANALYSIS_WORKER_SECRET` と同じ値**(Vercel Cron の認証に使われる) |
| `SMTP_HOST` | `smtp.resend.com` |
| `SMTP_PORT` | `465` |
| `SMTP_USER` | `resend` |
| `SMTP_PASS` | (Resend の API キー) |
| `EMAIL_FROM` | `Needs Seeds <noreply@needsseeds.com>` |
| `CONTACT_EMAIL` | 問い合わせ通知の宛先(自分が受け取れるアドレス)。未設定でも受付は動くが、`/admin/contact` を見に行かないと気付けない |

### 4-3. デプロイとドメイン接続

1. Deploy 実行 → ビルド成功を確認
2. Settings → Domains → `needsseeds.com` を追加 → 表示された DNS レコード(A または CNAME)を Cloudflare に追加(**グレー雲 = DNS only**)
3. `https://needsseeds.com` が開けること、`www` → apex のリダイレクト設定を確認

### 4-4. Cron の確認(**プランに注意**)

`vercel.json` で毎分 `/api/analyze` を叩く設定にしてある。デプロイ後、Vercel → Settings → Cron Jobs に
`/api/analyze (* * * * *)` が表示されていれば OK(`CRON_SECRET` が一致していないと 401 になる)。

> ⚠️ **Hobby プランでは毎分 Cron を設定できない。** Hobby は 1日1回までで、
> それより短い間隔の式は **デプロイがエラーで失敗する**(「Hobby accounts are limited to
> daily cron jobs」)。しかも Hobby の Cron は指定時刻の1時間以内のどこかで実行される。
> 投稿から数十秒〜数分で解決ヒントを出すのが本サービスの体験なので、日次 Cron では成立しない。

選択肢は次の3つ。**A を推奨**(コストが budget 内に収まり、構成が一番単純)。

| | 方式 | 費用 | 解析の遅延 |
|---|---|---|---|
| **A** | **Vercel Pro** にして `vercel.json` の毎分 Cron をそのまま使う | $20/月(約3,000円) | 数十秒〜1分 |
| B | Hobby のまま、外部の無料 Cron サービス(cron-job.org 等)から毎分叩く | 0円 | 数十秒〜1分 |
| C | Hobby のまま `vercel.json` の `crons` を削除し、投稿直後の非同期起動だけに頼る | 0円 | **不定(取りこぼしあり)** |

- **B の設定**: `vercel.json` の `crons` を削除してデプロイ(残すとデプロイが失敗する)。
  外部サービスから以下を1分間隔で実行する。シークレットが URL に載らないようヘッダで渡すこと。

  ```bash
  curl -X POST -H "x-worker-secret: <ANALYSIS_WORKER_SECRET>" https://needsseeds.com/api/analyze
  ```

- **C は非推奨**。Vercel ではレスポンス返却後の処理が保証されないため、`ai_status='pending'`
  のまま残る投稿が出る(その投稿はヒントが永久に出ない)。採用するなら、運営が定期的に
  `/admin/analysis` を見て手動で再解析する運用が必要。

なお、解析ワーカーは同じ投稿を同時に処理しない(0017 で `processing` による排他確保を実装済み)ので、
Cron と手動実行が重なっても LLM が二重に課金されることはない。

---

## 5. リリース前チェックリスト(本番での動作確認)

上から順に実際に操作して確認する:

- [ ] トップページが表示され、カテゴリタブ・説明文が出る
- [ ] 新規登録 → 確認メールが**自分の実メールアドレス**に届く(迷惑メール行きでないこと)
- [ ] 確認リンク → ログインできる
- [ ] ログイン画面の「パスワードをお忘れですか?」→ 再設定メールが届き、
      リンクから新しいパスワードを設定してログインできる(古いパスワードでは入れない)
- [ ] Google でログインできる(`NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true` の場合)
- [ ] 投稿する → 1〜2分以内に AI 解析が走り「解決のヒント」が表示される(Cron 経由)
- [ ] ヒント提示のお知らせメールが届く
- [ ] ヒントのリンククリックで `/go/...` 経由で遷移する(クリック計測)
- [ ] 投稿詳細に「関連する困りごと」が表示される
- [ ] `https://needsseeds.com/sitemap.xml` と `/robots.txt` が返る
- [ ] 運営アカウントで `/admin` 系(投稿管理・解決策マスタ・KPI)が開ける
  - 運営化は SQL Editor で: `update public.users set role='admin' where id='<自分のuser id>';`
- [ ] 退会 → 同じメールで再登録できる
- [ ] スマホ実機で一通り(投稿・わかる・シェア)

---

## 6. 公開直後にやること(初週)

1. **Google Search Console** に登録(Cloudflare DNS で TXT 認証)→ sitemap.xml を送信
2. **種投稿の投入開始**: 実体験ベースの困りごとを1日5件目安、50〜100件まで。
   ※ 空のサービスには誰も投稿しない+ A8.net 審査の前提条件
3. **A8.net に登録・サイト審査申請**(種投稿がある程度貯まってから)→ 会計ソフト・請求書サービス等の案件と提携 → `/admin/solutions` の解決策マスタを実案件に差し替え
4. **X(旧Twitter)で発信開始**: 個人開発の制作記+「今日の困りごと」紹介。Zenn/note に開発記事を1本
5. 知人・コミュニティに「困りごとを1件投稿して」と直接依頼(10人)

## 7. 未実装の推奨施策(必要になったら)

- シェアボタン(投稿詳細・投稿完了画面に X シェア導線)← 実装コスト小・効果大
- Vercel Analytics か GA4(流入チャネルの計測)
- 週次ダイジェストメール(再訪装置。配信停止リンクとセットで)

---

## トラブルシューティング

| 症状 | 原因と対処 |
|---|---|
| 登録メールが届かない | Supabase SMTP 設定(3-3)漏れ、または Resend のドメイン Verify 未完了 |
| Google ログインで `redirect_uri_mismatch` | GCP のリダイレクト URI が `https://<Ref>.supabase.co/auth/v1/callback` と完全一致していない |
| 投稿しても解析が走らない | Vercel Cron の 401(`CRON_SECRET` 不一致)か `GEMINI_API_KEY` 未設定。Vercel の Functions ログを見る |
| 通知メールが来ない(認証メールは来る) | アプリ側 `SMTP_*` 環境変数の設定漏れ(3-2 の値)。未設定だと送信スキップされる |
| サイトが `vercel.app` では開くのに独自ドメインで開かない | DNS 反映待ち、または Cloudflare のプロキシがオン(グレー雲にする) |
