-- ============================================================
-- Migration 004: DB-level Audit Triggers
-- Run AFTER 002_normalized_schema.sql
-- No frontend calls needed — all writes are auto-logged
-- ============================================================

-- Generic trigger function
CREATE OR REPLACE FUNCTION public.audit_trigger_fn()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id UUID;
  v_name    TEXT;
  v_role    TEXT;
BEGIN
  -- Safely get current user (may be NULL for service-role operations)
  BEGIN
    SELECT auth.uid() INTO v_user_id;
  EXCEPTION WHEN OTHERS THEN
    v_user_id := NULL;
  END;

  IF v_user_id IS NOT NULL THEN
    SELECT full_name, role INTO v_name, v_role
    FROM public.profiles WHERE id = v_user_id;
  END IF;

  INSERT INTO public.audit_logs
    (user_id, user_name, user_role, action, entity, entity_id, old_data, new_data)
  VALUES (
    v_user_id,
    v_name,
    v_role,
    TG_OP,
    TG_TABLE_NAME,
    CASE TG_OP WHEN 'DELETE' THEN OLD.id::TEXT ELSE NEW.id::TEXT END,
    CASE TG_OP WHEN 'INSERT' THEN NULL ELSE to_jsonb(OLD) END,
    CASE TG_OP WHEN 'DELETE' THEN NULL ELSE to_jsonb(NEW) END
  );

  RETURN NULL; -- AFTER trigger: return value is ignored
END;
$$;

-- Attach trigger to critical tables
-- (DROP first to allow re-run safely)

DROP TRIGGER IF EXISTS audit_classes          ON public.classes;
DROP TRIGGER IF EXISTS audit_students         ON public.students;
DROP TRIGGER IF EXISTS audit_enrollments      ON public.enrollments;
DROP TRIGGER IF EXISTS audit_invoices         ON public.invoices;
DROP TRIGGER IF EXISTS audit_payment_history  ON public.payment_history;
DROP TRIGGER IF EXISTS audit_sessions         ON public.sessions;

CREATE TRIGGER audit_classes
  AFTER INSERT OR UPDATE OR DELETE ON public.classes
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();

CREATE TRIGGER audit_students
  AFTER INSERT OR UPDATE OR DELETE ON public.students
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();

CREATE TRIGGER audit_enrollments
  AFTER INSERT OR UPDATE OR DELETE ON public.enrollments
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();

CREATE TRIGGER audit_invoices
  AFTER INSERT OR UPDATE OR DELETE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();

CREATE TRIGGER audit_payment_history
  AFTER INSERT OR UPDATE OR DELETE ON public.payment_history
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();

CREATE TRIGGER audit_sessions
  AFTER INSERT OR UPDATE OR DELETE ON public.sessions
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();
