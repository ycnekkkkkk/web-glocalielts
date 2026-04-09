"use client";
import { Card, StatsCard } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import PageWrapper from "@/components/layouts/PageWrapper";
import { createBrowserClient } from "@/lib/supabase/client";
import {
  Award, BookOpen, Calendar, DollarSign, GraduationCap,
  TrendingDown, TrendingUp, UserCheck, Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend,
  Line, LineChart, Pie, PieChart, RadialBar, RadialBarChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

const monthOrder = ["T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8", "T9", "T10", "T11", "T12"];

export default function AdminDashboard() {
  const [revenueData, setRevenueData] = useState<{ month: string; revenue: number; expense: number; profit: number }[]>([]);
  const [topClasses, setTopClasses] = useState<{ name: string; students: number; revenue: number; type: string }[]>([]);
  const [topTeachers, setTopTeachers] = useState<{ name: string; classes_count: number }[]>([]);
  const [stats, setStats] = useState({ activeClasses: 0, teacherCount: 0, totalStudents: 0, sessionsThisMonth: 0, totalDebt: 0, totalRevenue: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const supabase = createBrowserClient();
      const [monthRes, teachersRes, classesRes, sessionsRes, invoicesRes, enrollRes] = await Promise.all([
        supabase.from("monthly_financials").select("month, revenue, expense, profit").order("month"),
        supabase.from("v_teachers").select("name, classes_count"),
        supabase.from("classes").select("id,name,class_type,status,tuition_fee"),
        supabase.from("sessions").select("session_date, status, class_id"),
        supabase.from("v_invoice_status").select("status,remaining,paid_total"),
        supabase.from("enrollments").select("class_id").eq("status","active"),
      ]);

      const months = (monthRes.data || [])
        .sort((a: { month: string }, b: { month: string }) => monthOrder.indexOf(a.month) - monthOrder.indexOf(b.month))
        .slice(-6);
      setRevenueData(months.map((r: { month: string; revenue: number; expense: number; profit: number }) => ({
        month: r.month, revenue: Number(r.revenue) || 0, expense: Number(r.expense) || 0, profit: Number(r.profit) || 0,
      })));

      // Enrollment counts per class
      const enrollMap: Record<string, number> = {};
      (enrollRes.data || []).forEach((e: { class_id: string }) => {
        enrollMap[e.class_id] = (enrollMap[e.class_id] || 0) + 1;
      });

      const topCls = (classesRes.data || [])
        .filter((c: { status: string }) => c.status === "active")
        .map((c: { id: string; name: string; class_type: string; tuition_fee: number }) => ({
          name: c.name,
          students: enrollMap[c.id] || 0,
          revenue: (enrollMap[c.id] || 0) * (Number(c.tuition_fee) || 0),
          type: c.class_type === "1on1" ? "1:1" : "Nhóm",
        }))
        .sort((a: { revenue: number }, b: { revenue: number }) => b.revenue - a.revenue)
        .slice(0, 5);
      setTopClasses(topCls);
      setTopTeachers((teachersRes.data || []).slice(0, 5));

      const now = new Date();
      const sessionsThisMonth = (sessionsRes.data || []).filter((s: { session_date: string }) => {
        const d = (s.session_date || "").split("/");
        return d.length >= 2 && parseInt(d[1], 10) === now.getMonth() + 1;
      }).length;

      const invoiceList = invoicesRes.data || [];
      const totalDebt = invoiceList.filter((i: { status: string }) => i.status !== "paid")
        .reduce((s: number, i: { remaining: number }) => s + (Number(i.remaining) || 0), 0);
      const totalRevenue = invoiceList.reduce((s: number, i: { paid_total: number }) => s + (Number(i.paid_total) || 0), 0);

      const activeClasses = (classesRes.data || []).filter((c: { status: string }) => c.status === "active").length;
      const totalStudents = Object.values(enrollMap).reduce((s, v) => s + v, 0);

      setStats({
        activeClasses,
        teacherCount: (teachersRes.data || []).length,
        totalStudents,
        sessionsThisMonth,
        totalDebt,
        totalRevenue,
      });
      setLoading(false);
    }
    fetchData().catch(console.error);
  }, []);

  const enrollmentData = revenueData.map(r => ({ month: r.month, newStudents: Math.max(Math.round(r.revenue / 4), 5), dropped: 2 }));
  const subjectDistribution = [
    { name: "IELTS Nhóm", value: 55, color: "#6366f1" },
    { name: "IELTS 1:1", value: 25, color: "#a855f7" },
    { name: "Giao Tiếp", value: 15, color: "#0ea5e9" },
    { name: "Business", value: 5, color: "#10b981" },
  ];
  const completionData = [
    { name: "Hoàn thành", value: 78, fill: "#10b981" },
    { name: "Đang học", value: 18, fill: "#6366f1" },
    { name: "Vắng", value: 4, fill: "#f59e0b" },
  ];

  const currentRevenue = revenueData[revenueData.length - 1]?.revenue || 0;
  const currentExpense = revenueData[revenueData.length - 1]?.expense || 0;
  const currentProfit = revenueData[revenueData.length - 1]?.profit || 0;
  const prevRevenue = revenueData[revenueData.length - 2]?.revenue || 0;
  const revGrowth = prevRevenue ? Math.round(((currentRevenue - prevRevenue) / prevRevenue) * 100) : 0;

  if (loading) {
    return <PageWrapper>
      <div className="flex items-center justify-center py-20 text-gray-500 gap-3">
        <div className="w-5 h-5 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
        Đang tải dữ liệu...
      </div>
    </PageWrapper>;
  }

  return (
    <PageWrapper>
      <div className="page-header flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="page-title">Thống Kê – Glocal IELTS</h1>
          <p className="page-subtitle">Trung tâm tiếng Anh Amazing Group · {new Date().toLocaleDateString("vi-VN", { month: "long", year: "numeric" })}</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500 bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-sm">
          <Calendar className="w-3.5 h-3.5" />
          <span>Cập nhật: {new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</span>
        </div>
      </div>

      <div className="stats-grid">
        <StatsCard title="Doanh thu tháng" value={`${currentRevenue}M`} icon={DollarSign} iconColor="text-emerald-600" iconBg="bg-emerald-50" trend={revGrowth} trendLabel="so tháng trước" suffix="VND" />
        <StatsCard title="Chi phí tháng" value={`${currentExpense}M`} icon={TrendingDown} iconColor="text-red-500" iconBg="bg-red-50" trend={-10} trendLabel="so tháng trước" />
        <StatsCard title="Lợi nhuận" value={`${currentProfit}M`} icon={TrendingUp} iconColor="text-brand-600" iconBg="bg-brand-50" trend={revGrowth} trendLabel="so tháng trước" />
        <StatsCard title="Tổng học viên" value={stats.totalStudents} icon={Users} iconColor="text-purple-600" iconBg="bg-purple-50" trend={0} trendLabel="học viên" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-6">
        <StatsCard title="Lớp đang hoạt động" value={stats.activeClasses} icon={GraduationCap} iconColor="text-sky-600" iconBg="bg-sky-50" trend={0} trendLabel="lớp" />
        <StatsCard title="Giáo viên" value={stats.teacherCount} icon={UserCheck} iconColor="text-teal-600" iconBg="bg-teal-50" trend={0} trendLabel="GV" />
        <StatsCard title="Buổi học tháng này" value={stats.sessionsThisMonth} icon={BookOpen} iconColor="text-amber-600" iconBg="bg-amber-50" trend={0} trendLabel="buổi" />
        <StatsCard title="Học phí chưa thu" value={`${(stats.totalDebt / 1_000_000).toFixed(1)}M`} icon={Award} iconColor="text-rose-600" iconBg="bg-rose-50" trend={0} trendLabel="VND" />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 mb-5">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="section-title mb-0.5">Doanh Thu & Chi Phí</h3>
              <p className="text-xs text-gray-400">6 tháng gần nhất (triệu VNĐ)</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={revenueData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }} barSize={18}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #e5e7eb", fontSize: 12 }} formatter={(v) => [String(v) + "M", ""]} />
              <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} name="Doanh thu" />
              <Bar dataKey="expense" fill="#f87171" radius={[4, 4, 0, 0]} name="Chi phí" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="section-title mb-0.5">Lợi Nhuận</h3>
              <p className="text-xs text-gray-400">6 tháng gần nhất</p>
            </div>
            {revGrowth !== 0 && <Badge variant={revGrowth > 0 ? "success" : "danger"}>{revGrowth > 0 ? "+" : ""}{revGrowth}%</Badge>}
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={revenueData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #e5e7eb", fontSize: 12 }} formatter={(v) => [String(v) + "M VNĐ", "Lợi nhuận"]} />
              <Area type="monotone" dataKey="profit" stroke="#6366f1" strokeWidth={2.5} fill="url(#profitGrad)" dot={{ fill: "#6366f1", r: 4 }} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 mb-5">
        <Card className="xl:col-span-2 p-5">
          <h3 className="section-title">Học Viên Mới & Nghỉ Học</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={enrollmentData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #e5e7eb", fontSize: 12 }} />
              <Line type="monotone" dataKey="newStudents" stroke="#6366f1" strokeWidth={2.5} dot={{ fill: "#6366f1", r: 4 }} name="Học viên mới" />
              <Line type="monotone" dataKey="dropped" stroke="#f87171" strokeWidth={2} strokeDasharray="4 2" dot={{ fill: "#f87171", r: 3 }} name="Nghỉ học" />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5">
          <h3 className="section-title">Phân Bổ Môn Học</h3>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={subjectDistribution} cx="50%" cy="50%" innerRadius={45} outerRadius={72} paddingAngle={3} dataKey="value">
                {subjectDistribution.map(({ color }, i) => <Cell key={i} fill={color} />)}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: "12px", fontSize: 12 }} formatter={(v) => [String(v) + "%", ""]} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-2">
            {subjectDistribution.map(({ name, value, color }) => (
              <div key={name} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-gray-600">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />{name}
                </span>
                <span className="font-semibold text-gray-700">{value}%</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Top Classes + Teachers */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 mb-5">
        <Card className="p-5">
          <h3 className="section-title">Top Lớp Học</h3>
          <div className="space-y-3">
            {topClasses.map((c, i) => (
              <div key={c.name} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${i === 0 ? "bg-amber-100 text-amber-700" : i === 1 ? "bg-gray-100 text-gray-600" : "bg-orange-50 text-orange-600"}`}>
                  #{i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{c.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant={c.type === "1:1" ? "purple" : "info"}>{c.type}</Badge>
                    <span className="text-xs text-gray-400"><Users className="w-3 h-3 inline mr-0.5" />{c.students} HV</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-gray-800">{(c.revenue / 1_000_000).toFixed(0)}M</p>
                  <p className="text-xs text-gray-400">{c.students} HV</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="section-title">Top Giáo Viên</h3>
          <div className="space-y-3">
            {topTeachers.map((t, i) => (
              <div key={t.name} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {t.name.split(" ").map((p: string) => p[0]).slice(-2).join("")}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{t.name}</p>
                  <p className="text-xs text-gray-500">IELTS & Giao tiếp · {t.classes_count} lớp</p>
                </div>
                <div className="text-xs text-gray-500">
                  {t.classes_count} lớp
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Attendance + Radial */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="section-title mb-0">Tỉ Lệ Điểm Danh</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ResponsiveContainer width="100%" height={200}>
            <RadialBarChart cx="50%" cy="50%" innerRadius="30%" outerRadius="80%" data={completionData} startAngle={90} endAngle={-270}>
              <RadialBar dataKey="value" cornerRadius={6} background={{ fill: "#f3f4f6" }}>
                {completionData.map((d, i) => <Cell key={i} fill={d.fill} />)}
              </RadialBar>
              <Tooltip contentStyle={{ borderRadius: "12px", fontSize: 12 }} formatter={(v) => [String(v) + "%", ""]} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
            </RadialBarChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-3">
            {completionData.map(d => (
              <div key={d.name} className="bg-gray-50 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold" style={{ color: d.fill }}>{d.value}%</p>
                <p className="text-xs text-gray-500 mt-1">{d.name}</p>
              </div>
            ))}
            <div className="bg-brand-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-brand-600">{stats.sessionsThisMonth}</p>
              <p className="text-xs text-gray-500 mt-1">Buổi tháng này</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Audit Log */}
      <AuditLogPanel />
    </PageWrapper>
  );
}

function AuditLogPanel() {
  const [logs, setLogs] = useState<Array<{ id: number; user_name: string | null; action: string; entity: string; entity_id: string | null; created_at: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    createBrowserClient()
      .from("audit_logs")
      .select("id,user_name,action,entity,entity_id,created_at")
      .order("created_at", { ascending: false })
      .limit(20)
      .then(
        (res: {
          data: Array<{
            id: number;
            user_name: string | null;
            action: string;
            entity: string;
            entity_id: string | null;
            created_at: string;
          }> | null;
        }) => {
          setLogs(res.data || []);
          setLoading(false);
        }
      );
  }, []);

  const actionBadge: Record<string, string> = { INSERT: "bg-emerald-100 text-emerald-700", UPDATE: "bg-amber-100 text-amber-700", DELETE: "bg-red-100 text-red-700" };

  return (
    <Card className="p-5 mt-5">
      <h3 className="section-title mb-4">Nhật Ký Hệ Thống (20 gần nhất)</h3>
      {loading ? (
        <div className="flex justify-center py-8"><div className="w-6 h-6 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : logs.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">Chưa có hoạt động nào được ghi nhận</p>
      ) : (
        <div className="space-y-2">
          {logs.map(log => (
            <div key={log.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 text-xs">
              <span className={`px-2 py-0.5 rounded-lg font-medium shrink-0 ${actionBadge[log.action] || "bg-gray-100 text-gray-600"}`}>{log.action}</span>
              <span className="text-gray-700 font-medium shrink-0">{log.entity}</span>
              <span className="text-gray-400 truncate flex-1">{log.entity_id || "–"}</span>
              <span className="text-gray-500 shrink-0">{log.user_name || "hệ thống"}</span>
              <span className="text-gray-400 shrink-0">{new Date(log.created_at).toLocaleString("vi-VN")}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}


