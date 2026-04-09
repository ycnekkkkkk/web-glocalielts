"use client";

import Button from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import PublicPageShell from "@/components/layout/PublicPageShell";
import { createBrowserClient } from "@/lib/supabase/client";
import type { PublicCourse, PublicCourseLesson } from "@/types";
import { ArrowLeft, BookOpen, UserCircle2 } from "lucide-react";
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
          <Card className="p-6 sm:p-8 mt-4 border-brand-100/60">
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

            <div className="mt-6 p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-brand-50 to-indigo-50/80 border border-brand-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-brand-600 uppercase tracking-wide">Học phí</p>
                <p className="text-xl font-bold text-brand-800 mt-0.5">
                  {course.price > 0 ? `${Math.round(course.price).toLocaleString("vi-VN")} ${course.currency}` : "Miễn phí"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href="/register">
                  <Button variant="outline" size="sm">
                    Đăng ký tài khoản
                  </Button>
                </Link>
                {hasCurriculum ? (
                  <Link href={`/courses/${course.slug}/learn`}>
                    <Button size="sm" variant="primary">
                      Mua ngay (Vào trang học)
                    </Button>
                  </Link>
                ) : course.demo_video_url ? (
                  <a href={course.demo_video_url} target="_blank" rel="noreferrer">
                    <Button size="sm" variant="primary">
                      Mua ngay (Xem giới thiệu)
                    </Button>
                  </a>
                ) : (
                  <Link href="/login">
                    <Button size="sm" variant="primary">
                      Mua khóa học
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </Card>
        )}
      </div>
    </PublicPageShell>
  );
}
