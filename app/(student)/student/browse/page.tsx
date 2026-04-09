"use client";
import PageWrapper from "@/components/layouts/PageWrapper";
import { Card } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import { createBrowserClient } from "@/lib/supabase/client";
import { BookOpen, Calendar, Search, Users } from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import type { Class } from "@/types";

export default function StudentBrowsePage() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [enrolling, setEnrolling] = useState<string | null>(null);
  const [confirmClass, setConfirmClass] = useState<Class | null>(null);
  const [studentId, setStudentId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();

      const [clsRes, studentRes] = await Promise.all([
        supabase
          .from("classes")
          .select("*, teacher:profiles!teacher_id(id,full_name), enrollments(count)")
          .in("status", ["active", "upcoming"])
          .order("name"),
        user
          ? supabase.from("students").select("id").eq("profile_id", user.id).single()
          : Promise.resolve({ data: null }),
      ]);

      setClasses((clsRes.data as Class[]) || []);
      setStudentId((studentRes as { data: { id: string } | null }).data?.id || null);
      setLoading(false);
    }
    load().catch(console.error);
  }, []);

  const items = classes.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.teacher?.full_name || "").toLowerCase().includes(search.toLowerCase())
  );

  async function handleEnroll() {
    if (!confirmClass || !studentId) {
      if (!studentId) toast.error("Không tìm thấy hồ sơ học viên của bạn. Vui lòng liên hệ admin.");
      return;
    }
    setEnrolling(confirmClass.id);
    try {
      const supabase = createBrowserClient();

      // Check if already enrolled
      const { data: existing } = await supabase
        .from("enrollments")
        .select("id, status")
        .eq("class_id", confirmClass.id)
        .eq("student_id", studentId)
        .single();

      if (existing) {
        if (existing.status === "active") {
          toast.error("Bạn đã đăng ký lớp này rồi!");
          setConfirmClass(null);
          return;
        }
        // Re-activate if dropped
        await supabase.from("enrollments").update({ status: "active" }).eq("id", existing.id);
        toast.success(`Đã đăng ký lại lớp ${confirmClass.name}!`);
        setConfirmClass(null);
        return;
      }

      // Get student name for invoice
      const { data: studentData } = await supabase
        .from("students")
        .select("full_name")
        .eq("id", studentId)
        .single();

      const { data: enrollment } = await supabase
        .from("enrollments")
        .insert({ class_id: confirmClass.id, student_id: studentId, status: "active" })
        .select()
        .single();

      if (enrollment && confirmClass.tuition_fee > 0) {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 7);
        await supabase.from("invoices").insert({
          enrollment_id: enrollment.id,
          student_name: studentData?.full_name || "Học viên",
          class_name: confirmClass.name,
          amount: confirmClass.tuition_fee,
          due_date: dueDate.toISOString().split("T")[0],
        });
      }

      toast.success(`Đã đăng ký ${confirmClass.name}! Hóa đơn học phí đã được tạo.`);
      setConfirmClass(null);
      // Refresh classes list to update enrollment count
      const { data } = await supabase
        .from("classes")
        .select("*, teacher:profiles!teacher_id(id,full_name), enrollments(count)")
        .in("status", ["active", "upcoming"])
        .order("name");
      setClasses((data as Class[]) || []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setEnrolling(null);
    }
  }

  return (
    <PageWrapper>
      <div className="page-header">
        <h1 className="page-title">Khám Phá Khóa Học</h1>
        <p className="page-subtitle">Tìm khóa học phù hợp với bạn</p>
      </div>

      <div className="mb-6 max-w-lg">
        <Input placeholder="Tìm khóa học, giáo viên..." value={search} onChange={e => setSearch(e.target.value)} icon={<Search className="w-4 h-4" />} />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse h-52" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {items.map(c => {
            const count = c.enrollments?.[0]?.count ?? 0;
            return (
              <Card key={c.id} hover className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-brand-400 to-brand-600 rounded-xl flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-white" />
                  </div>
                  <Badge variant={c.status === "upcoming" ? "info" : "success"}>
                    {c.status === "upcoming" ? "Sắp khai giảng" : "Đang học"}
                  </Badge>
                </div>
                <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2 text-sm">{c.name}</h3>
                {c.teacher?.full_name && <p className="text-xs text-gray-500 mb-2">GV: {c.teacher.full_name}</p>}

                <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
                  <span className="flex items-center gap-1"><Users className="w-3 h-3" />{count} HV</span>
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{c.schedule || "–"}</span>
                </div>

                {c.level_out && (
                  <div className="bg-brand-50 rounded-lg px-2.5 py-1.5 mb-3">
                    <span className="text-xs text-brand-700 font-medium">Mục tiêu: {c.level_out}</span>
                  </div>
                )}

                {c.tuition_fee > 0 && (
                  <p className="text-sm font-semibold text-gray-800 mb-3">
                    {(c.tuition_fee / 1_000_000).toFixed(1)}M VNĐ
                  </p>
                )}

                <Button size="sm" className="w-full" loading={enrolling === c.id}
                  onClick={() => setConfirmClass(c)}>
                  Đăng ký
                </Button>
              </Card>
            );
          })}
          {items.length === 0 && (
            <div className="col-span-full text-center py-16 text-gray-400">
              <Search className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p>Không tìm thấy khóa học phù hợp</p>
            </div>
          )}
        </div>
      )}

      {/* Confirm Enroll Modal */}
      <Modal open={!!confirmClass} onClose={() => setConfirmClass(null)} title="Xác nhận đăng ký">
        {confirmClass && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Lớp học</span>
                <span className="font-semibold text-gray-900">{confirmClass.name}</span>
              </div>
              {confirmClass.teacher?.full_name && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Giáo viên</span>
                  <span className="text-gray-700">{confirmClass.teacher.full_name}</span>
                </div>
              )}
              {confirmClass.tuition_fee > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Học phí</span>
                  <span className="font-bold text-brand-700">{(confirmClass.tuition_fee / 1_000_000).toFixed(1)}M VNĐ</span>
                </div>
              )}
            </div>
            <p className="text-sm text-gray-500">Hóa đơn học phí sẽ được tạo tự động sau khi đăng ký.</p>
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setConfirmClass(null)}>Hủy</Button>
              <Button className="flex-1" loading={!!enrolling} onClick={handleEnroll}>Xác nhận đăng ký</Button>
            </div>
          </div>
        )}
      </Modal>
    </PageWrapper>
  );
}
