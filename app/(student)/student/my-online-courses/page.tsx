"use client";

import PageWrapper from "@/components/layouts/PageWrapper";
import { Card } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { createBrowserClient } from "@/lib/supabase/client";
import type { PublicCourse } from "@/types";
import { BookOpen } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

function getThumbnail(course: PublicCourse): string {
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
  return "";
}

export default function StudentMyOnlineCoursesPage() {
  const [courses, setCourses] = useState<PublicCourse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createBrowserClient();
      const { data: authData } = await supabase.auth.getSession();
      const userId = authData.session?.user?.id;
      if (!userId) {
        setLoading(false);
        return;
      }

      const { data: accessRows } = await supabase
        .from("public_course_access")
        .select("course_id")
        .eq("user_id", userId);

      const courseIds = ((accessRows || []) as Array<{ course_id: string }>).map((x) => x.course_id);
      if (courseIds.length === 0) {
        setCourses([]);
        setLoading(false);
        return;
      }

      const { data: courseRows } = await supabase
        .from("public_courses")
        .select("*")
        .in("id", courseIds)
        .eq("status", "published")
        .order("published_at", { ascending: false });

      setCourses((courseRows as PublicCourse[]) || []);
      setLoading(false);
    }
    load().catch(console.error);
  }, []);

  return (
    <PageWrapper>
      <div className="page-header">
        <h1 className="page-title">Khóa Học Online Đã Mua</h1>
        <p className="page-subtitle">{courses.length} khóa học được cấp quyền</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 animate-pulse h-64" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {courses.map((c, index) => {
            const thumbnail = getThumbnail(c);
            return (
              <Card key={c.id} hover className="flex flex-col overflow-hidden p-0">
                {/* Thumbnail */}
                <div className="relative w-full aspect-video bg-gradient-to-br from-brand-100 to-sky-100 shrink-0 overflow-hidden">
                  {thumbnail ? (
                    <Image
                      src={thumbnail}
                      alt={c.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                      priority={index < 3}
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-brand-50">
                      <BookOpen className="w-8 h-8 text-brand-500" />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-5 flex flex-col flex-1">
                  <h3 className="font-semibold text-gray-900 text-sm line-clamp-2">{c.title}</h3>
                  <p className="text-xs text-gray-500 mt-2 line-clamp-2 flex-1">{c.short_description || "Khóa học online của bạn."}</p>
                  
                  {/* Footer with price and CTA */}
                  <div className="mt-4 pt-3 flex items-center justify-between border-t border-gray-100">
                    <span className="text-sm font-black text-brand-700">
                      {c.price > 0 ? `${Math.round(c.price).toLocaleString("vi-VN")} VND` : "Miễn phí"}
                    </span>
                    <Link href={`/student/online-courses/${c.slug}/learn?from=my-courses`}>
                      <Button size="sm">Vào học</Button>
                    </Link>
                  </div>
                </div>
              </Card>
            );
          })}
          {courses.length === 0 && (
            <div className="col-span-full text-center py-16 text-gray-400">
              <p>Bạn chưa được cấp quyền khóa học online nào.</p>
            </div>
          )}
        </div>
      )}
    </PageWrapper>
  );
}
