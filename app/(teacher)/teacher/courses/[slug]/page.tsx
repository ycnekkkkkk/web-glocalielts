"use client";
import PageWrapper from "@/components/layouts/PageWrapper";
import { usePageTitle } from "@/components/layouts/PageTitleContext";
import { Card } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { createBrowserClient } from "@/lib/supabase/client";
import { SESSION_STATUS, ATTENDANCE_STATUS } from "@/lib/constants";
import { getSessionState } from "@/lib/sessionStatus";
import BackButton from "@/components/ui/BackButton";
import { BookOpen, Calendar, ClipboardList, Pencil, Star, Users, WrapText, Video, CalendarCheck2, AlertTriangle, Ban, Eye, Target, ChevronRight, ChevronDown, Save, X, Sparkles } from "lucide-react";
import { use, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import type { AttendanceMakeup, Session, SessionAttendance, Student } from "@/types";

// ── Helpers ─────────────────────────────────────────────────────
const VIETNAMESE_ORDINALS = ["", "Tháng thứ 1", "Tháng thứ 2", "Tháng thứ 3", "Tháng thứ 4", "Tháng thứ 5", "Tháng thứ 6", "Tháng thứ 7", "Tháng thứ 8", "Tháng thứ 9", "Tháng thứ 10"];

function toVietnameseOrdinal(n: number): string {
  if (n <= 10) return VIETNAMESE_ORDINALS[n];
  return `Tháng thứ ${n}`;
}

function cycleLabel(i: number): string {
  return `${toVietnameseOrdinal(i)} (Buổi ${i * 8 - 7}-${i * 8})`;
}

// ── Types ──────────────────────────────────────────────────────
interface ClassInfo {
  id: string;
  name: string;
  status: string;
  class_type: string;
  schedule: string | null;
  schedule_time: string | null;
  schedule_end_time: string | null;
  total_sessions: number;
  sessions_done: number;
  start_date: string | null;
}

interface StudentAttendance extends Student {
  attendance_status: "on_time" | "absent";
  note: string;
}

interface StudentEval {
  student_id: string;
  student_name: string;
  rating: number;
  comment: string;
}

interface AbsentStudentRow {
  student_id: string | null;
  student_name: string;
  note: string | null;
}

interface StudentAttendanceSummary {
  student_id: string;
  student_name: string;
  on_time: number;
  absent: number;
  total_records: number;
  absent_details: string[];
}

function parseSessionRef(sessionRef: string | null | undefined): { class_name: string; session_no: number | null; session_date: string } | null {
  if (!sessionRef) return null;
  const parts = sessionRef.split("#");
  if (parts.length < 3) return null;
  const session_date = parts.at(-1) || "";
  const session_no_raw = parts.at(-2) || "";
  const class_name = parts.slice(0, -2).join("#");
  const session_no = session_no_raw ? Number(session_no_raw) : null;
  if (!class_name || !session_date || session_no == null) return null;
  return { class_name, session_no, session_date };
}

interface MakeupForm {
  studentName: string;
  sessionRef: string;
  makeupType: "other_session";
  targetSessionRef: string;
  note: string;
}

// ── Star rating helper ─────────────────────────────────────────
function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" onClick={() => onChange(n)}
          className={`w-7 h-7 transition-colors ${n <= value ? "text-amber-400" : "text-gray-300 hover:text-amber-300"}`}>
          <Star className="w-5 h-5 fill-current" />
        </button>
      ))}
    </div>
  );
}

// ── Day label helper ───────────────────────────────────────────
const DAY_NAMES = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
function sessionDayLabel(dateStr: string | null): string {
  if (!dateStr) return "";
  // Support dd/MM/yyyy or yyyy-MM-dd
  let d: Date;
  if (dateStr.includes("/")) {
    const [dd, mm, yyyy] = dateStr.split("/");
    d = new Date(+yyyy, +mm - 1, +dd);
  } else {
    d = new Date(dateStr);
  }
  return isNaN(d.getTime()) ? "" : DAY_NAMES[d.getDay()];
}

const STATUS_MAP: Record<string, { label: string; variant: "success" | "info" | "gray" | "danger" }> = {
  active: { label: "Đang học", variant: "success" },
  upcoming: { label: "Sắp khai giảng", variant: "info" },
  completed: { label: "Kết thúc", variant: "gray" },
  cancelled: { label: "Đã hủy", variant: "danger" },
};

// ── Page ───────────────────────────────────────────────────────
export default function TeacherCourseDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const classSlug = decodeURIComponent(slug);
  const classIdRef = useRef<string>("");
  const { setTitle } = usePageTitle();
  const setTitleRef = useRef(setTitle);
  setTitleRef.current = setTitle;

  const [cls, setCls] = useState<ClassInfo | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [myName, setMyName] = useState("");
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"sessions" | "students">("sessions");

  // Inline topic editing
  const [editingTopicId, setEditingTopicId] = useState<number | null>(null);
  const [editingTopicValue, setEditingTopicValue] = useState("");
  const topicInputRef = useRef<HTMLInputElement>(null);

  // Inline zoom link editing
  const [editingZoomId, setEditingZoomId] = useState<number | null>(null);
  const [editingZoomValue, setEditingZoomValue] = useState("");
  const zoomInputRef = useRef<HTMLInputElement>(null);

  // Students tab
  const [enrolled, setEnrolled] = useState<{ id: string; full_name: string; email: string | null; phone: string | null }[]>([]);
  const [attendanceRows, setAttendanceRows] = useState<SessionAttendance[]>([]);
  const [makeupRows, setMakeupRows] = useState<AttendanceMakeup[]>([]);
  const [targetSessionStatusByRef, setTargetSessionStatusByRef] = useState<Record<string, Session["status"]>>({});

  // Attendance modal
  const [attendSession, setAttendSession] = useState<Session | null>(null);
  const [attendStudents, setAttendStudents] = useState<StudentAttendance[]>([]);
  const [attendLoading, setAttendLoading] = useState(false);
  const [savingAttend, setSavingAttend] = useState(false);
  const [attendViewOnly, setAttendViewOnly] = useState(false);

  // Makeup (reschedule session) modal
  const [makeupSession, setMakeupSession] = useState<Session | null>(null);
  const [makeupNewDate, setMakeupNewDate] = useState(""); // yyyy-MM-dd
  const [makeupNewTime, setMakeupNewTime] = useState(""); // HH:mm
  const [savingMakeup, setSavingMakeup] = useState(false);

  // Cancel session confirm modal
  const [cancelSession, setCancelSession] = useState<Session | null>(null);
  const [cancelNote, setCancelNote] = useState("");
  const [savingCancel, setSavingCancel] = useState(false);

  // Eval modal
  const [evalSession, setEvalSession] = useState<Session | null>(null);
  const [evalClassRating, setEvalClassRating] = useState(5);
  const [evalClassComment, setEvalClassComment] = useState("");
  const [evalStudents, setEvalStudents] = useState<StudentEval[]>([]);
  const [evalLoading, setEvalLoading] = useState(false);
  const [savingEval, setSavingEval] = useState(false);
  // Set of session_refs that already have a class evaluation
  const [evalledRefs, setEvalledRefs] = useState<Set<string>>(new Set());

  // Monthly Eval Modal
  const [monthlyEvalOpen, setMonthlyEvalOpen] = useState(false);
  const [monthlyEvalLoading, setMonthlyEvalLoading] = useState(false);
  const [monthlyEvalSaving, setMonthlyEvalSaving] = useState(false);
  const [monthlyEvalMode, setMonthlyEvalMode] = useState<"view" | "edit">("view");
  const [monthlyEvals, setMonthlyEvals] = useState<{
    student_id: string;
    student_name: string;
    performance: string;
    attendance_rate: number | string;
    homework_score: number | string;
    midterm_score: number | string;
    final_score: number | string;
    teacher_comment: string;
    knowledge_learned?: string;
    next_month_plan?: string;
    test_result?: string;
  }[]>([]);
  const [monthlyEvalMonth, setMonthlyEvalMonth] = useState("");
  const [completedMonthlyMonths, setCompletedMonthlyMonths] = useState<Set<string>>(new Set());

  // Bulk states for applying to all students in Monthly Eval
  const [bulkPerformance, setBulkPerformance] = useState("good");
  const [bulkComment, setBulkComment] = useState("");
  const [bulkKnowledge, setBulkKnowledge] = useState("");
  const [bulkNextMonthPlan, setBulkNextMonthPlan] = useState("");
  const [bulkTestResult, setBulkTestResult] = useState("");
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);
  const [expandedListStudentId, setExpandedListStudentId] = useState<string | null>(null);



  // ── Load ──────────────────────────────────────────────────────
  useEffect(() => {
    return () => { setTitleRef.current(""); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    async function load() {
      const supabase = createBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();
      setMyName(profile?.full_name || "");

      // Fetch by name (slug)
      const { data: classData } = await supabase
        .from("classes")
        .select("id, name, status, class_type, schedule, schedule_time, schedule_end_time, total_sessions, sessions_done, start_date")
        .eq("name", classSlug)
        .maybeSingle();

      if (!classData) { setLoading(false); return; }

      const classId = classData.id;
      classIdRef.current = classId;

      const [enrollRes] = await Promise.all([
        supabase.from("enrollments")
          .select("students(id, full_name, email, phone)")
          .eq("class_id", classIdRef.current)
          .eq("status", "active"),
      ]);

      const clsName = classData.name;
      let sessRes;
      if (clsName) {
        sessRes = await supabase.from("sessions")
          .select("*")
          .eq("class_name", clsName)
          .order("session_no");
      } else {
        sessRes = await supabase.from("sessions")
          .select("*")
          .eq("class_id", classIdRef.current)
          .order("session_no");
      }

      let sessData = (sessRes.data as Session[]) || [];

      // Sort sessions by date correctly
      sessData.sort((a, b) => {
        if (!a.session_date && !b.session_date) return 0;
        if (!a.session_date) return 1;
        if (!b.session_date) return -1;
        const parseDateStr = (dateStr: string) => {
          const parts = dateStr.split("/");
          if (parts.length !== 3) return new Date(0);
          return new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
        };
        return parseDateStr(a.session_date).getTime() - parseDateStr(b.session_date).getTime();
      });
      // Re-assign session_no based on actual date order to be safe
      sessData.forEach((s, i) => s.session_no = i + 1);

      setCls(classData as ClassInfo);
      setTitle(classData.name);
      setSessions(sessData);
      const sessionRefs = sessData.map((s) => `${s.class_name}#${s.session_no}#${s.session_date}`);
      if (clsName) {
        const attendanceRes = await supabase
          .from("session_attendance")
          .select("*")
          .eq("class_name", clsName);
        setAttendanceRows((attendanceRes.data || []) as SessionAttendance[]);
      } else {
        setAttendanceRows([]);
      }

      if (sessionRefs.length > 0) {
        const makeupRes = await supabase
          .from("attendance_makeup")
          .select("*")
          .in("session_ref", sessionRefs);
        const rows = (makeupRes.data || []) as AttendanceMakeup[];
        setMakeupRows(rows);

        const targetRefs = Array.from(new Set(rows.map(r => r.target_session_ref).filter(Boolean) as string[]));
        if (targetRefs.length > 0) {
          const parsedTargets = targetRefs.map(parseSessionRef).filter(Boolean) as { class_name: string; session_no: number | null; session_date: string }[];
          const targetClassNames = Array.from(new Set(parsedTargets.map(p => p.class_name)));
          const { data: targetSessions } = await supabase
            .from("sessions")
            .select("class_name,session_no,session_date,status")
            .in("class_name", targetClassNames);
          const nextStatusMap: Record<string, Session["status"]> = {};
          ((targetSessions || []) as Pick<Session, "class_name" | "session_no" | "session_date" | "status">[]).forEach((ts) => {
            const ref = `${ts.class_name}#${ts.session_no}#${ts.session_date}`;
            nextStatusMap[ref] = ts.status;
          });
          setTargetSessionStatusByRef(nextStatusMap);
        } else {
          setTargetSessionStatusByRef({});
        }
      } else {
        setMakeupRows([]);
        setTargetSessionStatusByRef({});
      }

      // Load which sessions already have evaluations
      if (sessData.length > 0) {
        const { data: evalData } = await supabase
          .from("session_class_evaluation")
          .select("session_ref")
          .eq("class_name", clsName);
        if (evalData) {
          setEvalledRefs(new Set((evalData as { session_ref: string }[]).map(e => e.session_ref)));
        }

        const { data: monthlyData } = await supabase
          .from("monthly_student_evaluations")
          .select("evaluation_month")
          .eq("class_id", classIdRef.current);
        if (monthlyData) {
          setCompletedMonthlyMonths(new Set((monthlyData as any[]).map(r => r.evaluation_month)));
        }
      }

      const studs = ((enrollRes.data || []) as unknown as { students: { id: string; full_name: string; email: string | null; phone: string | null } | null }[])
        .map((e) => e.students)
        .filter(Boolean) as { id: string; full_name: string; email: string | null; phone: string | null }[];
      setEnrolled(studs);
      if (studs.length > 0) {
        setExpandedListStudentId(studs[0].id);
      }
      setLoading(false);
    }
    load().catch(console.error);
  }, [classSlug]);

  // ── Attendance ────────────────────────────────────────────────
  async function openAttendance(s: Session, viewOnly = false) {
    setAttendViewOnly(viewOnly);
    setAttendSession(s);
    setAttendStudents([]);
    setAttendLoading(true);

    const supabase = createBrowserClient();
    const { data: enrollData } = await supabase
      .from("enrollments")
      .select("student:students!student_id(id,full_name,email,phone,organization_id,profile_id,parent_info,created_at,updated_at)")
      .eq("class_id", classIdRef.current)
      .eq("status", "active");

    const { data: existing } = await supabase
      .from("session_attendance")
      .select("student_id,student_name,attendance_status,note")
      .eq("session_id", s.id);

    const existingByStudentId: Record<string, { attendance_status: string; note: string }> = {};
    const existingByStudentName: Record<string, { attendance_status: string; note: string }> = {};
    (existing || []).forEach((a: any) => {
      if (a.student_id) existingByStudentId[a.student_id] = a;
      if (a.student_name) existingByStudentName[a.student_name] = a;
    });

    const list: StudentAttendance[] = ((enrollData || []) as unknown as { student: Student }[]).map(row => ({
      ...row.student,
      attendance_status: (((existingByStudentId[row.student.id] || existingByStudentName[row.student.full_name])?.attendance_status as "on_time" | "absent") || "on_time"),
      note: (existingByStudentId[row.student.id] || existingByStudentName[row.student.full_name])?.note || "",
    }));

    setAttendStudents(list);
    setAttendLoading(false);
  }


  async function handleSaveAttendance() {
    if (!attendSession) return;
    setSavingAttend(true);
    try {
      const supabase = createBrowserClient();
      const sessionRef = `${attendSession.class_name}#${attendSession.session_no}#${attendSession.session_date}`;
      const records = attendStudents.map((st) => ({
        session_id: attendSession.id,
        student_id: st.id,
        class_name: attendSession.class_name,
        session_no: attendSession.session_no,
        session_date: attendSession.session_date,
        student_name: st.full_name,
        session_ref: sessionRef,
        attendance_status: st.attendance_status,
        note: st.note || null,
      }));

      const { error } = await supabase
        .from("session_attendance")
        .upsert(records, { onConflict: "session_ref,student_name" });
      if (error) throw new Error(error.message);
      setAttendanceRows((prev) => {
        const next = [...prev];
        records.forEach((r) => {
          const idx = next.findIndex((x) => x.session_ref === r.session_ref && x.student_name === r.student_name);
          if (idx >= 0) next[idx] = { ...next[idx], ...r } as SessionAttendance;
          else next.push({ ...r } as SessionAttendance);
        });
        return next;
      });

      await supabase.from("sessions").update({ status: SESSION_STATUS.DONE }).eq("id", attendSession.id);
      setSessions((prev) => prev.map((x) => x.id === attendSession!.id ? { ...x, status: SESSION_STATUS.DONE } : x));

      const completed = attendSession;
      setAttendSession(null);
      toast.success(
        <span>
          Điểm danh xong!{" "}
          <button className="underline font-semibold" onClick={() => openEval(completed)}>
            Đánh giá buổi học →
          </button>
        </span>,
        { duration: 6000 }
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setSavingAttend(false);
    }
  }

  // ── Evaluation ────────────────────────────────────────────────
  async function openEval(s: Session) {
    setEvalSession(s);
    setEvalClassRating(5);
    setEvalClassComment("");
    setEvalStudents([]);
    setEvalLoading(true);

    const supabase = createBrowserClient();
    const sessionRef = `${s.class_name}#${s.session_no}#${s.session_date}`;

    const [attData, classEval, studentEvals, makeupRes] = await Promise.all([
      supabase.from("session_attendance").select("student_name,student_id,attendance_status,note").eq("session_id", s.id),
      supabase.from("session_class_evaluation").select("rating,comment").eq("session_ref", sessionRef).maybeSingle(),
      supabase.from("session_student_evaluation").select("student_name,rating,comment").eq("session_ref", sessionRef),
      supabase.from("attendance_makeup").select("student_name,target_session_ref,is_completed").eq("session_ref", sessionRef),
    ]);

    if (classEval.data) {
      setEvalClassRating(classEval.data.rating ?? 5);
      setEvalClassComment(classEval.data.comment ?? "");
    }

    const evalMap: Record<string, { rating: number; comment: string }> = {};
    (studentEvals.data || []).forEach((e: { student_name: string; rating: number; comment: string }) => {
      evalMap[e.student_name] = e;
    });

    const makeupByStudent = new Map<string, { target_session_ref: string | null; is_completed?: boolean | null }>();
    ((makeupRes.data || []) as { student_name: string; target_session_ref: string | null; is_completed?: boolean | null }[]).forEach((m) => {
      makeupByStudent.set(m.student_name, { target_session_ref: m.target_session_ref, is_completed: m.is_completed });
    });

    // Deduplicate attendance records by student name to prevent "double student" visual and database bugs caused by rescheduled session dates.
    const uniqueAttsMap = new Map<string, any>();
    ((attData.data || []) as { student_name: string; student_id: string; attendance_status: string }[]).forEach((a) => {
      const name = (a.student_name || "").trim().toLowerCase();
      if (!name) return;
      const existing = uniqueAttsMap.get(name);
      // Prefer records with student_id if available, or the one that is marked
      if (!existing || (a.student_id && !existing.student_id) || (a.attendance_status && !existing.attendance_status)) {
        uniqueAttsMap.set(name, a);
      }
    });
    const uniqueAttList = Array.from(uniqueAttsMap.values());

    setEvalStudents(
      uniqueAttList
        .filter((a) => {
          if (a.attendance_status !== ATTENDANCE_STATUS.ABSENT) return true;
          const mk = makeupByStudent.get(a.student_name);
          if (mk?.is_completed) return true;
          const target = mk?.target_session_ref ? sessions.find(ss => `${ss.class_name}#${ss.session_no}#${ss.session_date}` === mk.target_session_ref) : null;
          return !!target && target.status === SESSION_STATUS.DONE;
        })
        .map((a) => ({
          student_id: a.student_id,
          student_name: a.student_name,
          rating: evalMap[a.student_name]?.rating ?? 5,
          comment: evalMap[a.student_name]?.comment ?? "",
        }))
    );
    setEvalLoading(false);
  }

  async function handleSaveEval() {
    if (!evalSession) return;
    setSavingEval(true);
    try {
      const supabase = createBrowserClient();
      const sessionRef = `${evalSession.class_name}#${evalSession.session_no}#${evalSession.session_date}`;

      await supabase.from("session_class_evaluation").upsert({
        session_ref: sessionRef,
        class_name: evalSession.class_name,
        session_no: evalSession.session_no,
        session_date: evalSession.session_date,
        rating: evalClassRating,
        comment: evalClassComment || null,
        evaluated_by: myName,
      }, { onConflict: "session_ref" });

      if (evalStudents.length > 0) {
        await supabase.from("session_student_evaluation").upsert(
          evalStudents.map((st) => ({
            session_ref: sessionRef,
            class_name: evalSession.class_name,
            session_no: evalSession.session_no,
            session_date: evalSession.session_date,
            student_name: st.student_name,
            rating: st.rating,
            comment: st.comment || null,
            evaluated_by: myName,
          })),
          { onConflict: "session_ref,student_name" }
        );
      }

      toast.success("Đã lưu đánh giá buổi học!");
      setEvalledRefs(prev => new Set([...prev, sessionRef]));
      setEvalSession(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setSavingEval(false);
    }
  }

  // ── Monthly Evaluation ────────────────────────────────────────
  function openMonthlyEval(cycle?: string) {
    const sessionsDoneCount = sessions.filter(x => x.status === "DONE").length;
    const cyclesToComplete = Math.floor(sessionsDoneCount / 8);

    let targetCycle = cycle || "";
    if (!targetCycle) {
      for (let i = 1; i <= cyclesToComplete; i++) {
        const cycleName = cycleLabel(i);
        if (!completedMonthlyMonths.has(cycleName)) {
          targetCycle = cycleName;
          break;
        }
      }
      if (!targetCycle && cyclesToComplete > 0) {
        targetCycle = cycleLabel(cyclesToComplete);
      }
    }
    if (!targetCycle) {
      toast.error("Lớp chưa học đủ 8 buổi để thực hiện đánh giá định kỳ.");
      return;
    }

    setBulkPerformance("good");
    setBulkComment("");
    setBulkKnowledge("");
    setBulkNextMonthPlan("");
    setBulkTestResult("");

    setMonthlyEvalMonth(targetCycle);
    const isAlreadyCompleted = completedMonthlyMonths.has(targetCycle);
    setMonthlyEvalMode(isAlreadyCompleted ? "view" : "edit");
    const defaultMonthlyEvals = enrolled.map(st => {
      const existing = monthlyEvals.find(x => x.student_id === st.id);
      return existing ? { ...existing, student_name: st.full_name } : {
        student_id: st.id,
        student_name: st.full_name,
        performance: "good",
        attendance_rate: "",
        homework_score: "",
        midterm_score: "",
        final_score: "",
        teacher_comment: "",
        knowledge_learned: "",
        next_month_plan: "",
        test_result: "",
      };
    });
    setMonthlyEvals(defaultMonthlyEvals);
    setExpandedStudentId(enrolled[0]?.id || null);
    setMonthlyEvalOpen(true);
    handleMonthlyEvalCycleChange(targetCycle);
  }

  async function handleMonthlyEvalCycleChange(cycle: string) {
    setMonthlyEvalMonth(cycle);
    setMonthlyEvalMode("view");
    if (!cycle) return;
    setMonthlyEvalLoading(true);
    try {
      const supabase = createBrowserClient();
      const { data } = await supabase.from("monthly_student_evaluations")
        .select("*")
        .eq("class_id", classIdRef.current)
        .eq("evaluation_month", cycle);

      if (data && data.length > 0) {
        setMonthlyEvals(prev => prev.map(st => {
          const row = (data as any[]).find(r => r.student_id === st.student_id);
          return row ? {
            ...st,
            performance: row.performance || "good",
            attendance_rate: row.attendance_rate ?? "",
            homework_score: row.homework_score ?? "",
            midterm_score: row.midterm_score ?? "",
            final_score: row.final_score ?? "",
            teacher_comment: row.teacher_comment || "",
            knowledge_learned: row.knowledge_learned || "",
            next_month_plan: row.next_month_plan || "",
            test_result: row.test_result || "",
          } : st;
        }));
      } else {
        setMonthlyEvals(prev => prev.map(st => ({
          ...st,
          performance: "good",
          attendance_rate: "",
          homework_score: "",
          midterm_score: "",
          final_score: "",
          teacher_comment: "",
          knowledge_learned: "",
          next_month_plan: "",
          test_result: "",
        })));
      }
    } catch (e) {
      console.error(e);
    }
    setMonthlyEvalLoading(false);
  }

  const applyPerformanceToAll = () => {
    setMonthlyEvals(prev => prev.map(x => ({ ...x, performance: bulkPerformance })));
    toast.success("Đã áp dụng xếp loại cho tất cả học viên");
  };

  const applyCommentToAll = () => {
    setMonthlyEvals(prev => prev.map(x => ({ ...x, teacher_comment: bulkComment })));
    toast.success("Đã áp dụng nhận xét cho tất cả học viên");
  };

  const applyKnowledgeToAll = () => {
    setMonthlyEvals(prev => prev.map(x => ({ ...x, knowledge_learned: bulkKnowledge })));
    toast.success("Đã áp dụng kiến thức cho tất cả học viên");
  };

  const applyNextMonthPlanToAll = () => {
    setMonthlyEvals(prev => prev.map(x => ({ ...x, next_month_plan: bulkNextMonthPlan })));
    toast.success("Đã áp dụng kế hoạch cho tất cả học viên");
  };

  const applyTestResultToAll = () => {
    setMonthlyEvals(prev => prev.map(x => ({ ...x, test_result: bulkTestResult })));
    toast.success("Đã áp dụng kết quả test cho tất cả học viên");
  };

  const applyPerformanceAndTestResultToAll = () => {
    setMonthlyEvals(prev => prev.map(x => ({ ...x, performance: bulkPerformance, test_result: bulkTestResult })));
    toast.success("Đã áp dụng xếp loại và kết quả test cho tất cả học viên");
  };

  const handleBulkPaste = (
    e: React.ClipboardEvent<HTMLTextAreaElement>,
    setter: (val: string) => void,
    currentVal: string
  ) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text");
    if (!text) return;

    const ta = e.currentTarget;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;

    // Find the start of the current line containing the cursor
    const lastNewline = currentVal.lastIndexOf("\n", start - 1);
    const lineStartOffset = lastNewline === -1 ? 0 : lastNewline + 1;
    const textBeforeCursorInLine = currentVal.substring(lineStartOffset, start);
    const cursorLineHasDash = textBeforeCursorInLine.trim().startsWith("-");

    const lines = text.split(/\r?\n/);
    const formattedLines = lines.map((line, idx) => {
      const matchIndent = line.match(/^(\s*)/);
      const indent = matchIndent ? matchIndent[1] : "";
      const contentWithoutIndent = line.substring(indent.length);
      const trimmedContent = contentWithoutIndent.trim();

      if (!trimmedContent) return "";

      const bulletRegex = /^[\-\*\+\u2022\u2023\u2043\u204C\u204D\u2219]\s*/;
      const hasBullet = bulletRegex.test(trimmedContent);
      const contentWithoutBullet = hasBullet ? trimmedContent.replace(bulletRegex, "") : trimmedContent;

      // Preserves indented sub-items or paragraphs exactly as they are
      if (indent.length > 0) {
        return line;
      }

      if (idx === 0) {
        if (cursorLineHasDash) {
          return contentWithoutBullet;
        } else {
          return `- ${contentWithoutBullet}`;
        }
      } else {
        return `- ${contentWithoutBullet}`;
      }
    });

    const pastedFormatted = formattedLines.join("\n");
    const newVal = currentVal.substring(0, start) + pastedFormatted + currentVal.substring(end);
    setter(newVal);

    const newCursorPos = start + pastedFormatted.length;
    setTimeout(() => {
      ta.selectionStart = ta.selectionEnd = newCursorPos;
    }, 0);
  };

  const handleStudentPaste = (
    e: React.ClipboardEvent<HTMLTextAreaElement>,
    studentId: string,
    field: "teacher_comment" | "knowledge_learned" | "next_month_plan",
    currentVal: string
  ) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text");
    if (!text) return;

    const ta = e.currentTarget;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;

    // Find the start of the current line containing the cursor
    const lastNewline = currentVal.lastIndexOf("\n", start - 1);
    const lineStartOffset = lastNewline === -1 ? 0 : lastNewline + 1;
    const textBeforeCursorInLine = currentVal.substring(lineStartOffset, start);
    const cursorLineHasDash = textBeforeCursorInLine.trim().startsWith("-");

    const lines = text.split(/\r?\n/);
    const formattedLines = lines.map((line, idx) => {
      const matchIndent = line.match(/^(\s*)/);
      const indent = matchIndent ? matchIndent[1] : "";
      const contentWithoutIndent = line.substring(indent.length);
      const trimmedContent = contentWithoutIndent.trim();

      if (!trimmedContent) return "";

      const bulletRegex = /^[\-\*\+\u2022\u2023\u2043\u204C\u204D\u2219]\s*/;
      const hasBullet = bulletRegex.test(trimmedContent);
      const contentWithoutBullet = hasBullet ? trimmedContent.replace(bulletRegex, "") : trimmedContent;

      // Preserves indented sub-items or paragraphs exactly as they are
      if (indent.length > 0) {
        return line;
      }

      if (idx === 0) {
        if (cursorLineHasDash) {
          return contentWithoutBullet;
        } else {
          return `- ${contentWithoutBullet}`;
        }
      } else {
        return `- ${contentWithoutBullet}`;
      }
    });

    const pastedFormatted = formattedLines.join("\n");
    const newVal = currentVal.substring(0, start) + pastedFormatted + currentVal.substring(end);

    setMonthlyEvals(prev => prev.map(x => x.student_id === studentId ? { ...x, [field]: newVal } : x));

    const newCursorPos = start + pastedFormatted.length;
    setTimeout(() => {
      ta.selectionStart = ta.selectionEnd = newCursorPos;
    }, 0);
  };

  async function handleSaveMonthlyEval() {
    if (!monthlyEvalMonth) {
      toast.error("Vui lòng chọn chu kỳ đánh giá");
      return;
    }
    setMonthlyEvalSaving(true);
    try {
      const supabase = createBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();

      const upsertData = monthlyEvals.map(st => ({
        class_id: classIdRef.current,
        student_id: st.student_id,
        evaluation_month: monthlyEvalMonth,
        performance: st.performance,
        attendance_rate: st.attendance_rate === "" ? null : Number(st.attendance_rate),
        homework_score: st.homework_score === "" ? null : Number(st.homework_score),
        midterm_score: st.midterm_score === "" ? null : Number(st.midterm_score),
        final_score: st.final_score === "" ? null : Number(st.final_score),
        teacher_comment: st.teacher_comment,
        knowledge_learned: st.knowledge_learned || null,
        next_month_plan: st.next_month_plan || null,
        test_result: st.test_result || null,
        evaluated_by_teacher_id: user?.id,
      }));

      const { error } = await supabase.from("monthly_student_evaluations").upsert(upsertData, {
        onConflict: "class_id,student_id,evaluation_month"
      });

      if (error) throw error;

      toast.success("Đã lưu đánh giá tháng!");
      setCompletedMonthlyMonths(prev => new Set([...prev, monthlyEvalMonth]));
      setMonthlyEvalOpen(false);
    } catch (e: any) {
      toast.error(e.message || "Lỗi khi lưu đánh giá tháng");
    } finally {
      setMonthlyEvalSaving(false);
    }
  }

  // ── Học Bù (Reschedule Session) ─────────────────────────────
  function openMakeup(s: Session) {
    setMakeupSession(s);
    setMakeupNewDate(sessionDateToInputValue(s.session_date));
    setMakeupNewTime(s.session_time || "");
  }

  function sessionDateToInputValue(dbDate: string | null | undefined): string {
    if (!dbDate) return "";
    if (dbDate.includes("/")) {
      const [dd, mm, yyyy] = dbDate.split("/");
      return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
    }
    return dbDate;
  }

  function dateInputToDisplay(ymd: string): string {
    if (!ymd) return "";
    const parts = ymd.split("-");
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return ymd;
  }

  function formatDDMMYYYY(dateStr: string | null | undefined): string {
    if (!dateStr) return "";
    if (dateStr.includes("/")) return dateStr;
    return dateInputToDisplay(dateStr);
  }

  async function handleSaveMakeup() {
    if (!makeupSession || !makeupNewDate) { toast.error("Vui lòng chọn ngày học bù"); return; }
    const originalDate = makeupSession.session_date || "";
    const newDateDisplay = dateInputToDisplay(makeupNewDate);
    if (newDateDisplay === formatDDMMYYYY(originalDate) && makeupNewTime === (makeupSession.session_time || "")) {
      toast.error("Ngày và giờ học bù phải khác ngày gốc"); return;
    }
    setSavingMakeup(true);
    try {
      const supabase = createBrowserClient();
      const makeupNote = `Học bù từ ngày ${formatDDMMYYYY(originalDate)} → ${newDateDisplay}`;

      // ── CHAIN SHIFTING LOGIC ──
      const HOLIDAYS = ["01/01", "30/04", "01/05", "02/09"];
      const isHolidayLocal = (date: Date): boolean => {
        const d = String(date.getDate()).padStart(2, "0");
        const m = String(date.getMonth() + 1).padStart(2, "0");
        return HOLIDAYS.includes(`${d}/${m}`);
      };

      const parseSessionDateLocal = (dateStr: string): Date | null => {
        if (!dateStr) return null;
        const parts = dateStr.split("/");
        if (parts.length !== 3) return null;
        const d = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const y = parseInt(parts[2], 10);
        if (isNaN(d) || isNaN(m) || isNaN(y)) return null;
        return new Date(y, m, d);
      };

      const formatDateFullLocal = (date: Date): string => {
        const dd = String(date.getDate()).padStart(2, "0");
        const mm = String(date.getMonth() + 1).padStart(2, "0");
        return `${dd}/${mm}/${date.getFullYear()}`;
      };

      const getNextScheduleDateLocal = (afterDateStr: string, recurringDays: number[]): string => {
        const start = parseSessionDateLocal(afterDateStr);
        if (!start) return afterDateStr;
        const current = new Date(start);
        for (let i = 0; i < 365; i++) {
          current.setDate(current.getDate() + 1);
          if (recurringDays.includes(current.getDay()) && !isHolidayLocal(current)) {
            return formatDateFullLocal(current);
          }
        }
        const fallback = new Date(start);
        fallback.setDate(fallback.getDate() + 7);
        return formatDateFullLocal(fallback);
      };

      const classSessions = sessions
        .filter(s => s.class_id === makeupSession.class_id)
        .map(s => s.id === makeupSession.id ? { ...s, status: SESSION_STATUS.UPCOMING } : s)
        .sort((a, b) => (a.session_no || 0) - (b.session_no || 0));

      const daysSet = new Set<number>();
      classSessions.forEach(s => {
        if (s.status !== SESSION_STATUS.CANCELLED && s.session_date) {
          const d = parseSessionDateLocal(s.session_date);
          if (d) daysSet.add(d.getDay());
        }
      });
      const recurringDays = daysSet.size > 0 
        ? Array.from(daysSet).sort((a, b) => a - b) 
        : [1, 3, 5];

      const currentDates = new Map<any, string>();
      classSessions.forEach(s => {
        if (s.session_date) currentDates.set(s.id, s.session_date);
      });

      currentDates.set(makeupSession.id, newDateDisplay);

      let hasCollision = true;
      let safetyCounter = 0;
      while (hasCollision && safetyCounter < 100) {
        safetyCounter++;
        hasCollision = false;
        for (let i = 0; i < classSessions.length; i++) {
          const s1 = classSessions[i];
          if (s1.status === SESSION_STATUS.CANCELLED) continue;
          const date1 = currentDates.get(s1.id);
          if (!date1) continue;

          const colliding = classSessions.find(s2 => 
            s2.id !== s1.id && 
            s2.status !== SESSION_STATUS.CANCELLED && 
            currentDates.get(s2.id) === date1
          );

          if (colliding) {
            let toShift = colliding;
            if (s1.status === SESSION_STATUS.DONE) {
              toShift = colliding;
            } else if (colliding.status === SESSION_STATUS.DONE) {
              toShift = s1;
            } else if (s1.id === makeupSession.id) {
              toShift = colliding;
            } else if (colliding.id === makeupSession.id) {
              toShift = s1;
            } else {
              toShift = (s1.session_no || 0) > (colliding.session_no || 0) ? s1 : colliding;
            }

            const idx = classSessions.findIndex(s => s.id === toShift.id);
            let nextDateVal: string;
            if (idx + 1 < classSessions.length) {
              const nextSession = classSessions[idx + 1];
              nextDateVal = nextSession.session_date || "";
            } else {
              const currentVal = currentDates.get(toShift.id) || "";
              nextDateVal = getNextScheduleDateLocal(currentVal, recurringDays);
            }
            currentDates.set(toShift.id, nextDateVal);
            hasCollision = true;
            break;
          }
        }
      }

      // Update all changed sessions in parallel
      const changedSessions = classSessions.filter(s => currentDates.get(s.id) !== s.session_date);
      await Promise.all(
        changedSessions.map(async (s) => {
          const newDate = currentDates.get(s.id)!;
          if (s.id === makeupSession.id) {
            const { error } = await supabase.from("sessions").update({
              session_date: newDate,
              session_time: makeupNewTime || s.session_time || null,
              makeup_original_date: originalDate,
              makeup_note: makeupNote,
              status: SESSION_STATUS.UPCOMING,
            }).eq("id", s.id);
            if (error) throw error;
          } else {
            const { error } = await supabase.from("sessions").update({
              session_date: newDate,
            }).eq("id", s.id);
            if (error) throw error;
          }
        })
      );

      // Update react state
      setSessions(prev => prev.map(s => {
        const newDate = currentDates.get(s.id);
        if (!newDate || newDate === s.session_date) return s;
        if (s.id === makeupSession.id) {
          return { 
            ...s, 
            session_date: newDate, 
            session_time: makeupNewTime || s.session_time, 
            makeup_original_date: originalDate, 
            makeup_note: makeupNote, 
            status: SESSION_STATUS.UPCOMING 
          };
        } else {
          return { 
            ...s, 
            session_date: newDate 
          };
        }
      }));

      toast.success(`Đã chuyển lịch buổi học học bù thành công!`);
      setMakeupSession(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setSavingMakeup(false);
    }
  }

  // ── Hủy buổi ────────────────────────────────────────────────
  function openCancel(s: Session) { setCancelSession(s); setCancelNote(""); }

  async function handleConfirmCancel() {
    if (!cancelSession) return;
    setSavingCancel(true);
    try {
      const supabase = createBrowserClient();
      const { error } = await supabase.from("sessions").update({
        status: SESSION_STATUS.CANCELLED,
        cancelled_note: cancelNote.trim() || "Giáo viên hủy buổi",
        cancelled_by: myName || "teacher",
        cancelled_at: new Date().toISOString(),
      }).eq("id", cancelSession.id);
      if (error) throw new Error(error.message);
      setSessions(prev => prev.map(s =>
        s.id === cancelSession!.id
          ? { ...s, status: SESSION_STATUS.CANCELLED, cancelled_note: cancelNote || "Giáo viên hủy buổi" }
          : s
      ));
      toast.success(`Đã hủy buổi #${cancelSession.session_no}`);
      setCancelSession(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setSavingCancel(false);
    }
  }

  // ── Topic inline edit ─────────────────────────────────────────
  function startEditTopic(s: Session) {
    setEditingTopicId(s.id as number);
    setEditingTopicValue(s.topic || "");
    setTimeout(() => topicInputRef.current?.focus(), 50);
  }

  async function saveTopic(sessionId: number) {
    const newTopic = editingTopicValue.trim();
    setEditingTopicId(null);
    const old = sessions.find((s) => s.id === sessionId)?.topic || "";
    if (newTopic === old) return;
    setSessions((prev) => prev.map((s) => s.id === sessionId ? { ...s, topic: newTopic || null } : s));
    const { error } = await createBrowserClient()
      .from("sessions")
      .update({ topic: newTopic || null })
      .eq("id", sessionId);
    if (error) {
      toast.error("Lỗi lưu chủ đề");
      setSessions((prev) => prev.map((s) => s.id === sessionId ? { ...s, topic: old || null } : s));
    }
  }

  // ── Zoom link inline edit ────────────────────────────────────
  function startEditZoom(s: Session) {
    setEditingZoomId(s.id as number);
    setEditingZoomValue(s.zoom_link || "");
    setTimeout(() => zoomInputRef.current?.focus(), 50);
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

  // ── Render ────────────────────────────────────────────────────
  if (loading) {
    return (
      <PageWrapper>
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </PageWrapper>
    );
  }

  if (!cls) {
    return (
      <PageWrapper>
        <div className="text-center py-20 text-gray-400">
          <p>Không tìm thấy lớp học hoặc bạn không có quyền truy cập.</p>
          <BackButton href="/teacher/courses" label="Quay lại" variant="button" className="mt-4" />
        </div>
      </PageWrapper>
    );
  }

  const statusInfo = STATUS_MAP[cls.status] || { label: cls.status, variant: "gray" as const };
  const doneSessions = sessions.filter((s) => s.status === SESSION_STATUS.DONE).length;
  const progress = cls.total_sessions > 0 ? Math.min(100, (doneSessions / cls.total_sessions) * 100) : 0;

  const cyclesToComplete = Math.floor(doneSessions / 8);
  const eligibleCycles: string[] = [];
  for (let i = 1; i <= cyclesToComplete; i++) {
    eligibleCycles.push(cycleLabel(i));
  }
  const sessionByRef: Record<string, Session> = {};
  sessions.forEach((s) => {
    sessionByRef[`${s.class_name}#${s.session_no}#${s.session_date}`] = s;
  });
  const attendanceBySessionRefAndStudent: Record<string, SessionAttendance> = {};
  attendanceRows.forEach((row) => {
    attendanceBySessionRefAndStudent[`${row.session_ref}::${row.student_name}`] = row;
  });
  const makeupBySessionRefAndStudent: Record<string, AttendanceMakeup> = {};
  makeupRows.forEach((row) => {
    makeupBySessionRefAndStudent[`${row.session_ref}::${row.student_name}`] = row;
  });
  const makeupRowsBySessionRef: Record<string, AttendanceMakeup[]> = {};
  makeupRows.forEach((row) => {
    if (!makeupRowsBySessionRef[row.session_ref]) makeupRowsBySessionRef[row.session_ref] = [];
    makeupRowsBySessionRef[row.session_ref].push(row);
  });

  const sessionMakeupStats: Record<string, { assigned: number; completed: number; pending: number }> = {};
  sessions.forEach((s) => {
    const sRef = `${s.class_name}#${s.session_no}#${s.session_date}`;
    sessionMakeupStats[sRef] = { assigned: 0, completed: 0, pending: 0 };
  });
  makeupRows.forEach((row) => {
    const key = `${row.session_ref}::${row.student_name}`;
    const bucket = sessionMakeupStats[row.session_ref];
    if (!bucket) return;
    bucket.assigned += 1;
    const status = row.target_session_ref ? targetSessionStatusByRef[row.target_session_ref] : undefined;
    const done = !!row.is_completed || status === SESSION_STATUS.DONE;
    if (done) bucket.completed += 1;
    else bucket.pending += 1;
  });

  const studentSummaries: StudentAttendanceSummary[] = enrolled.map((st) => {
    let on_time = 0;
    let absent = 0;
    let total_records = 0;
    const absent_details: string[] = [];
    sessions.forEach((s) => {
      if (s.status !== "DONE") return;
      const sRef = `${s.class_name}#${s.session_no}#${s.session_date}`;
      const att = attendanceBySessionRefAndStudent[`${sRef}::${st.full_name}`];
      if (!att) return;
      total_records += 1;
      if (att.attendance_status === ATTENDANCE_STATUS.ON_TIME) {
        on_time += 1;
      } else if (att.attendance_status === ATTENDANCE_STATUS.ABSENT) {
        absent += 1;
        absent_details.push(`Buổi #${s.session_no} (${s.session_date || "–"})`);
      }
    });

    return {
      student_id: st.id,
      student_name: st.full_name,
      on_time,
      absent,
      total_records,
      absent_details,
    };
  });

  const nextEvalCycle: string | null = (() => {
    for (let i = 1; i <= cyclesToComplete; i++) {
      const name = cycleLabel(i);
      if (!completedMonthlyMonths.has(name)) return name;
    }
    return null;
  })();
  const allCyclesDone = nextEvalCycle === null;

  const completedCycleEntries = Array.from(completedMonthlyMonths)
    .sort()
    .map(cycle => ({ cycle, sortKey: parseInt(cycle.match(/Tháng thứ (\d+)/)?.[1] || "0") }))
    .sort((a, b) => a.sortKey - b.sortKey);

  return (
    <PageWrapper>
      {/* Back */}
      <div className="mb-4">
        <BackButton href="/teacher/courses" label="Lớp học của tôi" variant="button" />
      </div>

      {/* Header */}
      <div className="page-header flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="page-title">{cls.name}</h1>
          <p className="page-subtitle">
            {cls.schedule || "–"}
            {cls.schedule_time && ` · ${cls.schedule_time}${cls.schedule_end_time ? `–${cls.schedule_end_time}` : ""}`}
          </p>
        </div>
        <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <Card className="p-4 flex items-center gap-3">
          <div className="w-9 h-9 bg-sky-100 rounded-xl flex items-center justify-center">
            <Users className="w-4 h-4 text-sky-600" />
          </div>
          <div>
            <p className="text-xl font-bold text-gray-900">{enrolled.length}</p>
            <p className="text-xs text-gray-500">Học viên</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="w-9 h-9 bg-brand-100 rounded-xl flex items-center justify-center">
            <BookOpen className="w-4 h-4 text-brand-600" />
          </div>
          <div>
            <p className="text-xl font-bold text-gray-900">{sessions.length}</p>
            <p className="text-xs text-gray-500">Tổng buổi</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="w-9 h-9 bg-emerald-100 rounded-xl flex items-center justify-center">
            <ClipboardList className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <p className="text-xl font-bold text-gray-900">{doneSessions}</p>
            <p className="text-xs text-gray-500">Đã dạy</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center">
            <Calendar className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <p className="text-xl font-bold text-gray-900">{sessions.length - doneSessions}</p>
            <p className="text-xs text-gray-500">Còn lại</p>
          </div>
        </Card>
      </div>

      {/* Progress bar */}
      <Card className="p-4 mb-6">
        <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
          <span className="font-medium">Tiến độ khoá học</span>
          <span className="font-bold text-emerald-600">{doneSessions}/{cls.total_sessions} buổi ({Math.round(progress)}%)</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2.5">
          <div className="bg-emerald-500 h-2.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
      </Card>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-2xl mb-6 w-fit border border-gray-100 shadow-sm">
        {([
          { id: "sessions", label: "Lịch học & Điểm danh", icon: <Calendar className="w-4 h-4" /> },
          { id: "students", label: "Học viên", icon: <Users className="w-4 h-4" /> },
        ] as const).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
              tab === t.id
                ? "bg-white shadow-sm text-sky-600"
                : "text-gray-500 hover:text-gray-700 hover:bg-white/40"
            }`}
          >
            {t.icon}
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* ── Tab: Lịch học & Điểm danh ── */}
      {tab === "sessions" && (
        <div className="space-y-4">
          {(() => {
            const sessionsDoneCount = sessions.filter(x => x.status === "DONE").length;
            const cyclesToComplete = Math.floor(sessionsDoneCount / 8);
            let missingCycleName = "";
            for (let i = 1; i <= cyclesToComplete; i++) {
              const cycleName = cycleLabel(i);
              if (!completedMonthlyMonths.has(cycleName)) {
                missingCycleName = cycleName;
                break;
              }
            }
            if (missingCycleName) {
              return (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                    <Star className="w-4 h-4 text-amber-600" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-amber-800">Yêu cầu Đánh giá Tháng</h4>
                    <p className="text-sm text-amber-700 mt-1">
                      Lớp đã hoàn thành ít nhất 8 buổi học. Bạn cần thực hiện <b>Đánh giá tháng: {missingCycleName}</b> để tiếp tục điểm danh các buổi tiếp theo.
                      Vui lòng chuyển sang tab <b>Học viên</b> và nhấn nút <b>Đánh Giá Tháng</b>.
                    </p>
                  </div>
                </div>
              );
            }
            return null;
          })()}
          <Card className="overflow-hidden">
            {sessions.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm">Chưa có buổi học nào được tạo cho lớp này</p>
              </div>
            ) : (
              <div className="overflow-x-auto w-full">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      <th className="text-left px-4 py-3 whitespace-nowrap">Buổi</th>
                      <th className="text-left px-4 py-3 whitespace-nowrap">Thứ</th>
                      <th className="text-left px-4 py-3 whitespace-nowrap">Ngày</th>
                      <th className="text-left px-4 py-3 whitespace-nowrap">Giờ</th>
                      <th className="text-left px-4 py-3 whitespace-nowrap">Link học</th>
                      <th className="text-left px-4 py-3">Chủ đề</th>
                      <th className="text-left px-4 py-3 whitespace-nowrap">Trạng thái</th>
                      <th className="text-left px-4 py-3 whitespace-nowrap">Hành động</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {sessions.map((s) => {
                      const sessionState = getSessionState(s);
                      const isDone = sessionState.isDone;
                      const isCancelled = sessionState.isCancelled;
                      const isUpcoming = sessionState.isUpcoming;
                      const isMakeup = !!s.makeup_original_date;
                      const day = sessionDayLabel(s.session_date || null);
                      const sessionRef = `${s.class_name}#${s.session_no}#${s.session_date}`;
                      const hasEval = evalledRefs.has(sessionRef);

                      // Ràng buộc đánh giá mỗi 8 buổi (Đánh giá tháng)
                      const sessionsDone = sessions.filter(x => x.status === "DONE").length;
                      const cyclesToComplete = Math.floor(sessionsDone / 8);
                      let isLockedByMonthlyEval = false;
                      let missingCycleName = "";
                      for (let i = 1; i <= cyclesToComplete; i++) {
                        const cycleName = cycleLabel(i);
                        if (!completedMonthlyMonths.has(cycleName)) {
                          isLockedByMonthlyEval = true;
                          missingCycleName = cycleName;
                          break;
                        }
                      }

                      let isLockedByEval = false;
                      let lockedByEvalMsg = "";
                      if (isLockedByMonthlyEval) {
                        isLockedByEval = true;
                        lockedByEvalMsg = `Vui lòng hoàn thành Đánh giá tháng: ${missingCycleName} (tab Học viên) trước khi điểm danh tiếp.`;
                      }

                      return (
                        <tr key={s.id} className={`transition-colors ${isDone ? "bg-gray-50/50" : "hover:bg-gray-50"}`}>
                          <td className="px-4 py-3">
                            <div className="w-8 h-8 bg-brand-100 rounded-lg flex items-center justify-center text-xs font-bold text-brand-700">
                              #{s.session_no}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`text-xs font-bold px-2 py-1 rounded-lg whitespace-nowrap ${day ? "bg-emerald-100 text-emerald-700" : "text-gray-400"}`}>
                              {day || "–"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-800 whitespace-nowrap">{s.session_date || "–"}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{s.session_time || "–"}</td>
                          <td className="px-4 py-3">
                            {editingZoomId === s.id ? (
                              <div className="flex items-center gap-1">
                                <input
                                  ref={zoomInputRef}
                                  type="url"
                                  value={editingZoomValue}
                                  onChange={(e) => setEditingZoomValue(e.target.value)}
                                  onBlur={() => saveZoom(s.id as number)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") { e.preventDefault(); saveZoom(s.id as number); }
                                    if (e.key === "Escape") setEditingZoomId(null);
                                  }}
                                  className="w-40 rounded-lg border border-brand-400 bg-white px-2 py-1 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                                  placeholder="https://zoom.us/..."
                                />
                              </div>
                            ) : s.zoom_link ? (
                              <div className="flex items-center gap-1.5">
                                <a href={s.zoom_link} target="_blank" rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 rounded-lg text-xs font-medium transition-colors"
                                  title={s.zoom_link}>
                                  <Video className="w-3.5 h-3.5" />
                                  <span className="truncate max-w-24">{s.zoom_link.includes("zoom") ? "Zoom" : s.zoom_link.includes("meet") ? "Meet" : "Link"}</span>
                                </a>
                                <button
                                  type="button"
                                  onClick={() => startEditZoom(s)}
                                  className="p-1 text-gray-400 hover:text-brand-500 transition-colors"
                                  title="Sửa link"
                                >
                                  <Pencil className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs text-gray-300">–</span>
                                <button
                                  type="button"
                                  onClick={() => startEditZoom(s)}
                                  className="p-1 text-gray-300 hover:text-brand-500 transition-colors"
                                  title="Thêm link học"
                                >
                                  <Pencil className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 max-w-52">
                            {editingTopicId === s.id ? (
                              <input
                                ref={topicInputRef}
                                type="text"
                                value={editingTopicValue}
                                onChange={(e) => setEditingTopicValue(e.target.value)}
                                onBlur={() => saveTopic(s.id as number)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") { e.preventDefault(); saveTopic(s.id as number); }
                                  if (e.key === "Escape") setEditingTopicId(null);
                                }}
                                className="w-full rounded-lg border border-brand-400 bg-white px-2 py-1 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                                placeholder="Nhập chủ đề..."
                              />
                            ) : (
                              <button
                                type="button"
                                onClick={() => startEditTopic(s)}
                                className="group flex items-center gap-1.5 text-left w-full text-sm text-gray-600 hover:text-gray-900 transition-colors"
                                title="Nhấn để chỉnh sửa chủ đề"
                              >
                                <span className="truncate">{s.topic || <span className="text-gray-300 italic">Chưa có chủ đề</span>}</span>
                                <Pencil className="w-3 h-3 text-gray-300 group-hover:text-brand-500 shrink-0 transition-colors" />
                              </button>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex flex-col gap-1">
                              {isDone
                                ? <Badge variant="success">✓ Hoàn thành</Badge>
                                : isCancelled
                                  ? <Badge variant="danger">Đã hủy</Badge>
                                  : isMakeup
                                    ? <Badge variant="warning">🔄 Học bù</Badge>
                                    : sessionState.isPendingAttendance
                                      ? <Badge variant="warning" className="bg-amber-100 text-amber-800 border border-amber-300 font-bold">Chưa điểm danh</Badge>
                                      : <Badge variant="info">Sắp tới</Badge>}
                              {isMakeup && s.makeup_note && (
                                <p className="text-[10px] text-orange-600 leading-tight">{s.makeup_note}</p>
                              )}
                              {isCancelled && s.cancelled_note && (
                                <p className="text-[10px] text-red-500 leading-tight">Lý do: {s.cancelled_note}</p>
                              )}
                            </div>
                          </td>

                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {/* Điểm danh */}
                              {!isCancelled && (
                                <Button size="sm" variant={sessionState.isPendingAttendance ? "primary" : isDone ? "outline" : "primary"}
                                  className={sessionState.isPendingAttendance ? "bg-amber-600 hover:bg-amber-700 text-white border-amber-600 shadow-sm font-medium" : isLockedByEval ? "opacity-50" : ""}
                                  icon={<ClipboardList className="w-3.5 h-3.5" />}
                                  onClick={() => {
                                    if (isLockedByEval && !isDone) { toast.error(lockedByEvalMsg); return; }
                                    openAttendance(s, isDone);
                                  }}>
                                  {isDone ? "Xem ĐD" : sessionState.isPendingAttendance ? "Điểm danh ngay" : "Điểm danh"}
                                </Button>
                              )}
                              {/* Đánh giá */}
                              {isDone && (
                                <Button size="sm" variant="outline"
                                  className={hasEval ? "text-amber-700 border-amber-200 bg-amber-50 hover:bg-amber-100" : "text-amber-600"}
                                  icon={<Star className={`w-3.5 h-3.5 ${hasEval ? "fill-current text-amber-500" : "text-amber-400"}`} />}
                                  onClick={() => openEval(s)}>
                                  {hasEval ? "Xem ĐG" : "Đánh giá"}
                                </Button>
                              )}
                              {/* Học bù — reschedule toàn bộ buổi */}
                              {!isDone && (
                                <Button size="sm" variant="outline"
                                  className="text-orange-600 border-orange-200 hover:bg-orange-50"
                                  onClick={() => openMakeup(s)}>
                                  {isMakeup ? "Đổi lịch bù" : "Học bù"}
                                </Button>
                              )}
                              {/* Hủy — chỉ cho UPCOMING */}
                              {isUpcoming && (
                                <Button size="sm" variant="outline"
                                  className="text-red-500 border-red-200 hover:bg-red-50"
                                  onClick={() => openCancel(s)}>
                                  Hủy
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}</tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ── Tab: Học viên ── */}
      {tab === "students" && (
        <div className="space-y-6 animate-[var(--animate-fade-in)]">
          {/* Main Card: Danh sách học viên */}
          <div className="p-6 bg-white border border-gray-100 shadow-sm rounded-3xl">
            {/* Header */}
            <div className="flex items-start gap-3.5 mb-6">
              <div className="w-10 h-10 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center shrink-0 shadow-inner">
                <Users className="w-5 h-5 text-sky-600" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-gray-900">Danh sách học viên ({enrolled.length})</h3>
                <p className="text-xs text-gray-500 font-medium">Tổng quan tiến độ và đánh giá của học viên</p>
              </div>
            </div>

            {enrolled.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-30 text-sky-600 animate-pulse" />
                <p className="text-sm font-medium">Chưa có học viên nào trong lớp</p>
              </div>
            ) : (
              <div className="space-y-4">
                {studentSummaries.map((sum, i) => {
                  const isExpanded = expandedListStudentId === sum.student_id;
                  
                  // Generate initials for avatar
                  const initials = sum.student_name
                    .split(" ")
                    .filter(Boolean)
                    .map((n) => n[0])
                    .slice(-2)
                    .join("")
                    .toUpperCase();
                  
                  // Progress segments calculations
                  const total = sum.total_records || cls.total_sessions || 1;
                  const attended = sum.on_time;
                  const progressPct = Math.round((attended / total) * 100);

                  return (
                    <div
                      key={sum.student_id}
                      className="border border-gray-100 rounded-3xl bg-white shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden"
                    >
                      {/* Accordion Trigger Header */}
                      <div
                        className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/40 select-none transition-colors"
                        onClick={() => setExpandedListStudentId(isExpanded ? null : sum.student_id)}
                      >
                        <div className="flex items-center gap-3.5">
                          {/* Circle initials avatar */}
                          <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-sky-500 to-sky-600 flex items-center justify-center font-bold text-white shadow-md text-sm shrink-0">
                            {initials}
                          </div>
                          <div>
                            <h4 className="text-sm font-extrabold text-gray-900 flex items-center gap-2">
                              {sum.student_name}
                            </h4>
                            <p className="text-xs text-gray-500 font-medium mt-0.5">
                              Tổng đã học: <span className="font-bold text-gray-700">{sum.on_time} / {total} buổi</span> (đã điểm danh)
                            </p>
                          </div>
                        </div>

                        {/* Status + Collapsed Info / Action */}
                        <div className="flex items-center justify-between md:justify-end gap-3 w-full md:w-auto shrink-0 border-t md:border-t-0 pt-3 md:pt-0 border-gray-100">
                          {/* Collapsed mini metrics summary */}
                          {!isExpanded && (
                            <div className="hidden sm:flex items-center gap-4 text-xs font-bold text-gray-500 mr-2">
                              <span className="text-emerald-600 flex items-center gap-1">
                                <span className="text-[10px]">✓</span> Đúng giờ: {sum.on_time}
                              </span>
                              <span className="text-rose-600 flex items-center gap-1">
                                <span className="text-[10px]">✗</span> Vắng: {sum.absent}
                              </span>
                              <span className="text-sky-600 flex items-center gap-1">
                                <span className="text-[10px]">📋</span> Tổng: {total}
                              </span>
                            </div>
                          )}

                          <div className="flex items-center gap-3">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100/50">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              Đang học
                            </span>

                            {/* View Monthly Evals Button */}
                            {!isExpanded && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const cycle = nextEvalCycle || (completedCycleEntries[0]?.cycle) || cycleLabel(1);
                                  openMonthlyEval(cycle);
                                }}
                                className="px-3.5 py-1.5 border border-sky-600 text-sky-600 rounded-xl text-xs font-bold hover:bg-sky-50 transition-all shadow-sm flex items-center gap-1"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                                Xem đánh giá
                              </button>
                            )}

                            {/* Accordion Arrow Chevron Icon */}
                            <div className="text-gray-400 hover:text-gray-600 transition-colors ml-1 shrink-0">
                              {isExpanded ? (
                                <ChevronDown className="w-5 h-5" />
                              ) : (
                                <ChevronRight className="w-5 h-5" />
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Accordion Expanded Body */}
                      {isExpanded && (
                        <div className="px-5 pb-5 border-t border-gray-50 pt-5 bg-white space-y-5">
                          {/* Participation Progress Section */}
                          <div className="space-y-2.5">
                            <div className="flex justify-between items-end">
                              <span className="text-xs font-bold text-gray-700">Tiến độ tham gia</span>
                              <div className="text-right">
                                <span className="text-lg font-extrabold text-emerald-600">{progressPct}%</span>
                                <span className="block text-[10px] font-bold text-gray-400">{attended} / {total} buổi</span>
                              </div>
                            </div>
                            
                            {/* Segmented Progress Bar */}
                            <div className="flex gap-1 w-full h-2">
                              {Array.from({ length: total }).map((_, segmentIdx) => {
                                const isActive = segmentIdx < attended;
                                return (
                                  <div
                                    key={segmentIdx}
                                    className={`flex-1 h-2 rounded-full transition-all duration-300 ${
                                      isActive ? "bg-emerald-500" : "bg-gray-200"
                                    }`}
                                  />
                                );
                              })}
                            </div>
                          </div>

                          {/* Grid of 4 beautiful metric cards */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {/* Card 1: Đúng giờ */}
                            <div className="rounded-2xl bg-emerald-50/70 border border-emerald-100/60 p-4 flex items-center gap-3.5 shadow-sm">
                              <div className="w-9 h-9 rounded-xl bg-white border border-emerald-200 flex items-center justify-center shrink-0">
                                <CalendarCheck2 className="w-5 h-5 text-emerald-600" />
                              </div>
                              <div>
                                <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Đúng giờ</span>
                                <span className="text-base font-extrabold text-emerald-700">{sum.on_time}</span>
                              </div>
                            </div>

                            {/* Card 2: Vắng */}
                            <div className="rounded-2xl bg-rose-50/70 border border-rose-100/60 p-4 flex items-center gap-3.5 shadow-sm">
                              <div className="w-9 h-9 rounded-xl bg-white border border-rose-200 flex items-center justify-center shrink-0">
                                <X className="w-5 h-5 text-rose-600" />
                              </div>
                              <div>
                                <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Vắng</span>
                                <span className="text-base font-extrabold text-rose-700">{sum.absent}</span>
                              </div>
                            </div>

                            {/* Card 3: Tổng bản ghi */}
                            <div className="rounded-2xl bg-sky-50/70 border border-sky-100/60 p-4 flex items-center gap-3.5 shadow-sm">
                              <div className="w-9 h-9 rounded-xl bg-white border border-sky-200 flex items-center justify-center shrink-0">
                                <ClipboardList className="w-5 h-5 text-sky-600" />
                              </div>
                              <div>
                                <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Tổng bản ghi</span>
                                <span className="text-base font-extrabold text-sky-700">{total}</span>
                              </div>
                            </div>

                            {/* Card 4: Ghi chú */}
                            <div className="rounded-2xl bg-sky-50/70 border border-sky-100/60 p-4 flex items-center gap-3.5 shadow-sm">
                              <div className="w-9 h-9 rounded-xl bg-white border border-sky-200 flex items-center justify-center shrink-0">
                                <Star className="w-5 h-5 text-sky-600" />
                              </div>
                              <div>
                                <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Ghi chú</span>
                                <span className="text-xs font-bold text-sky-700 truncate block max-w-[120px]">
                                  {sum.absent > 0 ? `Có ${sum.absent} buổi vắng` : "Đầy đủ 100%"}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Absent tracker panel & CTA */}
                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50 border border-slate-100 rounded-2xl p-3">
                            <div className="flex items-center gap-2 px-2 py-1">
                              {sum.absent_details.length > 0 ? (
                                <>
                                  <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                                  <span className="text-xs font-bold text-rose-700">
                                    Buổi vắng cần theo dõi: {sum.absent_details.join(", ")}
                                  </span>
                                </>
                              ) : (
                                <>
                                  <CalendarCheck2 className="w-4 h-4 text-emerald-500 shrink-0" />
                                  <span className="text-xs font-bold text-emerald-700">
                                    Lịch học chuyên cần xuất sắc! Không có buổi vắng cần theo dõi.
                                  </span>
                                </>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const cycle = nextEvalCycle || (completedCycleEntries[0]?.cycle) || cycleLabel(1);
                                openMonthlyEval(cycle);
                              }}
                              className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-1.5"
                            >
                              <Eye className="w-4 h-4" />
                              Xem đánh giá
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section: Đánh giá tháng */}
          {(cyclesToComplete > 0 || completedMonthlyMonths.size > 0) && (
            <div className="p-6 bg-white border border-gray-100 shadow-sm rounded-3xl">
              {/* Header */}
              <div className="flex items-start gap-3.5 mb-6">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0 shadow-inner">
                  <Star className="w-5 h-5 text-amber-500 fill-current" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-gray-900">Đánh giá tháng</h3>
                  <p className="text-xs text-gray-500 font-medium">Các kỳ đánh giá theo tháng</p>
                </div>
              </div>

              {/* Horizontal Timeline Steps */}
              <div className="flex flex-col md:flex-row items-center gap-4 w-full overflow-x-auto pb-2">
                {(() => {
                  const maxCycle = Math.max(cyclesToComplete, completedMonthlyMonths.size + 1);
                  const totalCycles = maxCycle > 0 ? maxCycle : 1;

                  return Array.from({ length: totalCycles }).map((_, index) => {
                    const cycleIndex = index + 1;
                    const cycleName = cycleLabel(cycleIndex);
                    const isCompleted = completedMonthlyMonths.has(cycleName);
                    const isActive = nextEvalCycle === cycleName;
                    
                    return (
                      <div key={cycleName} className="flex items-center w-full md:w-auto shrink-0">
                        {/* Step Card */}
                        <div
                          onClick={() => openMonthlyEval(cycleName)}
                          className={`flex items-center gap-3.5 px-5 py-4 rounded-2xl cursor-pointer transition-all duration-200 w-full md:w-80 border shadow-sm ${
                            isCompleted
                              ? "bg-sky-50/10 border-sky-100 hover:border-sky-300"
                              : isActive
                              ? "bg-amber-50/10 border-amber-200 border-dashed hover:border-amber-300"
                              : "bg-gray-50/40 border-gray-200 border-dashed opacity-75"
                          }`}
                        >
                          {/* Cycle Circle Icon Indicator */}
                          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                            isCompleted
                              ? "bg-gradient-to-tr from-sky-500 to-sky-600 text-white shadow-md"
                              : "bg-gray-100 text-gray-400"
                          }`}>
                            <Calendar className="w-5 h-5" />
                          </div>

                          <div className="flex-1 min-w-0">
                            <h4 className="text-xs font-extrabold text-gray-900 truncate">{cycleName}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold ${
                                isCompleted
                                  ? "bg-sky-50 text-sky-700"
                                  : "bg-gray-100 text-gray-500"
                              }`}>
                                {isCompleted ? "Hoàn thành" : "Chưa đánh giá"}
                              </span>
                              <span className="text-[10px] text-gray-400 font-medium">
                                {isCompleted ? "Đã đánh giá" : "Chưa có dữ liệu"}
                              </span>
                            </div>
                          </div>

                          <ChevronRight className="w-4 h-4 text-gray-400 shrink-0 ml-1" />
                        </div>

                        {/* Timeline separator line */}
                        {cycleIndex < totalCycles && (
                          <div className="hidden md:block w-8 h-[2px] bg-slate-200 shrink-0 mx-2" />
                        )}
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Attendance Modal ── */}
      <Modal open={!!attendSession} onClose={() => setAttendSession(null)}
        title={attendViewOnly
          ? `Xem điểm danh – Buổi #${attendSession?.session_no} · ${attendSession?.session_date}`
          : `Điểm danh – Buổi #${attendSession?.session_no} · ${attendSession?.session_date}`}>
        {attendLoading ? (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : attendStudents.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <ClipboardList className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Chưa có dữ liệu điểm danh cho buổi này.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Summary stats */}
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl text-xs">
              <span className="text-gray-500">{attendStudents.length} học viên</span>
              <span className="ml-auto flex gap-3">
                <span className="text-emerald-600 font-semibold">
                  ✓ {attendStudents.filter(s => s.attendance_status === ATTENDANCE_STATUS.ON_TIME).length} đúng giờ
                </span>
                <span className="text-red-600 font-semibold">
                  ✗ {attendStudents.filter(s => s.attendance_status === ATTENDANCE_STATUS.ABSENT).length} vắng
                </span>
              </span>
            </div>

            {attendViewOnly && (
              <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-xl">
                Buổi đã hoàn thành. Bạn vẫn có thể chỉnh sửa điểm danh nếu cần.
              </p>
            )}

            {attendStudents.map((st) => (
              <div key={st.id} className="p-3 bg-gray-50 rounded-xl space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center text-xs font-bold text-brand-600 shrink-0">
                    {st.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{st.full_name}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {([
                      { v: ATTENDANCE_STATUS.ON_TIME, l: "Đúng giờ", color: "bg-emerald-100 text-emerald-700 border-emerald-300" },
                      { v: ATTENDANCE_STATUS.ABSENT, l: "Vắng", color: "bg-red-100 text-red-700 border-red-300" },
                    ] as const).map((opt) => (
                      <button key={opt.v} type="button"
                        className={`text-xs px-2 py-1 rounded-lg border transition-all ${st.attendance_status === opt.v ? opt.color + " border" : "border-gray-200 text-gray-400 hover:border-gray-300"}`}
                        onClick={() => setAttendStudents((prev) =>
                          prev.map((x) => x.id === st.id ? { ...x, attendance_status: opt.v } : x)
                        )}>
                        {opt.l}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
            <div className="flex gap-3 pt-2">
              <Button variant="secondary" className="flex-1" onClick={() => setAttendSession(null)}>Đóng</Button>
              <Button className="flex-1" loading={savingAttend} onClick={handleSaveAttendance}>
                {attendViewOnly ? "Lưu chỉnh sửa" : "Lưu điểm danh"}
              </Button>
            </div>
          </div>
        )}
      </Modal>



      {/* ── Evaluation Modal ── */}
      <Modal open={!!evalSession} onClose={() => setEvalSession(null)}
        title={evalSession && evalledRefs.has(`${evalSession.class_name}#${evalSession.session_no}#${evalSession.session_date}`)
          ? `Xem lại đánh giá – Buổi #${evalSession.session_no} · ${evalSession.session_date}`
          : `Đánh giá buổi học – Buổi #${evalSession?.session_no} · ${evalSession?.session_date}`}>
        {evalLoading ? (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-5">
            <div className="p-4 bg-amber-50 rounded-xl space-y-3">
              <h4 className="text-sm font-semibold text-gray-800">Đánh Giá Tổng Thể Buổi Học</h4>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500 w-16">Rating</span>
                <StarRating value={evalClassRating} onChange={setEvalClassRating} />
                <span className="text-sm font-bold text-amber-600">{evalClassRating}/5</span>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Nhận xét chung</label>
                <textarea
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                  rows={2}
                  placeholder="Buổi học diễn ra tốt..."
                  value={evalClassComment}
                  onChange={(e) => setEvalClassComment(e.target.value)}
                />
              </div>
            </div>

            {evalStudents.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-800 mb-3">Đánh Giá Từng Học Viên</h4>
                <p className="text-xs text-gray-500 mb-2">
                  Hiển thị học viên đúng giờ/trễ và học viên vắng nhưng đã hoàn thành học bù. Vắng chưa bù xong sẽ không đánh giá.
                </p>
                <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                  {evalStudents.map((st) => (
                    <div key={st.student_name} className="p-3 bg-gray-50 rounded-xl space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900 flex-1">{st.student_name}</span>
                        <StarRating value={st.rating}
                          onChange={(v) => setEvalStudents((prev) =>
                            prev.map((x) => x.student_name === st.student_name ? { ...x, rating: v } : x)
                          )} />
                      </div>
                      <input type="text"
                        className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
                        placeholder="Nhận xét học viên..."
                        value={st.comment}
                        onChange={(e) => setEvalStudents((prev) =>
                          prev.map((x) => x.student_name === st.student_name ? { ...x, comment: e.target.value } : x)
                        )} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <Button variant="secondary" className="flex-1" onClick={() => setEvalSession(null)}>Hủy</Button>
              <Button className="flex-1" loading={savingEval} onClick={handleSaveEval}>
                {evalSession && evalledRefs.has(`${evalSession.class_name}#${evalSession.session_no}#${evalSession.session_date}`)
                  ? "Lưu chỉnh sửa" : "Lưu đánh giá"}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Học Bù Modal (Reschedule) ── */}
      <Modal open={!!makeupSession} onClose={() => setMakeupSession(null)}
        title={`Học Bù – ${makeupSession?.class_name} – Buổi #${makeupSession?.session_no}`}>
        {makeupSession && (
          <div className="space-y-4">
            <div className="p-3 bg-orange-50 border border-orange-100 rounded-xl">
              <p className="text-xs text-orange-700 font-semibold mb-1">Buổi gốc</p>
              <p className="text-sm font-medium text-orange-900">
                {formatDDMMYYYY(makeupSession.session_date)} {makeupSession.session_time && `lúc ${makeupSession.session_time}`}
              </p>
              {makeupSession.makeup_original_date && (
                <p className="text-xs text-orange-600 mt-1">
                  (Đã bù từ ngày {formatDDMMYYYY(makeupSession.makeup_original_date)})
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ngày học bù *</label>
                <input
                  type="date"
                  value={makeupNewDate}
                  onChange={e => setMakeupNewDate(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Giờ học bù</label>
                <input
                  type="time"
                  value={makeupNewTime}
                  onChange={e => setMakeupNewTime(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            {makeupNewDate && (
              <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                <p className="text-xs text-emerald-600 font-medium">
                  Ghi chú sẽ lưu: "Học bù từ ngày {formatDDMMYYYY(makeupSession.session_date)} → {dateInputToDisplay(makeupNewDate)}"
                </p>
              </div>
            )}

            <p className="text-xs text-gray-500">
              ⚠ Thao tác này sẽ chuyển <strong>toàn bộ buổi học</strong> sang ngày mới. Tất cả học viên trong lớp sẽ học vào ngày bù.
            </p>

            <div className="flex gap-3 pt-1">
              <Button variant="secondary" className="flex-1" onClick={() => setMakeupSession(null)}>Hủy</Button>
              <Button type="button" className="flex-1" loading={savingMakeup} onClick={handleSaveMakeup}>
                <CalendarCheck2 className="w-4 h-4 mr-1" />
                Xác nhận học bù
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Hủy Buổi Confirm Modal ── */}
      <Modal open={!!cancelSession} onClose={() => setCancelSession(null)}
        title={`Xác nhận hủy buổi #${cancelSession?.session_no}`}>
        {cancelSession && (
          <div className="space-y-4">
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex gap-3 items-start">
              <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-700">Bạn sắp hủy buổi học này</p>
                <p className="text-xs text-red-600 mt-1">
                  {cancelSession.class_name} – Buổi #{cancelSession.session_no} – {formatDDMMYYYY(cancelSession.session_date)}
                </p>
                <p className="text-xs text-red-500 mt-2">
                  Sau khi hủy, buổi học sẽ được đánh dấu "Đã hủy". Bạn vẫn có thể dùng nút "Học bù" để chuyển sang ngày khác sau.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Lý do hủy (tùy chọn)</label>
              <textarea
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
                rows={2}
                placeholder="Giáo viên bận, học viên nghỉ lễ..."
                value={cancelNote}
                onChange={e => setCancelNote(e.target.value)}
              />
            </div>

            <div className="flex gap-3 pt-1">
              <Button variant="secondary" className="flex-1" onClick={() => setCancelSession(null)}>
                Quay lại
              </Button>
              <Button
                className="flex-1 bg-red-500 hover:bg-red-600 text-white border-red-500"
                loading={savingCancel}
                onClick={handleConfirmCancel}
              >
                <Ban className="w-4 h-4 mr-1" />
                Xác nhận hủy
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Monthly Eval Modal ── */}
      <Modal
        open={monthlyEvalOpen}
        onClose={() => setMonthlyEvalOpen(false)}
        size="lg"
        className="rounded-[28px] overflow-hidden"
      >
        <div className="space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">
              Đánh Giá Tháng – {monthlyEvalMonth}
            </h2>
            <button
              onClick={() => setMonthlyEvalOpen(false)}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-50 hover:bg-slate-100 text-gray-400 hover:text-gray-600 transition-all shadow-sm"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Dropdown chọn Kỳ đánh giá */}
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Kỳ đánh giá</label>
            <div className="relative flex items-center">
              <Calendar className="w-4 h-4 text-sky-600 absolute left-4 pointer-events-none" />
              <select
                value={monthlyEvalMonth}
                onChange={(e) => handleMonthlyEvalCycleChange(e.target.value)}
                className="w-full rounded-2xl border border-gray-200 pl-11 pr-10 py-3.5 text-sm font-semibold text-gray-700 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 appearance-none cursor-pointer"
              >
                {eligibleCycles.map((cycle) => (
                  <option key={cycle} value={cycle}>
                    {cycle} {completedMonthlyMonths.has(cycle) ? "(Đã đánh giá)" : "(Chưa đánh giá)"}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-gray-400 absolute right-4 pointer-events-none" />
            </div>
          </div>

          {/* Toggle View / Edit */}
          <div className="flex items-center justify-between p-2 bg-slate-50 border border-gray-100 rounded-2xl shadow-inner">
            <div className="flex items-center gap-1.5 px-4 py-1.5 bg-white border border-gray-200/50 shadow-sm rounded-xl text-xs font-bold text-gray-700">
              <Eye className="w-4 h-4 text-sky-600" />
              <span>Xem</span>
            </div>
            <button
              type="button"
              onClick={() => setMonthlyEvalMode(monthlyEvalMode === "view" ? "edit" : "view")}
              className="text-xs font-bold text-sky-600 hover:text-sky-800 transition-colors px-3 py-1"
            >
              {monthlyEvalMode === "view" ? "→ Chỉnh sửa" : "← Quay lại xem"}
            </button>
          </div>

          {/* Main Area */}
          {monthlyEvalMonth && (
            monthlyEvalLoading ? (
              <div className="flex justify-center py-12">
                <div className="w-9 h-9 border-4 border-sky-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
                {/* ── Bulk Apply Card ── */}
                {monthlyEvalMode === "edit" && (
                  <div className="p-3 sm:p-5 bg-sky-50/20 rounded-3xl border border-sky-100/50 space-y-3.5 sm:space-y-4 mb-4 sm:mb-5 shadow-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-sky-600 flex items-center justify-center text-white shadow-md">
                        <ClipboardList className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                      </div>
                      <p className="font-bold text-sky-900 text-xs tracking-wider uppercase">
                        Áp dụng nhanh cho cả lớp
                      </p>
                    </div>

                    {/* Row 1: Xếp loại & Kết quả test */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 items-end">
                      <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">Xếp loại chung</label>
                        <div className="relative flex items-center">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 absolute left-4 pointer-events-none" />
                          <select
                            value={bulkPerformance}
                            onChange={(e) => setBulkPerformance(e.target.value)}
                            className="w-full rounded-2xl border border-gray-200 pl-8 pr-10 py-2.5 sm:py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white font-semibold text-gray-700 shadow-sm appearance-none cursor-pointer"
                          >
                            <option value="excellent">Xuất sắc</option>
                            <option value="good">Tốt</option>
                            <option value="average">Trung bình</option>
                            <option value="below_average">Yếu</option>
                            <option value="poor">Kém</option>
                          </select>
                          <ChevronDown className="w-4 h-4 text-gray-400 absolute right-4 pointer-events-none" />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">Kết quả test chung</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={bulkTestResult}
                            onChange={(e) => setBulkTestResult(e.target.value)}
                            placeholder="Ví dụ: 8.0 IELTS, 75/100 TOEIC..."
                            className="flex-1 min-w-0 rounded-2xl border border-gray-200 px-3 sm:px-4 py-2.5 sm:py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white shadow-sm font-medium"
                          />
                          <button
                            type="button"
                            onClick={applyPerformanceAndTestResultToAll}
                            className="px-3.5 sm:px-5 py-2.5 sm:py-3 bg-sky-600 hover:bg-sky-700 text-white rounded-2xl text-xs font-bold transition-all shrink-0 shadow-md active:scale-95 h-10 sm:h-11 flex items-center justify-center"
                          >
                            Áp dụng
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Row 2: Nhận xét chung */}
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1">Nhận xét chung</label>
                      <div className="flex gap-2 items-center">
                        <textarea
                          value={bulkComment}
                          onFocus={(e) => {
                            if (!bulkComment) setBulkComment("- ");
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              const ta = e.currentTarget;
                              const start = ta.selectionStart;
                              const end = ta.selectionEnd;
                              const newValue = bulkComment.substring(0, start) + "\n- " + bulkComment.substring(end);
                              setBulkComment(newValue);
                              setTimeout(() => { ta.selectionStart = ta.selectionEnd = start + 3; }, 0);
                            }
                          }}
                          onPaste={(e) => handleBulkPaste(e, setBulkComment, bulkComment)}
                          onChange={(e) => setBulkComment(e.target.value)}
                          placeholder="Nhập nhận xét chung cho cả lớp..."
                          rows={4}
                          className="flex-1 min-w-0 rounded-2xl border border-gray-200 px-3 sm:px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 resize-y min-h-[90px] bg-white shadow-sm font-medium"
                        />
                        <button
                          type="button"
                          onClick={applyCommentToAll}
                          className="px-3.5 sm:px-5 py-2.5 sm:py-3 bg-sky-600 hover:bg-sky-700 text-white rounded-2xl text-xs font-bold transition-all shrink-0 shadow-md active:scale-95 h-10 sm:h-11 flex items-center justify-center"
                        >
                          Áp dụng
                        </button>
                      </div>
                    </div>

                    {/* Row 3: Kiến thức chung */}
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1">Kiến thức chung đã học</label>
                      <div className="flex gap-2 items-center">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-sky-50/55 border border-sky-100 flex items-center justify-center shrink-0 shadow-inner">
                          <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-sky-600" />
                        </div>
                        <textarea
                          value={bulkKnowledge}
                          onFocus={(e) => {
                            if (!bulkKnowledge) setBulkKnowledge("- ");
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              const ta = e.currentTarget;
                              const start = ta.selectionStart;
                              const end = ta.selectionEnd;
                              const newValue = bulkKnowledge.substring(0, start) + "\n- " + bulkKnowledge.substring(end);
                              setBulkKnowledge(newValue);
                              setTimeout(() => { ta.selectionStart = ta.selectionEnd = start + 3; }, 0);
                            }
                          }}
                          onPaste={(e) => handleBulkPaste(e, setBulkKnowledge, bulkKnowledge)}
                          onChange={(e) => setBulkKnowledge(e.target.value)}
                          placeholder="Nhập các chủ đề, từ vựng, ngữ pháp chính..."
                          rows={4}
                          className="flex-1 min-w-0 rounded-2xl border border-gray-200 px-3 sm:px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 resize-y min-h-[90px] bg-white shadow-sm font-medium"
                        />
                        <button
                          type="button"
                          onClick={applyKnowledgeToAll}
                          className="px-3.5 sm:px-5 py-2.5 sm:py-3 bg-sky-600 hover:bg-sky-700 text-white rounded-2xl text-xs font-bold transition-all shrink-0 shadow-md active:scale-95 h-10 sm:h-11 flex items-center justify-center"
                        >
                          Áp dụng
                        </button>
                      </div>
                    </div>

                    {/* Row 4: Kế hoạch chung */}
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1">Kế hoạch chung tháng sau</label>
                      <div className="flex gap-2 items-center">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-sky-50/55 border border-sky-100 flex items-center justify-center shrink-0 shadow-inner">
                          <Target className="w-4 h-4 sm:w-5 sm:h-5 text-sky-600" />
                        </div>
                        <textarea
                          value={bulkNextMonthPlan}
                          onFocus={(e) => {
                            if (!bulkNextMonthPlan) setBulkNextMonthPlan("- ");
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              const ta = e.currentTarget;
                              const start = ta.selectionStart;
                              const end = ta.selectionEnd;
                              const newValue = bulkNextMonthPlan.substring(0, start) + "\n- " + bulkNextMonthPlan.substring(end);
                              setBulkNextMonthPlan(newValue);
                              setTimeout(() => { ta.selectionStart = ta.selectionEnd = start + 3; }, 0);
                            }
                          }}
                          onPaste={(e) => handleBulkPaste(e, setBulkNextMonthPlan, bulkNextMonthPlan)}
                          onChange={(e) => setBulkNextMonthPlan(e.target.value)}
                          placeholder="Các mục tiêu, kỹ năng cần tập trung ôn luyện..."
                          rows={4}
                          className="flex-1 min-w-0 rounded-2xl border border-gray-200 px-3 sm:px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 resize-y min-h-[90px] bg-white shadow-sm font-medium"
                        />
                        <button
                          type="button"
                          onClick={applyNextMonthPlanToAll}
                          className="px-3.5 sm:px-5 py-2.5 sm:py-3 bg-sky-600 hover:bg-sky-700 text-white rounded-2xl text-xs font-bold transition-all shrink-0 shadow-md active:scale-95 h-10 sm:h-11 flex items-center justify-center"
                        >
                          Áp dụng
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Students Accordions ── */}
                {monthlyEvals.map((st, i) => {
                  const isExpanded = expandedStudentId === st.student_id;
                  return (
                    <div key={st.student_id} className="bg-slate-50/50 border border-gray-200/60 rounded-2xl mb-3 shadow-sm hover:shadow-md transition-all overflow-hidden">
                      {/* Card Header */}
                      <button
                        type="button"
                        onClick={() => setExpandedStudentId(isExpanded ? null : st.student_id)}
                        className="w-full flex items-center justify-between px-5 py-4 font-bold text-gray-800 text-sm hover:bg-slate-100/40 transition-all text-left relative"
                      >
                        <span>{i + 1}. {st.student_name}</span>
                        {isExpanded ? <ChevronDown className="w-4.5 h-4.5 text-gray-400" /> : <ChevronRight className="w-4.5 h-4.5 text-gray-400" />}
                        {isExpanded && (
                          <div className="absolute bottom-0 left-5 h-[3px] bg-sky-600 rounded-full animate-[var(--animate-fade-in)]" style={{ width: "35%" }} />
                        )}
                      </button>

                      {/* Card Body */}
                      {isExpanded && (
                        <div className="p-5 bg-white border-t border-gray-100 space-y-4">
                          {/* ── Mode XEM ── */}
                          {monthlyEvalMode === "view" && (
                            <div className="space-y-3.5 text-xs">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-gray-500 w-28 shrink-0">Xếp loại:</span>
                                <span className={`font-bold px-3 py-0.5 rounded-full ${
                                  st.performance === "excellent" ? "bg-emerald-100 text-emerald-700" :
                                  st.performance === "good" ? "bg-blue-100 text-blue-700" :
                                  st.performance === "average" ? "bg-amber-100 text-amber-700" :
                                  "bg-red-100 text-red-700"
                                }`}>
                                  {st.performance === "excellent" ? "Xuất sắc" : st.performance === "good" ? "Tốt" : st.performance === "average" ? "Trung bình" : st.performance === "below_average" ? "Yếu" : "Kém"}
                                </span>
                              </div>
                              {st.teacher_comment && (
                                <div>
                                  <span className="font-bold text-gray-500">Nhận xét GV:</span>
                                  <p className="text-gray-700 mt-1 pl-4 whitespace-pre-line leading-relaxed">{st.teacher_comment}</p>
                                </div>
                              )}
                              {st.knowledge_learned && (
                                <div>
                                  <span className="font-bold text-gray-500">Kiến thức đã học:</span>
                                  <p className="text-gray-700 mt-1 pl-4 whitespace-pre-line leading-relaxed">{st.knowledge_learned}</p>
                                </div>
                              )}
                              {st.next_month_plan && (
                                <div>
                                  <span className="font-bold text-gray-500">Kế hoạch tháng sau:</span>
                                  <p className="text-gray-700 mt-1 pl-4 whitespace-pre-line leading-relaxed">{st.next_month_plan}</p>
                                </div>
                              )}
                              {st.test_result && (
                                <div>
                                  <span className="font-bold text-gray-500">Kết quả test:</span>
                                  <p className="text-gray-700 mt-1 pl-4 font-semibold">{st.test_result}</p>
                                </div>
                              )}
                              {!st.teacher_comment && !st.knowledge_learned && !st.next_month_plan && !st.test_result && (
                                <p className="italic text-gray-400 pl-4">Chưa có nội dung đánh giá</p>
                              )}
                            </div>
                          )}

                          {/* ── Mode EDIT ── */}
                          {monthlyEvalMode === "edit" && (
                            <div className="space-y-4">
                              <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1">Xếp loại</label>
                                <div className="relative flex items-center">
                                  <select
                                    value={st.performance}
                                    onChange={(e) => setMonthlyEvals(prev => prev.map(x => x.student_id === st.student_id ? { ...x, performance: e.target.value } : x))}
                                    className="w-full rounded-2xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white font-semibold text-gray-700 cursor-pointer appearance-none"
                                  >
                                    <option value="excellent">Xuất sắc</option>
                                    <option value="good">Tốt</option>
                                    <option value="average">Trung bình</option>
                                    <option value="below_average">Yếu</option>
                                    <option value="poor">Kém</option>
                                  </select>
                                  <ChevronDown className="w-4 h-4 text-gray-400 absolute right-4 pointer-events-none" />
                                </div>
                              </div>
                              <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1">Nhận xét của giảng viên</label>
                                <textarea
                                  value={st.teacher_comment || ""}
                                  onFocus={(e) => {
                                    if (!st.teacher_comment) setMonthlyEvals(prev => prev.map(x => x.student_id === st.student_id ? { ...x, teacher_comment: "- " } : x));
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      const ta = e.currentTarget;
                                      const start = ta.selectionStart;
                                      const end = ta.selectionEnd;
                                      const val = st.teacher_comment || "";
                                      const newValue = val.substring(0, start) + "\n- " + val.substring(end);
                                      setMonthlyEvals(prev => prev.map(x => x.student_id === st.student_id ? { ...x, teacher_comment: newValue } : x));
                                      setTimeout(() => { ta.selectionStart = ta.selectionEnd = start + 3; }, 0);
                                    }
                                  }}
                                  onPaste={(e) => handleStudentPaste(e, st.student_id, "teacher_comment", st.teacher_comment || "")}
                                  onChange={(e) => setMonthlyEvals(prev => prev.map(x => x.student_id === st.student_id ? { ...x, teacher_comment: e.target.value } : x))}
                                  className="w-full rounded-2xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 resize-y min-h-[90px] font-medium font-sans"
                                  rows={4}
                                  placeholder="Nhận xét sự tiến bộ, thái độ..."
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1">Kiến thức đã học</label>
                                <textarea
                                  value={st.knowledge_learned || ""}
                                  onFocus={(e) => {
                                    if (!st.knowledge_learned) setMonthlyEvals(prev => prev.map(x => x.student_id === st.student_id ? { ...x, knowledge_learned: "- " } : x));
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      const ta = e.currentTarget;
                                      const start = ta.selectionStart;
                                      const end = ta.selectionEnd;
                                      const val = st.knowledge_learned || "";
                                      const newValue = val.substring(0, start) + "\n- " + val.substring(end);
                                      setMonthlyEvals(prev => prev.map(x => x.student_id === st.student_id ? { ...x, knowledge_learned: newValue } : x));
                                      setTimeout(() => { ta.selectionStart = ta.selectionEnd = start + 3; }, 0);
                                    }
                                  }}
                                  onPaste={(e) => handleStudentPaste(e, st.student_id, "knowledge_learned", st.knowledge_learned || "")}
                                  onChange={(e) => setMonthlyEvals(prev => prev.map(x => x.student_id === st.student_id ? { ...x, knowledge_learned: e.target.value } : x))}
                                  className="w-full rounded-2xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 resize-y min-h-[90px] font-medium"
                                  rows={4}
                                  placeholder="- Nhập các kiến thức chính, cấu trúc học viên đã học..."
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1">Kế hoạch tháng sau</label>
                                <textarea
                                  value={st.next_month_plan || ""}
                                  onFocus={(e) => {
                                    if (!st.next_month_plan) setMonthlyEvals(prev => prev.map(x => x.student_id === st.student_id ? { ...x, next_month_plan: "- " } : x));
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      const ta = e.currentTarget;
                                      const start = ta.selectionStart;
                                      const end = ta.selectionEnd;
                                      const val = st.next_month_plan || "";
                                      const newValue = val.substring(0, start) + "\n- " + val.substring(end);
                                      setMonthlyEvals(prev => prev.map(x => x.student_id === st.student_id ? { ...x, next_month_plan: newValue } : x));
                                      setTimeout(() => { ta.selectionStart = ta.selectionEnd = start + 3; }, 0);
                                    }
                                  }}
                                  onPaste={(e) => handleStudentPaste(e, st.student_id, "next_month_plan", st.next_month_plan || "")}
                                  onChange={(e) => setMonthlyEvals(prev => prev.map(x => x.student_id === st.student_id ? { ...x, next_month_plan: e.target.value } : x))}
                                  className="w-full rounded-2xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 resize-y min-h-[90px] font-medium"
                                  rows={4}
                                  placeholder="- Nhập mục tiêu và kế hoạch hành động..."
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1">Kết quả test</label>
                                <textarea
                                  value={st.test_result || ""}
                                  onChange={(e) => setMonthlyEvals(prev => prev.map(x => x.student_id === st.student_id ? { ...x, test_result: e.target.value } : x))}
                                  className="w-full rounded-2xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 resize-y min-h-[90px] font-medium"
                                  rows={4}
                                  placeholder="Điểm bài test định kỳ và nhận định nhanh..."
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )
          )}

          {/* Footer */}
          <div className="flex gap-3 sm:gap-4 pt-3 border-t border-gray-100 shrink-0">
            <button
              onClick={() => setMonthlyEvalOpen(false)}
              className="flex-1 py-2.5 sm:py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs sm:text-sm font-bold transition-all shadow-sm flex items-center justify-center cursor-pointer"
            >
              Đóng
            </button>
            {monthlyEvalMode === "edit" && monthlyEvalMonth && (
              <button
                disabled={monthlyEvalSaving}
                onClick={handleSaveMonthlyEval}
                className="flex-1 py-2.5 sm:py-3.5 bg-sky-600 hover:bg-sky-700 text-white rounded-2xl text-xs sm:text-sm font-bold transition-all shadow-md hover:shadow-lg active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4 shrink-0" />
                <span>Lưu đánh giá</span>
              </button>
            )}
          </div>
        </div>
      </Modal>
    </PageWrapper>
  );
}
