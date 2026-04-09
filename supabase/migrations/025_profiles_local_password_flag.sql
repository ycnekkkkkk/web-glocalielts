-- ============================================================
-- Migration 025: Đánh dấu tài khoản đã thiết lập mật khẩu local
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS has_local_password BOOLEAN NOT NULL DEFAULT FALSE;
