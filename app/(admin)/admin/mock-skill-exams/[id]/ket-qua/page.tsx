"use client";

import PageWrapper from "@/components/layouts/PageWrapper";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { createBrowserClient } from "@/lib/supabase/client";
import type { MockSkillExamDef, MockSkillSubmission } from "@/types";
import { ArrowLeft, FolderOpen, Trash2 } from "lucide-react";
import Link from "next/link";
import { use, useEffect, useState } from "react";
import toast from "react-hot-toast";

type Candidate = {
  full_name?: string;
  email?: string;
  phone?: string;
  birth_year?: string;
  hometown?: string;
};

function ScoresLine({ scores }: { scores: Record<string, unknown> | null }) {
  if (!scores) return <span className="text-gray-400">—</span>;
  const listen = scores.listening as {
    correct?: number;
    total?: number;
    items?: Array<{ id: string; expected: string; actual: string; ok: boolean }>;
  } | undefined;
  const read = scores.reading as {
    correct?: number;
    total?: number;
    items?: Array<{ id: string; expected: string; actual: string; ok: boolean }>;
  } | undefined;
  const parts: string[] = [];
  if (listen && typeof listen.correct === "number") {
    parts.push(`L: ${listen.correct}/${listen.total ?? "?"}`);
  }
  if (read && typeof read.correct === "number") {
    parts.push(`R: ${read.correct}/${read.total ?? "?"}`);
  }
  if (!parts.length) return <span className="text-gray-400">—</span>;
  return (
    <div className="space-y-2">
      <span className="text-sm font-medium text-gray-800">{parts.join(" · ")}</span>
      <details className="text-xs text-gray-600">
        <summary className="cursor-pointer select-none">Chi tiết đáp án</summary>
        <div className="mt-2 max-h-36 overflow-auto space-y-1 rounded border border-gray-200 p-2 bg-gray-50">
          {[...(listen?.items || []), ...(read?.items || [])].map((x) => (
            <div key={x.id} className={x.ok ? "text-emerald-700" : "text-red-700"}>
              {x.id}: bạn <strong>{x.actual || "∅"}</strong> / đúng <strong>{x.expected || "∅"}</strong>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}

export default function AdminMockSkillKetQuaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: examId } = use(params);
  const [exam, setExam] = useState<MockSkillExamDef | null>(null);
  const [rows, setRows] = useState<MockSkillSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const supabase = createBrowserClient();
      const { data: examData, error: e1 } = await supabase
        .from("mock_skill_exam_defs")
        .select("id, slug, title, description, is_active, created_at, updated_at, content_public")
        .eq("id", examId)
        .maybeSingle();
      if (cancelled) return;
      if (e1 || !examData) {
        toast.error("Không tìm thấy đề");
        setExam(null);
        setRows([]);
        setLoading(false);
        return;
      }
      setExam(examData as MockSkillExamDef);

      const { data: subData, error: e2 } = await supabase
        .from("mock_skill_submissions")
        .select("*")
        .eq("exam_id", examId)
        .order("submitted_at", { ascending: false });
      if (cancelled) return;
      if (e2) {
        toast.error(e2.message);
        setRows([]);
      } else {
        setRows((subData as MockSkillSubmission[]) || []);
      }
      setLoading(false);
    }
    load().catch(console.error);
    return () => {
      cancelled = true;
    };
  }, [examId]);

  async function deleteSubmission(submissionId: string, label: string) {
    if (
      !confirm(
        `Xóa kết quả của “${label}”?\n\nDữ liệu trên hệ thống sẽ xóa vĩnh viễn. Thư mục trên Google Drive (nếu có) sẽ được đưa vào thùng rác.`
      )
    ) {
      return;
    }
    setDeletingId(submissionId);
    try {
      const res = await fetch(`/api/admin/mock-skill-submissions/${submissionId}`, { method: "DELETE" });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(json.error || "Xóa thất bại");
        return;
      }
      toast.success("Đã xóa kết quả");
      setRows((prev) => prev.filter((r) => r.id !== submissionId));
    } catch {
      toast.error("Lỗi mạng");
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return (
      <PageWrapper>
        <div className="p-12 text-center text-gray-500">Đang tải…</div>
      </PageWrapper>
    );
  }

  if (!exam) {
    return (
      <PageWrapper>
        <p className="text-gray-600">Không có đề với mã này.</p>
        <Link href="/admin/mock-skill-exams" className="inline-block mt-4">
          <Button variant="outline" icon={<ArrowLeft className="w-4 h-4" />}>
            Quay lại
          </Button>
        </Link>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <div className="mb-6">
        <Link href="/admin/mock-skill-exams" className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-brand-700 mb-4">
          <ArrowLeft className="w-4 h-4" /> Danh sách đề
        </Link>
        <h1 className="page-title">Kết quả — {exam.title}</h1>
        <p className="page-subtitle">
          {rows.length} lượt nộp · Slug: <span className="font-mono">{exam.slug}</span>
        </p>
      </div>

      <Card className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-gray-500">
              <th className="py-3 px-4 font-medium">Thí sinh</th>
              <th className="py-3 px-4 font-medium">Liên hệ</th>
              <th className="py-3 px-4 font-medium">Trắc nghiệm (auto)</th>
              <th className="py-3 px-4 font-medium">Trạng thái</th>
              <th className="py-3 px-4 font-medium">Thời gian</th>
              <th className="py-3 px-4 font-medium">Drive</th>
              <th className="py-3 px-4 font-medium w-24">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((r) => {
              const c = r.candidate as Candidate;
              return (
                <tr key={r.id} className="hover:bg-gray-50/80">
                  <td className="py-3 px-4">
                    <p className="font-medium text-gray-900">{c.full_name || "—"}</p>
                    {c.hometown && <p className="text-xs text-gray-500">{c.hometown}</p>}
                  </td>
                  <td className="py-3 px-4">
                    <p>{c.email || "—"}</p>
                    {c.phone && <p className="text-xs text-gray-500">{c.phone}</p>}
                  </td>
                  <td className="py-3 px-4">
                    <ScoresLine scores={r.scores as Record<string, unknown> | null} />
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant={r.status === "completed" ? "success" : r.status === "failed" ? "danger" : "warning"}>
                      {r.status}
                    </Badge>
                    {r.error_message && <p className="text-xs text-red-600 mt-1 max-w-[200px]">{r.error_message}</p>}
                  </td>
                  <td className="py-3 px-4 text-gray-600 whitespace-nowrap">
                    {r.submitted_at ? new Date(r.submitted_at).toLocaleString("vi-VN") : "—"}
                  </td>
                  <td className="py-3 px-4">
                    {r.drive_folder_url ? (
                      <a
                        href={r.drive_folder_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-brand-600 font-medium hover:underline"
                      >
                        <FolderOpen className="w-4 h-4" /> Mở folder
                      </a>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      loading={deletingId === r.id}
                      icon={<Trash2 className="w-3.5 h-3.5" />}
                      onClick={() =>
                        deleteSubmission(r.id, (c.full_name || c.email || "Thí sinh").slice(0, 80))
                      }
                    >
                      Xóa
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length === 0 && <p className="p-8 text-center text-gray-500">Chưa có ai nộp bài cho đề này.</p>}
      </Card>
    </PageWrapper>
  );
}
