"use client";
import PageWrapper from "@/components/layouts/PageWrapper";
import { Card } from "@/components/ui/Card";
import Avatar from "@/components/ui/Avatar";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { createBrowserClient } from "@/lib/supabase/client";
import { BookOpen } from "lucide-react";
import { useEffect, useState } from "react";

interface TeacherStat {
  id: string;
  full_name: string | null;
  email: string | null;
  classCount: number;
  studentCount: number;
}

export default function OrgInstructorsPage() {
  const [teachers, setTeachers] = useState<TeacherStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createBrowserClient();

      const { data: classes } = await supabase
        .from("classes")
        .select("id,teacher_id,teacher:profiles!teacher_id(id,full_name,email)")
        .not("teacher_id", "is", null);

      const { data: enrollments } = await supabase
        .from("enrollments")
        .select("class_id")
        .eq("status", "active");

      const enrollMap: Record<string, number> = {};
      (enrollments || []).forEach((e: { class_id: string }) => {
        enrollMap[e.class_id] = (enrollMap[e.class_id] || 0) + 1;
      });

      const teacherMap: Record<string, TeacherStat> = {};
      (classes || []).forEach((c: { id: string; teacher_id: string; teacher: { id: string; full_name: string | null; email: string | null } }) => {
        const t = c.teacher;
        if (!t) return;
        if (!teacherMap[t.id]) {
          teacherMap[t.id] = { id: t.id, full_name: t.full_name, email: t.email, classCount: 0, studentCount: 0 };
        }
        teacherMap[t.id].classCount += 1;
        teacherMap[t.id].studentCount += (enrollMap[c.id] || 0);
      });

      setTeachers(Object.values(teacherMap).sort((a, b) => b.classCount - a.classCount));
      setLoading(false);
    }
    load().catch(console.error);
  }, []);

  return (
    <PageWrapper>
      <div className="page-header">
        <h1 className="page-title">Giảng Viên</h1>
        <p className="page-subtitle">{teachers.length} giảng viên đang hợp tác</p>
      </div>

      {loading ? (
        <Card className="p-4"><SkeletonTable /></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {teachers.map(ins => (
            <Card key={ins.id} hover className="p-6 text-center">
              <Avatar name={ins.full_name || "?"} size="xl" className="mx-auto mb-4" />
              <h3 className="font-bold text-gray-900 mb-1">{ins.full_name || "–"}</h3>
              <p className="text-sm text-gray-500 mb-4">{ins.email || "–"}</p>
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-lg font-bold text-purple-600">{ins.classCount}</p>
                  <p className="text-xs text-gray-500">Lớp học</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-lg font-bold text-sky-600">{ins.studentCount}</p>
                  <p className="text-xs text-gray-500">Học viên</p>
                </div>
              </div>
            </Card>
          ))}
          {teachers.length === 0 && (
            <div className="col-span-3 text-center py-16 text-gray-400">
              <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p className="text-sm">Chưa có giảng viên nào được phân công lớp</p>
            </div>
          )}
        </div>
      )}
    </PageWrapper>
  );
}
