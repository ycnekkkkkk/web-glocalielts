"use client";
import { CheckCircle2, Home, Mail } from "lucide-react";
import Link from "next/link";

interface ExamSubmittedConfirmationProps {
  examTitle: string;
  candidateName: string;
  thiThuRoot: string;
}

export function ExamSubmittedConfirmation({
  examTitle,
  candidateName,
  thiThuRoot,
}: ExamSubmittedConfirmationProps) {
  return (
    <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-6">
      {/* Success icon */}
      <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
        <CheckCircle2 className="w-10 h-10 text-emerald-600" />
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-black text-gray-900">Nộp bài thành công!</h1>
        <p className="text-gray-500">
          Cảm ơn <strong>{candidateName}</strong> đã hoàn thành bài thi{" "}
          <strong>{examTitle}</strong>.
        </p>
      </div>

      {/* Main notice */}
      <div className="rounded-2xl border-2 border-brand-200 bg-brand-50 p-5 text-left space-y-2">
        <div className="flex items-center gap-2">
          <Mail className="w-5 h-5 text-brand-600 flex-shrink-0" />
          <p className="font-bold text-brand-800">Kết quả sẽ sớm được cập nhật</p>
        </div>
        <p className="text-sm text-brand-700 leading-relaxed">
          Kết quả của bạn sẽ được cập nhật trên trang cá nhân và gửi về email của bạn trong vài giờ.
          Vui lòng kiểm tra cả thư mục Spam nếu không thấy trong hộp thư chính.
        </p>
      </div>

      {/* Steps illustration */}
      <div className="grid grid-cols-3 gap-3 text-center">
        {[
          { emoji: "✅", label: "Bài đã nhận" },
          { emoji: "🤖", label: "AI đang chấm" },
          { emoji: "📧", label: "Gửi kết quả" },
        ].map(({ emoji, label }) => (
          <div key={label} className="rounded-2xl border border-gray-100 bg-white p-3">
            <p className="text-2xl mb-1">{emoji}</p>
            <p className="text-xs text-gray-500 font-medium">{label}</p>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <Link href={thiThuRoot} className="flex-1">
          <button
            type="button"
            className="w-full rounded-2xl border-2 border-gray-200 bg-white text-gray-700 py-3 font-semibold text-sm hover:border-brand-300 hover:text-brand-700 transition-all"
          >
            Về danh sách đề
          </button>
        </Link>
        <Link href="/student/dashboard" className="flex-1">
          <button
            type="button"
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand-600 to-indigo-600 text-white py-3 font-semibold text-sm hover:opacity-90 transition-all shadow-md"
          >
            <Home className="w-4 h-4" />
            Trang cá nhân
          </button>
        </Link>
      </div>
    </div>
  );
}
