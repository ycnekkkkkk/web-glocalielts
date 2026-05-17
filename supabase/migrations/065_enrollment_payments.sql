-- Migration 065: Enrollment Payments (Multi-installment support)
CREATE TABLE IF NOT EXISTS public.enrollment_payments (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  enrollment_id UUID REFERENCES public.enrollments(id) ON DELETE CASCADE,
  amount       NUMERIC(12,0) NOT NULL,
  note         TEXT,
  paid_at      TIMESTAMPTZ DEFAULT NOW(),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_ep_enrollment_id ON public.enrollment_payments(enrollment_id);

-- Enable RLS
ALTER TABLE public.enrollment_payments ENABLE ROW LEVEL SECURITY;

-- Policies
DO $$ BEGIN
  CREATE POLICY "ep_admin_all" ON public.enrollment_payments 
    FOR ALL USING (public.get_my_role() IN ('admin', 'organization', 'academic_manager'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Trigger to auto-update enrollments.paid_amount
CREATE OR REPLACE FUNCTION public.update_enrollment_paid_amount()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
    UPDATE public.enrollments
    SET paid_amount = (
      SELECT COALESCE(SUM(amount), 0)
      FROM public.enrollment_payments
      WHERE enrollment_id = NEW.enrollment_id
    )
    WHERE id = NEW.enrollment_id;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE public.enrollments
    SET paid_amount = (
      SELECT COALESCE(SUM(amount), 0)
      FROM public.enrollment_payments
      WHERE enrollment_id = OLD.enrollment_id
    )
    WHERE id = OLD.enrollment_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_update_paid_amount
AFTER INSERT OR UPDATE OR DELETE ON public.enrollment_payments
FOR EACH ROW EXECUTE FUNCTION public.update_enrollment_paid_amount();
