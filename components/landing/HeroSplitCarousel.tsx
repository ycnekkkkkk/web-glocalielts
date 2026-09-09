"use client";

import { ArrowRight, CheckCircle2, Award } from "lucide-react";
import Link from "next/link";

export default function HeroSplitCarousel() {
  return (
    <section className="relative pt-10 pb-14 lg:pt-16 lg:pb-20 overflow-hidden">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        
        {/* Institutional Badge */}
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold mx-auto mb-6">
          <Award className="w-3.5 h-3.5 text-brand-600" />
          <span>HỆ THỐNG ĐÀO TẠO & KHẢO THÍ IELTS CHUẨN QUỐC TẾ</span>
        </div>

        {/* Professional Academic Headline */}
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.15]">
          Đào Tạo & Khảo Thí IELTS{" "}
          <span className="bg-gradient-to-r from-brand-600 via-brand-700 to-indigo-600 bg-clip-text text-transparent">
            Chuẩn Quốc Tế
          </span>
        </h1>

        {/* Professional Subtitle */}
        <p className="mt-5 text-sm sm:text-base lg:text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto">
          Hệ thống học tập tích hợp: Chương trình đào tạo chuyên sâu theo khung Cambridge, phòng thi thử 4 kỹ năng sát thực tế IDP & British Council, và cổng quản lý học vụ tương tác dành cho học viên và giảng viên.
        </p>

        {/* Dual Professional CTAs */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/courses"
            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 text-xs sm:text-sm font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer"
          >
            Khám phá khóa học IELTS
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/thi-thu"
            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 text-xs sm:text-sm font-bold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-2xs transition-all cursor-pointer"
          >
            Phòng thi thử trực tuyến
          </Link>
        </div>

        {/* Professional Highlights */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-slate-500 font-medium">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Giảng viên Chuyên môn cao & Bản ngữ</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Khảo thí 4 Kỹ năng Chuẩn Cambridge</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Cổng Quản lý Học tập Học viên & Giảng viên</span>
          </div>
        </div>

        {/* Partner Logos Strip */}
        <div className="mt-14 pt-10 border-t border-slate-200/80">
          <p className="text-center text-xs sm:text-sm font-bold uppercase tracking-widest text-slate-600 mb-6">
            ĐỐI TÁC KHẢO THÍ & HỢP TÁC ĐÀO TẠO
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10">
            {[
              { name: "British Council", src: "/logo/doitac/2.png" },
              { name: "NUS", src: "/logo/doitac/3.png" },
              { name: "Pace Academy", src: "/logo/doitac/4.png" },
              { name: "Lasalle", src: "/logo/doitac/5.png" },
              { name: "University of Greenwich", src: "/logo/doitac/6.png" },
              { name: "Arena Multimedia", src: "/logo/doitac/7.png" },
            ].map((p) => (
              <div key={p.name} className="h-12 flex items-center justify-center px-3 py-1">
                <img
                  src={p.src}
                  alt={p.name}
                  style={{ height: "46px", maxHeight: "48px", maxWidth: "140px", width: "auto" }}
                  className="object-contain opacity-75 hover:opacity-100 transition-all duration-200 grayscale hover:grayscale-0"
                  title={p.name}
                />
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}
