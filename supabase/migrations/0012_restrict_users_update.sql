-- ============================================================================
-- 権限昇格の防止: users テーブルの UPDATE を列単位に制限する(セキュリティ修正)
--
-- 背景: 0005_grants.sql が authenticated ロールに全テーブルの UPDATE を付与し、
-- users の RLS 更新ポリシーは行の所有(auth.uid()=id)しか見ていないため、
-- ログインユーザーが公開 anon キー + 自分の JWT で PostgREST を直接叩き、
-- 自分の users 行の role を 'admin' に、contribution_score を任意値に
-- 書き換えられてしまう(管理者判定は users.role のみに依存)。
--
-- 対策: authenticated のテーブル全体 UPDATE を剥がし、プロフィール編集で
-- 実際に更新する列だけを許可する。role / contribution_score / created_at /
-- id は authenticated からは一切更新できなくなる。
-- role・contribution_score の更新は従来どおり service_role(管理操作・
-- 貢献スコア付与・退会処理)経由でのみ行われる。
-- ============================================================================

-- anon はそもそも users を更新する必要がない(RLS でも弾かれるが多重防御)。
revoke update on public.users from anon;

-- テーブル全体の UPDATE を剥がしてから、許可する列だけを付与し直す
-- (テーブルレベルの UPDATE 権限が残っていると列レベルの制限は効かないため)。
revoke update on public.users from authenticated;
grant update (display_name, bio, gender, age) on public.users to authenticated;

-- service_role(管理クライアント)は RLS を迂回する信頼済み経路なので、
-- 全列 UPDATE を維持する(0005 で付与済み。ここでは変更しない)。
