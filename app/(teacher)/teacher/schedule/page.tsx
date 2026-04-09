"use client";
import PageWrapper from "@/components/layouts/PageWrapper";
import { Card } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { createBrowserClient } from "@/lib/supabase/client";
import { SESSION_STATUS, ATTENDANCE_STATUS } from "@/lib/constants";
import { parseSessionDate } from "@/lib/scheduleUtils";
import {
  ChevronLeft, ChevronRight, ClipboardList, Star, WrapText, Calendar,
} from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import toast from "react-hot-toast";
import type { AttendanceMakeup, MakeupStatusRow, Session, Student } from "@/types";

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

interface MakeupForm {
  studentName: string;
  sessionRef: string;
  makeupType: "other_session";
  targetSessionRef: string;
  note: string;
}

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} type="button" onClick={() => onChange(n)}
          className={`w-7 h-7 transition-colors ${n <= value ? "text-amber-400" : "text-gray-300 hover:text-amber-300"}`}>
          <Star className="w-5 h-5 fill-current" />
        </button>
      ))}
    </div>
  );
}

const MONTH_NAMES = [
  "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
  "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12",
];
const DAY_HEADERS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

// Returns the Monday of the week containing `date`
function getMondayOf(d: Date): Date {
  const clone = new Date(d);
  const day = clone.getDay();
  clone.setDate(clone.getDate() - (day === 0 ? 6 : day - 1));
  clone.setHours(0, 0, 0, 0);
  return clone;
}

// Build the 6-week grid (42 cells) for a given month
function buildCalendarGrid(year: number, month: number): Date[] {
  const firstDay = new Date(year, month, 1);
  const lastDay  = new Date(year, month + 1, 0);
  const gridStart = getMondayOf(firstDay);
  const gridEnd   = new Date(gridStart);
  gridEnd.setDate(gridEnd.getDate() + 42);

  const cells: Date[] = [];
  const cursor = new Date(gridStart);
  while (cursor < gridEnd) {
    cells.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  // Trim last empty row if last day of month is before it
  if (lastDay < cells[34]) return cells.slice(0, 35);
  return cells;
}

// Map session date string to YYYY-MM-DD key
function sessionKey(s: Session): string | null {
  const d = parseSessionDate(s.session_date || "");
  if (!d) return null;
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function makeSessionRefFromSession(s: Session): string | null {
  if (!s.class_name || s.session_no == null || !s.session_date) return null;
  return `${s.class_name}#${s.session_no}#${s.session_date}`;
}

function parseSessionRef(sessionRef: string | null | undefined): {
  class_name: string;
  session_no: number | null;
  session_date: string;
} | null {
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

function parseOtherSessionMakeupNote(note: string | null | undefined): { dateText: string; time: string | null } | null {
  if (!note) return null;
  // Expected: "Bù slot: dd/MM/yyyy HH:mm, Buổi #X"
  const m = note.match(/Bù slot:\s*([0-9]{1,2}\/[0-9]{1,2}\/[0-9]{4})(?:\s+([0-9]{2}:[0-9]{2}))?/i);
  if (!m) return null;
  const dateText = m[1];
  const time = m[2] ? m[2] : null;
  return { dateText, time };
}

type MakeupEvent = Session & {
  kind: "makeup";
  student_name: string;
  note: string | null;
};

const CLASS_COLORS = [
  "bg-emerald-100 text-emerald-800 border-emerald-200",
  "bg-blue-100 text-blue-800 border-blue-200",
  "bg-violet-100 text-violet-800 border-violet-200",
  "bg-rose-100 text-rose-800 border-rose-200",
  "bg-amber-100 text-amber-800 border-amber-200",
  "bg-cyan-100 text-cyan-800 border-cyan-200",
  "bg-pink-100 text-pink-800 border-pink-200",
  "bg-indigo-100 text-indigo-800 border-indigo-200",
];

export default function InstructorSchedulePage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const today = useMemo(() => new Date(), []);
  const [curMonth, setCurMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [loading, setLoading] = useState(true);
  const [myName, setMyName] = useState("");
  const [makeupEvents, setMakeupEvents] = useState<MakeupEvent[]>([]);

  // Selected-day popover state
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Attendance modal
  const [attendSession, setAttendSession] = useState<Session | null>(null);
  const [attendStudents, setAttendStudents] = useState<StudentAttendance[]>([]);
  const [attendMakeupByStudent, setAttendMakeupByStudent] = useState<Record<string, AttendanceMakeup>>({});
  const [attendLoading, setAttendLoading] = useState(false);
  const [savingAttend, setSavingAttend] = useState(false);
  const [attendViewOnly, setAttendViewOnly] = useState(false);

  // Evaluation modal
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
  const [candidateMakeupDate, setCandidateMakeupDate] = useState<string>(""); // legacy (dropdown) - will be replaced by calendar
  const [makeupSelectedDateKey, setMakeupSelectedDateKey] = useState<string>("");
  const [makeupCurMonth, setMakeupCurMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [makeupOtherTime, setMakeupOtherTime] = useState<string>(""); // HH:mm
  const [savingMakeup, setSavingMakeup] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createBrowserClient();
      const { data: { session: authSession } } = await supabase.auth.getSession();
      if (!authSession?.user) { setLoading(false); return; }

      const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", authSession.user.id).single();
      setMyName(profile?.full_name || "");

      const { data: classData } = await supabase.from("classes").select("id").eq("teacher_id", authSession.user.id);
      const classIds = (classData || []).map((c: { id: string }) => c.id);

      if (classIds.length === 0) { setLoading(false); return; }

      const { data } = await supabase
        .from("sessions")
        .select("*")
        .in("class_id", classIds)
        .order("session_date");

      const sessData = (data as Session[]) || [];
      setSessions(sessData);

      // Merge "other_session" makeups into the calendar (they don't exist as rows in `sessions`)
      try {
        const classNames = Array.from(new Set(sessData.map(s => s.class_name).filter(Boolean))) as string[];
        if (classNames.length > 0) {
          const rpcResults = await Promise.all(
            classNames.map((cn) => supabase.rpc("get_makeup_status", { p_class_name: cn }))
          );
          const allMakeups = (rpcResults.flatMap((r: any) => (r.data as MakeupStatusRow[]) || [])) as MakeupStatusRow[];

          const otherMakeups = allMakeups.filter(r =>
            r.has_makeup &&
            r.makeup_type === "other_session" &&
            !!r.note
          );

          const events: MakeupEvent[] = otherMakeups.map((row, idx) => {
            const parsedNote = parseOtherSessionMakeupNote(row.note);
            if (!parsedNote) return null;

            const parsedAbsentRef = parseSessionRef(row.session_ref);
            if (!parsedAbsentRef) return null;

            const missedSession = sessData.find(s => makeSessionRefFromSession(s) === row.session_ref);
            const class_id = missedSession?.class_id ?? null;
            const class_name = missedSession?.class_name ?? parsedAbsentRef.class_name;

            return {
              id: -1_000_000 - idx,
              kind: "makeup",
              student_name: row.student_name,
              note: row.note,
              class_id,
              class_name,
              session_no: parsedAbsentRef.session_no,
              session_date: parsedNote.dateText,
              session_time: parsedNote.time,
              topic: null,
              homework: null,
              status: SESSION_STATUS.UPCOMING,
              teacher_id: null,
              created_at: new Date().toISOString(),
            };
          }).filter(Boolean) as MakeupEvent[];

          setMakeupEvents(events);
        } else {
          setMakeupEvents([]);
        }
      } catch (err) {
        console.error("Failed to load makeup events", err);
        setMakeupEvents([]);
      }

      // Load which sessions already have evaluations
      if (sessData.length > 0 && profile?.full_name) {
        const { data: evalData } = await supabase
          .from("session_class_evaluation")
          .select("session_ref")
          .eq("evaluated_by", profile.full_name);
        if (evalData) {
          setEvalledRefs(new Set((evalData as { session_ref: string }[]).map(e => e.session_ref)));
        }
      }

      setLoading(false);
    }
    load().catch(console.error);
  }, []);

  // Assign a stable color to each class name
  const classColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    let idx = 0;
    for (const s of sessions) {
      const name = s.class_name || s.class_id || "";
      if (name && !map[name]) {
        map[name] = CLASS_COLORS[idx % CLASS_COLORS.length];
        idx++;
      }
    }
    return map;
  }, [sessions]);

  // Build session map keyed by date string
  const sessionMap = useMemo(() => {
    const map: Record<string, Session[]> = {};
    for (const s of sessions) {
      const key = sessionKey(s);
      if (!key) continue;
      if (!map[key]) map[key] = [];
      map[key].push(s);
    }
    return map;
  }, [sessions]);

  const makeupMap = useMemo(() => {
    const map: Record<string, MakeupEvent[]> = {};
    for (const ev of makeupEvents) {
      const key = sessionKey(ev);
      if (!key) continue;
      if (!map[key]) map[key] = [];
      map[key].push(ev);
    }
    return map;
  }, [makeupEvents]);

  // Calendar grid cells
  const cells = useMemo(
    () => buildCalendarGrid(curMonth.getFullYear(), curMonth.getMonth()),
    [curMonth]
  );

  const prevMonth = () => setCurMonth(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const nextMonth = () => setCurMonth(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  const goToday   = () => { setCurMonth(new Date(today.getFullYear(), today.getMonth(), 1)); setSelectedDate(today); };

  // Makeup calendar navigation
  const prevMakeupMonth = () => setMakeupCurMonth(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const nextMakeupMonth = () => setMakeupCurMonth(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  const goMakeupToday = () => {
    setMakeupCurMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    setMakeupSelectedDateKey(dateKey(today));
  };

  // Sessions on selected date
  const selectedDaySessions = useMemo(() => {
    if (!selectedDate) return [];
    const key = dateKey(selectedDate);
    return [...(sessionMap[key] || []), ...(makeupMap[key] || [])];
  }, [selectedDate, sessionMap, makeupMap]);

  const makeupCells = useMemo(
    () => buildCalendarGrid(makeupCurMonth.getFullYear(), makeupCurMonth.getMonth()),
    [makeupCurMonth]
  );

  const makeupSessionMap = useMemo(() => {
    const map: Record<string, Session[]> = {};
    for (const s of candidateMakeupSessions) {
      const key = sessionDateKeyFromSession(s);
      if (!key) continue;
      if (!map[key]) map[key] = [];
      map[key].push(s);
    }
    for (const k of Object.keys(map)) {
      map[k].sort((a, b) => {
        const an = a.session_no ?? 0;
        const bn = b.session_no ?? 0;
        return an - bn;
      });
    }
    return map;
  }, [candidateMakeupSessions]);

  const makeupSelectedSessions = useMemo(() => {
    if (!makeupSelectedDateKey) return [];
    return makeupSessionMap[makeupSelectedDateKey] || [];
  }, [makeupSelectedDateKey, makeupSessionMap]);

  // ── Attendance ──────────────────────────────────────────────────
  async function openAttendance(s: Session, viewOnly = false) {
    setAttendViewOnly(viewOnly);
    setAttendSession(s);
    setAttendStudents([]);
    setAttendLoading(true);

    const supabase = createBrowserClient();
    if (!s.class_id) { setAttendLoading(false); toast.error("Buổi học chưa được gắn lớp"); return; }

    const { data: enrollData } = await supabase
      .from("enrollments")
      .select("student:students!student_id(id,full_name,email,phone,organization_id,profile_id,parent_info,created_at,updated_at)")
      .eq("class_id", s.class_id)
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

    const list: StudentAttendance[] = ((enrollData || []) as unknown as { student: Student }[]).map(row => ({
      ...row.student,
      attendance_status: ((existingByStudentId[row.student.id] || existingByStudentName[row.student.full_name])?.attendance_status as StudentAttendance["attendance_status"]) || "on_time",
      note: (() => {
        const base = (existingByStudentId[row.student.id] || existingByStudentName[row.student.full_name])?.note || "";
        const mk = makeupByStudent[row.student.full_name];
        if (!mk) return base;
        const target = mk.target_session_ref ? sessions.find(ss => makeSessionRefFromSession(ss) === mk.target_session_ref) : null;
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

  async function handleSaveAttendance() {
    if (!attendSession) return;
    setSavingAttend(true);
    try {
      const supabase = createBrowserClient();
      const sessionRef = `${attendSession.class_name}#${attendSession.session_no}#${attendSession.session_date}`;
      const records = attendStudents.map(st => ({
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

      toast.success("Đã lưu điểm danh!");

      await supabase.from("sessions").update({ status: SESSION_STATUS.DONE }).eq("id", attendSession.id);
      setSessions(prev => prev.map(x => x.id === attendSession!.id ? { ...x, status: SESSION_STATUS.DONE } : x));

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

  // ── Evaluation ──────────────────────────────────────────────────
  async function openEval(s: Session) {
    setEvalSession(s);
    setEvalClassRating(5);
    setEvalClassComment("");
    setEvalStudents([]);
    setEvalLoading(true);

    const supabase = createBrowserClient();
    const sessionRef = `${s.class_name}#${s.session_no}#${s.session_date}`;

    const { data: attData } = await supabase
      .from("session_attendance")
      .select("student_name,student_id,attendance_status")
      .eq("session_id", s.id);

    const { data: makeupRows } = await supabase
      .from("attendance_makeup")
      .select("student_name,target_session_ref,is_completed")
      .eq("session_ref", sessionRef);

    const { data: classEval } = await supabase
      .from("session_class_evaluation")
      .select("rating,comment")
      .eq("session_ref", sessionRef)
      .maybeSingle();

    if (classEval) {
      setEvalClassRating(classEval.rating ?? 5);
      setEvalClassComment(classEval.comment ?? "");
    }

    const { data: studentEvals } = await supabase
      .from("session_student_evaluation")
      .select("student_name,rating,comment")
      .eq("session_ref", sessionRef);

    const evalMap: Record<string, { rating: number; comment: string }> = {};
    (studentEvals || []).forEach((e: { student_name: string; rating: number; comment: string }) => {
      evalMap[e.student_name] = e;
    });

    const makeupByStudent = new Map<string, { target_session_ref: string | null; is_completed?: boolean | null }>();
    ((makeupRows || []) as { student_name: string; target_session_ref: string | null; is_completed?: boolean | null }[]).forEach((m) => {
      makeupByStudent.set(m.student_name, { target_session_ref: m.target_session_ref, is_completed: m.is_completed });
    });

    const studs: StudentEval[] = ((attData || []) as { student_name: string; student_id: string; attendance_status: string }[])
      .filter((a) => {
        if (a.attendance_status !== ATTENDANCE_STATUS.ABSENT) return true;
        const mk = makeupByStudent.get(a.student_name);
        if (mk?.is_completed) return true;
        const target = mk?.target_session_ref ? sessions.find(ss => makeSessionRefFromSession(ss) === mk.target_session_ref) : null;
        return !!target && target.status === SESSION_STATUS.DONE;
      })
      .map(a => ({
        student_id: a.student_id,
        student_name: a.student_name,
        rating: evalMap[a.student_name]?.rating ?? 5,
        comment: evalMap[a.student_name]?.comment ?? "",
      }));

    setEvalStudents(studs);
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
        const rows = evalStudents.map(st => ({
          session_ref: sessionRef,
          class_name: evalSession.class_name,
          session_no: evalSession.session_no,
          session_date: evalSession.session_date,
          student_name: st.student_name,
          rating: st.rating,
          comment: st.comment || null,
          evaluated_by: myName,
        }));
        await supabase.from("session_student_evaluation").upsert(rows, { onConflict: "session_ref,student_name" });
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

  // ── Makeup ──────────────────────────────────────────────────────
  function makeSessionRef(s: Pick<Session, "class_name" | "session_no" | "session_date">): string {
    return `${s.class_name}#${s.session_no}#${s.session_date}`;
  }

  function makeMakeupNote(target: Session): string {
    return `Bù slot: ${target.session_date}${target.session_time ? ` ${target.session_time}` : ""}, Buổi #${target.session_no}`;
  }

  function formatDateKeyToDDMMYYYY(key: string): string {
    // key format: YYYY-M-D
    const parts = key.split("-");
    if (parts.length !== 3) return key;
    const y = Number(parts[0]);
    const m = Number(parts[1]);
    const d = Number(parts[2]);
    if (!y || !m && m !== 0 || !d) return key;
    const dd = String(d).padStart(2, "0");
    const mm = String(m + 1).padStart(2, "0");
    return `${dd}/${mm}/${y}`;
  }

  function buildOtherSessionNote(dateKeyStr: string, timeStr: string): string {
    if (!dateKeyStr) return "";
    if (!timeStr) return "";
    const absentBuoiNo = attendSession?.session_no ?? "";
    const dateText = formatDateKeyToDDMMYYYY(dateKeyStr);
    return `Bù slot: ${dateText} ${timeStr}, Buổi #${absentBuoiNo}`;
  }

  function parseMakeupNoteToDateKey(note: string | null | undefined): { dateKey: string; time: string } | null {
    if (!note) return null;
    const m = note.match(/Bù slot:\s*([0-9]{1,2})\/([0-9]{1,2})\/([0-9]{4})(?:\s+([0-9]{2}:[0-9]{2}))?/i);
    if (!m) return null;
    const dd = Number(m[1]);
    const mm = Number(m[2]);
    const yyyy = Number(m[3]);
    const time = m[4] || "";
    const d = new Date(yyyy, mm - 1, dd);
    if (isNaN(d.getTime())) return null;
    return { dateKey: dateKey(d), time };
  }

  function sessionDateKeyFromSession(s: Session): string | null {
    if (!s.session_date) return null;
    // DB date might be dd/MM/yyyy (parseSessionDate) or yyyy-MM-dd (fallback)
    const parsed = parseSessionDate(s.session_date);
    const d = parsed ?? (() => {
      if (!s.session_date) return null;
      const dd = new Date(s.session_date);
      return isNaN(dd.getTime()) ? null : dd;
    })();
    if (!d) return null;
    return dateKey(d);
  }

  async function openMakeup(studentId: string, studentName: string, absentReason: string, session: Session) {
    const absentSessionRef = makeSessionRef(session);

    // Note: "other_session" now only needs an arbitrary date + time.
    const defaultDateKey = sessionDateKeyFromSession(session) || dateKey(today);
    const defaultTime = session.session_time || "";

    setMakeup({
      studentName,
      sessionRef: absentSessionRef,
      makeupType: "other_session",
      targetSessionRef: "",
      note: defaultTime ? buildOtherSessionNote(defaultDateKey, defaultTime) : "",
    });
    setMakeupAbsentReason(absentReason || "");
    setCandidateMakeupSessions([]);
    setCandidateMakeupDate("");
    setMakeupSelectedDateKey(defaultDateKey);
    setMakeupOtherTime(defaultTime);

    const supabase = createBrowserClient();

    // similar_group: buổi bù trong lớp hiện tại (vẫn dùng danh sách upcoming trong lớp)
    const { data: upcomingInClass } = await supabase
      .from("sessions")
      .select("*")
      .eq("class_name", session.class_name)
      .eq("status", SESSION_STATUS.UPCOMING)
      .order("session_no");
    setUpcomingSessions((upcomingInClass as Session[]) || []);

    // other_session: nạp lịch UP-COMING của học viên (để hiển thị chip lịch),
    // nhưng việc chọn ngày bù sẽ là "bất kỳ ngày" + chọn giờ bù.
    const { data: enrollRows } = await supabase
      .from("enrollments")
      .select("class_id")
      .eq("student_id", studentId)
      .eq("status", "active");

    const classIds = (enrollRows || [])
      .map((r: { class_id: string }) => r.class_id)
      .filter(Boolean);

    if (classIds.length > 0) {
      const { data: studentSessions } = await supabase
        .from("sessions")
        .select("*")
        .in("class_id", classIds)
        .eq("status", SESSION_STATUS.UPCOMING)
        .order("session_date", { ascending: true });

      const sess = ((studentSessions as Session[]) || []).filter(s => !!s.session_date);
      setCandidateMakeupSessions(sess);
    }

    // Prefill from existing saved makeup row if present
    const { data: existingMakeup } = await supabase
      .from("attendance_makeup")
      .select("*")
      .eq("session_ref", absentSessionRef)
      .eq("student_name", studentName)
      .maybeSingle();
    const existing = existingMakeup as AttendanceMakeup | null;
    const parsed = parseMakeupNoteToDateKey(existing?.note);
    const nextDateKey = parsed?.dateKey || defaultDateKey;
    const nextTime = parsed?.time || defaultTime;
    setMakeupSelectedDateKey(nextDateKey);
    setMakeupOtherTime(nextTime);
    setMakeup((prev) => prev ? {
      ...prev,
      makeupType: "other_session",
      targetSessionRef: existing?.target_session_ref || "",
      note: existing?.note || (nextTime ? buildOtherSessionNote(nextDateKey, nextTime) : ""),
    } : prev);
  }

  async function handleSaveMakeup() {
    if (!makeup) return;
    if (makeup.makeupType === "other_session") {
      if (!makeup.note.trim()) {
        toast.error("Vui lòng nhập ghi chú cho buổi học bù");
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

      // Refresh makeup events in schedule immediately
      const classNames = Array.from(new Set(sessions.map(s => s.class_name).filter(Boolean))) as string[];
      if (classNames.length > 0) {
        const rpcResults = await Promise.all(
          classNames.map((cn) => supabase.rpc("get_makeup_status", { p_class_name: cn }))
        );
        const allMakeups = (rpcResults.flatMap((r: any) => (r.data || [])) as MakeupStatusRow[]);
        const otherMakeups = allMakeups.filter(r => r.has_makeup && r.makeup_type === "other_session" && !!r.note);
        const events: MakeupEvent[] = otherMakeups.map((row, idx) => {
          const parsedNote = parseOtherSessionMakeupNote(row.note);
          if (!parsedNote) return null;
          const parsedAbsentRef = parseSessionRef(row.session_ref);
          if (!parsedAbsentRef) return null;
          const missedSession = sessions.find(s => makeSessionRefFromSession(s) === row.session_ref);
          return {
            id: -1_000_000 - idx,
            kind: "makeup",
            student_name: row.student_name,
            note: row.note,
            class_id: missedSession?.class_id ?? null,
            class_name: missedSession?.class_name ?? parsedAbsentRef.class_name,
            session_no: parsedAbsentRef.session_no,
            session_date: parsedNote.dateText,
            session_time: parsedNote.time,
            topic: null,
            homework: null,
            status: SESSION_STATUS.UPCOMING,
            teacher_id: null,
            created_at: new Date().toISOString(),
          };
        }).filter(Boolean) as MakeupEvent[];
        setMakeupEvents(events);
      }
      if (attendSession) {
        await openAttendance(attendSession, attendViewOnly);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setSavingMakeup(false);
    }
  }

  async function markMakeupCompleted(studentName: string) {
    if (!attendSession) return;
    const sessionRef = `${attendSession.class_name}#${attendSession.session_no}#${attendSession.session_date}`;
    const supabase = createBrowserClient();
    const { error } = await supabase
      .from("attendance_makeup")
      .update({
        is_completed: true,
        completed_at: new Date().toISOString(),
        completed_by: myName || null,
      })
      .eq("session_ref", sessionRef)
      .eq("student_name", studentName);
    if (error) {
      toast.error(error.message || "Không thể cập nhật trạng thái học bù");
      return;
    }
    toast.success("Đã đánh dấu hoàn thành học bù");
    await openAttendance(attendSession, attendViewOnly);
  }

  // ── Render ──────────────────────────────────────────────────────
  const monthLabel = `${MONTH_NAMES[curMonth.getMonth()]} ${curMonth.getFullYear()}`;
  const totalThisMonth = cells.filter(d => d.getMonth() === curMonth.getMonth())
    .reduce((acc, d) => acc + (sessionMap[dateKey(d)]?.length ?? 0) + (makeupMap[dateKey(d)]?.length ?? 0), 0);

  return (
    <PageWrapper>
      <div className="page-header flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="page-title">Lịch Dạy</h1>
          <p className="page-subtitle">
            {loading ? "Đang tải..." : `${totalThisMonth} buổi trong ${monthLabel}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={prevMonth} icon={<ChevronLeft className="w-4 h-4" />} />
          <Button variant="outline" size="sm" onClick={goToday} icon={<Calendar className="w-4 h-4" />}>
            Hôm nay
          </Button>
          <span className="text-sm font-semibold text-gray-700 px-2 min-w-[120px] text-center">{monthLabel}</span>
          <Button variant="outline" size="sm" onClick={nextMonth} iconRight={<ChevronRight className="w-4 h-4" />} />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="flex gap-4">
          {/* ── Calendar Grid ── */}
          <div className="flex-1 min-w-0">
            <Card className="overflow-hidden p-0">
              {/* Day-of-week header */}
              <div className="grid grid-cols-7 border-b border-gray-100">
                {DAY_HEADERS.map(h => (
                  <div key={h}
                    className={`py-3 text-center text-xs font-semibold ${h === "CN" ? "text-rose-500" : "text-gray-500"}`}>
                    {h}
                  </div>
                ))}
              </div>

              {/* Calendar cells */}
              <div className="grid grid-cols-7">
                {cells.map((cell, idx) => {
                  const isCurrentMonth = cell.getMonth() === curMonth.getMonth();
                  const isToday = dateKey(cell) === dateKey(today);
                  const isSelected = selectedDate && dateKey(cell) === dateKey(selectedDate);
                  const dayKey = dateKey(cell);
                  const daySessions = [
                    ...(sessionMap[dayKey] || []),
                    ...(makeupMap[dayKey] || []),
                  ];
                  const isSunday = cell.getDay() === 0;
                  const isLastRow = idx >= cells.length - 7;

                  return (
                    <div
                      key={idx}
                      onClick={() => setSelectedDate(cell)}
                      className={[
                        "min-h-[90px] p-1.5 cursor-pointer transition-colors",
                        !isLastRow ? "border-b border-gray-100" : "",
                        idx % 7 !== 6 ? "border-r border-gray-100" : "",
                        isSelected ? "bg-emerald-50" : isToday ? "bg-amber-50/50" : isCurrentMonth ? "bg-white hover:bg-gray-50" : "bg-gray-50/50",
                      ].join(" ")}
                    >
                      {/* Date number */}
                      <div className="flex justify-end mb-1">
                        <span className={[
                          "text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full",
                          isToday ? "bg-emerald-600 text-white" :
                          isSelected ? "bg-emerald-100 text-emerald-700" :
                          isCurrentMonth ? (isSunday ? "text-rose-500" : "text-gray-700") : "text-gray-300",
                        ].join(" ")}>
                          {cell.getDate()}
                        </span>
                      </div>

                      {/* Session chips (show max 2, then +N more) */}
                      <div className="space-y-0.5">
                        {daySessions.slice(0, 2).map(s => {
                          const colorClass = classColorMap[s.class_name || s.class_id || ""] || CLASS_COLORS[0];
                          const isDone = s.status === SESSION_STATUS.DONE;
                          return (
                            <div
                              key={s.id}
                              onClick={e => {
                                e.stopPropagation();
                                if ((s as any).kind === "makeup") return;
                                isDone ? openEval(s) : openAttendance(s, false);
                              }}
                              title={`${s.class_name} – Buổi #${s.session_no}${s.session_time ? " " + s.session_time : ""}`}
                              className={[
                                "text-[10px] font-medium px-1.5 py-0.5 rounded-md border truncate cursor-pointer transition-opacity hover:opacity-80",
                                isDone ? "opacity-60 line-through" : "",
                                colorClass,
                              ].join(" ")}
                            >
                              {s.session_time ? `${s.session_time} ` : ""}
                              {(s.class_name || "").split(" ")[0]}
                            </div>
                          );
                        })}
                        {daySessions.length > 2 && (
                          <div className="text-[10px] text-gray-400 font-medium pl-1">
                            +{daySessions.length - 2} buổi
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Legend */}
            {Object.keys(classColorMap).length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {Object.entries(classColorMap).map(([name, color]) => (
                  <span key={name} className={`text-xs px-2 py-1 rounded-lg border font-medium ${color}`}>
                    {name}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* ── Day Detail Sidebar ── */}
          <div className="w-72 shrink-0">
            <Card className="p-4 sticky top-4">
              {selectedDate ? (
                <>
                  <div className="mb-4">
                    <h3 className="text-sm font-bold text-gray-900">
                      {selectedDate.toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {selectedDaySessions.length === 0 ? "Không có buổi học" : `${selectedDaySessions.length} buổi học`}
                    </p>
                  </div>

                  {selectedDaySessions.length === 0 ? (
                    <div className="text-center py-8 text-gray-300">
                      <Calendar className="w-10 h-10 mx-auto mb-2" />
                      <p className="text-xs">Ngày trống</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {selectedDaySessions.map(s => {
                        const isMakeup = (s as any).kind === "makeup";
                        const isDone = !isMakeup && s.status === SESSION_STATUS.DONE;
                        const colorClass = classColorMap[s.class_name || s.class_id || ""] || CLASS_COLORS[0];
                        const sRef = isMakeup ? "" : `${s.class_name}#${s.session_no}#${s.session_date}`;
                        const hasEval = isMakeup ? false : evalledRefs.has(sRef);
                        return (
                          <div key={s.id} className="rounded-xl border border-gray-100 overflow-hidden">
                            <div className={`px-3 py-2 ${colorClass}`}>
                              <p className="text-xs font-bold truncate">{s.class_name}</p>
                              {s.session_time && (
                                <p className="text-[10px] opacity-70">{s.session_time}</p>
                              )}
                            </div>
                            <div className="px-3 py-2 bg-white space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-500">
                                  {isMakeup ? `Buổi bù (cho buổi #${s.session_no})` : `Buổi #${s.session_no}`}
                                </span>
                                {isMakeup ? (
                                  <Badge variant="warning" className="text-[10px]">Buổi bù</Badge>
                                ) : isDone ? (
                                  <Badge variant="success" className="text-[10px]">✓ Xong</Badge>
                                ) : (
                                  <Badge variant="warning" className="text-[10px]">Sắp tới</Badge>
                                )}
                              </div>
                              {s.topic && (
                                <p className="text-xs text-gray-600 line-clamp-2">{s.topic}</p>
                              )}

                              {isMakeup && (s as any).student_name && (
                                <p className="text-xs text-gray-600 line-clamp-2">
                                  Học viên: {(s as any).student_name}
                                </p>
                              )}

                              {isMakeup && (s as any).note && (
                                <p className="text-[10px] text-gray-400 line-clamp-2">
                                  {(s as any).note}
                                </p>
                              )}

                              <div className="flex gap-1.5 pt-1 flex-wrap">
                                {isMakeup ? null : isDone ? (
                                  <>
                                    <Button size="sm" variant="outline" className="flex-1 text-xs h-7"
                                      icon={<ClipboardList className="w-3 h-3 text-emerald-600" />}
                                      onClick={() => openAttendance(s, true)}>
                                      Xem ĐD
                                    </Button>
                                    <Button size="sm"
                                      variant="outline"
                                      className={`flex-1 text-xs h-7 ${hasEval ? "text-amber-600 border-amber-200 bg-amber-50 hover:bg-amber-100" : ""}`}
                                      icon={<Star className={`w-3 h-3 ${hasEval ? "fill-current text-amber-500" : "text-amber-400"}`} />}
                                      onClick={() => openEval(s)}>
                                      {hasEval ? "Xem lại ĐG" : "Đánh giá"}
                                    </Button>
                                  </>
                                ) : s.class_id ? (
                                  <Button size="sm" className="flex-1 text-xs h-7"
                                    icon={<ClipboardList className="w-3 h-3" />}
                                    onClick={() => openAttendance(s, false)}>
                                    Điểm danh
                                  </Button>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12 text-gray-300">
                  <Calendar className="w-12 h-12 mx-auto mb-3" />
                  <p className="text-sm font-medium text-gray-400">Chọn một ngày</p>
                  <p className="text-xs text-gray-300 mt-1">để xem chi tiết buổi học</p>
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* ── Attendance Modal ── */}
      <Modal open={!!attendSession} onClose={() => setAttendSession(null)}
        title={attendViewOnly
          ? `Xem điểm danh – ${attendSession?.class_name} – Buổi #${attendSession?.session_no}`
          : `Điểm danh – ${attendSession?.class_name} – Buổi #${attendSession?.session_no}`}>
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
            {/* Summary */}
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
                Buổi đã hoàn thành. Bạn vẫn có thể chỉnh sửa nếu cần.
              </p>
            )}

            {attendStudents.map(st => (
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
                    ] as const).map(opt => (
                      <button key={opt.v} type="button"
                        className={`text-xs px-2 py-1 rounded-lg border transition-all ${st.attendance_status === opt.v ? opt.color + " border" : "border-gray-200 text-gray-400 hover:border-gray-300"}`}
                        onClick={() => setAttendStudents(prev =>
                          prev.map(x => x.id === st.id ? { ...x, attendance_status: opt.v } : x)
                        )}>
                        {opt.l}
                      </button>
                    ))}
                  </div>
                </div>
                {st.attendance_status === ATTENDANCE_STATUS.ABSENT && attendSession && (
                  <div className="pl-9">
                    <Button variant="ghost" size="sm" className="text-xs text-sky-600 h-auto py-1"
                      icon={<WrapText className="w-3 h-3" />}
                      onClick={() => openMakeup(st.id, st.full_name, st.note, attendSession)}>
                      Xếp học bù
                    </Button>
                    {attendMakeupByStudent[st.full_name] && !attendMakeupByStudent[st.full_name].is_completed && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-emerald-600 h-auto py-1"
                        onClick={() => markMakeupCompleted(st.full_name)}
                      >
                        Đánh dấu đã bù xong
                      </Button>
                    )}
                  </div>
                )}
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
          ? `Xem lại đánh giá – ${evalSession.class_name} #${evalSession.session_no}`
          : `Đánh giá buổi học – ${evalSession?.class_name} #${evalSession?.session_no}`}>
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
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                  rows={2}
                  placeholder="Buổi học diễn ra tốt, học viên tập trung..."
                  value={evalClassComment}
                  onChange={e => setEvalClassComment(e.target.value)}
                />
              </div>
            </div>

            {evalStudents.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-800 mb-3">Đánh Giá Từng Học Viên</h4>
                <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                  {evalStudents.map(st => (
                    <div key={st.student_name} className="p-3 bg-gray-50 rounded-xl space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900 flex-1">{st.student_name}</span>
                        <StarRating
                          value={st.rating}
                          onChange={v => setEvalStudents(prev => prev.map(x => x.student_name === st.student_name ? { ...x, rating: v } : x))}
                        />
                      </div>
                      <input
                        type="text"
                        className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                        placeholder="Nhận xét học viên..."
                        value={st.comment}
                        onChange={e => setEvalStudents(prev => prev.map(x => x.student_name === st.student_name ? { ...x, comment: e.target.value } : x))}
                      />
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
      <Modal open={!!makeup} onClose={() => setMakeup(null)}
        title={`Xếp Học Bù – ${makeup?.studentName}`}>
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
                    {/* Calendar vẫn hiển thị lịch học; nhưng bạn có thể chọn bất kỳ ngày nào */}
                    <p className="text-xs text-gray-500 mt-0.5 mb-1">Bấm vào ô ngày để chọn</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Giờ bù *</label>
                    <input
                      type="time"
                      value={makeupOtherTime}
                      onChange={(e) => {
                        const next = e.target.value;
                        setMakeupOtherTime(next);
                        setMakeup(prev => prev ? { ...prev, note: buildOtherSessionNote(makeupSelectedDateKey, next) } : prev);
                      }}
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                      required
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-gray-100 overflow-hidden bg-white">
                  <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-100">
                    <p className="text-xs font-semibold text-gray-700">
                      {MONTH_NAMES[makeupCurMonth.getMonth()]} {makeupCurMonth.getFullYear()}
                    </p>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" className="h-auto p-1" icon={<ChevronLeft className="w-4 h-4" />} onClick={prevMakeupMonth} />
                      <Button variant="ghost" size="sm" className="h-auto p-1" icon={<Calendar className="w-4 h-4" />} onClick={goMakeupToday} />
                      <Button variant="ghost" size="sm" className="h-auto p-1" icon={<ChevronRight className="w-4 h-4" />} onClick={nextMakeupMonth} />
                    </div>
                  </div>

                  <div className="grid grid-cols-7 border-b border-gray-100">
                    {DAY_HEADERS.map(h => (
                      <div key={h} className={`py-2 text-center text-xs font-semibold ${h === "CN" ? "text-rose-500" : "text-gray-500"}`}>
                        {h}
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-7">
                    {makeupCells.map((cell, idx) => {
                      const key = dateKey(cell);
                      const isCurrentMonth = cell.getMonth() === makeupCurMonth.getMonth();
                      const isToday = key === dateKey(today);
                      const isSelected = makeupSelectedDateKey === key;
                      const daySessions = makeupSessionMap[key] || [];

                      return (
                        <div
                          key={idx}
                          onClick={() => {
                            setMakeupSelectedDateKey(key);
                            setMakeup(p => (
                              p ? {
                                ...p,
                                targetSessionRef: "",
                                note: buildOtherSessionNote(key, makeupOtherTime),
                              } : p
                            ));
                          }}
                          className={[
                            "min-h-[90px] p-1.5 cursor-pointer transition-colors",
                            !isCurrentMonth ? "bg-gray-50/50" : "bg-white hover:bg-gray-50",
                            isSelected ? "bg-emerald-50" : "",
                            !isCurrentMonth ? "" : "",
                            idx % 7 !== 6 ? "border-r border-gray-100" : "",
                            idx >= makeupCells.length - 7 ? "" : "border-b border-gray-100",
                          ].join(" ")}
                        >
                          <div className="flex justify-end mb-1">
                            <span className={[
                              "text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full",
                              isToday ? "bg-emerald-600 text-white" : "",
                              isSelected ? "bg-emerald-100 text-emerald-700" : "",
                              isCurrentMonth ? "text-gray-700" : "text-gray-300",
                            ].join(" ")}>
                              {cell.getDate()}
                            </span>
                          </div>

                          <div className="space-y-0.5">
                            {daySessions.slice(0, 2).map(s => {
                              const ref = makeSessionRef(s);
                              const active = makeup.targetSessionRef === ref;
                              const colorClass = classColorMap[s.class_name || s.class_id || ""] || CLASS_COLORS[0];
                              return (
                                <button
                                  key={ref}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const keyNow = key;
                                    const nextTime = s.session_time || makeupOtherTime;
                                    setMakeupOtherTime(nextTime || "");
                                    setMakeup(p => (
                                      p ? {
                                        ...p,
                                        targetSessionRef: "",
                                        note: buildOtherSessionNote(keyNow, nextTime || ""),
                                      } : p
                                    ));
                                    setMakeupSelectedDateKey(keyNow);
                                  }}
                                  className={[
                                    "text-[10px] font-medium px-1.5 py-0.5 rounded-md border truncate cursor-pointer transition-opacity hover:opacity-80 w-full text-left",
                                    colorClass,
                                    active ? "ring-2 ring-emerald-500" : "",
                                  ].join(" ")}
                                  title={`${s.class_name} – Buổi #${s.session_no} ${s.session_time || ""}`}
                                >
                                  {s.session_time ? `${s.session_time} ` : ""}
                                  {(s.class_name || "").split(" ")[0]}
                                </button>
                              );
                            })}

                            {daySessions.length > 2 && (
                              <div className="text-[10px] text-gray-400 font-medium pl-1">
                                +{daySessions.length - 2} buổi
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ghi chú{makeup.makeupType === "other_session" && " *"}
              </label>
              <textarea
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                rows={2}
                placeholder="Sẽ bù theo slot đã chọn..."
                value={makeup.note}
                onChange={e => setMakeup(p => p ? { ...p, note: e.target.value } : p)}
              />
            </div>

            <div className="flex gap-3 pt-1">
              <Button variant="secondary" className="flex-1" onClick={() => setMakeup(null)}>Hủy</Button>
              <Button type="button" className="flex-1" loading={savingMakeup} onClick={handleSaveMakeup}>Xác nhận học bù</Button>
            </div>
          </div>
        )}
      </Modal>
    </PageWrapper>
  );
}
