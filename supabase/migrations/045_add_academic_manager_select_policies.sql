-- Migration 045: Add missing SELECT policy for academic_manager on classes
-- academic_manager gets classes via academic_manager_class_assignments table,
-- but they need SELECT permission on classes table to read them.

-- Add SELECT policy for academic_manager
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'classes' AND policyname = 'classes_academic_manager_select'
  ) THEN
    CREATE POLICY "classes_academic_manager_select" ON classes
      FOR SELECT USING (
        public.get_my_role() = 'academic_manager'
        AND id IN (
          SELECT class_id FROM public.academic_manager_class_assignments
          WHERE manager_user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Also add SELECT policy for academic_manager on profiles (they need to read student/teacher profiles)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'profiles_academic_manager_select'
  ) THEN
    CREATE POLICY "profiles_academic_manager_select" ON profiles
      FOR SELECT USING (
        public.get_my_role() = 'academic_manager'
        AND (
          -- Can see teachers in their classes
          EXISTS (
            SELECT 1 FROM public.academic_manager_class_assignments amca
            JOIN public.classes c ON c.id = amca.class_id
            WHERE amca.manager_user_id = auth.uid() AND c.teacher_id = profiles.id
          )
          OR
          -- Can see students in their classes
          EXISTS (
            SELECT 1 FROM public.academic_manager_class_assignments amca
            JOIN public.enrollments e ON e.class_id = amca.class_id
            WHERE amca.manager_user_id = auth.uid() AND e.student_id = profiles.id
          )
          OR
          -- Can see their own profile
          id = auth.uid()
        )
      );
  END IF;
END $$;
