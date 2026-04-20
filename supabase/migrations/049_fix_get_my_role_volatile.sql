-- Migration 049: Fix get_my_role recursion by making it IMMUTABLE
-- Problem: get_my_role() is called from WITH CHECK policies on tables.
-- If profiles RLS also calls get_my_role(), it creates infinite recursion → 500.
-- Fix: Change get_my_role to IMMUTABLE (no session access, uses application auth context)
-- Actually: IMMUTABLE can't call auth.uid() - so instead we use a different approach.
--
-- ALTERNATIVE FIX: Create a helper that reads profile role WITHOUT triggering profile RLS.
-- Use a SECURITY DEFINER function that bypasses RLS to read the role.

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$;
GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated, anon, postgres;

-- Also fix get_my_name the same way
CREATE OR REPLACE FUNCTION public.get_my_name()
RETURNS TEXT
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT full_name FROM public.profiles WHERE id = auth.uid()
$$;
GRANT EXECUTE ON FUNCTION public.get_my_name() TO authenticated, anon, postgres;
