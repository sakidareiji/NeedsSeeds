-- ============================================================================
-- 問い合わせ窓口(公開前必須)
--
-- 個人情報を取得し広告を掲載する以上、開示・訂正・削除の請求や権利侵害の
-- 申告を受け付ける窓口が必要。メールアドレスを直接晒す代わりにフォームを置き、
-- 受信内容をここに保存する(SMTP 障害でも問い合わせを取りこぼさないため、
-- 保存を正、メール通知を副とする)。
--
-- 問い合わせ本文には氏名・連絡先が書かれうるので、クライアントには一切
-- 公開しない(RLS 有効 + ポリシーなし + GRANT 剥奪 = サービスロール専用)。
-- ============================================================================

create table public.contact_messages (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references public.users (id) on delete set null,  -- ログイン中なら記録
  name       text check (name is null or char_length(name) <= 60),
  email      text not null check (char_length(email) between 3 and 200),
  category   text not null
               check (category in ('general', 'disclosure', 'deletion', 'infringement', 'ad', 'other')),
  message    text not null check (char_length(message) between 1 and 2000),
  ip         text,          -- 連投抑止(レートリミット)の集計キー
  status     text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default now()
);

create index contact_messages_status_idx on public.contact_messages (status, created_at desc);
create index contact_messages_ip_created_idx on public.contact_messages (ip, created_at desc);

alter table public.contact_messages enable row level security;

-- ポリシーを一切置かない = 一般ロールからは読み書き不可。多重防御で GRANT も剥がす
-- (0005 の alter default privileges により新規テーブルにも自動付与されるため)。
revoke all on public.contact_messages from anon, authenticated;
