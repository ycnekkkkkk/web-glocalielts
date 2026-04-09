"use client";

import Button from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { AG_LANDING_VI as t } from "@/lib/ag-landing-vi";
import { extractCertificate, extractCourseCode, extractDuration, extractObjective } from "@/lib/parse-course-metadata";
import type { PublicCourse } from "@/types/database";
import { BookOpen, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

export default function CourseCardSlider({ courses }: { courses: PublicCourse[] }) {
  // Legacy data: some courses in IELTS Mentorship have "Chứng chỉ" shown as IELTS,
  // while others should be blank even though their description mentions "IELTS Overall".
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
    return <p className="text-center text-gray-500 py-8">Chưa có khóa học trên hệ thống mới.</p>;
  }

  return (
    <div className="relative" role="region" aria-roledescription="carousel" aria-label="Khóa học nổi bật">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-slate-50 to-transparent md:w-16" aria-hidden />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-slate-50 to-transparent md:w-16" aria-hidden />

      <button
        type="button"
        aria-label="Khóa học trước"
        onClick={() => scrollByDir("prev")}
        disabled={!canPrev}
        className="absolute left-0 top-1/2 z-20 -translate-y-1/2 -translate-x-1 sm:translate-x-0 flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 shadow-md transition hover:bg-brand-50 hover:border-brand-200 hover:text-brand-700 disabled:pointer-events-none disabled:opacity-0"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        type="button"
        aria-label="Khóa học tiếp"
        onClick={() => scrollByDir("next")}
        disabled={!canNext}
        className="absolute right-0 top-1/2 z-20 -translate-y-1/2 translate-x-1 sm:translate-x-0 flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 shadow-md transition hover:bg-brand-50 hover:border-brand-200 hover:text-brand-700 disabled:pointer-events-none disabled:opacity-0"
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      <div
        ref={scrollerRef}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth rounded-xl py-2 pl-1 pr-1 [-ms-overflow-style:none] [scrollbar-width:none] outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 [&::-webkit-scrollbar]:hidden"
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
          return (
            <article
              key={c.id}
              className="w-[min(85vw,300px)] shrink-0 snap-start sm:w-[300px]"
            >
            <Card hover className="flex h-full flex-col p-5">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100">
                <BookOpen className="h-5 w-5 text-brand-600" aria-hidden />
              </div>
              <h4 className="line-clamp-2 font-bold leading-snug text-gray-900">
                <Link href={`/courses/${c.slug}`} className="hover:text-brand-700">
                  {c.title}
                </Link>
              </h4>
              <ul className="mt-3 flex-1 space-y-1.5 text-sm text-gray-600">
                <li>
                  {t.public_objective}:{" "}
                  {c.objective_text?.trim() ||
                    extractObjective(`${c.title ?? ""} ${c.short_description ?? ""} ${c.description ?? ""}`) ||
                    c.level ||
                    ""}
                </li>
                <li>
                  {t.public_duration}:{" "}
                  {c.duration_text?.trim() ||
                    extractDuration(`${c.title ?? ""} ${c.short_description ?? ""} ${c.description ?? ""}`) ||
                    ""}
                </li>
                <li className="line-clamp-2">
                  {t.public_achievement}: {certText}
                </li>
              </ul>
              <div className="mt-4 flex items-center justify-between gap-2 border-t border-gray-100 pt-4">
                <Link href={`/courses/${c.slug}`}>
                  <Button type="button" size="sm" variant="primary">
                    {t.buynow}
                  </Button>
                </Link>
                <div className="whitespace-nowrap text-sm font-bold text-brand-700">
                  {c.price > 0 ? `${Math.round(Number(c.price)).toLocaleString("vi-VN")} ${c.currency}` : t.public_free}
                </div>
              </div>
              {code ? <div className="mt-2 text-xs font-mono text-gray-500">{code}</div> : null}
            </Card>
          </article>
          );
        })}
      </div>

      <p className="mt-2 text-center text-xs text-gray-400 md:hidden">Vuốt ngang để xem thêm</p>
    </div>
  );
}
