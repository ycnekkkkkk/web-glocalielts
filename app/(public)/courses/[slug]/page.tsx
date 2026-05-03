"use client";

import Button from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import PublicPageShell from "@/components/layout/PublicPageShell";
import { createBrowserClient } from "@/lib/supabase/client";
import type { PublicCourse, PublicCourseLesson } from "@/types";
import { ArrowLeft, BookOpen, UserCircle2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { use, useEffect, useMemo, useState } from "react";
import { extractObjective } from "@/lib/parse-course-metadata";

function toYoutubeEmbedUrl(url: string) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtu.be")) {
      const id = parsed.pathname.replace("/", "");
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (parsed.hostname.includes("youtube.com")) {
      const id = parsed.searchParams.get("v");
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    return null;
  } catch {
    return null;
  }
}

const SLUG_THUMBNAIL_MAP: Record<string, string> = {
  pronunciation: "/thumbnails/pronunciation.png",
  speaking: "/thumbnails/ielts_speaking.png",
  "ielts-mentorship": "/thumbnails/ielts_mentorship.png",
  "ielts-rocket": "/thumbnails/ielts_rocket.png",
  "a-plus-teacher": "/thumbnails/A+_teacher.png",
  "series-training-intern": "/thumbnails/series_training_intern.png",
  "yearly-reflection": "/thumbnails/yearly_reflection.png",
  "bi-kip": "/thumbnails/bi_kip_hoc_gioi_danh_cho_hs_luoi.png",
};

function getCourseThumbnail(course: PublicCourse): string {
  if (course.thumbnail_url) return course.thumbnail_url;
  const title = (course.title ?? "").toLowerCase();
  const slug = (course.slug ?? "").toLowerCase();
  if (title.includes("pronunciation") || slug.includes("pronunciation")) return "/thumbnails/pronunciation.png";
  if (title.includes("speaking") || slug.includes("speaking")) return "/thumbnails/ielts_speaking.png";
  if (title.includes("mentorship") || slug.includes("mentorship")) return "/thumbnails/ielts_mentorship.png";
  if (title.includes("rocket") || slug.includes("rocket")) return "/thumbnails/ielts_rocket.png";
  if (title.includes("a+ teacher") || title.includes("a plus teacher") || slug.includes("a-plus")) return "/thumbnails/A+_teacher.png";
  if (title.includes("series training") || slug.includes("series-training") || slug.includes("intern")) return "/thumbnails/series_training_intern.png";
  if (title.includes("yearly reflection") || slug.includes("yearly")) return "/thumbnails/yearly_reflection.png";
  if (title.includes("bí kíp") || title.includes("bi kip") || title.includes("học sinh lười")) return "/thumbnails/bi_kip_hoc_gioi_danh_cho_hs_luoi.png";
  if (title.includes("tư duy") || title.includes("tu duy") || title.includes("làm ít") || title.includes("lam it")) return "/thumbnails/tu_duy_lam_it_duoc_nhieu.png";
  // Fallback for any Hạ Hạ coaching / mentoring topics
  const entries = Object.entries(SLUG_THUMBNAIL_MAP);
  for (const [key, val] of entries) {
    if (slug.includes(key)) return val;
  }
  return "";
}

export default function PublicCourseDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [course, setCourse] = useState<PublicCourse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createBrowserClient();
      const { data } = await supabase
        .from("public_courses")
        .select("*")
        .eq("slug", slug)
        .eq("status", "published")
        .maybeSingle();
      setCourse((data as PublicCourse | null) ?? null);
      setLoading(false);
    }
    load().catch(console.error);
  }, [slug]);

  const objective =
    course &&
    ((course.objective_text && course.objective_text.trim()) ||
      (course.level && course.level.trim()) ||
      extractObjective(`${course.title ?? ""} ${course.short_description ?? ""} ${course.description ?? ""}`));
  const curriculum = (course?.curriculum as PublicCourseLesson[] | null) ?? [];
  const introEmbed = course?.demo_video_url ? toYoutubeEmbedUrl(course.demo_video_url) : null;
  const hasCurriculum = useMemo(() => curriculum.some((lesson) => (lesson.topics ?? []).length > 0), [curriculum]);
  const thumbnail = course ? getCourseThumbnail(course) : "";

  return (
    <PublicPageShell>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 w-full">
        <Link href="/courses">
          <Button variant="ghost" size="sm" icon={<ArrowLeft className="w-4 h-4" />} className="text-gray-600 hover:text-brand-700">
            Danh sách khóa học
          </Button>
        </Link>

        {loading ? (
          <div className="h-72 mt-4 rounded-2xl border border-gray-100 bg-white shadow-[var(--shadow-card)] animate-pulse" />
        ) : !course ? (
          <Card className="p-8 mt-4 border-dashed">
            <p className="text-gray-500">Khóa học không tồn tại hoặc chưa được xuất bản.</p>
            <Link href="/courses" className="inline-block mt-4">
              <Button variant="primary" size="sm">
                Về danh sách khóa học
              </Button>
            </Link>
          </Card>
        ) : (
          <Card className="mt-4 border-brand-100/60 overflow-hidden p-0">
            {/* Hero thumbnail */}
            {thumbnail && (
              <div className="relative w-full h-56 sm:h-72 bg-gradient-to-br from-brand-100 to-indigo-100 overflow-hidden">
                <Image
                  src={thumbnail}
                  alt={course.title}
                  fill
                  className="object-cover"
                  priority
                  sizes="(max-width: 896px) 100vw, 896px"
                />
                {/* Dark overlay gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                {/* Price badge overlaid on thumbnail */}
                <span className="absolute bottom-4 right-4 bg-white/95 backdrop-blur-sm text-brand-700 font-bold text-sm px-4 py-1.5 rounded-full shadow-lg">
                  {course.price > 0 ? `${Math.round(course.price).toLocaleString("vi-VN")} ${course.currency}` : "Miễn phí"}
                </span>
              </div>
            )}

            <div className="p-6 sm:p-8">
              <div className="w-12 h-12 rounded-xl bg-brand-100 flex items-center justify-center mb-4">
                <BookOpen className="w-6 h-6 text-brand-600" />
              </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">{course.title}</h1>
            <p className="text-sm text-gray-500 mt-2 inline-flex items-center gap-1">
              <UserCircle2 className="w-3.5 h-3.5 text-brand-400" />
              {course.teacher_name || "Đội ngũ Glocal IELTS"}
            </p>

            {objective ? (
              <p className="mt-3 text-xs inline-flex rounded-full bg-brand-100 text-brand-800 px-3 py-1 font-semibold">
                Đối tượng: {objective}
              </p>
            ) : null}

            <div className="mt-5 space-y-3">
              <p className="text-sm text-gray-700 leading-relaxed">
                {course.short_description || "Khóa học được thiết kế theo lộ trình thực tế và dễ theo dõi."}
              </p>
              {course.description && <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">{course.description}</p>}
            </div>

            {course.demo_video_url ? (
              <div className="mt-6 rounded-2xl border border-brand-100 bg-white p-4 sm:p-5">
                <h2 className="text-base font-semibold text-gray-900">Video giới thiệu khóa học</h2>
                <div className="mt-3">
                  {introEmbed ? (
                    <div className="relative w-full overflow-hidden rounded-xl border border-gray-200 bg-black aspect-video">
                      <iframe
                        src={introEmbed}
                        title={`Giới thiệu khóa học ${course.title}`}
                        className="absolute inset-0 h-full w-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  ) : (
                    <a href={course.demo_video_url} target="_blank" rel="noreferrer" className="text-sm text-brand-700 underline break-all">
                      {course.demo_video_url}
                    </a>
                  )}
                </div>
              </div>
            ) : null}

            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 space-y-3">
              <div className="flex items-start gap-3">
                <span className="text-amber-600 mt-0.5 shrink-0 text-xl">💬</span>
                <div>
                  <p className="text-sm font-semibold text-amber-800">Liên hệ Glocal IELTS để được tư vấn khóa học</p>
                  <p className="text-xs text-amber-700 mt-1">
                    Đăng nhập hoặc tạo tài khoản để xem thông tin chi tiết và mua khóa học này.
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Link href={`/login?next=/student/online-courses/${course.slug}`}>
                  <Button variant="primary" className="w-full sm:w-auto">
                    Đăng nhập
                  </Button>
                </Link>
                <Link href="/register">
                  <Button variant="outline" className="w-full sm:w-auto bg-white">
                    Đăng ký
                  </Button>
                </Link>
              </div>
            </div>
            </div>
          </Card>
        )}
      </div>
    </PublicPageShell>
  );
}
