-- 初期カテゴリ(§2)。運営が管理画面から追加・編集できる(M4)前提のシード。
insert into public.categories (slug, name, sort_order, is_active) values
  ('money-tax',   'お金・確定申告', 10, true),
  ('tools',       '仕事のツール',   20, true),
  ('sales',       '営業・集客',     30, true),
  ('legal',       '契約・法務',     40, true),
  ('worktime',    '働き方・時間',   50, true),
  ('life-other',  '暮らし・その他', 60, true)
on conflict (slug) do nothing;
