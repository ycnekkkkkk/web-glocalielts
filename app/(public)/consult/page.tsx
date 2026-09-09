"use client";

import PublicPageShell from "@/components/layout/PublicPageShell";
import SupportRegisterFormSection from "@/components/support/SupportRegisterFormSection";
import {
  Calendar,
  CheckCircle2,
  GraduationCap,
  Headphones,
  MapPin,
  ShieldCheck,
  Sparkles,
} from "lucide-react";


function ConsultHero() {
  return (
    <section className="relative bg-slate-50/70 border-b border-slate-200/80 py-12 lg:py-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Institutional Badge */}
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-white border border-slate-200 text-slate-700 text-xs font-semibold mb-4 shadow-2xs">
          <GraduationCap className="w-3.5 h-3.5 text-brand-600" />
          <span>CỔNG HỖ TRỢ & TƯ VẤN KHẢO THÍ CHUẨN QUỐC TẾ</span>
        </div>

        {/* Heading */}
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-[1.15]">
          Tư Vấn & Hỗ Trợ Đăng Ký{" "}
          <span className="bg-gradient-to-r from-brand-600 via-brand-700 to-indigo-600 bg-clip-text text-transparent">
            Thi IELTS Chính Thức
          </span>
        </h1>

        {/* Subheading */}
        <p className="mt-4 text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl mx-auto">
          Đội ngũ chuyên viên học vụ Glocal IELTS đồng hành cùng bạn từ khâu đánh giá năng lực, lựa chọn địa điểm và lịch thi tối ưu tại IDP & British Council, đến hướng dẫn thủ tục đăng ký chuẩn xác.
        </p>

        {/* Trust Badges */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2.5 text-xs text-slate-600 font-medium">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Đối tác khảo thí chính thức IDP & British Council</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>100% Tư vấn & giải đáp thủ tục miễn phí</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Lịch thi linh hoạt trên toàn quốc</span>
          </div>
        </div>

        {/* Impact Numbers */}
        <div className="mt-8 pt-6 border-t border-slate-200/60 max-w-3xl mx-auto grid grid-cols-3 gap-4">
          <div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">3.500+</div>
            <div className="text-[11px] sm:text-xs text-slate-500 mt-0.5 font-medium">Thí sinh đã được hỗ trợ</div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-brand-600 tracking-tight">100%</div>
            <div className="text-[11px] sm:text-xs text-slate-500 mt-0.5 font-medium">Hỗ trợ miễn phí</div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">IDP & BC</div>
            <div className="text-[11px] sm:text-xs text-slate-500 mt-0.5 font-medium">Đối tác khảo thí ủy quyền</div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function ConsultPage() {
  return (
    <PublicPageShell hero={null}>
      <ConsultHero />
      <SupportRegisterFormSection />
    </PublicPageShell>
  );
}

