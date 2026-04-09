"use client";

import PageWrapper from "@/components/layouts/PageWrapper";
import { Card } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { createBrowserClient } from "@/lib/supabase/client";
import type { PublicCourse } from "@/types";
import { BookOpen, Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

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
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse h-52" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((c) => (
            <Card key={c.id} hover className="p-5">
              <div className="w-10 h-10 bg-linear-to-br from-brand-400 to-brand-600 rounded-xl flex items-center justify-center mb-3">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-semibold text-gray-900 text-sm line-clamp-2">{c.title}</h3>
              <p className="text-xs text-gray-500 mt-2 line-clamp-3">{c.short_description || "Khóa học online."}</p>
              <div className="mt-4 flex items-center justify-between gap-2">
                <span className="text-sm font-bold text-brand-700">
                  {c.price > 0 ? `${Math.round(c.price).toLocaleString("vi-VN")} ${c.currency}` : "Miễn phí"}
                </span>
                <Link href={`/student/online-courses/${c.slug}`}>
                  <Button size="sm">Xem chi tiết</Button>
                </Link>
              </div>
            </Card>
          ))}
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
