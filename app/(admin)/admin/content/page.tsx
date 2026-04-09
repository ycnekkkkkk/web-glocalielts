"use client";
import PageWrapper from "@/components/layouts/PageWrapper";
import { Card } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { Download, FileText, Plus, Upload } from "lucide-react";

const FILES = [
  { name: "IELTS Writing Task 2 – Band 7 Templates", type: "PDF", size: "2.4 MB", category: "Writing", updated: "20/03/2026" },
  { name: "IELTS Reading – Cambridge 18 Practice", type: "PDF", size: "8.1 MB", category: "Reading", updated: "18/03/2026" },
  { name: "Speaking – Vocabulary by Topic", type: "PDF", size: "1.2 MB", category: "Speaking", updated: "15/03/2026" },
  { name: "Listening – Section 4 Strategies", type: "PDF", size: "0.8 MB", category: "Listening", updated: "12/03/2026" },
  { name: "Grammar – Advanced Structures", type: "PDF", size: "3.5 MB", category: "Grammar", updated: "10/03/2026" },
];

const categoryColors: Record<string, string> = {
  Writing: "bg-brand-100 text-brand-700",
  Reading: "bg-emerald-100 text-emerald-700",
  Speaking: "bg-sky-100 text-sky-700",
  Listening: "bg-purple-100 text-purple-700",
  Grammar: "bg-amber-100 text-amber-700",
};

export default function AdminContentPage() {
  return (
    <PageWrapper>
      <div className="page-header flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="page-title">Tài Liệu Học Tập</h1>
          <p className="page-subtitle">{FILES.length} tài liệu</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" icon={<Upload className="w-4 h-4" />}>Tải lên</Button>
          <Button icon={<Plus className="w-4 h-4" />}>Tạo mới</Button>
        </div>
      </div>

      <Card>
        <div className="divide-y divide-gray-50">
          {FILES.map(f => (
            <div key={f.name} className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5 text-red-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{f.name}</p>
                <p className="text-xs text-gray-500">{f.type} · {f.size} · Cập nhật {f.updated}</p>
              </div>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${categoryColors[f.category]}`}>{f.category}</span>
              <Button variant="ghost" size="sm" icon={<Download className="w-3.5 h-3.5" />}>Tải về</Button>
            </div>
          ))}
        </div>
      </Card>
    </PageWrapper>
  );
}
