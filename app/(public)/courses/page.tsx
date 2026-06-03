"use client";

import { Card } from "@/components/ui/Card";
import PublicPageShell from "@/components/layout/PublicPageShell";
import Input from "@/components/ui/Input";
import { extractDuration } from "@/lib/parse-course-metadata";
import { createBrowserClient } from "@/lib/supabase/client";
import type { PublicCourse } from "@/types";
import { Search, BookOpen, Clock, Star, Target, Users, Zap, Award } from "lucide-react";
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

  return (
    <Link href={`/courses/${course.slug}`} className="block group">
      <Card
        hover
        className={`flex flex-col h-full border-brand-100/50 overflow-hidden p-0 rounded-2xl shadow-(--shadow-card) transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-xl ${
          featured ? "" : ""
        }`}
      >
        {/* Thumbnail */}
        <div className="relative w-full aspect-video bg-linear-to-br from-brand-100 to-sky-100 overflow-hidden">
          {thumbnail ? (
            <Image
              src={thumbnail}
              alt={course.title}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-4xl">📚</span>
            </div>
          )}
          {featured && (
            <span className="absolute top-3 left-3 bg-amber-400 text-amber-900 text-xs font-bold px-3 py-1 rounded-full shadow-sm">
              Nổi bật
            </span>
          )}
        </div>

        {/* Content */}
        <div className="p-5 flex flex-col flex-1 gap-3">
          {/* Short description */}
          {course.short_description && (
            <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">
              {course.short_description}
            </p>
          )}

          {/* Title */}
          <h3 className="text-sm sm:text-base font-bold text-gray-900 leading-snug line-clamp-2">
            {course.title}
          </h3>

          {/* Stats row */}
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <BookOpen className="w-3.5 h-3.5 shrink-0" />
              {totalLessons} bài học
            </span>
            {duration && (
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 shrink-0" />
                {duration}
              </span>
            )}
            <span className="flex items-center gap-1 ml-auto">
              <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0" />
              <span className="font-semibold text-gray-800">4.9</span>
            </span>
          </div>

          {/* Price + CTA */}
          <div className="mt-auto flex items-center justify-between pt-2 border-t border-gray-100">
            <span className="text-sm sm:text-base font-bold text-brand-600">
              {course.price > 0
                ? `${course.price.toLocaleString("vi-VN")}đ`
                : "Miễn phí"}
            </span>
            <span className="text-xs font-medium text-brand-600 group-hover:text-brand-700 transition-colors">
              Xem chi tiết →
            </span>
          </div>
        </div>
      </Card>
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
      {/* ── 1. COMPACT HERO ── */}
      <section
        className="relative overflow-hidden pt-[72px]"
        style={{ height: 260, background: "linear-gradient(135deg, #6C63FF 0%, #8B5CF6 50%, #A78BFA 100%)" }}
      >
        {/* Background decorative blobs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-24 -left-16 w-72 h-72 rounded-full bg-white/5 blur-3xl" />
          <div className="absolute top-6 right-32 w-44 h-44 rounded-full bg-white/5 blur-2xl" />
        </div>

        {/* Left: text + stats */}
        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 h-full flex items-center">
          <div className="flex-1 max-w-xl">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
              KHÓA HỌC IELTS
            </h1>
            <p className="mt-2 text-sm text-white/80 leading-relaxed max-w-lg">
              Danh mục khóa học được thiết kế giúp học viên phát triển đầy đủ 4 kỹ năng{" "}
              <span className="font-semibold text-white">Listening, Speaking, Reading và Writing</span>{" "}
              theo lộ trình bài bản.
            </p>

            {/* Stats row */}
            <div className="flex items-center gap-6 mt-6">
              {[
                { icon: <Users className="w-4 h-4" />, value: "3500+", label: "Học viên" },
                { icon: <Star className="w-4 h-4" />, value: "4.9/5", label: "Đánh giá" },
                { icon: <Target className="w-4 h-4" />, value: "95%", label: "Đạt mục tiêu" },
              ].map((stat) => (
                <div key={stat.label} className="flex items-center gap-2">
                  <span className="text-white/80">{stat.icon}</span>
                  <div>
                    <div className="text-white font-extrabold text-lg leading-none">{stat.value}</div>
                    <div className="text-white/60 text-xs mt-0.5">{stat.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: illustration */}
          <div className="hidden lg:flex items-center justify-center w-64 shrink-0">
            <div className="relative w-48 h-40">
              {/* Laptop */}
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-36 h-24 bg-white/20 rounded-xl border border-white/30 backdrop-blur-sm flex items-center justify-center">
                <div className="w-32 h-16 bg-white/30 rounded-lg flex items-center justify-center">
                  <div className="text-white/60 text-xs font-mono">IELTS Dashboard</div>
                </div>
              </div>
              {/* Books */}
              <div className="absolute bottom-20 left-0 w-8 h-10 bg-amber-300/80 rounded-sm shadow-sm rotate-[-8deg]" />
              <div className="absolute bottom-20 left-7 w-8 h-12 bg-sky-300/80 rounded-sm shadow-sm rotate-[4deg]" />
              <div className="absolute bottom-20 left-14 w-8 h-9 bg-emerald-300/80 rounded-sm shadow-sm rotate-2" />
              {/* Headphones */}
              <div className="absolute top-4 right-0 w-10 h-10 bg-white/20 rounded-full border border-white/30 flex items-center justify-center">
                <div className="w-6 h-3 border-2 border-white/50 rounded-full" />
              </div>
              {/* Lightning bolt */}
              <div className="absolute top-8 left-8 text-amber-300/90">
                <Zap className="w-6 h-6 fill-amber-300/80" />
              </div>
              {/* Star */}
              <div className="absolute top-14 right-8 text-white/50">
                <Star className="w-4 h-4 fill-white/30" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. SEARCH + FILTER BAR ── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 w-full">
        <Card className="p-4 mb-6 border-brand-100/50 shadow-(--shadow-card)">
          {/* Search */}
          <div className="mb-4">
            <Input
              placeholder="Tìm khóa học, giảng viên..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              icon={<Search className="w-4 h-4" />}
            />
          </div>
          {/* Category filters */}
          <div className="flex flex-wrap gap-2">
            {COURSE_CATEGORIES.map((cat) => {
              const active = activeCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 cursor-pointer ${
                    active
                      ? "bg-brand-600 text-white shadow-sm"
                      : "bg-white text-gray-600 border border-gray-200 hover:border-brand-300 hover:text-brand-600"
                  }`}
                >
                  {cat === "Tất cả" ? GROUP_TITLE_BY_CATEGORY["Tất cả"] : GROUP_TITLE_BY_CATEGORY[cat] ?? cat}
                </button>
              );
            })}
          </div>
        </Card>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-72 rounded-2xl border border-gray-100 bg-white shadow-(--shadow-card) animate-pulse"
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card className="p-12 text-center border-dashed bg-white">
            <p className="text-gray-500">Không tìm thấy khóa học phù hợp</p>
          </Card>
        ) : (
          <>
            {/* ── 4. FEATURED COURSES ── */}
            {featured.length > 0 && activeCategory === "Tất cả" && !keyword && (
              <section className="mb-10">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <span className="text-2xl">🔥</span> Khóa học nổi bật
                  </h2>
                  <button
                    onClick={() => setActiveCategory("Tất cả")}
                    className="text-sm text-brand-600 hover:text-brand-700 font-medium transition-colors cursor-pointer"
                  >
                    Xem tất cả →
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
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

            {/* ── 5. ALL COURSES ── */}
            {rest.length > 0 && activeCategory === "Tất cả" && !keyword && (
              <section className="mb-10">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <span>📖</span> Tất cả khóa học
                  </h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5">
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

            {/* When filtered: show all in one grid */}
            {(activeCategory !== "Tất cả" || !!keyword) && (
              <section className="mb-10">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <span>📖</span> {GROUP_TITLE_BY_CATEGORY[activeCategory] ?? activeCategory}
                  </h2>
                  <span className="text-sm text-gray-500">{filtered.length} khóa học</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5">
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

            {/* ── 6. BENEFITS ── */}
            <section className="mb-8">
              <Card className="p-8 border-brand-100/50 shadow-(--shadow-card)">
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-8">
                  {[
                    {
                      icon: <Award className="w-7 h-7 text-brand-600" />,
                      title: "Giảng viên chất lượng",
                      desc: "Đội ngũ 8.0+ IELTS\nGiàu kinh nghiệm",
                    },
                    {
                      icon: <Zap className="w-7 h-7 text-brand-600" />,
                      title: "Lộ trình cá nhân hóa",
                      desc: "Học đúng trọng tâm\nTiết kiệm thời gian",
                    },
                    {
                      icon: <Users className="w-7 h-7 text-brand-600" />,
                      title: "Học mọi lúc mọi nơi",
                      desc: "Trên mọi thiết bị",
                    },
                    {
                      icon: <Target className="w-7 h-7 text-brand-600" />,
                      title: "Cam kết đầu ra",
                      desc: "Đồng hành đến khi\nđạt mục tiêu",
                    },
                  ].map((b) => (
                    <div key={b.title} className="flex flex-col items-center text-center gap-3">
                      <div className="w-14 h-14 rounded-2xl bg-brand-50 flex items-center justify-center">
                        {b.icon}
                      </div>
                      <h3 className="font-bold text-gray-900 text-sm">{b.title}</h3>
                      <p className="text-xs text-gray-500 leading-relaxed whitespace-pre-line">
                        {b.desc}
                      </p>
                    </div>
                  ))}
                </div>
              </Card>
            </section>
          </>
        )}
      </div>
    </PublicPageShell>
  );
}
