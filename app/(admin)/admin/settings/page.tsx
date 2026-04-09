"use client";
import PageWrapper from "@/components/layouts/PageWrapper";
import { Card } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { createBrowserClient } from "@/lib/supabase/client";
import { CheckCircle, Copy, Database, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

interface DiagResult {
  label: string;
  ok: boolean;
  count?: number;
  error?: string;
}

const MIGRATION_013 = `-- Migration 013: Academic Manager Role & Portal
-- Chạy trong Supabase Dashboard → SQL Editor

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'teacher', 'student', 'organization', 'academic_manager'));

CREATE TABLE IF NOT EXISTS public.academic_manager_class_assignments (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id        UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  manager_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_by     UUID REFERENCES auth.users(id),
  assigned_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(class_id, manager_user_id)
);
CREATE INDEX IF NOT EXISTS idx_amca_manager ON public.academic_manager_class_assignments(manager_user_id);
CREATE INDEX IF NOT EXISTS idx_amca_class   ON public.academic_manager_class_assignments(class_id);
ALTER TABLE public.academic_manager_class_assignments ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "amca_admin_all" ON public.academic_manager_class_assignments
    FOR ALL USING (public.get_my_role() = 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "amca_manager_select" ON public.academic_manager_class_assignments
    FOR SELECT USING (manager_user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE OR REPLACE FUNCTION public.get_my_academic_manager_class_ids()
RETURNS TABLE(class_id UUID) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT a.class_id FROM public.academic_manager_class_assignments a WHERE a.manager_user_id = auth.uid();
$$;
GRANT EXECUTE ON FUNCTION public.get_my_academic_manager_class_ids() TO authenticated;

DO $$ BEGIN
  CREATE POLICY "classes_academic_manager" ON public.classes FOR SELECT USING (
    public.get_my_role() = 'academic_manager' AND id IN (SELECT class_id FROM public.get_my_academic_manager_class_ids()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "sessions_academic_manager" ON public.sessions FOR SELECT USING (
    public.get_my_role() = 'academic_manager' AND class_id IN (SELECT class_id FROM public.get_my_academic_manager_class_ids()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "enrollments_academic_manager" ON public.enrollments FOR SELECT USING (
    public.get_my_role() = 'academic_manager' AND class_id IN (SELECT class_id FROM public.get_my_academic_manager_class_ids()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;`;

const MIGRATION_014 = `-- Migration 014: Fix Admin RLS Access
-- Chạy trong Supabase Dashboard → SQL Editor
-- (An toàn nếu policy đã tồn tại — dùng EXCEPTION handler)

DO $$ BEGIN
  CREATE POLICY "sessions_select_admin_org" ON public.sessions
    FOR SELECT USING (public.get_my_role() IN ('admin', 'organization'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "sessions_write_admin" ON public.sessions
    FOR ALL USING (public.get_my_role() = 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "session_attendance_admin" ON public.session_attendance
    FOR ALL USING (public.get_my_role() = 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "sess_class_eval_admin" ON public.session_class_evaluation
    FOR ALL USING (public.get_my_role() = 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "sess_teacher_eval_admin" ON public.session_teacher_evaluation
    FOR ALL USING (public.get_my_role() = 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "sess_student_eval_admin" ON public.session_student_evaluation
    FOR ALL USING (public.get_my_role() = 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "attendance_makeup_admin" ON public.attendance_makeup
    FOR ALL USING (public.get_my_role() = 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "students_select_admin" ON public.students
    FOR SELECT USING (public.get_my_role() = 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "profiles_admin_all" ON public.profiles
    FOR ALL USING (public.get_my_role() = 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;`;

/** Nội dung đồng bộ với web/supabase/migrations/015_fix_enrollments_students_rls_recursion.sql */
const MIGRATION_015 = `-- Migration 015: Sửa đệ quy RLS enrollments ↔ students
-- Bắt buộc chạy nếu gặp: infinite recursion detected in policy for relation "enrollments"

CREATE OR REPLACE FUNCTION public.get_my_enrolled_student_ids()
RETURNS UUID[]
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(ARRAY_AGG(s.id), '{}')
  FROM public.students s WHERE s.profile_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_my_academic_manager_student_ids()
RETURNS UUID[]
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(ARRAY_AGG(DISTINCT e.student_id), '{}')
  FROM public.enrollments e
  INNER JOIN public.academic_manager_class_assignments a
    ON a.class_id = e.class_id AND a.manager_user_id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.get_my_enrolled_student_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_academic_manager_student_ids() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_my_role() RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;
CREATE OR REPLACE FUNCTION public.get_my_name() RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT full_name FROM public.profiles WHERE id = auth.uid();
$$;
GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_name() TO authenticated;

DROP POLICY IF EXISTS "enrollments_student" ON public.enrollments;
CREATE POLICY "enrollments_student" ON public.enrollments FOR SELECT USING (
  public.get_my_role() = 'student'
  AND student_id = ANY(public.get_my_enrolled_student_ids())
);

DROP POLICY IF EXISTS "students_academic_manager" ON public.students;
CREATE POLICY "students_academic_manager" ON public.students FOR SELECT USING (
  public.get_my_role() = 'academic_manager'
  AND id = ANY(public.get_my_academic_manager_student_ids())
);`;

export default function AdminSettingsPage() {
  const [diag, setDiag] = useState<DiagResult[]>([]);
  const [diagLoading, setDiagLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  async function runDiagnostics() {
    setDiagLoading(true);
    const supabase = createBrowserClient();
    const results: DiagResult[] = [];

    const checks = [
      { label: "Lớp học (classes)", table: "classes" },
      { label: "Buổi học (sessions)", table: "sessions" },
      { label: "Ghi danh (enrollments)", table: "enrollments" },
      { label: "Học viên (students)", table: "students" },
      { label: "Điểm danh (session_attendance)", table: "session_attendance" },
      { label: "Đánh giá lớp (session_class_evaluation)", table: "session_class_evaluation" },
      { label: "Phân công học vụ (academic_manager_class_assignments)", table: "academic_manager_class_assignments" },
    ];

    for (const check of checks) {
      const { count, error } = await supabase
        .from(check.table)
        .select("*", { count: "exact", head: true });
      results.push({
        label: check.label,
        ok: !error,
        count: count ?? undefined,
        error: error?.message,
      });
    }

    setDiag(results);
    setDiagLoading(false);
  }

  useEffect(() => { runDiagnostics(); }, []);

  function copySQL(id: string, sql: string) {
    navigator.clipboard.writeText(sql).then(() => {
      setCopied(id);
      toast.success("Đã sao chép SQL");
      setTimeout(() => setCopied(null), 2000);
    });
  }

  return (
    <PageWrapper>
      <div className="page-header">
        <h1 className="page-title">Cài Đặt & Bảo Trì</h1>
        <p className="page-subtitle">Kiểm tra kết nối database và chạy migrations cần thiết</p>
      </div>

      {/* Diagnostics */}
      <Card className="p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="section-title flex items-center gap-2">
            <Database className="w-4 h-4" />
            Kiểm tra quyền truy cập Database
          </h3>
          <Button size="sm" variant="secondary" onClick={runDiagnostics} loading={diagLoading}>
            Kiểm tra lại
          </Button>
        </div>

        {diag.length === 0 && diagLoading && (
          <div className="flex justify-center py-6">
            <div className="w-7 h-7 border-4 border-brand-400 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {diag.map((d, i) => (
            <div key={i} className={`flex items-start gap-3 p-3 rounded-xl border ${d.ok ? "bg-emerald-50 border-emerald-100" : "bg-red-50 border-red-200"}`}>
              {d.ok
                ? <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                : <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              }
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${d.ok ? "text-emerald-800" : "text-red-800"}`}>{d.label}</p>
                {d.ok && d.count !== undefined && (
                  <p className="text-xs text-emerald-600">{d.count} bản ghi</p>
                )}
                {!d.ok && d.error && (
                  <p className="text-xs text-red-600 mt-0.5 break-all">{d.error}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {diag.some(d => !d.ok) && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
            <p className="font-semibold mb-1">⚠️ Một số bảng không thể truy cập</p>
            <p>Nguyên nhân thường gặp: chưa chạy migration SQL trong Supabase. Hãy sao chép và chạy các migration bên dưới trong <strong>Supabase Dashboard → SQL Editor</strong>.</p>
          </div>
        )}
      </Card>

      {/* Migration SQLs */}
      <div className="space-y-5">
        <h3 className="text-base font-semibold text-gray-800">SQL Migrations cần chạy trong Supabase Dashboard</h3>
        <p className="text-sm text-gray-500 -mt-3">
          Vào <strong>Supabase Dashboard → Project → SQL Editor</strong>, dán SQL và nhấn <strong>Run</strong>
        </p>

        {[
          { id: "013", title: "Migration 013 — Quản lý học vụ (Academic Manager)", sql: MIGRATION_013 },
          { id: "014", title: "Migration 014 — Sửa quyền admin (Buổi học, Học viên)", sql: MIGRATION_014 },
          { id: "015", title: "Migration 015 — Sửa đệ quy RLS enrollments ↔ students (bắt buộc nếu lỗi infinite recursion)", sql: MIGRATION_015 },
        ].map(m => (
          <Card key={m.id} className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-gray-800">{m.title}</h4>
              <Button
                size="sm"
                variant="secondary"
                icon={<Copy className="w-3.5 h-3.5" />}
                onClick={() => copySQL(m.id, m.sql)}
              >
                {copied === m.id ? "Đã sao chép!" : "Sao chép SQL"}
              </Button>
            </div>
            <pre className="text-xs text-gray-600 bg-gray-50 p-3 rounded-xl overflow-x-auto max-h-48 font-mono leading-relaxed border border-gray-100">
              {m.sql}
            </pre>
          </Card>
        ))}
      </div>
    </PageWrapper>
  );
}
