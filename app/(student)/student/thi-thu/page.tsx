"use client";
import PageWrapper from "@/components/layouts/PageWrapper";
import Button from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { createBrowserClient } from "@/lib/supabase/client";
import type { MockSkillExamDef } from "@/types";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function StudentMockSkillPage() {
  const [rows, setRows] = useState<MockSkillExamDef[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createBrowserClient();
      const { data } = await supabase
        .from("mock_skill_exam_defs")
        .select("id, slug, title, description, is_active, created_at, updated_at, content_public")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      setRows((data as MockSkillExamDef[]) || []);
      setLoading(false);
    }
    load().catch(console.error);
  }, []);

  return (
    <PageWrapper>
      <div className="page-header">
        <h1 className="page-title">Thi thử 4 kỹ năng</h1>
        <p className="page-subtitle">Bạn đã đăng nhập nên có thể vào làm bài ngay, không cần nhập lại thông tin.</p>
      </div>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-28 rounded-2xl border border-gray-100 bg-white animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map((exam) => (
            <Card key={exam.id} className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
              <div className="min-w-0">
                <p className="font-bold text-gray-900 text-lg leading-snug">{exam.title}</p>
                <p className="text-sm text-gray-600 mt-1 leading-relaxed">{exam.description || "Làm đủ bốn kỹ năng trên một đề."}</p>
              </div>
              <Link href={`/student/thi-thu/${exam.slug}`} className="shrink-0 self-start sm:self-center">
                <Button variant="primary" size="md">
                  Vào làm bài
                </Button>
              </Link>
            </Card>
          ))}
          {rows.length === 0 && <p className="text-center text-gray-500 py-12">Chưa có đề thi thử nào được kích hoạt.</p>}
        </div>
      )}
    </PageWrapper>
  );
}
