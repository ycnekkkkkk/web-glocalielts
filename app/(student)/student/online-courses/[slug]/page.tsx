"use client";

import PageWrapper from "@/components/layouts/PageWrapper";
import { Card } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import CourseChat from "@/components/course/CourseChat";
import { createBrowserClient } from "@/lib/supabase/client";
import type { PublicCourse } from "@/types";
import BackButton from "@/components/ui/BackButton";
import Image from "next/image";
import Link from "next/link";
import { use, useCallback, useEffect, useMemo, useState } from "react";
import { Phone } from "lucide-react";
import toast from "react-hot-toast";

function toYoutubeEmbedUrl(url: string) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtu.be")) {
      const id = parsed.pathname.replace("/", "");
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (parsed.hostname.includes("youtube.com")) {
      const id = parsed.searchParams.get("v");
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    return null;
  } catch {
    return null;
  }
}

function getThumbnail(course: PublicCourse): string {
  if (course.thumbnail_url) return course.thumbnail_url;
  const title = (course.title ?? "").toLowerCase();
  const slug = (course.slug ?? "").toLowerCase();
  if (title.includes("pronunciation") || slug.includes("pronunciation")) return "/thumbnails/pronunciation.png";
  if (title.includes("speaking") || slug.includes("speaking")) return "/thumbnails/ielts_speaking.png";
  if (title.includes("mentorship") || slug.includes("mentorship")) return "/thumbnails/ielts_mentorship.png";
  if (title.includes("rocket") || slug.includes("rocket")) return "/thumbnails/ielts_rocket.png";
  if (title.includes("a+ teacher") || title.includes("a plus teacher") || slug.includes("a-plus")) return "/thumbnails/A+_teacher.png";
  if (title.includes("series training") || slug.includes("series-training") || slug.includes("intern")) return "/thumbnails/series_training_intern.png";
  if (title.includes("yearly reflection") || slug.includes("yearly")) return "/thumbnails/yearly_reflection.png";
  if (title.includes("bí kíp") || title.includes("bi kip") || title.includes("học sinh lười")) return "/thumbnails/bi_kip_hoc_gioi_danh_cho_hs_luoi.png";
  if (title.includes("tư duy") || title.includes("tu duy") || title.includes("làm ít")) return "/thumbnails/tu_duy_lam_it_duoc_nhieu.png";
  return "";
}

type RequestStatus = "none" | "pending" | "approved" | "rejected";
type RequestRow = { id: string; status: RequestStatus; admin_note: string | null };

export default function StudentOnlineCourseDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [course, setCourse] = useState<PublicCourse | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [request, setRequest] = useState<RequestRow | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [note, setNote] = useState("");

  const load = useCallback(async () => {
    const supabase = createBrowserClient();
    const [{ data: authData }, { data: courseData }] = await Promise.all([
      supabase.auth.getSession(),
      supabase
        .from("public_courses")
        .select("*")
        .eq("slug", slug)
        .eq("status", "published")
        .maybeSingle(),
    ]);

    const uid = authData.session?.user?.id ?? null;
    const found = (courseData as PublicCourse | null) ?? null;
    setUserId(uid);
    setCourse(found);

    if (found && uid) {
      const [{ data: accessRow }, reqRes] = await Promise.all([
        supabase
          .from("public_course_access")
          .select("id")
          .eq("course_id", found.id)
          .eq("user_id", uid)
          .maybeSingle(),
        fetch(`/api/student/course-requests/${found.id}`),
      ]);
      setHasAccess(!!accessRow);
      const reqJson = await reqRes.json() as { data: RequestRow | null };
      setRequest(reqJson.data);
    }
    setLoading(false);
  }, [slug]);

  useEffect(() => { load().catch(console.error); }, [load]);

  const introEmbed = useMemo(() => (course?.demo_video_url ? toYoutubeEmbedUrl(course.demo_video_url) : null), [course]);
  const thumbnail = course ? getThumbnail(course) : "";

  async function handleRequestPurchase() {
    if (!course) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/student/course-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ course_id: course.id, note: note.trim() || undefined }),
      });
      const json = await res.json() as { data?: RequestRow; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Lỗi không xác định");
      setRequest(json.data ?? null);
      toast.success("Đã gửi yêu cầu! Admin sẽ xem xét và phản hồi sớm.");
      setNote("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Có lỗi xảy ra");
    } finally {
      setSubmitting(false);
    }
  }

  const requestStatus: RequestStatus = request?.status ?? "none";

  // ────────────────────────────────────────────────────────
  // Render helpers
  // ────────────────────────────────────────────────────────
  function renderCTA() {
    // Guest
    if (!userId) {
      return (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 space-y-3">
          <div className="flex items-start gap-3">
            <Phone className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-800 leading-normal">Liên hệ Glocal IELTS để được tư vấn</p>
              <p className="text-xs text-amber-700 mt-1 leading-normal">
                Đăng nhập để xem thông tin đầy đủ và đăng ký khóa học này.
              </p>
            </div>
          </div>
          <Link href={`/login?next=/student/online-courses/${slug}`} className="block w-full">
            <Button variant="primary" icon={<LogIn className="w-4 h-4" />} className="w-full justify-center">
              Đăng nhập
            </Button>
          </Link>
        </div>
      );
    }

    // Has access
    if (hasAccess) {
      return (
        <div className="mb-6 rounded-2xl border border-green-200 bg-green-50 p-5 flex flex-col gap-4">
          <div className="flex items-start gap-2.5 text-green-700">
            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
            <p className="text-sm font-semibold leading-normal">Bạn đã được cấp quyền truy cập khóa học này</p>
          </div>
          <Link href={`/student/online-courses/${slug}/learn`} className="w-full">
            <Button variant="primary" className="w-full justify-center">Vào học ngay →</Button>
          </Link>
        </div>
      );
    }

    // Request approved (but no access row yet — edge case)
    if (requestStatus === "approved") {
      return (
        <div className="mb-6 rounded-2xl border border-green-200 bg-green-50 p-4 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
          <p className="text-sm text-green-800 font-semibold leading-normal">Yêu cầu đã được duyệt. Quyền truy cập sẽ sớm được cấp.</p>
        </div>
      );
    }

    // Request rejected
    if (requestStatus === "rejected") {
      return (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 space-y-3">
          <div className="flex items-start gap-2.5 text-red-700">
            <XCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <p className="text-sm font-semibold leading-normal">Yêu cầu của bạn đã bị từ chối</p>
          </div>
          {request?.admin_note && (
            <p className="text-xs text-red-600 ml-7 leading-normal bg-white/50 p-2 rounded-lg border border-red-100">
              Lý do: {request.admin_note}
            </p>
          )}
          <p className="text-xs text-gray-500 ml-7 leading-normal">Bạn có thể nhắn tin với admin để biết thêm thông tin.</p>
        </div>
      );
    }

    // Request pending
    if (requestStatus === "pending") {
      return (
        <div className="mb-6 rounded-2xl border border-blue-200 bg-blue-50 p-4 flex items-start gap-3">
          <Clock className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-blue-800 leading-normal">Đã gửi yêu cầu, đang chờ admin duyệt</p>
            <p className="text-xs text-blue-600 mt-1 leading-normal">Nhắn tin với admin nếu bạn muốn hỏi thêm thông tin.</p>
          </div>
        </div>
      );
    }

    // No request yet — show buy button
    return (
      <div className="mb-6 space-y-3">
        <div className="rounded-2xl border border-brand-100 bg-gradient-to-br from-brand-50 to-sky-50 p-5">
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold text-brand-600 uppercase tracking-wide">Học phí</p>
              <p className="text-2xl sm:text-3xl font-black text-brand-800 mt-1 whitespace-nowrap">
                {course!.price > 0
                  ? `${Math.round(course!.price).toLocaleString("vi-VN")} ${course!.currency}`
                  : "Miễn phí"}
              </p>
            </div>

            <div className="space-y-2">
              <Button
                variant="primary"
                icon={<ShoppingCart className="w-4 h-4" />}
                loading={submitting}
                onClick={handleRequestPurchase}
                className="w-full justify-center py-2.5"
              >
                Mua ngay
              </Button>
              <p className="text-[10px] sm:text-xs text-gray-500 text-center leading-normal">
                Glocal IELTS sẽ liên hệ xác nhận thanh toán
              </p>
            </div>
          </div>

          {/* Optional note */}
          <div className="mt-4 pt-4 border-t border-brand-100">
            <label className="text-xs font-medium text-gray-600 mb-1.5 block">
              Ghi chú cho Glocal IELTS (không bắt buộc)
            </label>
            <textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ví dụ: Tôi muốn hỏi về lịch học, hình thức thanh toán..."
              className="w-full text-sm rounded-xl border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            />
          </div>
        </div>

        <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-4 flex items-start gap-3">
          <MessageCircleMore className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-700 leading-normal">
            Bạn cũng có thể <strong>nhắn tin trực tiếp</strong> với admin qua nút chat bên phải để được tư vấn chi tiết hơn.
          </p>
        </div>
      </div>
    );
  }

  return (
    <PageWrapper>
      <div className="mb-4">
        <BackButton href="/student/online-courses" label="Khám phá khóa học online" />
      </div>

      {loading ? (
        <div className="h-[500px] rounded-3xl border border-gray-100 bg-white animate-pulse" />
      ) : !course ? (
        <Card className="p-8 border-dashed text-center">
          <p className="text-gray-500 font-medium">Khóa học không tồn tại hoặc chưa được xuất bản.</p>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Banner Hero Card */}
          {thumbnail && (
            <Card className="overflow-hidden p-0 border-brand-100/40 shadow-sm rounded-3xl">
              <div className="relative w-full aspect-video sm:aspect-[21/7] bg-gradient-to-br from-brand-100 to-sky-100 overflow-hidden">
                <Image
                  src={thumbnail}
                  alt={course.title}
                  fill
                  className="object-cover"
                  priority
                  sizes="(max-width: 1200px) 100vw, 1200px"
                />
              </div>
            </Card>
          )}

          {/* Grid Layout below Banner */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">

            {/* Left Content Card */}
            <Card className="xl:col-span-8 p-6 sm:p-8 space-y-6 rounded-3xl border-brand-100/40 shadow-sm bg-white">

              {/* Header info */}
              <div className="space-y-3 pb-5 border-b border-gray-100">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold text-brand-700 bg-brand-50 border border-brand-100 w-fit">
                  <BookOpen className="w-3.5 h-3.5" /> Khóa học Online
                </span>

                <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 leading-tight tracking-tight">
                  {course.title}
                </h1>

                <div className="flex flex-wrap gap-2 pt-1">
                  <div className="flex items-center gap-2 text-xs text-gray-600 font-medium bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100 w-fit">
                    <UserCircle2 className="w-4 h-4 text-brand-500" />
                    <span>Mentor: <strong className="text-gray-800">{course.teacher_name || "Đội ngũ Glocal IELTS"}</strong></span>
                  </div>
                </div>
              </div>

              {/* Description Section */}
              <div className="space-y-3">
                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">📖 Giới thiệu khóa học</h2>

                {/* Short description (only render if it exists and is different from full description) */}
                {course.short_description && course.short_description.trim() !== course.description?.trim() && (
                  <p className="text-sm text-gray-700 leading-relaxed font-semibold">
                    {course.short_description}
                  </p>
                )}

                {course.description ? (
                  <div className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed bg-gray-50/50 rounded-2xl p-5 border border-gray-100 mt-2">
                    {course.description}
                  </div>
                ) : course.short_description ? (
                  <div className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed bg-gray-50/50 rounded-2xl p-5 border border-gray-100 mt-2">
                    {course.short_description}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">Khóa học được thiết kế theo lộ trình thực tế và dễ theo dõi.</p>
                )}
              </div>

              {/* Intro Video section */}
              {course.demo_video_url && (
                <div className="rounded-2xl border border-brand-100/50 bg-white p-5 shadow-sm space-y-3">
                  <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <span className="w-1.5 h-4 bg-brand-600 rounded-full"></span>
                    Video giới thiệu khóa học
                  </h2>
                  <div className="mt-3">
                    {introEmbed ? (
                      <div className="relative w-full overflow-hidden rounded-xl border border-gray-200 bg-black aspect-video">
                        <iframe
                          src={introEmbed}
                          title={`Giới thiệu ${course.title}`}
                          className="absolute inset-0 h-full w-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    ) : (
                      <a href={course.demo_video_url} target="_blank" rel="noreferrer" className="text-sm text-brand-700 underline break-all font-medium">
                        {course.demo_video_url}
                      </a>
                    )}
                  </div>
                </div>
              )}

            </Card>

            {/* Right Column: CTA / Sticky purchase box */}
            <div className="xl:col-span-4 xl:sticky xl:top-6">
              {renderCTA()}
            </div>

          </div>
        </div>
      )}

      {/* Floating chat — only for logged-in users */}
      {userId && course && (
        <CourseChat
          courseId={course.id}
          viewerRole="user"
          courseName={course.title}
        />
      )}
    </PageWrapper>
  );
}
