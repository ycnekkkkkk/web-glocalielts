"use client";

import PageWrapper from "@/components/layouts/PageWrapper";
import { Card } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { createBrowserClient } from "@/lib/supabase/client";
import type { PublicCourse, PublicCourseLesson } from "@/types";
import { ArrowLeft, PlayCircle } from "lucide-react";
import Link from "next/link";
import { use, useEffect, useMemo, useState } from "react";

type CourseTopic = {
  lessonIndex: number;
  lessonName: string;
  topicTitle: string;
  video: string;
};

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

export default function StudentOnlineCourseLearnPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [course, setCourse] = useState<PublicCourse | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

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

        if (!found || !userId) {
          setHasAccess(false);
        } else {
          const { data: accessRow } = await supabase
            .from("public_course_access")
            .select("id")
            .eq("course_id", found.id)
            .eq("user_id", userId)
            .maybeSingle();
          setHasAccess(!!accessRow);
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

  const curriculum = (course?.curriculum as PublicCourseLesson[] | null) ?? [];
  const topics = useMemo<CourseTopic[]>(() => {
    const items: CourseTopic[] = [];
    curriculum.forEach((lesson, lessonIndex) => {
      for (const topic of lesson.topics ?? []) {
        if (topic.video && topic.video.trim()) {
          items.push({
            lessonIndex,
            lessonName: lesson.name || "Bài học",
            topicTitle: topic.title || "Chủ đề",
            video: topic.video.trim(),
          });
        }
      }
    });
    return items;
  }, [curriculum]);

  useEffect(() => {
    if (selectedIndex > topics.length - 1) setSelectedIndex(0);
  }, [selectedIndex, topics.length]);

  const selected = topics[selectedIndex] ?? null;
  const embed = selected ? toYoutubeEmbedUrl(selected.video) : null;

  return (
    <PageWrapper>
      <div className="mb-4">
        <Link href={`/student/online-courses/${slug}`}>
          <Button variant="ghost" size="sm" icon={<ArrowLeft className="w-4 h-4" />}>
            Chi tiết khóa học online
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="h-72 rounded-2xl border border-gray-100 bg-white shadow-[var(--shadow-card)] animate-pulse" />
      ) : !course ? (
        <Card className="p-8 border-dashed">
          <p className="text-gray-500">Khóa học không tồn tại hoặc chưa được xuất bản.</p>
        </Card>
      ) : !hasAccess ? (
        <Card className="p-8 border-dashed">
          <p className="text-gray-600 font-medium">Bạn liên hệ với đội ngũ Glocal IELTS ở phần liên hệ để được trao đổi về khóa học.</p>
          <p className="text-sm text-gray-500 mt-2">Khi được cấp quyền, bạn sẽ xem được toàn bộ lesson và bài giảng tại đây.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <Card className="lg:col-span-4 p-4 sm:p-5 h-fit">
            <h1 className="text-lg font-bold text-gray-900">{course.title}</h1>
            <p className="text-xs text-gray-500 mt-1">Chọn chủ đề để xem video ngay trên web</p>
            <div className="mt-4 space-y-3 max-h-[70vh] overflow-auto pr-1">
              {curriculum.map((lesson, lessonIdx) => {
                const base = topics.findIndex((x) => x.lessonName === (lesson.name || "Bài học"));
                return (
                  <div key={`${lesson.name}-${lessonIdx}`} className="rounded-xl border border-gray-100 p-3">
                    <h2 className="text-sm font-semibold text-gray-900">
                      Lesson {lessonIdx + 1}: {lesson.name || "Nội dung đang cập nhật"}
                    </h2>
                    <div className="mt-2 space-y-2">
                      {(lesson.topics ?? []).map((topic, topicIdx) => {
                        const t = topics.findIndex(
                          (x) => x.lessonName === (lesson.name || "Bài học") && x.topicTitle === (topic.title || "Chủ đề")
                        );
                        const idx = t >= 0 ? t : base + topicIdx;
                        const active = idx === selectedIndex && idx >= 0;
                        return (
                          <button
                            key={`${topic.title}-${topicIdx}`}
                            type="button"
                            disabled={!topic.video}
                            onClick={() => idx >= 0 && setSelectedIndex(idx)}
                            className={`w-full text-left rounded-lg border px-3 py-2 text-sm transition ${active
                                ? "border-brand-300 bg-brand-50 text-brand-800"
                                : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                              } disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            <div className="flex items-center gap-2">
                              <PlayCircle className="w-4 h-4 shrink-0" />
                              <span>{topic.title || `Chủ đề ${topicIdx + 1}`}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className="lg:col-span-8 p-4 sm:p-5">
            {selected ? (
              <>
                <h2 className="text-sm text-gray-500">{selected.lessonName}</h2>
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mt-1">{selected.topicTitle}</h3>
                <div className="mt-4">
                  {embed ? (
                    <div className="relative w-full overflow-hidden rounded-xl border border-gray-200 bg-black aspect-video">
                      <iframe
                        src={embed}
                        title={`${selected.lessonName} - ${selected.topicTitle}`}
                        className="absolute inset-0 h-full w-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  ) : (
                    <video src={selected.video} controls className="w-full rounded-xl border border-gray-200 bg-black" />
                  )}
                </div>
              </>
            ) : (
              <div className="text-center py-16">
                <p className="text-gray-500">Khóa học chưa có video bài giảng khả dụng.</p>
              </div>
            )}
          </Card>
        </div>
      )}
    </PageWrapper>
  );
}
