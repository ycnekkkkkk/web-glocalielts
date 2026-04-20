-- Migration 047: Fix audit_trigger_fn to bypass RLS completely
-- Root cause: audit_trigger_fn is SECURITY DEFINER but RLS still runs.
-- When trigger calls auth.uid() inside RLS policy context on audit_logs, it returns NULL
-- → audit_logs INSERT policy fails → causes 500 error on classes INSERT
-- Fix: SET row_security = off inside the trigger function so it bypasses RLS entirely

CREATE OR REPLACE FUNCTION public.audit_trigger_fn()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET row_security = off
AS $$
DECLARE
  v_user_id UUID;
  v_name    TEXT;
  v_role    TEXT;
BEGIN
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

  RETURN NULL;
END;
$$;

-- The audit_logs INSERT policy we added in 046 is now redundant (RLS bypassed above)
-- But keep it for safety — it does no harm
