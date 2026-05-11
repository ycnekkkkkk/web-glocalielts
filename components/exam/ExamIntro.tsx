"use client";
import { cn } from "@/utils/cn";
import type { MockSkillContentPublic } from "@/lib/mock-skill/types";
import { SkillBadge } from "./ui/SkillBadge";
import { ArrowLeft, CheckCircle2, Clock, FileText, Headphones, Mic, PenLine, ScrollText, ShieldCheck } from "lucide-react";
import Link from "next/link";

interface ExamIntroProps {
  examTitle: string;
  examDescription?: string;
  content: MockSkillContentPublic;
  candidateName?: string;
  onStart: () => void;
  hasResume?: boolean;
  onResume?: () => void;
}

const SKILL_INFO = [
  {
    skill: "listening" as const,
    icon: Headphones,
    color: "blue",
    time: "30 phút",
    desc: "Nghe audio và trả lời câu hỏi",
  },
  {
    skill: "reading" as const,
    icon: ScrollText,
    color: "emerald",
    time: "60 phút",
    desc: "Đọc bài và trả lời câu hỏi",
  },
  {
    skill: "speaking" as const,
    icon: Mic,
    color: "violet",
    time: "11–14 phút",
    desc: "Trả lời bằng cách ghi âm",
  },
  {
    skill: "writing" as const,
    icon: PenLine,
    color: "amber",
    time: "60 phút",
    desc: "Viết bài luận theo yêu cầu",
  },
];

export function ExamIntro({
  examTitle,
  examDescription,
  content,
  candidateName,
  onStart,
  hasResume,
  onResume,
}: ExamIntroProps) {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
      <Link href="/student/thi-thu" className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-brand-700 transition-colors bg-white px-3 py-1 rounded-full shadow-sm border border-gray-100">
        <ArrowLeft className="w-3 h-3" /> Quay lại danh sách đề
      </Link>
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full bg-brand-100 text-brand-800 px-4 py-1.5 text-sm font-semibold">
          <FileText className="w-4 h-4" />
          IELTS Mock Test
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-gray-900 leading-tight">
          {examTitle}
        </h1>
        {examDescription && (
          <p className="text-gray-500 leading-relaxed">{examDescription}</p>
        )}
        {candidateName && (
          <p className="text-sm text-gray-600">
            Xin chào, <span className="font-semibold text-gray-900">{candidateName}</span>!
          </p>
        )}
      </div>

      {/* Skills overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {SKILL_INFO.map(({ skill, icon: Icon, color, time, desc }) => (
          <div
            key={skill}
            className={cn(
              "rounded-2xl border p-4 text-center space-y-2",
              color === "blue" && "border-blue-200 bg-blue-50",
              color === "emerald" && "border-emerald-200 bg-emerald-50",
              color === "violet" && "border-violet-200 bg-violet-50",
              color === "amber" && "border-amber-200 bg-amber-50",
            )}
          >
            <SkillBadge skill={skill} variant="icon" size="md" className="mx-auto" />
            <div>
              <p className={cn(
                "text-xs font-bold",
                color === "blue" && "text-blue-700",
                color === "emerald" && "text-emerald-700",
                color === "violet" && "text-violet-700",
                color === "amber" && "text-amber-700",
              )}>
                {time}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Rules */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <ShieldCheck className="w-4 h-4 text-gray-600" />
          <p className="text-sm font-bold text-gray-700">Lưu ý trước khi bắt đầu</p>
        </div>
        <ul className="space-y-2 text-sm text-gray-600">
          <li className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
            <span>Bài thi gồm 4 kỹ năng. Làm lần lượt theo thứ tự.</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
            <span>Câu trả lời được tự động lưu sau mỗi câu.</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
            <span>Kết quả toàn bộ 4 kỹ năng sẽ được gửi qua email sau khi chấm xong.</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
            <span>Cho phép truy cập microphone để thực hiện phần Speaking.</span>
          </li>
          <li className="flex items-start gap-2">
            <Clock className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <span>Không đóng hoặc tải lại trang trong khi đang làm bài — dữ liệu có thể bị mất.</span>
          </li>
        </ul>
      </div>

      {/* CTA */}
      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={onStart}
          className="w-full rounded-2xl bg-gradient-to-r from-brand-600 to-indigo-600 text-white py-4 font-bold text-base hover:opacity-90 transition-all shadow-lg hover:shadow-xl hover:scale-[1.01] active:scale-[0.99]"
        >
          🚀 Bắt đầu làm bài
        </button>
        {hasResume && onResume && (
          <button
            type="button"
            onClick={onResume}
            className="w-full rounded-2xl border-2 border-brand-300 text-brand-700 py-3.5 font-semibold text-sm hover:bg-brand-50 transition-all"
          >
            Tiếp tục bài làm còn dang dở
          </button>
        )}
      </div>
    </div>
  );
}
