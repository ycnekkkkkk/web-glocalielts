"use client";
import PageWrapper from "@/components/layouts/PageWrapper";
import { Card, StatsCard } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { useInvoices } from "@/hooks/useInvoices";
import { CheckCircle, CreditCard, DollarSign, FileText } from "lucide-react";

function statusBadge(status: string) {
  const map: Record<string, { v: "success"|"warning"|"info"|"danger"; l: string }> = {
    paid:    { v: "success", l: "Đã thanh toán" },
    pending: { v: "warning", l: "Chờ thanh toán" },
    partial: { v: "info",    l: "1 phần" },
    overdue: { v: "danger",  l: "Quá hạn" },
  };
  const m = map[status] || { v: "warning" as const, l: status };
  return <Badge variant={m.v}>{m.l}</Badge>;
}

export default function OrgBillingPage() {
  const { invoices, loading } = useInvoices();

  const total = invoices.reduce((s, i) => s + i.amount, 0);
  const paid  = invoices.reduce((s, i) => s + i.paid_total, 0);
  const debt  = total - paid;

  return (
    <PageWrapper>
      <div className="page-header">
        <h1 className="page-title">Thanh Toán</h1>
        <p className="page-subtitle">Lịch sử thanh toán và hóa đơn</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-6">
        <StatsCard title="Tổng học phí" value={`${(total / 1_000_000).toFixed(0)}M`} icon={DollarSign} iconColor="text-purple-600" iconBg="bg-purple-50" trendLabel="VND" />
        <StatsCard title="Đã thanh toán" value={`${(paid / 1_000_000).toFixed(0)}M`} icon={CheckCircle} iconColor="text-emerald-600" iconBg="bg-emerald-50" trendLabel="VND" />
        <StatsCard title="Còn nợ" value={`${(debt / 1_000_000).toFixed(0)}M`} icon={CreditCard} iconColor="text-amber-600" iconBg="bg-amber-50" trendLabel="VND" />
      </div>

      <Card>
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Lịch Sử Hóa Đơn</h3>
          <Button variant="outline" size="sm" icon={<FileText className="w-4 h-4" />}>Xuất PDF</Button>
        </div>
        {loading ? (
          <div className="p-4"><SkeletonTable /></div>
        ) : (
          <div className="divide-y divide-gray-50">
            {invoices.map(inv => (
              <div key={inv.id} className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors">
                <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                  <FileText className="w-5 h-5 text-purple-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{inv.student_name}</p>
                  <p className="text-xs text-gray-500">{inv.class_name} · {new Date(inv.created_at).toLocaleDateString("vi-VN")}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">{(inv.amount / 1_000_000).toFixed(1)}M</p>
                  <p className="text-xs text-emerald-600">Đã trả: {(inv.paid_total / 1_000_000).toFixed(1)}M</p>
                </div>
                {statusBadge(inv.status)}
              </div>
            ))}
            {invoices.length === 0 && (
              <div className="text-center py-12 text-gray-400 text-sm">Chưa có hóa đơn nào</div>
            )}
          </div>
        )}
      </Card>
    </PageWrapper>
  );
}
