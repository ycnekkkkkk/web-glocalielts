"use client";
import PageWrapper from "@/components/layouts/PageWrapper";
import { Card } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { createBrowserClient } from "@/lib/supabase/client";
import { SESSION_STATUS, ATTENDANCE_STATUS } from "@/lib/constants";
import { ArrowLeft, BookOpen, Calendar, ClipboardList, Pencil, Star, Users, WrapText, Video } from "lucide-react";
import Link from "next/link";
import { use, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import type { AttendanceMakeup, Session, SessionAttendance, Student } from "@/types";

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
  attendance_status: "on_time" | "late" | "absent";
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
  late: number;
  absent_unresolved: number;
  makeup_completed: number;
  learned_total: number;
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
  active:    { label: "Đang học",       variant: "success" },
  upcoming:  { label: "Sắp khai giảng", variant: "info"    },
  completed: { label: "Kết thúc",       variant: "gray"    },
  cancelled: { label: "Đã hủy",         variant: "danger"  },
};

// ── Page ───────────────────────────────────────────────────────
export default function TeacherCourseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: classId } = use(params);

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
  const [attendMakeupByStudent, setAttendMakeupByStudent] = useState<Record<string, AttendanceMakeup>>({});
  const [attendLoading, setAttendLoading] = useState(false);
  const [savingAttend, setSavingAttend] = useState(false);
  const [attendViewOnly, setAttendViewOnly] = useState(false);

  // Eval modal
  const [evalSession, setEvalSession] = useState<Session | null>(null);
  const [evalClassRating, setEvalClassRating] = useState(5);
  const [evalClassComment, setEvalClassComment] = useState("");
  const [evalStudents, setEvalStudents] = useState<StudentEval[]>([]);
  const [evalLoading, setEvalLoading] = useState(false);
  const [savingEval, setSavingEval] = useState(false);
  // Set of session_refs that already have a class evaluation
  const [evalledRefs, setEvalledRefs] = useState<Set<string>>(new Set());

  // Makeup modal
  const [makeup, setMakeup] = useState<MakeupForm | null>(null);
  const [upcomingSessions, setUpcomingSessions] = useState<Session[]>([]);
  const [makeupAbsentReason, setMakeupAbsentReason] = useState<string>("");
  const [candidateMakeupSessions, setCandidateMakeupSessions] = useState<Session[]>([]);
  const [candidateMakeupDate, setCandidateMakeupDate] = useState<string>("");
  const [makeupOtherTime, setMakeupOtherTime] = useState<string>(""); // HH:mm
  const [savingMakeup, setSavingMakeup] = useState(false);
  const [expandedMakeupBySessionRef, setExpandedMakeupBySessionRef] = useState<Record<string, boolean>>({});
  const [manageMakeupSession, setManageMakeupSession] = useState<Session | null>(null);
  const [manageMakeupRows, setManageMakeupRows] = useState<AbsentStudentRow[]>([]);
  const [manageMakeupLoading, setManageMakeupLoading] = useState(false);

  // ── Load ──────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      const supabase = createBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();
      setMyName(profile?.full_name || "");

      const [clsRes, sessRes, enrollRes] = await Promise.all([
        supabase.from("classes")
          .select("id, name, status, class_type, schedule, schedule_time, schedule_end_time, total_sessions, sessions_done, start_date")
          .eq("id", classId)
          .single(),
        supabase.from("sessions")
          .select("*")
          .eq("class_id", classId)
          .order("session_no"),
        supabase.from("enrollments")
          .select("students(id, full_name, email, phone)")
          .eq("class_id", classId)
          .eq("status", "active"),
      ]);

      const sessData = (sessRes.data as Session[]) || [];
      setCls(clsRes.data as ClassInfo | null);
      setSessions(sessData);

      const clsName = clsRes.data?.name || "";
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
      }

      setEnrolled(
        ((enrollRes.data || []) as unknown as { students: { id: string; full_name: string; email: string | null; phone: string | null } | null }[])
          .map((e) => e.students)
          .filter(Boolean) as { id: string; full_name: string; email: string | null; phone: string | null }[]
      );
      setLoading(false);
    }
    load().catch(console.error);
  }, [classId]);

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
      .eq("class_id", classId)
      .eq("status", "active");

    const { data: existing } = await supabase
      .from("session_attendance")
      .select("student_id,student_name,attendance_status,note")
      .eq("session_id", s.id);

    const sessionRef = `${s.class_name}#${s.session_no}#${s.session_date}`;
    const { data: makeupRows } = await supabase
      .from("attendance_makeup")
      .select("*")
      .eq("session_ref", sessionRef);

    const makeupByStudent: Record<string, AttendanceMakeup> = {};
    ((makeupRows || []) as AttendanceMakeup[]).forEach((m) => {
      makeupByStudent[m.student_name] = m;
    });
    setAttendMakeupByStudent(makeupByStudent);

    const existingByStudentId: Record<string, { attendance_status: string; note: string }> = {};
    const existingByStudentName: Record<string, { attendance_status: string; note: string }> = {};
    (existing || []).forEach((a: { student_id: string | null; student_name: string | null; attendance_status: string; note: string }) => {
      if (a.student_id) existingByStudentId[a.student_id] = a;
      if (a.student_name) existingByStudentName[a.student_name] = a;
    });

    const list: StudentAttendance[] = ((enrollData || []) as unknown as { student: Student }[]).map((row) => ({
      ...row.student,
      attendance_status: ((existingByStudentId[row.student.id] || existingByStudentName[row.student.full_name])?.attendance_status as StudentAttendance["attendance_status"]) || "on_time",
      note: (() => {
        const base = (existingByStudentId[row.student.id] || existingByStudentName[row.student.full_name])?.note || "";
        const mk = makeupByStudent[row.student.full_name];
        if (!mk) return base;
        const target = mk.target_session_ref ? sessions.find(ss => `${ss.class_name}#${ss.session_no}#${ss.session_date}` === mk.target_session_ref) : null;
        const statusText = mk.is_completed
          ? "Đã bù xong"
          : target
            ? (target.status === SESSION_STATUS.DONE ? "Đã bù xong" : "Đã xếp bù - chưa xong")
            : "Đã xếp học bù";
        return [base, `Học bù: ${mk.note || statusText} (${statusText})`].filter(Boolean).join(" | ");
      })(),
    }));

    setAttendStudents(list);
    setAttendLoading(false);
  }

  async function markMakeupCompleted(studentName: string, opts?: { sessionRef?: string; session?: Session }) {
    const resolvedSessionRef = opts?.sessionRef
      || (opts?.session ? `${opts.session.class_name}#${opts.session.session_no}#${opts.session.session_date}` : null)
      || (attendSession ? `${attendSession.class_name}#${attendSession.session_no}#${attendSession.session_date}` : null);
    if (!resolvedSessionRef) return;
    const supabase = createBrowserClient();
    const { error } = await supabase
      .from("attendance_makeup")
      .update({
        is_completed: true,
        completed_at: new Date().toISOString(),
        completed_by: myName || null,
      })
      .eq("session_ref", resolvedSessionRef)
      .eq("student_name", studentName);
    if (error) {
      toast.error(error.message || "Không thể cập nhật trạng thái học bù");
      return;
    }
    toast.success("Đã đánh dấu hoàn thành học bù");
    const sessionRefs = sessions.map((s) => `${s.class_name}#${s.session_no}#${s.session_date}`);
    if (sessionRefs.length > 0) {
      const makeupRes = await supabase.from("attendance_makeup").select("*").in("session_ref", sessionRefs);
      setMakeupRows((makeupRes.data || []) as AttendanceMakeup[]);
    }
    if (attendSession) await openAttendance(attendSession, attendViewOnly);
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

    setEvalStudents(
      ((attData.data || []) as { student_name: string; student_id: string; attendance_status: string }[])
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

  // ── Makeup ────────────────────────────────────────────────────
  function makeSessionRef(s: Pick<Session, "class_name" | "session_no" | "session_date">): string {
    return `${s.class_name}#${s.session_no}#${s.session_date}`;
  }

  function makeMakeupNote(target: Session): string {
    return `Bù slot: ${target.session_date}${target.session_time ? ` ${target.session_time}` : ""}, Buổi #${target.session_no}`;
  }

  function toDateInputValue(dbDate: string | null | undefined): string {
    if (!dbDate) return "";
    // Support dd/MM/yyyy or yyyy-MM-dd
    let d: Date | null = null;
    if (dbDate.includes("/")) {
      const parts = dbDate.split("/");
      if (parts.length === 3) {
        const [dd, mm, yyyy] = parts;
        const parsed = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
        d = isNaN(parsed.getTime()) ? null : parsed;
      }
    } else {
      const parsed = new Date(dbDate);
      d = isNaN(parsed.getTime()) ? null : parsed;
    }
    if (!d) return "";
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${dd}`;
  }

  function formatYmdToDDMMYYYY(ymd: string): string {
    // ymd: yyyy-MM-dd
    const m = ymd.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return ymd;
    const [, y, mm, dd] = m;
    return `${dd}/${mm}/${y}`;
  }

  function buildOtherSessionNote(dateYmd: string, timeStr: string): string {
    if (!dateYmd) return "";
    if (!timeStr) return "";
    const absentBuoiNo = attendSession?.session_no ?? "";
    return `Bù slot: ${formatYmdToDDMMYYYY(dateYmd)} ${timeStr}, Buổi #${absentBuoiNo}`;
  }

  function parseMakeupNote(note: string | null | undefined): { dateYmd: string; time: string } | null {
    if (!note) return null;
    const m = note.match(/Bù slot:\s*([0-9]{1,2})\/([0-9]{1,2})\/([0-9]{4})(?:\s+([0-9]{2}:[0-9]{2}))?/i);
    if (!m) return null;
    const dd = m[1].padStart(2, "0");
    const mm = m[2].padStart(2, "0");
    const yyyy = m[3];
    const time = m[4] || "";
    return { dateYmd: `${yyyy}-${mm}-${dd}`, time };
  }

  async function openMakeup(studentId: string, studentName: string, absentReason: string, session: Session) {
    const absentSessionRef = makeSessionRef(session);

    const defaultDateYmd = toDateInputValue(session.session_date);
    const defaultTime = session.session_time || "";

    setMakeup({ studentName, sessionRef: absentSessionRef, makeupType: "other_session", targetSessionRef: "", note: "" });
    setMakeupAbsentReason(absentReason || "");
    setCandidateMakeupSessions([]);
    setCandidateMakeupDate(defaultDateYmd);
    setMakeupOtherTime(defaultTime);

    const supabase = createBrowserClient();

    // similar_group: buổi bù trong lớp hiện tại
    const { data: upcomingInClass } = await supabase
      .from("sessions")
      .select("*")
      .eq("class_id", classId)
      .eq("status", SESSION_STATUS.UPCOMING)
      .order("session_no");
    setUpcomingSessions((upcomingInClass as Session[]) || []);

    // Prefill from existing saved makeup row if present
    const { data: existingMakeup } = await supabase
      .from("attendance_makeup")
      .select("*")
      .eq("session_ref", absentSessionRef)
      .eq("student_name", studentName)
      .maybeSingle();
    const existing = existingMakeup as AttendanceMakeup | null;
    const parsed = parseMakeupNote(existing?.note);
    const nextDate = parsed?.dateYmd || defaultDateYmd;
    const nextTime = parsed?.time || defaultTime;

    setCandidateMakeupDate(nextDate);
    setMakeupOtherTime(nextTime);
    setMakeup(prev => prev ? {
      ...prev,
      makeupType: "other_session",
      targetSessionRef: existing?.target_session_ref || "",
      note: existing?.note || (nextTime ? buildOtherSessionNote(nextDate, nextTime) : ""),
    } : prev);
  }

  async function handleSaveMakeup() {
    if (!makeup) return;
    if (makeup.makeupType === "other_session") {
      if (!makeup.note.trim()) {
        toast.error("Vui lòng nhập ghi chú");
        return;
      }
    }
    setSavingMakeup(true);
    try {
      const supabase = createBrowserClient();
      const { error } = await supabase.from("attendance_makeup").upsert({
        session_ref: makeup.sessionRef,
        student_name: makeup.studentName,
        makeup_type: makeup.makeupType,
        target_session_ref: makeup.targetSessionRef || null,
        note: makeup.note || null,
        approved_by: myName || null,
      }, { onConflict: "session_ref,student_name" });
      if (error) throw new Error(error.message);
      toast.success(`Đã xếp học bù cho ${makeup.studentName}`);
      setMakeup(null);
      const sessionRefs = sessions.map((s) => `${s.class_name}#${s.session_no}#${s.session_date}`);
      if (sessionRefs.length > 0) {
        const makeupRes = await supabase.from("attendance_makeup").select("*").in("session_ref", sessionRefs);
        const rows = (makeupRes.data || []) as AttendanceMakeup[];
        setMakeupRows(rows);
      }
      if (attendSession) {
        await openAttendance(attendSession, attendViewOnly);
      }
      if (manageMakeupSession) {
        await openManageMakeup(manageMakeupSession);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setSavingMakeup(false);
    }
  }

  async function openManageMakeup(session: Session) {
    setManageMakeupSession(session);
    setManageMakeupRows([]);
    setManageMakeupLoading(true);
    const supabase = createBrowserClient();
    const { data } = await supabase
      .from("session_attendance")
      .select("student_id,student_name,note")
      .eq("session_id", session.id)
      .eq("attendance_status", ATTENDANCE_STATUS.ABSENT);
    setManageMakeupRows((data || []) as AbsentStudentRow[]);
    setManageMakeupLoading(false);
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
          <Link href="/teacher/courses"><Button variant="secondary" className="mt-4">Quay lại</Button></Link>
        </div>
      </PageWrapper>
    );
  }

  const statusInfo = STATUS_MAP[cls.status] || { label: cls.status, variant: "gray" as const };
  const doneSessions = sessions.filter((s) => s.status === SESSION_STATUS.DONE).length;
  const progress = cls.total_sessions > 0 ? Math.min(100, (doneSessions / cls.total_sessions) * 100) : 0;
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
    let late = 0;
    let absent_unresolved = 0;
    let makeup_completed = 0;
    const absent_details: string[] = [];

    sessions.forEach((s) => {
      const sRef = `${s.class_name}#${s.session_no}#${s.session_date}`;
      const att = attendanceBySessionRefAndStudent[`${sRef}::${st.full_name}`];
      if (!att) return;
      if (att.attendance_status === ATTENDANCE_STATUS.ON_TIME) {
        on_time += 1;
        return;
      }
      if (att.attendance_status === ATTENDANCE_STATUS.LATE) {
        late += 1;
        return;
      }

      const makeup = makeupBySessionRefAndStudent[`${sRef}::${st.full_name}`];
      const targetStatus = makeup?.target_session_ref ? targetSessionStatusByRef[makeup.target_session_ref] : undefined;
      const done = !!makeup?.is_completed || targetStatus === SESSION_STATUS.DONE;
      if (done) {
        makeup_completed += 1;
      } else {
        absent_unresolved += 1;
        absent_details.push(
          `Buổi #${s.session_no} (${s.session_date || "–"})${makeup?.note ? `: ${makeup.note}` : ""}`
        );
      }
    });

    return {
      student_id: st.id,
      student_name: st.full_name,
      on_time,
      late,
      absent_unresolved,
      makeup_completed,
      learned_total: on_time + late + makeup_completed,
      absent_details,
    };
  });

  return (
    <PageWrapper>
      {/* Back */}
      <div className="mb-4">
        <Link href="/teacher/courses">
          <Button variant="ghost" size="sm" icon={<ArrowLeft className="w-4 h-4" />}>Lớp học của tôi</Button>
        </Link>
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
      <div className="flex gap-1 bg-gray-100 p-1 rounded-2xl mb-5 w-fit">
        {([
          { id: "sessions", label: "Lịch học & Điểm danh", icon: <ClipboardList className="w-4 h-4" /> },
          { id: "students", label: "Học viên",             icon: <Users className="w-4 h-4" /> },
        ] as const).map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${tab === t.id ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"}`}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* ── Tab: Lịch học & Điểm danh ── */}
      {tab === "sessions" && (
        <Card className="overflow-hidden">
          {sessions.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">Chưa có buổi học nào được tạo cho lớp này</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <th className="text-left px-4 py-3">Buổi</th>
                  <th className="text-left px-4 py-3">Thứ</th>
                  <th className="text-left px-4 py-3">Ngày</th>
                  <th className="text-left px-4 py-3">Giờ</th>
                  <th className="text-left px-4 py-3">Link học</th>
                  <th className="text-left px-4 py-3">Chủ đề</th>
                  <th className="text-left px-4 py-3">Trạng thái</th>
                  <th className="text-left px-4 py-3">Học bù</th>
                  <th className="text-left px-4 py-3">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sessions.map((s) => {
                  const isDone = s.status === SESSION_STATUS.DONE;
                  const isCancelled = s.status === SESSION_STATUS.CANCELLED;
                  const day = sessionDayLabel(s.session_date || null);
                  const sessionRef = `${s.class_name}#${s.session_no}#${s.session_date}`;
                  const hasEval = evalledRefs.has(sessionRef);
                  const makeupStat = sessionMakeupStats[sessionRef] || { assigned: 0, completed: 0, pending: 0 };
                  const makeupList = makeupRowsBySessionRef[sessionRef] || [];
                  const absentCount = attendanceRows.filter(
                    (r) => r.session_ref === sessionRef && r.attendance_status === ATTENDANCE_STATUS.ABSENT
                  ).length;
                  const hasAnyMakeup = makeupStat.assigned > 0;
                  const isExpanded = !!expandedMakeupBySessionRef[sessionRef];
                  const visibleMakeupList = isExpanded ? makeupList : makeupList.slice(0, 1);
                  const rows = [
                      <tr key={s.id} className={`transition-colors ${isDone ? "bg-gray-50/50" : "hover:bg-gray-50"}`}>
                        <td className="px-4 py-3">
                          <div className="w-8 h-8 bg-brand-100 rounded-lg flex items-center justify-center text-xs font-bold text-brand-700">
                            #{s.session_no}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-bold px-2 py-1 rounded-lg ${day ? "bg-emerald-100 text-emerald-700" : "text-gray-400"}`}>
                            {day || "–"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-800">{s.session_date || "–"}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{s.session_time || "–"}</td>
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
                        <td className="px-4 py-3">
                          {isDone
                            ? <Badge variant="success">✓ Hoàn thành</Badge>
                            : isCancelled
                              ? <Badge variant="danger">Đã hủy</Badge>
                              : <Badge variant="info">Sắp tới</Badge>}
                        </td>
                        <td className="px-4 py-3">
                          {makeupStat.assigned > 0 ? (
                            <div className="text-xs">
                              <p className="text-sky-700 font-semibold">Đã xếp: {makeupStat.assigned}</p>
                              <p className="text-emerald-700">Hoàn thành: {makeupStat.completed}</p>
                              <p className="text-amber-700">Chờ bù: {makeupStat.pending}</p>
                              {makeupList.length > 1 && (
                                <button
                                  type="button"
                                  className="mt-1 text-[11px] text-sky-700 underline"
                                  onClick={() =>
                                    setExpandedMakeupBySessionRef((prev) => ({
                                      ...prev,
                                      [sessionRef]: !prev[sessionRef],
                                    }))
                                  }
                                >
                                  {isExpanded ? "Thu gọn" : `Mở rộng (${makeupList.length})`}
                                </button>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">Không có</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            {!isDone && !isCancelled && (
                              <Button size="sm" variant="outline"
                                icon={<ClipboardList className="w-3.5 h-3.5" />}
                                onClick={() => openAttendance(s, false)}>
                                Điểm danh
                              </Button>
                            )}
                            {isDone && (
                              <>
                                <Button size="sm" variant="outline"
                                  icon={<ClipboardList className="w-3.5 h-3.5 text-emerald-600" />}
                                  onClick={() => openAttendance(s, true)}>
                                  Xem ĐD
                                </Button>
                                {absentCount > 0 && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className={hasAnyMakeup ? "text-sky-700 border-sky-200 bg-sky-50 hover:bg-sky-100" : ""}
                                    onClick={() => openManageMakeup(s)}
                                  >
                                    {hasAnyMakeup ? `Đã xếp học bù (${makeupStat.assigned})` : "Xếp học bù"}
                                  </Button>
                                )}
                                <Button size="sm"
                                  variant={hasEval ? "outline" : "ghost"}
                                  className={hasEval ? "text-amber-600 border-amber-200 bg-amber-50 hover:bg-amber-100" : ""}
                                  icon={<Star className={`w-3.5 h-3.5 ${hasEval ? "fill-current text-amber-500" : "text-amber-400"}`} />}
                                  onClick={() => openEval(s)}>
                                  {hasEval ? "Xem lại ĐG" : "Đánh giá"}
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                  ];

                  visibleMakeupList.forEach((mk, idx) => {
                        const parsedTarget = parseSessionRef(mk.target_session_ref);
                        const targetDate = parsedTarget?.session_date || "";
                        const noteMatch = mk.note?.match(/Bù slot:\s*([0-9]{1,2}\/[0-9]{1,2}\/[0-9]{4})(?:\s+([0-9]{2}:[0-9]{2}))?/i);
                        const noteDate = noteMatch ? `${noteMatch[1]}${noteMatch[2] ? ` ${noteMatch[2]}` : ""}` : "";
                        const resolvedMakeupDate = targetDate || noteDate;
                        const isMkDone = !!mk.is_completed || (mk.target_session_ref ? targetSessionStatusByRef[mk.target_session_ref] === SESSION_STATUS.DONE : false);
                        rows.push(
                          <tr key={`${s.id}-makeup-${idx}`} className="bg-sky-50/40">
                            <td className="px-4 py-2" colSpan={2}>
                              <span className="text-xs font-semibold text-sky-700">Học bù</span>
                            </td>
                            <td className="px-4 py-2 text-xs text-sky-700" colSpan={3}>
                              Học viên: <b>{mk.student_name}</b> · Ngày gốc: {`${s.session_date || "Chưa cập nhật"}${s.session_time ? ` ${s.session_time}` : ""}`} · Ngày bù: {resolvedMakeupDate || "Chưa cập nhật dữ liệu"}
                            </td>
                            <td className="px-4 py-2">
                              {isMkDone ? <Badge variant="success">Đã điểm danh bù</Badge> : <Badge variant="warning">Chờ điểm danh bù</Badge>}
                            </td>
                            <td className="px-4 py-2" colSpan={2}>
                              {!isMkDone && (
                                <Button size="sm" variant="outline" onClick={() => markMakeupCompleted(mk.student_name, { sessionRef })}>
                                  Điểm danh slot bù
                                </Button>
                              )}
                              {!mk.target_session_ref && !resolvedMakeupDate && (
                                <p className="mt-1 text-[11px] text-amber-700">Chưa có ngày bù cụ thể. Vui lòng cập nhật dữ liệu học bù.</p>
                              )}
                            </td>
                          </tr>
                        );
                      });

                  return rows;
                })}
              </tbody>
            </table>
          )}
        </Card>
      )}

      {/* ── Tab: Học viên ── */}
      {tab === "students" && (
        <Card className="p-5">
          <h3 className="section-title mb-4">Danh sách học viên ({enrolled.length})</h3>
          {enrolled.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">Chưa có học viên nào trong lớp</p>
            </div>
          ) : (
            <div className="space-y-2">
              {studentSummaries.map((sum, i) => (
                <div key={sum.student_id} className="p-3 rounded-xl border border-gray-100 bg-white">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-brand-100 rounded-full flex items-center justify-center text-xs font-bold text-brand-600 shrink-0">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{sum.student_name}</p>
                      <p className="text-xs text-gray-500 truncate">
                        Tổng đã học: <b>{sum.learned_total}</b> / {sessions.length} buổi
                      </p>
                    </div>
                    <Badge variant="success">Đang học</Badge>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-3 text-xs">
                    <div className="rounded-lg bg-emerald-50 border border-emerald-100 px-2 py-1">Đúng giờ: <b>{sum.on_time}</b></div>
                    <div className="rounded-lg bg-amber-50 border border-amber-100 px-2 py-1">Trễ: <b>{sum.late}</b></div>
                    <div className="rounded-lg bg-sky-50 border border-sky-100 px-2 py-1">Vắng đã bù xong: <b>{sum.makeup_completed}</b></div>
                    <div className="rounded-lg bg-rose-50 border border-rose-100 px-2 py-1">Vắng chưa bù: <b>{sum.absent_unresolved}</b></div>
                    <div className="rounded-lg bg-gray-50 border border-gray-100 px-2 py-1">Tổng buổi: <b>{sessions.length}</b></div>
                  </div>
                  {sum.absent_details.length > 0 && (
                    <div className="mt-2 rounded-lg bg-rose-50 border border-rose-100 px-2 py-2">
                      <p className="text-xs font-semibold text-rose-700 mb-1">Buổi vắng cần theo dõi:</p>
                      {sum.absent_details.map((detail, idx) => (
                        <p key={`${sum.student_id}-${idx}`} className="text-xs text-rose-700">{detail}</p>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
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
                <span className="text-amber-600 font-semibold">
                  ⏰ {attendStudents.filter(s => s.attendance_status === ATTENDANCE_STATUS.LATE).length} muộn
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
                      { v: ATTENDANCE_STATUS.LATE,    l: "Muộn",     color: "bg-amber-100 text-amber-700 border-amber-300" },
                      { v: ATTENDANCE_STATUS.ABSENT,  l: "Vắng",     color: "bg-red-100 text-red-700 border-red-300" },
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

      {/* ── Manage Makeup Modal (after attendance done) ── */}
      <Modal
        open={!!manageMakeupSession}
        onClose={() => {
          setManageMakeupSession(null);
          setManageMakeupRows([]);
        }}
        title={manageMakeupSession ? `Xếp học bù – Buổi #${manageMakeupSession.session_no} · ${manageMakeupSession.session_date}` : "Xếp học bù"}
      >
        {manageMakeupLoading ? (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-4 border-sky-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : manageMakeupRows.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <p className="text-sm">Không có học viên vắng ở buổi này.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {manageMakeupRows.map((row) => (
              <div key={`${row.student_name}-${row.student_id || "noid"}`} className="p-3 bg-gray-50 rounded-xl">
                {(() => {
                  const manageSessionRef = manageMakeupSession
                    ? `${manageMakeupSession.class_name}#${manageMakeupSession.session_no}#${manageMakeupSession.session_date}`
                    : "";
                  const existingMakeup = makeupRows.find(
                    (mk) => mk.session_ref === manageSessionRef && mk.student_name === row.student_name
                  );
                  const isCompletedMakeup = !!existingMakeup?.is_completed
                    || (!!existingMakeup?.target_session_ref && targetSessionStatusByRef[existingMakeup.target_session_ref] === SESSION_STATUS.DONE);
                  return (
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{row.student_name}</p>
                    {row.note && <p className="text-xs text-gray-500 mt-0.5">{row.note}</p>}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className={existingMakeup ? "text-sky-700 border-sky-200 bg-sky-50 hover:bg-sky-100" : ""}
                      onClick={() => {
                        if (!manageMakeupSession) return;
                        if (!row.student_id) {
                          toast.error("Thiếu student_id, không mở được xếp học bù.");
                          return;
                        }
                        openMakeup(row.student_id, row.student_name, row.note || "", manageMakeupSession).catch(console.error);
                      }}
                    >
                      {existingMakeup ? "Đã xếp học bù" : "Xếp học bù"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className={isCompletedMakeup ? "text-emerald-700 border-emerald-200 bg-emerald-50 hover:bg-emerald-100" : ""}
                      onClick={() => markMakeupCompleted(row.student_name, { session: manageMakeupSession || undefined })}
                    >
                      {isCompletedMakeup ? "Đã điểm danh slot bù" : "Điểm danh slot bù"}
                    </Button>
                  </div>
                </div>
                  );
                })()}
              </div>
            ))}
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

      {/* ── Makeup Modal ── */}
      <Modal open={!!makeup} onClose={() => setMakeup(null)} title={`Xếp Học Bù – ${makeup?.studentName}`}>
        {makeup && (
          <div className="space-y-4">
            <p className="text-xs text-gray-500">Buổi vắng: <span className="font-mono text-gray-700">{makeup.sessionRef}</span></p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Loại học bù</label>
              <div className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-medium text-sky-700">
                Xếp buổi khác / ghi chú
              </div>
            </div>

            {makeup.makeupType === "other_session" && (
              <div className="space-y-3">
                <div className="rounded-xl bg-sky-50 border border-sky-100 p-3">
                  <p className="text-xs text-sky-800 font-semibold mb-1">Lý do vắng</p>
                  <p className="text-xs text-sky-900">{makeupAbsentReason || "–"}</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Chọn ngày bù *</label>
                    <input
                      type="date"
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                      value={candidateMakeupDate}
                      onChange={(e) => {
                        const nextDate = e.target.value;
                        setCandidateMakeupDate(nextDate);
                        setMakeup((p) => p ? {
                          ...p,
                          targetSessionRef: "",
                          note: buildOtherSessionNote(nextDate, makeupOtherTime),
                        } : p);
                      }}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Giờ bù *</label>
                    <input
                      type="time"
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                      value={makeupOtherTime}
                      onChange={(e) => {
                        const nextTime = e.target.value;
                        setMakeupOtherTime(nextTime);
                        setMakeup((p) => p ? {
                          ...p,
                          targetSessionRef: "",
                          note: buildOtherSessionNote(candidateMakeupDate, nextTime),
                        } : p);
                      }}
                      required
                    />
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ghi chú{makeup.makeupType === "other_session" && " *"}
              </label>
              <textarea
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                rows={2}
                placeholder="Sẽ bù theo slot đã chọn..."
                value={makeup.note}
                onChange={(e) => setMakeup((p) => p ? { ...p, note: e.target.value } : p)} />
            </div>

            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setMakeup(null)}>Hủy</Button>
              <Button type="button" className="flex-1" loading={savingMakeup} onClick={handleSaveMakeup}>Lưu học bù</Button>
            </div>
          </div>
        )}
      </Modal>
    </PageWrapper>
  );
}
