-- Migration 048: Debug current policies on classes and fix with explicit unrestricted policy
-- First, let's see all existing policies (these are informational SELECTs)
-- Then create the most permissive policy possible for INSERT

-- Check existing policies
-- SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'classes';

-- Drop ALL existing insert policies on classes first
DROP POLICY IF EXISTS "classes_insert_academic_manager" ON classes;
DROP POLICY IF EXISTS "classes_insert_admin" ON classes;
DROP POLICY IF EXISTS "classes_insert_authenticated" ON classes;

-- Create the most permissive INSERT policy possible:
-- ANY authenticated user can INSERT into classes (RLS check: always pass)
CREATE POLICY "classes_insert_any_authenticated" ON classes
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Also ensure the function that checks role is consistent
-- get_my_role: returns role from profiles, NULL if not found
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$;
GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated, anon, postgres;

-- Ensure audit_trigger_fn has row_security bypass
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
