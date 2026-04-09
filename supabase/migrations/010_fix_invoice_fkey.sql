-- ============================================================
-- Migration 010: Fix invoices.enrollment_id FK
-- ============================================================
-- Khi xóa enrollment (do xóa lớp hoặc xóa học viên),
-- hóa đơn liên quan KHÔNG nên bị xóa (dữ liệu tài chính cần giữ).
-- Dùng ON DELETE SET NULL: giữ hóa đơn, chỉ xóa liên kết.
-- ============================================================

ALTER TABLE public.invoices
  DROP CONSTRAINT IF EXISTS invoices_enrollment_id_fkey;

ALTER TABLE public.invoices
  ADD CONSTRAINT invoices_enrollment_id_fkey
  FOREIGN KEY (enrollment_id)
  REFERENCES public.enrollments(id)
  ON DELETE SET NULL;
