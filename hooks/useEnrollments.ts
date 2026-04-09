"use client";
import { createBrowserClient } from "@/lib/supabase/client";
import type { Enrollment } from "@/types";
import { useCallback, useEffect, useState } from "react";

export function useEnrollments(classId?: string, studentId?: string) {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const supabase = createBrowserClient();
      let query = supabase
        .from("enrollments")
        .select("*, student:students!student_id(id,full_name,email,phone), class:classes!class_id(id,name,status)")
        .order("enrolled_at", { ascending: false });

      if (classId) query = query.eq("class_id", classId);
      if (studentId) query = query.eq("student_id", studentId);

      const { data, error: err } = await query;
      if (err) throw err;
      setEnrollments((data as Enrollment[]) || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi tải dữ liệu đăng ký");
    } finally {
      setLoading(false);
    }
  }, [classId, studentId]);

  useEffect(() => { load(); }, [load]);

  /**
   * Enroll a student in a class and auto-create an invoice.
   * Returns { enrollment, invoice }
   */
  async function enroll(classId: string, studentId: string, tuitionFee: number, className: string, studentName: string) {
    const supabase = createBrowserClient();

    // 1. Create enrollment
    const { data: enrollment, error: enrErr } = await supabase
      .from("enrollments")
      .insert({ class_id: classId, student_id: studentId, status: "active" })
      .select()
      .single();
    if (enrErr) throw new Error(enrErr.message);

    // 2. Auto-create invoice linked via enrollment_id
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7); // 7 days to pay

    const { data: invoice, error: invErr } = await supabase
      .from("invoices")
      .insert({
        enrollment_id: enrollment.id,
        student_name: studentName,
        class_name: className,
        amount: tuitionFee,
        due_date: dueDate.toISOString().split("T")[0],
      })
      .select()
      .single();
    if (invErr) throw new Error(invErr.message);

    await load();
    return { enrollment: enrollment as Enrollment, invoice };
  }

  async function unenroll(enrollmentId: string) {
    const supabase = createBrowserClient();
    const { error: err } = await supabase
      .from("enrollments")
      .update({ status: "dropped" })
      .eq("id", enrollmentId);
    if (err) throw new Error(err.message);
    await load();
  }

  return { enrollments, loading, error, reload: load, enroll, unenroll };
}
