"use client";
import PageWrapper from "@/components/layouts/PageWrapper";
import { Card, StatsCard } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { createBrowserClient } from "@/lib/supabase/client";
import { Award, BookOpen, Calendar, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import type { StudentExam } from "@/types";

export default function StudentExamsPage() {
  const [exams, setExams] = useState<StudentExam[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();
      const name = profile?.full_name || "";
      const { data } = await supabase.from("student_exams").select("*").eq("student_name", name).order("exam_date", { ascending: false });
      setExams(data || []);
      setLoading(false);
    }
    load().catch(console.error);
  }, []);

  const completedExams = exams.filter(e => e.score !== null);
  const avgScore = completedExams.length > 0 ? Math.round(completedExams.reduce((s, e) => s + (e.score || 0), 0) / completedExams.length) : 0;
  const bestScore = completedExams.length > 0 ? Math.max(...completedExams.map(e => e.score || 0)) : 0;

  return (
    <PageWrapper>
      <div className="page-header">
        <h1 className="page-title">Bài Thi</h1>
        <p className="page-subtitle">{exams.length} bài thi</p>
      </div>

      {exams.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-6">
          <StatsCard title="Tổng bài thi" value={exams.length} icon={BookOpen} iconColor="text-sky-600" iconBg="bg-sky-50" trendLabel="bài" />
          <StatsCard title="Điểm trung bình" value={avgScore} icon={TrendingUp} iconColor="text-brand-600" iconBg="bg-brand-50" trendLabel="/ 100" />
          <StatsCard title="Điểm cao nhất" value={bestScore} icon={Award} iconColor="text-amber-600" iconBg="bg-amber-50" trendLabel="/ 100" />
        </div>
      )}

      {loading ? <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-sky-600 border-t-transparent rounded-full animate-spin" /></div> : (
        <Card>
          {exams.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p>Chưa có bài thi nào</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {exams.map(e => (
                <div key={e.id} className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors">
                  <div className="w-10 h-10 bg-sky-100 rounded-xl flex items-center justify-center shrink-0">
                    <BookOpen className="w-5 h-5 text-sky-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm">{e.exam_name}</p>
                    <p className="text-xs text-gray-500">{e.class_name}</p>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-500">
                    <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />{e.exam_date || "–"}</span>
                  </div>
                  {e.score !== null ? (
                    <div className="text-right">
                      <p className="text-lg font-bold text-brand-600">{e.score}<span className="text-xs text-gray-400">/{e.max_score}</span></p>
                      <Badge variant={e.score >= 80 ? "success" : e.score >= 60 ? "warning" : "danger"}>
                        {e.score >= 80 ? "Xuất sắc" : e.score >= 60 ? "Đạt" : "Chưa đạt"}
                      </Badge>
                    </div>
                  ) : <Badge variant="info">Chờ kết quả</Badge>}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </PageWrapper>
  );
}
