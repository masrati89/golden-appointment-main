-- ================================================================
-- Migration: Add Google Calendar columns to settings table
-- 2026-02-25
--
-- Migration 20260216100001 was tracked as applied but the ALTER TABLE
-- never actually executed on the remote database, causing Postgres
-- error 42703 ("column does not exist") when set_google_calendar_tokens
-- RPC tries to write to google_calendar_refresh_token.
--
-- Both ADD COLUMN statements use IF NOT EXISTS — safe to re-run.
-- ================================================================

ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS google_calendar_refresh_token TEXT,
  ADD COLUMN IF NOT EXISTS google_calendar_connected BOOLEAN NOT NULL DEFAULT false;
