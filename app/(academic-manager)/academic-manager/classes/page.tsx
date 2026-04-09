"use client";
import PageWrapper from "@/components/layouts/PageWrapper";
import { Card } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { createBrowserClient } from "@/lib/supabase/client";
import { BookOpen, Calendar, CheckCircle, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

interface AssignedClass {
  id: string;
  name: string;
  schedule: string | null;
  total_sessions: number;
  sessions_done: number;
  level_out: string | null;
  status: string | null;
  teacher_name: string | null;
  student_count: number;
}

interface AttendanceRow {
  class_name: string | null;
  session_ref: string | null;
}

function statusVariant(status: string | null): "success" | "info" | "warning" | "default" {
  if (status === "active") return "success";
  if (status === "upcoming") return "info";
  if (status === "completed") return "warning";
  return "default";
}

function statusLabel(status: string | null): string {
  if (status === "active") return "Đang học";
  if (status === "upcoming") return "Sắp khai giảng";
  if (status === "completed") return "Đã kết thúc";
  return status || "–";
}

export default function AcademicManagerClassesPage() {
  const [classes, setClasses] = useState<AssignedClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setError(null);
        const supabase = createBrowserClient();

        // Get my assigned class IDs
        const { data: assignments, error: assignErr } = await supabase
          .from("academic_manager_class_assignments")
          .select("class_id");

        if (assignErr) {
          // Table likely doesn't exist yet (migration not run)
          if (assignErr.message.includes("does not exist") || assignErr.code === "42P01") {
            setError("Hệ thống đang cập nhật. Vui lòng liên hệ admin để chạy migration database.");
          } else {
            setError(assignErr.message);
          }
          setLoading(false);
          return;
        }

        if (!assignments || assignments.length === 0) {
          setLoading(false);
          return;
        }

        const classIds = assignments.map((a: { class_id: string }) => a.class_id);

        const { data: classData, error: classErr } = await supabase
          .from("classes")
          .select("id, name, schedule, total_sessions, sessions_done, level_out, status, teacher_id, teacher:profiles!teacher_id(full_name)")
          .in("id", classIds)
          .order("name");

        if (classErr) throw new Error(classErr.message);
        if (!classData) { setLoading(false); return; }

        // Get enrollment counts separately (avoids PostgREST join issues)
        const enrollmentMap: Record<string, number> = {};
        if (classIds.length > 0) {
          const { data: enrollData } = await supabase
            .from("enrollments")
            .select("class_id")
            .in("class_id", classIds)
            .eq("status", "active");
          for (const e of (enrollData || []) as { class_id: string }[]) {
            enrollmentMap[e.class_id] = (enrollmentMap[e.class_id] ?? 0) + 1;
          }
        }

        // Derive taught sessions from real attendance records.
        // This is more reliable than classes.sessions_done when admins/teachers
        // mark attendance but the aggregate column was not synced yet.
        const taughtMap: Record<string, number> = {};
        const classNames = classData.map((c: { name: string }) => c.name);
        if (classNames.length > 0) {
          const { data: attendanceData } = await supabase
            .from("session_attendance")
            .select("class_name, session_ref")
            .in("class_name", classNames);

          const seen = new Set<string>();
          for (const row of (attendanceData || []) as AttendanceRow[]) {
            if (!row.class_name || !row.session_ref) continue;
            const key = `${row.class_name}__${row.session_ref}`;
            if (seen.has(key)) continue;
            seen.add(key);
            taughtMap[row.class_name] = (taughtMap[row.class_name] ?? 0) + 1;
          }
        }

        const result: AssignedClass[] = classData.map((c: {
          id: string; name: string; schedule: string | null;
          total_sessions: number; sessions_done: number; level_out: string | null;
          status: string | null; teacher?: { full_name: string | null } | null;
        }) => ({
          id: c.id,
          name: c.name,
          schedule: c.schedule,
          total_sessions: c.total_sessions ?? 0,
          sessions_done: Math.max(c.sessions_done ?? 0, taughtMap[c.name] ?? 0),
          level_out: c.level_out,
          status: c.status,
          teacher_name: (c.teacher as { full_name: string | null } | null)?.full_name ?? null,
          student_count: enrollmentMap[c.id] ?? 0,
        }));

        setClasses(result);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Có lỗi khi tải dữ liệu");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <PageWrapper>
      <div className="page-header">
        <h1 className="page-title">Lớp Của Tôi</h1>
        <p className="page-subtitle">Danh sách lớp học bạn được phân công quản lý</p>
      </div>

      {error && (
        <Card className="p-5 mb-4 bg-red-50 border border-red-200">
          <p className="text-red-700 text-sm font-medium">Lỗi tải danh sách lớp</p>
          <p className="text-red-600 text-sm mt-1">{error}</p>
          <p className="text-red-500 text-xs mt-2">
            Nếu thấy lỗi &quot;does not exist&quot;, bạn cần chạy migration SQL trong Supabase Dashboard → SQL Editor → chạy file
            <code className="bg-red-100 px-1 rounded mx-1">web/supabase/migrations/013_academic_manager.sql</code>
          </p>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !error && classes.length === 0 ? (
        <Card className="p-12 text-center">
          <BookOpen className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500 text-base font-medium">Chưa có lớp nào được phân công cho bạn</p>
          <p className="text-gray-400 text-sm mt-1">Admin sẽ gán lớp học tương ứng cho tài khoản của bạn</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {classes.map(cls => {
            const progress = cls.total_sessions > 0
              ? Math.round((cls.sessions_done / cls.total_sessions) * 100)
              : 0;
            return (
              <Link key={cls.id} href={`/academic-manager/classes/${cls.id}`}>
                <Card className="p-5 hover:shadow-md transition-shadow cursor-pointer h-full flex flex-col gap-4">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-bold text-gray-900 leading-tight truncate">{cls.name}</h3>
                      <p className="text-sm text-gray-500 mt-0.5">{cls.teacher_name || "Chưa có giảng viên"}</p>
                    </div>
                    <Badge variant={statusVariant(cls.status)}>{statusLabel(cls.status)}</Badge>
                  </div>

                  {/* Info row */}
                  <div className="grid grid-cols-2 gap-3 text-xs text-gray-600">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span className="truncate">{cls.schedule || "–"}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span>{cls.student_count} học viên</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span>{cls.sessions_done}/{cls.total_sessions} buổi</span>
                    </div>
                    {cls.level_out && (
                      <div className="flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span className="truncate">{cls.level_out}</span>
                      </div>
                    )}
                  </div>

                  {/* Progress bar */}
                  <div>
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Tiến độ</span>
                      <span className="font-semibold">{progress}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 rounded-full transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </PageWrapper>
  );
}
