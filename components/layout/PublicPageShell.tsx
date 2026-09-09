import PublicSiteFooter from "@/components/layout/PublicSiteFooter";
import PublicSiteHeader from "@/components/layout/PublicSiteHeader";
import type { ReactNode } from "react";

export default function PublicPageShell({
  hero,
  children,
}: {
  hero?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="relative min-h-screen flex flex-col bg-gradient-to-b from-slate-50/70 via-white to-slate-50/50">
      {/* Ambient subtle light */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute -top-32 -right-32 w-[700px] h-[700px] rounded-full blur-[140px] opacity-40"
          style={{
            background: "radial-gradient(circle, rgba(91,91,214,0.18) 0%, rgba(91,91,214,0.04) 40%, transparent 70%)",
          }}
        />
        <div
          className="absolute top-1/3 -left-48 w-[500px] h-[500px] rounded-full blur-[120px] opacity-30"
          style={{
            background: "radial-gradient(circle, rgba(91,91,214,0.12) 0%, transparent 65%)",
          }}
        />
      </div>

      <PublicSiteHeader />

      <main className="relative z-10 flex-1 flex flex-col">
        {hero}
        <div className="flex-1 flex flex-col">{children}</div>
      </main>

      <PublicSiteFooter />
    </div>
  );
}
