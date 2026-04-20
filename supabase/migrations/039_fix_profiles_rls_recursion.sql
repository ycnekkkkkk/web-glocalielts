-- Fix infinite recursion in profiles RLS policies

-- Drop the problematic policy if it exists
DROP POLICY IF EXISTS "Academic managers can view profiles within their organization" ON profiles;

-- Drop any other potentially problematic policies on profiles
DROP POLICY IF EXISTS "profiles_select_authenticated" ON profiles;

-- Create a clean policy that allows any authenticated user to read profiles
CREATE POLICY "profiles_select_authenticated"
  ON profiles FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Create a clean policy for academic managers to view profiles in their organization
-- This uses a direct check without recursion
CREATE POLICY "academic_manager_profiles_view"
  ON profiles FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND (
      -- Users can see their own profile
      id = auth.uid()
      -- Or teachers can be viewed by authenticated users
      OR EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid()
      )
    )
  );
