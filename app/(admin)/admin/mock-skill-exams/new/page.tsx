"use client";

import PageWrapper from "@/components/layouts/PageWrapper";
import Button from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import BackButton from "@/components/ui/BackButton";
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export default function AdminNewMockExamPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [saving, setSaving] = useState(false);

  function handleTitleChange(val: string) {
    setTitle(val);
    if (!slugEdited) {
      setSlug(slugify(val));
    }
  }

  function handleSlugChange(val: string) {
    setSlug(val.toLowerCase().replace(/[^a-z0-9-]/g, ""));
    setSlugEdited(true);
  }

  async function handleCreate() {
    if (!title.trim()) { toast.error("Vui lòng nhập tên đề"); return; }
    if (!slug.trim()) { toast.error("Vui lòng nhập slug"); return; }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/mock-skill-exams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), slug: slug.trim(), description: description.trim() || undefined }),
      });
      const json = (await res.json().catch(() => ({}))) as { id?: string; slug?: string; error?: string };
      if (!res.ok) {
        toast.error(json.error || "Tạo đề thất bại");
        return;
      }
      toast.success("Đã tạo đề! Chuyển sang trang chỉnh sửa nội dung...");
      router.push(`/admin/mock-skill-exams/${json.id}/de-thi`);
    } catch {
      toast.error("Lỗi mạng");
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageWrapper>
      <div className="mb-6">
        <BackButton href="/admin/mock-skill-exams" label="Danh sách đề" variant="inline" className="mb-3" />
        <h1 className="page-title">Tạo đề thi thử mới</h1>
        <p className="page-subtitle">Điền thông tin cơ bản. Sau khi tạo bạn sẽ được chuyển sang trang nhập nội dung đề.</p>
      </div>

      <Card className="p-6 max-w-xl space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tên đề <span className="text-red-500">*</span>
          </label>
          <input
            id="new-exam-title"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            placeholder="VD: IELTS Mock Test 1 – Academic"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Slug (URL) <span className="text-red-500">*</span>
          </label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">/thi-thu/</span>
            <input
              id="new-exam-slug"
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-brand-500"
              placeholder="mock-test-1"
              value={slug}
              onChange={(e) => handleSlugChange(e.target.value)}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">Chỉ chữ thường, số và dấu gạch ngang. URL đầy đủ: /thi-thu/{slug || "..."}</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Mô tả (tùy chọn)
          </label>
          <textarea
            id="new-exam-description"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm min-h-[72px] focus:ring-2 focus:ring-brand-500"
            placeholder="VD: Đề thi thử IELTS Academic với 40 câu Listening, 40 câu Reading..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="primary" loading={saving} onClick={handleCreate} id="btn-create-exam">
            Tạo đề & Chỉnh sửa nội dung →
          </Button>
          <Link href="/admin/mock-skill-exams">
            <Button variant="outline">Huỷ</Button>
          </Link>
        </div>
      </Card>
    </PageWrapper>
  );
}
