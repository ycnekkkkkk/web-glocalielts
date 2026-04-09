"use client";

import PageWrapper from "@/components/layouts/PageWrapper";
import { Card } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { createBrowserClient } from "@/lib/supabase/client";
import type { PublicCourse } from "@/types";
import { BookOpen } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

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
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse h-52" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {courses.map((c) => (
            <Card key={c.id} hover className="p-5">
              <div className="w-10 h-10 bg-gradient-to-br from-sky-400 to-blue-600 rounded-xl flex items-center justify-center mb-3">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-semibold text-gray-900 text-sm line-clamp-2">{c.title}</h3>
              <p className="text-xs text-gray-500 mt-2 line-clamp-3">{c.short_description || "Khóa học online của bạn."}</p>
              <div className="mt-4 flex items-center justify-between gap-2">
                <span className="text-sm font-bold text-brand-700">
                  {c.price > 0 ? `${Math.round(c.price).toLocaleString("vi-VN")} ${c.currency}` : "Miễn phí"}
                </span>
                <Link href={`/student/online-courses/${c.slug}/learn`}>
                  <Button size="sm">Vào học</Button>
                </Link>
              </div>
            </Card>
          ))}
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
