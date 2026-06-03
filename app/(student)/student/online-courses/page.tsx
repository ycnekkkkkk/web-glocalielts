"use client";

import PageWrapper from "@/components/layouts/PageWrapper";
import { Card } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { createBrowserClient } from "@/lib/supabase/client";
import type { PublicCourse } from "@/types";
import { Search } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

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

export default function StudentOnlineCoursesPage() {
  const [courses, setCourses] = useState<PublicCourse[]>([]);
  const [ownedIds, setOwnedIds] = useState<Set<string>>(new Set());
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createBrowserClient();
      const { data: authData } = await supabase.auth.getSession();
      const userId = authData.session?.user?.id;

      const { data: courseRows } = await supabase
        .from("public_courses")
        .select("*")
        .eq("status", "published")
        .order("published_at", { ascending: false });

      let accessSet = new Set<string>();
      if (userId) {
        const { data: accessRows } = await supabase
          .from("public_course_access")
          .select("course_id")
          .eq("user_id", userId);
        accessSet = new Set(((accessRows || []) as Array<{ course_id: string }>).map((x) => x.course_id));
      }

      setCourses((courseRows as PublicCourse[]) || []);
      setOwnedIds(accessSet);
      setLoading(false);
    }
    load().catch(console.error);
  }, []);

  const filtered = useMemo(() => {
    const key = keyword.trim().toLowerCase();
    const list = courses.filter((c) => !ownedIds.has(c.id));
    if (!key) return list;
    return list.filter((c) => [c.title, c.short_description || ""].join(" ").toLowerCase().includes(key));
  }, [courses, ownedIds, keyword]);

  return (
    <PageWrapper>
      <div className="page-header">
        <h1 className="page-title">Khám Phá Khóa Học Online</h1>
        <p className="page-subtitle">Xem các khóa học online có thể đăng ký</p>
      </div>

      <div className="mb-5 max-w-lg">
        <Input
          placeholder="Tìm khóa học..."
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          icon={<Search className="w-4 h-4" />}
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 animate-pulse h-64" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((c, index) => {
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
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-4xl">📚</span>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-5 flex flex-col flex-1">
                  <h3 className="font-semibold text-gray-900 text-sm line-clamp-2">{c.title}</h3>
                  <p className="text-xs text-gray-500 mt-2 line-clamp-2 flex-1">{c.short_description || "Khóa học online."}</p>
                  
                  {/* Footer with price and CTA */}
                  <div className="mt-4 pt-3 flex items-center justify-between border-t border-gray-100">
                    <span className="text-sm font-black text-brand-700">
                      {c.price > 0 ? `${c.price.toLocaleString("vi-VN")}đ` : "Miễn phí"}
                    </span>
                    <Link href={`/student/online-courses/${c.slug}`}>
                      <Button size="sm">Xem chi tiết</Button>
                    </Link>
                  </div>
                </div>
              </Card>
            );
          })}
          {filtered.length === 0 && (
            <div className="col-span-full text-center py-16 text-gray-400">
              <p>Hiện không có khóa online mới để khám phá.</p>
            </div>
          )}
        </div>
      )}
    </PageWrapper>
  );
}
