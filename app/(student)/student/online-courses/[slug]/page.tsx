"use client";

import PageWrapper from "@/components/layouts/PageWrapper";
import { Card } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { createBrowserClient } from "@/lib/supabase/client";
import type { PublicCourse } from "@/types";
import { ArrowLeft, BookOpen, UserCircle2 } from "lucide-react";
import Link from "next/link";
import { use, useEffect, useMemo, useState } from "react";

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

export default function StudentOnlineCourseDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [course, setCourse] = useState<PublicCourse | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createBrowserClient();
      try {
        const [{ data: authData }, { data: courseData }] = await Promise.all([
          supabase.auth.getSession(),
          supabase
            .from("public_courses")
            .select("*")
            .eq("slug", slug)
            .eq("status", "published")
            .maybeSingle(),
        ]);

        const userId = authData.session?.user?.id;
        const found = (courseData as PublicCourse | null) ?? null;
        setCourse(found);

        if (found && userId) {
          const { data: accessRow } = await supabase
            .from("public_course_access")
            .select("id")
            .eq("course_id", found.id)
            .eq("user_id", userId)
            .maybeSingle();
          setHasAccess(!!accessRow);
        } else {
          setHasAccess(false);
        }
      } catch (error) {
        console.error(error);
        setCourse(null);
        setHasAccess(false);
      } finally {
        setLoading(false);
      }
    }
    load().catch(console.error);
  }, [slug]);

  const introEmbed = useMemo(() => (course?.demo_video_url ? toYoutubeEmbedUrl(course.demo_video_url) : null), [course]);

  return (
    <PageWrapper>
      <div className="mb-4">
        <Link href="/student/online-courses">
          <Button variant="ghost" size="sm" icon={<ArrowLeft className="w-4 h-4" />}>
            Khám phá khóa học online
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="h-72 rounded-2xl border border-gray-100 bg-white shadow-[var(--shadow-card)] animate-pulse" />
      ) : !course ? (
        <Card className="p-8 border-dashed">
          <p className="text-gray-500">Khóa học không tồn tại hoặc chưa được xuất bản.</p>
        </Card>
      ) : (
        <Card className="p-6 sm:p-8 border-brand-100/60">
          <div className="w-12 h-12 rounded-xl bg-brand-100 flex items-center justify-center mb-4">
            <BookOpen className="w-6 h-6 text-brand-600" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">{course.title}</h1>
          <p className="text-sm text-gray-500 mt-2 inline-flex items-center gap-1">
            <UserCircle2 className="w-3.5 h-3.5 text-brand-400" />
            {course.teacher_name || "Đội ngũ Glocal IELTS"}
          </p>

          <div className="mt-5 space-y-3">
            <p className="text-sm text-gray-700 leading-relaxed">
              {course.short_description || "Khóa học được thiết kế theo lộ trình thực tế và dễ theo dõi."}
            </p>
            {course.description ? <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">{course.description}</p> : null}
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
                  <p className="text-xs text-gray-500 break-all">{course.demo_video_url}</p>
                )}
              </div>
            </div>
          ) : null}

          <div className="mt-6 p-4 rounded-2xl bg-gradient-to-br from-brand-50 to-indigo-50/80 border border-brand-100 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-brand-600 uppercase tracking-wide">Học phí</p>
              <p className="text-xl font-bold text-brand-800">
                {course.price > 0 ? `${Math.round(course.price).toLocaleString("vi-VN")} ${course.currency}` : "Miễn phí"}
              </p>
            </div>
            <Link href={`/student/online-courses/${course.slug}/learn`}>
              <Button size="sm" variant="primary">
                {hasAccess ? "Vào học ngay" : "Mua ngay"}
              </Button>
            </Link>
          </div>
        </Card>
      )}
    </PageWrapper>
  );
}
