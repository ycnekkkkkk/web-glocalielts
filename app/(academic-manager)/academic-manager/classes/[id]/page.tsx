"use client";
import PageWrapper from "@/components/layouts/PageWrapper";
import { Card } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { createBrowserClient } from "@/lib/supabase/client";
import {
  ArrowLeft, BookOpen, Calendar, CheckCircle, Download, FileText, MessageSquare, Pencil, Plus, Star, Upload, Users, Video, WrapText, ZoomIn,
} from "lucide-react";
import Link from "next/link";
import { use, useEffect, useState } from "react";
import toast from "react-hot-toast";
import type { ClassEvaluationRow, MakeupStatusRow, MonthlyStudentEvaluation, PeriodicTest, PeriodicTestSubmission, Session } from "@/types";

type TabId = "overview" | "attendance" | "students" | "sessions" | "evaluations" | "makeup" | "tests";

interface ClassDetail {
  id: string;
  name: string;
  schedule: string | null;
  total_sessions: number;
  sessions_done: number;
  level_out: string | null;
  level_in: string | null;
  status: string | null;
  teacher_name: string | null;
  student_count: number;
  start_date: string | null;
  end_date: string | null;
}

interface EnrolledStudent {
  enrollment_id: string;
  student_id: string;
  student_code: string | null;
  full_name: string;
  email: string | null;
  phone: string | null;
}

interface AvailableStudent {
  id: string;
  student_code: string | null;
  full_name: string;
  email: string | null;
}

interface AttendanceRow {
  student_id?: string | null;
  student_name?: string | null;
  attendance_status?: "on_time" | "late" | "absent" | null;
  class_name: string | null;
  session_ref: string | null;
}

interface AttendanceReportRow {
  student_id: string | null;
  student_code: string | null;
  student_name: string;
  email: string | null;
  phone: string | null;
  on_time: number;
  late: number;
  absent: number;
  present_total: number;
  makeup_assigned: number;
  makeup_completed: number;
  taught_sessions: number;
}

function StarDisplay({ value }: { value: number | null }) {
  if (!value) return <span className="text-gray-400 text-xs">–</span>;
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <Star key={n} className={`w-3.5 h-3.5 ${n <= value ? "text-amber-400 fill-current" : "text-gray-200"}`} />
      ))}
      <span className="text-xs font-semibold text-amber-600 ml-1">{value}</span>
    </span>
  );
}

export default function AcademicManagerClassDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: classId } = use(params);

  const [loading, setLoading] = useState(true);
  const [classDetail, setClassDetail] = useState<ClassDetail | null>(null);
  const [tab, setTab] = useState<TabId>("overview");

  const [evaluations, setEvaluations] = useState<ClassEvaluationRow[]>([]);
  const [evalLoading, setEvalLoading] = useState(false);

  const [makeupRows, setMakeupRows] = useState<MakeupStatusRow[]>([]);
  const [makeupLoading, setMakeupLoading] = useState(false);
  const [attendanceReportRows, setAttendanceReportRows] = useState<AttendanceReportRow[]>([]);
  const [attendanceReportLoading, setAttendanceReportLoading] = useState(false);

  // Monthly evaluations state
  const [monthlyEvals, setMonthlyEvals] = useState<MonthlyStudentEvaluation[]>([]);
  const [monthlyEvalsLoading, setMonthlyEvalsLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  // Periodic tests state
  const [periodicTests, setPeriodicTests] = useState<PeriodicTest[]>([]);
  const [testsLoading, setTestsLoading] = useState(false);
  const [selectedTest, setSelectedTest] = useState<PeriodicTest | null>(null);
  const [testSubmissions, setTestSubmissions] = useState<PeriodicTestSubmission[]>([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [showCreateTestModal, setShowCreateTestModal] = useState(false);
  const [creatingTest, setCreatingTest] = useState(false);
  const [newTestForm, setNewTestForm] = useState({
    test_name: "",
    test_date: "",
    test_type: "regular",
    max_score: 100,
    passing_score: 50,
    description: "",
    test_material_link: "",
    zoom_link: "",
  });

  // Sessions state (for Sessions tab)
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [editingZoomId, setEditingZoomId] = useState<number | null>(null);
  const [editingZoomValue, setEditingZoomValue] = useState("");

  // Enrolled students state
  const [enrolledStudents, setEnrolledStudents] = useState<EnrolledStudent[]>([]);
  const [availableStudents, setAvailableStudents] = useState<AvailableStudent[]>([]);
  const [enrolledLoading, setEnrolledLoading] = useState(false);
  const [studentsTabLoaded, setStudentsTabLoaded] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");
  const [addSearch, setAddSearch] = useState("");
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);

  // Teacher assignment state
  const [allTeachers, setAllTeachers] = useState<{ id: string; full_name: string; email: string | null }[]>([]);
  const [showTeacherModal, setShowTeacherModal] = useState(false);
  const [assigningTeacher, setAssigningTeacher] = useState(false);

  // Load teachers for assignment
  async function loadTeachers() {
    const { data } = await createBrowserClient()
      .from("profiles")
      .select("id, full_name, email")
      .eq("role", "teacher")
      .order("full_name");
    setAllTeachers(data || []);
  }

  async function assignTeacher(teacherId: string) {
    if (!classDetail) return;
    setAssigningTeacher(true);
    try {
      const { error } = await createBrowserClient()
        .from("classes")
        .update({ teacher_id: teacherId })
        .eq("id", classDetail.id);
      if (error) throw error;

      const teacher = allTeachers.find(t => t.id === teacherId);
      setClassDetail(prev => prev ? { ...prev, teacher_name: teacher?.full_name || "–" } : null);
      toast.success("Đã gán giảng viên cho lớp");
      setShowTeacherModal(false);
    } catch (e) {
      toast.error("Lỗi gán giảng viên");
    } finally {
      setAssigningTeacher(false);
    }
  }

  useEffect(() => {
    async function load() {
      const supabase = createBrowserClient();

      const { data: classData } = await supabase
        .from("classes")
        .select("id, name, schedule, total_sessions, sessions_done, level_out, level_in, status, teacher_id, start_date, end_date, teacher:profiles!teacher_id(full_name)")
        .eq("id", classId)
        .maybeSingle();

      if (!classData) { setLoading(false); return; }

      const { count: studentCount } = await supabase
        .from("enrollments")
        .select("id", { count: "exact", head: true })
        .eq("class_id", classId)
        .eq("status", "active");

      const c = classData as {
        id: string; name: string; schedule: string | null;
        total_sessions: number; sessions_done: number;
        level_out: string | null; level_in: string | null;
        status: string | null; start_date: string | null; end_date: string | null;
        teacher?: { full_name: string | null } | null;
      };

      // Derive taught sessions from sessions table (status = 'DONE')
      const { data: sessionData } = await supabase
        .from("sessions")
        .select("status")
        .eq("class_id", classId);

      const doneFromSessionStatus = ((sessionData || []) as { status: string | null }[])
        .filter(s => s.status === "DONE").length;

      // Lấy sessions_done từ bảng classes (đã được cập nhật thủ công)
      // Hoặc dùng số buổi đã hoàn thành từ sessions
      const sessionsDone = Math.max(c.sessions_done ?? 0, doneFromSessionStatus);

      setClassDetail({
        id: c.id,
        name: c.name,
        schedule: c.schedule,
        total_sessions: c.total_sessions ?? 0,
        sessions_done: sessionsDone,
        level_out: c.level_out,
        level_in: c.level_in,
        status: c.status,
        teacher_name: (c.teacher as { full_name: string | null } | null)?.full_name ?? null,
        student_count: studentCount ?? 0,
        start_date: c.start_date,
        end_date: c.end_date,
      });
      setLoading(false);
    }
    load().catch(console.error);
  }, [classId]);

  async function loadEvaluations() {
    if (!classDetail) return;
    setEvalLoading(true);
    const { data, error } = await createBrowserClient().rpc("get_class_evaluations", { p_class_name: classDetail.name });
    if (!error) setEvaluations((data as ClassEvaluationRow[]) || []);
    setEvalLoading(false);
  }

  async function loadMonthlyEvaluations() {
    if (!classDetail) return;
    setMonthlyEvalsLoading(true);
    try {
      const { data, error } = await createBrowserClient()
        .rpc("get_monthly_evaluations", { p_class_id: classDetail.id });
      if (!error) setMonthlyEvals((data as MonthlyStudentEvaluation[]) || []);
    } catch (e) { console.error(e); }
    setMonthlyEvalsLoading(false);
  }

  async function loadTests() {
    if (!classDetail) return;
    setTestsLoading(true);
    try {
      const { data, error } = await createBrowserClient()
        .rpc("get_periodic_tests", { p_class_id: classDetail.id });
      if (!error) setPeriodicTests((data as PeriodicTest[]) || []);
    } catch (e) { console.error(e); }
    setTestsLoading(false);
  }

  async function createTest() {
    if (!classDetail || !newTestForm.test_name.trim()) {
      toast.error("Vui lòng nhập tên kỳ thi");
      return;
    }
    setCreatingTest(true);
    try {
      const { error } = await createBrowserClient()
        .from("periodic_tests")
        .insert({
          class_id: classDetail.id,
          test_name: newTestForm.test_name.trim(),
          test_date: newTestForm.test_date || null,
          test_type: newTestForm.test_type,
          max_score: newTestForm.max_score,
          passing_score: newTestForm.passing_score,
          description: newTestForm.description || null,
          test_material_link: newTestForm.test_material_link || null,
          zoom_link: newTestForm.zoom_link || null,
          created_by: (await createBrowserClient().auth.getUser()).data.user?.id,
        });
      if (error) throw error;
      toast.success("Đã tạo kỳ thi mới");
      setShowCreateTestModal(false);
      setNewTestForm({
        test_name: "",
        test_date: "",
        test_type: "regular",
        max_score: 100,
        passing_score: 50,
        description: "",
        test_material_link: "",
        zoom_link: "",
      });
      await loadTests();
    } catch (e) {
      toast.error("Lỗi tạo kỳ thi");
    } finally {
      setCreatingTest(false);
    }
  }

  async function loadTestSubmissions(testId: string) {
    if (!classDetail) return;
    setSubmissionsLoading(true);
    try {
      const { data, error } = await createBrowserClient()
        .rpc("get_test_submissions", { p_test_id: testId });
      if (!error) setTestSubmissions((data as PeriodicTestSubmission[]) || []);
    } catch (e) { console.error(e); }
    setSubmissionsLoading(false);
  }

  // ── Sessions functions ──────────────────────────────────────
  async function loadSessions() {
    setSessionsLoading(true);
    try {
      const { data } = await createBrowserClient()
        .from("sessions")
        .select("*")
        .eq("class_id", classId)
        .order("session_no");
      setSessions((data as Session[]) || []);
    } catch (e) { console.error(e); }
    setSessionsLoading(false);
  }

  function startEditZoom(s: Session) {
    setEditingZoomId(s.id as number);
    setEditingZoomValue(s.zoom_link || "");
  }

  async function saveZoom(sessionId: number) {
    const newLink = editingZoomValue.trim();
    setEditingZoomId(null);
    const old = sessions.find((s) => s.id === sessionId)?.zoom_link || "";
    if (newLink === old) return;
    setSessions((prev) => prev.map((s) => s.id === sessionId ? { ...s, zoom_link: newLink || null } : s));
    const { error } = await createBrowserClient()
      .from("sessions")
      .update({ zoom_link: newLink || null })
      .eq("id", sessionId);
    if (error) {
      toast.error("Lỗi lưu link học");
      setSessions((prev) => prev.map((s) => s.id === sessionId ? { ...s, zoom_link: old || null } : s));
    }
  }

  async function loadEnrolledStudents() {
    if (!classDetail) return;
    setEnrolledLoading(true);
    try {
      const supabase = createBrowserClient();
      const [enrollRes, allRes] = await Promise.all([
        supabase
          .from("enrollments")
          .select("id, student_id, students:students!inner(id, student_code, full_name, email, phone)")
          .eq("class_id", classDetail.id)
          .eq("status", "active"),
        supabase.from("students").select("id, student_code, full_name, email").order("full_name"),
      ]);

      const enrolled: EnrolledStudent[] = ((enrollRes.data || []) as {
        id: string; student_id: string;
        students: { id: string; student_code?: string | null; full_name: string; email: string | null; phone: string | null } | null;
      }[]).map(e => ({
        enrollment_id: e.id,
        student_id: e.student_id,
        student_code: e.students?.student_code ?? null,
        full_name: e.students?.full_name ?? "",
        email: e.students?.email ?? null,
        phone: e.students?.phone ?? null,
      }));

      const enrolledIds = new Set(enrolled.map(e => e.student_id));
      const available: AvailableStudent[] = ((allRes.data || []) as AvailableStudent[])
        .filter(s => !enrolledIds.has(s.id));

      setEnrolledStudents(enrolled);
      setAvailableStudents(available);
      setStudentsTabLoaded(true);
    } catch (e) { console.error(e); }
    setEnrolledLoading(false);
  }

  async function removeStudent(enrollmentId: string) {
    setRemovingId(enrollmentId);
    const { error } = await createBrowserClient()
      .from("enrollments")
      .delete()
      .eq("id", enrollmentId);
    if (error) { toast.error("Lỗi xóa học viên"); setRemovingId(null); return; }
    setEnrolledStudents(prev => prev.filter(e => e.enrollment_id !== enrollmentId));
    const removed = enrolledStudents.find(e => e.enrollment_id === enrollmentId);
    if (removed) {
      setAvailableStudents(prev => [...prev, {
        id: removed.student_id,
        student_code: removed.student_code,
        full_name: removed.full_name,
        email: removed.email,
      }].sort((a, b) => a.full_name.localeCompare(b.full_name, "vi")));
    }
    toast.success("Đã xóa học viên khỏi lớp");
    setRemovingId(null);
  }

  async function addStudent(student: AvailableStudent) {
    if (!classDetail) return;
    setAddingId(student.id);
    const { error } = await createBrowserClient()
      .from("enrollments")
      .insert({ class_id: classDetail.id, student_id: student.id, status: "active" });
    if (error) {
      toast.error(error.message.includes("duplicate") ? "Học viên đã ở trong lớp" : "Lỗi thêm học viên");
      setAddingId(null);
      return;
    }
    setEnrolledStudents(prev => [...prev, {
      enrollment_id: "",
      student_id: student.id,
      student_code: student.student_code,
      full_name: student.full_name,
      email: student.email,
      phone: null,
    }]);
    setAvailableStudents(prev => prev.filter(s => s.id !== student.id));
    toast.success(`Đã thêm ${student.full_name} vào lớp`);
    setAddingId(null);
  }

  async function loadMakeup() {
    if (!classDetail) return;
    setMakeupLoading(true);
    const { data, error } = await createBrowserClient().rpc("get_makeup_status", { p_class_name: classDetail.name });
    if (!error) setMakeupRows((data as MakeupStatusRow[]) || []);
    setMakeupLoading(false);
  }

  async function loadAttendanceReport() {
    if (!classDetail) return;
    setAttendanceReportLoading(true);
    const supabase = createBrowserClient();

    const [{ data: enrollmentsData }, { data: attendanceData }, { data: classSessions }] = await Promise.all([
      supabase
        .from("enrollments")
        .select("student_id, students:students!inner(id, student_code, full_name, email, phone)")
        .eq("class_id", classId)
        .eq("status", "active"),
      supabase
        .from("session_attendance")
        .select("student_id, student_name, attendance_status, class_name, session_ref")
        .eq("class_name", classDetail.name),
      supabase
        .from("sessions")
        .select("class_name, session_no, session_date, status")
        .eq("class_id", classId),
    ]);

    type EnrollmentLite = {
      student_id: string | null;
      students: {
        id: string;
        student_code: string | null;
        full_name: string;
        email: string | null;
        phone: string | null;
      } | null;
    };
    const enrolled = (enrollmentsData || []) as EnrollmentLite[];
    const rowsByKey = new Map<string, AttendanceReportRow>();
    const studentIdByName = new Map<string, string>();

    for (const e of enrolled) {
      if (!e.students) continue;
      const key = e.students.id;
      rowsByKey.set(key, {
        student_id: e.students.id,
        student_code: e.students.student_code,
        student_name: e.students.full_name,
        email: e.students.email,
        phone: e.students.phone,
        on_time: 0,
        late: 0,
        absent: 0,
        present_total: 0,
        makeup_assigned: 0,
        makeup_completed: 0,
        taught_sessions: 0,
      });
      studentIdByName.set((e.students.full_name || "").trim().toLowerCase(), e.students.id);
    }

    const attendanceRows = (attendanceData || []) as AttendanceRow[];
    const uniqueAttendanceKeys = new Set<string>();
    const taughtSessionSet = new Set<string>();
    for (const row of attendanceRows) {
      if (!row.session_ref) continue;
      taughtSessionSet.add(row.session_ref);

      const resolvedStudentId =
        (row.student_id && rowsByKey.has(row.student_id) ? row.student_id : null)
        || (row.student_name ? studentIdByName.get(row.student_name.trim().toLowerCase()) || null : null);
      if (!resolvedStudentId) continue;
      const status = row.attendance_status;
      if (!status) continue;

      const dedupeKey = `${resolvedStudentId}__${row.session_ref}`;
      if (uniqueAttendanceKeys.has(dedupeKey)) continue;
      uniqueAttendanceKeys.add(dedupeKey);

      const target = rowsByKey.get(resolvedStudentId);
      if (!target) continue;
      if (status === "on_time") target.on_time += 1;
      if (status === "late") target.late += 1;
      if (status === "absent") target.absent += 1;
      target.present_total = target.on_time + target.late;
    }

    const classSessionRows = (classSessions || []) as { class_name: string; session_no: number | null; session_date: string | null; status: string | null }[];
    const classSessionRefsHash = classSessionRows
      .filter((s) => s.class_name && s.session_no != null && s.session_date)
      .map((s) => `${s.class_name}#${s.session_no}#${s.session_date}`);
    const classSessionRefsLegacy = classSessionRows
      .filter((s) => s.class_name && s.session_no != null && s.session_date)
      .map((s) => `${s.class_name}__${s.session_no}__${s.session_date}`);
    const classSessionRefs = Array.from(new Set([...classSessionRefsHash, ...classSessionRefsLegacy]));

    const { data: makeupRowsDataRaw } = classSessionRefs.length > 0
      ? await supabase
        .from("attendance_makeup")
        .select("student_name,target_session_ref,is_completed,session_ref")
        .in("session_ref", classSessionRefs)
      : { data: [] as null | { student_name: string; target_session_ref: string | null; is_completed: boolean | null; session_ref: string }[] };

    const makeupRowsData = (makeupRowsDataRaw || []) as { student_name: string; target_session_ref: string | null; is_completed: boolean | null; session_ref: string }[];
    const targetRefs = Array.from(new Set(makeupRowsData.map((mk) => mk.target_session_ref).filter((ref): ref is string => !!ref)));
    const targetSessionStatusByRef: Record<string, string> = {};
    classSessionRows.forEach((s) => {
      const keyHash = `${s.class_name}#${s.session_no ?? ""}#${s.session_date ?? ""}`;
      const keyLegacy = `${s.class_name}__${s.session_no ?? ""}__${s.session_date ?? ""}`;
      targetSessionStatusByRef[keyHash] = s.status || "";
      targetSessionStatusByRef[keyLegacy] = s.status || "";
    });
    if (targetRefs.length > 0) {
      const parseRef = (ref: string): { className: string; sessionNo: number; sessionDate: string } | null => {
        const hashParts = ref.split("#");
        if (hashParts.length === 3) {
          const no = Number(hashParts[1]);
          if (!Number.isFinite(no)) return null;
          return { className: hashParts[0], sessionNo: no, sessionDate: hashParts[2] };
        }
        const legacyParts = ref.split("__");
        if (legacyParts.length === 3) {
          const no = Number(legacyParts[1]);
          if (!Number.isFinite(no)) return null;
          return { className: legacyParts[0], sessionNo: no, sessionDate: legacyParts[2] };
        }
        return null;
      };
      const { data: targetSessions } = await supabase
        .from("sessions")
        .select("class_name, session_no, session_date, status")
        .or(targetRefs.map((ref) => {
          const parsed = parseRef(ref);
          if (!parsed) return "and(class_name.eq.\"\",session_no.eq.-1,session_date.eq.\"\")";
          const escapedClass = parsed.className.replace(/"/g, '\\"');
          const escapedDate = parsed.sessionDate.replace(/"/g, '\\"');
          return `and(class_name.eq."${escapedClass}",session_no.eq.${parsed.sessionNo},session_date.eq."${escapedDate}")`;
        }).join(","));

      ((targetSessions || []) as { class_name: string; session_no: number | null; session_date: string | null; status: string | null }[])
        .forEach((s) => {
          const keyHash = `${s.class_name}#${s.session_no ?? ""}#${s.session_date ?? ""}`;
          const keyLegacy = `${s.class_name}__${s.session_no ?? ""}__${s.session_date ?? ""}`;
          targetSessionStatusByRef[keyHash] = s.status || "";
          targetSessionStatusByRef[keyLegacy] = s.status || "";
        });
    }

    for (const mk of makeupRowsData) {
      const studentId = studentIdByName.get((mk.student_name || "").trim().toLowerCase());
      if (!studentId) continue;
      const target = rowsByKey.get(studentId);
      if (!target) continue;
      target.makeup_assigned += 1;
      const isCompleted = !!mk.is_completed || (!!mk.target_session_ref && targetSessionStatusByRef[mk.target_session_ref] === "DONE");
      if (isCompleted) target.makeup_completed += 1;
    }

    const taughtSessions = Math.max(taughtSessionSet.size, classDetail.sessions_done || 0);
    const sortedRows = Array.from(rowsByKey.values())
      .map((r) => {
        const convertedAbsences = Math.min(r.absent, r.makeup_completed);
        const presentWithMakeup = r.on_time + r.late + convertedAbsences;
        return {
          ...r,
          taught_sessions: taughtSessions,
          present_total: presentWithMakeup,
        };
      })
      .sort((a, b) => a.student_name.localeCompare(b.student_name, "vi"));

    setAttendanceReportRows(sortedRows);
    setAttendanceReportLoading(false);
  }

  async function exportAttendanceCsv() {
    if (!classDetail || attendanceReportRows.length === 0) return;

    let exportEvaluations = evaluations;
    if (exportEvaluations.length === 0) {
      const { data, error } = await createBrowserClient().rpc("get_class_evaluations", { p_class_name: classDetail.name });
      if (!error) exportEvaluations = (data as ClassEvaluationRow[]) || [];
    }

    const exportClassEvals = exportEvaluations.filter(e => e.eval_type === "class_eval");
    const exportTeacherEvals = exportEvaluations.filter(e => e.eval_type === "teacher_eval");
    const exportAvgClassRating = exportClassEvals.length > 0
      ? (exportClassEvals.reduce((s, e) => s + (e.rating ?? 0), 0) / exportClassEvals.length).toFixed(2)
      : "0";
    const exportAvgTeacherRating = exportTeacherEvals.length > 0
      ? (exportTeacherEvals.reduce((s, e) => s + (e.rating ?? 0), 0) / exportTeacherEvals.length).toFixed(2)
      : "0";

    const escapeCsv = (value: string | number | null | undefined) => {
      const raw = value == null ? "" : String(value);
      if (raw.includes(",") || raw.includes('"') || raw.includes("\n")) {
        return `"${raw.replace(/"/g, '""')}"`;
      }
      return raw;
    };

    const headers = [
      "Ma hoc vien",
      "Hoc vien",
      "Email",
      "So dien thoai",
      "So buoi dung gio",
      "So buoi di muon",
      "So buoi vang",
      "Tong buoi di hoc",
      "Vang da duoc xep hoc bu",
      "Vang da hoc bu hoan thanh",
      "Tong buoi da diem danh",
      "Ti le tham du (%)",
    ];
    const lines: string[] = [];

    const reportInfoRows: [string, string | number][] = [
      ["Ten lop", classDetail.name],
      ["Giao vien", classDetail.teacher_name || "–"],
      ["Lich hoc", classDetail.schedule || "–"],
      ["Ngay khai giang", classDetail.start_date || "–"],
      ["Ngay ket thuc", classDetail.end_date || "–"],
      ["Tong so hoc vien", classDetail.student_count],
      ["Tien do buoi hoc", `${classDetail.sessions_done}/${classDetail.total_sessions}`],
      ["Trang thai lop", classDetail.status || "–"],
      ["Danh gia lop TB (GV danh gia)", exportAvgClassRating],
      ["So luot GV danh gia lop", exportClassEvals.length],
      ["Danh gia GV TB (HV danh gia)", exportAvgTeacherRating],
      ["So luot HV danh gia GV", exportTeacherEvals.length],
      ["Tong luot dung gio", attendanceSummary.on_time],
      ["Tong luot di muon", attendanceSummary.late],
      ["Tong luot vang", attendanceSummary.absent],
      ["Tong luot di hoc (co tinh hoc bu hoan thanh)", attendanceSummary.present],
    ];
    lines.push("BAO CAO HOC VU TONG HOP");
    lines.push("Chi tiet,Gia tri");
    for (const [label, value] of reportInfoRows) {
      lines.push(`${escapeCsv(label)},${escapeCsv(value)}`);
    }
    lines.push("");

    lines.push("THONG KE DANH GIA THEO BUOI");
    lines.push("Loai,Buoi,Ngay,Nguoi danh gia,Hoc vien,So sao,Nhan xet");
    for (const e of exportEvaluations) {
      lines.push([
        escapeCsv(e.eval_type === "class_eval" ? "GV danh gia lop" : "HV danh gia GV"),
        escapeCsv(e.session_no ?? ""),
        escapeCsv(e.session_date ?? ""),
        escapeCsv(e.rater_name ?? ""),
        escapeCsv(e.student_name ?? ""),
        escapeCsv(e.rating ?? ""),
        escapeCsv(e.comment ?? ""),
      ].join(","));
    }
    if (exportEvaluations.length === 0) {
      lines.push("Khong co du lieu danh gia,,,,,,");
    }
    lines.push("");

    lines.push("CHI TIET DIEM DANH THEO HOC VIEN");
    lines.push(headers.join(","));

    for (const row of attendanceReportRows) {
      const taught = row.taught_sessions || 0;
      const attendanceRate = taught > 0 ? Math.round((row.present_total / taught) * 100) : 0;
      lines.push([
        escapeCsv(row.student_code),
        escapeCsv(row.student_name),
        escapeCsv(row.email),
        escapeCsv(row.phone),
        row.on_time,
        row.late,
        row.absent,
        row.present_total,
        row.makeup_assigned,
        row.makeup_completed,
        taught,
        attendanceRate,
      ].join(","));
    }

    const csvContent = `\uFEFF${lines.join("\n")}`;
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    const safeClassName = classDetail.name.replace(/[^\w\-]+/g, "_");
    anchor.href = url;
    anchor.download = `bao_cao_diem_danh_${safeClassName}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }

  // Preload makeup data so the top stats card is up-to-date
  // even before user opens the "Học Bù" tab.
  useEffect(() => {
    if (!classDetail) return;
    loadMakeup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classDetail?.id]);

  function switchTab(t: TabId) {
    setTab(t);
    if (t === "attendance" && attendanceReportRows.length === 0) loadAttendanceReport();
    if (t === "evaluations" && evaluations.length === 0) loadEvaluations();
    if (t === "makeup" && makeupRows.length === 0) loadMakeup();
    if (t === "tests") loadTests();
    if (t === "students" && !studentsTabLoaded) loadEnrolledStudents();
    if (t === "sessions") loadSessions();
  }

  // Load monthly evaluations when tab is evaluations
  useEffect(() => {
    if (tab === "evaluations" && classDetail) loadMonthlyEvaluations();
  }, [tab, classDetail, selectedMonth]);

  // Load periodic tests when tab is tests
  useEffect(() => {
    if (tab === "tests" && classDetail) loadTests();
  }, [tab, classDetail]);

  // Load test submissions when a test is selected
  useEffect(() => {
    if (selectedTest) loadTestSubmissions(selectedTest.id);
  }, [selectedTest]);

  if (loading) return (
    <PageWrapper>
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin" />
      </div>
    </PageWrapper>
  );

  if (!classDetail) return (
    <PageWrapper>
      <div className="text-center py-20 text-gray-400">
        <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-30" />
        <p>Không tìm thấy lớp học hoặc bạn không có quyền xem</p>
        <Link href="/academic-manager/classes" className="mt-4 inline-block text-indigo-600 text-sm hover:underline">
          ← Quay lại danh sách
        </Link>
      </div>
    </PageWrapper>
  );

  const progress = (classDetail.total_sessions ?? 0) > 0
    ? Math.round(((classDetail.sessions_done ?? 0) / (classDetail.total_sessions ?? 0)) * 100)
    : 0;

  const classEvals = evaluations.filter(e => e.eval_type === "class_eval");
  const teacherEvals = evaluations.filter(e => e.eval_type === "teacher_eval");
  const avgClassRating = classEvals.length > 0
    ? (classEvals.reduce((s, e) => s + (e.rating ?? 0), 0) / classEvals.length).toFixed(1)
    : null;
  const avgTeacherRating = teacherEvals.length > 0
    ? (teacherEvals.reduce((s, e) => s + (e.rating ?? 0), 0) / teacherEvals.length).toFixed(1)
    : null;

  const makeupDone = makeupRows.filter(r => r.has_makeup).length;
  const makeupTodo = makeupRows.filter(r => !r.has_makeup).length;
  const attendanceSummary = attendanceReportRows.reduce(
    (acc, row) => {
      acc.on_time += row.on_time;
      acc.late += row.late;
      acc.absent += row.absent;
      acc.present += row.present_total;
      return acc;
    },
    { on_time: 0, late: 0, absent: 0, present: 0 },
  );

  const tabItems: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: "overview",    label: "Tổng Quan",   icon: <BookOpen className="w-4 h-4" /> },
    { id: "attendance",  label: "Điểm Danh",   icon: <CheckCircle className="w-4 h-4" /> },
    { id: "students",   label: "Học Viên",    icon: <Users className="w-4 h-4" /> },
    { id: "sessions",   label: "Buổi Học",    icon: <Calendar className="w-4 h-4" /> },
    { id: "evaluations", label: "Đánh Giá",    icon: <Star className="w-4 h-4" /> },
    { id: "makeup",     label: "Học Bù",      icon: <WrapText className="w-4 h-4" /> },
    { id: "tests",      label: "Kiểm Tra",    icon: <FileText className="w-4 h-4" /> },
  ];

  return (
    <PageWrapper>
      <div className="mb-4">
        <Link href="/academic-manager/classes">
          <Button variant="ghost" size="sm" icon={<ArrowLeft className="w-4 h-4" />}>Danh sách lớp</Button>
        </Link>
      </div>

      <div className="page-header">
        <h1 className="page-title">{classDetail.name}</h1>
        <p className="page-subtitle">
          Giảng viên: {classDetail.teacher_name || "–"} · Lịch: {classDetail.schedule || "–"}
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <Card className="p-4 flex items-center gap-3">
          <div className="w-9 h-9 bg-indigo-100 rounded-xl flex items-center justify-center">
            <Users className="w-4 h-4 text-indigo-600" />
          </div>
          <div>
            <p className="text-xl font-bold text-gray-900">{classDetail.student_count}</p>
            <p className="text-xs text-gray-500">Học viên</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="w-9 h-9 bg-emerald-100 rounded-xl flex items-center justify-center">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <p className="text-xl font-bold text-gray-900">{classDetail.sessions_done ?? 0}/{classDetail.total_sessions ?? 0}</p>
            <p className="text-xs text-gray-500">Buổi đã học</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center">
            <Star className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <p className="text-xl font-bold text-gray-900">{progress}%</p>
            <p className="text-xs text-gray-500">Tiến độ</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="w-9 h-9 bg-red-100 rounded-xl flex items-center justify-center">
            <WrapText className="w-4 h-4 text-red-500" />
          </div>
          <div>
            <p className="text-xl font-bold text-gray-900">
              {makeupLoading ? "..." : makeupTodo}
            </p>
            <p className="text-xs text-gray-500">Chưa xếp bù</p>
          </div>
        </Card>
      </div>

      {/* Tab bar */}
      <div className="flex flex-col gap-3 mb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-2xl w-fit">
          {tabItems.map(t => (
            <button
              key={t.id}
              onClick={() => switchTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                tab === t.id ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {t.icon}{t.label}
            </button>
          ))}
        </div>
        <Button
          size="sm"
          variant="outline"
          icon={<Download className="w-4 h-4" />}
          onClick={() => { void exportAttendanceCsv(); }}
          disabled={attendanceReportRows.length === 0}
          className="w-fit"
        >
          Xuất báo cáo CSV
        </Button>
      </div>

      {/* ── Tab: Tổng Quan ── */}
      {tab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Class info */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="section-title">Thông Tin Lớp</h3>
              <Button size="sm" variant="outline" onClick={() => { loadTeachers(); setShowTeacherModal(true); }}>
                Đổi Giảng Viên
              </Button>
            </div>
            <dl className="divide-y divide-gray-100">
              {[
                { label: "Tên lớp", value: classDetail.name },
                { label: "Giảng viên", value: classDetail.teacher_name || "–" },
                { label: "Lịch học", value: classDetail.schedule || "–" },
                { label: "Tổng số buổi", value: `${classDetail.total_sessions} buổi` },
                { label: "Đã dạy", value: `${classDetail.sessions_done} buổi` },
                { label: "Mục tiêu đầu ra", value: classDetail.level_out || "–" },
                { label: "Đầu vào", value: classDetail.level_in || "–" },
                { label: "Ngày khai giảng", value: classDetail.start_date || "–" },
                { label: "Ngày kết thúc", value: classDetail.end_date || "–" },
                { label: "Trạng thái", value: classDetail.status || "–" },
              ].map(({ label, value }) => (
                <div key={label} className="flex py-2.5 gap-4">
                  <dt className="text-sm text-gray-500 w-36 shrink-0">{label}</dt>
                  <dd className="text-sm font-medium text-gray-900">{value}</dd>
                </div>
              ))}
            </dl>
          </Card>

          {/* Progress card */}
          <Card className="p-5 space-y-4">
            <h3 className="section-title">Tiến Độ Khóa Học</h3>
            <div className="flex flex-col items-center justify-center py-6 gap-4">
              {/* Circular progress */}
              <div className="relative w-32 h-32">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="#e5e7eb" strokeWidth="10" />
                  <circle
                    cx="50" cy="50" r="42" fill="none" stroke="#6366f1" strokeWidth="10"
                    strokeDasharray={`${2 * Math.PI * 42}`}
                    strokeDashoffset={`${2 * Math.PI * 42 * (1 - progress / 100)}`}
                    strokeLinecap="round"
                    className="transition-all duration-500"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-gray-900">{progress}%</span>
                  <span className="text-xs text-gray-500">Hoàn thành</span>
                </div>
              </div>
              <div className="text-center">
                <p className="text-gray-600 text-sm">
                  <span className="font-semibold text-gray-900">{classDetail.sessions_done ?? 0}</span>
                  <span className="text-gray-400"> / </span>
                  <span className="font-semibold text-gray-900">{classDetail.total_sessions ?? 0}</span>
                  <span className="text-gray-500"> buổi học</span>
                </p>
                {classDetail.level_out && (
                  <p className="text-sm text-indigo-600 font-medium mt-2">
                    Mục tiêu: {classDetail.level_out}
                  </p>
                )}
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ── Tab: Điểm Danh ── */}
      {tab === "attendance" && (
        <div className="space-y-5">
          <Card className="p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
              <div>
                <h3 className="section-title">Chi Tiết Điểm Danh Học Viên</h3>
                <p className="text-xs text-gray-500 mt-1">Báo cáo theo từng học viên trong toàn bộ lớp học.</p>
              </div>
            </div>

            {attendanceReportLoading ? (
              <div className="flex justify-center py-16">
                <div className="w-8 h-8 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : attendanceReportRows.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <CheckCircle className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Chưa có dữ liệu điểm danh cho lớp này</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  <Card className="p-3">
                    <p className="text-xs text-gray-500">Đúng giờ</p>
                    <p className="text-lg font-bold text-emerald-600">{attendanceSummary.on_time}</p>
                  </Card>
                  <Card className="p-3">
                    <p className="text-xs text-gray-500">Muộn</p>
                    <p className="text-lg font-bold text-amber-600">{attendanceSummary.late}</p>
                  </Card>
                  <Card className="p-3">
                    <p className="text-xs text-gray-500">Vắng</p>
                    <p className="text-lg font-bold text-red-600">{attendanceSummary.absent}</p>
                  </Card>
                  <Card className="p-3">
                    <p className="text-xs text-gray-500">Tổng lượt đi học</p>
                    <p className="text-lg font-bold text-indigo-600">{attendanceSummary.present}</p>
                  </Card>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-gray-500 border-b border-gray-100">
                        <th className="text-left py-2 pr-3 font-medium">Mã HV</th>
                        <th className="text-left py-2 pr-3 font-medium">Học viên</th>
                        <th className="text-left py-2 pr-3 font-medium">Đúng giờ</th>
                        <th className="text-left py-2 pr-3 font-medium">Muộn</th>
                        <th className="text-left py-2 pr-3 font-medium">Vắng</th>
                        <th className="text-left py-2 pr-3 font-medium">Đã học bù</th>
                        <th className="text-left py-2 pr-3 font-medium">Đi học</th>
                        <th className="text-left py-2 pr-3 font-medium">Tỷ lệ</th>
                        <th className="text-left py-2 font-medium">Liên hệ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {attendanceReportRows.map((row) => {
                        const rate = row.taught_sessions > 0
                          ? Math.round((row.present_total / row.taught_sessions) * 100)
                          : 0;
                        return (
                          <tr key={row.student_id || row.student_name} className="hover:bg-gray-50">
                            <td className="py-2.5 pr-3 text-gray-600">{row.student_code || "–"}</td>
                            <td className="py-2.5 pr-3 font-medium text-gray-800">{row.student_name}</td>
                            <td className="py-2.5 pr-3 text-emerald-600 font-semibold">{row.on_time}</td>
                            <td className="py-2.5 pr-3 text-amber-600 font-semibold">{row.late}</td>
                            <td className="py-2.5 pr-3 text-red-600 font-semibold">{row.absent}</td>
                            <td className="py-2.5 pr-3 text-emerald-700 font-semibold">{row.makeup_completed}</td>
                            <td className="py-2.5 pr-3 text-indigo-700 font-semibold">{row.present_total}</td>
                            <td className="py-2.5 pr-3">
                              <Badge variant={rate >= 80 ? "success" : rate >= 60 ? "warning" : "danger"}>
                                {rate}%
                              </Badge>
                            </td>
                            <td className="py-2.5 text-gray-500">{row.phone || row.email || "–"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </Card>
        </div>
      )}

      {/* ── Tab: Đánh Giá ── */}
      {tab === "evaluations" && (
        <div className="space-y-5">
          {evalLoading ? (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* Summary */}
              {evaluations.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Card className="p-4 flex items-center gap-4">
                    <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                      <Star className="w-5 h-5 text-amber-500" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-0.5">Đánh giá lớp TB</p>
                      <p className="text-xl font-bold text-amber-600">{avgClassRating ?? "–"} <span className="text-sm text-gray-400">/ 5</span></p>
                    </div>
                  </Card>
                  <Card className="p-4 flex items-center gap-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                      <MessageSquare className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-0.5">Đánh giá giảng viên TB</p>
                      <p className="text-xl font-bold text-blue-600">{avgTeacherRating ?? "–"} <span className="text-sm text-gray-400">/ 5</span></p>
                    </div>
                  </Card>
                </div>
              )}

              {/* Class evaluations */}
              {classEvals.length > 0 && (
                <Card className="p-5">
                  <h3 className="section-title mb-4">Đánh Giá Lớp (Giảng viên)</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-xs text-gray-500 border-b border-gray-100">
                          <th className="text-left py-2 pr-4 font-medium">Buổi</th>
                          <th className="text-left py-2 pr-4 font-medium">Ngày</th>
                          <th className="text-left py-2 pr-4 font-medium">Xếp loại</th>
                          <th className="text-left py-2 font-medium">Nhận xét</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {classEvals.map((e, i) => (
                          <tr key={i} className="hover:bg-gray-50">
                            <td className="py-2.5 pr-4 font-semibold text-gray-700">#{e.session_no}</td>
                            <td className="py-2.5 pr-4 text-gray-500">{e.session_date}</td>
                            <td className="py-2.5 pr-4"><StarDisplay value={e.rating} /></td>
                            <td className="py-2.5 text-gray-600">{e.comment || "–"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}

              {/* Teacher evaluations */}
              {teacherEvals.length > 0 && (
                <Card className="p-5">
                  <h3 className="section-title mb-4">Đánh Giá Giảng Viên (Học viên)</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-xs text-gray-500 border-b border-gray-100">
                          <th className="text-left py-2 pr-4 font-medium">Buổi</th>
                          <th className="text-left py-2 pr-4 font-medium">Ngày</th>
                          <th className="text-left py-2 pr-4 font-medium">Học viên</th>
                          <th className="text-left py-2 pr-4 font-medium">Xếp loại</th>
                          <th className="text-left py-2 font-medium">Nhận xét</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {teacherEvals.map((e, i) => (
                          <tr key={i} className="hover:bg-gray-50">
                            <td className="py-2.5 pr-4 font-semibold text-gray-700">#{e.session_no}</td>
                            <td className="py-2.5 pr-4 text-gray-500">{e.session_date}</td>
                            <td className="py-2.5 pr-4 text-gray-700">{e.student_name || e.rater_name || "–"}</td>
                            <td className="py-2.5 pr-4"><StarDisplay value={e.rating} /></td>
                            <td className="py-2.5 text-gray-600">{e.comment || "–"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}

              {/* Monthly student evaluations */}
              {monthlyEvals.length > 0 && (
                <Card className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="section-title">Đánh Giá Cuối Tháng</h3>
                    <select
                      value={selectedMonth}
                      onChange={e => setSelectedMonth(e.target.value)}
                      className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {[...new Set(monthlyEvals.map(e => e.evaluation_month))].sort().reverse().map(month => (
                        <option key={month} value={month}>{month}</option>
                      ))}
                    </select>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-xs text-gray-500 border-b border-gray-100">
                          <th className="text-left py-2 pr-3 font-medium">Học viên</th>
                          <th className="text-left py-2 pr-3 font-medium">Xếp loại</th>
                          <th className="text-left py-2 pr-3 font-medium">% Điểm danh</th>
                          <th className="text-left py-2 pr-3 font-medium">% Bài tập</th>
                          <th className="text-left py-2 pr-3 font-medium">Giữa kỳ</th>
                          <th className="text-left py-2 pr-3 font-medium">Cuối kỳ</th>
                          <th className="text-left py-2 font-medium">Nhận xét</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {monthlyEvals
                          .filter(e => e.evaluation_month === selectedMonth)
                          .map((e, i) => (
                            <tr key={i} className="hover:bg-gray-50">
                              <td className="py-2.5 pr-3 font-medium text-gray-800">{e.student_name || "–"}</td>
                              <td className="py-2.5 pr-3">
                                <Badge variant={e.performance === "excellent" ? "success" : e.performance === "good" ? "info" : e.performance === "average" ? "warning" : "danger"}>
                                  {e.performance === "excellent" ? "Xuất sắc" : e.performance === "good" ? "Tốt" : e.performance === "average" ? "Trung bình" : e.performance === "below_average" ? "Yếu" : "Kém"}
                                </Badge>
                              </td>
                              <td className="py-2.5 pr-3 text-gray-600">{e.attendance_rate !== null ? `${e.attendance_rate}%` : "–"}</td>
                              <td className="py-2.5 pr-3 text-gray-600">{e.homework_score !== null ? `${e.homework_score}%` : "–"}</td>
                              <td className="py-2.5 pr-3 text-gray-600">{e.midterm_score !== null ? `${e.midterm_score}%` : "–"}</td>
                              <td className="py-2.5 pr-3 text-gray-600">{e.final_score !== null ? `${e.final_score}%` : "–"}</td>
                              <td className="py-2.5 text-gray-600 max-w-xs truncate">{e.teacher_comment || e.academic_comment || "–"}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}

              {evaluations.length === 0 && monthlyEvals.length === 0 && (
                <div className="text-center py-16 text-gray-400">
                  <Star className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Chưa có đánh giá nào cho lớp này</p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Tab: Học Bù ── */}
      {tab === "makeup" && (
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="section-title">Danh Sách Vắng & Học Bù</h3>
            <div className="flex gap-3">
              <Badge variant="danger">{makeupTodo} chưa xếp bù</Badge>
              <Badge variant="success">{makeupDone} đã xếp bù</Badge>
            </div>
          </div>

          {makeupLoading ? (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 border-4 border-red-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : makeupRows.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <WrapText className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Không có học viên vắng nào trong lớp này</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-500 border-b border-gray-100">
                    <th className="text-left py-2 pr-3 font-medium">Học viên</th>
                    <th className="text-left py-2 pr-3 font-medium">Buổi</th>
                    <th className="text-left py-2 pr-3 font-medium">Ngày vắng</th>
                    <th className="text-left py-2 pr-3 font-medium">Tình trạng</th>
                    <th className="text-left py-2 pr-3 font-medium">Loại bù</th>
                    <th className="text-left py-2 font-medium">Ghi chú</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {makeupRows.map((r, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="py-2.5 pr-3 font-medium text-gray-800">{r.student_name}</td>
                      <td className="py-2.5 pr-3 text-gray-600">#{r.session_no}</td>
                      <td className="py-2.5 pr-3 text-gray-500">{r.session_date}</td>
                      <td className="py-2.5 pr-3">
                        {r.has_makeup
                          ? <Badge variant="success">Đã xếp bù</Badge>
                          : <Badge variant="danger">Chưa xếp bù</Badge>
                        }
                      </td>
                      <td className="py-2.5 pr-3 text-gray-600 capitalize">
                        {r.makeup_type === "same_class" ? "Cùng lớp" : r.makeup_type === "other_session" ? "Buổi khác" : r.makeup_type || "–"}
                      </td>
                      <td className="py-2.5 text-gray-500 max-w-xs truncate">{r.note || "–"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* ── Tab: Buổi Học ── */}
      {tab === "sessions" && (
        <Card className="overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h3 className="section-title">Danh Sách Buổi Học</h3>
              <p className="text-xs text-gray-500 mt-1">Xem và quản lý link học cho các buổi</p>
            </div>
          </div>

          {sessionsLoading ? (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Chưa có buổi học nào cho lớp này</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wide bg-gray-50">
                    <th className="text-left px-4 py-3">Buổi</th>
                    <th className="text-left px-4 py-3">Ngày</th>
                    <th className="text-left px-4 py-3">Giờ</th>
                    <th className="text-left px-4 py-3">Chủ đề</th>
                    <th className="text-left px-4 py-3">Link học</th>
                    <th className="text-left px-4 py-3">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {sessions.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center text-xs font-bold text-indigo-700">
                          #{s.session_no}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-800">{s.session_date || "–"}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{s.session_time || "–"}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 max-w-48 truncate">{s.topic || "–"}</td>
                      <td className="px-4 py-3">
                        {editingZoomId === s.id ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="url"
                              value={editingZoomValue}
                              onChange={(e) => setEditingZoomValue(e.target.value)}
                              onBlur={() => saveZoom(s.id as number)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") { e.preventDefault(); saveZoom(s.id as number); }
                                if (e.key === "Escape") setEditingZoomId(null);
                              }}
                              className="w-52 rounded-lg border border-indigo-400 bg-white px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              placeholder="https://zoom.us/j/..."
                            />
                          </div>
                        ) : s.zoom_link ? (
                          <div className="flex items-center gap-2">
                            <a href={s.zoom_link} target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 rounded-lg text-xs font-medium transition-colors"
                              title={s.zoom_link}>
                              <Video className="w-3.5 h-3.5" />
                              <span className="truncate max-w-32">{s.zoom_link.includes("zoom") ? "Zoom" : s.zoom_link.includes("meet") ? "Meet" : "Link"}</span>
                            </a>
                            <button
                              type="button"
                              onClick={() => startEditZoom(s)}
                              className="p-1 text-gray-400 hover:text-indigo-600 transition-colors"
                              title="Sửa link"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-300">–</span>
                            <button
                              type="button"
                              onClick={() => startEditZoom(s)}
                              className="p-1 text-gray-300 hover:text-indigo-600 transition-colors"
                              title="Thêm link học"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {s.status === "DONE" ? (
                          <Badge variant="success">Hoàn thành</Badge>
                        ) : s.status === "CANCELLED" ? (
                          <Badge variant="danger">Đã hủy</Badge>
                        ) : (
                          <Badge variant="info">Sắp tới</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* ── Tab: Học Viên ── */}
      {tab === "students" && (
        <div className="space-y-5">
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="section-title">Danh Sách Học Viên</h3>
                <p className="text-xs text-gray-500 mt-1">Quản lý học viên trong lớp học</p>
              </div>
              <Button size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => setShowAddStudentModal(true)}>
                Thêm Học Viên
              </Button>
            </div>

            {enrolledLoading ? (
              <div className="flex justify-center py-16">
                <div className="w-8 h-8 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : enrolledStudents.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Chưa có học viên nào trong lớp</p>
                <Button size="sm" variant="outline" className="mt-3" onClick={() => setShowAddStudentModal(true)}>
                  Thêm học viên đầu tiên
                </Button>
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <input
                    type="text"
                    placeholder="Tìm học viên..."
                    value={studentSearch}
                    onChange={e => setStudentSearch(e.target.value)}
                    className="w-full sm:w-64 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-gray-500 border-b border-gray-100">
                        <th className="text-left py-2 pr-3 font-medium">Mã HV</th>
                        <th className="text-left py-2 pr-3 font-medium">Họ tên</th>
                        <th className="text-left py-2 pr-3 font-medium">Email</th>
                        <th className="text-left py-2 pr-3 font-medium">Điện thoại</th>
                        <th className="text-left py-2 font-medium">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {enrolledStudents
                        .filter(s => studentSearch === "" || s.full_name.toLowerCase().includes(studentSearch.toLowerCase()) || (s.student_code || "").toLowerCase().includes(studentSearch.toLowerCase()))
                        .map((s) => (
                          <tr key={s.student_id} className="hover:bg-gray-50">
                            <td className="py-2.5 pr-3 text-gray-600">{s.student_code || "–"}</td>
                            <td className="py-2.5 pr-4 font-medium text-gray-800">{s.full_name}</td>
                            <td className="py-2.5 pr-3 text-gray-500">{s.email || "–"}</td>
                            <td className="py-2.5 pr-3 text-gray-500">{s.phone || "–"}</td>
                            <td className="py-2.5">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-red-600 hover:text-red-700"
                                disabled={removingId === s.enrollment_id}
                                onClick={() => removeStudent(s.enrollment_id)}
                              >
                                {removingId === s.enrollment_id ? "Đang xóa..." : "Xóa"}
                              </Button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </Card>
        </div>
      )}

      {/* Modal: Thêm Học Viên */}
      {showAddStudentModal && (
        <Modal
          open={true}
          onClose={() => { setShowAddStudentModal(false); setAddSearch(""); }}
          title="Thêm Học Viên Vào Lớp"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Tìm kiếm học viên
              </label>
              <input
                type="text"
                placeholder="Nhập tên hoặc mã học viên..."
                value={addSearch}
                onChange={e => setAddSearch(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                autoFocus
              />
            </div>

            <div className="max-h-80 overflow-y-auto border border-gray-100 rounded-lg">
              {availableStudents.length === 0 ? (
                <div className="p-6 text-center text-gray-400 text-sm">
                  Không có học viên nào để thêm
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {availableStudents
                    .filter(s =>
                      addSearch === "" ||
                      s.full_name.toLowerCase().includes(addSearch.toLowerCase()) ||
                      (s.student_code || "").toLowerCase().includes(addSearch.toLowerCase()) ||
                      (s.email || "").toLowerCase().includes(addSearch.toLowerCase())
                    )
                    .map(s => (
                      <div key={s.id} className="flex items-center justify-between p-3 hover:bg-gray-50">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{s.full_name}</p>
                          <p className="text-xs text-gray-500">
                            {s.student_code && <span className="mr-2">Mã: {s.student_code}</span>}
                            {s.email && <span>Email: {s.email}</span>}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={addingId === s.id}
                          onClick={() => addStudent(s)}
                        >
                          {addingId === s.id ? "Đang thêm..." : "Thêm"}
                        </Button>
                      </div>
                    ))}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="outline" onClick={() => { setShowAddStudentModal(false); setAddSearch(""); }}>
                Đóng
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Gán Giảng Viên */}
      {showTeacherModal && (
        <Modal
          open={true}
          onClose={() => setShowTeacherModal(false)}
          title="Gán Giảng Viên Cho Lớp"
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-600">Chọn giảng viên để phân công dạy lớp {classDetail?.name}</p>

            <div className="max-h-80 overflow-y-auto border border-gray-100 rounded-lg">
              {allTeachers.length === 0 ? (
                <div className="p-6 text-center text-gray-400 text-sm">
                  Không có giảng viên nào trong hệ thống
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {allTeachers.map(t => (
                    <div key={t.id} className="flex items-center justify-between p-3 hover:bg-gray-50">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{t.full_name}</p>
                        <p className="text-xs text-gray-500">{t.email || "–"}</p>
                      </div>
                      <Button
                        size="sm"
                        variant={classDetail?.teacher_name === t.full_name ? "primary" : "outline"}
                        disabled={assigningTeacher}
                        onClick={() => assignTeacher(t.id)}
                      >
                        {classDetail?.teacher_name === t.full_name ? "Đang dạy" : "Chọn"}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="outline" onClick={() => setShowTeacherModal(false)}>
                Đóng
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Tab: Kiểm Tra ── */}
      {tab === "tests" && (
        <div className="space-y-5">
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="section-title">Kỳ Thi Định Kỳ</h3>
                <p className="text-xs text-gray-500 mt-1">Tạo và quản lý bài kiểm tra, xem kết quả học viên</p>
              </div>
              <Button size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => setShowCreateTestModal(true)}>
                Thêm Kỳ Thi
              </Button>
            </div>

            {testsLoading ? (
              <div className="flex justify-center py-16">
                <div className="w-8 h-8 border-4 border-blue-400 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : periodicTests.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Chưa có kỳ thi nào cho lớp này</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {periodicTests.map((test) => (
                  <Card
                    key={test.id}
                    className={`p-4 cursor-pointer transition-all ${selectedTest?.id === test.id ? "ring-2 ring-indigo-500" : "hover:shadow-md"}`}
                    onClick={() => setSelectedTest(test)}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold text-gray-900">{test.test_name}</h4>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {test.test_date ? new Date(test.test_date).toLocaleDateString("vi-VN") : "Chưa có ngày"}
                          {test.test_type && ` · ${test.test_type === "midterm" ? "Giữa kỳ" : test.test_type === "final" ? "Cuối kỳ" : test.test_type === "mock" ? "Thi thử" : test.test_type}`}
                        </p>
                      </div>
                      {test.zoom_link && (
                        <Badge variant="info">
                          <ZoomIn className="w-3 h-3 mr-1" />
                          Zoom
                        </Badge>
                      )}
                    </div>

                    <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <p className="text-gray-400">Điểm tối đa</p>
                        <p className="font-semibold">{test.max_score ?? 100}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Điểm đạt</p>
                        <p className="font-semibold">{test.passing_score ?? 50}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Học viên</p>
                        <p className="font-semibold">{testSubmissions.length}</p>
                      </div>
                    </div>

                    {test.description && (
                      <p className="text-xs text-gray-500 mt-3 line-clamp-2">{test.description}</p>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </Card>

          {/* Test Submissions */}
          {selectedTest && (
            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="section-title">Kết Quả: {selectedTest.test_name}</h3>
                  <p className="text-xs text-gray-500 mt-1">Nhập điểm và nhận xét cho học viên</p>
                </div>
                {selectedTest.zoom_link && (
                  <a
                    href={selectedTest.zoom_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm hover:bg-blue-100"
                  >
                    <ZoomIn className="w-4 h-4" />
                    Tham gia Zoom
                  </a>
                )}
              </div>

              {submissionsLoading ? (
                <div className="flex justify-center py-16">
                  <div className="w-8 h-8 border-4 border-blue-400 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-gray-500 border-b border-gray-100">
                        <th className="text-left py-2 pr-3 font-medium">Học viên</th>
                        <th className="text-left py-2 pr-3 font-medium">Mã HV</th>
                        <th className="text-left py-2 pr-3 font-medium">Điểm</th>
                        <th className="text-left py-2 pr-3 font-medium">Trạng thái</th>
                        <th className="text-left py-2 pr-3 font-medium">Nhận xét GV</th>
                        <th className="text-left py-2 font-medium">Ghi chú HV</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {testSubmissions.map((sub) => (
                        <tr key={sub.id} className="hover:bg-gray-50">
                          <td className="py-2.5 pr-3 font-medium text-gray-800">{sub.student_name}</td>
                          <td className="py-2.5 pr-3 text-gray-500">{sub.student_code || "–"}</td>
                          <td className="py-2.5 pr-3">
                            <input
                              type="number"
                              className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                              value={sub.score ?? ""}
                              onChange={(e) => {
                                const val = e.target.value ? parseFloat(e.target.value) : null;
                                // TODO: Update submission via API
                              }}
                              placeholder="0"
                            />
                          </td>
                          <td className="py-2.5 pr-3">
                            <select
                              className="px-2 py-1 border border-gray-300 rounded text-sm"
                              value={sub.status || ""}
                              onChange={(e) => {
                                // TODO: Update submission status via API
                              }}
                            >
                              <option value="">Chọn</option>
                              <option value="not_taken">Chưa làm</option>
                              <option value="in_progress">Đang làm</option>
                              <option value="submitted">Đã nộp</option>
                              <option value="graded">Đã chấm</option>
                              <option value="absent">Vắng</option>
                            </select>
                          </td>
                          <td className="py-2.5 pr-3">
                            <input
                              type="text"
                              className="w-32 px-2 py-1 border border-gray-300 rounded text-sm"
                              value={sub.teacher_comment || ""}
                              placeholder="Nhận xét..."
                              onChange={(e) => {
                                // TODO: Update via API
                              }}
                            />
                          </td>
                          <td className="py-2.5 text-gray-500 max-w-xs truncate">
                            {sub.student_note || "–"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )}

          {/* Modal: Tạo Kỳ Thi Mới */}
          {showCreateTestModal && (
            <Modal
              open={true}
              onClose={() => { setShowCreateTestModal(false); setNewTestForm({
                test_name: "",
                test_date: "",
                test_type: "regular",
                max_score: 100,
                passing_score: 50,
                description: "",
                test_material_link: "",
                zoom_link: "",
              }); }}
              title="Tạo Kỳ Thi Mới"
            >
              <div className="space-y-4">
                <Input
                  label="Tên kỳ thi"
                  value={newTestForm.test_name}
                  onChange={e => setNewTestForm(p => ({ ...p, test_name: e.target.value }))}
                  placeholder="VD: Kiểm tra giữa kỳ"
                  required
                />

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Ngày thi"
                    type="date"
                    value={newTestForm.test_date}
                    onChange={e => setNewTestForm(p => ({ ...p, test_date: e.target.value }))}
                  />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Loại kỳ thi</label>
                    <select
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                      value={newTestForm.test_type}
                      onChange={e => setNewTestForm(p => ({ ...p, test_type: e.target.value }))}
                    >
                      <option value="regular">Thường</option>
                      <option value="midterm">Giữa kỳ</option>
                      <option value="final">Cuối kỳ</option>
                      <option value="mock">Mock Test</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Điểm tối đa"
                    type="number"
                    value={String(newTestForm.max_score)}
                    onChange={e => setNewTestForm(p => ({ ...p, max_score: Number(e.target.value) }))}
                  />
                  <Input
                    label="Điểm đạt"
                    type="number"
                    value={String(newTestForm.passing_score)}
                    onChange={e => setNewTestForm(p => ({ ...p, passing_score: Number(e.target.value) }))}
                  />
                </div>

                <Input
                  label="Link tài liệu/đề thi"
                  value={newTestForm.test_material_link}
                  onChange={e => setNewTestForm(p => ({ ...p, test_material_link: e.target.value }))}
                  placeholder="https://..."
                />

                <Input
                  label="Link Zoom buổi thi"
                  value={newTestForm.zoom_link}
                  onChange={e => setNewTestForm(p => ({ ...p, zoom_link: e.target.value }))}
                  placeholder="https://zoom.us/j/..."
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    rows={3}
                    value={newTestForm.description}
                    onChange={e => setNewTestForm(p => ({ ...p, description: e.target.value }))}
                    placeholder="Mô tả kỳ thi..."
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <Button variant="outline" onClick={() => setShowCreateTestModal(false)}>
                    Hủy
                  </Button>
                  <Button onClick={createTest} disabled={creatingTest}>
                    {creatingTest ? "Đang tạo..." : "Tạo Kỳ Thi"}
                  </Button>
                </div>
              </div>
            </Modal>
          )}
        </div>
      )}
    </PageWrapper>
  );
}
