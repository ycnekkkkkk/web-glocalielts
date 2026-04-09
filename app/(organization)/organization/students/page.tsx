"use client";
import PageWrapper from "@/components/layouts/PageWrapper";
import { Card } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Input from "@/components/ui/Input";
import Avatar from "@/components/ui/Avatar";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { useStudents } from "@/hooks/useStudents";
import { Search } from "lucide-react";
import { useState } from "react";

export default function OrgStudentsPage() {
  const [search, setSearch] = useState("");
  const { students, loading } = useStudents();

  const filtered = students.filter(s =>
    s.full_name.toLowerCase().includes(search.toLowerCase()) ||
    (s.email || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <PageWrapper>
      <div className="page-header flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="page-title">Học Viên Tổ Chức</h1>
          <p className="page-subtitle">{students.length} học viên</p>
        </div>
      </div>

      <Card>
        <div className="p-4 border-b border-gray-100">
          <Input placeholder="Tìm học viên..." value={search} onChange={e => setSearch(e.target.value)} icon={<Search className="w-4 h-4" />} />
        </div>
        {loading ? (
          <div className="p-4"><SkeletonTable /></div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filtered.map(s => (
              <div key={s.id} className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors">
                <Avatar name={s.full_name} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm">{s.full_name}</p>
                  <p className="text-xs text-gray-500">{s.email || s.phone || "–"}</p>
                </div>
                {s.parent_info && (
                  <p className="hidden sm:block text-xs text-gray-500 max-w-48 truncate">{s.parent_info}</p>
                )}
                <Badge variant="success">Đang học</Badge>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="text-center py-12 text-gray-400 text-sm">
                {loading ? "" : "Không tìm thấy học viên"}
              </div>
            )}
          </div>
        )}
      </Card>
    </PageWrapper>
  );
}
