"use client";
import PageWrapper from "@/components/layouts/PageWrapper";
import { Card, StatsCard } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { createBrowserClient } from "@/lib/supabase/client";
import { SESSION_STATUS } from "@/lib/constants";
import { BookOpen, Calendar, CheckCircle, GraduationCap, Star, Users } from "lucide-react";
import { useEffect, useState } from "react";
import type { Session } from "@/types";

interface TeacherClass {
  id: string;
  name: string;
  status: string;
  schedule: string | null;
  student_count: number;
}

export default function InstructorDashboard() {
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [teacherName, setTeacherName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();
      setTeacherName(profile?.full_name || "");

      // Classes from normalized table
      const { data: classData } = await supabase
        .from("classes")
        .select("id, name, status, schedule")
        .eq("teacher_id", user.id)
        .order("created_at", { ascending: false });

      const classIds = (classData || []).map((c: { id: string }) => c.id);

      // Sessions and enrollment counts in parallel
      const [sessRes, enrollRes] = await Promise.all([
        classIds.length > 0
          ? supabase
              .from("sessions")
              .select("*")
              .in("class_id", classIds)
              .order("session_date", { ascending: true })
          : Promise.resolve({ data: [] }),
        classIds.length > 0
          ? supabase
              .from("enrollments")
              .select("class_id")
              .in("class_id", classIds)
              .eq("status", "active")
          : Promise.resolve({ data: [] }),
      ]);

      const countMap: Record<string, number> = {};
      ((enrollRes.data as { class_id: string }[]) || []).forEach((e) => {
        countMap[e.class_id] = (countMap[e.class_id] || 0) + 1;
      });

      setClasses(
        (classData || []).map((c: Omit<TeacherClass, "student_count">) => ({ ...c, student_count: countMap[c.id] || 0 }))
      );
      setSessions((sessRes.data as Session[]) || []);
      setLoading(false);
    }
    load().catch(console.error);
  }, []);

  const totalStudents = classes.reduce((sum, c) => sum + c.student_count, 0);
  const doneSessions = sessions.filter((s) => s.status === SESSION_STATUS.DONE).length;
  const upcomingSessions = sessions
    .filter((s) => s.status === SESSION_STATUS.UPCOMING)
    .slice(0, 5);

  if (loading) {
    return (
      <PageWrapper>
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <div className="page-header">
        <h1 className="page-title">Xin chào, {teacherName || "Giáo viên"}!</h1>
        <p className="page-subtitle">Tổng quan lớp dạy của bạn</p>
      </div>

      <div className="stats-grid">
        <StatsCard title="Lớp đang dạy" value={classes.length} icon={GraduationCap} iconColor="text-emerald-600" iconBg="bg-emerald-50" trendLabel="lớp" />
        <StatsCard title="Học viên" value={totalStudents} icon={Users} iconColor="text-sky-600" iconBg="bg-sky-50" trendLabel="HV" />
        <StatsCard title="Buổi đã dạy" value={doneSessions} icon={CheckCircle} iconColor="text-brand-600" iconBg="bg-brand-50" trendLabel="buổi" />
        <StatsCard title="Đánh giá TB" value="–" icon={Star} iconColor="text-amber-600" iconBg="bg-amber-50" trendLabel="/ 5.0" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* Upcoming sessions */}
        <Card className="p-5">
          <h3 className="section-title">Buổi Học Sắp Tới</h3>
          <div className="space-y-3">
            {upcomingSessions.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">Không có buổi học sắp tới</p>
            ) : (
              upcomingSessions.map((s) => (
                <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center shrink-0">
                    <BookOpen className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{s.class_name}</p>
                    <p className="text-xs text-gray-500">Buổi #{s.session_no} · {s.topic || "–"}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-medium text-gray-700">{s.session_date}</p>
                    <p className="text-xs text-gray-400">{s.session_time}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* My classes */}
        <Card className="p-5">
          <h3 className="section-title">Lớp Học Của Tôi</h3>
          <div className="space-y-3">
            {classes.slice(0, 6).map((cls) => {
              const statusMap: Record<string, { label: string; variant: "success" | "info" | "gray" | "danger" }> = {
                active:    { label: "Đang học",       variant: "success" },
                upcoming:  { label: "Sắp khai giảng", variant: "info"    },
                completed: { label: "Kết thúc",       variant: "gray"    },
                cancelled: { label: "Đã hủy",         variant: "danger"  },
              };
              const s = statusMap[cls.status] || { label: cls.status, variant: "gray" as const };
              return (
                <div key={cls.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                  <div className="w-10 h-10 bg-brand-100 rounded-xl flex items-center justify-center shrink-0">
                    <GraduationCap className="w-5 h-5 text-brand-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{cls.name}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Users className="w-3 h-3" />{cls.student_count} HV
                      </span>
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />{cls.schedule || "–"}
                      </span>
                    </div>
                  </div>
                  <Badge variant={s.variant}>{s.label}</Badge>
                </div>
              );
            })}
            {classes.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-6">Chưa có lớp nào được gán</p>
            )}
          </div>
        </Card>
      </div>
    </PageWrapper>
  );
}
