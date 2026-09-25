"use client";
import PageWrapper from "@/components/layouts/PageWrapper";
import { Card } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { createBrowserClient } from "@/lib/supabase/client";
import { SESSION_STATUS, ATTENDANCE_STATUS } from "@/lib/constants";
import { getSessionState } from "@/lib/sessionStatus";
import {
  AlertTriangle, Ban, CalendarCheck2, ChevronLeft, ChevronRight,
  ClipboardList, Star, Calendar, Video, ExternalLink, WrapText,
} from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import toast from "react-hot-toast";
import type { Session, Student } from "@/types";

function parseSessionDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  if (dateStr.includes("/")) {
    const parts = dateStr.split("/");
    if (parts.length !== 3) return null;
    const [dd, mm, yyyy] = parts;
    const d = new Date(+yyyy, +mm - 1, +dd);
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

// ── Interfaces ────────────────────────────────────────────────
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

function getMondayOf(d: Date): Date {
  const clone = new Date(d);
  const day = clone.getDay();
  clone.setDate(clone.getDate() - (day === 0 ? 6 : day - 1));
  clone.setHours(0, 0, 0, 0);
  return clone;
}

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
  if (lastDay < cells[34]) return cells.slice(0, 35);
  return cells;
}

function sessionKey(s: Session): string | null {
  const d = parseSessionDate(s.session_date || "");
  if (!d) return null;
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function formatDDMMYYYY(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  if (dateStr.includes("/")) return dateStr;
  // yyyy-MM-dd → dd/MM/yyyy
  const parts = dateStr.split("-");
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return dateStr;
}

function dateInputToDisplay(ymd: string): string {
  // yyyy-MM-dd → dd/MM/yyyy
  if (!ymd) return "";
  const parts = ymd.split("-");
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return ymd;
}

function sessionDateToInputValue(dbDate: string | null | undefined): string {
  if (!dbDate) return "";
  if (dbDate.includes("/")) {
    const [dd, mm, yyyy] = dbDate.split("/");
    return `${yyyy}-${mm.padStart(2,"0")}-${dd.padStart(2,"0")}`;
  }
  return dbDate;
}

const CLASS_COLORS = [
  "bg-emerald-100 text-emerald-800 border-emerald-200",
  "bg-blue-100 text-blue-800 border-blue-200",
  "bg-sky-100 text-sky-800 border-sky-200",
  "bg-rose-100 text-rose-800 border-rose-200",
  "bg-amber-100 text-amber-800 border-amber-200",
  "bg-cyan-100 text-cyan-800 border-cyan-200",
  "bg-pink-100 text-pink-800 border-pink-200",
  "bg-sky-100 text-sky-800 border-sky-200",
];

export default function InstructorSchedulePage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const today = useMemo(() => new Date(), []);
  const [curMonth, setCurMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [loading, setLoading] = useState(true);
  const [myName, setMyName] = useState("");

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // ── Attendance modal ─────────────────────────────────────────
  const [attendSession, setAttendSession] = useState<Session | null>(null);
  const [attendStudents, setAttendStudents] = useState<StudentAttendance[]>([]);
  const [attendLoading, setAttendLoading] = useState(false);
  const [savingAttend, setSavingAttend] = useState(false);
  const [attendViewOnly, setAttendViewOnly] = useState(false);

  // ── Evaluation modal ─────────────────────────────────────────
  const [evalSession, setEvalSession] = useState<Session | null>(null);
  const [evalClassRating, setEvalClassRating] = useState(5);
  const [evalClassComment, setEvalClassComment] = useState("");
  const [evalStudents, setEvalStudents] = useState<StudentEval[]>([]);
  const [evalLoading, setEvalLoading] = useState(false);
  const [savingEval, setSavingEval] = useState(false);
  const [evalledRefs, setEvalledRefs] = useState<Set<string>>(new Set());

  // ── Học bù modal (reschedule session) ────────────────────────
  const [makeupSession, setMakeupSession] = useState<Session | null>(null);
  const [makeupNewDate, setMakeupNewDate] = useState("");   // yyyy-MM-dd
  const [makeupNewTime, setMakeupNewTime] = useState("");   // HH:mm
  const [savingMakeup, setSavingMakeup] = useState(false);

  // ── Hủy buổi confirm modal ───────────────────────────────────
  const [cancelSession, setCancelSession] = useState<Session | null>(null);
  const [cancelNote, setCancelNote] = useState("");
  const [savingCancel, setSavingCancel] = useState(false);

  // ── Load ─────────────────────────────────────────────────────
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

      setSessions((data as Session[]) || []);

      // Load evaluations
      const sessData = (data as Session[]) || [];
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

  // ── Memos ────────────────────────────────────────────────────
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

  const cells = useMemo(
    () => buildCalendarGrid(curMonth.getFullYear(), curMonth.getMonth()),
    [curMonth]
  );

  const prevMonth = () => setCurMonth(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const nextMonth = () => setCurMonth(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  const goToday   = () => { setCurMonth(new Date(today.getFullYear(), today.getMonth(), 1)); setSelectedDate(today); };

  const selectedDaySessions = useMemo(() => {
    if (!selectedDate) return [];
    const key = dateKey(selectedDate);
    return sessionMap[key] || [];
  }, [selectedDate, sessionMap]);

  // ── Attendance ───────────────────────────────────────────────
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

      await supabase.from("sessions").update({ status: SESSION_STATUS.DONE }).eq("id", attendSession.id);
      setSessions(prev => prev.map(x => x.id === attendSession!.id ? { ...x, status: SESSION_STATUS.DONE } : x));

      toast.success("Đã lưu điểm danh!");
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

  // ── Evaluation ───────────────────────────────────────────────
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
    (studentEvals || []).forEach((e: any) => { evalMap[e.student_name] = e; });

    const studs: StudentEval[] = ((attData || []) as { student_name: string; student_id: string; attendance_status: string }[])
      .filter(a => a.attendance_status === ATTENDANCE_STATUS.ON_TIME)
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
        await supabase.from("session_student_evaluation").upsert(
          evalStudents.map(st => ({
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

  // ── Học Bù (Reschedule Session) ──────────────────────────────
  function openMakeup(s: Session) {
    setMakeupSession(s);
    // Default new date = original date
    setMakeupNewDate(sessionDateToInputValue(s.session_date));
    setMakeupNewTime(s.session_time || "");
  }

  async function handleSaveMakeup() {
    if (!makeupSession) return;
    if (!makeupNewDate) {
      toast.error("Vui lòng chọn ngày học bù");
      return;
    }

    const originalDate = makeupSession.session_date || "";
    const newDateDisplay = dateInputToDisplay(makeupNewDate);

    // Don't allow same date unless time is different
    if (newDateDisplay === formatDDMMYYYY(originalDate) && makeupNewTime === (makeupSession.session_time || "")) {
      toast.error("Ngày và giờ học bù phải khác ngày gốc");
      return;
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
  function openCancel(s: Session) {
    setCancelSession(s);
    setCancelNote("");
  }

  async function handleConfirmCancel() {
    if (!cancelSession) return;
    setSavingCancel(true);
    try {
      const supabase = createBrowserClient();
      const { error } = await supabase
        .from("sessions")
        .update({
          status: SESSION_STATUS.CANCELLED,
          cancelled_note: cancelNote.trim() || "Giáo viên hủy buổi",
          cancelled_by: myName || "teacher",
          cancelled_at: new Date().toISOString(),
        })
        .eq("id", cancelSession.id);

      if (error) throw new Error(error.message);

      setSessions(prev => prev.map(s =>
        s.id === cancelSession!.id
          ? { ...s, status: SESSION_STATUS.CANCELLED, cancelled_note: cancelNote || "Giáo viên hủy buổi", cancelled_by: myName }
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

  // ── Render ───────────────────────────────────────────────────
  const monthLabel = `${MONTH_NAMES[curMonth.getMonth()]} ${curMonth.getFullYear()}`;
  const totalThisMonth = cells
    .filter(d => d.getMonth() === curMonth.getMonth())
    .reduce((acc, d) => acc + (sessionMap[dateKey(d)]?.length ?? 0), 0);

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
              <div className="grid grid-cols-7 border-b border-gray-100">
                {DAY_HEADERS.map(h => (
                  <div key={h} className={`py-3 text-center text-xs font-semibold ${h === "CN" ? "text-rose-500" : "text-gray-500"}`}>
                    {h}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7">
                {cells.map((cell, idx) => {
                  const isCurrentMonth = cell.getMonth() === curMonth.getMonth();
                  const isToday = dateKey(cell) === dateKey(today);
                  const isSelected = selectedDate && dateKey(cell) === dateKey(selectedDate);
                  const dayKey = dateKey(cell);
                  const daySessions = sessionMap[dayKey] || [];
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

                      <div className="space-y-0.5">
                        {daySessions.slice(0, 2).map(s => {
                          const colorClass = classColorMap[s.class_name || s.class_id || ""] || CLASS_COLORS[0];
                          const isDone = s.status === SESSION_STATUS.DONE;
                          const isCancelled = s.status === SESSION_STATUS.CANCELLED;
                          const isMakeup = !!s.makeup_original_date;
                          return (
                            <div
                              key={s.id}
                              onClick={e => {
                                e.stopPropagation();
                                if (isDone) openEval(s);
                                else if (!isCancelled) openAttendance(s, false);
                              }}
                              title={`${s.class_name} – Buổi #${s.session_no}${s.session_time ? " " + s.session_time : ""}${isMakeup ? " [Bù]" : ""}${isCancelled ? " [Hủy]" : ""}`}
                              className={[
                                "text-[10px] font-medium px-1.5 py-0.5 rounded-md border truncate cursor-pointer transition-opacity hover:opacity-80",
                                isDone ? "opacity-60 line-through" : "",
                                isCancelled ? "opacity-40 line-through" : "",
                                isMakeup ? "ring-1 ring-orange-400" : "",
                                colorClass,
                              ].join(" ")}
                            >
                              {isMakeup && "🔄 "}
                              {isCancelled && "❌ "}
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
          <div className="w-80 shrink-0">
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
                        const sessionState = getSessionState(s);
                        const isDone = sessionState.isDone;
                        const isCancelled = sessionState.isCancelled;
                        const isUpcoming = sessionState.isUpcoming;
                        const isMakeup = !!s.makeup_original_date;
                        const colorClass = classColorMap[s.class_name || s.class_id || ""] || CLASS_COLORS[0];
                        const sRef = `${s.class_name}#${s.session_no}#${s.session_date}`;
                        const hasEval = evalledRefs.has(sRef);

                        return (
                          <div key={s.id} className="rounded-xl border border-gray-100 overflow-hidden">
                            {/* Header */}
                            <div className={`px-3 py-2 ${colorClass}`}>
                              <p className="text-xs font-bold truncate">{s.class_name}</p>
                              {s.session_time && (
                                <p className="text-[10px] opacity-70">{s.session_time}</p>
                              )}
                            </div>

                            {/* Body */}
                            <div className="px-3 py-2 bg-white space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-500">Buổi #{s.session_no}</span>
                                {isCancelled ? (
                                  <Badge variant="danger" className="text-[10px]">Đã hủy</Badge>
                                ) : isDone ? (
                                  <Badge variant="success" className="text-[10px]">✓ Xong</Badge>
                                ) : isMakeup ? (
                                  <Badge variant="warning" className="text-[10px]">🔄 Học bù</Badge>
                                ) : sessionState.isPendingAttendance ? (
                                  <Badge variant="warning" className="text-[10px] bg-amber-100 text-amber-800 border-amber-300 font-bold">Chưa điểm danh</Badge>
                                ) : (
                                  <Badge variant="info" className="text-[10px]">Sắp tới</Badge>
                                )}
                              </div>

                              {/* Makeup info */}
                              {isMakeup && s.makeup_note && (
                                <p className="text-[10px] text-orange-600 bg-orange-50 px-2 py-1 rounded-lg">
                                  {s.makeup_note}
                                </p>
                              )}

                              {/* Cancel info */}
                              {isCancelled && s.cancelled_note && (
                                <p className="text-[10px] text-red-600 bg-red-50 px-2 py-1 rounded-lg">
                                  Lý do: {s.cancelled_note}
                                </p>
                              )}

                              {s.topic && (
                                <p className="text-xs text-gray-600 line-clamp-2">{s.topic}</p>
                              )}

                              {/* Action buttons — 3 independent buttons */}
                              <div className="space-y-1.5 pt-1">
                                {/* Button: Điểm danh */}
                                {!isCancelled && (
                                  <Button
                                    size="sm"
                                    variant={sessionState.isPendingAttendance ? "primary" : isDone ? "outline" : "primary"}
                                    className={`w-full text-xs h-7 ${sessionState.isPendingAttendance ? "bg-amber-600 hover:bg-amber-700 border-amber-600 text-white font-medium" : ""}`}
                                    icon={<ClipboardList className="w-3 h-3" />}
                                    onClick={() => openAttendance(s, isDone)}
                                  >
                                    {isDone ? "Xem điểm danh" : sessionState.isPendingAttendance ? "Điểm danh ngay" : "Điểm danh"}
                                  </Button>
                                )}

                                {/* Button: Đánh giá (only shown after done) */}
                                {isDone && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className={`w-full text-xs h-7 ${hasEval ? "text-amber-600 border-amber-200 bg-amber-50 hover:bg-amber-100" : ""}`}
                                    icon={<Star className={`w-3 h-3 ${hasEval ? "fill-current text-amber-500" : "text-amber-400"}`} />}
                                    onClick={() => openEval(s)}
                                  >
                                    {hasEval ? "Xem lại đánh giá" : "Đánh giá"}
                                  </Button>
                                )}

                                {/* Button: Học bù — chuyển buổi sang ngày khác */}
                                {!isDone && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="w-full text-xs h-7 text-orange-600 border-orange-200 hover:bg-orange-50"
                                    icon={<WrapText className="w-3 h-3" />}
                                    onClick={() => openMakeup(s)}
                                  >
                                    {isMakeup ? "Đổi lịch bù" : "Học bù"}
                                  </Button>
                                )}

                                {/* Button: Hủy — chỉ cho UPCOMING chưa có điểm danh */}
                                {isUpcoming && s.class_id && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="w-full text-xs h-7 text-red-500 border-red-200 hover:bg-red-50"
                                    icon={<Ban className="w-3 h-3" />}
                                    onClick={() => openCancel(s)}
                                  >
                                    Hủy buổi
                                  </Button>
                                )}
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
            <p className="text-sm">Chưa có học viên trong lớp hoặc chưa có dữ liệu điểm danh.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {attendSession?.zoom_link && (
              <a href={attendSession.zoom_link} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-700 hover:bg-blue-100 transition-colors">
                <Video className="w-4 h-4 shrink-0" />
                <span className="font-medium">Vào lớp học</span>
                <span className="truncate flex-1">{attendSession.zoom_link}</span>
                <ExternalLink className="w-3.5 h-3.5 shrink-0" />
              </a>
            )}

            {/* Summary */}
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
                Buổi đã hoàn thành. Bạn vẫn có thể chỉnh sửa nếu cần.
              </p>
            )}

            {/* Zoom link edit */}
            <div className="flex items-center gap-2 px-3 py-2 bg-sky-50 border border-sky-200 rounded-xl">
              <Video className="w-4 h-4 text-sky-600 shrink-0" />
              <input
                type="url"
                className="flex-1 bg-transparent text-sm text-sky-800 placeholder:text-sky-400 focus:outline-none"
                placeholder="Paste Zoom / Meet link vào đây..."
                value={attendSession?.zoom_link || ""}
                onChange={async (e) => {
                  const newLink = e.target.value;
                  if (!attendSession) return;
                  setAttendSession(prev => prev ? { ...prev, zoom_link: newLink || null } : null);
                  setSessions(prev => prev.map(s => s.id === attendSession.id ? { ...s, zoom_link: newLink || null } : s));
                  const { error } = await createBrowserClient()
                    .from("sessions")
                    .update({ zoom_link: newLink || null })
                    .eq("id", attendSession.id);
                  if (error) toast.error("Lỗi lưu link: " + error.message);
                }}
              />
              {attendSession?.zoom_link && (
                <a href={attendSession.zoom_link} target="_blank" rel="noopener noreferrer"
                  className="text-sky-600 hover:text-sky-800 shrink-0">
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>

            {attendStudents.map(st => (
              <div key={st.id} className="p-3 bg-gray-50 rounded-xl">
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
                  placeholder="Buổi học diễn ra tốt..."
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
    </PageWrapper>
  );
}
