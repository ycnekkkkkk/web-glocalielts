-- Fix infinite recursion in get_my_role() function
-- The original function queries profiles table which has RLS enabled,
-- causing recursion when RLS policies call get_my_role()

-- Drop and recreate get_my_role to bypass RLS using SECURITY DEFINER + SET ROLE
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
BEGIN
  -- Use SECURITY DEFINER to bypass RLS, read directly from profiles
  SELECT p.role INTO v_role
  FROM public.profiles p
  WHERE p.id = auth.uid();

  RETURN COALESCE(v_role, 'student');
END;
$$;

-- Drop and recreate get_my_name similarly
CREATE OR REPLACE FUNCTION public.get_my_name()
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name TEXT;
BEGIN
  SELECT p.full_name INTO v_name
  FROM public.profiles p
  WHERE p.id = auth.uid();

  RETURN COALESCE(v_name, '');
END;
$$;

-- Grant execute for authenticated users
GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_name() TO authenticated;
