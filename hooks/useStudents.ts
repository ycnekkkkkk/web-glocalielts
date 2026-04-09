"use client";
import { createBrowserClient } from "@/lib/supabase/client";
import type { Student } from "@/types";
import { useCallback, useEffect, useState } from "react";

export function useStudents(search?: string) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const supabase = createBrowserClient();
      let query = supabase
        .from("students")
        .select("*")
        .order("full_name");

      if (search) {
        query = query.or(
          `full_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`
        );
      }

      const { data, error: err } = await query;
      if (err) throw err;
      setStudents(data || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi tải dữ liệu học viên");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { load(); }, [load]);

  async function createStudent(payload: { full_name: string; phone?: string; email?: string; parent_info?: string; organization_id?: string }) {
    const supabase = createBrowserClient();
    const { data, error: err } = await supabase
      .from("students")
      .insert(payload)
      .select()
      .single();
    if (err) throw new Error(err.message);
    await load();
    return data as Student;
  }

  async function updateStudent(id: string, payload: Partial<Omit<Student, "id" | "created_at">>) {
    const supabase = createBrowserClient();
    const { error: err } = await supabase
      .from("students")
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (err) throw new Error(err.message);
    await load();
  }

  async function deleteStudent(id: string) {
    const res = await fetch("/api/admin/delete-student-account", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId: id }),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => null);
      throw new Error(json?.error || "Xóa học viên thất bại");
    }
    await load();
  }

  return { students, loading, error, reload: load, createStudent, updateStudent, deleteStudent };
}

/** Fetch students enrolled in a specific class */
export function useClassStudents(classId: string) {
  const [students, setStudents] = useState<(Student & { enrollment_id: string; enrollment_status: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!classId) return;
    async function load() {
      const supabase = createBrowserClient();
      const { data, error } = await supabase
        .from("enrollments")
        .select("id, status, student:students!student_id(id, full_name, email, phone, parent_info, organization_id, profile_id, created_at, updated_at)")
        .eq("class_id", classId)
        .eq("status", "active");

      if (!error && data) {
        setStudents(
          data.map((row: { id: string; status: string; student: Student }) => ({
            ...row.student,
            enrollment_id: row.id,
            enrollment_status: row.status,
          }))
        );
      }
      setLoading(false);
    }
    load();
  }, [classId]);

  return { students, loading };
}
