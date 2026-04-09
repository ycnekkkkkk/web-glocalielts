"use client";
import PageWrapper from "@/components/layouts/PageWrapper";
import { Card, StatsCard } from "@/components/ui/Card";
import { createBrowserClient } from "@/lib/supabase/client";
import { ArrowDownRight, ArrowUpRight, DollarSign, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { MonthlyFinancial } from "@/types";

const monthOrder = ["T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8", "T9", "T10", "T11", "T12"];

export default function AdminFinancialsPage() {
  const [data, setData] = useState<MonthlyFinancial[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    createBrowserClient()
      .from("monthly_financials")
      .select("*")
      .order("month")
      .then((res: { data: MonthlyFinancial[] | null }) => {
        const sorted = (res.data || []).sort(
          (a: MonthlyFinancial, b: MonthlyFinancial) => monthOrder.indexOf(a.month) - monthOrder.indexOf(b.month)
        );
        setData(sorted);
        setLoading(false);
      });
  }, []);

  const totalRevenue = data.reduce((s, r) => s + Number(r.revenue), 0);
  const totalExpense = data.reduce((s, r) => s + Number(r.expense), 0);
  const totalProfit = data.reduce((s, r) => s + Number(r.profit), 0);
  const profitMargin = totalRevenue ? Math.round((totalProfit / totalRevenue) * 100) : 0;

  const chartData = data.map(r => ({ month: r.month, revenue: Number(r.revenue), expense: Number(r.expense), profit: Number(r.profit) }));

  if (loading) return <PageWrapper><div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" /></div></PageWrapper>;

  return (
    <PageWrapper>
      <div className="page-header">
        <h1 className="page-title">Báo Cáo Tài Chính</h1>
        <p className="page-subtitle">Tổng quan tài chính theo tháng</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-6">
        <StatsCard title="Tổng doanh thu" value={`${totalRevenue}M`} icon={ArrowUpRight} iconColor="text-emerald-600" iconBg="bg-emerald-50" trendLabel="VND" />
        <StatsCard title="Tổng chi phí" value={`${totalExpense}M`} icon={ArrowDownRight} iconColor="text-red-500" iconBg="bg-red-50" trendLabel="VND" />
        <StatsCard title="Tổng lợi nhuận" value={`${totalProfit}M`} icon={TrendingUp} iconColor="text-brand-600" iconBg="bg-brand-50" trendLabel="VND" />
        <StatsCard title="Biên lợi nhuận" value={`${profitMargin}%`} icon={DollarSign} iconColor="text-purple-600" iconBg="bg-purple-50" trendLabel="trung bình" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 mb-5">
        <Card className="p-5">
          <h3 className="section-title">Doanh Thu & Chi Phí Theo Tháng</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }} barSize={20}>
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
          <h3 className="section-title">Lợi Nhuận Theo Tháng</h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="profitGrad2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #e5e7eb", fontSize: 12 }} formatter={(v) => [String(v) + "M", "Lợi nhuận"]} />
              <Area type="monotone" dataKey="profit" stroke="#6366f1" strokeWidth={2.5} fill="url(#profitGrad2)" dot={{ fill: "#6366f1", r: 4 }} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card>
        <div className="p-5 border-b border-gray-100">
          <h3 className="section-title mb-0">Chi Tiết Theo Tháng</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                <th className="text-left px-5 py-3">Tháng</th>
                <th className="text-right px-5 py-3">Doanh thu</th>
                <th className="text-right px-5 py-3">Chi phí</th>
                <th className="text-right px-5 py-3">Lợi nhuận</th>
                <th className="text-right px-5 py-3">Biên LN</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.map(r => {
                const margin = r.revenue ? Math.round((Number(r.profit) / Number(r.revenue)) * 100) : 0;
                return (
                  <tr key={r.month} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 font-medium text-gray-900">{r.month}</td>
                    <td className="px-5 py-3 text-right text-emerald-600 font-medium">{r.revenue}M</td>
                    <td className="px-5 py-3 text-right text-red-500">{r.expense}M</td>
                    <td className="px-5 py-3 text-right text-brand-600 font-semibold">{r.profit}M</td>
                    <td className="px-5 py-3 text-right">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${margin >= 50 ? "bg-emerald-100 text-emerald-700" : margin >= 30 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>
                        {margin}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </PageWrapper>
  );
}


