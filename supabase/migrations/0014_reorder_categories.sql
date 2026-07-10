-- ============================================================================
-- カテゴリ表示順の見直し(ポジショニング)
--
-- サービスの中身はフリーランス/個人事業主のお金・仕事の悩みに特化するが、
-- カテゴリの並びが「お金・確定申告」先頭だと "アフィリで稼げる順に並べた
-- 広告サイト" という下心が透けて信頼(ひいてはSEO流入)を損なう。
--
-- そこで並びは収益意図ではなく「普遍的に共感されやすい順」にする:
-- 暮らし・働き方・人間関係・健康・学習を上に、商用意図の強いツール・お金・
-- 営業・法務を中ほど〜下に置く。マッチングは投稿ごとに裏で走るため、
-- 表示順を変えても解決策提示・収益には影響しない。
-- ============================================================================

update public.categories set sort_order = 10  where slug = 'life';       -- 暮らし
update public.categories set sort_order = 20  where slug = 'worktime';   -- 働き方・時間
update public.categories set sort_order = 30  where slug = 'relations';  -- 人間関係
update public.categories set sort_order = 40  where slug = 'health';     -- 健康・メンタル
update public.categories set sort_order = 50  where slug = 'skill';      -- スキル・学習
update public.categories set sort_order = 60  where slug = 'tools';      -- 仕事のツール
update public.categories set sort_order = 70  where slug = 'money-tax';  -- お金・確定申告
update public.categories set sort_order = 80  where slug = 'sales';      -- 営業・集客
update public.categories set sort_order = 90  where slug = 'legal';      -- 契約・法務
update public.categories set sort_order = 100 where slug = 'other';      -- その他
