"use client";
import PageWrapper from "@/components/layouts/PageWrapper";
import { Card, StatsCard } from "@/components/ui/Card";
import { createBrowserClient } from "@/lib/supabase/client";
import { BarChart3, BookOpen, CheckCircle, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface MonthStat { month: string; revenue: number; expense: number; profit: number }

export default function OrgReportsPage() {
  const [stats, setStats] = useState({ students: 0, sessions: 0, avgCompletion: 0, activeClasses: 0 });
  const [monthlyData, setMonthlyData] = useState<MonthStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createBrowserClient();
      const [studRes, sessRes, clsRes, monthRes] = await Promise.all([
        supabase.from("students").select("id", { count: "exact", head: true }),
        supabase.from("sessions").select("id,status", { count: "exact" }).eq("status", "DONE"),
        supabase.from("classes").select("sessions_done,total_sessions,status"),
        supabase.from("monthly_financials").select("month,revenue,expense,profit").order("month").limit(6),
      ]);

      const classes = clsRes.data || [];
      const activeClasses = classes.filter((c: { status: string }) => c.status === "active");
      const avgCompletion = activeClasses.length
        ? Math.round(activeClasses.reduce((s: number, c: { sessions_done: number; total_sessions: number }) =>
            s + (c.total_sessions > 0 ? (c.sessions_done / c.total_sessions) * 100 : 0), 0) / activeClasses.length)
        : 0;

      setStats({
        students:    studRes.count || 0,
        sessions:    sessRes.count || 0,
        avgCompletion,
        activeClasses: activeClasses.length,
      });
      setMonthlyData((monthRes.data as MonthStat[]) || []);
      setLoading(false);
    }
    load().catch(console.error);
  }, []);

  if (loading) return <PageWrapper><div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" /></div></PageWrapper>;

  return (
    <PageWrapper>
      <div className="page-header">
        <h1 className="page-title">Báo Cáo</h1>
        <p className="page-subtitle">Hiệu suất học tập tổng thể</p>
      </div>

      <div className="stats-grid">
        <StatsCard title="Tổng học viên" value={stats.students} icon={Users} iconColor="text-purple-600" iconBg="bg-purple-50" trendLabel="HV" />
        <StatsCard title="Lớp đang học" value={stats.activeClasses} icon={BookOpen} iconColor="text-sky-600" iconBg="bg-sky-50" trendLabel="lớp" />
        <StatsCard title="Tiến độ TB" value={`${stats.avgCompletion}%`} icon={CheckCircle} iconColor="text-emerald-600" iconBg="bg-emerald-50" trendLabel="hoàn thành" />
        <StatsCard title="Buổi học đã dạy" value={stats.sessions} icon={BarChart3} iconColor="text-amber-600" iconBg="bg-amber-50" trendLabel="buổi" />
      </div>

      {monthlyData.length > 0 && (
        <Card className="p-5">
          <h3 className="section-title">Doanh Thu Theo Tháng (triệu VNĐ)</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={monthlyData} barSize={24}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: "12px", fontSize: 12 }} formatter={(v) => [String(v) + "M", ""]} />
              <Bar dataKey="revenue" fill="#a855f7" radius={[6, 6, 0, 0]} name="Doanh thu" />
              <Bar dataKey="expense" fill="#f87171" radius={[6, 6, 0, 0]} name="Chi phí" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}
    </PageWrapper>
  );
}
