"use client";
import PageWrapper from "@/components/layouts/PageWrapper";
import { Card, StatsCard } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Modal from "@/components/ui/Modal";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { useInvoices } from "@/hooks/useInvoices";
import { usePaymentHistory, addPayment } from "@/hooks/usePayments";
import type { InvoiceStatus } from "@/types";
import {
  AlertCircle, CheckCircle, ChevronDown, ChevronRight, Clock, DollarSign, Search,
} from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";

function invoiceBadge(status: string) {
  const map: Record<string, { v: "success"|"warning"|"danger"|"info"|"gray"; l: string }> = {
    paid:     { v: "success", l: "Đã thanh toán" },
    pending:  { v: "warning", l: "Chờ thanh toán" },
    partial:  { v: "info",    l: "Thanh toán 1 phần" },
    overdue:  { v: "danger",  l: "Quá hạn" },
  };
  const item = map[status] || { v: "gray" as const, l: status };
  return <Badge variant={item.v}>{item.l}</Badge>;
}

function PaymentHistoryRow({ invoiceId }: { invoiceId: number }) {
  const { payments, loading } = usePaymentHistory(invoiceId);
  if (loading) return <tr><td colSpan={7} className="px-8 py-3 text-xs text-gray-400">Đang tải...</td></tr>;
  if (payments.length === 0) return <tr><td colSpan={7} className="px-8 py-3 text-xs text-gray-400">Chưa có lần thanh toán nào</td></tr>;
  const methodLabel: Record<string, string> = { cash: "Tiền mặt", transfer: "Chuyển khoản", card: "Thẻ" };
  return (
    <>
      {payments.map(p => (
        <tr key={p.id} className="bg-brand-50/40">
          <td colSpan={3} />
          <td className="px-8 py-2 text-xs text-emerald-700 font-medium">+{(p.amount / 1_000_000).toFixed(2)}M</td>
          <td className="px-4 py-2 text-xs text-gray-500">{methodLabel[p.payment_method] || p.payment_method}</td>
          <td className="px-4 py-2 text-xs text-gray-400">{new Date(p.paid_at).toLocaleDateString("vi-VN")}</td>
          <td className="px-4 py-2 text-xs text-gray-400">{p.note || "–"}</td>
        </tr>
      ))}
    </>
  );
}

export default function AdminInvoicesPage() {
  const { invoices, loading, setInvoices } = useInvoices();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [payModal, setPayModal] = useState<InvoiceStatus | null>(null);
  const [payForm, setPayForm] = useState({ amount: "", method: "cash" as "cash"|"transfer"|"card", note: "" });
  const [paying, setPaying] = useState(false);

  const filtered = invoices.filter(inv => {
    const s = search.toLowerCase();
    const matchSearch = inv.student_name.toLowerCase().includes(s) || inv.class_name.toLowerCase().includes(s);
    const matchStatus = !statusFilter || inv.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalDebt = invoices.filter(i => i.status !== "paid").reduce((s, i) => s + (i.remaining || 0), 0);
  const totalPaid = invoices.reduce((s, i) => s + (i.paid_total || 0), 0);
  const overdueCount = invoices.filter(i => i.status === "overdue").length;

  function toggleExpand(id: number) {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function openPayModal(inv: InvoiceStatus) {
    setPayForm({ amount: String(inv.remaining), method: "cash", note: "" });
    setPayModal(inv);
  }

  async function handlePay(e: React.FormEvent) {
    e.preventDefault();
    if (!payModal) return;
    const amount = Number(payForm.amount);
    if (!amount || amount <= 0) { toast.error("Số tiền không hợp lệ"); return; }
    if (amount > payModal.remaining) { toast.error("Số tiền vượt quá số còn nợ"); return; }
    setPaying(true);
    try {
      await addPayment(payModal.id, amount, payForm.method, payForm.note);
      toast.success("Ghi nhận thanh toán thành công!");
      setPayModal(null);
      // Reload invoices from view
      const { createBrowserClient } = await import("@/lib/supabase/client");
      const { data } = await createBrowserClient().from("v_invoice_status").select("*").order("created_at", { ascending: false });
      setInvoices((data as InvoiceStatus[]) || []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setPaying(false);
    }
  }

  return (
    <PageWrapper>
      <div className="page-header">
        <h1 className="page-title">Quản Lý Hóa Đơn</h1>
        <p className="page-subtitle">{invoices.length} hóa đơn · Trạng thái tính từ lịch sử thanh toán</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-6">
        <StatsCard title="Tổng đã thu" value={`${(totalPaid / 1_000_000).toFixed(1)}M`} icon={CheckCircle} iconColor="text-emerald-600" iconBg="bg-emerald-50" trendLabel="VND" />
        <StatsCard title="Còn nợ" value={`${(totalDebt / 1_000_000).toFixed(1)}M`} icon={AlertCircle} iconColor="text-red-600" iconBg="bg-red-50" trendLabel="VND" />
        <StatsCard title="Quá hạn" value={overdueCount} icon={Clock} iconColor="text-amber-600" iconBg="bg-amber-50" trendLabel="hóa đơn" />
      </div>

      <Card>
        <div className="p-4 border-b border-gray-100 flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-48">
            <Input placeholder="Tìm học viên, lớp học..." value={search} onChange={e => setSearch(e.target.value)} icon={<Search className="w-4 h-4" />} />
          </div>
          <div className="w-44">
            <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              placeholder="Tất cả trạng thái"
              options={[
                { value: "paid",    label: "Đã thanh toán" },
                { value: "pending", label: "Chờ thanh toán" },
                { value: "partial", label: "Thanh toán 1 phần" },
                { value: "overdue", label: "Quá hạn" },
              ]}
            />
          </div>
        </div>

        {loading ? <div className="p-4"><SkeletonTable /></div> : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <th className="text-left px-4 py-3 w-8"></th>
                  <th className="text-left px-4 py-3">Học viên</th>
                  <th className="text-left px-4 py-3">Lớp học</th>
                  <th className="text-right px-4 py-3">Tổng</th>
                  <th className="text-right px-4 py-3">Đã trả</th>
                  <th className="text-right px-4 py-3">Còn nợ</th>
                  <th className="text-left px-4 py-3">Trạng thái</th>
                  <th className="text-left px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(inv => (
                  <>
                    <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <button onClick={() => toggleExpand(inv.id)} className="text-gray-400 hover:text-gray-600">
                          {expanded.has(inv.id)
                            ? <ChevronDown className="w-4 h-4" />
                            : <ChevronRight className="w-4 h-4" />}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{inv.student_name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 max-w-40 truncate">{inv.class_name}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 text-right font-medium">{(inv.amount / 1_000_000).toFixed(1)}M</td>
                      <td className="px-4 py-3 text-sm text-emerald-600 text-right font-medium">{(inv.paid_total / 1_000_000).toFixed(1)}M</td>
                      <td className="px-4 py-3 text-sm text-right font-semibold">
                        {inv.remaining > 0
                          ? <span className="text-red-600">{(inv.remaining / 1_000_000).toFixed(1)}M</span>
                          : <span className="text-gray-400">–</span>}
                      </td>
                      <td className="px-4 py-3">{invoiceBadge(inv.status)}</td>
                      <td className="px-4 py-3">
                        {inv.status !== "paid" && (
                          <Button variant="ghost" size="sm" icon={<DollarSign className="w-3.5 h-3.5" />} onClick={() => openPayModal(inv)}>
                            Thu tiền
                          </Button>
                        )}
                      </td>
                    </tr>
                    {expanded.has(inv.id) && <PaymentHistoryRow key={`ph-${inv.id}`} invoiceId={inv.id} />}
                  </>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <DollarSign className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm">Không tìm thấy hóa đơn nào</p>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Payment Modal */}
      <Modal open={!!payModal} onClose={() => setPayModal(null)} title="Ghi nhận thanh toán">
        {payModal && (
          <form onSubmit={handlePay} className="space-y-4">
            <div className="bg-gray-50 rounded-xl p-3 space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Học viên</span>
                <span className="font-medium text-gray-900">{payModal.student_name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Lớp học</span>
                <span className="text-gray-700">{payModal.class_name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Còn nợ</span>
                <span className="font-bold text-red-600">{(payModal.remaining / 1_000_000).toFixed(2)}M VNĐ</span>
              </div>
            </div>

            <Input
              label="Số tiền thu (VNĐ) *"
              type="number"
              value={payForm.amount}
              onChange={e => setPayForm(p => ({ ...p, amount: e.target.value }))}
              placeholder={String(payModal.remaining)}
              required
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phương thức thanh toán</label>
              <Select
                value={payForm.method}
                onChange={e => setPayForm(p => ({ ...p, method: e.target.value as "cash"|"transfer"|"card" }))}
                options={[
                  { value: "cash",     label: "Tiền mặt" },
                  { value: "transfer", label: "Chuyển khoản" },
                  { value: "card",     label: "Thẻ ngân hàng" },
                ]}
              />
            </div>

            <Input
              label="Ghi chú"
              value={payForm.note}
              onChange={e => setPayForm(p => ({ ...p, note: e.target.value }))}
              placeholder="Thanh toán đợt 1..."
            />

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="secondary" className="flex-1" onClick={() => setPayModal(null)}>Hủy</Button>
              <Button type="submit" loading={paying} className="flex-1">Xác nhận thu tiền</Button>
            </div>
          </form>
        )}
      </Modal>
    </PageWrapper>
  );
}
