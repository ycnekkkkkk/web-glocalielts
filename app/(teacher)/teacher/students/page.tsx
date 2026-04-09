"use client";
import PageWrapper from "@/components/layouts/PageWrapper";
import { Card } from "@/components/ui/Card";
import Avatar from "@/components/ui/Avatar";
import Badge from "@/components/ui/Badge";
import Input from "@/components/ui/Input";
import { createBrowserClient } from "@/lib/supabase/client";
import { GraduationCap, Search } from "lucide-react";
import { useEffect, useState } from "react";

interface StudentRow {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  classes: string[];
}

export default function InstructorStudentsPage() {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function load() {
      const supabase = createBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      // Get teacher's classes
      const { data: classData } = await supabase
        .from("classes")
        .select("id, name")
        .eq("teacher_id", user.id);

      if (!classData || classData.length === 0) {
        setStudents([]);
        setLoading(false);
        return;
      }

      const classIds = classData.map((c: { id: string }) => c.id);
      const classNameMap: Record<string, string> = Object.fromEntries(
        classData.map((c: { id: string; name: string }) => [c.id, c.name])
      );

      // Get active enrollments with student info
      const { data: enrollData } = await supabase
        .from("enrollments")
        .select("class_id, student_id, students(id, full_name, email, phone)")
        .in("class_id", classIds)
        .eq("status", "active");

      // Build per-student map
      const studentMap: Record<string, StudentRow> = {};
      for (const row of (enrollData || []) as unknown as {
        class_id: string;
        student_id: string;
        students: { id: string; full_name: string; email: string | null; phone: string | null } | null;
      }[]) {
        const s = row.students;
        if (!s) continue;
        if (!studentMap[s.id]) {
          studentMap[s.id] = { id: s.id, full_name: s.full_name, email: s.email, phone: s.phone, classes: [] };
        }
        const className = classNameMap[row.class_id];
        if (className && !studentMap[s.id].classes.includes(className)) {
          studentMap[s.id].classes.push(className);
        }
      }

      setStudents(Object.values(studentMap).sort((a, b) => a.full_name.localeCompare(b.full_name)));
      setLoading(false);
    }
    load().catch(console.error);
  }, []);

  const filtered = students.filter(
    (s) =>
      s.full_name.toLowerCase().includes(search.toLowerCase()) ||
      (s.email || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <PageWrapper>
      <div className="page-header">
        <h1 className="page-title">Học Viên</h1>
        <p className="page-subtitle">{students.length} học viên đang theo học</p>
      </div>

      <div className="mb-5">
        <Input
          placeholder="Tìm tên hoặc email học viên..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          icon={<Search className="w-4 h-4" />}
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((s) => (
            <Card key={s.id} hover className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <Avatar name={s.full_name} size="md" />
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{s.full_name}</p>
                  <p className="text-xs text-gray-500">{s.phone || s.email || "–"}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {s.classes.map((c: string) => (
                  <span
                    key={c}
                    className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-lg flex items-center gap-1"
                  >
                    <GraduationCap className="w-3 h-3" />
                    {c.length > 20 ? c.slice(0, 18) + "…" : c}
                  </span>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between text-xs text-gray-500">
                <span>{s.classes.length} lớp</span>
                <Badge variant="success">Đang học</Badge>
              </div>
            </Card>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-400">
              <p>{students.length === 0 ? "Chưa có học viên nào trong lớp của bạn" : "Không tìm thấy học viên"}</p>
            </div>
          )}
        </div>
      )}
    </PageWrapper>
  );
}
