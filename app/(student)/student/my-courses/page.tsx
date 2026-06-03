"use client";
import PageWrapper from "@/components/layouts/PageWrapper";
import { Card } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { SkeletonPage } from "@/components/ui/Skeleton";
import { createBrowserClient } from "@/lib/supabase/client";
import { Calendar, GraduationCap, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

interface StudentClass {
  id: string;
  name: string;
  status: string;
  class_type: string;
  schedule: string | null;
  total_sessions: number;
  sessions_done: number;
  teacher_name: string | null;
  level_out: string | null;
}

const STATUS_MAP: Record<string, { label: string; variant: "success" | "info" | "gray" | "danger" }> = {
  active:    { label: "Đang học",       variant: "success" },
  upcoming:  { label: "Sắp khai giảng", variant: "info"    },
  completed: { label: "Kết thúc",       variant: "gray"    },
  cancelled: { label: "Đã hủy",         variant: "danger"  },
};

export default function StudentMyCoursesPage() {
  const [classes, setClasses] = useState<StudentClass[]>([]);
  const [loading, setLoading] = useState(true);
  const lastReloadAtRef = useRef<number>(0);

  useEffect(() => {
    let isActive = true;
    async function load() {
      const now = Date.now();
      if (now - lastReloadAtRef.current < 5000) return; // throttle
      lastReloadAtRef.current = now;
      if (!isActive) return;
      const supabase = createBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { setLoading(false); return; }

      // Find student record
      const { data: student } = await supabase
        .from("students")
        .select("id")
        .eq("profile_id", session.user.id)
        .maybeSingle();

      if (!student) { setLoading(false); return; }

      // Enrollments → classes + teacher
      const { data: enrollData } = await supabase
        .from("enrollments")
        .select("class_id, classes(id, name, status, class_type, schedule, total_sessions, sessions_done, level_out, teacher_id)")
        .eq("student_id", student.id)
        .eq("status", "active");

      if (!enrollData || enrollData.length === 0) { setLoading(false); return; }

      const rows = enrollData as unknown as {
        class_id: string;
        classes: { id: string; name: string; status: string; class_type: string; schedule: string | null; total_sessions: number; sessions_done: number; level_out: string | null; teacher_id: string | null } | null;
      }[];

      const validRows = rows.filter(r => r.classes);
      const classIds = validRows.map(r => r.classes!.id);

      // Fetch real session counts directly from sessions table (classes.sessions_done may be stale)
      const { data: sessionsData } = await supabase
        .from("sessions")
        .select("class_id, status")
        .in("class_id", classIds);

      const sessionsByClass: Record<string, { total: number; done: number }> = {};
      for (const s of sessionsData || []) {
        if (!sessionsByClass[s.class_id]) sessionsByClass[s.class_id] = { total: 0, done: 0 };
        sessionsByClass[s.class_id].total += 1;
        if (s.status === "DONE") sessionsByClass[s.class_id].done += 1;
      }

      // Fetch teacher names
      const teacherIds = [...new Set(validRows.map(r => r.classes?.teacher_id).filter(Boolean))] as string[];
      let teacherMap: Record<string, string> = {};
      if (teacherIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", teacherIds);
        teacherMap = Object.fromEntries(
          (profiles || []).map((p: { id: string; full_name: string | null }) => [p.id, p.full_name || ""])
        );
      }

      setClasses(
        validRows.map(r => {
          const counts = sessionsByClass[r.classes!.id];
          return {
            id: r.classes!.id,
            name: r.classes!.name,
            status: r.classes!.status,
            class_type: r.classes!.class_type,
            schedule: r.classes!.schedule,
            // Use real counts from sessions table; fall back to classes columns if no sessions yet
            total_sessions: counts?.total ?? r.classes!.total_sessions ?? 0,
            sessions_done:  counts?.done  ?? r.classes!.sessions_done  ?? 0,
            level_out: r.classes!.level_out,
            teacher_name: r.classes!.teacher_id ? (teacherMap[r.classes!.teacher_id] || null) : null,
          };
        })
      );
      setLoading(false);
    }
    load().catch(console.error);

    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      load().catch(console.error);
    };

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);

    const intervalId = window.setInterval(() => {
      load().catch(console.error);
    }, 30000);
    return () => {
      isActive = false;
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      window.clearInterval(intervalId);
    };
  }, []);

  if (loading) return <PageWrapper><SkeletonPage /></PageWrapper>;

  return (
    <PageWrapper>
      <div className="page-header">
        <h1 className="page-title">Khóa Học Của Tôi</h1>
        <p className="page-subtitle">{classes.length} khóa học đang theo học</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {classes.map(c => {
          const progress = c.total_sessions > 0
            ? Math.min(100, (c.sessions_done / c.total_sessions) * 100)
            : 0;
          const statusInfo = STATUS_MAP[c.status] || { label: c.status, variant: "gray" as const };
          return (
            <Link key={c.id} href={`/student/my-courses/${encodeURIComponent(c.name)}`}>
              <Card hover className="p-5 cursor-pointer">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-linear-to-br from-sky-400 to-blue-600 rounded-2xl flex items-center justify-center">
                    <GraduationCap className="w-6 h-6 text-white" />
                  </div>
                  <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                </div>
                <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">{c.name}</h3>
                {c.teacher_name && (
                  <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                    <Users className="w-3 h-3" />{c.teacher_name}
                  </p>
                )}
                {c.schedule && (
                  <p className="text-xs text-gray-500 mb-3 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />{c.schedule}
                  </p>
                )}
                {c.level_out && (
                  <div className="bg-sky-50 rounded-xl px-3 py-2 mb-3">
                    <p className="text-xs text-sky-600 font-semibold">Mục tiêu: {c.level_out}</p>
                  </div>
                )}
                <div className="mt-2">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
                    <span>Tiến độ</span>
                    <span className="font-medium">{c.sessions_done}/{c.total_sessions} buổi ({Math.round(progress)}%)</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className="bg-sky-500 h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              </Card>
            </Link>
          );
        })}
        {classes.length === 0 && (
          <div className="col-span-full text-center py-16 text-gray-400">
            <GraduationCap className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p>Chưa được thêm vào khóa học nào</p>
            <p className="text-xs mt-1 text-gray-400">Liên hệ admin để được đăng ký lớp học</p>
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
