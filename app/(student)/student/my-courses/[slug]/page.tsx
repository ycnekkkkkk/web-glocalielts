"use client";
import PageWrapper from "@/components/layouts/PageWrapper";
import { usePageTitle } from "@/components/layouts/PageTitleContext";
import { Card } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { SkeletonPage } from "@/components/ui/Skeleton";
import { createBrowserClient } from "@/lib/supabase/client";
import { SESSION_STATUS } from "@/lib/constants";
import { getSessionState } from "@/lib/sessionStatus";
import BackButton from "@/components/ui/BackButton";
import { BookOpen, Calendar, CheckCircle, Clock, GraduationCap, MessageSquare, Star, Video, ExternalLink } from "lucide-react";
import { use, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import type { AttendanceMakeup, ClassCurrent, Session, SessionAttendance, SessionStudentEvaluation, SessionTeacherEvaluation } from "@/types";

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

function parseDateTimeFromMakeup(makeup: AttendanceMakeup | undefined | null): string {
  if (!makeup) return "Chưa cập nhật dữ liệu";
  const parsed = parseSessionRef(makeup.target_session_ref);
  if (parsed?.session_date) return parsed.session_date;
  const noteMatch = makeup.note?.match(/Bù slot:\s*([0-9]{1,2}\/[0-9]{1,2}\/[0-9]{4})(?:\s+([0-9]{2}:[0-9]{2}))?/i);
  if (!noteMatch) return "Chưa cập nhật dữ liệu";
  return `${noteMatch[1]}${noteMatch[2] ? ` ${noteMatch[2]}` : ""}`;
}

function StarRating({ value, onChange, readonly }: { value: number; onChange?: (v: number) => void; readonly?: boolean }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} type="button"
          disabled={readonly}
          onClick={() => onChange?.(n)}
          className={`transition-colors ${readonly ? "cursor-default" : "hover:text-amber-300"} ${n <= value ? "text-amber-400" : "text-gray-300"}`}>
          <Star className="w-4 h-4 fill-current" />
        </button>
      ))}
    </div>
  );
}

export default function StudentCourseDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const className = decodeURIComponent(slug);
  const { setTitle } = usePageTitle();
  const setTitleRef = useRef(setTitle);
  setTitleRef.current = setTitle;

  const [cls, setCls] = useState<ClassCurrent | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [myName, setMyName] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  // Extra info from normalized classes table
  const [teacherName, setTeacherName] = useState<string | null>(null);
  const [levelOut, setLevelOut] = useState<string | null>(null);

  // Evaluations: teacher → student (per session_ref)
  const [myEvals, setMyEvals] = useState<Record<string, SessionStudentEvaluation>>({});
  // Evaluations: student → teacher (per session_ref)
  const [teacherEvals, setTeacherEvals] = useState<Record<string, SessionTeacherEvaluation>>({});
  const [attendanceBySessionRef, setAttendanceBySessionRef] = useState<Record<string, SessionAttendance>>({});
  const [makeupBySessionRef, setMakeupBySessionRef] = useState<Record<string, AttendanceMakeup>>({});
  const [targetSessionStatusByRef, setTargetSessionStatusByRef] = useState<Record<string, Session["status"]>>({});

  // View eval modal (teacher's comment on me)
  const [viewEval, setViewEval] = useState<SessionStudentEvaluation | null>(null);

  // Rate teacher modal
  const [rateSession, setRateSession] = useState<Session | null>(null);
  const [rateValue, setRateValue] = useState(5);
  const [rateComment, setRateComment] = useState("");
  const [savingRate, setSavingRate] = useState(false);
  useEffect(() => {
    return () => { setTitleRef.current(""); };
  }, []);

  useEffect(() => {
    let isActive = true;

    async function load() {
      const supabase = createBrowserClient();
      try {
        setLoadError(null);
        const { data: { session: authSession } } = await supabase.auth.getSession();
        if (!isActive) return;
        if (!authSession?.user) { setLoading(false); return; }

        const [{ data: profile }, { data: studentRec }] = await Promise.all([
          supabase.from("profiles").select("full_name").eq("id", authSession.user.id).single(),
          supabase.from("students").select("id").eq("profile_id", authSession.user.id).maybeSingle(),
        ]);

        const name = profile?.full_name || "";
        setMyName(name);
        if (!studentRec?.id) {
          setLoadError("Không tìm thấy hồ sơ học viên.");
          return;
        }

        let { data: normClass } = await supabase
          .from("classes")
          .select("id, name, status, schedule, total_sessions, sessions_done, level_out, teacher_id")
          .eq("name", className)
          .maybeSingle();
        if (!normClass) {
          setCls(null);
          setSessions([]);
          setLoadError("Không tìm thấy khóa học.");
          return;
        }

        // ensure student only opens classes they are enrolled in
        const { data: enrollment } = await supabase
          .from("enrollments")
          .select("id")
          .eq("student_id", studentRec.id)
          .eq("class_id", normClass.id)
          .eq("status", "active")
          .maybeSingle();
        if (!enrollment) {
          setCls(null);
          setSessions([]);
          setLoadError("Bạn chưa được đăng ký khóa học này.");
          return;
        }

        const [teacherRes, sessRes] = await Promise.all([
          normClass.teacher_id
            ? supabase.from("profiles").select("full_name").eq("id", normClass.teacher_id).maybeSingle()
            : Promise.resolve({ data: null }),
          supabase.from("sessions").select("*").eq("class_id", normClass.id).order("session_no"),
        ]);

        const tName = teacherRes.data?.full_name || "";
        setTeacherName(tName);
        setLevelOut(normClass.level_out || null);

        const sessList = (sessRes.data as Session[]) || [];
        setCls({
          id: 0,
          ten_lop: normClass.name,
          giao_vien: tName,
          lich_hoc: normClass.schedule || "",
          da_hoc: normClass.sessions_done,
          buoi_hoc: normClass.total_sessions,
          dau_ra: normClass.level_out || "",
          hoc_vien: name,
        } as unknown as typeof cls extends null ? never : NonNullable<typeof cls>);

        setTitle(normClass.name);
        setSessions(sessList);
        setLoading(false); // render main content first

        const sessionRefs = sessList.map((s) => `${s.class_name}#${s.session_no}#${s.session_date}`);
        if (sessionRefs.length > 0) {
          const [{ data: attendanceData }, { data: makeupData }] = await Promise.all([
            supabase
              .from("session_attendance")
              .select("*")
              .eq("student_id", studentRec.id)
              .in("session_ref", sessionRefs),
            supabase
              .from("attendance_makeup")
              .select("*")
              .eq("student_name", name)
              .in("session_ref", sessionRefs),
          ]);

          const attMap: Record<string, SessionAttendance> = {};
          ((attendanceData || []) as SessionAttendance[]).forEach((row) => {
            attMap[row.session_ref] = row;
          });
          setAttendanceBySessionRef(attMap);

          const makeupMap: Record<string, AttendanceMakeup> = {};
          ((makeupData || []) as AttendanceMakeup[]).forEach((row) => {
            makeupMap[row.session_ref] = row;
          });
          setMakeupBySessionRef(makeupMap);

          const targetRefs = Array.from(new Set(((makeupData || []) as AttendanceMakeup[]).map((r) => r.target_session_ref).filter(Boolean) as string[]));
          if (targetRefs.length > 0) {
            const parsedTargets = targetRefs.map(parseSessionRef).filter(Boolean) as { class_name: string; session_no: number | null; session_date: string }[];
            const targetClassNames = Array.from(new Set(parsedTargets.map((p) => p.class_name)));
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
          setAttendanceBySessionRef({});
          setMakeupBySessionRef({});
          setTargetSessionStatusByRef({});
        }

        if (name && sessList.length > 0) {
          Promise.all([
            supabase.from("session_student_evaluation").select("*").eq("class_name", normClass.name).eq("student_name", name),
            supabase.from("session_teacher_evaluation").select("*").eq("class_name", normClass.name).eq("student_name", name),
          ])
            .then(([evalData, teData]) => {
              if (!isActive) return;
              const evalMap: Record<string, SessionStudentEvaluation> = {};
              (evalData.data || []).forEach((e: SessionStudentEvaluation) => { evalMap[e.session_ref] = e; });
              setMyEvals(evalMap);

              const teMap: Record<string, SessionTeacherEvaluation> = {};
              (teData.data || []).forEach((e: SessionTeacherEvaluation) => { teMap[e.session_ref] = e; });
              setTeacherEvals(teMap);
            })
            .catch(console.error);
        }
      } catch (error) {
        console.error(error);
        setLoadError("Không thể tải dữ liệu khóa học. Vui lòng thử lại.");
      } finally {
        if (!isActive) return;
        setLoading(false);
      }
    }
    load().catch((error) => {
      console.error(error);
      if (!isActive) return;
      setLoadError("Kết nối chậm. Vui lòng tải lại trang.");
      setLoading(false);
    });
    return () => {
      isActive = false;
    };
  }, [className]);

  function openRateTeacher(session: Session) {
    const sessionRef = `${session.class_name}#${session.session_no}#${session.session_date}`;
    const myAttendance = attendanceBySessionRef[sessionRef];
    const myMakeup = makeupBySessionRef[sessionRef];
    const makeupCompleted = !!myMakeup?.is_completed || (myMakeup?.target_session_ref
      ? targetSessionStatusByRef[myMakeup.target_session_ref] === SESSION_STATUS.DONE
      : false);
    if (myAttendance?.attendance_status === "absent" && !makeupCompleted) {
      toast.error("Bạn vắng buổi này nên không thể đánh giá.");
      return;
    }
    const existing = teacherEvals[sessionRef];
    setRateSession(session);
    setRateValue(existing?.rating ?? 5);
    setRateComment(existing?.comment ?? "");
  }

  async function handleSaveRate() {
    if (!rateSession) return;
    const sessionRefCheck = `${rateSession.class_name}#${rateSession.session_no}#${rateSession.session_date}`;
    const myAttendance = attendanceBySessionRef[sessionRefCheck];
    const myMakeup = makeupBySessionRef[sessionRefCheck];
    const makeupCompleted = !!myMakeup?.is_completed || (myMakeup?.target_session_ref
      ? targetSessionStatusByRef[myMakeup.target_session_ref] === SESSION_STATUS.DONE
      : false);
    if (myAttendance?.attendance_status === "absent" && !makeupCompleted) {
      toast.error("Bạn vắng buổi này nên không thể đánh giá.");
      return;
    }
    setSavingRate(true);
    try {
      const supabase = createBrowserClient();
      const sessionRef = `${rateSession.class_name}#${rateSession.session_no}#${rateSession.session_date}`;
      const { error } = await supabase.from("session_teacher_evaluation").upsert({
        session_ref: sessionRef,
        class_name: rateSession.class_name,
        session_no: rateSession.session_no,
        session_date: rateSession.session_date,
        student_name: myName,
        rating: rateValue,
        comment: rateComment || null,
      }, { onConflict: "session_ref,student_name" });
      if (error) throw new Error(error.message);

      setTeacherEvals(prev => ({
        ...prev,
        [sessionRef]: {
          id: prev[sessionRef]?.id ?? 0,
          session_ref: sessionRef,
          class_name: rateSession.class_name,
          session_no: rateSession.session_no,
          session_date: rateSession.session_date,
          student_name: myName,
          rating: rateValue,
          comment: rateComment || null,
          created_at: new Date().toISOString(),
        },
      }));
      toast.success("Đã gửi đánh giá giảng viên!");
      setRateSession(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setSavingRate(false);
    }
  }

  const attendanceSummary = useMemo(() => {
    let onTime = 0;
    let absent = 0;
    let makeupCompleted = 0;
    const absentSessions: { sessionNo: number | null; date: string | null; note: string }[] = [];

    sessions.forEach((s) => {
      const sessionRef = `${s.class_name}#${s.session_no}#${s.session_date}`;
      const att = attendanceBySessionRef[sessionRef];
      if (!att) return;
      if (att.attendance_status === "on_time") {
        onTime += 1;
        return;
      }
      const makeup = makeupBySessionRef[sessionRef];
      const targetStatus = makeup?.target_session_ref ? targetSessionStatusByRef[makeup.target_session_ref] : undefined;
      const isMakeupCompleted = !!makeup?.is_completed || targetStatus === SESSION_STATUS.DONE;
      if (isMakeupCompleted) {
        makeupCompleted += 1;
      } else {
        absent += 1;
        const absentLabel = `Buổi vắng #${s.session_no ?? "?"}`;
        absentSessions.push({
          sessionNo: s.session_no,
          date: s.session_date,
          note: isMakeupCompleted
            ? `${absentLabel}: Đã học bù và đã điểm danh vào Ngày bù: ${parseDateTimeFromMakeup(makeup)}`
            : makeup?.note || att.note || `${absentLabel}: Buổi này hoàn thành và bạn vắng`,
        });
      }
    });

    return { onTime, absent, makeupCompleted, absentSessions };
  }, [sessions, attendanceBySessionRef, makeupBySessionRef, targetSessionStatusByRef]);

  const learnedCount = attendanceSummary.onTime + attendanceSummary.makeupCompleted;

  if (loading) return <PageWrapper><SkeletonPage /></PageWrapper>;
  if (loadError) return <PageWrapper><p className="text-amber-600 p-6">{loadError}</p></PageWrapper>;
  if (!cls) return <PageWrapper><p className="text-gray-500 p-6">Không tìm thấy khóa học</p></PageWrapper>;

  const done = sessions.filter(s => s.status === SESSION_STATUS.DONE).length;
  const progress = Math.min(100, ((cls.da_hoc || done || 0) / Math.max(cls.buoi_hoc || sessions.length || 1, 1)) * 100);
  const displayTeacher = teacherName || cls.giao_vien || "–";
  const displayLevelOut = levelOut || cls.dau_ra || null;

  return (
    <PageWrapper>
      <div className="mb-4">
        <BackButton href="/student/my-courses" label="Khóa học của tôi" />
      </div>

      <div className="page-header">
        <h1 className="page-title">{cls.ten_lop || "Khóa học"}</h1>
        <p className="page-subtitle flex items-center gap-2">
          <GraduationCap className="w-4 h-4" />
          Giảng viên: <span className="font-semibold text-gray-800">{displayTeacher}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-6">
        <Card className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-sky-100 rounded-xl flex items-center justify-center"><BookOpen className="w-5 h-5 text-sky-600" /></div>
          <div>
            <p className="text-2xl font-bold">{learnedCount}/{sessions.length}</p>
            <p className="text-xs text-gray-500">Buổi đã học</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center"><Clock className="w-5 h-5 text-amber-600" /></div>
          <div>
            <p className="text-2xl font-bold">{sessions.filter(s => getSessionState(s).isUpcoming).length}</p>
            <p className="text-xs text-gray-500">Buổi còn lại</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-100 rounded-xl flex items-center justify-center"><GraduationCap className="w-5 h-5 text-brand-600" /></div>
          <div>
            {displayLevelOut ? (
              <>
                <p className="text-xl font-bold text-brand-600">{displayLevelOut}</p>
                <p className="text-xs text-gray-500">Mục tiêu đầu ra</p>
              </>
            ) : (
              <>
                <p className="text-xl font-bold text-gray-300">–</p>
                <p className="text-xs text-gray-400">Chưa có mục tiêu</p>
              </>
            )}
          </div>
        </Card>
      </div>

      <Card className="p-5 mb-5">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">Tổng kết điểm danh</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-2">Đúng giờ: <b>{attendanceSummary.onTime}</b></div>
          <div className="rounded-xl bg-sky-50 border border-sky-100 px-3 py-2">Vắng đã bù xong: <b>{attendanceSummary.makeupCompleted}</b></div>
          <div className="rounded-xl bg-rose-50 border border-rose-100 px-3 py-2">Vắng chưa bù: <b>{attendanceSummary.absent}</b></div>
        </div>
        <div className="mt-3 text-xs text-gray-600">
          Tổng buổi: <b>{sessions.length}</b> · Đã học quy đổi: <b>{learnedCount}</b>
        </div>
        {attendanceSummary.absentSessions.length > 0 && (
          <div className="mt-3 rounded-xl border border-rose-100 bg-rose-50 p-3">
            <p className="text-xs font-semibold text-rose-700 mb-2">Các buổi vắng chưa hoàn tất học bù:</p>
            <div className="space-y-1">
              {attendanceSummary.absentSessions.map((x, idx) => (
                <p key={`${x.sessionNo}-${idx}`} className="text-xs text-rose-700">
                  Buổi #{x.sessionNo} ({x.date || "–"}): {x.note}
                </p>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Progress */}
      <Card className="p-5 mb-5">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-800">Tiến độ khóa học</h3>
          <span className="text-sm font-bold text-sky-600">{Math.round(progress)}%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-3">
          <div className="bg-sky-500 h-3 rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
        <p className="text-xs text-gray-500 mt-2">
          {done}/{sessions.length} buổi · Lịch: {cls.lich_hoc || "–"}
        </p>
      </Card>

      {/* Sessions */}
      <Card className="p-5">
        <h3 className="section-title">Danh Sách Buổi Học</h3>
        <div className="space-y-2">
          {sessions.map(s => {
            const sessionRef = `${s.class_name}#${s.session_no}#${s.session_date}`;
            const myEval = myEvals[sessionRef];
            const myTeacherEval = teacherEvals[sessionRef];
            const isDone = s.status === SESSION_STATUS.DONE;
            const myAttendance = attendanceBySessionRef[sessionRef];
            const isAbsent = myAttendance?.attendance_status === "absent";
            const myMakeup = makeupBySessionRef[sessionRef];
            const makeupCompleted = !!myMakeup?.is_completed || (myMakeup?.target_session_ref
              ? targetSessionStatusByRef[myMakeup.target_session_ref] === SESSION_STATUS.DONE
              : false);
            const canEvaluate = isDone && (!isAbsent || makeupCompleted);

            return (
              <div key={s.id} className="p-3 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${isDone ? "bg-emerald-100 text-emerald-700" : s.status === SESSION_STATUS.CANCELLED ? "bg-red-100 text-red-600" : "bg-sky-100 text-sky-700"}`}>
                    #{s.session_no}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 flex items-center flex-wrap gap-2">
                      <span>{s.topic || "Buổi học"}</span>
                      {s.makeup_original_date && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          Học bù từ {s.makeup_original_date}
                        </span>
                      )}
                    </p>
                    {s.makeup_note && (
                      <p className="text-xs text-amber-600 font-medium mt-0.5">Ghi chú học bù: {s.makeup_note}</p>
                    )}
                    {s.status === SESSION_STATUS.CANCELLED && s.cancelled_note && (
                      <p className="text-xs text-rose-600 font-medium mt-0.5">Lý do hủy: {s.cancelled_note}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{s.session_date}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{s.session_time}</span>
                      {s.zoom_link && (
                        <a href={s.zoom_link} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium"
                          title={s.zoom_link}>
                          <Video className="w-3 h-3" />
                          <span>{s.zoom_link.includes("zoom") ? "Zoom" : s.zoom_link.includes("meet") ? "Meet" : "Vào học"}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                  {(() => {
                    const sessionState = getSessionState(s);
                    if (isDone) return <Badge variant="success"><CheckCircle className="w-3 h-3 mr-1 inline" />Hoàn thành</Badge>;
                    if (s.status === SESSION_STATUS.CANCELLED) return <Badge variant="danger">Đã hủy</Badge>;
                    if (sessionState.isPast) return <Badge variant="gray">Đã học</Badge>;
                    return <Badge variant="info">Sắp tới</Badge>;
                  })()}
                </div>

                {/* Actions for completed sessions */}
                {isDone && (
                  <div className="flex items-center gap-2 mt-2 pl-11">
                    {/* View teacher's evaluation of me */}
                    {myEval ? (
                      <button
                        onClick={() => setViewEval(myEval)}
                        className="flex items-center gap-1.5 text-xs text-emerald-600 hover:underline">
                        <MessageSquare className="w-3.5 h-3.5" />
                        Xem đánh giá của GV
                        {myEval.rating && (
                          <span className="flex items-center gap-0.5 text-amber-500 font-semibold">
                            <Star className="w-3 h-3 fill-current" />{myEval.rating}
                          </span>
                        )}
                      </button>
                    ) : (
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <MessageSquare className="w-3.5 h-3.5" />GV chưa đánh giá
                      </span>
                    )}

                    <span className="text-gray-200">|</span>

                    {/* Rate teacher */}
                    {canEvaluate && myTeacherEval ? (
                      <button
                        onClick={() => openRateTeacher(s)}
                        className="flex items-center gap-1.5 text-xs text-sky-600 hover:underline">
                        <Star className="w-3.5 h-3.5 fill-current text-amber-400" />
                        Đánh giá của tôi: {myTeacherEval.rating}/5
                      </button>
                    ) : canEvaluate ? (
                      <button
                        onClick={() => openRateTeacher(s)}
                        className="flex items-center gap-1.5 text-xs text-sky-600 hover:underline">
                        <Star className="w-3.5 h-3.5" />
                        {isAbsent ? "Đánh giá giảng viên buổi bù" : "Đánh giá giảng viên"}
                      </button>
                    ) : (
                      <span className="text-xs text-rose-600">
                        Buổi này bạn vắng, không đánh giá buổi học.
                      </span>
                    )}
                  </div>
                )}

                {isAbsent && (
                  <div className="mt-2 ml-11 text-xs">
                    <p className="text-rose-600">Buổi vắng #{s.session_no ?? "?"}.</p>
                    {myMakeup ? (
                      <p className="text-gray-600 mt-1">
                        {makeupCompleted
                          ? `Buổi vắng #${s.session_no ?? "?"}: Đã học bù và đã điểm danh vào Ngày bù: ${parseDateTimeFromMakeup(myMakeup)}`
                          : `Học bù: ${myMakeup.note || "Đã xếp lịch bù"} (chưa hoàn thành)`}
                      </p>
                    ) : (
                      <p className="text-gray-500 mt-1">Chưa được xếp học bù.</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {sessions.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-6">Chưa có buổi học nào</p>
          )}
        </div>
      </Card>

      {/* View teacher's evaluation of me */}
      <Modal open={!!viewEval} onClose={() => setViewEval(null)}
        title="Đánh Giá Của Giảng Viên">
        {viewEval && (
          <div className="space-y-4">
            <div className="text-xs text-gray-500">
              Buổi #{viewEval.session_no} · {viewEval.session_date}
            </div>
            <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-xl">
              <span className="text-sm font-medium text-gray-700">Rating:</span>
              <StarRating value={viewEval.rating ?? 0} readonly />
              <span className="text-lg font-bold text-amber-600">{viewEval.rating}/5</span>
            </div>
            {viewEval.comment && (
              <div className="p-4 bg-gray-50 rounded-xl">
                <p className="text-xs text-gray-500 mb-1">Nhận xét:</p>
                <p className="text-sm text-gray-800">{viewEval.comment}</p>
              </div>
            )}
            {viewEval.evaluated_by && (
              <p className="text-xs text-gray-400">Giảng viên: {viewEval.evaluated_by}</p>
            )}
            <Button className="w-full" onClick={() => setViewEval(null)}>Đóng</Button>
          </div>
        )}
      </Modal>

      {/* Rate teacher modal */}
      {rateSession && (() => {
        const sRef = `${rateSession.class_name}#${rateSession.session_no}#${rateSession.session_date}`;
        const alreadyRated = !!teacherEvals[sRef];
        return (
          <Modal open={!!rateSession} onClose={() => setRateSession(null)}
            title={alreadyRated
              ? `Xem lại đánh giá – Buổi #${rateSession.session_no}`
              : `Đánh giá giảng viên – Buổi #${rateSession.session_no}`}>
            <div className="space-y-4">
              <p className="text-xs text-gray-500">{rateSession.class_name} · {rateSession.session_date}</p>

              {alreadyRated && (
                <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-xl">
                  Bạn đã đánh giá buổi này. Có thể chỉnh sửa nếu cần.
                </p>
              )}

              <div className="flex items-center gap-3 p-4 bg-sky-50 rounded-xl">
                <span className="text-sm font-medium text-gray-700">Xếp hạng:</span>
                <StarRating value={rateValue} onChange={setRateValue} />
                <span className="text-sm font-bold text-sky-600">{rateValue}/5</span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nhận xét (tuỳ chọn)</label>
                <textarea
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                  rows={3}
                  placeholder="Buổi học rất hay, giảng viên giải thích rõ ràng..."
                  value={rateComment}
                  onChange={e => setRateComment(e.target.value)}
                />
              </div>
              <div className="flex gap-3">
                <Button variant="secondary" className="flex-1" onClick={() => setRateSession(null)}>Đóng</Button>
                <Button className="flex-1" loading={savingRate} onClick={handleSaveRate}>
                  {alreadyRated ? "Lưu chỉnh sửa" : "Gửi đánh giá"}
                </Button>
              </div>
            </div>
          </Modal>
        );
      })()}
    </PageWrapper>
  );
}
