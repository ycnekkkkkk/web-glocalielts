-- Migration 052: Fix academic_manager_class_assignments SELECT policy
-- After migration 051 dropped all policies, the amca_manager_select policy was removed.
-- Academic manager can't SELECT from academic_manager_class_assignments to see their classes.

-- Re-add the SELECT policy for academic_manager_class_assignments
DROP POLICY IF EXISTS "amca_manager_select" ON academic_manager_class_assignments;
CREATE POLICY "amca_manager_select" ON academic_manager_class_assignments
  FOR SELECT USING (manager_user_id = auth.uid());

-- Also add INSERT policy so academic_manager can insert into this table
DROP POLICY IF EXISTS "amca_manager_insert" ON academic_manager_class_assignments;
CREATE POLICY "amca_manager_insert" ON academic_manager_class_assignments
  FOR INSERT WITH CHECK (manager_user_id = auth.uid());

-- Admin should have full access
DROP POLICY IF EXISTS "amca_admin_all" ON academic_manager_class_assignments;
CREATE POLICY "amca_admin_all" ON academic_manager_class_assignments
  FOR ALL USING (public.get_my_role() = 'admin');
