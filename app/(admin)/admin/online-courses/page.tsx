"use client";

import PageWrapper from "@/components/layouts/PageWrapper";
import { Card } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { createBrowserClient } from "@/lib/supabase/client";
import type { PublicCourse, PublicCourseLesson } from "@/types";
import { BookOpen, Pencil, Plus, Search, Trash2, UserCircle2, Video } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

type CourseForm = {
  title: string;
  slug: string;
  short_description: string;
  description: string;
  teacher_name: string;
  objective_text: string;
  duration_text: string;
  certificate_text: string;
  demo_video_url: string;
  price: string;
  status: "published" | "draft" | "archived";
  curriculum: PublicCourseLesson[];
};

function slugify(input: string) {
  return String(input || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

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

const EMPTY_FORM: CourseForm = {
  title: "",
  slug: "",
  short_description: "",
  description: "",
  teacher_name: "Đội ngũ Glocal IELTS",
  objective_text: "",
  duration_text: "",
  certificate_text: "",
  demo_video_url: "",
  price: "0",
  status: "published",
  curriculum: [],
};

export default function AdminOnlineCoursesPage() {
  const supabase = createBrowserClient();
  const [courses, setCourses] = useState<PublicCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<null | "create" | "edit" | "delete">(null);
  const [selected, setSelected] = useState<PublicCourse | null>(null);
  const [form, setForm] = useState<CourseForm>(EMPTY_FORM);
  const [students, setStudents] = useState<Array<{ student_id: string; user_id: string; student_code: string | null; full_name: string; email: string | null }>>([]);
  const [studentKeyword, setStudentKeyword] = useState("");
  const [accessUserIds, setAccessUserIds] = useState<string[]>([]);
  const [previewLearning, setPreviewLearning] = useState(false);
  const [previewTopicIndex, setPreviewTopicIndex] = useState(0);
  const safeCurriculum = form?.curriculum ?? [];

  async function loadCourses() {
    setLoading(true);
    const { data, error } = await supabase.from("public_courses").select("*").order("updated_at", { ascending: false });
    if (error) toast.error(error.message);
    setCourses((data as PublicCourse[]) || []);
    setLoading(false);
  }

  useEffect(() => {
    loadCourses().catch(console.error);
    supabase
      .from("students")
      .select("id,profile_id,student_code,full_name,email")
      .not("profile_id", "is", null)
      .order("full_name")
      .then((res: { data: Array<{ id: string; profile_id: string | null; student_code: string | null; full_name: string; email: string | null }> | null }) => {
        const rows = ((res.data || []) as Array<{ id: string; profile_id: string | null; student_code: string | null; full_name: string; email: string | null }>)
          .filter((x) => !!x.profile_id)
          .map((x) => ({
            student_id: x.id,
            user_id: String(x.profile_id),
            student_code: x.student_code,
            full_name: x.full_name,
            email: x.email,
          }));
        setStudents(rows);
      });
  }, []);

  const filtered = useMemo(() => {
    const key = search.trim().toLowerCase();
    if (!key) return courses;
    return courses.filter((c) => [c.title, c.slug, c.short_description || ""].join(" ").toLowerCase().includes(key));
  }, [courses, search]);
  const previewCourse = useMemo(
    () => ({
      title: form.title.trim() || "Tên khóa học",
      short_description: form.short_description.trim(),
      description: form.description.trim(),
      teacher_name: form.teacher_name.trim() || "Đội ngũ Glocal IELTS",
      objective_text: form.objective_text.trim(),
      duration_text: form.duration_text.trim(),
      certificate_text: form.certificate_text.trim(),
      demo_video_url: form.demo_video_url.trim(),
      price: Number(form.price || 0),
      currency: "VND",
      slug: form.slug.trim() || slugify(form.title),
      curriculum: safeCurriculum,
    }),
    [form, safeCurriculum]
  );
  const previewHasCurriculum = useMemo(
    () => previewCourse.curriculum.some((lesson) => (lesson.topics ?? []).length > 0),
    [previewCourse.curriculum]
  );
  const previewIntroEmbed = previewCourse.demo_video_url ? toYoutubeEmbedUrl(previewCourse.demo_video_url) : null;
  const previewTopics = useMemo(
    () =>
      previewCourse.curriculum.flatMap((lesson, lessonIdx) =>
        (lesson.topics || [])
          .filter((topic) => topic.video && String(topic.video).trim())
          .map((topic, topicIdx) => ({
            lessonName: lesson.name || `Lesson ${lessonIdx + 1}`,
            topicName: topic.title || `Chủ đề ${topicIdx + 1}`,
            video: String(topic.video),
          }))
      ),
    [previewCourse.curriculum]
  );
  const previewSelectedTopic = previewTopics[previewTopicIndex] || null;
  const previewSelectedEmbed = previewSelectedTopic ? toYoutubeEmbedUrl(previewSelectedTopic.video) : null;

  function openCreate() {
    setSelected(null);
    setForm({ ...EMPTY_FORM, curriculum: [] });
    setPreviewLearning(false);
    setPreviewTopicIndex(0);
    setModal("create");
  }

  function openEdit(course: PublicCourse) {
    setSelected(course);
    setForm({
      title: course.title,
      slug: course.slug,
      short_description: course.short_description || "",
      description: course.description || "",
      teacher_name: course.teacher_name || "Đội ngũ Glocal IELTS",
      objective_text: course.objective_text || course.level || "",
      duration_text: course.duration_text || "",
      certificate_text: course.certificate_text || "",
      demo_video_url: course.demo_video_url || "",
      price: String(course.price || 0),
      status: course.status,
      curriculum: (course.curriculum as PublicCourseLesson[] | null) || [],
    });
    setPreviewLearning(false);
    setPreviewTopicIndex(0);
    supabase
      .from("public_course_access")
      .select("user_id")
      .eq("course_id", course.id)
      .then((res: { data: Array<{ user_id: string }> | null }) => {
        setAccessUserIds((res.data || []).map((x) => x.user_id));
      });
    setModal("edit");
  }

  function addLesson() {
    setForm((p) => ({
      ...p,
      curriculum: [...(p?.curriculum ?? []), { name: "", topics: [], assignments: [] }],
    }));
  }

  function removeLesson(lessonIdx: number) {
    setForm((p) => ({
      ...p,
      curriculum: (p?.curriculum ?? []).filter((_, i) => i !== lessonIdx),
    }));
  }

  function updateLessonName(lessonIdx: number, name: string) {
    setForm((p) => ({
      ...p,
      curriculum: (p?.curriculum ?? []).map((lesson, i) => (i === lessonIdx ? { ...lesson, name } : lesson)),
    }));
  }

  function addTopic(lessonIdx: number) {
    setForm((p) => ({
      ...p,
      curriculum: (p?.curriculum ?? []).map((lesson, i) =>
        i === lessonIdx
          ? { ...lesson, topics: [...(lesson.topics || []), { title: "", video: "" }] }
          : lesson
      ),
    }));
  }

  function addAssignment(lessonIdx: number) {
    setForm((p) => ({
      ...p,
      curriculum: (p?.curriculum ?? []).map((lesson, i) =>
        i === lessonIdx
          ? { ...lesson, assignments: [...(lesson.assignments || []), ""] }
          : lesson
      ),
    }));
  }

  function updateAssignment(lessonIdx: number, assignmentIdx: number, value: string) {
    setForm((p) => ({
      ...p,
      curriculum: (p?.curriculum ?? []).map((lesson, i) =>
        i === lessonIdx
          ? {
              ...lesson,
              assignments: (lesson.assignments || []).map((item, j) =>
                j === assignmentIdx ? value : item
              ),
            }
          : lesson
      ),
    }));
  }

  function removeAssignment(lessonIdx: number, assignmentIdx: number) {
    setForm((p) => ({
      ...p,
      curriculum: (p?.curriculum ?? []).map((lesson, i) =>
        i === lessonIdx
          ? {
              ...lesson,
              assignments: (lesson.assignments || []).filter((_, j) => j !== assignmentIdx),
            }
          : lesson
      ),
    }));
  }

  function removeTopic(lessonIdx: number, topicIdx: number) {
    setForm((p) => ({
      ...p,
      curriculum: (p?.curriculum ?? []).map((lesson, i) =>
        i === lessonIdx
          ? { ...lesson, topics: (lesson.topics || []).filter((_, j) => j !== topicIdx) }
          : lesson
      ),
    }));
  }

  function updateTopic(lessonIdx: number, topicIdx: number, field: "title" | "video", value: string) {
    setForm((p) => ({
      ...p,
      curriculum: (p?.curriculum ?? []).map((lesson, i) =>
        i === lessonIdx
          ? {
              ...lesson,
              topics: (lesson.topics || []).map((topic, j) =>
                j === topicIdx ? { ...topic, [field]: value } : topic
              ),
            }
          : lesson
      ),
    }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const curriculum: PublicCourseLesson[] = (form.curriculum || [])
        .map((lesson) => ({
          name: String(lesson.name || "").trim(),
          assignments: Array.isArray(lesson.assignments)
            ? lesson.assignments.map((x) => String(x).trim()).filter(Boolean)
            : [],
          topics: (lesson.topics || [])
            .map((topic) => ({
              title: String(topic.title || "").trim(),
              video: topic.video ? String(topic.video).trim() : null,
            }))
            .filter((topic) => topic.title || topic.video),
        }))
        .filter((lesson) => lesson.name || lesson.topics.length > 0);

      const payload = {
        title: form.title.trim(),
        slug: (form.slug.trim() || slugify(form.title)).trim(),
        short_description: form.short_description.trim() || null,
        description: form.description.trim() || null,
        teacher_name: form.teacher_name.trim() || "Đội ngũ Glocal IELTS",
        objective_text: form.objective_text.trim() || null,
        level: form.objective_text.trim() || null,
        duration_text: form.duration_text.trim() || null,
        certificate_text: form.certificate_text.trim() || null,
        demo_video_url: form.demo_video_url.trim() || null,
        demo_video_source: form.demo_video_url.trim() ? "youtube" : null,
        price: Number(form.price || "0"),
        currency: "VND",
        status: form.status,
        curriculum,
        updated_at: new Date().toISOString(),
      };

      if (!payload.title || !payload.slug) throw new Error("Vui lòng nhập tiêu đề và slug");

      if (modal === "create") {
        const { data: inserted, error } = await supabase.from("public_courses").insert({
          ...payload,
          published_at: new Date().toISOString(),
        }).select("id").single();
        if (error) throw error;
        const newCourseId = inserted?.id as string | undefined;
        if (newCourseId && accessUserIds.length > 0) {
          const { data: authData } = await supabase.auth.getSession();
          const grantRows = accessUserIds.map((userId) => ({
            course_id: newCourseId,
            user_id: userId,
            granted_by: authData.session?.user?.id ?? null,
          }));
          const { error: grantError } = await supabase.from("public_course_access").upsert(grantRows, { onConflict: "course_id,user_id" });
          if (grantError) throw grantError;
        }
        toast.success("Đã thêm khóa học");
      } else if (selected) {
        const { error } = await supabase.from("public_courses").update(payload).eq("id", selected.id);
        if (error) throw error;
        const { data: authData } = await supabase.auth.getSession();
        const currentUser = authData.session?.user?.id ?? null;
        const grantedRows = accessUserIds.map((userId) => ({
          course_id: selected.id,
          user_id: userId,
          granted_by: currentUser,
        }));
        const { data: existingAccess, error: existingErr } = await supabase
          .from("public_course_access")
          .select("user_id")
          .eq("course_id", selected.id);
        if (existingErr) throw existingErr;
        const existingIds = new Set(((existingAccess || []) as Array<{ user_id: string }>).map((x) => x.user_id));
        const nextIds = new Set(accessUserIds);
        const removeIds = [...existingIds].filter((id) => !nextIds.has(id));

        if (grantedRows.length > 0) {
          const { error: upsertErr } = await supabase.from("public_course_access").upsert(grantedRows, { onConflict: "course_id,user_id" });
          if (upsertErr) throw upsertErr;
        }
        if (removeIds.length > 0) {
          const { error: deleteErr } = await supabase
            .from("public_course_access")
            .delete()
            .eq("course_id", selected.id)
            .in("user_id", removeIds);
          if (deleteErr) throw deleteErr;
        }
        toast.success("Đã cập nhật khóa học");
      }

      setModal(null);
      await loadCourses();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setSaving(false);
    }
  }

  const filteredStudents = useMemo(() => {
    const key = studentKeyword.trim().toLowerCase();
    if (!key) return students;
    return students.filter((s) =>
      s.full_name.toLowerCase().includes(key) ||
      (s.student_code || "").toLowerCase().includes(key) ||
      (s.email || "").toLowerCase().includes(key)
    );
  }, [students, studentKeyword]);

  async function handleDelete() {
    if (!selected) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("public_courses").delete().eq("id", selected.id);
      if (error) throw error;
      toast.success("Đã xóa khóa học");
      setModal(null);
      await loadCourses();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageWrapper>
      <div className="page-header flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="page-title">Khóa Học Online</h1>
          <p className="page-subtitle">{courses.length} khóa học</p>
        </div>
        <Button icon={<Plus className="w-4 h-4" />} onClick={openCreate}>
          Thêm khóa học
        </Button>
      </div>

      <Card>
        <div className="p-4 border-b border-gray-100 flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-48">
            <Input
              placeholder="Tìm tiêu đề, slug..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              icon={<Search className="w-4 h-4" />}
            />
          </div>
          <p className="text-sm text-gray-500">{filtered.length} kết quả</p>
        </div>

        {loading ? (
          <div className="p-4">
            <SkeletonTable />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <th className="text-left px-4 py-3">Khóa học</th>
                  <th className="text-left px-4 py-3">Trạng thái</th>
                  <th className="text-left px-4 py-3">Giá</th>
                  <th className="text-left px-4 py-3">Bài học</th>
                  <th className="text-left px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold text-gray-900">{c.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">/{c.slug}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-semibold px-2 py-1 rounded-full bg-gray-100 text-gray-700">{c.status}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {c.price > 0 ? `${Math.round(c.price).toLocaleString("vi-VN")} ${c.currency}` : "Miễn phí"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {Array.isArray(c.curriculum) ? c.curriculum.length : 0}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" icon={<Pencil className="w-3.5 h-3.5" />} onClick={() => openEdit(c)} />
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={<Trash2 className="w-3.5 h-3.5 text-red-500" />}
                          onClick={() => {
                            setSelected(c);
                            setModal("delete");
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        open={modal === "create" || modal === "edit"}
        onClose={() => setModal(null)}
        title={modal === "create" ? "Thêm khóa học online" : "Chỉnh sửa khóa học online"}
        size="xl"
        className="max-w-[min(96vw,1400px)]"
      >
        <form onSubmit={handleSave} className="grid grid-cols-1 xl:grid-cols-2 gap-5 items-start">
          <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5">
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-gray-900">Form chỉnh sửa</h3>
              <p className="text-xs text-gray-500">Cập nhật thông tin khóa học ở đây</p>
            </div>
            <div className="space-y-4 max-h-[70vh] overflow-auto pr-1">
            <Input
              label="Tên khóa học *"
              value={form.title}
              onChange={(e) => {
                const title = e.target.value;
                setForm((p) => ({ ...p, title, slug: p.slug || slugify(title) }));
              }}
              required
            />
            <Input label="Slug *" value={form.slug} onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))} required />
            <Input label="Mô tả ngắn" value={form.short_description} onChange={(e) => setForm((p) => ({ ...p, short_description: e.target.value }))} />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả chi tiết</label>
              <textarea
                rows={4}
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <Input
              label="Đội ngũ / Giảng viên hiển thị"
              value={form.teacher_name}
              onChange={(e) => setForm((p) => ({ ...p, teacher_name: e.target.value }))}
              placeholder="Đội ngũ Glocal IELTS"
            />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                label="Đối tượng"
                value={form.objective_text}
                onChange={(e) => setForm((p) => ({ ...p, objective_text: e.target.value }))}
                placeholder="Học sinh / Sinh viên / Người đi làm..."
              />
              <Input
                label="Thời lượng"
                value={form.duration_text}
                onChange={(e) => setForm((p) => ({ ...p, duration_text: e.target.value }))}
                placeholder="8 tuần / 20 buổi..."
              />
              <Input
                label="Chứng chỉ"
                value={form.certificate_text}
                onChange={(e) => setForm((p) => ({ ...p, certificate_text: e.target.value }))}
                placeholder="IELTS / Hoàn thành khóa"
              />
            </div>
            <Input
              label="Link video giới thiệu"
              value={form.demo_video_url}
              onChange={(e) => setForm((p) => ({ ...p, demo_video_url: e.target.value }))}
              icon={<Video className="w-4 h-4" />}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input label="Giá (VND)" type="number" value={form.price} onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))} />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
                <select
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  value={form.status}
                  onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as CourseForm["status"] }))}
                >
                  <option value="published">published</option>
                  <option value="draft">draft</option>
                  <option value="archived">archived</option>
                </select>
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 p-3">
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700">Cấp quyền học viên xem bài giảng</label>
                <p className="text-xs text-gray-500 mt-1">Học viên được chọn mới vào xem được lesson/video sau khi bấm Mua ngay.</p>
              </div>
              <Input
                placeholder="Tìm mã HV, tên hoặc email..."
                value={studentKeyword}
                onChange={(e) => setStudentKeyword(e.target.value)}
              />
              <div className="mt-2 max-h-40 overflow-auto rounded-lg border border-gray-100 bg-gray-50/60 p-2 space-y-1">
                {filteredStudents.length === 0 ? (
                  <p className="text-xs text-gray-400">Không có học viên phù hợp.</p>
                ) : (
                  filteredStudents.map((s) => {
                    const checked = accessUserIds.includes(s.user_id);
                    return (
                      <label key={s.student_id} className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            setAccessUserIds((prev) =>
                              e.target.checked ? [...new Set([...prev, s.user_id])] : prev.filter((x) => x !== s.user_id)
                            );
                          }}
                        />
                        <span className="truncate">
                          {s.student_code ? `[${s.student_code}] ` : ""}{s.full_name}
                          {s.email ? ` (${s.email})` : ""}
                        </span>
                      </label>
                    );
                  })
                )}
              </div>
              <p className="mt-2 text-xs text-gray-500">Đã cấp quyền: {accessUserIds.length} học viên</p>
            </div>
            <div className="rounded-xl border border-gray-200 p-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                <label className="block text-sm font-medium text-gray-700">Nội dung khóa học (Lesson/Chủ đề)</label>
                <Button type="button" variant="outline" size="sm" className="w-full sm:w-auto" onClick={addLesson}>
                  + Thêm lesson
                </Button>
              </div>
              <div className="space-y-3 max-h-80 overflow-auto pr-1">
                {safeCurriculum.length === 0 ? (
                  <p className="text-xs text-gray-500">Chưa có lesson nào. Bấm "Thêm lesson" để bắt đầu.</p>
                ) : (
                  safeCurriculum.map((lesson, lessonIdx) => (
                    <div key={`lesson-${lessonIdx}`} className="rounded-lg border border-gray-200 p-3 bg-gray-50/70">
                      <div className="flex flex-col sm:flex-row sm:items-end gap-2 mb-2">
                        <div className="flex-1">
                          <Input
                            label={`Lesson ${lessonIdx + 1}`}
                            placeholder={`Tên lesson ${lessonIdx + 1}`}
                            value={lesson.name || ""}
                            onChange={(e) => updateLessonName(lessonIdx, e.target.value)}
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="w-full sm:w-auto whitespace-nowrap"
                          onClick={() => removeLesson(lessonIdx)}
                        >
                          Xóa lesson
                        </Button>
                      </div>
                      <div className="space-y-2">
                        {(lesson.topics || []).map((topic, topicIdx) => (
                          <div key={`topic-${lessonIdx}-${topicIdx}`} className="rounded-lg border border-gray-200 bg-white p-2">
                            <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-end gap-2">
                              <Input
                                placeholder="Tên chủ đề"
                                value={topic.title || ""}
                                onChange={(e) => updateTopic(lessonIdx, topicIdx, "title", e.target.value)}
                              />
                              <Input
                                placeholder="Link video"
                                value={topic.video || ""}
                                onChange={(e) => updateTopic(lessonIdx, topicIdx, "video", e.target.value)}
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="w-full md:w-auto md:self-auto whitespace-nowrap"
                                onClick={() => removeTopic(lessonIdx, topicIdx)}
                              >
                                Xóa
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-2">
                        <Button type="button" variant="outline" size="sm" className="w-full sm:w-auto" onClick={() => addTopic(lessonIdx)}>
                          + Thêm chủ đề
                        </Button>
                      </div>

                    <div className="mt-3 rounded-lg border border-gray-200 bg-white p-2">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                        <p className="text-xs font-semibold text-gray-700">Bài tập của lesson</p>
                        <Button type="button" variant="outline" size="sm" className="w-full sm:w-auto" onClick={() => addAssignment(lessonIdx)}>
                          + Thêm bài tập
                        </Button>
                      </div>
                      <div className="space-y-2">
                        {(lesson.assignments || []).length === 0 ? (
                          <p className="text-xs text-gray-400">Chưa có bài tập.</p>
                        ) : (
                          (lesson.assignments || []).map((assignment, assignmentIdx) => (
                            <div
                              key={`assignment-${lessonIdx}-${assignmentIdx}`}
                              className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_auto] items-end gap-2"
                            >
                              <Input
                                placeholder={`Nội dung bài tập ${assignmentIdx + 1}`}
                                value={assignment || ""}
                                onChange={(e) => updateAssignment(lessonIdx, assignmentIdx, e.target.value)}
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="w-full md:w-auto whitespace-nowrap"
                                onClick={() => removeAssignment(lessonIdx, assignmentIdx)}
                              >
                                Xóa
                              </Button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="secondary" className="flex-1" onClick={() => setModal(null)}>
                Hủy
              </Button>
              <Button type="submit" loading={saving} className="flex-1">
                {modal === "create" ? "Thêm khóa học" : "Lưu thay đổi"}
              </Button>
            </div>
            </div>
          </div>

          <div className="rounded-2xl border border-brand-100/80 bg-slate-50 p-3 sm:p-4">
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-brand-700">Preview realtime</h3>
              <p className="text-xs text-gray-500">Mô phỏng đúng flow public (chi tiết khóa học → Mua ngay → trang học)</p>
            </div>
            <div className="max-h-[70vh] overflow-auto pr-1">
            <Card className="p-3 sm:p-4 border-brand-100/60">
              {!previewLearning ? (
                <div className="space-y-3">
                  <div className="w-9 h-9 rounded-lg bg-brand-100 flex items-center justify-center">
                    <BookOpen className="w-4 h-4 text-brand-600" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 tracking-tight">{previewCourse.title}</h3>
                  <p className="text-xs text-gray-500 inline-flex items-center gap-1">
                    <UserCircle2 className="w-3 h-3 text-brand-400" />
                    {previewCourse.teacher_name}
                  </p>

                  <div className="space-y-2">
                    <p className="text-xs text-gray-700 leading-relaxed">
                      {previewCourse.short_description || "Khóa học được thiết kế theo lộ trình thực tế và dễ theo dõi."}
                    </p>
                    {previewCourse.description ? (
                      <p className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed">{previewCourse.description}</p>
                    ) : null}
                  </div>

                  {previewCourse.demo_video_url ? (
                    <div className="rounded-xl border border-brand-100 bg-white p-2">
                      <p className="text-xs font-semibold text-gray-900 mb-2">Video giới thiệu khóa học</p>
                      {previewIntroEmbed ? (
                        <div className="relative w-full overflow-hidden rounded-lg border border-gray-200 bg-black aspect-video">
                          <iframe
                            src={previewIntroEmbed}
                            title={`Preview ${previewCourse.title}`}
                            className="absolute inset-0 h-full w-full"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        </div>
                      ) : (
                        <p className="text-[11px] text-gray-500 break-all">{previewCourse.demo_video_url}</p>
                      )}
                    </div>
                  ) : null}

                  <div className="p-3 rounded-xl bg-linear-to-br from-brand-50 to-indigo-50/80 border border-brand-100 flex items-center justify-between gap-2">
                    <div>
                      <p className="text-[10px] text-gray-600">Đối tượng: {previewCourse.objective_text || "—"}</p>
                      <p className="text-[10px] text-gray-600">Thời lượng: {previewCourse.duration_text || "—"}</p>
                      <p className="text-[10px] text-gray-600">Chứng chỉ: {previewCourse.certificate_text || "—"}</p>
                      <p className="text-[10px] font-semibold text-brand-600 uppercase tracking-wide">Học phí</p>
                      <p className="text-base font-bold text-brand-800">
                        {previewCourse.price > 0
                          ? `${Math.round(previewCourse.price).toLocaleString("vi-VN")} ${previewCourse.currency}`
                          : "Miễn phí"}
                      </p>
                    </div>
                    {previewHasCurriculum ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="primary"
                        onClick={() => {
                          setPreviewLearning(true);
                          setPreviewTopicIndex(0);
                        }}
                      >
                        Mua ngay (Vào trang học)
                      </Button>
                    ) : (
                      <Button type="button" size="sm" variant="primary">
                        Mua ngay (Xem giới thiệu)
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Button type="button" variant="ghost" size="sm" onClick={() => setPreviewLearning(false)}>
                      Quay lại chi tiết
                    </Button>
                    <p className="text-[11px] text-gray-500">Trang học (preview)</p>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
                    <div className="lg:col-span-5 rounded-xl border border-gray-200 p-2 bg-white">
                      <p className="text-xs font-semibold text-gray-900 mb-2">{previewCourse.title}</p>
                      <div className="space-y-1 max-h-72 overflow-auto pr-1">
                        {previewTopics.map((item, idx) => (
                          <button
                            key={`${item.lessonName}-${item.topicName}-${idx}`}
                            type="button"
                            onClick={() => setPreviewTopicIndex(idx)}
                            className={`w-full text-left rounded-md border p-2 text-[11px] ${
                              idx === previewTopicIndex
                                ? "border-brand-300 bg-brand-50 text-brand-800"
                                : "border-gray-200 bg-white text-gray-700"
                            }`}
                          >
                            <p className="font-semibold truncate">{item.lessonName}</p>
                            <p className="truncate">{item.topicName}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="lg:col-span-7 rounded-xl border border-gray-200 p-2 bg-white">
                      {previewSelectedTopic ? (
                        <>
                          <p className="text-[11px] text-gray-500 mb-1">{previewSelectedTopic.lessonName}</p>
                          <p className="text-xs font-semibold text-gray-900 mb-2">{previewSelectedTopic.topicName}</p>
                          {previewSelectedEmbed ? (
                            <div className="relative w-full overflow-hidden rounded-lg border border-gray-200 bg-black aspect-video">
                              <iframe
                                src={previewSelectedEmbed}
                                title={`${previewSelectedTopic.lessonName} - ${previewSelectedTopic.topicName}`}
                                className="absolute inset-0 h-full w-full"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                              />
                            </div>
                          ) : (
                            <video src={previewSelectedTopic.video} controls className="w-full rounded-lg border border-gray-200 bg-black" />
                          )}
                        </>
                      ) : (
                        <p className="text-xs text-gray-500">Khóa học chưa có video bài giảng khả dụng.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </Card>
            </div>
          </div>
        </form>
      </Modal>

      <Modal open={modal === "delete"} onClose={() => setModal(null)} title="Xóa khóa học">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Bạn có chắc muốn xóa khóa học <strong>{selected?.title}</strong>?
          </p>
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setModal(null)}>
              Hủy
            </Button>
            <Button variant="danger" className="flex-1" loading={saving} onClick={handleDelete}>
              Xóa
            </Button>
          </div>
        </div>
      </Modal>
    </PageWrapper>
  );
}
