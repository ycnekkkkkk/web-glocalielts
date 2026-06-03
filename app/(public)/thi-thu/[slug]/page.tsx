"use client";

import { ExamWizard } from "@/components/exam/ExamWizard";
import PublicPageShell from "@/components/layout/PublicPageShell";
import { usePathname } from "next/navigation";
import { use } from "react";

export default function ThiThuSlugPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const pathname = usePathname();
  const isStudent = pathname.startsWith("/student/");

  const wizard = <ExamWizard slug={slug} />;

  // Student portal has its own layout wrapper
  if (isStudent) return wizard;

  // Public page wraps in public shell but ExamWizard manages its own full-screen layout
  return <PublicPageShell>{wizard}</PublicPageShell>;
}
