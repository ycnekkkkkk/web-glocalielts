-- Allow teachers to create/update makeup rows for classes they teach.
-- Scope is restricted via session_ref -> session_attendance.class_name.

DO $$ BEGIN
  CREATE POLICY "attendance_makeup_insert_teacher" ON public.attendance_makeup
    FOR INSERT
    WITH CHECK (
      public.get_my_role() = 'teacher'
      AND session_ref IN (
        SELECT sa.session_ref
        FROM public.session_attendance sa
        WHERE sa.class_name IN (
          SELECT c.name FROM public.classes c WHERE c.teacher_id = auth.uid()
        )
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "attendance_makeup_update_teacher" ON public.attendance_makeup
    FOR UPDATE
    USING (
      public.get_my_role() = 'teacher'
      AND session_ref IN (
        SELECT sa.session_ref
        FROM public.session_attendance sa
        WHERE sa.class_name IN (
          SELECT c.name FROM public.classes c WHERE c.teacher_id = auth.uid()
        )
      )
    )
    WITH CHECK (
      public.get_my_role() = 'teacher'
      AND session_ref IN (
        SELECT sa.session_ref
        FROM public.session_attendance sa
        WHERE sa.class_name IN (
          SELECT c.name FROM public.classes c WHERE c.teacher_id = auth.uid()
        )
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
