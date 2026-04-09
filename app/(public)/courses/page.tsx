"use client";

import { Card } from "@/components/ui/Card";
import PublicPageHero from "@/components/layout/PublicPageHero";
import PublicPageShell from "@/components/layout/PublicPageShell";
import Input from "@/components/ui/Input";
import { extractCertificate, extractCourseCode, extractDuration, extractObjective } from "@/lib/parse-course-metadata";
import { createBrowserClient } from "@/lib/supabase/client";
import type { PublicCourse } from "@/types";
import { Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const COURSE_CATEGORIES = [
  "Pronunciation",
  "Speaking",
  "IELTS Mentorship",
  "IELTS Rocket",
  "A+ Teacher",
  "Practice IELTS with Native Teacher",
  "Exchange Culture with Local Mentor",
  "Hạ Hạ Mentoring Coaching",
  "[AG x HR] Series Training Intern",
] as const;

const GROUP_TITLE_BY_CATEGORY: Record<string, string> = {
  Pronunciation: "Pronunciation Course",
  Speaking: "Speaking Course (IELTS Speaking)",
  "IELTS Mentorship": "IELTS Mentorship Program",
  "IELTS Rocket": "IELTS Rocket Program",
  "A+ Teacher": "A+ Teacher Training Program",
  "Practice IELTS with Native Teacher": "Practice IELTS with Native Teacher",
  "Exchange Culture with Local Mentor": "Exchange Culture with Local Mentor",
  "Hạ Hạ Mentoring Coaching": "Hạ Hạ Mentoring & Coaching Program",
  "[AG x HR] Series Training Intern": "[AG x HR] Internship Training Series",
  Khác: "Other Courses",
};

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

function detectCategory(course: PublicCourse): string {
  const raw =
    `${course.slug ?? ""} ${course.title} ${course.short_description ?? ""} ${course.description ?? ""}`.toLowerCase();
  const rawNoAccent = raw.normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/đ/g, "d").replace(/Đ/g, "d");

  // Legacy/program header entries
  if (raw.includes("ielts mentorship")) return "IELTS Mentorship";

  // Code-first mapping for legacy codes that don't contain keyword strings
  // (e.g. "CMO1", "GIG1", "GIO1")
  const upper = `${course.slug ?? ""} ${course.title}`.toUpperCase();
  if (
    upper.includes("CMO1") ||
    upper.includes("GIG1") ||
    upper.includes("GIO1") ||
    raw.includes("pronunciation")
  ) {
    return "Pronunciation";
  }

  if (upper.includes("CMG1") || upper.includes("SPG5") || raw.includes("speaking")) return "Speaking";
  if (
    upper.includes("IM01") ||
    upper.includes("IM02") ||
    upper.includes("IM03") ||
    upper.includes("IMO1") ||
    upper.includes("IMO2") ||
    upper.includes("IMO3") ||
    upper.includes("IMG") ||
    upper.includes("GIG2")
  ) {
    return "IELTS Mentorship";
  }
  if (upper.includes("RIG") || upper.includes("RIO") || raw.includes("rocket")) return "IELTS Rocket";

  if (raw.includes("a+ teacher") || raw.includes("a plus teacher")) return "A+ Teacher";
  if (raw.includes("native teacher")) return "Practice IELTS with Native Teacher";
  if (raw.includes("exchange culture") || raw.includes("local mentor")) return "Exchange Culture with Local Mentor";
  if (raw.includes("hạ hạ") || raw.includes("ha ha") || raw.includes("mentoring coaching")) return "Hạ Hạ Mentoring Coaching";

  // Legacy title-based mapping (needed because these items may not contain keywords in text)
  if (rawNoAccent.includes("tu duy lam it duoc nhieu")) return "Hạ Hạ Mentoring Coaching";
  if (rawNoAccent.includes("yearly reflection")) return "Hạ Hạ Mentoring Coaching";
  if (rawNoAccent.includes("bi kip gioi danh cho hoc sinh luoi")) return "Hạ Hạ Mentoring Coaching";
  if (raw.includes("[ag x hr]") || raw.includes("series training intern")) return "[AG x HR] Series Training Intern";
  return "Khác";
}

export default function PublicCoursesPage() {
  const [courses, setCourses] = useState<PublicCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");

  useEffect(() => {
    async function load() {
      const supabase = createBrowserClient();
      const { data } = await supabase
        .from("public_courses")
        .select("*")
        .eq("status", "published")
        .order("published_at", { ascending: false });
      setCourses((data as PublicCourse[]) || []);
      setLoading(false);
    }
    load().catch(console.error);
  }, []);

  const filtered = useMemo(() => {
    const key = keyword.trim().toLowerCase();
    if (!key) return courses;
    return courses.filter((course) =>
      [course.title, course.teacher_name ?? "", course.short_description ?? ""].join(" ").toLowerCase().includes(key)
    );
  }, [courses, keyword]);

  const grouped = useMemo(() => {
    const map = new Map<string, PublicCourse[]>();
    for (const c of filtered) {
      const category = detectCategory(c);
      const existing = map.get(category) ?? [];
      existing.push(c);
      map.set(category, existing);
    }
    return map;
  }, [filtered]);

  return (
    <PublicPageShell
      hero={
        <PublicPageHero
          title="Khóa học"
          subtitle="Danh mục khóa học mở cho mọi người — tìm kiếm và chọn lộ trình phù hợp với bạn."
        />
      }
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 w-full">
        <div className="max-w-lg mb-6">
          <Input
            placeholder="Tìm khóa học, giảng viên..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            icon={<Search className="w-4 h-4" />}
          />
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-56 rounded-2xl border border-gray-100 bg-white shadow-[var(--shadow-card)] animate-pulse"
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card className="p-12 text-center border-dashed bg-white">
            <p className="text-gray-500">Không tìm thấy khóa học phù hợp</p>
          </Card>
        ) : (
          <div className="space-y-10">
            {COURSE_CATEGORIES.map((category) => {
              const list = grouped.get(category) ?? [];
              if (!list.length) return null;
              return (
                <section key={category}>
                  <div className="mb-4 border-b border-gray-200/80 pb-3">
                    <h2 className="text-xl font-bold text-gray-900">{GROUP_TITLE_BY_CATEGORY[category] ?? category}</h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                    {list.map((course) => {
                      const code = extractCourseCode(
                        `${course.title} ${course.short_description ?? ""} ${course.description ?? ""}`
                      );
                      const objective =
                        (course.objective_text && course.objective_text.trim()) ||
                        (course.level && course.level.trim()) ||
                        extractObjective(
                          `${course.title ?? ""} ${course.teacher_name ?? ""} ${course.short_description ?? ""} ${course.description ?? ""}`
                        ) ||
                        "";
                      const certificate =
                        (course.certificate_text && course.certificate_text.trim()) ||
                        category === "IELTS Mentorship"
                          ? code && IELTS_MENTORSHIP_CERT_CODE_SET.has(code)
                            ? "IELTS"
                            : ""
                          : extractCertificate(`${course.short_description ?? ""} ${course.description ?? ""}`) ?? "";

                      return (
                        <Link key={course.id} href={`/courses/${course.slug}`} className="block">
                          <Card hover className="p-5 flex flex-col h-full border-brand-100/50">
                            <h3 className="text-sm sm:text-base font-semibold text-gray-900 line-clamp-2 leading-snug">
                              {course.title}
                            </h3>

                            <div className="mt-4 space-y-2 text-sm text-gray-700">
                              <div className="flex gap-2">
                                <span className="shrink-0 font-semibold text-gray-900">Đối tượng:</span>
                                <span className="min-w-0 break-words">{objective}</span>
                              </div>
                              <div className="flex gap-2">
                                <span className="shrink-0 font-semibold text-gray-900">Thời lượng:</span>
                                <span className="min-w-0 break-words">
                                  {course.duration_text?.trim() ||
                                    extractDuration(`${course.title ?? ""} ${course.short_description ?? ""} ${course.description ?? ""}`) ||
                                    ""}
                                </span>
                              </div>
                              <div className="flex gap-2">
                                <span className="shrink-0 font-semibold text-gray-900">Chứng chỉ:</span>
                                <span className="min-w-0 break-words">
                                  {certificate}
                                </span>
                              </div>
                              <div className="flex gap-2">
                                <span className="shrink-0 font-semibold text-gray-900">Giá:</span>
                                <span className="min-w-0 break-words font-bold text-brand-700">
                                  {course.price > 0
                                    ? `${Math.round(course.price).toLocaleString("vi-VN")} ${course.currency}`
                                    : "Miễn phí"}
                                </span>
                              </div>

                              {code ? (
                                <div className="pt-1 text-xs font-mono text-gray-500">{code}</div>
                              ) : null}
                            </div>
                          </Card>
                        </Link>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </PublicPageShell>
  );
}
