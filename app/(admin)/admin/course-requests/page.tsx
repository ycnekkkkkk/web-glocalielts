"use client";

import PageWrapper from "@/components/layouts/PageWrapper";
import { Card } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import CourseChat from "@/components/course/CourseChat";
import { CheckCircle2, Clock, Search, XCircle } from "lucide-react";
import { useEffect, useMemo, useState, useCallback } from "react";
import toast from "react-hot-toast";

type PurchaseRequest = {
  id: string;
  course_id: string;
  user_id: string;
  user_name: string | null;
  user_email: string | null;
  course_title: string | null;
  status: "pending" | "approved" | "rejected";
  note: string | null;
  admin_note: string | null;
  created_at: string;
  updated_at: string;
};

type InboxRow = {
  course_id: string;
  user_id: string;
  course_title: string | null;
  user_name: string | null;
  user_email: string | null;
  last_message: string;
  last_message_at: string;
  last_sender: "user" | "admin";
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Chờ duyệt",
  approved: "Đã duyệt",
  rejected: "Từ chối",
};

const STATUS_CLASSES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

export default function AdminCourseRequestsPage() {
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("pending");
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"requests" | "inbox">("requests");
  const [inbox, setInbox] = useState<InboxRow[]>([]);
  const [actioning, setActioning] = useState<string | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [chatTarget, setChatTarget] = useState<{ courseId: string; userId: string; name: string; courseName: string; ts: number } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ id: string; action: "approve" | "reject" | "revoke"; name: string; course: string } | null>(null);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/course-requests?status=${filterStatus}`);
      const json = await res.json() as { data: PurchaseRequest[]; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Lỗi");
      setRequests(json.data ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Không thể tải requests");
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  const loadInbox = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/course-inbox`);
      const json = await res.json() as { data: InboxRow[]; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Lỗi");
      setInbox(json.data ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Không thể tải inbox");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "requests") loadRequests();
    else loadInbox();
  }, [activeTab, loadRequests, loadInbox]);

  const filteredRequests = useMemo(() => {
    const key = search.trim().toLowerCase();
    if (!key) return requests;
    return requests.filter((r) =>
      [r.user_name ?? "", r.user_email ?? "", r.course_title ?? ""].join(" ").toLowerCase().includes(key)
    );
  }, [requests, search]);

  const filteredInbox = useMemo(() => {
    const key = search.trim().toLowerCase();
    if (!key) return inbox;
    return inbox.filter((r) =>
      [r.user_name ?? "", r.user_email ?? "", r.course_title ?? ""].join(" ").toLowerCase().includes(key)
    );
  }, [inbox, search]);

  async function handleAction(id: string, action: "approve" | "reject" | "revoke") {
    setActioning(id);
    try {
      const res = await fetch(`/api/admin/course-requests/${id}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ admin_note: adminNote.trim() || undefined }),
      });
      if (!res.ok) {
        const json = await res.json() as { error?: string };
        throw new Error(json.error ?? "Lỗi");
      }
      toast.success(action === "approve" ? "Đã duyệt và cấp quyền!" : "Đã từ chối yêu cầu");
      setConfirmModal(null);
      setAdminNote("");
      await loadRequests();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Có lỗi xảy ra");
    } finally {
      setActioning(null);
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleString("vi-VN", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  }

  return (
    <PageWrapper>
      <div className="page-header">
        <h1 className="page-title">Yêu Cầu Mua Khóa Học</h1>
        <p className="page-subtitle">Duyệt và quản lý các yêu cầu đăng ký khóa học online từ học viên</p>
      </div>

      <div className="flex border-b border-gray-200 mb-5">
        <button
          onClick={() => setActiveTab("requests")}
          className={`px-6 py-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === "requests" ? "border-brand-600 text-brand-700" : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Yêu cầu mua khóa
        </button>
        <button
          onClick={() => setActiveTab("inbox")}
          className={`px-6 py-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === "inbox" ? "border-brand-600 text-brand-700" : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Tin nhắn khóa học (Inbox)
        </button>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        {activeTab === "requests" && (
          <div className="flex rounded-xl border border-gray-200 overflow-hidden">
            {(["pending", "approved", "rejected", "all"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  filterStatus === s
                    ? "bg-brand-600 text-white"
                    : "bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                {s === "all" ? "Tất cả" : STATUS_LABEL[s]}
              </button>
            ))}
          </div>
        )}
        <div className="relative flex-1 min-w-48 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm tên, email, khóa học..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <p className="text-sm text-gray-500">
          {activeTab === "requests" ? filteredRequests.length : filteredInbox.length} kết quả
        </p>
      </div>

      <Card>
        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Đang tải...</div>
        ) : activeTab === "requests" ? (
          filteredRequests.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p>Không có yêu cầu nào</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    <th className="text-left px-4 py-3">Học viên</th>
                    <th className="text-left px-4 py-3">Khóa học</th>
                    <th className="text-left px-4 py-3">Ghi chú</th>
                    <th className="text-left px-4 py-3">Trạng thái</th>
                    <th className="text-left px-4 py-3">Ngày gửi</th>
                    <th className="text-left px-4 py-3">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredRequests.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-sm font-semibold text-gray-900">{r.user_name || "—"}</p>
                        <p className="text-xs text-gray-500">{r.user_email || "—"}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-gray-800 max-w-[200px] truncate">{r.course_title || "—"}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs text-gray-600 max-w-[160px] truncate">{r.note || "—"}</p>
                        {r.admin_note && (
                          <p className="text-xs text-brand-600 mt-0.5 truncate max-w-[160px]">
                            Admin: {r.admin_note}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_CLASSES[r.status]}`}>
                          {STATUS_LABEL[r.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                        {formatDate(r.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {r.status === "pending" && (
                            <>
                              <Button
                                size="sm"
                                variant="primary"
                                icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                                onClick={() =>
                                  setConfirmModal({
                                    id: r.id,
                                    action: "approve",
                                    name: r.user_name ?? r.user_email ?? r.user_id,
                                    course: r.course_title ?? "",
                                  })
                                }
                              >
                                Duyệt
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                icon={<XCircle className="w-3.5 h-3.5 text-red-500" />}
                                onClick={() =>
                                  setConfirmModal({
                                    id: r.id,
                                    action: "reject",
                                    name: r.user_name ?? r.user_email ?? r.user_id,
                                    course: r.course_title ?? "",
                                  })
                                }
                              >
                                Từ chối
                              </Button>
                            </>
                          )}
                          {r.status === "approved" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              icon={<XCircle className="w-3.5 h-3.5 text-red-500" />}
                              onClick={() =>
                                setConfirmModal({
                                  id: r.id,
                                  action: "revoke",
                                  name: r.user_name ?? r.user_email ?? r.user_id,
                                  course: r.course_title ?? "",
                                })
                              }
                            >
                              Thu hồi
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setChatTarget({
                                courseId: r.course_id,
                                userId: r.user_id,
                                name: r.user_name ?? r.user_email ?? "Học viên",
                                courseName: r.course_title ?? "",
                                ts: Date.now()
                              })
                            }
                          >
                            Chat
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : filteredInbox.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p>Không có tin nhắn nào</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <th className="text-left px-4 py-3">Học viên</th>
                  <th className="text-left px-4 py-3">Khóa học</th>
                  <th className="text-left px-4 py-3">Tin nhắn cuối</th>
                  <th className="text-left px-4 py-3">Thời gian</th>
                  <th className="text-left px-4 py-3">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredInbox.map((r) => (
                  <tr key={`${r.course_id}-${r.user_id}`} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold text-gray-900">{r.user_name || "—"}</p>
                      <p className="text-xs text-gray-500">{r.user_email || "—"}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-800 max-w-[200px] truncate">{r.course_title || "—"}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {r.last_sender === "admin" && (
                          <span className="text-[10px] font-bold bg-brand-100 text-brand-700 px-1.5 py-0.5 rounded uppercase">Admin</span>
                        )}
                        <p className={`text-sm max-w-[300px] truncate ${r.last_sender === "user" ? "text-gray-900 font-medium" : "text-gray-500"}`}>
                          {r.last_message || "—"}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {formatDate(r.last_message_at)}
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        size="sm"
                        variant={r.last_sender === "user" ? "primary" : "outline"}
                        onClick={() =>
                          setChatTarget({
                            courseId: r.course_id,
                            userId: r.user_id,
                            name: r.user_name ?? r.user_email ?? "Học viên",
                            courseName: r.course_title ?? "",
                            ts: Date.now()
                          })
                        }
                      >
                        {r.last_sender === "user" ? "Trả lời" : "Xem Chat"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Confirm modal */}
      <Modal
        open={!!confirmModal}
        onClose={() => { setConfirmModal(null); setAdminNote(""); }}
        title={confirmModal?.action === "approve" ? "Duyệt yêu cầu" : "Từ chối yêu cầu"}
        size="sm"
      >
        {confirmModal && (
          <div className="space-y-4">
            <div className="rounded-xl bg-gray-50 p-4 text-sm space-y-1">
              <p><span className="font-semibold">Học viên:</span> {confirmModal.name}</p>
              <p><span className="font-semibold">Khóa học:</span> {confirmModal.course}</p>
            </div>
            {confirmModal.action === "approve" && (
              <div className="rounded-xl bg-green-50 border border-green-100 p-3 text-xs text-green-700">
                Sau khi duyệt, học viên sẽ được <strong>cấp quyền truy cập ngay lập tức</strong>.
              </div>
            )}
            {confirmModal.action === "revoke" && (
              <div className="rounded-xl bg-red-50 border border-red-100 p-3 text-xs text-red-700">
                Học viên sẽ <strong>mất quyền truy cập</strong> khóa học này ngay lập tức. Trạng thái sẽ chuyển về Từ chối.
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Ghi chú cho học viên (không bắt buộc)
              </label>
              <textarea
                rows={3}
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder={
                  confirmModal.action === "approve"
                    ? "Ví dụ: Chào bạn, khóa học đã được mở..."
                    : confirmModal.action === "revoke"
                    ? "Ví dụ: Hủy quyền truy cập do vi phạm quy định..."
                    : "Ví dụ: Bạn chưa hoàn thành thanh toán..."
                }
                className="w-full text-sm rounded-xl border border-gray-200 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
              />
            </div>
            <div className="flex gap-3 pt-1">
              <Button variant="secondary" className="flex-1" onClick={() => { setConfirmModal(null); setAdminNote(""); }}>
                Hủy
              </Button>
              <Button
                variant={confirmModal.action === "approve" ? "primary" : "ghost"}
                className={`flex-1 ${(confirmModal.action === "reject" || confirmModal.action === "revoke") ? "text-red-600 border-red-200 hover:bg-red-50" : ""}`}
                loading={actioning === confirmModal.id}
                onClick={() => handleAction(confirmModal.id, confirmModal.action)}
              >
                {confirmModal.action === "approve" ? "Xác nhận duyệt" : confirmModal.action === "revoke" ? "Xác nhận thu hồi" : "Xác nhận từ chối"}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Admin chat */}
      {chatTarget && (
        <CourseChat
          key={`${chatTarget.courseId}-${chatTarget.userId}-${chatTarget.ts}`}
          courseId={chatTarget.courseId}
          viewerRole="admin"
          targetUserId={chatTarget.userId}
          courseName={`${chatTarget.name} — ${chatTarget.courseName}`}
          autoOpen={true}
        />
      )}
    </PageWrapper>
  );
}
