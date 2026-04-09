"use client";
import PageWrapper from "@/components/layouts/PageWrapper";
import { Card } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import { createBrowserClient } from "@/lib/supabase/client";
import { ASSIGNMENT_GRADE_STATUS, GRADE_OPTIONS, GRADE_TO_SCORE } from "@/lib/constants";
import { CheckCircle, PenLine } from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import type { AssignmentGrade } from "@/types";

export default function InstructorGradingPage() {
  const [grades, setGrades] = useState<AssignmentGrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");

  useEffect(() => {
    async function load() {
      const supabase = createBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();
      const name = profile?.full_name || "";
      const { data: classRows } = await supabase.from("classes_current").select("ten_lop").eq("giao_vien", name);
      const classNames = (classRows || []).map((r: { ten_lop: string }) => r.ten_lop);
      if (classNames.length === 0) { setLoading(false); return; }
      const { data } = await supabase.from("assignment_grades").select("*").in("class_name", classNames).order("created_at", { ascending: false });
      setGrades(data || []);
      setLoading(false);
    }
    load().catch(console.error);
  }, []);

  async function handleGrade(gradeId: number, gradeOption: string) {
    const score = GRADE_TO_SCORE[gradeOption as keyof typeof GRADE_TO_SCORE] || 0;
    const supabase = createBrowserClient();
    const { error } = await supabase.from("assignment_grades").update({
      grade: gradeOption, score, status: ASSIGNMENT_GRADE_STATUS.GRADED, graded_at: new Date().toISOString(),
    }).eq("id", gradeId);
    if (error) { toast.error("Lỗi cập nhật điểm"); return; }
    setGrades(prev => prev.map(g => g.id === gradeId ? { ...g, grade: gradeOption, score, status: "graded" } : g));
    toast.success(`Đã chấm điểm ${gradeOption}`);
  }

  const filtered = filter ? grades.filter(g => g.status === filter) : grades;

  return (
    <PageWrapper>
      <div className="page-header flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="page-title">Chấm Bài</h1>
          <p className="page-subtitle">{grades.filter(g => g.status === "pending").length} bài chờ chấm</p>
        </div>
        <div className="w-44">
          <Select value={filter} onChange={e => setFilter(e.target.value)}
            options={[
              { value: "pending", label: "Chờ chấm" },
              { value: "graded", label: "Đã chấm" },
              { value: "", label: "Tất cả" },
            ]}
          />
        </div>
      </div>

      {loading ? <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" /></div> : (
        <div className="space-y-3">
          {filtered.map(g => (
            <Card key={g.id} className="p-4">
              <div className="flex items-start gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-gray-900 text-sm">{g.student_name}</p>
                    <Badge variant="gray" className="text-[11px]">{g.class_name}</Badge>
                  </div>
                  <p className="text-sm text-gray-600">{g.assignment_name}</p>
                  {g.submitted_at && <p className="text-xs text-gray-400 mt-1">Nộp lúc: {g.submitted_at}</p>}
                </div>
                <div className="flex items-center gap-3">
                  {g.status === ASSIGNMENT_GRADE_STATUS.GRADED ? (
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-emerald-600">{g.grade}</span>
                      <span className="text-sm text-gray-500">({g.score} điểm)</span>
                      <Badge variant="success"><CheckCircle className="w-3 h-3 mr-1 inline" />Đã chấm</Badge>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Select value="" onChange={e => e.target.value && handleGrade(g.id, e.target.value)}
                        placeholder="Chọn điểm"
                        options={GRADE_OPTIONS.map(gr => ({ value: gr, label: `${gr} (${GRADE_TO_SCORE[gr]})` }))}
                        className="w-32"
                      />
                      <Badge variant="warning"><PenLine className="w-3 h-3 mr-1 inline" />Chờ chấm</Badge>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p>{filter === "pending" ? "Không có bài chờ chấm" : "Không có bài tập nào"}</p>
            </div>
          )}
        </div>
      )}
    </PageWrapper>
  );
}
