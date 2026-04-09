import PublicSiteFooter from "@/components/layout/PublicSiteFooter";
import PublicSiteHeader from "@/components/layout/PublicSiteHeader";
import type { ReactNode } from "react";

export default function PublicPageShell({ hero, children }: { hero?: ReactNode; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 text-gray-900 flex flex-col">
      <PublicSiteHeader />
      {hero}
      <div className="flex-1 flex flex-col">{children}</div>
      <PublicSiteFooter />
    </div>
  );
}
