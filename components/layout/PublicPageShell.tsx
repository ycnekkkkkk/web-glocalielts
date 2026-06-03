import PublicSiteFooter from "@/components/layout/PublicSiteFooter";
import TopBar from "@/components/landing/TopBar";
import type { ReactNode } from "react";

export default function PublicPageShell({
  hero,
  children,
}: {
  hero?: ReactNode;
  children: ReactNode;
}) {
  return (
    <>
      {/* Shared seamless gradient wrapper — giống trang chủ */}
      <div
        className="relative"
        style={{
          background:
            "linear-gradient(165deg, #F8F7FC 0%, #F3F0FF 25%, #E9DEFF 50%, #F3F0FF 75%, #F8F7FC 100%)",
          minHeight: "100vh",
        }}
      >
        {/* Ambient glow blobs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div
            className="absolute -top-32 -right-32 w-[800px] h-[800px] rounded-full blur-[140px]"
            style={{
              background:
                "radial-gradient(circle, rgba(108,99,255,0.14) 0%, rgba(108,99,255,0.06) 35%, transparent 60%)",
            }}
          />
          <div
            className="absolute -top-16 -left-48 w-[600px] h-[600px] rounded-full blur-[120px]"
            style={{
              background:
                "radial-gradient(circle, rgba(233,222,255,0.7) 0%, rgba(243,240,255,0.3) 40%, transparent 65%)",
            }}
          />
          <div
            className="absolute top-[55%] left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full blur-[140px]"
            style={{
              background:
                "radial-gradient(circle, rgba(108,99,255,0.08) 0%, transparent 65%)",
            }}
          />
          <div
            className="absolute top-[70%] -left-24 w-[400px] h-[400px] rounded-full blur-[100px]"
            style={{
              background:
                "radial-gradient(circle, rgba(108,99,255,0.07) 0%, transparent 65%)",
            }}
          />
        </div>

        <TopBar />

        <main className="relative z-10">
          {hero}
          <div className="flex-1 flex flex-col">{children}</div>
        </main>

        <PublicSiteFooter />
      </div>
    </>
  );
}
