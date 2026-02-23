-- ============================================================
-- Migration: Fix Admin User Roles
-- ============================================================
-- ROOT CAUSE:
--   create-admin-user Edge Function creates a NEW email/password user
--   and inserts that new UUID into user_roles. However, it never sets
--   admin_user_id in the settings table. The settings table was populated
--   separately with the actual Google OAuth user UUIDs as admin_user_id.
--
--   This means:
--     user_roles → has UUID of email/password dummy user (never logs in)
--     settings.admin_user_id → has UUID of real Google OAuth admin account
--     checkIsAdmin(googleOAuthUUID) → NOT FOUND in user_roles → false
--     Result: no admin can ever authenticate
--
-- FIX:
--   Insert user_roles entries for the REAL admin UUIDs — those already
--   stored in settings.admin_user_id. These are the Google OAuth accounts
--   that the business owners actually use to log in.
--
--   ON CONFLICT DO NOTHING ensures this is idempotent.
-- ============================================================

INSERT INTO public.user_roles (user_id, role)
SELECT admin_user_id, 'admin'
FROM public.settings
WHERE admin_user_id IS NOT NULL
ON CONFLICT DO NOTHING;
