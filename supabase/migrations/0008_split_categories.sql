-- ============================================================================
-- カテゴリ拡充:「暮らし・その他」を「暮らし」と「その他」に分離し、種類を増やす。
--
--   - 既存の 'life-other'(暮らし・その他)は 'life'(暮らし)へ改名する。
--     投稿は category_id で紐づくため、旧カテゴリの投稿はそのまま「暮らし」に残る。
--   - 「その他」は独立カテゴリとして新設し、末尾(sort_order 100)に置く。
--   - あわせて 健康・メンタル / スキル・学習 / 人間関係 を追加する。
--
-- カテゴリは運営が管理画面から編集(表示/並び順)できる前提。必要に応じ調整可。
-- seed.sql(新規セットアップ用)と最終状態を一致させている。
-- ============================================================================

update public.categories
  set slug = 'life', name = '暮らし', sort_order = 90
  where slug = 'life-other';

insert into public.categories (slug, name, sort_order, is_active) values
  ('health',    '健康・メンタル', 60,  true),
  ('skill',     'スキル・学習',   70,  true),
  ('relations', '人間関係',       80,  true),
  ('other',     'その他',        100,  true)
on conflict (slug) do nothing;
