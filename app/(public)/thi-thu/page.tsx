"use client";

import Button from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import PublicPageHero from "@/components/layout/PublicPageHero";
import PublicPageShell from "@/components/layout/PublicPageShell";
import { createBrowserClient } from "@/lib/supabase/client";
import type { MockSkillExamDef } from "@/types";
import { Headphones, Mic, PenLine, ScrollText } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function ThiThuKyNangPage() {
  const [exams, setExams] = useState<MockSkillExamDef[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createBrowserClient();
      const { data } = await supabase
        .from("mock_skill_exam_defs")
        .select("id, slug, title, description, is_active, created_at, updated_at, content_public")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      setExams((data as MockSkillExamDef[]) || []);
      setLoading(false);
    }
    load().catch(console.error);
  }, []);

  return (
    <PublicPageShell
      hero={
        <PublicPageHero
          title="Thi thử 4 kỹ năng IELTS"
          subtitle="Listening, Reading, Speaking (ghi âm), Writing. Điền thông tin trước khi làm bài nếu bạn chưa đăng nhập. Bài làm được lưu để giáo viên chấm và phản hồi qua email."
        />
      }
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 w-full">
        <div className="flex flex-wrap items-center justify-center gap-3 mb-8 text-sm text-gray-600">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 text-brand-800 px-3 py-1 font-medium">
            <Headphones className="w-4 h-4" /> Listening
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 text-emerald-800 px-3 py-1 font-medium">
            <ScrollText className="w-4 h-4" /> Reading
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 text-violet-800 px-3 py-1 font-medium">
            <Mic className="w-4 h-4" /> Speaking
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 text-amber-900 px-3 py-1 font-medium">
            <PenLine className="w-4 h-4" /> Writing
          </span>
        </div>

        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-32 rounded-2xl border border-gray-100 bg-white shadow-[var(--shadow-card)] animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {exams.map((exam) => (
              <Card key={exam.id} className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
                <div className="min-w-0">
                  <p className="font-bold text-gray-900 text-lg leading-snug">{exam.title}</p>
                  <p className="text-sm text-gray-600 mt-1 leading-relaxed">
                    {exam.description || "Làm đủ bốn kỹ năng trên một đề."}
                  </p>
                </div>
                <Link href={`/thi-thu/${exam.slug}`} className="shrink-0 self-start sm:self-center">
                  <Button variant="primary" size="md">
                    Bắt đầu
                  </Button>
                </Link>
              </Card>
            ))}
            {exams.length === 0 && (
              <p className="text-center text-gray-500 py-12">
                Chưa có đề thi thử nào được kích hoạt. Vui lòng quay lại sau.
              </p>
            )}
          </div>
        )}

      </div>
    </PublicPageShell>
  );
}
