-- 企業アカウント用のロール 'company' を追加する。
-- 企業の困りごと投稿には一覧・詳細で「企業」バッジが付き、一覧で絞り込みできる。
-- 企業アカウントの指定は運営が手動で行う:
--   update public.users set role='company' where id='<uid>';

alter table public.users drop constraint users_role_check;
alter table public.users
  add constraint users_role_check check (role in ('user', 'admin', 'seed', 'company'));
