"use client";
import PageWrapper from "@/components/layouts/PageWrapper";
import { Card, StatsCard } from "@/components/ui/Card";
import { createBrowserClient } from "@/lib/supabase/client";
import { BarChart3, TrendingUp, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const ATTENDANCE_COLORS = { on_time: "#10b981", late: "#f59e0b", absent: "#ef4444" };

export default function InstructorAnalyticsPage() {
  const [attendanceStats, setAttendanceStats] = useState({ on_time: 0, late: 0, absent: 0 });
  const [classStats, setClassStats] = useState<{ name: string; students: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      // Get teacher's classes via teacher_id FK (not teacher_name string)
      const { data: teacherClasses } = await supabase
        .from("classes")
        .select("id, name")
        .eq("teacher_id", user.id);

      const classIds = (teacherClasses || []).map((c: { id: string }) => c.id);

      let attStats = { on_time: 0, late: 0, absent: 0 };
      const classStudentCounts: { name: string; students: number }[] = [];

      if (classIds.length > 0) {
        // Get attendance for these classes' sessions
        const { data: sessionData } = await supabase
          .from("sessions")
          .select("id")
          .in("class_id", classIds);

        const sessionIds = (sessionData || []).map((s: { id: number }) => s.id);

        if (sessionIds.length > 0) {
          const { data: attData } = await supabase
            .from("session_attendance")
            .select("attendance_status")
            .in("session_id", sessionIds);

          (attData || []).forEach((r: { attendance_status: string }) => {
            if (r.attendance_status in attStats) {
              attStats[r.attendance_status as keyof typeof attStats]++;
            }
          });
        }

        // Get enrolled student counts per class
        const { data: enrollData } = await supabase
          .from("enrollments")
          .select("class_id")
          .in("class_id", classIds)
          .eq("status", "active");

        const countMap: Record<string, number> = {};
        (enrollData || []).forEach((e: { class_id: string }) => {
          countMap[e.class_id] = (countMap[e.class_id] || 0) + 1;
        });

        (teacherClasses || []).forEach((c: { id: string; name: string }) => {
          classStudentCounts.push({
            name: c.name.split("–")[0].trim(),
            students: countMap[c.id] || 0,
          });
        });
      }

      setAttendanceStats(attStats);
      setClassStats(classStudentCounts);
      setLoading(false);
    }
    load().catch(console.error);
  }, []);

  const total = attendanceStats.on_time + attendanceStats.late + attendanceStats.absent;
  const attendanceRate = total ? Math.round((attendanceStats.on_time / total) * 100) : 0;

  const pieData = [
    { name: "Đúng giờ", value: attendanceStats.on_time, color: ATTENDANCE_COLORS.on_time },
    { name: "Muộn",     value: attendanceStats.late,    color: ATTENDANCE_COLORS.late },
    { name: "Vắng",     value: attendanceStats.absent,  color: ATTENDANCE_COLORS.absent },
  ].filter(d => d.value > 0);

  const totalStudents = classStats.reduce((s, c) => s + c.students, 0);

  if (loading) return (
    <PageWrapper>
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    </PageWrapper>
  );

  return (
    <PageWrapper>
      <div className="page-header">
        <h1 className="page-title">Analytics</h1>
        <p className="page-subtitle">Thống kê giảng dạy của bạn</p>
      </div>

      <div className="stats-grid">
        <StatsCard title="Tỉ lệ điểm danh" value={`${attendanceRate}%`} icon={TrendingUp} iconColor="text-emerald-600" iconBg="bg-emerald-50" trendLabel="đúng giờ" />
        <StatsCard title="Tổng học viên" value={totalStudents} icon={Users} iconColor="text-sky-600" iconBg="bg-sky-50" trendLabel="HV" />
        <StatsCard title="Lớp đang dạy" value={classStats.length} icon={BarChart3} iconColor="text-brand-600" iconBg="bg-brand-50" trendLabel="lớp" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <Card className="p-5">
          <h3 className="section-title">Điểm Danh Tổng Quan</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}>
                  {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip formatter={(v) => [String(v), "buổi"]} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-gray-400 text-center py-10">Chưa có dữ liệu điểm danh</p>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="section-title">Học Viên Theo Lớp</h3>
          {classStats.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={classStats} margin={{ top: 5, right: 5, left: -20, bottom: 20 }} barSize={20}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} angle={-25} textAnchor="end" />
                <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: "12px", fontSize: 12 }} />
                <Bar dataKey="students" fill="#10b981" radius={[4, 4, 0, 0]} name="Học viên" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-gray-400 text-center py-10">Chưa có dữ liệu lớp học</p>
          )}
        </Card>
      </div>
    </PageWrapper>
  );
}
