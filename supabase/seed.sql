-- 初期カテゴリ(§2)。運営が管理画面から追加・編集できる(M4)前提のシード。
-- 並び順は収益意図ではなく「普遍的に共感されやすい順」(§ポジショニング / migration 0014)。
insert into public.categories (slug, name, sort_order, is_active) values
  ('life',        '暮らし',         10,  true),
  ('worktime',    '働き方・時間',   20,  true),
  ('relations',   '人間関係',       30,  true),
  ('health',      '健康・メンタル', 40,  true),
  ('skill',       'スキル・学習',   50,  true),
  ('tools',       '仕事のツール',   60,  true),
  ('money-tax',   'お金・確定申告', 70,  true),
  ('sales',       '営業・集客',     80,  true),
  ('legal',       '契約・法務',     90,  true),
  ('other',       'その他',         100, true)
on conflict (slug) do nothing;

-- 解決策マスタのサンプル(F4)。運営が管理画面(M4)で管理する前提。URLはプレースホルダ。
-- is_affiliate=true には表示時に必ず PR 表記が付く。commercial_types は F3 の解決策タイプ。
insert into public.solutions (name, description, url, is_affiliate, commercial_types) values
  ('クラウド会計ソフト(サンプル)', '確定申告・帳簿付けを自動化するクラウド会計サービス。', 'https://example.com/accounting', true,  array['会計ソフト']),
  ('見積もり・請求書作成ツール(サンプル)', '見積書・請求書をテンプレートから作成し送付できるツール。', 'https://example.com/invoice', true, array['見積もりサービス','ツール']),
  ('国税庁 確定申告特集(サンプル)', '確定申告の手続き・様式を確認できる公的な案内ページ。', 'https://www.nta.go.jp/', false, array['会計ソフト','制度']),
  ('タスク管理・時間術の基礎(サンプル)', '時間管理やタスク整理の基本を学べる無料の学習コンテンツ。', 'https://example.com/timeblocking', false, array['講座・学習','ツール'])
on conflict do nothing;
