-- GuardIA Dashboard — Audit Logs Migration
-- Run this in Supabase SQL Editor after add_auth_profiles.sql
--
-- Creates an audit_logs table to track all operator actions:
-- annotations, presets, exports, config changes, user management, etc.

-- ============================================================
-- 1. Audit logs table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email    TEXT NOT NULL,
  action        TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id   TEXT NOT NULL,
  details       JSONB DEFAULT '{}',
  ip_address    TEXT,
  timestamp     TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 2. Indexes for fast queries
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON public.audit_logs (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs (action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON public.audit_logs (resource_type, resource_id);

-- ============================================================
-- 3. Row Level Security
-- ============================================================
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read audit logs
-- (operators need to see who made annotations etc.)
CREATE POLICY "audit_logs_read_all" ON public.audit_logs
  FOR SELECT USING (auth.role() = 'authenticated');

-- Users can insert their own audit logs
CREATE POLICY "audit_logs_insert_own" ON public.audit_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Only admins can delete audit logs
CREATE POLICY "audit_logs_delete_admin" ON public.audit_logs
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- ============================================================
-- 4. Auto-cleanup: keep last 90 days
-- ============================================================
CREATE OR REPLACE FUNCTION public.cleanup_old_audit_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.audit_logs
  WHERE timestamp < now() - INTERVAL '90 days';
END;
$$;

-- ============================================================
-- 5. Updated_at trigger
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_audit_created_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.created_at = now();
  RETURN NEW;
END;
$$;

-- ============================================================
-- 6. Add created_by to camera_events annotations
--    (optional: track who made each annotation)
-- ============================================================
-- Uncomment to add author tracking column:
-- ALTER TABLE public.camera_events
--   ADD COLUMN IF NOT EXISTS last_modified_by UUID REFERENCES auth.users(id);
-- ALTER TABLE public.camera_events
--   ADD COLUMN IF NOT EXISTS last_modified_at TIMESTAMPTZ;
