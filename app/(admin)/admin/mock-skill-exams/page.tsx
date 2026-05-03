"use client";

import PageWrapper from "@/components/layouts/PageWrapper";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { createBrowserClient } from "@/lib/supabase/client";
import type { MockSkillExamDef } from "@/types";
import { ExternalLink, Eye } from "lucide-react";
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
    toast.success(next ? "Đã bật đề" : "Đã tắt đề");
    setExams((prev) => prev.map((e) => (e.id === exam.id ? { ...e, is_active: next } : e)));
  }

  async function pushExamToDrive(exam: MockSkillExamDef) {
    setPushingId(exam.id);
    try {
      const res = await fetch(`/api/admin/mock-skill-exams/${exam.id}/push-to-drive`, { method: "POST" });
      const json = (await res.json().catch(() => ({}))) as { error?: string; fileId?: string; fileUrl?: string };
      if (!res.ok) {
        toast.error(json.error || "Đẩy đề lên Drive thất bại");
        return;
      }
      toast.success("Đã chuyển đề lên Drive");
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
      <div className="page-header flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="page-title">Thi thử 4 kỹ năng</h1>
          <p className="page-subtitle">Quản lý đề IELTS (Listening, Reading, Speaking, Writing). Nội dung đề cập nhật qua form editor.</p>
        </div>
        <Link href="/admin/mock-skill-exams/new">
          <Button variant="primary">+ Tạo đề mới</Button>
        </Link>
      </div>


      <Card>
        {loading ? (
          <div className="p-8 text-center text-gray-500">Đang tải…</div>
        ) : exams.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Chưa có đề. Chạy migration 029 hoặc thêm bản ghi trong bảng mock_skill_exam_defs.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {exams.map((exam) => (
              <div key={exam.id} className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 hover:bg-gray-50/80">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900">{exam.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5 font-mono">{exam.slug}</p>
                  {exam.description && <p className="text-sm text-gray-600 mt-2">{exam.description}</p>}
                  <div className="mt-2 flex flex-wrap gap-2 items-center">
                    <Badge variant={exam.is_active ? "success" : "gray"}>{exam.is_active ? "Đang mở" : "Đã tắt"}</Badge>
                    <Badge variant={exam.content_drive_file_id ? "info" : "warning"}>
                      {exam.content_drive_file_id ? "Nội dung: Drive" : "Nội dung: Supabase"}
                    </Badge>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                  <Button variant="outline" size="sm" onClick={() => toggleActive(exam)}>
                    {exam.is_active ? "Tắt đề" : "Bật đề"}
                  </Button>
                  <Link href={`/admin/mock-skill-exams/${exam.id}/de-thi`}>
                    <Button size="sm" variant="outline" icon={<Eye className="w-3.5 h-3.5" />}>
                      Xem đề
                    </Button>
                  </Link>
                  <Link href={`/admin/mock-skill-exams/${exam.id}/ket-qua`}>
                    <Button size="sm" variant="primary" icon={<ExternalLink className="w-3.5 h-3.5" />}>
                      Xem kết quả
                    </Button>
                  </Link>
                  <Button
                    size="sm"
                    variant="outline"
                    loading={pushingId === exam.id}
                    onClick={() => pushExamToDrive(exam)}
                  >
                    Chuyển đề lên Drive
                  </Button>
                  <Link href={`/thi-thu/${exam.slug}`} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" variant="ghost">
                      Mở trang thí sinh
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </PageWrapper>
  );
}
