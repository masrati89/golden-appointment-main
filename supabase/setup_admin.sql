-- ============================================================
-- Setup first admin user for Golden Appointment
-- Run this AFTER creating a user in Supabase Authentication
-- ============================================================
--
-- Step 1: Create a user in Supabase Dashboard
--   - Go to: Authentication -> Users -> Add user
--   - Enter email and password
--   - Click "Create user"
--
-- Step 2: Copy the user's UUID
--   - In the Users table, find the new user and copy the "UID" (UUID)
--
-- Step 3: Run the command below - replace YOUR_USER_UUID with the actual UUID
--
-- ============================================================

-- Grant admin role to user (replace with real UUID)
INSERT INTO public.user_roles (user_id, role)
VALUES ('YOUR_USER_UUID'::uuid, 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- Example (uncomment and use your UUID):
-- INSERT INTO public.user_roles (user_id, role)
-- VALUES ('a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid, 'admin')
-- ON CONFLICT (user_id, role) DO NOTHING;
