-- ============================================================================
-- 権限付与の補完(M1〜M3で漏れていた基本GRANT)
--
-- RLSポリシーは「テーブルへのアクセス権(GRANT)」の上に効くものであり、
-- GRANT 自体が無いと "permission denied for table" となり RLS ポリシーの
-- 評価にすら到達しない。以前のバージョンの Supabase では新規テーブルに
-- anon/authenticated/service_role への基本権限が自動付与されていたが、
-- 現行の CLI/Postgres イメージではこれが自動化されていないため明示的に付与する。
-- 既存テーブル + 将来追加されるテーブルの両方をカバーする。
-- ============================================================================

grant usage on schema public to anon, authenticated, service_role;

grant select, insert, update, delete on all tables in schema public
  to anon, authenticated, service_role;

grant usage, select on all sequences in schema public
  to anon, authenticated, service_role;

alter default privileges in schema public
  grant select, insert, update, delete on tables to anon, authenticated, service_role;

alter default privileges in schema public
  grant usage, select on sequences to anon, authenticated, service_role;
