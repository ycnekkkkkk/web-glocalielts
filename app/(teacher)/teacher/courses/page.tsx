"use client";
import PageWrapper from "@/components/layouts/PageWrapper";
import { Card } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { SkeletonPage } from "@/components/ui/Skeleton";
import { createBrowserClient } from "@/lib/supabase/client";
import { Calendar, ChevronRight, GraduationCap, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

interface TeacherClass {
  id: string;
  name: string;
  status: string;
  class_type: string;
  schedule: string | null;
  total_sessions: number;
  sessions_done: number;
  actual_done_sessions: number;
  start_date: string | null;
  student_count: number;
}

const STATUS_MAP: Record<string, { label: string; variant: "success" | "info" | "gray" | "danger" }> = {
  active:    { label: "Đang học",       variant: "success" },
  upcoming:  { label: "Sắp khai giảng", variant: "info"    },
  completed: { label: "Kết thúc",       variant: "gray"    },
  cancelled: { label: "Đã hủy",         variant: "danger"  },
};

export default function InstructorCoursesPage() {
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      // Classes where this teacher is assigned
      const { data: classData } = await supabase
        .from("classes")
        .select("id, name, status, class_type, schedule, total_sessions, sessions_done, start_date")
        .eq("teacher_id", user.id)
        .order("created_at", { ascending: false });

      if (!classData || classData.length === 0) {
        setClasses([]);
        setLoading(false);
        return;
      }

      // Enrollment counts + real done-session counts
      const classIds = classData.map((c: { id: string }) => c.id);
      const classNames = classData.map((c: { name: string }) => c.name).filter(Boolean);
      const [{ data: enrollData }, { data: sessionData }] = await Promise.all([
        supabase
          .from("enrollments")
          .select("class_id")
          .in("class_id", classIds)
          .eq("status", "active"),
        supabase
          .from("sessions")
          .select("class_id, class_name, status")
          .in("class_name", classNames),
      ]);

      const countMap: Record<string, number> = {};
      (enrollData || []).forEach((e: { class_id: string }) => {
        countMap[e.class_id] = (countMap[e.class_id] || 0) + 1;
      });

      const doneMap: Record<string, number> = {};
      ((sessionData || []) as { class_id: string | null; class_name: string | null; status: string | null }[]).forEach((s) => {
        if (s.status !== "DONE") return;
        // Find matching class ID by class_name
        const matchedClass = classData.find((c: { name: string }) => c.name === s.class_name);
        if (!matchedClass) return;
        doneMap[matchedClass.id] = (doneMap[matchedClass.id] || 0) + 1;
      });

      setClasses(
        classData.map((c: TeacherClass) => ({
          ...c,
          student_count: countMap[c.id] || 0,
          actual_done_sessions: doneMap[c.id] || 0,
        }))
      );
      setLoading(false);
    }
    load().catch(console.error);
  }, []);

  if (loading) return <PageWrapper><SkeletonPage /></PageWrapper>;

  return (
    <PageWrapper>
      <div className="page-header flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="page-title">Lớp Học Của Tôi</h1>
          <p className="page-subtitle">{classes.length} lớp đang dạy</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {classes.map((cls) => {
          const statusInfo = STATUS_MAP[cls.status] || { label: cls.status, variant: "gray" as const };
          const doneSessions = cls.actual_done_sessions ?? cls.sessions_done ?? 0;
          const progress = cls.total_sessions > 0 ? Math.min(100, (doneSessions / cls.total_sessions) * 100) : 0;
          return (
            <Link key={cls.id} href={`/teacher/courses/${encodeURIComponent(cls.name)}`} className="block">
              <Card hover className="p-5 cursor-pointer group">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                    <GraduationCap className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
                  </div>
                </div>
                <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">{cls.name}</h3>
                {cls.class_type === "1on1" && (
                  <p className="text-xs text-purple-600 mb-1">Lớp 1:1</p>
                )}
                <div className="space-y-2 text-sm text-gray-600 mb-4">
                  <div className="flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 text-gray-400" />
                    {cls.student_count} học viên
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    {cls.schedule || "–"}
                  </div>
                </div>
                <div className="pt-3 border-t border-gray-100">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
                    <span>Tiến độ</span>
                    <span>{doneSessions}/{cls.total_sessions} buổi</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div
                      className="bg-emerald-500 h-1.5 rounded-full transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              </Card>
            </Link>
          );
        })}
        {classes.length === 0 && (
          <div className="col-span-full text-center py-16 text-gray-400">
            <GraduationCap className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p>Chưa có lớp học nào được gán cho bạn</p>
            <p className="text-xs mt-1">Liên hệ admin để được phân công lớp</p>
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
