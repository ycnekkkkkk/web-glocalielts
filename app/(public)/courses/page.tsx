"use client";

import PublicPageShell from "@/components/layout/PublicPageShell";
import { extractDuration, extractObjective } from "@/lib/parse-course-metadata";
import { createBrowserClient } from "@/lib/supabase/client";
import type { PublicCourse } from "@/types";
import {
  ArrowRight,
  Award,
  BookOpen,
  CheckCircle2,
  Clock,
  GraduationCap,
  Search,
  Sparkles,
  Star,
  Target,
  Users,
  X,
  Zap,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const COURSE_CATEGORIES = [
  "Tất cả",
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
  "Tất cả": "Tất cả khóa học",
  Pronunciation: "Khóa học Phát âm chuẩn",
  Speaking: "Luyện thi Speaking 1-on-1",
  "IELTS Mentorship": "IELTS Mentorship Chuyên sâu",
  "IELTS Rocket": "IELTS Rocket Tăng tốc",
  "A+ Teacher": "Đào tạo Giảng viên A+ Teacher",
  "Practice IELTS with Native Teacher": "Luyện IELTS với Giáo viên Bản ngữ",
  "Exchange Culture with Local Mentor": "Giao lưu Văn hóa cùng Mentor",
  "Hạ Hạ Mentoring Coaching": "Hạ Hạ Mentoring & Coaching",
  "[AG x HR] Series Training Intern": "Chương trình Thực tập sinh [AG x HR]",
  Khác: "Khóa học khác",
};

const CATEGORY_THUMBNAIL_MAP: Record<string, string> = {
  Pronunciation: "/thumbnails/pronunciation.png",
  Speaking: "/thumbnails/ielts_speaking.png",
  "IELTS Mentorship": "/thumbnails/ielts_mentorship.png",
  "IELTS Rocket": "/thumbnails/ielts_rocket.png",
  "A+ Teacher": "/thumbnails/A+_teacher.png",
  "[AG x HR] Series Training Intern": "/thumbnails/series_training_intern.png",
  "Hạ Hạ Mentoring Coaching": "/thumbnails/tu_duy_lam_it_duoc_nhieu.png",
};

function getThumbnail(course: PublicCourse, category: string): string {
  const titleLow = (course.title ?? "").toLowerCase();
  if (course.thumbnail_url) return course.thumbnail_url;
  if (titleLow.includes("yearly reflection")) return "/thumbnails/yearly_reflection.png";
  if (
    titleLow.includes("bí kíp") ||
    titleLow.includes("bi kip") ||
    titleLow.includes("học sinh lười")
  )
    return "/thumbnails/bi_kip_hoc_gioi_danh_cho_hs_luoi.png";
  return CATEGORY_THUMBNAIL_MAP[category] ?? "";
}

function detectCategory(course: PublicCourse): string {
  const raw = `${course.slug ?? ""} ${course.title} ${course.short_description ?? ""} ${course.description ?? ""}`.toLowerCase();
  const rawNoAccent = raw
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d");
  const upper = `${course.slug ?? ""} ${course.title}`.toUpperCase();

  if (raw.includes("ielts mentorship")) return "IELTS Mentorship";
  if (upper.includes("CMO1") || upper.includes("GIG1") || upper.includes("GIO1") || raw.includes("pronunciation"))
    return "Pronunciation";
  if (upper.includes("CMG1") || upper.includes("SPG5") || raw.includes("speaking")) return "Speaking";
  if (upper.includes("IM01") || upper.includes("IM02") || upper.includes("IM03") || upper.includes("IMO1") || upper.includes("IMO2") || upper.includes("IMO3") || upper.includes("IMG") || upper.includes("GIG2"))
    return "IELTS Mentorship";
  if (upper.includes("RIG") || upper.includes("RIO") || raw.includes("rocket")) return "IELTS Rocket";
  if (raw.includes("a+ teacher") || raw.includes("a plus teacher")) return "A+ Teacher";
  if (raw.includes("native teacher")) return "Practice IELTS with Native Teacher";
  if (raw.includes("exchange culture") || raw.includes("local mentor")) return "Exchange Culture with Local Mentor";
  if (raw.includes("hạ hạ") || raw.includes("ha ha") || raw.includes("mentoring coaching"))
    return "Hạ Hạ Mentoring Coaching";
  if (rawNoAccent.includes("tu duy lam it duoc nhieu")) return "Hạ Hạ Mentoring Coaching";
  if (rawNoAccent.includes("yearly reflection")) return "Hạ Hạ Mentoring Coaching";
  if (rawNoAccent.includes("bi kip gioi danh cho hoc sinh luoi")) return "Hạ Hạ Mentoring Coaching";
  if (raw.includes("[ag x hr]") || raw.includes("series training intern")) return "[AG x HR] Series Training Intern";
  return "Khác";
}

function CourseCard({
  course,
  category,
  featured,
}: {
  course: PublicCourse;
  category: string;
  featured?: boolean;
}) {
  const thumbnail = getThumbnail(course, category);
  const totalLessons =
    course.curriculum?.reduce((acc, l) => acc + (l.topics?.length ?? 0), 0) ?? 0;
  const duration =
    course.duration_text?.trim() ||
    extractDuration(
      `${course.title ?? ""} ${course.teacher_name ?? ""} ${course.short_description ?? ""} ${course.description ?? ""}`
    ) ||
    "";
  const objective =
    course.objective_text?.trim() ||
    extractObjective(`${course.title ?? ""} ${course.short_description ?? ""} ${course.description ?? ""}`) ||
    course.level;

  return (
    <Link href={`/courses/${course.slug}`} className="block group h-full">
      <div className="flex flex-col h-full rounded-2xl border border-slate-200/90 bg-white overflow-hidden shadow-xs transition-all duration-200 group-hover:-translate-y-1 group-hover:shadow-lg group-hover:border-brand-300">
        {/* Thumbnail Area */}
        <div className="relative w-full aspect-video bg-slate-100 overflow-hidden">
          {thumbnail ? (
            <Image
              src={thumbnail}
              alt={course.title}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-brand-50 to-indigo-50 text-brand-600">
              <GraduationCap className="w-12 h-12 stroke-1" />
              <span className="text-[11px] font-bold uppercase tracking-wider mt-1 text-slate-400">Glocal IELTS</span>
            </div>
          )}

          {/* Top Badges */}
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
            {featured ? (
              <span className="bg-amber-500 text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full shadow-sm">
                Nổi bật
              </span>
            ) : (
              <span className="bg-white/90 backdrop-blur-sm text-slate-700 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border border-slate-200/70 shadow-2xs">
                {objective ? objective : "Lộ trình IELTS"}
              </span>
            )}
            <span className="bg-white/90 backdrop-blur-sm text-brand-700 text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border border-slate-200/60 shadow-2xs">
              {category !== "Khác" ? category : "IELTS"}
            </span>
          </div>
        </div>

        {/* Card Body */}
        <div className="p-5 flex flex-col flex-1 justify-between gap-4">
          <div>
            {/* Title */}
            <h3 className="text-base font-bold text-slate-900 group-hover:text-brand-600 transition-colors leading-snug line-clamp-2 min-h-[44px]">
              {course.title}
            </h3>

            {/* Short description */}
            <p className="mt-2 text-xs text-slate-500 leading-relaxed line-clamp-2 min-h-[32px]">
              {course.short_description?.trim() || "Chương trình đào tạo trọng tâm, rèn luyện kỹ năng thực chiến và sửa bài chi tiết cùng đội ngũ giảng viên."}
            </p>

            {/* Metadata info */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-4 text-xs text-slate-600">
              {totalLessons > 0 && (
                <span className="flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{totalLessons} bài học</span>
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>{duration || "Lịch kèm linh hoạt"}</span>
              </span>
            </div>
          </div>

          {/* Price & CTA Action (Không bị tràn, không gãy chữ) */}
          <div className="pt-3.5 border-t border-slate-100 mt-auto flex flex-col gap-2.5">
            <div className="flex items-baseline justify-between">
              <span className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">Học phí</span>
              <span className="text-base sm:text-lg font-black text-slate-900 whitespace-nowrap">
                {course.price > 0 ? `${Math.round(Number(course.price)).toLocaleString("vi-VN")} đ` : "Miễn phí"}
              </span>
            </div>

            <div className="w-full flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold text-brand-700 bg-brand-50 group-hover:bg-brand-600 group-hover:text-white rounded-xl transition-all border border-brand-200/70 group-hover:border-transparent shadow-2xs whitespace-nowrap">
              <span>Xem chi tiết</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function PublicCoursesPage() {
  const [courses, setCourses] = useState<PublicCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [activeCategory, setActiveCategory] = useState("Tất cả");

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
    let list = courses;
    if (key) {
      list = list.filter((course) =>
        [course.title, course.teacher_name ?? "", course.short_description ?? ""]
          .join(" ")
          .toLowerCase()
          .includes(key)
      );
    }
    if (activeCategory !== "Tất cả") {
      list = list.filter((course) => detectCategory(course) === activeCategory);
    }
    return list;
  }, [courses, keyword, activeCategory]);

  const featured = useMemo(() => filtered.slice(0, 3), [filtered]);
  const rest = useMemo(() => filtered.slice(3), [filtered]);

  return (
    <PublicPageShell hero={null}>
      {/* ── 1. MODERN ACADEMIC HERO ── */}
      <section className="relative bg-slate-50/70 border-b border-slate-200/80 py-12 lg:py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-white border border-slate-200 text-slate-700 text-xs font-semibold mb-4 shadow-2xs">
            <GraduationCap className="w-3.5 h-3.5 text-brand-600" />
            <span>CHƯƠNG TRÌNH ĐÀO TẠO IELTS CHUYÊN SÂU</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-[1.15]">
            Khóa Học IELTS &{" "}
            <span className="bg-gradient-to-r from-brand-600 via-brand-700 to-indigo-600 bg-clip-text text-transparent">
              Lộ Trình Đào Tạo
            </span>
          </h1>

          <p className="mt-4 text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl mx-auto">
            Hệ thống đào tạo toàn diện từ mất gốc đến 7.5+, rèn luyện 4 kỹ năng Listening, Speaking, Reading và Writing cùng đội ngũ giảng viên chuyên môn cao và giáo viên bản ngữ.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-slate-600 font-medium">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Lớp học kèm 1-on-1 chuyên sâu</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Cam kết chuẩn đầu ra văn bản</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Lịch học linh hoạt trực tuyến & trực tiếp</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. SEARCH & FILTER CONTROLS ── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 w-full">
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs mb-8">
          {/* Search Box */}
          <div className="relative mb-4">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Tìm kiếm khóa học, giảng viên, lộ trình mục tiêu..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 focus:bg-white pl-10 pr-10 py-2.5 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition-all"
            />
            {keyword && (
              <button
                type="button"
                onClick={() => setKeyword("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Category filter pills */}
          <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
            {COURSE_CATEGORIES.map((cat) => {
              const active = activeCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer ${
                    active
                      ? "bg-brand-600 text-white shadow-xs"
                      : "bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/80 hover:text-slate-900"
                  }`}
                >
                  {cat === "Tất cả" ? GROUP_TITLE_BY_CATEGORY["Tất cả"] : GROUP_TITLE_BY_CATEGORY[cat] ?? cat}
                </button>
              );
            })}
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-80 rounded-2xl border border-slate-200 bg-white shadow-xs animate-pulse"
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-xs">
            <p className="text-slate-500 text-sm">Không tìm thấy khóa học phù hợp với từ khóa đã nhập.</p>
            <button
              onClick={() => {
                setKeyword("");
                setActiveCategory("Tất cả");
              }}
              className="mt-3 text-xs font-bold text-brand-600 hover:text-brand-700 underline cursor-pointer"
            >
              Xem lại tất cả khóa học
            </button>
          </div>
        ) : (
          <>
            {/* ── 3. FEATURED COURSES ── */}
            {featured.length > 0 && activeCategory === "Tất cả" && !keyword && (
              <section className="mb-12">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-500" />
                    <h2 className="text-xl font-bold text-slate-900">
                      Khóa học nổi bật
                    </h2>
                  </div>
                  <span className="text-xs text-slate-500 font-medium">Được quan tâm nhiều nhất</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {featured.map((course) => (
                    <CourseCard
                      key={course.id}
                      course={course}
                      category={detectCategory(course)}
                      featured
                    />
                  ))}
                </div>
              </section>
            )}

            {/* ── 4. ALL COURSES ── */}
            {rest.length > 0 && activeCategory === "Tất cả" && !keyword && (
              <section className="mb-12">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-xl font-bold text-slate-900">
                    Tất cả chương trình đào tạo
                  </h2>
                  <span className="text-xs text-slate-500">{courses.length} khóa học</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
                  {rest.map((course) => (
                    <CourseCard
                      key={course.id}
                      course={course}
                      category={detectCategory(course)}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Filtered grid */}
            {(activeCategory !== "Tất cả" || !!keyword) && (
              <section className="mb-12">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-xl font-bold text-slate-900">
                    {GROUP_TITLE_BY_CATEGORY[activeCategory] ?? activeCategory}
                  </h2>
                  <span className="text-xs text-slate-500">{filtered.length} khóa học tìm thấy</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filtered.map((course) => (
                    <CourseCard
                      key={course.id}
                      course={course}
                      category={detectCategory(course)}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* ── 5. CORE ACADEMIC BENEFITS ── */}
            <section className="mb-12">
              <div className="rounded-2xl border border-slate-200/90 bg-white p-8 shadow-xs">
                <div className="text-center max-w-xl mx-auto mb-8">
                  <h3 className="text-lg font-bold text-slate-900">Tiêu chuẩn chất lượng đào tạo tại Glocal IELTS</h3>
                  <p className="text-xs text-slate-500 mt-1">Hệ sinh thái học tập chú trọng hiệu quả thực chiến và sự tiến bộ từng ngày của học viên.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
                  {[
                    {
                      icon: <Award className="w-6 h-6 text-brand-600" />,
                      title: "Giảng viên Chuyên môn cao",
                      desc: "Đội ngũ giảng viên 8.0+ IELTS và giáo viên bản ngữ tận tâm.",
                    },
                    {
                      icon: <Zap className="w-6 h-6 text-brand-600" />,
                      title: "Lộ trình Cá nhân hóa",
                      desc: "Thiết kế chuẩn hóa theo mục tiêu điểm và quỹ thời gian của bạn.",
                    },
                    {
                      icon: <Users className="w-6 h-6 text-brand-600" />,
                      title: "Kèm 1-on-1 Sát sao",
                      desc: "Sửa lỗi trực tiếp, theo dõi tiến độ học vụ chi tiết 24/7.",
                    },
                    {
                      icon: <Target className="w-6 h-6 text-brand-600" />,
                      title: "Cam kết Chuẩn đầu ra",
                      desc: "Bảo đảm bằng văn bản, hỗ trợ học lại miễn phí nếu chưa đạt.",
                    },
                  ].map((b) => (
                    <div key={b.title} className="flex flex-col items-center text-center gap-3 p-4 rounded-xl bg-slate-50/60 border border-slate-100">
                      <div className="w-12 h-12 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center">
                        {b.icon}
                      </div>
                      <h4 className="font-bold text-slate-900 text-sm">{b.title}</h4>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        {b.desc}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </PublicPageShell>
  );
}
