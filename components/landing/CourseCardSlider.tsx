"use client";

import { extractCertificate, extractCourseCode, extractDuration, extractObjective } from "@/lib/parse-course-metadata";
import type { PublicCourse } from "@/types/database";
import { ArrowRight, Award, CheckCircle2, ChevronLeft, ChevronRight, Clock, GraduationCap, Target } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

export default function CourseCardSlider({ courses }: { courses: PublicCourse[] }) {
  const IELTS_MENTORSHIP_CERT_CODE_SET = new Set<string>([
    "IM01 - 240418",
    "IM01 - 250414",
    "IM01 - 250414 - Clone",
    "IM02 - 250506",
    "IM02 - 240821",
    "IM01 - 240718",
    "IM03 - 250721 - Hồng Tươi",
    "IMG5 - 241219",
    "IMG3 - 240703",
  ]);

  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const max = scrollWidth - clientWidth;
    setCanPrev(scrollLeft > 4);
    setCanNext(max > 4 && scrollLeft < max - 4);
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    updateScrollState();
    el.addEventListener("scroll", updateScrollState, { passive: true });
    const ro = new ResizeObserver(updateScrollState);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", updateScrollState);
      ro.disconnect();
    };
  }, [courses.length, updateScrollState]);

  const scrollByDir = (dir: "prev" | "next") => {
    const el = scrollerRef.current;
    if (!el) return;
    const delta = Math.min(el.clientWidth * 0.88, 360);
    el.scrollBy({ left: dir === "next" ? delta : -delta, behavior: "smooth" });
  };

  if (courses.length === 0) {
    return <p className="text-center text-slate-500 py-8">Chưa có khóa học trên hệ thống.</p>;
  }

  return (
    <div className="relative" role="region" aria-roledescription="carousel" aria-label="Khóa học nổi bật">
      {/* Subtle fade edges */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-slate-50 to-transparent sm:w-14" aria-hidden />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-slate-50 to-transparent sm:w-14" aria-hidden />

      {/* Modern Navigation Arrows */}
      <button
        type="button"
        aria-label="Khóa học trước"
        onClick={() => scrollByDir("prev")}
        disabled={!canPrev}
        className="absolute -left-2 sm:-left-4 top-1/2 z-20 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-md transition hover:bg-brand-50 hover:border-brand-200 hover:text-brand-600 disabled:pointer-events-none disabled:opacity-0 cursor-pointer"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        type="button"
        aria-label="Khóa học tiếp"
        onClick={() => scrollByDir("next")}
        disabled={!canNext}
        className="absolute -right-2 sm:-right-4 top-1/2 z-20 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-md transition hover:bg-brand-50 hover:border-brand-200 hover:text-brand-600 disabled:pointer-events-none disabled:opacity-0 cursor-pointer"
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      <div
        ref={scrollerRef}
        className="flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth rounded-2xl py-3 px-1 [-ms-overflow-style:none] [scrollbar-width:none] outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 [&::-webkit-scrollbar]:hidden"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") {
            e.preventDefault();
            scrollByDir("prev");
          }
          if (e.key === "ArrowRight") {
            e.preventDefault();
            scrollByDir("next");
          }
        }}
      >
        {courses.map((c) => {
          const code = extractCourseCode(`${c.title} ${c.short_description ?? ""} ${c.description ?? ""}`);
          const certText = (() => {
            if (c.certificate_text && c.certificate_text.trim()) return c.certificate_text.trim();
            if (!code) return extractCertificate(`${c.short_description ?? ""} ${c.description ?? ""}`) ?? "";
            const inMentorshipCodeArea = code.startsWith("IM") || code.startsWith("IMG") || code.startsWith("GIG2");
            if (!inMentorshipCodeArea) return extractCertificate(`${c.short_description ?? ""} ${c.description ?? ""}`) ?? "";
            return IELTS_MENTORSHIP_CERT_CODE_SET.has(code) ? "IELTS" : "";
          })();

          const objective = c.objective_text?.trim() ||
            extractObjective(`${c.title ?? ""} ${c.short_description ?? ""} ${c.description ?? ""}`) ||
            c.level;

          const duration = c.duration_text?.trim() ||
            extractDuration(`${c.title ?? ""} ${c.short_description ?? ""} ${c.description ?? ""}`);

          return (
            <article
              key={c.id}
              className="w-[min(85vw,320px)] shrink-0 snap-start sm:w-[320px]"
            >
              <div className="h-full rounded-2xl border border-slate-200/90 bg-white p-5 flex flex-col justify-between hover:shadow-lg hover:border-brand-300 hover:-translate-y-1 transition-all duration-200 group relative">
                <div>
                  {/* Top Badge & Code Row */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-brand-700 bg-brand-50 px-2.5 py-1 rounded-lg border border-brand-100">
                      <GraduationCap className="w-3.5 h-3.5 text-brand-600" />
                      {objective ? objective : "Lộ trình IELTS"}
                    </span>
                    {code ? (
                      <span className="text-[10px] font-mono font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200/60">
                        {code}
                      </span>
                    ) : null}
                  </div>

                  {/* Course Title */}
                  <h4 className="font-bold leading-snug text-slate-900 group-hover:text-brand-600 transition-colors text-base line-clamp-2 min-h-[44px]">
                    <Link href={`/courses/${c.slug}`}>
                      {c.title}
                    </Link>
                  </h4>

                  {/* Short description / summary */}
                  <p className="mt-2 text-xs text-slate-500 line-clamp-2 leading-relaxed min-h-[32px]">
                    {c.short_description?.trim() || "Chương trình đào tạo trọng tâm, rèn luyện kỹ năng thực chiến và sửa bài chi tiết cùng đội ngũ giảng viên."}
                  </p>

                  {/* Smart Metadata Pills (No empty labels) */}
                  <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                    {duration ? (
                      <div className="flex items-center gap-2 text-xs text-slate-600">
                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>Thời lượng: <strong className="text-slate-800 font-semibold">{duration}</strong></span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-xs text-slate-600">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Lịch học linh hoạt, kèm 1-on-1 sát sao</span>
                      </div>
                    )}

                    {certText ? (
                      <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50/80 px-2 py-1 rounded-md border border-emerald-100/60">
                        <Award className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Cam kết: <strong className="font-semibold">{certText === "IELTS" ? "Chuẩn IELTS Quốc Tế" : certText}</strong></span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-xs text-slate-600">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Giáo trình bám sát đề thi Cambridge</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Price & CTA Action */}
                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Học phí</span>
                    <span className="text-base sm:text-lg font-black text-slate-900 leading-none">
                      {c.price > 0 ? `${Math.round(Number(c.price)).toLocaleString("vi-VN")} đ` : "Miễn phí"}
                    </span>
                  </div>

                  <Link
                    href={`/courses/${c.slug}`}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-xl shadow-xs hover:shadow-md transition-all cursor-pointer"
                  >
                    <span>Xem khóa học</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <p className="mt-3 text-center text-xs text-slate-400 md:hidden">Vuốt ngang để xem thêm khóa học →</p>
    </div>
  );
}
