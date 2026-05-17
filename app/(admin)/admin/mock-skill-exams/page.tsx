"use client";

import PageWrapper from "@/components/layouts/PageWrapper";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { createBrowserClient } from "@/lib/supabase/client";
import type { MockSkillExamDef } from "@/types";
import { BookOpen, ExternalLink, Eye, Play, Plus, Settings, UploadCloud, Users, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

export default function AdminMockSkillExamsPage() {
  const [exams, setExams] = useState<MockSkillExamDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [pushingId, setPushingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createBrowserClient();
      const { data, error } = await supabase
        .from("mock_skill_exam_defs")
        .select("id, slug, title, description, is_active, created_at, updated_at, content_public, content_drive_file_id, content_drive_url")
        .order("created_at", { ascending: false });
      if (cancelled) return;
      if (error) {
        toast.error(error.message);
        setExams([]);
      } else {
        setExams((data as MockSkillExamDef[]) || []);
      }
      setLoading(false);
    })().catch(console.error);
    return () => {
      cancelled = true;
    };
  }, []);

  async function toggleActive(exam: MockSkillExamDef) {
    const supabase = createBrowserClient();
    const next = !exam.is_active;
    const { error } = await supabase.from("mock_skill_exam_defs").update({ is_active: next }).eq("id", exam.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(next ? "Đã bật đề thi" : "Đã tắt đề thi");
    setExams((prev) => prev.map((e) => (e.id === exam.id ? { ...e, is_active: next } : e)));
  }

  async function deleteExam(exam: MockSkillExamDef) {
    if (!confirm(`Bạn có chắc chắn muốn XÓA VĨNH VIỄN đề thi "${exam.title}"?\nHành động này không thể hoàn tác và sẽ xóa tất cả kết quả/đáp án liên quan!`)) {
      return;
    }

    const toastId = toast.loading("Đang xóa đề thi...");
    try {
      const supabase = createBrowserClient();

      // First clear any answers connected to this exam
      const { error: ansErr } = await supabase
        .from("mock_skill_exam_answers")
        .delete()
        .eq("exam_id", exam.id);

      if (ansErr) {
        console.warn("Lỗi khi xóa đáp án liên quan:", ansErr.message);
      }

      // Then delete the exam definition
      const { error } = await supabase
        .from("mock_skill_exam_defs")
        .delete()
        .eq("id", exam.id);

      if (error) {
        toast.error(error.message, { id: toastId });
        return;
      }

      toast.success("Đã xóa đề thi thành công!", { id: toastId });
      setExams((prev) => prev.filter((e) => e.id !== exam.id));
    } catch (err: any) {
      toast.error("Lỗi kết nối", { id: toastId });
    }
  }

  async function pushExamToDrive(exam: MockSkillExamDef) {
    if (!confirm("Bạn có chắc muốn chuyển đề này lên Google Drive để tối ưu dung lượng Supabase?")) return;
    setPushingId(exam.id);
    try {
      const res = await fetch(`/api/admin/mock-skill-exams/${exam.id}/push-to-drive`, { method: "POST" });
      const json = (await res.json().catch(() => ({}))) as { error?: string; fileId?: string; fileUrl?: string };
      if (!res.ok) {
        toast.error(json.error || "Đẩy đề lên Drive thất bại");
        return;
      }
      toast.success("Đã chuyển đề lên Drive thành công");
      setExams((prev) =>
        prev.map((e) =>
          e.id === exam.id
            ? { ...e, content_drive_file_id: json.fileId || e.content_drive_file_id, content_drive_url: json.fileUrl || e.content_drive_url, content_public: null }
            : e
        )
      );
    } catch {
      toast.error("Lỗi mạng");
    } finally {
      setPushingId(null);
    }
  }

  return (
    <PageWrapper>
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-brand-500/20 shrink-0">
            <BookOpen className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Quản lý Đề Thi Thử</h1>
            <p className="text-sm text-gray-500 font-medium">Cấu hình hệ thống bài thi IELTS 4 Kỹ năng</p>
          </div>
        </div>
        <Link href="/admin/mock-skill-exams/new">
          <Button variant="primary" icon={<Plus className="w-4 h-4" />}>Tạo đề mới</Button>
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="h-48 animate-pulse bg-white border border-gray-100" />
          ))}
        </div>
      ) : exams.length === 0 ? (
        <Card className="p-12 text-center flex flex-col items-center justify-center border-dashed border-gray-200">
          <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mb-4">
            <BookOpen className="w-8 h-8 text-gray-300" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">Chưa có đề thi nào</h3>
          <p className="text-sm text-gray-500 mb-6 max-w-md">Hãy tạo một đề thi mới hoặc chạy migration để tải dữ liệu mẫu vào hệ thống.</p>
          <Link href="/admin/mock-skill-exams/new">
            <Button variant="primary" icon={<Plus className="w-4 h-4" />}>Tạo đề đầu tiên</Button>
          </Link>
        </Card>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {exams.map((exam) => (
            <Card key={exam.id} className="group hover:border-brand-300 hover:shadow-xl hover:shadow-brand-500/5 transition-all duration-300 overflow-hidden flex flex-col border-gray-200">
              <div className="p-5 flex-1 relative">
                {/* Decorative background blur */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-brand-50 to-transparent opacity-50 rounded-bl-full pointer-events-none" />
                
                <div className="flex justify-between items-start mb-3 relative z-10">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={exam.is_active ? "success" : "gray"}>
                      <span className="flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${exam.is_active ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`}></span>
                        {exam.is_active ? "Đang mở" : "Đã đóng"}
                      </span>
                    </Badge>
                    <Badge variant={exam.content_drive_file_id ? "info" : "warning"}>
                      <span className="flex items-center gap-1">
                        <UploadCloud className="w-3 h-3" />
                        {exam.content_drive_file_id ? "Data: Drive" : "Data: DB"}
                      </span>
                    </Badge>
                  </div>
                  <p className="text-[10px] text-gray-400 font-mono bg-gray-50 px-2 py-0.5 rounded border border-gray-100 hidden sm:block">
                    {exam.slug}
                  </p>
                </div>

                <div className="relative z-10">
                  <h3 className="text-lg font-bold text-gray-900 leading-snug mb-1.5 group-hover:text-brand-700 transition-colors">
                    {exam.title}
                  </h3>
                  <p className="text-sm text-gray-500 line-clamp-2">
                    {exam.description || "Không có mô tả cho đề thi này."}
                  </p>
                </div>
              </div>

              {/* Actions Bar */}
              <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Link href={`/admin/mock-skill-exams/${exam.id}/ket-qua`}>
                    <Button size="sm" variant="primary" className="shadow-sm" icon={<Users className="w-3.5 h-3.5" />}>
                      Kết quả
                    </Button>
                  </Link>
                  <Link href={`/admin/mock-skill-exams/${exam.id}/de-thi`}>
                    <Button size="sm" variant="outline" className="bg-white" icon={<Eye className="w-3.5 h-3.5" />}>
                      Nội dung
                    </Button>
                  </Link>
                </div>

                <div className="flex items-center gap-1">
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="text-gray-400 hover:text-brand-600 px-2"
                    onClick={() => toggleActive(exam)}
                    title={exam.is_active ? "Tạm đóng đề" : "Mở đề"}
                  >
                    <Settings className="w-4 h-4" />
                  </Button>
                  
                  {!exam.content_drive_file_id && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-amber-500 hover:text-amber-700 hover:bg-amber-50 px-2"
                      loading={pushingId === exam.id}
                      onClick={() => pushExamToDrive(exam)}
                      title="Chuyển dữ liệu JSON lên Drive để giảm tải Database"
                    >
                      <UploadCloud className="w-4 h-4" />
                    </Button>
                  )}
                  
                  <Link href={`/thi-thu/${exam.slug}`} target="_blank" title="Thi thử dưới góc độ thí sinh">
                    <Button size="sm" variant="ghost" className="text-gray-400 hover:text-brand-600 px-2">
                      <Play className="w-4 h-4" />
                    </Button>
                  </Link>

                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 px-2"
                    onClick={() => deleteExam(exam)}
                    title="Xóa đề thi vĩnh viễn"
                  >
                    <Trash2 className="w-4.5 h-4.5" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </PageWrapper>
  );
}
