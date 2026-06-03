"use client";
import PageWrapper from "@/components/layouts/PageWrapper";
import { Card } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Modal from "@/components/ui/Modal";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { createBrowserClient } from "@/lib/supabase/client";
import { SESSION_STATUS } from "@/lib/constants";
import type { Class, Session } from "@/types";
import {
  AlertTriangle, ArrowRightLeft, BookOpen, Calendar,
  Check, ChevronDown, ChevronRight, Clock, LayoutList,
  Pencil, Plus, Search, Video, ExternalLink,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";

// ─── helpers ────────────────────────────────────────────────────────────────

function parseDD(ddMMyyyy: string): Date | null {
  if (!ddMMyyyy) return null;
  const p = ddMMyyyy.split("/");
  if (p.length !== 3) return null;
  const d = new Date(Number(p[2]), Number(p[1]) - 1, Number(p[0]));
  return isNaN(d.getTime()) ? null : d;
}

function toInputDate(ddMMyyyy: string): string {
  if (!ddMMyyyy) return "";
  const p = ddMMyyyy.split("/");
  if (p.length === 3) return `${p[2]}-${p[1]}-${p[0]}`;
  return ddMMyyyy;
}
function fromInputDate(yyyyMMdd: string): string {
  if (!yyyyMMdd) return "";
  const p = yyyyMMdd.split("-");
  if (p.length === 3) return `${p[2]}/${p[1]}/${p[0]}`;
  return yyyyMMdd;
}

function weekRange(ref: Date): [Date, Date] {
  const d = new Date(ref);
  const day = d.getDay();
  const monday = new Date(d);
  monday.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return [monday, sunday];
}

function weekInputToMonday(weekValue: string): Date | null {
  // weekValue: "2026-W13"
  if (!weekValue) return null;
  const [yearStr, wStr] = weekValue.split("-W");
  const year = Number(yearStr);
  const week = Number(wStr);
  // ISO week: Jan 4 is always in week 1
  const jan4 = new Date(year, 0, 4);
  const dayOfWeek = jan4.getDay() === 0 ? 7 : jan4.getDay();
  const monday = new Date(jan4);
  monday.setDate(jan4.getDate() - dayOfWeek + 1 + (week - 1) * 7);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

const CLASS_COLORS = [
  "bg-sky-100 text-sky-700 border-sky-200",
  "bg-sky-100 text-sky-700 border-sky-200",
  "bg-emerald-100 text-emerald-700 border-emerald-200",
  "bg-rose-100 text-rose-700 border-rose-200",
  "bg-amber-100 text-amber-700 border-amber-200",
  "bg-cyan-100 text-cyan-700 border-cyan-200",
  "bg-pink-100 text-pink-700 border-pink-200",
  "bg-sky-100 text-sky-800 border-sky-200",
];
const CLASS_DOT_COLORS = [
  "bg-sky-500", "bg-sky-500", "bg-emerald-500", "bg-rose-500",
  "bg-amber-500",  "bg-cyan-500", "bg-pink-500",   "bg-sky-500",
];

function statusBadge(status: string) {
  if (status === SESSION_STATUS.DONE)      return <Badge variant="success">Hoàn thành</Badge>;
  if (status === SESSION_STATUS.CANCELLED) return <Badge variant="danger">Hủy</Badge>;
  return <Badge variant="info">Sắp diễn ra</Badge>;
}

interface ConflictRow { class_name: string; session_no: number; session_time: string; }

const EMPTY_FORM = {
  class_id: "", session_no: "", session_date: "",
  session_time: "", topic: "", homework: "", zoom_link: "",
  status: "UPCOMING" as Session["status"],
};

type ViewMode = "by-class" | "by-date";
type DateFilterMode = "all" | "day" | "week" | "month";

// ─── component ───────────────────────────────────────────────────────────────

export default function AdminSessionsPage() {
  const [sessions, setSessions]   = useState<Session[]>([]);
  const [classes, setClasses]     = useState<Class[]>([]);
  const [loading, setLoading]     = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // filters
  const [search, setSearch]               = useState("");
  const [statusFilter, setStatusFilter]   = useState("");
  const [classFilter, setClassFilter]     = useState("");
  const [dateMode, setDateMode]           = useState<DateFilterMode>("all");
  const [filterDay, setFilterDay]         = useState("");   // yyyy-MM-dd
  const [filterWeek, setFilterWeek]       = useState("");   // yyyy-Www
  const [filterMonth, setFilterMonth]     = useState("");   // yyyy-MM

  // view
  const [viewMode, setViewMode]           = useState<ViewMode>("by-date");
  const [collapsed, setCollapsed]         = useState<Set<string>>(new Set());

  // create modal
  const [modal, setModal]   = useState<null | "create">(null);
  const [form, setForm]     = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [conflicts, setConflicts]         = useState<ConflictRow[]>([]);
  const conflictTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // inline topic edit
  const [editingTopicId, setEditingTopicId]     = useState<number | null>(null);
  const [editingTopicValue, setEditingTopicValue] = useState("");
  const topicInputRef = useRef<HTMLInputElement>(null);

  // reschedule modal
  const [rescheduleSession, setRescheduleSession]     = useState<Session | null>(null);
  const [rescheduleDate, setRescheduleDate]           = useState("");
  const [rescheduleTime, setRescheduleTime]           = useState("");
  const [rescheduleNote, setRescheduleNote]           = useState("");
  const [rescheduleConflicts, setRescheduleConflicts] = useState<ConflictRow[]>([]);
  const [savingReschedule, setSavingReschedule]       = useState(false);
  const rescheduleConflictTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── load data ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const supabase = createBrowserClient();
    setLoadError(null);
    Promise.all([
      supabase.from("sessions").select("*"), // Remove server-side order as it's unreliable for dd/MM/yyyy text
      supabase.from("classes").select("id,name,teacher_id").order("name"),
    ]).then(([sesRes, clsRes]) => {
      if (sesRes.error) {
        setLoadError(`Lỗi tải buổi học: ${sesRes.error.message}`);
      } else if (clsRes.error) {
        setLoadError(`Lỗi tải lớp học: ${clsRes.error.message}`);
      }
      
      const rawSessions = (sesRes.data as Session[]) || [];
      // Sort sessions robustly: Date first, then Time
      const sortedSessions = [...rawSessions].sort((a, b) => {
        const da = parseDD(a.session_date || ""), db = parseDD(b.session_date || "");
        if (da && db) {
          if (da.getTime() !== db.getTime()) return da.getTime() - db.getTime();
        } else if (da) return -1;
        else if (db) return 1;
        
        // If same date or both missing date, sort by time
        return (a.session_time || "").localeCompare(b.session_time || "");
      });

      setSessions(sortedSessions);
      setClasses((clsRes.data as Class[]) || []);
      setLoading(false);
    });
  }, []);

  // ── color map for classes ─────────────────────────────────────────────────
  const classColorMap = useMemo(() => {
    const m = new Map<string, number>();
    classes.forEach((c, i) => m.set(c.name, i % CLASS_COLORS.length));
    return m;
  }, [classes]);

  // ── conflict check (create modal) ─────────────────────────────────────────
  useEffect(() => {
    if (conflictTimeout.current) clearTimeout(conflictTimeout.current);
    setConflicts([]);
    const cls = classes.find(c => c.id === form.class_id);
    if (!cls?.teacher_id || !form.session_date || !form.session_time) return;
    conflictTimeout.current = setTimeout(async () => {
      try {
        const { data } = await createBrowserClient().rpc("check_teacher_conflict", {
          p_teacher_id: cls.teacher_id, p_session_date: form.session_date,
          p_session_time: form.session_time, p_exclude_session_id: null,
        });
        setConflicts((data as ConflictRow[]) || []);
      } catch { /* ignore */ }
    }, 500);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.class_id, form.session_date, form.session_time]);

  // ── filtering ─────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const existingClassIds = new Set(classes.map(c => c.id));
    const existingClassNames = new Set(classes.map(c => c.name));

    return sessions.filter(s => {
      // Only show sessions for classes that currently exist
      const classExists = (s.class_id && existingClassIds.has(s.class_id)) || 
                          (s.class_name && existingClassNames.has(s.class_name));
      if (!classExists) return false;

      const matchSearch = (s.class_name || "").toLowerCase().includes(search.toLowerCase()) ||
        (s.topic || "").toLowerCase().includes(search.toLowerCase());
      const matchStatus = !statusFilter || s.status === statusFilter;
      const matchClass  = !classFilter  || s.class_name === classFilter || s.class_id === classFilter;

      let matchDate = true;
      if (dateMode !== "all") {
        const sd = parseDD(s.session_date || "");
        if (!sd) return false;

        if (dateMode === "day" && filterDay) {
          const fd = new Date(filterDay + "T00:00:00");
          matchDate = sd.getFullYear() === fd.getFullYear() &&
                      sd.getMonth()    === fd.getMonth()    &&
                      sd.getDate()     === fd.getDate();
        } else if (dateMode === "week" && filterWeek) {
          const mon = weekInputToMonday(filterWeek);
          if (mon) {
            const [start, end] = weekRange(mon);
            matchDate = sd >= start && sd <= end;
          }
        } else if (dateMode === "month" && filterMonth) {
          const [y, m] = filterMonth.split("-").map(Number);
          matchDate = sd.getFullYear() === y && sd.getMonth() === m - 1;
        }
      }
      return matchSearch && matchStatus && matchClass && matchDate;
    }).sort((a, b) => {
      const da = parseDD(a.session_date || ""), db = parseDD(b.session_date || "");
      if (da && db) {
        if (da.getTime() !== db.getTime()) return da.getTime() - db.getTime();
      } else if (da) return -1;
      else if (db) return 1;
      return (a.session_time || "").localeCompare(b.session_time || "");
    });
  }, [sessions, search, statusFilter, classFilter, dateMode, filterDay, filterWeek, filterMonth]);

  // ── groupings ─────────────────────────────────────────────────────────────
  const byClass = useMemo(() => {
    const map = new Map<string, Session[]>();
    for (const s of filtered) {
      const key = s.class_name || "Không có lớp";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  const byDate = useMemo(() => {
    const map = new Map<string, Session[]>();
    for (const s of filtered) {
      const key = s.session_date || "Chưa có ngày";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    // Sort date keys
    return [...map.entries()].sort((a, b) => {
      const da = parseDD(a[0]), db = parseDD(b[0]);
      if (!da && !db) return 0;
      if (!da) return 1;
      if (!db) return -1;
      return da.getTime() - db.getTime();
    });
  }, [filtered]);

  // ── quick date presets ────────────────────────────────────────────────────
  function setThisWeek() {
    const today = new Date();
    const year = today.getFullYear();
    // ISO week number
    const startOfYear = new Date(year, 0, 1);
    const dayOfYear = Math.floor((today.getTime() - startOfYear.getTime()) / 86400000) + 1;
    const week = Math.ceil((dayOfYear + startOfYear.getDay()) / 7);
    setDateMode("week");
    setFilterWeek(`${year}-W${String(week).padStart(2, "0")}`);
  }
  function setThisMonth() {
    const today = new Date();
    setDateMode("month");
    setFilterMonth(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`);
  }
  function setToday() {
    const today = new Date();
    setDateMode("day");
    setFilterDay(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`);
  }

  // ── topic editing ─────────────────────────────────────────────────────────
  function startEditTopic(s: Session) {
    setEditingTopicId(s.id as number);
    setEditingTopicValue(s.topic || "");
    setTimeout(() => topicInputRef.current?.focus(), 50);
  }
  async function saveTopic(sessionId: number) {
    const newTopic = editingTopicValue.trim();
    setEditingTopicId(null);
    const old = sessions.find(s => s.id === sessionId)?.topic || "";
    if (newTopic === old) return;
    setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, topic: newTopic || null } : s));
    const { error } = await createBrowserClient().from("sessions").update({ topic: newTopic || null }).eq("id", sessionId);
    if (error) {
      toast.error("Lỗi lưu chủ đề");
      setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, topic: old || null } : s));
    } else toast.success("Đã cập nhật chủ đề");
  }

  // ── toggle done ───────────────────────────────────────────────────────────
  async function handleToggleDone(s: Session) {
    const newStatus = s.status === SESSION_STATUS.DONE ? SESSION_STATUS.UPCOMING : SESSION_STATUS.DONE;
    const { error } = await createBrowserClient().from("sessions").update({ status: newStatus }).eq("id", s.id);
    if (error) { toast.error(error.message); return; }
    setSessions(prev => prev.map(x => x.id === s.id ? { ...x, status: newStatus } : x));
    toast.success(newStatus === SESSION_STATUS.DONE ? "Đánh dấu hoàn thành!" : "Đã khôi phục trạng thái");
  }

  // ── reschedule ────────────────────────────────────────────────────────────
  function openReschedule(s: Session) {
    setRescheduleSession(s);
    setRescheduleDate(toInputDate(s.session_date || ""));
    setRescheduleTime(s.session_time || "");
    setRescheduleNote("");
    setRescheduleConflicts([]);
  }

  const checkRescheduleConflict = useCallback(async (date: string, time: string, session: Session) => {
    if (rescheduleConflictTimeout.current) clearTimeout(rescheduleConflictTimeout.current);
    setRescheduleConflicts([]);
    if (!date || !time) return;
    const cls = classes.find(c => c.id === session.class_id || c.name === session.class_name);
    if (!cls?.teacher_id) return;
    rescheduleConflictTimeout.current = setTimeout(async () => {
      try {
        const { data } = await createBrowserClient().rpc("check_teacher_conflict", {
          p_teacher_id: cls.teacher_id, p_session_date: fromInputDate(date),
          p_session_time: time, p_exclude_session_id: session.id ?? null,
        });
        setRescheduleConflicts((data as ConflictRow[]) || []);
      } catch { /* ignore */ }
    }, 400);
  }, [classes]);

  async function handleSaveReschedule() {
    if (!rescheduleSession || !rescheduleDate) return;
    setSavingReschedule(true);
    try {
      const supabase = createBrowserClient();
      const originalDate = rescheduleSession.session_date || "";
      const newDate = fromInputDate(rescheduleDate);
      const newTime = rescheduleTime || rescheduleSession.session_time;
      const makeupNote = `Học bù từ ngày ${originalDate} → ${newDate}`;

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
        .filter(s => s.class_id === rescheduleSession.class_id || s.class_name === rescheduleSession.class_name)
        .map(s => s.id === rescheduleSession.id ? { ...s, status: SESSION_STATUS.UPCOMING } : s)
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

      currentDates.set(rescheduleSession.id, newDate);

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
            } else if (s1.id === rescheduleSession.id) {
              toShift = colliding;
            } else if (colliding.id === rescheduleSession.id) {
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
          const newDateVal = currentDates.get(s.id)!;
          if (s.id === rescheduleSession.id) {
            const { error } = await supabase.from("sessions").update({
              session_date: newDateVal,
              session_time: newTime || null,
              makeup_original_date: originalDate,
              makeup_note: makeupNote,
              status: SESSION_STATUS.UPCOMING,
              ...(rescheduleNote.trim() ? { topic: rescheduleNote.trim() } : {}),
            }).eq("id", s.id);
            if (error) throw error;
          } else {
            const { error } = await supabase.from("sessions").update({
              session_date: newDateVal,
            }).eq("id", s.id);
            if (error) throw error;
          }
        })
      );

      // Update react state
      setSessions(prev => prev.map(s => {
        const newDateVal = currentDates.get(s.id);
        if (!newDateVal || newDateVal === s.session_date) return s;
        if (s.id === rescheduleSession.id) {
          return { 
            ...s, 
            session_date: newDateVal, 
            session_time: newTime || s.session_time, 
            topic: rescheduleNote.trim() || s.topic,
            makeup_original_date: originalDate, 
            makeup_note: makeupNote, 
            status: SESSION_STATUS.UPCOMING 
          };
        } else {
          return { 
            ...s, 
            session_date: newDateVal 
          };
        }
      }));

      toast.success(`Đã đổi lịch buổi #${rescheduleSession.session_no} sang ${newDate}!`);
      setRescheduleSession(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setSavingReschedule(false);
    }
  }

  // ── create ────────────────────────────────────────────────────────────────
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.class_id) { toast.error("Vui lòng chọn lớp học"); return; }
    setSaving(true);
    try {
      const cls = classes.find(c => c.id === form.class_id);
      // Auto-fill zoom_link from class.zoom_link if available
      const zoomFromClass = cls?.zoom_link || form.zoom_link || null;
      const payload = {
        class_id: form.class_id, class_name: cls?.name || "",
        session_no: form.session_no ? Number(form.session_no) : null,
        session_date: form.session_date || null, session_time: form.session_time || null,
        topic: form.topic || null, homework: form.homework || null, status: form.status,
        zoom_link: zoomFromClass,
      };
      const { data, error } = await createBrowserClient().from("sessions").insert(payload).select().single();
      if (error) throw new Error(error.message);
      setSessions(prev => [...prev, data as Session].sort((a, b) => {
        const da = parseDD(a.session_date || ""), db = parseDD(b.session_date || "");
        if (!da && !db) return 0; if (!da) return 1; if (!db) return -1;
        return da.getTime() - db.getTime();
      }));
      toast.success("Tạo buổi học thành công!");
      setModal(null); setForm(EMPTY_FORM); setConflicts([]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally { setSaving(false); }
  }

  // ── toggle collapse ───────────────────────────────────────────────────────
  function toggleCollapse(key: string) {
    setCollapsed(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  // ── auto-fill zoom_link when class is selected ──────────────────────────
  const selectedClass = useMemo(() => classes.find(c => c.id === form.class_id), [classes, form.class_id]);

  useEffect(() => {
    if (selectedClass?.zoom_link) {
      setForm(p => ({ ...p, zoom_link: p.zoom_link || selectedClass.zoom_link || "" }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClass?.id]);

  // ── inline zoom_link edit ────────────────────────────────────────────────
  const [editingZoomId, setEditingZoomId]     = useState<number | null>(null);
  const [editingZoomValue, setEditingZoomValue] = useState("");

  function startEditZoom(s: Session) {
    setEditingZoomId(s.id as number);
    setEditingZoomValue(s.zoom_link || "");
  }
  async function saveZoom(sessionId: number) {
    const newLink = editingZoomValue.trim();
    setEditingZoomId(null);
    const old = sessions.find(s => s.id === sessionId)?.zoom_link || "";
    if (newLink === old) return;
    setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, zoom_link: newLink || null } : s));
    const { error } = await createBrowserClient().from("sessions").update({ zoom_link: newLink || null }).eq("id", sessionId);
    if (error) {
      toast.error("Lỗi lưu link học: " + error.message);
      setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, zoom_link: old || null } : s));
    } else toast.success("Đã cập nhật link học");
  }

  // ── session row (shared between both views) ───────────────────────────────
  function SessionRow({ s, showClass }: { s: Session; showClass?: boolean }) {
    const colorIdx = classColorMap.get(s.class_name || "") ?? 0;
    return (
      <tr className="hover:bg-gray-50 transition-colors group">
        <td className="px-4 py-3 text-sm font-medium text-gray-700">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-brand-100 rounded-lg flex items-center justify-center shrink-0">
              <BookOpen className="w-3.5 h-3.5 text-brand-600" />
            </div>
            #{s.session_no}
          </div>
        </td>
        {showClass && (
          <td className="px-4 py-3">
            <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg border ${CLASS_COLORS[colorIdx]}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${CLASS_DOT_COLORS[colorIdx]}`} />
              {s.class_name || "–"}
            </span>
          </td>
        )}
        <td className="px-4 py-3">
          <span className="flex items-center gap-1.5 text-sm text-gray-600">
            <Calendar className="w-3.5 h-3.5 text-gray-400" />{s.session_date || "–"}
          </span>
        </td>
        <td className="px-4 py-3">
          <span className="flex items-center gap-1.5 text-sm text-gray-600">
            <Clock className="w-3.5 h-3.5 text-gray-400" />{s.session_time || "–"}
          </span>
        </td>
        <td className="px-4 py-3 max-w-52">
          {editingTopicId === s.id ? (
            <input ref={topicInputRef} type="text" value={editingTopicValue}
              onChange={e => setEditingTopicValue(e.target.value)}
              onBlur={() => saveTopic(s.id as number)}
              onKeyDown={e => {
                if (e.key === "Enter") { e.preventDefault(); saveTopic(s.id as number); }
                if (e.key === "Escape") setEditingTopicId(null);
              }}
              className="w-full rounded-lg border border-brand-400 bg-white px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="Nhập chủ đề..." />
          ) : (
            <button type="button" onClick={() => startEditTopic(s)}
              className="group/t flex items-center gap-1.5 text-left w-full text-sm text-gray-600 hover:text-gray-900 transition-colors"
              title="Nhấn để chỉnh sửa chủ đề">
              <span className="truncate">{s.topic || <span className="text-gray-300 italic">Chưa có chủ đề</span>}</span>
              <Pencil className="w-3 h-3 text-gray-300 group-hover/t:text-brand-500 shrink-0 transition-colors" />
            </button>
          )}
        </td>
        {/* Zoom link column */}
        <td className="px-4 py-3 max-w-48">
          {editingZoomId === s.id ? (
            <div className="flex gap-1">
              <input type="url" value={editingZoomValue}
                onChange={e => setEditingZoomValue(e.target.value)}
                onBlur={() => saveZoom(s.id as number)}
                onKeyDown={e => {
                  if (e.key === "Enter") { e.preventDefault(); saveZoom(s.id as number); }
                  if (e.key === "Escape") setEditingZoomId(null);
                }}
                className="flex-1 rounded-lg border border-brand-400 bg-white px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="https://zoom.us/..." autoFocus />
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              {s.zoom_link ? (
                <>
                  <a href={s.zoom_link} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 truncate max-w-36"
                    title={s.zoom_link}>
                    <ExternalLink className="w-3 h-3 shrink-0" />
                    <Video className="w-3 h-3 shrink-0" />
                    <span className="truncate">{s.zoom_link.includes("zoom") ? "Zoom" : s.zoom_link.includes("meet") ? "Meet" : "Link"}</span>
                  </a>
                  <button type="button" onClick={() => startEditZoom(s)}
                    className="opacity-0 group-hover:opacity-100 shrink-0 text-gray-400 hover:text-brand-500 transition-all"
                    title="Chỉnh sửa link">
                    <Pencil className="w-3 h-3" />
                  </button>
                </>
              ) : (
                <button type="button" onClick={() => startEditZoom(s)}
                  className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-blue-600 transition-colors"
                  title="Thêm link học">
                  <Video className="w-3.5 h-3.5" />
                  <span className="text-xs italic">Chưa có</span>
                  <Pencil className="w-3 h-3 text-gray-300" />
                </button>
              )}
            </div>
          )}
        </td>
        <td className="px-4 py-3">{statusBadge(s.status)}</td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-1.5">
            {s.status === SESSION_STATUS.UPCOMING && (
              <Button variant="outline" size="sm" icon={<ArrowRightLeft className="w-3.5 h-3.5 text-sky-600" />} onClick={() => openReschedule(s)}>
                Đổi lịch
              </Button>
            )}
            {s.status !== SESSION_STATUS.CANCELLED && (
              <Button variant="ghost" size="sm" icon={<Check className="w-3.5 h-3.5" />} onClick={() => handleToggleDone(s)}>
                {s.status === SESSION_STATUS.DONE ? "Bỏ xong" : "Xong"}
              </Button>
            )}
          </div>
        </td>
      </tr>
    );
  }

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <PageWrapper>
      {/* Header */}
      <div className="page-header flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="page-title">Quản Lý Buổi Học</h1>
          <p className="page-subtitle">{sessions.length} buổi học · {filtered.length} đang hiển thị</p>
        </div>
        <Button icon={<Plus className="w-4 h-4" />} onClick={() => { setForm(EMPTY_FORM); setConflicts([]); setModal("create"); }}>
          Thêm buổi học
        </Button>
      </div>

      {loadError && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-sm">
          <p className="font-semibold text-red-700 mb-1">⚠️ {loadError}</p>
          <p className="text-red-600 text-xs">
            Nếu lỗi <code className="bg-red-100 px-1 rounded">infinite recursion</code> trên{" "}
            <code className="bg-red-100 px-1 rounded">enrollments</code>, chạy{" "}
            <code className="bg-red-100 px-1 rounded">015_fix_enrollments_students_rls_recursion.sql</code>.
            Các lỗi quyền admin khác:{" "}
            <code className="bg-red-100 px-1 rounded">014_fix_admin_rls_access.sql</code> (Supabase → SQL Editor).
          </p>
        </div>
      )}

      {/* Filter bar */}
      <Card className="p-4 mb-4">
        <div className="flex flex-wrap gap-3 items-end">
          {/* Search */}
          <div className="flex-1 min-w-48">
            <Input placeholder="Tìm lớp học, chủ đề..." value={search} onChange={e => setSearch(e.target.value)} icon={<Search className="w-4 h-4" />} />
          </div>

          {/* Class filter */}
          <div className="w-52">
            <Select value={classFilter} onChange={e => setClassFilter(e.target.value)}
              placeholder="Tất cả lớp học"
              options={classes.map(c => ({ value: c.name, label: c.name }))}
            />
          </div>

          {/* Status filter */}
          <div className="w-44">
            <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              placeholder="Tất cả trạng thái"
              options={[
                { value: SESSION_STATUS.UPCOMING, label: "Sắp diễn ra" },
                { value: SESSION_STATUS.DONE, label: "Hoàn thành" },
                { value: SESSION_STATUS.CANCELLED, label: "Đã hủy" },
              ]}
            />
          </div>
        </div>

        {/* Date filter row */}
        <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-gray-100">
          <span className="text-xs font-medium text-gray-500 shrink-0">Lọc theo:</span>

          {/* Quick preset buttons */}
          {(["all", "day", "week", "month"] as DateFilterMode[]).map(mode => (
            <button key={mode}
              onClick={() => setDateMode(mode)}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${dateMode === mode ? "bg-brand-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
              {mode === "all" ? "Tất cả" : mode === "day" ? "Ngày" : mode === "week" ? "Tuần" : "Tháng"}
            </button>
          ))}

          {/* Quick shortcuts */}
          <span className="text-gray-300 text-xs">|</span>
          <button onClick={setToday}     className="text-xs px-2.5 py-1.5 rounded-lg bg-sky-50 text-sky-600 hover:bg-sky-100 font-medium transition-colors">Hôm nay</button>
          <button onClick={setThisWeek}  className="text-xs px-2.5 py-1.5 rounded-lg bg-sky-50 text-sky-600 hover:bg-sky-100 font-medium transition-colors">Tuần này</button>
          <button onClick={setThisMonth} className="text-xs px-2.5 py-1.5 rounded-lg bg-sky-50 text-sky-600 hover:bg-sky-100 font-medium transition-colors">Tháng này</button>

          {/* Date inputs */}
          {dateMode === "day" && (
            <input type="date" value={filterDay} onChange={e => setFilterDay(e.target.value)}
              className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          )}
          {dateMode === "week" && (
            <input type="week" value={filterWeek} onChange={e => setFilterWeek(e.target.value)}
              className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          )}
          {dateMode === "month" && (
            <input type="month" value={filterMonth} onChange={e => setFilterMonth(e.target.value)}
              className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          )}

          <span className="ml-auto text-xs text-gray-400">{filtered.length} buổi</span>
        </div>
      </Card>

      {/* View mode toggle */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs text-gray-500">Hiển thị:</span>
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
          {([
            { id: "by-date",  label: "Theo ngày", icon: <Calendar className="w-3.5 h-3.5" /> },
            { id: "by-class", label: "Theo lớp",  icon: <LayoutList className="w-3.5 h-3.5" /> },
          ] as { id: ViewMode; label: string; icon: React.ReactNode }[]).map(v => (
            <button key={v.id} onClick={() => setViewMode(v.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${viewMode === v.id ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"}`}>
              {v.icon}{v.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── VIEW: Theo ngày ── */}
      {viewMode === "by-date" && (
        <div className="space-y-4">
          {loading ? (
            <Card><div className="p-4"><SkeletonTable /></div></Card>
          ) : byDate.length === 0 ? (
            <Card>
              <div className="text-center py-12 text-gray-400">
                <Calendar className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm font-medium">Không có buổi học nào trong khoảng thời gian này</p>
                {sessions.length === 0 && !loadError && (
                  <p className="text-xs mt-2 text-amber-500">
                    Nếu bạn đã tạo lớp học kèm lịch học, hãy vào{" "}
                    <a href="/admin/settings" className="underline text-amber-600">Cài đặt</a>{" "}
                    để kiểm tra quyền truy cập database.
                  </p>
                )}
              </div>
            </Card>
          ) : (
            byDate.map(([date, dateSessions]) => {
              const parsed = parseDD(date);
              const dayNames = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
              const dayName = parsed ? dayNames[parsed.getDay()] : "";
              const isToday = parsed ? parsed.toDateString() === new Date().toDateString() : false;
              const isCollapsed = collapsed.has(`date-${date}`);

              const done    = dateSessions.filter(s => s.status === SESSION_STATUS.DONE).length;
              const upcoming = dateSessions.filter(s => s.status === SESSION_STATUS.UPCOMING).length;

              return (
                <Card key={date} className="overflow-hidden">
                  {/* Date group header */}
                  <button
                    onClick={() => toggleCollapse(`date-${date}`)}
                    className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left">
                    <div className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center shrink-0 ${isToday ? "bg-brand-600 text-white" : "bg-white border border-gray-200 text-gray-700"}`}>
                      <span className="text-xs font-bold leading-none">{parsed ? String(parsed.getDate()).padStart(2, "0") : "?"}</span>
                      <span className="text-[10px] leading-none mt-0.5 opacity-70">{dayName}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold ${isToday ? "text-brand-700" : "text-gray-900"}`}>
                        {date} {isToday && <span className="ml-1 text-xs font-medium text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full">Hôm nay</span>}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {dateSessions.length} buổi học
                        {done > 0 && <span className="ml-2 text-emerald-600">✓ {done} xong</span>}
                        {upcoming > 0 && <span className="ml-2 text-sky-600">⏳ {upcoming} sắp tới</span>}
                      </p>
                    </div>
                    {/* Class chips preview */}
                    <div className="hidden sm:flex items-center gap-1.5 flex-wrap max-w-xs">
                      {[...new Set(dateSessions.map(s => s.class_name))].slice(0, 4).map(cn => {
                        const ci = classColorMap.get(cn || "") ?? 0;
                        return (
                          <span key={cn} className={`text-xs px-2 py-0.5 rounded-md border font-medium ${CLASS_COLORS[ci]}`}>
                            {cn}
                          </span>
                        );
                      })}
                      {[...new Set(dateSessions.map(s => s.class_name))].length > 4 && (
                        <span className="text-xs text-gray-400">+{[...new Set(dateSessions.map(s => s.class_name))].length - 4}</span>
                      )}
                    </div>
                    {isCollapsed ? <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />}
                  </button>

                  {!isCollapsed && (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                            <th className="text-left px-4 py-2">Buổi #</th>
                            <th className="text-left px-4 py-2">Lớp học</th>
                            <th className="text-left px-4 py-2">Ngày</th>
                            <th className="text-left px-4 py-2">Giờ</th>
                            <th className="text-left px-4 py-2">Chủ đề</th>
                            <th className="text-left px-4 py-2">Link</th>
                            <th className="text-left px-4 py-2">Trạng thái</th>
                            <th className="text-left px-4 py-2"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {dateSessions.map(s => <SessionRow key={s.id} s={s} showClass />)}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* ── VIEW: Theo lớp ── */}
      {viewMode === "by-class" && (
        <div className="space-y-4">
          {loading ? (
            <Card><div className="p-4"><SkeletonTable /></div></Card>
          ) : byClass.length === 0 ? (
            <Card>
              <div className="text-center py-12 text-gray-400">
                <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm font-medium">Không tìm thấy buổi học nào</p>
                {sessions.length === 0 && !loadError && (
                  <p className="text-xs mt-2 text-amber-500">
                    Nếu bạn đã tạo lớp học kèm lịch học, hãy vào{" "}
                    <a href="/admin/settings" className="underline text-amber-600">Cài đặt</a>{" "}
                    để kiểm tra quyền truy cập database.
                  </p>
                )}
              </div>
            </Card>
          ) : (
            byClass.map(([cName, cSessions]) => {
              const colorIdx = classColorMap.get(cName) ?? 0;
              const isCollapsed = collapsed.has(`class-${cName}`);
              const done    = cSessions.filter(s => s.status === SESSION_STATUS.DONE).length;
              const upcoming = cSessions.filter(s => s.status === SESSION_STATUS.UPCOMING).length;
              const cancelled = cSessions.filter(s => s.status === SESSION_STATUS.CANCELLED).length;

              return (
                <Card key={cName} className="overflow-hidden">
                  {/* Class group header */}
                  <button
                    onClick={() => toggleCollapse(`class-${cName}`)}
                    className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${CLASS_COLORS[colorIdx]}`}>
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{cName}</p>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
                        <span>{cSessions.length} buổi</span>
                        {done > 0 && <span className="text-emerald-600 font-medium">✓ {done} xong</span>}
                        {upcoming > 0 && <span className="text-sky-600 font-medium">⏳ {upcoming} sắp tới</span>}
                        {cancelled > 0 && <span className="text-red-500 font-medium">✗ {cancelled} hủy</span>}
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div className="hidden sm:block w-32">
                      <div className="flex justify-between text-xs text-gray-400 mb-1">
                        <span>Tiến độ</span>
                        <span>{done}/{cSessions.length}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div className={`h-1.5 rounded-full ${CLASS_DOT_COLORS[colorIdx]}`}
                          style={{ width: `${cSessions.length > 0 ? (done / cSessions.length) * 100 : 0}%` }} />
                      </div>
                    </div>
                    {isCollapsed ? <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />}
                  </button>

                  {!isCollapsed && (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                            <th className="text-left px-4 py-2">Buổi #</th>
                            <th className="text-left px-4 py-2">Ngày</th>
                            <th className="text-left px-4 py-2">Giờ</th>
                            <th className="text-left px-4 py-2">Chủ đề</th>
                            <th className="text-left px-4 py-2">Link</th>
                            <th className="text-left px-4 py-2">Trạng thái</th>
                            <th className="text-left px-4 py-2"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {cSessions.map(s => <SessionRow key={s.id} s={s} />)}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* ── Reschedule Modal ── */}
      <Modal open={!!rescheduleSession} onClose={() => setRescheduleSession(null)}
        title={`Đổi lịch – ${rescheduleSession?.class_name} · Buổi #${rescheduleSession?.session_no}`}>
        {rescheduleSession && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl text-sm">
              <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
              <div>
                <span className="text-xs text-gray-500">Lịch hiện tại: </span>
                <span className="font-semibold text-gray-800">
                  {rescheduleSession.session_date || "–"}
                  {rescheduleSession.session_time && ` · ${rescheduleSession.session_time}`}
                </span>
              </div>
            </div>
            <div className="flex justify-center">
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <ArrowRightLeft className="w-4 h-4 text-sky-500" /><span>Chuyển sang</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ngày mới *</label>
                <input type="date" value={rescheduleDate}
                  onChange={e => { setRescheduleDate(e.target.value); checkRescheduleConflict(e.target.value, rescheduleTime, rescheduleSession); }}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Giờ mới</label>
                <input type="time" value={rescheduleTime}
                  onChange={e => { setRescheduleTime(e.target.value); checkRescheduleConflict(rescheduleDate, e.target.value, rescheduleSession); }}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
            </div>
            {rescheduleConflicts.length > 0 && (
              <div className="rounded-xl bg-amber-50 border border-amber-300 px-3 py-2.5 flex gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-amber-700">Cảnh báo: Giảng viên bị trùng lịch!</p>
                  {rescheduleConflicts.map((c, i) => (
                    <p key={i} className="text-xs text-amber-600 mt-0.5">
                      Lớp <strong>{c.class_name}</strong> – Buổi #{c.session_no} lúc {c.session_time}
                    </p>
                  ))}
                </div>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cập nhật chủ đề <span className="text-xs text-gray-400 font-normal">(tuỳ chọn)</span>
              </label>
              <input type="text" value={rescheduleNote} onChange={e => setRescheduleNote(e.target.value)}
                placeholder={rescheduleSession.topic || "Giữ nguyên chủ đề cũ nếu để trống..."}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            {rescheduleDate && (
              <div className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2.5">
                <p className="text-xs font-semibold text-sky-700 mb-1 flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />Lịch sau khi đổi</p>
                <p className="text-sm font-medium text-sky-900">{rescheduleSession.class_name} · Buổi #{rescheduleSession.session_no}</p>
                <p className="text-xs text-sky-700 mt-0.5">{fromInputDate(rescheduleDate)}{rescheduleTime && ` · ${rescheduleTime}`}</p>
              </div>
            )}
            <div className="flex gap-3 pt-1">
              <Button variant="secondary" className="flex-1" onClick={() => setRescheduleSession(null)}>Hủy</Button>
              <Button className="flex-1" loading={savingReschedule} onClick={handleSaveReschedule} disabled={!rescheduleDate}>
                {rescheduleConflicts.length > 0 ? "Vẫn đổi lịch" : "Xác nhận đổi lịch"}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Create Modal ── */}
      <Modal open={modal === "create"} onClose={() => { setModal(null); setConflicts([]); }} title="Thêm buổi học">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Lớp học *</label>
            <select className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              value={form.class_id} onChange={e => setForm(p => ({ ...p, class_id: e.target.value }))} required>
              <option value="">– Chọn lớp –</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          {selectedClass && (
            <p className="text-xs text-gray-500 -mt-2">
              Giáo viên: <span className="font-medium">{(selectedClass as Class & { teacher?: { full_name: string | null } }).teacher?.full_name || "(chưa có)"}</span>
              {!selectedClass.teacher_id && <span className="text-amber-600 ml-1">– Chưa phân công</span>}
            </p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Input label="Buổi số" type="number" value={form.session_no} onChange={e => setForm(p => ({ ...p, session_no: e.target.value }))} placeholder="1" />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
              <Select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value as Session["status"] }))}
                options={[
                  { value: "UPCOMING", label: "Sắp diễn ra" },
                  { value: "DONE",     label: "Hoàn thành"  },
                  { value: "CANCELLED",label: "Đã hủy"      },
                ]} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Ngày học" type="date" value={form.session_date} onChange={e => setForm(p => ({ ...p, session_date: e.target.value }))} />
            <Input label="Giờ học"  type="time" value={form.session_time} onChange={e => setForm(p => ({ ...p, session_time: e.target.value }))} />
          </div>
          {conflicts.length > 0 && (
            <div className="rounded-xl bg-amber-50 border border-amber-300 px-3 py-2.5 flex gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-amber-700">Cảnh báo: Giảng viên bị trùng lịch!</p>
                {conflicts.map((c, i) => (
                  <p key={i} className="text-xs text-amber-600 mt-0.5">
                    Lớp <strong>{c.class_name}</strong> – Buổi #{c.session_no} lúc {c.session_time}
                  </p>
                ))}
              </div>
            </div>
          )}
          <Input label="Chủ đề" value={form.topic} onChange={e => setForm(p => ({ ...p, topic: e.target.value }))} placeholder="Unit 3: Academic Writing" />
          <Input label="Bài tập về nhà" value={form.homework} onChange={e => setForm(p => ({ ...p, homework: e.target.value }))} placeholder="Làm bài tập trang 45..." />
          <Input label="Link Zoom / Google Meet" value={form.zoom_link} onChange={e => setForm(p => ({ ...p, zoom_link: e.target.value }))} placeholder="https://zoom.us/j/... hoặc meet.google.com/..." />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => { setModal(null); setConflicts([]); }}>Hủy</Button>
            <Button type="submit" loading={saving} className="flex-1">
              {conflicts.length > 0 ? "Vẫn tạo buổi học" : "Tạo buổi học"}
            </Button>
          </div>
        </form>
      </Modal>
    </PageWrapper>
  );
}
