"use client";
import PageWrapper from "@/components/layouts/PageWrapper";
import { Card } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { createBrowserClient } from "@/lib/supabase/client";
import { Award, Calendar, Download, GraduationCap } from "lucide-react";
import { useEffect, useState } from "react";
import type { StudentAchievement } from "@/types";

export default function StudentCertificatesPage() {
  const [achievements, setAchievements] = useState<StudentAchievement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();
      const name = profile?.full_name || "";
      const { data } = await supabase.from("student_achievements").select("*").eq("student_name", name);
      setAchievements(data || []);
      setLoading(false);
    }
    load().catch(console.error);
  }, []);

  return (
    <PageWrapper>
      <div className="page-header">
        <h1 className="page-title">Chứng Chỉ & Thành Tích</h1>
        <p className="page-subtitle">{achievements.length} chứng chỉ đã đạt được</p>
      </div>

      {loading ? <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-sky-600 border-t-transparent rounded-full animate-spin" /></div> : (
        achievements.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Award className="w-10 h-10 text-amber-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Chưa có chứng chỉ nào</h3>
            <p className="text-gray-500 text-sm max-w-sm mx-auto">Hoàn thành khóa học để nhận chứng chỉ từ Glocal IELTS.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {achievements.map(a => (
              <Card key={a.id} hover className="overflow-hidden">
                <div className="h-24 bg-gradient-to-br from-brand-600 to-purple-600 flex items-center justify-center">
                  <Award className="w-12 h-12 text-white opacity-80" />
                </div>
                <div className="p-5">
                  <h3 className="font-bold text-gray-900 mb-1">{a.title}</h3>
                  <p className="text-xs text-gray-500 flex items-center gap-1.5 mb-1">
                    <GraduationCap className="w-3.5 h-3.5" />{a.class_name}
                  </p>
                  {a.issued_at && <p className="text-xs text-gray-400 flex items-center gap-1.5 mb-3">
                    <Calendar className="w-3.5 h-3.5" />Ngày cấp: {a.issued_at}
                  </p>}
                  {a.description && <p className="text-xs text-gray-600 mb-4">{a.description}</p>}
                  <Button variant="outline" size="sm" className="w-full" icon={<Download className="w-3.5 h-3.5" />}>
                    Tải chứng chỉ
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )
      )}
    </PageWrapper>
  );
}
