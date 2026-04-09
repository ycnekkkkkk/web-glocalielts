"use client";
import PageWrapper from "@/components/layouts/PageWrapper";
import { Card, StatsCard } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { createBrowserClient } from "@/lib/supabase/client";
import { BarChart3, GraduationCap, TrendingUp, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { Student } from "@/types";

interface ClassProgress { id: string; name: string; sessions_done: number; total_sessions: number; status: string }

export default function OrgDashboardPage() {
  const [stats, setStats] = useState({ students: 0, instructors: 0, courses: 0, completion: 0, debt: 0 });
  const [recentStudents, setRecentStudents] = useState<Student[]>([]);
  const [classProgress, setClassProgress] = useState<ClassProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createBrowserClient();
      const [studentsRes, classesRes, teachersRes, invoicesRes] = await Promise.all([
        supabase.from("students").select("id,full_name,created_at,email,phone,organization_id,profile_id,parent_info,updated_at").order("created_at", { ascending: false }).limit(5),
        supabase.from("classes").select("id,name,sessions_done,total_sessions,status").order("created_at", { ascending: false }),
        supabase.from("classes").select("teacher_id").not("teacher_id", "is", null),
        supabase.from("v_invoice_status").select("status,remaining"),
      ]);

      const classes = classesRes.data || [];
      const activeClasses = classes.filter((c: { status: string }) => c.status === "active");
      const avgCompletion = activeClasses.length
        ? Math.round(activeClasses.reduce((s: number, c: { sessions_done: number; total_sessions: number }) =>
            s + (c.total_sessions > 0 ? (c.sessions_done / c.total_sessions) * 100 : 0), 0) / activeClasses.length)
        : 0;

      const uniqueTeachers = new Set((teachersRes.data || []).map((r: { teacher_id: string }) => r.teacher_id)).size;
      const debt = (invoicesRes.data || []).filter((i: { status: string }) => i.status !== "paid")
        .reduce((s: number, i: { remaining: number }) => s + (Number(i.remaining) || 0), 0);

      setStats({
        students:    studentsRes.data?.length ? await getTotalCount(supabase) : 0,
        instructors: uniqueTeachers,
        courses:     activeClasses.length,
        completion:  avgCompletion,
        debt,
      });
      setRecentStudents((studentsRes.data as Student[]) || []);
      setClassProgress(classes.slice(0, 3) as ClassProgress[]);
      setLoading(false);
    }
    async function getTotalCount(supabase: ReturnType<typeof createBrowserClient>) {
      const { count } = await supabase.from("students").select("id", { count: "exact", head: true });
      return count || 0;
    }
    load().catch(console.error);
  }, []);

  if (loading) return <PageWrapper><div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" /></div></PageWrapper>;

  return (
    <PageWrapper>
      <div className="page-header">
        <h1 className="page-title">Dashboard Tổ Chức</h1>
        <p className="page-subtitle">Tổng quan hoạt động học tập</p>
      </div>

      <div className="stats-grid">
        <StatsCard title="Học viên" value={stats.students} icon={Users} iconColor="text-purple-600" iconBg="bg-purple-50" trendLabel="đang học" />
        <StatsCard title="Giảng viên" value={stats.instructors} icon={GraduationCap} iconColor="text-sky-600" iconBg="bg-sky-50" trendLabel="GV" />
        <StatsCard title="Lớp đang hoạt động" value={stats.courses} icon={BarChart3} iconColor="text-emerald-600" iconBg="bg-emerald-50" trendLabel="lớp" />
        <StatsCard title="Tiến độ TB" value={`${stats.completion}%`} icon={TrendingUp} iconColor="text-amber-600" iconBg="bg-amber-50" trendLabel="hoàn thành" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <Card className="p-5">
          <h3 className="section-title">Học Viên Gần Đây</h3>
          <div className="space-y-3">
            {recentStudents.map(s => (
              <div key={s.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-xs font-bold text-purple-700">
                  {s.full_name[0]}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{s.full_name}</p>
                  <p className="text-xs text-gray-500">{s.email || s.phone || "–"}</p>
                </div>
                <Badge variant="success">Đang học</Badge>
              </div>
            ))}
            {recentStudents.length === 0 && <p className="text-sm text-gray-400 text-center py-4">Chưa có học viên</p>}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <Link href="/organization/students" className="text-sm text-purple-600 font-medium hover:text-purple-700">Xem tất cả học viên →</Link>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="section-title">Tiến Độ Lớp Học</h3>
          <div className="space-y-4">
            {classProgress.map(c => {
              const pct = c.total_sessions > 0 ? Math.round((c.sessions_done / c.total_sessions) * 100) : 0;
              return (
                <div key={c.id}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm text-gray-700 truncate max-w-48">{c.name}</span>
                    <span className="text-sm font-semibold text-gray-900">{pct}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className="bg-purple-500 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
            {classProgress.length === 0 && <p className="text-sm text-gray-400 text-center py-4">Chưa có lớp học</p>}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <Link href="/organization/reports" className="text-sm text-purple-600 font-medium hover:text-purple-700">Xem báo cáo đầy đủ →</Link>
          </div>
        </Card>
      </div>
    </PageWrapper>
  );
}
