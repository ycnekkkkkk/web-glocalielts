"use client";
import PageWrapper from "@/components/layouts/PageWrapper";
import { Card } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { createBrowserClient } from "@/lib/supabase/client";
import { SESSION_STATUS } from "@/lib/constants";
import { parseSessionDate } from "@/lib/scheduleUtils";
import { Calendar, ChevronLeft, ChevronRight, BookOpen, Clock } from "lucide-react";
import Button from "@/components/ui/Button";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { AttendanceMakeup, Session } from "@/types";

const MONTH_NAMES = [
  "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
  "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12",
];
const DAY_HEADERS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

const CLASS_COLORS = [
  "bg-sky-100 text-sky-800 border-sky-200",
  "bg-sky-100 text-sky-800 border-sky-200",
  "bg-emerald-100 text-emerald-800 border-emerald-200",
  "bg-rose-100 text-rose-800 border-rose-200",
  "bg-amber-100 text-amber-800 border-amber-200",
  "bg-cyan-100 text-cyan-800 border-cyan-200",
  "bg-sky-100 text-sky-800 border-sky-200",
  "bg-pink-100 text-pink-800 border-pink-200",
];

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
  const cells: Date[] = [];
  const cursor = new Date(gridStart);
  for (let i = 0; i < 42; i++) {
    cells.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  if (lastDay < cells[34]) return cells.slice(0, 35);
  return cells;
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function sessionDateKey(s: Pick<Session, "session_date">): string | null {
  const d = parseSessionDate(s.session_date || "");
  if (!d) return null;
  return dateKey(d);
}

function makeSessionRefFromSession(s: Pick<Session, "class_name" | "session_no" | "session_date">): string | null {
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

type MakeupEvent = {
  id: number;
  kind: "makeup";
  student_name: string;
  class_id: string | null;
  class_name: string;
  session_no: number | null;
  session_date: string;
  session_time: string | null;
  topic: string | null;
  homework: string | null;
  status: "UPCOMING" | "DONE" | "CANCELLED";
  teacher_id: string | null;
  zoom_link?: string | null;
  created_at: string;
};

export default function StudentSchedulePage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [classNameMap, setClassNameMap] = useState<Record<string, string>>({});
  const [makeupEvents, setMakeupEvents] = useState<MakeupEvent[]>([]);
  const today = useMemo(() => new Date(), []);
  const [curMonth, setCurMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  useEffect(() => {
    let isActive = true;
    async function load() {
      const supabase = createBrowserClient();
      try {
        const { data: { session: authSession } } = await supabase.auth.getSession();
        if (!isActive) return;
        if (!authSession?.user) { setLoading(false); return; }

        const { data: studentRec } = await supabase
          .from("students")
          .select("id,full_name")
          .eq("profile_id", authSession.user.id)
          .maybeSingle();
        if (!studentRec?.id) { setLoading(false); return; }

        const { data: enrollData } = await supabase
          .from("enrollments")
          .select("class_id")
          .eq("student_id", studentRec.id)
          .eq("status", "active");

        const classIds = (enrollData || []).map((e: { class_id: string }) => e.class_id);
        if (classIds.length === 0) {
          if (!isActive) return;
          setSessions([]);
          setClassNameMap({});
          setLoading(false);
          return;
        }

        const [classesRes, sessionsRes] = await Promise.all([
          supabase.from("classes").select("id, name").in("id", classIds),
          supabase.from("sessions").select("*").in("class_id", classIds).order("session_date"),
        ]);

        if (!isActive) return;

        const nextClassNameMap = Object.fromEntries(
          ((classesRes.data || []) as { id: string; name: string | null }[]).map((c) => [c.id, c.name || ""])
        );
        setClassNameMap(nextClassNameMap);
        const sess = (sessionsRes.data as Session[]) || [];
        setSessions(sess);

        // Load "other_session" makeups (virtual events; no row in `sessions`)
        const { data: makeupRows } = await supabase
          .from("attendance_makeup")
          .select("session_ref,makeup_type,note,student_name")
          .eq("student_name", studentRec.full_name || "");

        const otherMakeups = ((makeupRows || []) as AttendanceMakeup[])
          .filter(r => r.makeup_type === "other_session" && !!r.note);

        const events: MakeupEvent[] = [];
        otherMakeups.forEach((row, idx) => {
          const parsedNote = parseOtherSessionMakeupNote(row.note);
          if (!parsedNote) return;
          const parsedSessionRef = parseSessionRef(row.session_ref);
          if (!parsedSessionRef) return;

          const missedSession = sess.find(s => makeSessionRefFromSession(s) === row.session_ref);
          const class_id = missedSession?.class_id ?? null;
          const class_name = missedSession?.class_name ?? parsedSessionRef.class_name;

          const id = -1_000_000 - idx;
          events.push({
            id,
            kind: "makeup",
            student_name: row.student_name,
            class_id,
            class_name,
            session_no: parsedSessionRef.session_no,
            session_date: parsedNote.dateText,
            session_time: parsedNote.time,
            topic: null,
              homework: null,
            status: SESSION_STATUS.UPCOMING,
            teacher_id: null,
            created_at: new Date().toISOString(),
          });
        });

        setMakeupEvents(events);
      } catch (error) {
        console.error(error);
      } finally {
        if (!isActive) return;
        setLoading(false);
      }
    }
    load().catch(console.error);
    return () => {
      isActive = false;
    };
  }, []);

  // Assign colors to class names
  const classColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    let idx = 0;
    for (const s of sessions) {
      const classId = s.class_id || "";
      const name = classNameMap[classId] || s.class_name || classId;
      if (name && !map[name]) {
        map[name] = CLASS_COLORS[idx % CLASS_COLORS.length];
        idx++;
      }
    }
    return map;
  }, [sessions, classNameMap]);

  // Build session map by date key
  const sessionMap = useMemo(() => {
    const map: Record<string, Session[]> = {};
    for (const s of sessions) {
      const key = sessionDateKey(s);
      if (!key) continue;
      if (!map[key]) map[key] = [];
      map[key].push(s);
    }
    return map;
  }, [sessions]);

  const makeupMap = useMemo(() => {
    const map: Record<string, MakeupEvent[]> = {};
    for (const ev of makeupEvents) {
      const key = sessionDateKey(ev);
      if (!key) continue;
      if (!map[key]) map[key] = [];
      map[key].push(ev);
    }
    return map;
  }, [makeupEvents]);

  const cells = useMemo(
    () => buildCalendarGrid(curMonth.getFullYear(), curMonth.getMonth()),
    [curMonth]
  );

  const prevMonth = () => setCurMonth(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const nextMonth = () => setCurMonth(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  const goToday   = () => { setCurMonth(new Date(today.getFullYear(), today.getMonth(), 1)); setSelectedDate(today); };

  const monthLabel = `${MONTH_NAMES[curMonth.getMonth()]} ${curMonth.getFullYear()}`;
  const totalThisMonth = cells
    .filter(d => d.getMonth() === curMonth.getMonth())
    .reduce((acc, d) => acc + (sessionMap[dateKey(d)]?.length ?? 0) + (makeupMap[dateKey(d)]?.length ?? 0), 0);

  const selectedDaySessions = useMemo(
    () => {
      if (!selectedDate) return [];
      const key = dateKey(selectedDate);
      return [...(sessionMap[key] || []), ...(makeupMap[key] || [])];
    },
    [selectedDate, sessionMap, makeupMap]
  );

  return (
    <PageWrapper>
      <div className="page-header flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="page-title">Lịch Học</h1>
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
          <div className="w-8 h-8 border-4 border-sky-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="flex gap-4">
          {/* Calendar Grid */}
          <div className="flex-1 min-w-0">
            <Card className="overflow-hidden p-0">
              {/* Day headers */}
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
                        isSelected ? "bg-sky-50" :
                        isToday ? "bg-amber-50/50" :
                        isCurrentMonth ? "bg-white hover:bg-gray-50" : "bg-gray-50/50",
                      ].join(" ")}
                    >
                      <div className="flex justify-end mb-1">
                        <span className={[
                          "text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full",
                          isToday ? "bg-sky-600 text-white" :
                          isSelected ? "bg-sky-100 text-sky-700" :
                          isCurrentMonth ? (isSunday ? "text-rose-500" : "text-gray-700") : "text-gray-300",
                        ].join(" ")}>
                          {cell.getDate()}
                        </span>
                      </div>

                      <div className="space-y-0.5">
                        {daySessions.slice(0, 2).map(s => {
                          const classId = s.class_id || "";
                          const className = classNameMap[classId] || s.class_name || classId;
                          const colorClass = classColorMap[className] || CLASS_COLORS[0];
                          const isDone = s.status === SESSION_STATUS.DONE;
                          const isCancelled = s.status === "CANCELLED";
                          return (
                            <div key={s.id}
                              title={`${className} – Buổi #${s.session_no}${s.session_time ? " " + s.session_time : ""}`}
                              className={[
                                "text-[10px] font-medium px-1.5 py-0.5 rounded-md border truncate",
                                isDone ? "opacity-60 line-through" : "",
                                isCancelled ? "opacity-50 line-through bg-red-100/70 text-red-800 border-red-200" : colorClass,
                              ].join(" ")}
                            >
                              {s.session_time ? `${s.session_time} ` : ""}
                              {(className || "").split(" ")[0]}
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
                {Object.entries(classColorMap).map(([name, color]) => {
                  const classId = Object.keys(classNameMap).find((id) => classNameMap[id] === name) || "";
                  return (
                  <Link key={name} href={classId ? `/student/my-courses/${encodeURIComponent(classId)}` : "#"}>
                    <span className={`text-xs px-2 py-1 rounded-lg border font-medium cursor-pointer hover:opacity-80 transition-opacity ${color}`}>
                      {name}
                    </span>
                  </Link>
                )})}
              </div>
            )}
          </div>

          {/* Day Detail Sidebar */}
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
                        const classId = s.class_id || "";
                        const className = classNameMap[classId] || s.class_name || classId;
                        const colorClass = classColorMap[className] || CLASS_COLORS[0];
                        return (
                          <div key={s.id} className="rounded-xl border border-gray-100 overflow-hidden">
                            <div className={`px-3 py-2 ${colorClass}`}>
                              <p className="text-xs font-bold truncate">{className}</p>
                              {s.session_time && (
                                <p className="text-[10px] opacity-70 flex items-center gap-1">
                                  <Clock className="w-2.5 h-2.5" />{s.session_time}
                                </p>
                              )}
                            </div>
                            <div className="px-3 py-2 bg-white space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-500 flex items-center gap-1">
                                  <BookOpen className="w-3 h-3" />
                                  {isMakeup ? `Buổi bù (cho buổi #${s.session_no})` : `Buổi #${s.session_no}`}
                                </span>
                                {isMakeup ? (
                                  <Badge variant="warning" className="text-[10px]">Buổi bù</Badge>
                                ) : isDone ? (
                                  <Badge variant="success" className="text-[10px]">✓ Xong</Badge>
                                ) : s.status === "CANCELLED" ? (
                                  <Badge variant="danger" className="text-[10px]">Đã hủy</Badge>
                                ) : (
                                  <Badge variant="info" className="text-[10px]">Sắp tới</Badge>
                                )}
                              </div>
                              {!isMakeup && (s as Session).makeup_original_date && (
                                <p className="text-[10px] text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200 inline-block">
                                  Học bù từ {(s as Session).makeup_original_date}
                                </p>
                              )}
                              {!isMakeup && (s as Session).makeup_note && (
                                <p className="text-[10px] text-amber-600 font-medium">Ghi chú: {(s as Session).makeup_note}</p>
                              )}
                              {!isMakeup && s.status === "CANCELLED" && (s as Session).cancelled_note && (
                                <p className="text-[10px] text-red-600 font-medium">Lý do hủy: {(s as Session).cancelled_note}</p>
                              )}
                              {s.topic && (
                                <p className="text-xs text-gray-600 line-clamp-2">{s.topic}</p>
                              )}

                              {isMakeup && (s as any).student_name && (
                                <p className="text-[10px] text-gray-400 line-clamp-2">
                                  {(s as any).student_name}
                                </p>
                              )}

                              <Link href={`/student/my-courses/${encodeURIComponent(classId)}`}>
                                <span className="text-xs text-sky-600 hover:underline cursor-pointer">Xem khóa học →</span>
                              </Link>
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
    </PageWrapper>
  );
}
