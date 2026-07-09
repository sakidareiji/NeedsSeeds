-- カテゴリページの説明文(SEO)。/c/[slug] の見出し下と meta description に使う。
alter table public.categories
  add column if not exists description text not null default '';

-- upsert にしているのは、フレッシュな DB では migration が seed.sql より先に
-- 走るため(insert しないと description の update 先が存在しない)。
-- 既存 DB では on conflict 側が効いて description だけが更新される。
insert into public.categories (slug, name, sort_order, is_active, description) values
  ('money-tax', 'お金・確定申告', 10,  true, '確定申告や税金、経費、請求書・入金管理など、お金まわりの困りごとと解決のヒントを集めたページです。'),
  ('tools',     '仕事のツール',   20,  true, '会計ソフトやタスク管理、デザインツールなど、仕事で使うツールの選び方・使い方の困りごとを集めています。'),
  ('sales',     '営業・集客',     30,  true, '顧客獲得や単価交渉、SNS・Webでの集客など、営業と集客の困りごとと解決のヒントを集めたページです。'),
  ('legal',     '契約・法務',     40,  true, '業務委託契約や著作権、インボイス対応など、契約・法務まわりの困りごとを集めています。'),
  ('worktime',  '働き方・時間',   50,  true, 'スケジュール管理や納期、仕事とプライベートの両立など、働き方と時間の困りごとを集めたページです。'),
  ('health',    '健康・メンタル', 60,  true, '睡眠や運動不足、ストレス、孤独感など、心と体の健康に関する困りごとと解決のヒントを集めています。'),
  ('skill',     'スキル・学習',   70,  true, '新しいスキルの習得や勉強の継続、資格取得など、学びに関する困りごとを集めたページです。'),
  ('relations', '人間関係',       80,  true, '取引先や家族、友人とのコミュニケーションなど、人間関係の困りごとと解決のヒントを集めています。'),
  ('life',      '暮らし',         90,  true, '家事や引っ越し、子育て、近所付き合いなど、日々の暮らしの困りごとを集めたページです。'),
  ('other',     'その他',        100,  true, 'どのカテゴリにも当てはまらない、さまざまな困りごとを集めたページです。')
on conflict (slug) do update set description = excluded.description;
