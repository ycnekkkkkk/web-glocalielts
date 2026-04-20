"use client";
import { createBrowserClient } from "@/lib/supabase/client";
import type { Class, ClassCurrent } from "@/types";
import { useCallback, useEffect, useState } from "react";

/** New normalized classes table — teacher name via separate profiles query */
export function useClasses(filters?: { teacherId?: string }) {
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const supabase = createBrowserClient();

      // Step 1: fetch classes
      let query = supabase
        .from("classes")
        .select("*")
        .order("created_at", { ascending: false });

      if (filters?.teacherId) {
        query = query.eq("teacher_id", filters.teacherId);
      }

      const { data, error: err } = await query;
      if (err) throw new Error(err.message);

      const rawRows = (data ?? []) as Class[];

      // Step 1b: fetch enrollment counts separately to avoid PostgREST join issues
      const classIds = rawRows.map(c => c.id).filter(Boolean);
      let enrollCountMap: Record<string, number> = {};
      if (classIds.length > 0) {
        const { data: enrollData } = await supabase
          .from("enrollments")
          .select("class_id")
          .in("class_id", classIds)
          .eq("status", "active");
        if (enrollData) {
          for (const e of enrollData as { class_id: string }[]) {
            enrollCountMap[e.class_id] = (enrollCountMap[e.class_id] ?? 0) + 1;
          }
        }
      }

      const rows = rawRows.map(c => ({
        ...c,
        enrollments: [{ count: enrollCountMap[c.id] ?? 0 }],
      })) as (Class & { enrollments: { count: number }[] })[];

      // Step 2: fetch teacher profiles separately (avoids broken FK join)
      const teacherIds = [...new Set(rows.map((c) => c.teacher_id).filter(Boolean))] as string[];
      let profilesMap: Record<string, { id: string; full_name: string | null; email: string | null }> = {};
      if (teacherIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id,full_name,email")
          .in("id", teacherIds);
        if (profiles) {
          profilesMap = Object.fromEntries(profiles.map((p: { id: string; full_name: string | null; email: string | null }) => [p.id, p]));
        }
      }

      const merged: Class[] = rows.map((c) => ({
        ...c,
        teacher: c.teacher_id ? (profilesMap[c.teacher_id] ?? undefined) : undefined,
      }));

      setClasses(merged);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi tải dữ liệu lớp học");
    } finally {
      setLoading(false);
    }
  }, [filters?.teacherId]);

  useEffect(() => { load(); }, [load]);

  async function createClass(payload: Omit<Class, "id" | "created_at" | "updated_at" | "teacher" | "enrollments">) {
    const supabase = createBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error: err } = await supabase.from("classes").insert({ ...payload, created_by: user?.id }).select().single();
    if (err) throw new Error(err.message);
    await load();
    return data as Class;
  }

  async function updateClass(id: string, payload: Partial<Omit<Class, "id" | "created_at" | "teacher" | "enrollments">>) {
    const supabase = createBrowserClient();
    const { error: err } = await supabase.from("classes").update({ ...payload, updated_at: new Date().toISOString() }).eq("id", id);
    if (err) throw new Error(err.message);
    await load();
  }

  async function deleteClass(id: string) {
    const supabase = createBrowserClient();
    const { error: err } = await supabase.from("classes").delete().eq("id", id);
    if (err) throw new Error(err.message);
    await load();
  }

  return { classes, loading, error, reload: load, createClass, updateClass, deleteClass };
}

/** Legacy hook — reads from classes_current for backward compat */
export function useClassesLegacy(teacherName?: string) {
  const [classes, setClasses] = useState<ClassCurrent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetch() {
      try {
        const supabase = createBrowserClient();
        let query = supabase.from("classes_current").select("*").order("stt");
        if (teacherName) query = query.eq("giao_vien", teacherName);
        const { data, error: err } = await query;
        if (err) throw err;
        setClasses(data || []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Lỗi tải dữ liệu");
      } finally {
        setLoading(false);
      }
    }
    fetch();
  }, [teacherName]);

  return { classes, loading, error };
}

export function useStudentClasses(studentName: string) {
  const [classes, setClasses] = useState<ClassCurrent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!studentName) return;
    async function fetch() {
      const supabase = createBrowserClient();
      const { data } = await supabase
        .from("classes_current")
        .select("*")
        .eq("hoc_vien", studentName)
        .order("stt");
      setClasses(data || []);
      setLoading(false);
    }
    fetch();
  }, [studentName]);

  return { classes, loading };
}
