"use client";
import PageWrapper from "@/components/layouts/PageWrapper";
import { Card } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { SkeletonPage } from "@/components/ui/Skeleton";
import { createBrowserClient } from "@/lib/supabase/client";
import { SESSION_STATUS, ATTENDANCE_STATUS } from "@/lib/constants";
import { buildSessionRef } from "@/lib/sessionRefUtils";
import { AlertTriangle, ArrowLeft, ArrowRightLeft, BookOpen, Calendar, CheckSquare, DollarSign, ExternalLink, History, MessageSquare, Plus, Search, Star, Trash2, Users, Video, WrapText } from "lucide-react";
import Link from "next/link";
import Modal from "@/components/ui/Modal";
import { use, useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import type { ClassCurrent, ClassEvaluationRow, MakeupStatusRow, Session, SessionAttendance } from "@/types";

type TabId = "attendance" | "evaluation" | "makeup" | "students" | "manager";

interface ManagerProfile {
  id: string;
  profile_code?: string | null;
  full_name: string | null;
  email: string | null;
}

interface EnrolledStudent {
  enrollment_id: string;
  student_id: string;
  student_code?: string | null;
  full_name: string;
  email: string | null;
  phone: string | null;
  level_in?: string | null;
  level_out?: string | null;
  tuition_fee?: number | null;
  paid_fee?: number | null;
}

interface AvailableStudent {
  id: string;
  student_code?: string | null;
  full_name: string;
  email: string | null;
}

interface EnrollmentPayment {
  id: string;
  amount: number;
  note: string | null;
  paid_at: string;
}

function formatVND(amount: number | null | undefined) {
  if (amount == null) return "0 VNĐ";
  return amount.toLocaleString("vi-VN") + " VNĐ";
}

function StarDisplay({ value }: { value: number | null }) {
  if (!value) return <span className="text-gray-400 text-xs">–</span>;
  return (
    <span className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(n => (
        <Star key={n} className={`w-3.5 h-3.5 ${n <= value ? "text-amber-400 fill-current" : "text-gray-200"}`} />
      ))}
      <span className="text-xs font-semibold text-amber-600 ml-1">{value}</span>
    </span>
  );
}

export default function ClassDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const className = decodeURIComponent(id);

  const [classRows, setClassRows] = useState<ClassCurrent[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [attendance, setAttendance] = useState<Record<string, SessionAttendance[]>>({});
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Normalized class info
  const [classId, setClassId] = useState<string | null>(null);
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [teacherName, setTeacherName] = useState<string | null>(null);
  const [classSchedule, setClassSchedule] = useState<string | null>(null);
  const [sessionsDone, setSessionsDone] = useState(0);
  const [totalSessions, setTotalSessions] = useState(0);
  const [teacherSalaryPerHour, setTeacherSalaryPerHour] = useState<number | null>(null);
  const [scheduleTime, setScheduleTime] = useState<string | null>(null);
  const [scheduleEndTime, setScheduleEndTime] = useState<string | null>(null);
  const [classLevelIn, setClassLevelIn] = useState<string | null>(null);
  const [classLevelOut, setClassLevelOut] = useState<string | null>(null);

  // Reschedule modal
  interface ConflictRow { class_name: string; session_no: number; session_time: string; }
  const [rescheduleSession, setRescheduleSession] = useState<Session | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");
  const [rescheduleNote, setRescheduleNote] = useState("");
  const [rescheduleConflicts, setRescheduleConflicts] = useState<ConflictRow[]>([]);
  const [savingReschedule, setSavingReschedule] = useState(false);
  const rescheduleConflictTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Tabs
  const [tab, setTab] = useState<TabId>("attendance");

  // Evaluation tab
  const [evaluations, setEvaluations] = useState<ClassEvaluationRow[]>([]);
  const [evalLoading, setEvalLoading] = useState(false);

  // Makeup tab
  const [makeupRows, setMakeupRows] = useState<MakeupStatusRow[]>([]);
  const [makeupLoading, setMakeupLoading] = useState(false);

  // ── Admin Xếp học bù (chọn ngày/slot) ─────────────────────────────
  const [makeupAdminModal, setMakeupAdminModal] = useState<null | {
    studentName: string;
    studentId: string;
    absentSessionRef: string;
    absentReason: string;
  }>(null);
  const [makeupAdminCandidates, setMakeupAdminCandidates] = useState<Session[]>([]);
  const [makeupAdminDate, setMakeupAdminDate] = useState<string>("");
  const [makeupAdminTargetRef, setMakeupAdminTargetRef] = useState<string>("");
  const [makeupAdminTime, setMakeupAdminTime] = useState<string>(""); // HH:mm
  const [makeupAdminNote, setMakeupAdminNote] = useState<string>("");
  const [savingMakeupAdmin, setSavingMakeupAdmin] = useState(false);

  // Students tab
  const [enrolledStudents, setEnrolledStudents] = useState<EnrolledStudent[]>([]);
  const [availableStudents, setAvailableStudents] = useState<AvailableStudent[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentsTabLoaded, setStudentsTabLoaded] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");
  const [addSearch, setAddSearch] = useState("");
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [addingId, setAddingId] = useState<string | null>(null);

  // Configuration sub-modal for adding student
  const [studentToConfigure, setStudentToConfigure] = useState<AvailableStudent | null>(null);
  const [newStudentConfig, setNewStudentConfig] = useState({
    level_in: "",
    level_out: "",
    tuition_fee: 0,
    paid_fee: 0,
  });

  // Manager assignment tab
  const [allManagers, setAllManagers] = useState<ManagerProfile[]>([]);
  const [assignedManagers, setAssignedManagers] = useState<ManagerProfile[]>([]);
  const [managersLoading, setManagersLoading] = useState(false);
  const [assigningManagerId, setAssigningManagerId] = useState<string | null>(null);
  const [removingManagerId, setRemovingManagerId] = useState<string | null>(null);
  const [newManagerEmail, setNewManagerEmail] = useState("");
  const [newManagerName, setNewManagerName] = useState("");
  const [newManagerPassword, setNewManagerPassword] = useState("");
  const [creatingManager, setCreatingManager] = useState(false);
  const [showCreateManagerForm, setShowCreateManagerForm] = useState(false);

  // Financial & Level Modal
  const [financialModal, setFinancialModal] = useState<EnrolledStudent | null>(null);
  const [financialData, setFinancialData] = useState<{ level_in: string; level_out: string; invoiceId: number | null; amount: number; paid_total: number; remaining: number }>({ level_in: '', level_out: '', invoiceId: null, amount: 0, paid_total: 0, remaining: 0 });
  const [financialLoading, setFinancialLoading] = useState(false);
  const [financialSaving, setFinancialSaving] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState<EnrollmentPayment[]>([]);
  const [newPayment, setNewPayment] = useState({ amount: 0, note: "" });
  const [addingPayment, setAddingPayment] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createBrowserClient();

      // Step 1: Load sessions bằng class_name (luôn works — sessions đã tồn tại)
      const sessRes = await supabase
        .from("sessions")
        .select("id, class_id, class_name, session_no, session_date, session_time, topic, status, zoom_link")
        .eq("class_name", className)
        .order("session_no");
      console.log("[ClassDetail] sessions by class_name:", JSON.stringify(className), "| count:", sessRes.data?.length, "| error:", sessRes.error?.message);
      
      // Remove duplicates by id (keep the first occurrence)
      // Also detect duplicates by class_name+session_no+session_date to warn admin
      const idSeen = new Set<string | number>();
      const seenKeys = new Set<string>();
      const uniqueSessions: Session[] = (sessRes.data ?? []).reduce((acc: Session[], session: Session) => {
        // Skip if same id already seen (duplicate from DB)
        if (session.id && idSeen.has(session.id)) {
          console.warn("[ClassDetail] Duplicate session detected by id:", session.id, session);
          return acc;
        }
        // Skip if same class_name+session_no+session_date (definite duplicate)
        const key = `${session.class_name}|${session.session_no}|${session.session_date}`;
        if (seenKeys.has(key)) {
          console.warn("[ClassDetail] Duplicate session detected by key:", key, session);
          return acc;
        }
        idSeen.add(session.id);
        seenKeys.add(key);
        acc.push(session);
        return acc;
      }, [] as typeof sessRes.data) || [];
      
      // Warn if duplicates were removed
      if (uniqueSessions.length < (sessRes.data?.length || 0)) {
        const dupCount = (sessRes.data?.length || 0) - uniqueSessions.length;
        console.warn(`[ClassDetail] Removed ${dupCount} duplicate sessions`);
      }
      uniqueSessions.sort((a, b) => {
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
      
      // Update session_no sequentially based on date order to avoid skipping
      uniqueSessions.forEach((s, i) => {
        s.session_no = i + 1;
      });

      setSessions(uniqueSessions);

      // Step 2: Load class info từ bảng normalized "classes" (tách join để tránh PostgREST fail)
      const normRes = await supabase
        .from("classes")
        .select("id, name, teacher_id, schedule, sessions_done, total_sessions, teacher_salary_per_hour, schedule_time, schedule_end_time, level_in, level_out")
        .eq("name", className)
        .maybeSingle();
      console.log("[ClassDetail] class from normalized:", normRes.data ? "found" : "null", normRes.error?.message);

      let classId = className; // fallback: dùng class_name làm id

      if (normRes.data) {
        const nd = normRes.data;
        classId = nd.id;
        setClassId(nd.id);
        setTeacherId(nd.teacher_id ?? null);
        setClassSchedule(nd.schedule);
        setSessionsDone(nd.sessions_done ?? 0);
        setTotalSessions(nd.total_sessions ?? 0);
        setTeacherSalaryPerHour(nd.teacher_salary_per_hour ?? null);
        setScheduleTime(nd.schedule_time ?? null);
        setScheduleEndTime(nd.schedule_end_time ?? null);
        setClassLevelIn(nd.level_in ?? null);
        setClassLevelOut(nd.level_out ?? null);
        if (nd.teacher_id) {
          const { data: prof } = await supabase.from("profiles").select("full_name").eq("id", nd.teacher_id).maybeSingle();
          setTeacherName(prof?.full_name ?? null);
        }
      } else {
        // Class chưa có trong normalized table → lấy session count từ sessions
        setSessionsDone(0);
        setTotalSessions(sessRes.data?.length ?? 0);
        setClassSchedule(null);
        setClassId(null);
        setTeacherId(null);
        setTeacherName(null);
        setTeacherSalaryPerHour(null);
        setScheduleTime(null);
        setScheduleEndTime(null);
      }

      // Step 3: Load enrolled students
      // Try class_id from normalized table first, then fallback to sessions table
      let enrolledData: EnrolledStudent[] = [];
      if (normRes.data) {
        const enrollRes = await supabase
          .from("enrollments")
          .select("id, student_id, level_in, level_out, tuition_fee, paid_amount, students(id, student_code, full_name, email, phone)")
          .eq("class_id", normRes.data.id)
          .eq("status", "active");
        if (enrollRes.data && enrollRes.data.length > 0) {
          enrolledData = (enrollRes.data as unknown as {
            id: string; student_id: string; level_in?: string; level_out?: string;
            students: { id: string; student_code?: string | null; full_name: string; email: string | null; phone: string | null } | null;
          }[]).map((e) => ({
            enrollment_id: e.id,
            student_id: e.student_id,
            student_code: e.students?.student_code ?? null,
            full_name: e.students?.full_name ?? "",
            email: e.students?.email ?? null,
            phone: e.students?.phone ?? null,
            level_in: e.level_in ?? null,
            level_out: e.level_out ?? null,
            tuition_fee: (e as any).tuition_fee ?? 0,
            paid_fee: (e as any).paid_amount ?? 0,
          }));
        }
      } else {
        // Try to get class_id from sessions table
        const sessionWithClassId = sessRes.data?.find((s: Session) => s.class_id);
        if (sessionWithClassId?.class_id) {
          const enrollRes = await supabase
            .from("enrollments")
            .select("id, student_id, level_in, level_out, tuition_fee, paid_amount, students(id, student_code, full_name, email, phone)")
            .eq("class_id", sessionWithClassId.class_id)
            .eq("status", "active");
          if (enrollRes.data && enrollRes.data.length > 0) {
            enrolledData = (enrollRes.data as unknown as {
              id: string; student_id: string; level_in?: string; level_out?: string;
              students: { id: string; student_code?: string | null; full_name: string; email: string | null; phone: string | null } | null;
            }[]).map((e) => ({
              enrollment_id: e.id,
              student_id: e.student_id,
              student_code: e.students?.student_code ?? null,
              full_name: e.students?.full_name ?? "",
              email: e.students?.email ?? null,
              phone: e.students?.phone ?? null,
              level_in: e.level_in ?? null,
              level_out: e.level_out ?? null,
              tuition_fee: (e as any).tuition_fee ?? 0,
              paid_fee: (e as any).paid_amount ?? 0,
            }));
          }
        }
      }
      setEnrolledStudents(enrolledData);

      // Step 4: Query classes_current (legacy) for display — still used for some fields
      const classRes = await supabase
        .from("classes_current")
        .select("*")
        .eq("ten_lop", className);
      setClassRows(classRes.data || []);

      setLoading(false);
    }
    load().catch(console.error);
  }, [className]);

  async function loadStudentsTab(cId: string | null) {
    setStudentsLoading(true);
    const supabase = createBrowserClient();

    // Fetch enrolled students: use class_id if available, otherwise use class_name from sessions
    let enrollRes;
    if (cId) {
      enrollRes = await supabase
        .from("enrollments")
        .select("id, student_id, level_in, level_out, tuition_fee, paid_amount, students(id, student_code, full_name, email, phone)")
        .eq("class_id", cId)
        .eq("status", "active");
    } else {
      // Fallback: try to find class_id from sessions table using class_name
      const sessionsRes = await supabase
        .from("sessions")
        .select("class_id")
        .eq("class_name", className)
        .limit(1)
        .maybeSingle();
      if (sessionsRes.data?.class_id) {
        enrollRes = await supabase
          .from("enrollments")
          .select("id, student_id, level_in, level_out, tuition_fee, paid_amount, students(id, student_code, full_name, email, phone)")
          .eq("class_id", sessionsRes.data.class_id)
          .eq("status", "active");
      }
    }

    const allRes = await supabase.from("students").select("id, student_code, full_name, email").order("full_name");

    const enrolled: EnrolledStudent[] = ((enrollRes?.data || []) as unknown as {
      id: string; student_id: string;
      students: { id: string; student_code?: string | null; full_name: string; email: string | null; phone: string | null } | null;
    }[]).map((e) => ({
      enrollment_id: e.id,
      student_id: e.student_id,
      student_code: e.students?.student_code ?? null,
      full_name: e.students?.full_name ?? "",
      email: e.students?.email ?? null,
      phone: e.students?.phone ?? null,
      level_in: (e as any).level_in ?? null,
      level_out: (e as any).level_out ?? null,
      tuition_fee: (e as any).tuition_fee ?? 0,
      paid_fee: (e as any).paid_amount ?? 0,
    }));

    const enrolledIds = new Set(enrolled.map((e) => e.student_id));
    const available: AvailableStudent[] = ((allRes.data || []) as AvailableStudent[])
      .filter((s) => !enrolledIds.has(s.id));

    setEnrolledStudents(enrolled);
    setAvailableStudents(available);
    setStudentsTabLoaded(true);
    setStudentsLoading(false);
  }

  async function removeStudent(enrollmentId: string) {
    setRemovingId(enrollmentId);
    const { error } = await createBrowserClient()
      .from("enrollments")
      .delete()
      .eq("id", enrollmentId);
    if (error) { toast.error("Lỗi xóa học viên"); setRemovingId(null); return; }
    setEnrolledStudents((prev) => prev.filter((e) => e.enrollment_id !== enrollmentId));
    toast.success("Đã xóa học viên khỏi lớp");
    setRemovingId(null);
  }

  async function addStudent(student: AvailableStudent) {
    setStudentToConfigure(student);
    setNewStudentConfig({
      level_in: classLevelIn || "",
      level_out: classLevelOut || "",
      tuition_fee: 0,
      paid_fee: 0,
    });
  }

  async function confirmAddStudent() {
    if (!studentToConfigure) return;

    let targetClassId = classId;
    if (!targetClassId) {
      const supabase = createBrowserClient();
      const { data } = await supabase
        .from("sessions")
        .select("class_id")
        .eq("class_name", className)
        .limit(1)
        .maybeSingle();
      targetClassId = data?.class_id || null;
    }

    if (!targetClassId) {
      toast.error("Không tìm được lớp học. Vui lòng tạo lớp trong bảng classes trước.");
      return;
    }

    setAddingId(studentToConfigure.id);
    const supabase = createBrowserClient();
    
    // 1. Insert into enrollments
    const { data: enrollment, error } = await supabase
      .from("enrollments")
      .insert({
        class_id: targetClassId,
        student_id: studentToConfigure.id,
        status: "active",
        level_in: newStudentConfig.level_in || null,
        level_out: newStudentConfig.level_out || null,
        tuition_fee: newStudentConfig.tuition_fee,
        paid_amount: newStudentConfig.paid_fee,
      })
      .select("id")
      .single();

    if (error) {
      toast.error(error.message.includes("duplicate") ? "Học viên đã ở trong lớp" : "Lỗi thêm học viên");
      setAddingId(null);
      return;
    }

    // 2. If initial payment exists, record in enrollment_payments history
    if (newStudentConfig.paid_fee > 0 && enrollment) {
      const { error: payErr } = await supabase
        .from("enrollment_payments")
        .insert({
          enrollment_id: enrollment.id,
          amount: newStudentConfig.paid_fee,
          note: "Đóng học phí ban đầu khi vào lớp",
        });
      if (payErr) {
        console.error("[enrollment_payments Error]", payErr);
      }
    }

    // 3. Update React state
    setEnrolledStudents(prev => [...prev, {
      enrollment_id: enrollment?.id || "",
      student_id: studentToConfigure.id,
      student_code: studentToConfigure.student_code,
      full_name: studentToConfigure.full_name,
      email: studentToConfigure.email,
      phone: null,
      tuition_fee: newStudentConfig.tuition_fee,
      paid_fee: newStudentConfig.paid_fee,
      level_in: newStudentConfig.level_in || null,
      level_out: newStudentConfig.level_out || null,
    }]);

    setAvailableStudents(prev => prev.filter(s => s.id !== studentToConfigure.id));
    toast.success(`Đã thêm ${studentToConfigure.full_name} vào lớp`);
    setStudentToConfigure(null);
    setAddingId(null);
  }

  function toInputDate(ddMMyyyy: string): string {
    if (!ddMMyyyy) return "";
    const parts = ddMMyyyy.split("/");
    if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
    return ddMMyyyy;
  }
  function fromInputDate(yyyyMMdd: string): string {
    if (!yyyyMMdd) return "";
    const parts = yyyyMMdd.split("-");
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return yyyyMMdd;
  }

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
    if (!date || !time || !teacherId) return;
    rescheduleConflictTimeout.current = setTimeout(async () => {
      try {
        const supabase = createBrowserClient();
        const { data } = await supabase.rpc("check_teacher_conflict", {
          p_teacher_id:         teacherId,
          p_session_date:       fromInputDate(date),
          p_session_time:       time,
          p_exclude_session_id: session.id ?? null,
        });
        setRescheduleConflicts((data as ConflictRow[]) || []);
      } catch { /* ignore */ }
    }, 400);
  }, [teacherId]);

  async function handleSaveReschedule() {
    if (!rescheduleSession || !rescheduleDate) return;
    setSavingReschedule(true);
    try {
      const newDate = fromInputDate(rescheduleDate);
      const newTime = rescheduleTime || rescheduleSession.session_time;
      const { error } = await createBrowserClient()
        .from("sessions")
        .update({
          session_date: newDate,
          session_time: newTime || null,
          ...(rescheduleNote.trim() ? { topic: rescheduleNote.trim() } : {}),
        })
        .eq("id", rescheduleSession.id);
      if (error) throw new Error(error.message);
      setSessions(prev => prev.map(s =>
        s.id === rescheduleSession.id
          ? { ...s, session_date: newDate, session_time: newTime || s.session_time, topic: rescheduleNote.trim() || s.topic }
          : s
      ));
      toast.success(`Đã đổi lịch buổi #${rescheduleSession.session_no} sang ${newDate}!`);
      setRescheduleSession(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setSavingReschedule(false);
    }
  }

  // ── Functions cho Tab Tài Chính & Trình Độ ──────────────────────
  async function openFinancialModal(student: EnrolledStudent) {
    setFinancialModal(student);
    setFinancialLoading(true);
    setFinancialData({ 
      level_in: student.level_in || '', 
      level_out: student.level_out || '', 
      invoiceId: null, 
      amount: student.tuition_fee || 0, 
      paid_total: student.paid_fee || 0, 
      remaining: (student.tuition_fee || 0) - (student.paid_fee || 0) 
    });
    try {
      const supabase = createBrowserClient();
      
      // Load payment history
      const { data: payData } = await supabase
        .from("enrollment_payments")
        .select("*")
        .eq("enrollment_id", student.enrollment_id)
        .order("paid_at", { ascending: false });
      
      // Auto-repair: If student has paid_fee > 0 but no history records, create the initial payment record
      const sumPayments = (payData || []).reduce((acc: number, p: any) => acc + Number(p.amount), 0);
      if ((student.paid_fee || 0) > 0 && sumPayments === 0) {
        const { data: newPay, error: repairErr } = await supabase
          .from("enrollment_payments")
          .insert({
            enrollment_id: student.enrollment_id,
            amount: student.paid_fee,
            note: "Nộp phí ban đầu (lúc nhập học)"
          })
          .select()
          .single();
        
        if (!repairErr && newPay) {
          setPaymentHistory([newPay]);
        } else {
          setPaymentHistory(payData || []);
        }
      } else {
        setPaymentHistory(payData || []);
      }

      const { data, error } = await supabase
        .from("v_invoice_status")
        .select("*")
        .eq("enrollment_id", student.enrollment_id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error("Error fetching invoice:", error);
      } else if (data) {
        setFinancialData(p => ({
          ...p,
          invoiceId: data.id,
          // Use view totals if available
          paid_total: data.paid_total || p.paid_total,
          remaining: data.remaining || p.remaining
        }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setFinancialLoading(false);
    }
  }

  async function handleAddPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!financialModal || newPayment.amount <= 0) return;
    setAddingPayment(true);
    try {
      const supabase = createBrowserClient();
      const { data, error } = await supabase
        .from("enrollment_payments")
        .insert({
          enrollment_id: financialModal.enrollment_id,
          amount: newPayment.amount,
          note: newPayment.note || null
        })
        .select()
        .single();
      
      if (error) throw error;
      
      toast.success("Đã thêm đợt nộp phí!");
      setPaymentHistory(prev => [data, ...prev]);
      
      // Update local financialData
      const newTotalPaid = financialData.paid_total + newPayment.amount;
      setFinancialData(prev => ({
        ...prev,
        paid_total: newTotalPaid,
        remaining: prev.amount - newTotalPaid
      }));

      // Update student list
      setEnrolledStudents(prev => prev.map(s => 
        s.enrollment_id === financialModal.enrollment_id 
          ? { ...s, paid_fee: newTotalPaid } 
          : s
      ));

      setNewPayment({ amount: 0, note: "" });
    } catch (err) {
      toast.error("Lỗi thêm thanh toán");
    } finally {
      setAddingPayment(false);
    }
  }

  async function removePayment(id: string) {
    if (!confirm("Bạn có chắc muốn xóa đợt nộp này?")) return;
    try {
      const supabase = createBrowserClient();
      const { error } = await supabase
        .from("enrollment_payments")
        .delete()
        .eq("id", id);
      if (error) throw error;

      const removed = paymentHistory.find(p => p.id === id);
      setPaymentHistory(prev => prev.filter(p => p.id !== id));
      
      if (removed && financialModal) {
        const newTotalPaid = financialData.paid_total - removed.amount;
        setFinancialData(prev => ({
          ...prev,
          paid_total: newTotalPaid,
          remaining: prev.amount - newTotalPaid
        }));
        setEnrolledStudents(prev => prev.map(s => 
          s.enrollment_id === financialModal.enrollment_id 
            ? { ...s, paid_fee: newTotalPaid } 
            : s
        ));
      }
      toast.success("Đã xóa đợt nộp phí");
    } catch (err) {
      toast.error("Lỗi xóa thanh toán");
    }
  }

  async function saveFinancialData(e: React.FormEvent) {
    e.preventDefault();
    if (!financialModal) return;
    setFinancialSaving(true);
    try {
      const supabase = createBrowserClient();
      
      // Update levels in enrollments table
      const { error: enrErr } = await supabase
        .from("enrollments")
        .update({
          level_in: financialData.level_in || null,
          level_out: financialData.level_out || null,
          tuition_fee: financialData.amount,
          paid_amount: financialData.paid_total
        })
        .eq("id", financialModal.enrollment_id);
        
      if (enrErr) throw enrErr;

      // If there's an invoice, update its amount (total tuition fee)
      if (financialData.invoiceId) {
        const { error: invErr } = await supabase
          .from("invoices")
          .update({ amount: financialData.amount })
          .eq("id", financialData.invoiceId);
        if (invErr) throw invErr;
      } else if (financialData.amount > 0) {
        // Create an invoice if it doesn't exist but an amount is provided
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 7);
        const { error: newInvErr } = await supabase
          .from("invoices")
          .insert({
            enrollment_id: financialModal.enrollment_id,
            student_name: financialModal.full_name,
            class_name: className,
            amount: financialData.amount,
            due_date: dueDate.toISOString().split("T")[0]
          });
        if (newInvErr) throw newInvErr;
      }

      toast.success("Cập nhật thành công!");
      
      // Update local state for EnrolledStudent
      setEnrolledStudents(prev => prev.map(s => 
        s.enrollment_id === financialModal.enrollment_id 
          ? { 
              ...s, 
              level_in: financialData.level_in || null, 
              level_out: financialData.level_out || null,
              tuition_fee: financialData.amount,
              paid_fee: financialData.paid_total
            } 
          : s
      ));
      
      setFinancialModal(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setFinancialSaving(false);
    }
  }

  async function loadTabData(t: TabId) {
    setTab(t);
    if (t === "students" && !studentsTabLoaded) {
      await loadStudentsTab(classId);
    }
    if (t === "evaluation" && evaluations.length === 0) {
      setEvalLoading(true);
      const supabase = createBrowserClient();
      const { data, error } = await supabase.rpc("get_class_evaluations", { p_class_name: className });
      if (!error) setEvaluations((data as ClassEvaluationRow[]) || []);
      setEvalLoading(false);
    }
    if (t === "makeup" && makeupRows.length === 0) {
      setMakeupLoading(true);
      const supabase = createBrowserClient();
      const { data, error: rpcError } = await supabase.rpc("get_makeup_status", { p_class_name: className });
      if (!rpcError) setMakeupRows((data as MakeupStatusRow[]) || []);
      setMakeupLoading(false);
    }
    if (t === "manager") {
      await loadManagerTab();
    }
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
    const m = ymd.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return ymd;
    const [, y, mm, dd] = m;
    return `${dd}/${mm}/${y}`;
  }

  function buildAdminOtherSessionNote(dateYmd: string, timeStr: string, absentSessionNo: number | null | undefined): string {
    if (!dateYmd) return "";
    if (!timeStr) return "";
    const buoiNo = absentSessionNo ?? "";
    return `Bù slot: ${formatYmdToDDMMYYYY(dateYmd)} ${timeStr}, Buổi #${buoiNo}`;
  }

  function parseMakeupNote(note: string | null | undefined): { date: string; time: string } | null {
    if (!note) return null;
    const m = note.match(/Bù slot:\s*(\d{2}\/\d{2}\/\d{4})\s+(\d{2}:\d{2})/i);
    if (!m) return null;
    const [, ddmmyyyy, hhmm] = m;
    return { date: toDateInputValue(ddmmyyyy), time: hhmm };
  }

  function getMakeupMeta(row: MakeupStatusRow): {
    makeupWhen: string;
    teacher: string;
    statusLabel: string;
    statusVariant: "success" | "info" | "danger" | "gray";
  } {
    if (!row.has_makeup) {
      return {
        makeupWhen: "—",
        teacher: displayTeacher,
        statusLabel: "Chưa xếp bù",
        statusVariant: "danger",
      };
    }

    // similar_group: ưu tiên lấy từ target session
    if (row.target_session_ref) {
      const target = sessions.find((s) => makeSessionRefFromSession(s) === row.target_session_ref);
      if (target) {
        const label = target.status === SESSION_STATUS.DONE
          ? "Đã học bù"
          : target.status === SESSION_STATUS.CANCELLED
            ? "Buổi bù đã hủy"
            : "Đã xếp bù";
        const variant: "success" | "info" | "danger" = target.status === SESSION_STATUS.DONE
          ? "success"
          : target.status === SESSION_STATUS.CANCELLED
            ? "danger"
            : "info";
        return {
          makeupWhen: `${target.session_date || "—"}${target.session_time ? ` · ${target.session_time}` : ""}`,
          teacher: displayTeacher,
          statusLabel: label,
          statusVariant: variant,
        };
      }
    }

    // other_session: parse từ note
    const parsed = parseMakeupNote(row.note);
    if (!parsed) {
      return {
        makeupWhen: row.note || "—",
        teacher: displayTeacher,
        statusLabel: "Đã xếp bù",
        statusVariant: "info",
      };
    }

    const now = new Date();
    const slotAt = parsed.date ? new Date(`${parsed.date}T${parsed.time || "00:00"}:00`) : null;
    const isPast = !!slotAt && !isNaN(slotAt.getTime()) && slotAt.getTime() < now.getTime();
    return {
      makeupWhen: `${formatYmdToDDMMYYYY(parsed.date)}${parsed.time ? ` · ${parsed.time}` : ""}`,
      teacher: displayTeacher,
      statusLabel: isPast ? "Đã qua lịch bù" : "Đã xếp bù",
      statusVariant: isPast ? "gray" : "info",
    };
  }

  function makeSessionRefFromSession(s: Session): string {
    // sessions.class_name is used in legacy session_ref (matching session_attendance.class_name)
    return buildSessionRef(s.class_name || className, s.session_no || 0, s.session_date || "");
  }

  async function openMakeupAdmin(row: MakeupStatusRow) {
    if (!classId) {
      toast.error("Chưa tải được lớp học");
      return;
    }

    // Find absent session ref
    const absentSessionRef = buildSessionRef(className, row.session_no!, row.session_date || "");

    const supabase = createBrowserClient();

    // Resolve studentId + reason from session_attendance if possible
    let studentId = enrolledStudents.find(s => s.full_name === row.student_name)?.student_id || "";
    let absentReason = "";

    const { data: absentAtt } = await supabase
      .from("session_attendance")
      .select("student_id,note")
      .eq("session_ref", absentSessionRef)
      .eq("student_name", row.student_name)
      .maybeSingle();

    if (absentAtt?.student_id) studentId = absentAtt.student_id;
    absentReason = (absentAtt?.note || "") as string;

    if (!studentId) {
      toast.error("Không tìm thấy học viên trong session_attendance");
      return;
    }

    setMakeupAdminModal({
      studentName: row.student_name,
      studentId,
      absentSessionRef,
      absentReason,
    });
    setMakeupAdminCandidates([]);
    setMakeupAdminDate("");
    setMakeupAdminTargetRef("");
    setMakeupAdminTime("");
    setMakeupAdminNote("");
    setSavingMakeupAdmin(false);

    // Candidate slots: all upcoming sessions of classes where student is enrolled active
    const { data: enrollRows } = await supabase
      .from("enrollments")
      .select("class_id")
      .eq("student_id", studentId)
      .eq("status", "active");

    const classIds = (enrollRows || [])
      .map((r: { class_id: string }) => r.class_id)
      .filter(Boolean);

    if (classIds.length === 0) {
      toast.error("Học viên chưa có lớp học đang active để xếp bù");
      return;
    }

    const { data: cand } = await supabase
      .from("sessions")
      .select("*")
      .in("class_id", classIds)
      .eq("status", SESSION_STATUS.UPCOMING)
      .order("session_date", { ascending: true });

    const candidates = ((cand as Session[]) || []).filter(s => !!s.session_date && s.session_no !== null);
    setMakeupAdminCandidates(candidates);

    // Prefill cho cả tạo mới và chỉnh sửa
    const fallbackDateYmd = toDateInputValue(new Date().toISOString().slice(0, 10));
    const firstSlot = candidates[0];
    let defaultDateYmd = toDateInputValue(firstSlot?.session_date) || toDateInputValue(row.session_date) || fallbackDateYmd;
    let defaultTime = firstSlot?.session_time || "";
    let defaultTargetRef = "";

    if (row.has_makeup) {
      if (row.target_session_ref) {
        defaultTargetRef = row.target_session_ref;
        const target = candidates.find((s) => makeSessionRefFromSession(s) === row.target_session_ref);
        if (target) {
          defaultDateYmd = toDateInputValue(target.session_date);
          defaultTime = target.session_time || "";
        }
      } else {
        const parsed = parseMakeupNote(row.note);
        if (parsed) {
          defaultDateYmd = parsed.date || defaultDateYmd;
          defaultTime = parsed.time || defaultTime;
        }
      }
    }

    setMakeupAdminDate(defaultDateYmd);
    setMakeupAdminTime(defaultTime);
    setMakeupAdminTargetRef(defaultTargetRef);
    setMakeupAdminNote(
      row.has_makeup
        ? (row.note || (defaultTime ? buildAdminOtherSessionNote(defaultDateYmd, defaultTime, row.session_no) : ""))
        : (defaultTime ? buildAdminOtherSessionNote(defaultDateYmd, defaultTime, row.session_no) : "")
    );
  }

  async function handleSaveMakeupAdmin() {
    if (!makeupAdminModal) return;
    if (!makeupAdminNote.trim()) {
      toast.error("Vui lòng nhập ghi chú cho buổi học bù");
      return;
    }

    setSavingMakeupAdmin(true);
    try {
      const supabase = createBrowserClient();
      const { error } = await supabase.from("attendance_makeup").upsert({
        session_ref: makeupAdminModal.absentSessionRef,
        student_name: makeupAdminModal.studentName,
        makeup_type: makeupAdminTargetRef ? "similar_group" : "other_session",
        target_session_ref: makeupAdminTargetRef || null,
        note: makeupAdminNote || null,
        approved_by: "admin",
      }, { onConflict: "session_ref,student_name" });

      if (error) throw new Error(error.message);

      toast.success(`Đã xếp học bù cho ${makeupAdminModal.studentName}!`);
      setMakeupAdminModal(null);

      // Refresh makeup status rows
      const { data, error: rpcError } = await supabase.rpc("get_makeup_status", { p_class_name: className });
      if (!rpcError) setMakeupRows((data as MakeupStatusRow[]) || []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setSavingMakeupAdmin(false);
    }
  }

  async function loadManagerTab() {
    if (!classId) return;
    setManagersLoading(true);
    try {
      const supabase = createBrowserClient();
      const [managersRes, assignedRes] = await Promise.all([
        supabase.from("profiles").select("id, profile_code, full_name, email").eq("role", "academic_manager").order("full_name"),
        supabase.from("academic_manager_class_assignments")
          .select("manager_user_id")
          .eq("class_id", classId),
      ]);

      const allMgrs = (managersRes.data || []) as ManagerProfile[];
      setAllManagers(allMgrs);

      const assignedIds = ((assignedRes.data || []) as { manager_user_id: string }[]).map(r => r.manager_user_id);
      const assigned = allMgrs.filter(m => assignedIds.includes(m.id));
      setAssignedManagers(assigned);
    } catch {
      // Table might not exist yet (migration not run)
    } finally {
      setManagersLoading(false);
    }
  }

  async function assignManager(managerId: string) {
    if (!classId) return;
    setAssigningManagerId(managerId);
    const res = await fetch("/api/admin/assign-academic-manager", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ class_id: classId, manager_user_id: managerId }),
    });
    if (!res.ok) { toast.error("Lỗi gán quản lý"); setAssigningManagerId(null); return; }
    const mgr = allManagers.find(m => m.id === managerId);
    if (mgr) setAssignedManagers(prev => [...prev, mgr]);
    toast.success("Đã gán quản lý học vụ cho lớp");
    setAssigningManagerId(null);
  }

  async function removeManagerAssignment(managerId: string) {
    if (!classId) return;
    setRemovingManagerId(managerId);
    const res = await fetch("/api/admin/assign-academic-manager", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ class_id: classId, manager_user_id: managerId }),
    });
    if (!res.ok) { toast.error("Lỗi gỡ phân công"); setRemovingManagerId(null); return; }
    setAssignedManagers(prev => prev.filter(m => m.id !== managerId));
    toast.success("Đã gỡ phân công");
    setRemovingManagerId(null);
  }

  async function handleCreateManager() {
    if (!newManagerEmail || !newManagerPassword || !newManagerName) {
      toast.error("Vui lòng nhập đầy đủ thông tin"); return;
    }
    setCreatingManager(true);
    const res = await fetch("/api/admin/create-academic-manager-account", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: newManagerEmail, password: newManagerPassword, fullName: newManagerName }),
    });
    const json = await res.json();
    if (!res.ok) { toast.error(json.error || "Lỗi tạo tài khoản"); setCreatingManager(false); return; }
    toast.success("Tạo tài khoản quản lý học vụ thành công");
    setNewManagerEmail(""); setNewManagerPassword(""); setNewManagerName("");
    setShowCreateManagerForm(false);
    await loadManagerTab();
    setCreatingManager(false);
  }

  async function loadAttendance(session: Session) {
    const ref = buildSessionRef(session.class_name, session.session_no!, session.session_date!);
    const { data } = await createBrowserClient().from("session_attendance").select("*").eq("session_ref", ref);
    setAttendance(prev => ({ ...prev, [ref]: data || [] }));
    setActiveSession(session);
  }

  async function updateAttendance(session: Session, studentName: string, status: string) {
    const ref = buildSessionRef(session.class_name, session.session_no!, session.session_date!);
    const supabase = createBrowserClient();
    const { error } = await supabase.from("session_attendance").upsert({
      session_ref: ref, class_name: session.class_name, session_no: session.session_no,
      session_date: session.session_date, student_name: studentName, attendance_status: status,
    }, { onConflict: "session_ref,student_name" });
    if (error) { toast.error("Lỗi cập nhật điểm danh"); return; }
    setAttendance(prev => ({
      ...prev,
      [ref]: (prev[ref] || []).map(a =>
        a.student_name === studentName ? { ...a, attendance_status: status as "on_time" | "late" | "absent" } : a
      ),
    }));
    toast.success("Đã cập nhật điểm danh");
  }

  if (loading) return <PageWrapper><SkeletonPage /></PageWrapper>;

  // Use normalized enrolled students first, fall back to legacy classRows data
  const legacyStudents = [...new Set(classRows.map(r => r.hoc_vien).filter(Boolean))] as string[];
  const attendanceStudentNames: string[] = enrolledStudents.length > 0
    ? enrolledStudents.map(s => s.full_name)
    : legacyStudents;

  const mainClass = classRows[0];
  const displayTeacher = teacherName || mainClass?.giao_vien || "–";
  const displaySchedule = classSchedule || mainClass?.lich_hoc || "–";
  const actualDoneFromSessions = sessions.filter((s) => s.status === SESSION_STATUS.DONE).length;
  const displayDone = Math.max(actualDoneFromSessions, sessionsDone || 0, mainClass?.da_hoc || 0);
  const displayTotal = Math.max(totalSessions || 0, sessions.length, mainClass?.buoi_hoc || 0);
  const displayStudentCount = enrolledStudents.length > 0 ? enrolledStudents.length : legacyStudents.length;

  const tabItems: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: "attendance", label: "Điểm Danh",    icon: <CheckSquare className="w-4 h-4" /> },
    { id: "students",   label: "Học Viên",     icon: <Users className="w-4 h-4" /> },
    { id: "evaluation", label: "Đánh Giá",     icon: <Star className="w-4 h-4" /> },
    { id: "makeup",     label: "Học Bù",       icon: <WrapText className="w-4 h-4" /> },
    { id: "manager",    label: "Quản Lý HV",   icon: <BookOpen className="w-4 h-4" /> },
  ];

  // Derived stats for evaluation
  const classEvals = evaluations.filter(e => e.eval_type === "class_eval");
  const teacherEvals = evaluations.filter(e => e.eval_type === "teacher_eval");
  const avgClassRating = classEvals.length > 0
    ? (classEvals.reduce((s, e) => s + (e.rating ?? 0), 0) / classEvals.length).toFixed(1)
    : null;
  const avgTeacherRating = teacherEvals.length > 0
    ? (teacherEvals.reduce((s, e) => s + (e.rating ?? 0), 0) / teacherEvals.length).toFixed(1)
    : null;

  const makeupDone  = makeupRows.filter(r => r.has_makeup).length;
  const makeupTodo  = makeupRows.filter(r => !r.has_makeup).length;

  // Tính lương giáo viên
  let hoursPerSession = 1.5; // mặc định 1.5 giờ
  if (scheduleTime && scheduleEndTime) {
    const [startH, startM] = scheduleTime.split(":").map(Number);
    const [endH, endM] = scheduleEndTime.split(":").map(Number);
    if (!isNaN(startH) && !isNaN(endH)) {
      hoursPerSession = (endH + (endM || 0) / 60) - (startH + (startM || 0) / 60);
      if (hoursPerSession <= 0) hoursPerSession = 1.5;
    }
  }
  const totalSalary = (teacherSalaryPerHour || 0) * sessionsDone * hoursPerSession;

  return (
    <PageWrapper>
      <div className="mb-4">
        <Link href="/admin/classes">
          <Button variant="ghost" size="sm" icon={<ArrowLeft className="w-4 h-4" />}>Danh sách lớp</Button>
        </Link>
      </div>

      <div className="page-header">
        <h1 className="page-title">{className}</h1>
        <p className="page-subtitle">
          Giáo viên: {displayTeacher} · Lịch: {displaySchedule}
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <Card className="p-4 flex items-center gap-3">
          <div className="w-9 h-9 bg-sky-100 rounded-xl flex items-center justify-center"><Users className="w-4 h-4 text-sky-600" /></div>
          <div><p className="text-xl font-bold text-gray-900">{displayStudentCount}</p><p className="text-xs text-gray-500">Học viên</p></div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="w-9 h-9 bg-brand-100 rounded-xl flex items-center justify-center"><BookOpen className="w-4 h-4 text-brand-600" /></div>
          <div><p className="text-xl font-bold text-gray-900">{sessions.length}</p><p className="text-xs text-gray-500">Buổi học</p></div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="w-9 h-9 bg-emerald-100 rounded-xl flex items-center justify-center"><Calendar className="w-4 h-4 text-emerald-600" /></div>
          <div><p className="text-xl font-bold text-gray-900">{displayDone}/{displayTotal}</p><p className="text-xs text-gray-500">Đã học</p></div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="w-9 h-9 bg-red-100 rounded-xl flex items-center justify-center"><WrapText className="w-4 h-4 text-red-500" /></div>
          <div><p className="text-xl font-bold text-gray-900">{makeupTodo > 0 ? makeupTodo : "–"}</p><p className="text-xs text-gray-500">Chưa xếp bù</p></div>
        </Card>
        <Card className="p-4 flex items-center gap-3 border-emerald-100 bg-gradient-to-br from-emerald-50 to-teal-50">
          <div className="w-9 h-9 bg-emerald-100/50 rounded-xl flex items-center justify-center text-emerald-600 shrink-0">
            <BookOpen className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-emerald-900 truncate" title={`${new Intl.NumberFormat("vi-VN").format(totalSalary)} đ`}>
              {teacherSalaryPerHour ? `${new Intl.NumberFormat("vi-VN").format(totalSalary)} đ` : "Chưa cấu hình"}
            </p>
            <p className="text-[10px] text-emerald-700 mt-0.5">Lương dự kiến</p>
          </div>
        </Card>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-2xl mb-5 w-fit">
        {tabItems.map(t => (
          <button key={t.id} onClick={() => loadTabData(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${tab === t.id ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"}`}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* ── Tab: Điểm Danh ── */}
      {tab === "attendance" && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <Card className="p-5">
            <h3 className="section-title">Danh Sách Buổi Học</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {sessions.map(s => (
                <div key={s.id}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${activeSession?.id === s.id ? "bg-brand-50 border border-brand-200" : "hover:bg-gray-50"}`}>
                  <div
                    className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                    onClick={() => loadAttendance(s)}>
                    <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-xs font-bold text-gray-600 shrink-0">#{s.session_no}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{s.topic || "Buổi học"}</p>
                      <p className="text-xs text-gray-500">{s.session_date} · {s.session_time}</p>
                      {s.zoom_link && (
                        <a href={s.zoom_link} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium mt-0.5"
                          onClick={e => e.stopPropagation()}
                          title={s.zoom_link}>
                          <Video className="w-3 h-3" />
                          <span className="truncate max-w-40">{s.zoom_link.includes("zoom") ? "Zoom" : s.zoom_link.includes("meet") ? "Meet" : "Link"}</span>
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      )}
                    </div>
                    {s.status === SESSION_STATUS.DONE ? <Badge variant="success">✓</Badge>
                      : s.status === SESSION_STATUS.CANCELLED ? <Badge variant="danger">Hủy</Badge>
                        : <Badge variant="info">Sắp tới</Badge>}
                  </div>
                    {s.status !== SESSION_STATUS.DONE && s.status !== SESSION_STATUS.CANCELLED && (
                    <>
                      <button
                        onClick={(e) => { e.stopPropagation(); openReschedule(s); }}
                        title="Đổi lịch buổi này"
                        className="shrink-0 p-1.5 rounded-lg text-sky-500 hover:bg-sky-50 hover:text-sky-700 transition-colors"
                      >
                        <ArrowRightLeft className="w-4 h-4" />
                      </button>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          const link = prompt("Nhập link Zoom/Meet:", s.zoom_link || "");
                          if (link === null) return;
                          const newLink = link.trim() || null;
                          if (newLink === s.zoom_link) return;
                          
                          const supabase = createBrowserClient();
                          
                          // Update using the correct identifier based on what we have
                          // If id is a number, use it. Otherwise use class_name + session_no + session_date
                          let updateError: Error | null = null;
                          
                          if (typeof s.id === 'number' || !isNaN(Number(s.id))) {
                            // Use numeric id
                            const numericId = typeof s.id === 'number' ? s.id : Number(s.id);
                            const { error } = await supabase
                              .from("sessions")
                              .update({ zoom_link: newLink })
                              .eq("id", numericId);
                            updateError = error;
                          } else {
                            // Fallback: use class_name + session_no + session_date (with unique date)
                            const { error } = await supabase
                              .from("sessions")
                              .update({ zoom_link: newLink })
                              .eq("class_name", s.class_name)
                              .eq("session_no", s.session_no)
                              .eq("session_date", s.session_date);
                            updateError = error;
                          }
                          
                          if (updateError) {
                            toast.error("Lỗi cập nhật: " + updateError.message);
                          } else {
                            // Update local state
                            setSessions(prev => prev.map(x => x.id === s.id ? { ...x, zoom_link: newLink } : x));
                            toast.success("Đã cập nhật link");
                          }
                        }}
                        title="Sửa link học"
                        className="shrink-0 p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                      >
                        <Video className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              ))}
              {sessions.length === 0 && <p className="text-sm text-gray-400 text-center py-6">Chưa có buổi học nào</p>}
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="section-title">
              {activeSession ? `Điểm danh – Buổi #${activeSession.session_no} · ${activeSession.session_date}` : "Điểm Danh"}
            </h3>
            {!activeSession ? (
              <div className="text-center py-10 text-gray-400">
                <CheckSquare className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm">Chọn một buổi học để xem điểm danh</p>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Summary */}
                {attendanceStudentNames.length > 0 && (() => {
                  const ref = buildSessionRef(activeSession.class_name, activeSession.session_no!, activeSession.session_date!);
                  const attList = attendance[ref] || [];
                  const onTime = attList.filter(a => a.attendance_status === ATTENDANCE_STATUS.ON_TIME).length;
                  const late   = attList.filter(a => a.attendance_status === ATTENDANCE_STATUS.LATE).length;
                  const absent = attList.filter(a => a.attendance_status === ATTENDANCE_STATUS.ABSENT).length;
                  if (attList.length === 0) return null;
                  return (
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl text-xs mb-3">
                      <span className="text-gray-500">{attList.length}/{attendanceStudentNames.length} đã điểm danh</span>
                      <span className="ml-auto flex gap-3">
                        <span className="text-emerald-600 font-semibold">✓ {onTime} đúng giờ</span>
                        <span className="text-amber-600 font-semibold">⏰ {late} muộn</span>
                        <span className="text-red-600 font-semibold">✗ {absent} vắng</span>
                      </span>
                    </div>
                  );
                })()}
                {attendanceStudentNames.length === 0 ? (
                  <div className="text-center py-6 text-gray-400">
                    <p className="text-sm">Chưa có học viên trong lớp. Thêm học viên ở tab "Học Viên".</p>
                  </div>
                ) : (
                  attendanceStudentNames.map(student => {
                    const ref = buildSessionRef(activeSession.class_name, activeSession.session_no!, activeSession.session_date!);
                    const att = (attendance[ref] || []).find(a => a.student_name === student);
                    const status = att?.attendance_status || "unknown";
                    return (
                      <div key={student} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50">
                        <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center text-xs font-bold text-brand-600 shrink-0">
                          {student.charAt(0).toUpperCase()}
                        </div>
                        <span className="flex-1 text-sm font-medium text-gray-800">{student}</span>
                        <div className="flex gap-1.5">
                          {[
                            { val: ATTENDANCE_STATUS.ON_TIME, label: "Đúng giờ", color: "bg-emerald-500" },
                            { val: ATTENDANCE_STATUS.LATE,    label: "Muộn",     color: "bg-amber-500" },
                            { val: ATTENDANCE_STATUS.ABSENT,  label: "Vắng",     color: "bg-red-500" },
                          ].map(opt => (
                            <button key={opt.val}
                              onClick={() => updateAttendance(activeSession, student!, opt.val)}
                              className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all ${status === opt.val ? `${opt.color} text-white` : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ── Tab: Học Viên ── */}
      {tab === "students" && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {/* Enrolled students */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="section-title">Học Viên Trong Lớp</h3>
              <span className="text-xs font-semibold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full">
                {enrolledStudents.length} học viên
              </span>
            </div>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Tìm theo mã, tên hoặc email..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            {studentsLoading ? (
              <div className="flex justify-center py-10"><div className="w-6 h-6 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" /></div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {enrolledStudents
                  .filter((s) => s.full_name.toLowerCase().includes(studentSearch.toLowerCase()) || (s.email || "").toLowerCase().includes(studentSearch.toLowerCase()))
                  .map((s) => (
                    <div key={s.enrollment_id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 group">
                      <div className="w-8 h-8 bg-brand-100 rounded-full flex items-center justify-center text-xs font-bold text-brand-600 shrink-0">
                        {s.full_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {s.student_code ? `[${s.student_code}] ` : ""}{s.full_name}
                        </p>
                        <p className="text-xs text-gray-500 truncate">{s.email || s.phone || "–"}</p>
                      </div>
                      <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="subtle" size="sm" className="text-brand-600 bg-brand-50 hover:bg-brand-100 px-2.5 py-1 text-xs font-semibold rounded-lg"
                          onClick={() => openFinancialModal(s)}
                          title="Quản lý tài chính & trình độ"
                        >
                          Tài chính & Trình độ
                        </Button>
                        <button
                          onClick={() => removeStudent(s.enrollment_id)}
                          disabled={removingId === s.enrollment_id}
                          className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                          title="Xóa khỏi lớp"
                        >
                          {removingId === s.enrollment_id
                            ? <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                            : <Trash2 className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  ))}
                {enrolledStudents.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-8">Chưa có học viên nào trong lớp</p>
                )}
              </div>
            )}
          </Card>

          {/* Add students */}
          <Card className="p-5">
            <h3 className="section-title mb-4">Thêm Học Viên Vào Lớp</h3>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Tìm theo mã, tên hoặc email..."
                value={addSearch}
                onChange={(e) => setAddSearch(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {availableStudents
                .filter((s) =>
                  s.full_name.toLowerCase().includes(addSearch.toLowerCase()) ||
                  (s.email || "").toLowerCase().includes(addSearch.toLowerCase()) ||
                  (s.student_code || "").toLowerCase().includes(addSearch.toLowerCase())
                )
                .map((s) => (
                  <div key={s.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50">
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-xs font-bold text-gray-500 shrink-0">
                      {s.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {s.student_code ? `[${s.student_code}] ` : ""}{s.full_name}
                      </p>
                      <p className="text-xs text-gray-500 truncate">{s.email || "–"}</p>
                    </div>
                    <button
                      onClick={() => addStudent(s)}
                      disabled={addingId === s.id}
                      className="flex items-center gap-1 text-xs font-semibold text-brand-600 bg-brand-50 hover:bg-brand-100 px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {addingId === s.id
                        ? <div className="w-3.5 h-3.5 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
                        : <Plus className="w-3.5 h-3.5" />}
                      Thêm
                    </button>
                  </div>
                ))}
              {availableStudents.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-8">Tất cả học viên đã trong lớp</p>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Modal: Cấu hình tài chính & trình độ khi thêm Học viên */}
      {studentToConfigure && (
        <Modal
          open={true}
          onClose={() => setStudentToConfigure(null)}
          title={`Cấu hình Học viên: ${studentToConfigure.full_name}`}
          size="md"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              confirmAddStudent();
            }}
            className="space-y-4"
          >
            <div className="bg-gray-50/70 p-4 rounded-xl space-y-4 border border-gray-100">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Trình độ ban đầu
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand-500"
                    placeholder="VD: 5.0"
                    value={newStudentConfig.level_in}
                    onChange={(e) =>
                      setNewStudentConfig((p) => ({ ...p, level_in: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Mục tiêu đầu ra
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand-500"
                    placeholder="VD: 6.5"
                    value={newStudentConfig.level_out}
                    onChange={(e) =>
                      setNewStudentConfig((p) => ({ ...p, level_out: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Học phí tổng (VNĐ)
                </label>
                <input
                  type="number"
                  className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand-500 font-semibold text-brand-600"
                  placeholder="VD: 8000000"
                  value={newStudentConfig.tuition_fee || ""}
                  onChange={(e) =>
                    setNewStudentConfig((p) => ({
                      ...p,
                      tuition_fee: Math.round(Number(e.target.value)) || 0,
                    }))
                  }
                />
                <p className="text-[10px] text-gray-400 mt-1">
                  Định dạng: {formatVND(newStudentConfig.tuition_fee)}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100">
                <div>
                  <label className="block text-xs font-bold text-emerald-700 uppercase tracking-wider mb-1.5">
                    Đã đóng (VNĐ)
                  </label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border-2 border-emerald-200 bg-emerald-50/30 rounded-lg text-sm focus:outline-none focus:border-emerald-500 font-semibold text-emerald-600"
                    placeholder="VD: 2000000"
                    value={newStudentConfig.paid_fee || ""}
                    onChange={(e) =>
                      setNewStudentConfig((p) => ({
                        ...p,
                        paid_fee: Math.round(Number(e.target.value)) || 0,
                      }))
                    }
                  />
                  <p className="text-[10px] text-gray-400 mt-1">
                    Định dạng: {formatVND(newStudentConfig.paid_fee)}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                    Còn lại (VNĐ)
                  </label>
                  <div className="w-full px-3 py-2 bg-gray-100 rounded-lg text-sm font-bold text-gray-700 select-none border border-gray-200">
                    {formatVND(newStudentConfig.tuition_fee - newStudentConfig.paid_fee)}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="secondary"
                className="flex-1"
                onClick={() => setStudentToConfigure(null)}
              >
                Hủy
              </Button>
              <Button
                type="submit"
                loading={addingId === studentToConfigure.id}
                className="flex-1 font-semibold"
              >
                Xác nhận thêm
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Tab: Đánh Giá ── */}
      {tab === "evaluation" && (
        <div className="space-y-5">
          {evalLoading ? (
            <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" /></div>
          ) : (
            <>
              {/* Summary stats */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Card className="p-4">
                  <p className="text-xs text-gray-500 mb-2">Đánh giá buổi học (GV tự đánh giá)</p>
                  <div className="flex items-end gap-3">
                    <span className="text-3xl font-bold text-amber-500">{avgClassRating ?? "–"}</span>
                    <span className="text-sm text-gray-400 mb-1">/ 5 · {classEvals.length} buổi</span>
                  </div>
                  {avgClassRating && <StarDisplay value={parseFloat(avgClassRating)} />}
                </Card>
                <Card className="p-4">
                  <p className="text-xs text-gray-500 mb-2">Đánh giá giảng viên (Học viên đánh giá)</p>
                  <div className="flex items-end gap-3">
                    <span className="text-3xl font-bold text-sky-500">{avgTeacherRating ?? "–"}</span>
                    <span className="text-sm text-gray-400 mb-1">/ 5 · {teacherEvals.length} đánh giá</span>
                  </div>
                  {avgTeacherRating && <StarDisplay value={parseFloat(avgTeacherRating)} />}
                </Card>
              </div>

              {/* GV đánh giá buổi học */}
              {classEvals.length > 0 && (
                <Card className="p-5">
                  <h3 className="section-title flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-amber-500" />Giảng Viên Đánh Giá Buổi Học
                  </h3>
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {classEvals.map((e, i) => (
                      <div key={i} className="p-3 bg-amber-50 rounded-xl">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-gray-700">Buổi #{e.session_no} · {e.session_date}</span>
                          <StarDisplay value={e.rating} />
                        </div>
                        {e.comment && <p className="text-sm text-gray-700">{e.comment}</p>}
                        {e.rater_name && <p className="text-xs text-gray-400 mt-1">GV: {e.rater_name}</p>}
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* HV đánh giá GV */}
              {teacherEvals.length > 0 && (
                <Card className="p-5">
                  <h3 className="section-title flex items-center gap-2">
                    <Star className="w-4 h-4 text-sky-500" />Học Viên Đánh Giá Giảng Viên
                  </h3>
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {teacherEvals.map((e, i) => (
                      <div key={i} className="p-3 bg-sky-50 rounded-xl">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-gray-700">
                            {e.student_name} · Buổi #{e.session_no} · {e.session_date}
                          </span>
                          <StarDisplay value={e.rating} />
                        </div>
                        {e.comment && <p className="text-sm text-gray-700">{e.comment}</p>}
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {evaluations.length === 0 && (
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
            <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-red-400 border-t-transparent rounded-full animate-spin" /></div>
          ) : makeupRows.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <WrapText className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Không có học viên vắng nào trong lớp này</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    <th className="text-left px-3 py-2">Học viên</th>
                    <th className="text-left px-3 py-2">Buổi vắng</th>
                    <th className="text-left px-3 py-2">Ngày vắng</th>
                    <th className="text-left px-3 py-2">Buổi bù (ngày/giờ)</th>
                    <th className="text-left px-3 py-2">GV phụ trách</th>
                    <th className="text-left px-3 py-2">Tình trạng</th>
                    <th className="text-left px-3 py-2">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {makeupRows.map((row, i) => {
                    const meta = getMakeupMeta(row);
                    return (
                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                      <td className="px-3 py-2.5 text-sm font-medium text-gray-800">{row.student_name}</td>
                      <td className="px-3 py-2.5 text-sm text-gray-600">Buổi #{row.session_no}</td>
                      <td className="px-3 py-2.5 text-sm text-gray-600">{row.session_date || "–"}</td>
                      <td className="px-3 py-2.5 text-xs text-gray-700">{meta.makeupWhen}</td>
                      <td className="px-3 py-2.5 text-xs text-gray-700">{meta.teacher}</td>
                      <td className="px-3 py-2.5">
                        <Badge variant={meta.statusVariant}>{meta.statusLabel}</Badge>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-gray-500 max-w-60">
                        <div className="space-y-2">
                          <Button
                            variant={row.has_makeup ? "ghost" : "outline"}
                            size="sm"
                            onClick={() => openMakeupAdmin(row)}
                            className="w-full"
                            disabled={makeupLoading}
                          >
                            {row.has_makeup ? "Chỉnh / Xếp lại" : "Xếp bù"}
                          </Button>
                          {row.note ? <p className="text-[11px] text-gray-500">Ghi chú: {row.note}</p> : null}
                        </div>
                      </td>
                    </tr>
                  )})}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* ── Tab: Quản Lý Học Vụ ── */}
      {tab === "manager" && (
        <div className="space-y-6">
          {/* Assigned managers */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="section-title">Quản Lý Học Vụ Được Gán</h3>
              <Button
                size="sm"
                variant="secondary"
                icon={<Plus className="w-4 h-4" />}
                onClick={() => setShowCreateManagerForm(v => !v)}>
                Tạo tài khoản mới
              </Button>
            </div>

            {/* Create manager form */}
            {showCreateManagerForm && (
              <div className="mb-5 p-4 bg-sky-50 rounded-xl border border-sky-100 space-y-3">
                <p className="text-sm font-semibold text-sky-800">Tạo tài khoản Quản Lý Học Vụ</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Họ và tên *</label>
                    <input type="text" value={newManagerName} onChange={e => setNewManagerName(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                      placeholder="Nguyễn Văn A" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Email *</label>
                    <input type="email" value={newManagerEmail} onChange={e => setNewManagerEmail(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                      placeholder="manager@example.com" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Mật khẩu *</label>
                    <input type="password" value={newManagerPassword} onChange={e => setNewManagerPassword(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                      placeholder="••••••••" />
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button size="sm" variant="secondary" onClick={() => setShowCreateManagerForm(false)}>Hủy</Button>
                  <Button size="sm" loading={creatingManager} onClick={handleCreateManager}>Tạo tài khoản</Button>
                </div>
              </div>
            )}

            {managersLoading ? (
              <div className="flex justify-center py-8"><div className="w-7 h-7 border-4 border-brand-400 border-t-transparent rounded-full animate-spin" /></div>
            ) : assignedManagers.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Chưa có quản lý học vụ nào được gán cho lớp này</p>
              </div>
            ) : (
              <div className="space-y-2">
                {assignedManagers.map(m => (
                  <div key={m.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <div className="w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center text-sm font-bold text-purple-600 shrink-0">
                      {(m.full_name || "?")[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">
                        {m.profile_code ? `[${m.profile_code}] ` : ""}{m.full_name || "–"}
                      </p>
                      <p className="text-xs text-gray-500">{m.email || "–"}</p>
                    </div>
                    <Button
                      size="sm" variant="danger"
                      loading={removingManagerId === m.id}
                      onClick={() => removeManagerAssignment(m.id)}>
                      Gỡ
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Assign existing manager */}
          <Card className="p-5">
            <h3 className="section-title mb-4">Gán Quản Lý Từ Danh Sách</h3>
            {managersLoading ? (
              <div className="flex justify-center py-6"><div className="w-7 h-7 border-4 border-brand-400 border-t-transparent rounded-full animate-spin" /></div>
            ) : (
              <div className="space-y-2">
                {allManagers
                  .filter(m => !assignedManagers.some(a => a.id === m.id))
                  .map(m => (
                    <div key={m.id} className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl hover:bg-gray-50">
                      <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-500 shrink-0">
                        {(m.full_name || "?")[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900">
                          {m.profile_code ? `[${m.profile_code}] ` : ""}{m.full_name || "–"}
                        </p>
                        <p className="text-xs text-gray-500">{m.email || "–"}</p>
                      </div>
                      <Button
                        size="sm"
                        loading={assigningManagerId === m.id}
                        onClick={() => assignManager(m.id)}>
                        Gán
                      </Button>
                    </div>
                  ))}
                {allManagers.filter(m => !assignedManagers.some(a => a.id === m.id)).length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-4">
                    {allManagers.length === 0 ? "Chưa có tài khoản quản lý học vụ nào" : "Tất cả quản lý học vụ đã được gán cho lớp này"}
                  </p>
                )}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Admin Makeup Modal */}
      <Modal
        open={!!makeupAdminModal}
        onClose={() => setMakeupAdminModal(null)}
        title={`Xếp học bù – ${makeupAdminModal?.studentName || ""}`}
      >
        {makeupAdminModal && (
          <div className="space-y-4">
            <div className="rounded-xl bg-sky-50 border border-sky-100 p-3">
              <p className="text-xs text-sky-800 font-semibold mb-1">Lý do vắng</p>
              <p className="text-xs text-sky-900">{makeupAdminModal.absentReason || "–"}</p>
              <p className="text-xs text-gray-500 mt-2">
                Buổi vắng: <span className="font-mono">{makeupAdminModal.absentSessionRef}</span>
              </p>
            </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Chọn ngày bù *</label>
                  <input
                    type="date"
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    value={makeupAdminDate}
                    onChange={(e) => {
                      const nextDate = e.target.value;
                      setMakeupAdminDate(nextDate);
                      setMakeupAdminTargetRef("");
                      const parts = makeupAdminModal.absentSessionRef.split("#");
                      const absentBuoiNo = Number(parts?.[1] ?? "");
                      setMakeupAdminNote(buildAdminOtherSessionNote(nextDate, makeupAdminTime, absentBuoiNo));
                    }}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Giờ bù *</label>
                  <input
                    type="time"
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    value={makeupAdminTime}
                    onChange={(e) => {
                      const nextTime = e.target.value;
                      setMakeupAdminTime(nextTime);
                      setMakeupAdminTargetRef("");
                      const parts = makeupAdminModal.absentSessionRef.split("#");
                      const absentBuoiNo = Number(parts?.[1] ?? "");
                      setMakeupAdminNote(buildAdminOtherSessionNote(makeupAdminDate, nextTime, absentBuoiNo));
                    }}
                    required
                  />
                </div>
              </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú *</label>
              <textarea
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                rows={2}
                value={makeupAdminNote}
                onChange={(e) => setMakeupAdminNote(e.target.value)}
              />
            </div>

            <div className="flex gap-3 pt-1">
              <Button variant="secondary" className="flex-1" onClick={() => setMakeupAdminModal(null)}>Hủy</Button>
              <Button className="flex-1" loading={savingMakeupAdmin} onClick={handleSaveMakeupAdmin}>
                Xác nhận học bù
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Reschedule Modal */}
      <Modal
        open={!!rescheduleSession}
        onClose={() => setRescheduleSession(null)}
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
                <ArrowRightLeft className="w-4 h-4 text-sky-500" />
                <span>Chuyển sang</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ngày mới *</label>
                <input
                  type="date"
                  value={rescheduleDate}
                  onChange={e => {
                    setRescheduleDate(e.target.value);
                    checkRescheduleConflict(e.target.value, rescheduleTime, rescheduleSession);
                  }}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Giờ mới</label>
                <input
                  type="time"
                  value={rescheduleTime}
                  onChange={e => {
                    setRescheduleTime(e.target.value);
                    checkRescheduleConflict(rescheduleDate, e.target.value, rescheduleSession);
                  }}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
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
                Cập nhật chủ đề buổi học
                <span className="text-xs text-gray-400 font-normal ml-1">(tuỳ chọn)</span>
              </label>
              <input
                type="text"
                value={rescheduleNote}
                onChange={e => setRescheduleNote(e.target.value)}
                placeholder={rescheduleSession.topic || "Giữ nguyên chủ đề cũ nếu để trống..."}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            {rescheduleDate && (
              <div className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2.5">
                <p className="text-xs font-semibold text-sky-700 mb-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />Lịch sau khi đổi
                </p>
                <p className="text-sm font-medium text-sky-900">
                  {rescheduleSession.class_name} · Buổi #{rescheduleSession.session_no}
                </p>
                <p className="text-xs text-sky-700 mt-0.5">
                  {fromInputDate(rescheduleDate)}
                  {rescheduleTime && ` · ${rescheduleTime}`}
                </p>
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <Button variant="secondary" className="flex-1" onClick={() => setRescheduleSession(null)}>Hủy</Button>
              <Button
                className="flex-1"
                loading={savingReschedule}
                onClick={handleSaveReschedule}
                disabled={!rescheduleDate}>
                {rescheduleConflicts.length > 0 ? "Vẫn đổi lịch" : "Xác nhận đổi lịch"}
              </Button>
            </div>
          </div>
        )}
      </Modal>
      {/* Financial & Level Modal */}
      <Modal 
        open={!!financialModal} 
        onClose={() => setFinancialModal(null)} 
        title={`Quản lý Học phí & Trình độ`}
      >
        {financialLoading ? (
          <div className="flex justify-center py-10">
            <div className="w-8 h-8 border-4 border-brand-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : financialModal && (
          <div className="space-y-6 max-w-2xl mx-auto px-1">
            {/* Student Header */}
            <div className="flex items-center justify-between p-5 bg-brand-50 rounded-2xl border border-brand-100 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-brand-600 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-brand-200">
                  {financialModal.full_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-lg leading-tight">{financialModal.full_name}</h3>
                  <p className="text-xs text-brand-600 font-semibold tracking-wide uppercase mt-0.5">{financialModal.student_code || "Học viên"}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="secondary" onClick={() => setFinancialModal(null)} className="rounded-xl px-5">Đóng</Button>
                <Button type="button" onClick={saveFinancialData} loading={financialSaving} className="rounded-xl px-5 shadow-lg shadow-brand-200">Lưu thay đổi</Button>
              </div>
            </div>

            {/* Configuration: 2x2 Grid + Paid Row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                <label className="block text-[10px] font-black text-gray-400 mb-2 uppercase tracking-widest">Trình độ đầu vào</label>
                <input
                  type="text"
                  value={financialData.level_in}
                  onChange={e => setFinancialData(p => ({ ...p, level_in: e.target.value }))}
                  placeholder="VD: 5.5"
                  className="w-full rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                />
              </div>
              <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                <label className="block text-[10px] font-black text-gray-400 mb-2 uppercase tracking-widest">Trình độ đầu ra</label>
                <input
                  type="text"
                  value={financialData.level_out}
                  onChange={e => setFinancialData(p => ({ ...p, level_out: e.target.value }))}
                  placeholder="VD: 6.5"
                  className="w-full rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                />
              </div>
              <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                <label className="block text-[10px] font-black text-gray-400 mb-2 uppercase tracking-widest">Tổng học phí (VNĐ)</label>
                <input
                  type="text"
                  value={financialData.amount ? new Intl.NumberFormat("vi-VN").format(financialData.amount) : ""}
                  onChange={e => {
                    const val = e.target.value.replace(/\D/g, "");
                    const num = Number(val);
                    setFinancialData(p => ({ ...p, amount: num, remaining: num - p.paid_total }));
                  }}
                  placeholder="Nhập số tiền..."
                  className="w-full rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-right"
                />
              </div>
              <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 shadow-sm">
                <label className="block text-[10px] font-black text-emerald-600 mb-2 uppercase tracking-widest">Đã đóng tổng</label>
                <div className="w-full bg-white/50 rounded-xl px-4 py-3 text-sm font-black text-emerald-700 border border-white/20 text-right">
                  {new Intl.NumberFormat("vi-VN").format(financialData.paid_total)} <span className="text-[10px] opacity-60">VNĐ</span>
                </div>
              </div>
            </div>

            {/* Remaining Amount (Full Width) */}
            <div className="bg-amber-50 p-5 rounded-2xl border border-amber-100 shadow-sm flex items-center justify-between">
              <div>
                <label className="block text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">Số tiền còn lại</label>
                <p className="text-2xl font-black text-red-600 tracking-tighter">
                  {new Intl.NumberFormat("vi-VN").format(Math.max(0, financialData.remaining))} <span className="text-xs font-bold opacity-50">VNĐ</span>
                </p>
              </div>
              <div className="px-4 py-2 bg-white/40 rounded-xl border border-white/20">
                <p className="text-[10px] font-bold text-amber-700 uppercase">Tình trạng</p>
                <p className="text-xs font-black text-amber-800">{financialData.remaining > 0 ? "Chưa hoàn thành" : "Đã hoàn thành"}</p>
              </div>
            </div>

                    {/* Bottom Sections: Vertical Stack for Space */}
                    <div className="space-y-6">
                       {/* Lịch sử đóng tiền */}
                       <section>
                          <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <History className="w-4 h-4 text-brand-500" /> Lịch sử nộp phí
                          </h4>
                          <div className="space-y-2 max-h-[180px] overflow-y-auto pr-2 custom-scrollbar">
                            {paymentHistory.map((p) => (
                              <div key={p.id} className="flex items-center justify-between p-3.5 bg-white border border-gray-100 rounded-2xl shadow-sm hover:border-brand-100 transition-all group">
                                <div className="flex items-center gap-3">
                                  <div className="w-9 h-9 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 shadow-sm border border-emerald-100">
                                    <DollarSign className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <div className="font-bold text-gray-900 text-sm">{new Intl.NumberFormat("vi-VN").format(p.amount)} VNĐ</div>
                                    <div className="text-[10px] text-gray-400 font-medium">{new Date(p.paid_at).toLocaleDateString("vi-VN")} {p.note && `· ${p.note}`}</div>
                                  </div>
                                </div>
                                <button type="button" onClick={() => removePayment(p.id)} className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl opacity-0 group-hover:opacity-100 transition-all"><Trash2 className="w-4 h-4" /></button>
                              </div>
                            ))}
                            {paymentHistory.length === 0 && (
                              <div className="flex flex-col items-center justify-center py-8 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                                <p className="text-xs text-gray-400 italic">Chưa có lịch sử nộp phí</p>
                              </div>
                            )}
                          </div>
                       </section>

                       {/* Nộp thêm đợt mới */}
                       <section>
                          <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <Plus className="w-4 h-4 text-brand-500" /> Nộp thêm đợt mới
                          </h4>
                          <div className="p-6 bg-brand-600 rounded-3xl shadow-xl shadow-brand-100 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -mr-24 -mt-24 blur-3xl" />
                            <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/10 rounded-full -ml-16 -mb-16 blur-2xl" />
                            
                            <div className="space-y-4 relative z-10">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                  <label className="text-[10px] font-bold text-brand-100 uppercase ml-1">Số tiền đóng (VNĐ)</label>
                                  <input 
                                    type="text"
                                    inputMode="numeric"
                                    placeholder="0"
                                    value={newPayment.amount ? new Intl.NumberFormat("vi-VN").format(newPayment.amount) : ""}
                                    onChange={e => {
                                      const val = e.target.value.replace(/\D/g, "");
                                      setNewPayment(p => ({ ...p, amount: Number(val) }));
                                    }}
                                    className="w-full rounded-2xl border-none bg-white/20 text-white placeholder:text-white/40 px-4 py-3 text-sm focus:ring-2 focus:ring-white font-black text-right"
                                  />
                                </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-brand-100 uppercase ml-1">Ghi chú</label>
                          <input 
                            type="text"
                            placeholder="Đợt 2, Chuyển khoản..."
                            value={newPayment.note}
                            onChange={e => setNewPayment(p => ({ ...p, note: e.target.value }))}
                            className="w-full rounded-2xl border-none bg-white/20 text-white placeholder:text-white/40 px-4 py-3 text-sm focus:ring-2 focus:ring-white font-medium"
                          />
                        </div>
                      </div>
                      <Button 
                        type="button"
                        loading={addingPayment}
                        onClick={handleAddPayment}
                        disabled={newPayment.amount <= 0}
                        className="w-full bg-white text-brand-700 hover:bg-brand-50 font-black rounded-2xl py-4 shadow-2xl transition-transform active:scale-[0.98]"
                      >
                        Xác nhận nộp phí ngay
                      </Button>
                    </div>
                  </div>
               </section>
            </div>
          </div>
        )}
      </Modal>

    </PageWrapper>
  );
}
