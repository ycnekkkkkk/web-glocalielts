"use client";

import PageWrapper from "@/components/layouts/PageWrapper";
import Button from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { MockSkillBlock, MockSkillContentPublic, MockSkillQuestion } from "@/lib/mock-skill/types";
import type { MockSkillExamDef } from "@/types";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { use, useEffect, useState } from "react";
import toast from "react-hot-toast";

function Blocks({ blocks }: { blocks: MockSkillBlock[] }) {
  return (
    <div className="space-y-3">
      {blocks.map((b, i) => {
        if (b.type === "text") {
          return (
            <div
              key={i}
              className="prose prose-sm max-w-none text-gray-700 [&_p]:my-2"
              dangerouslySetInnerHTML={{ __html: b.html }}
            />
          );
        }
        if (b.type === "audio") {
          return (
            <div key={i} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
              <p className="text-xs font-medium text-gray-700 mb-2">{b.label || "Audio"}</p>
              <audio controls className="w-full">
                <source src={b.url} />
              </audio>
            </div>
          );
        }
        return (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={i} src={b.src} alt={b.alt || ""} className="max-w-full rounded border border-gray-200" />
        );
      })}
    </div>
  );
}

function Questions({ items }: { items: MockSkillQuestion[] }) {
  return (
    <div className="space-y-4">
      {items.map((q) => (
        <div key={q.id} className="rounded-lg border border-gray-200 p-3">
          <p className="text-sm font-semibold text-gray-900">
            {q.id}. {q.stem}
          </p>
          {q.type === "single_choice" ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {(q.options || []).map((opt, idx) => (
                <span key={idx} className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                  {opt}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-xs text-gray-500">Dạng điền từ/số</p>
          )}
        </div>
      ))}
    </div>
  );
}

export default function AdminMockSkillViewExamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: examId } = use(params);
  const [exam, setExam] = useState<MockSkillExamDef | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const res = await fetch(`/api/admin/mock-skill-exams/${examId}`);
      const json = (await res.json().catch(() => ({}))) as { exam?: MockSkillExamDef; error?: string };
      if (cancelled) return;
      if (!res.ok || !json.exam) {
        toast.error(json.error || "Không tìm thấy đề");
        setExam(null);
      } else {
        setExam(json.exam);
      }
      setLoading(false);
    }
    load().catch(console.error);
    return () => {
      cancelled = true;
    };
  }, [examId]);

  if (loading) {
    return (
      <PageWrapper>
        <div className="p-10 text-center text-gray-500">Đang tải…</div>
      </PageWrapper>
    );
  }

  if (!exam) {
    return (
      <PageWrapper>
        <Link href="/admin/mock-skill-exams">
          <Button variant="outline" icon={<ArrowLeft className="w-4 h-4" />}>
            Quay lại
          </Button>
        </Link>
      </PageWrapper>
    );
  }

  const content = exam.content_public as unknown as MockSkillContentPublic;

  return (
    <PageWrapper>
      <div className="mb-6">
        <Link href="/admin/mock-skill-exams" className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-brand-700 mb-3">
          <ArrowLeft className="w-4 h-4" /> Danh sách đề
        </Link>
        <h1 className="page-title">Xem đề — {exam.title}</h1>
        <p className="page-subtitle">
          Slug: <span className="font-mono">{exam.slug}</span>
        </p>
      </div>

      <div className="space-y-6">
        <Card className="p-5 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Listening</h2>
          <Blocks blocks={content?.listening?.blocks || []} />
          <Questions items={content?.listening?.questions || []} />
        </Card>

        <Card className="p-5 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Reading</h2>
          <Blocks blocks={content?.reading?.blocks || []} />
          <Questions items={content?.reading?.questions || []} />
        </Card>

        <Card className="p-5 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Speaking</h2>
          <Blocks blocks={content?.speaking?.blocks || []} />
          <p className="text-sm text-gray-700">{content?.speaking?.prompt || "—"}</p>
        </Card>

        <Card className="p-5 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Writing</h2>
          <Blocks blocks={content?.writing?.blocks || []} />
          <p className="text-sm text-gray-700">{content?.writing?.prompt || "—"}</p>
          {content?.writing?.minWords ? (
            <p className="text-xs text-gray-500">Tối thiểu {content.writing.minWords} từ</p>
          ) : null}
        </Card>
      </div>
    </PageWrapper>
  );
}

