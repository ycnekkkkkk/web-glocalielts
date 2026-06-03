import PublicPageShell from "@/components/layout/PublicPageShell";
import SupportRegisterFormSection from "@/components/support/SupportRegisterFormSection";
import {
  Calendar,
  CheckCircle2,
  Headphones,
  Laptop,
  MapPin,
  Phone,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";

function ConsultHero() {
  return (
    <section
      className="relative overflow-hidden pt-[72px]"
      style={{
        height: 350,
        background: "linear-gradient(135deg, #6C63FF 0%, #8B5CF6 50%, #A78BFA 100%)",
      }}
    >
      {/* Background blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-24 -left-16 w-72 h-72 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute top-6 right-32 w-44 h-44 rounded-full bg-white/5 blur-2xl" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 h-full flex items-center">
        {/* Left: text content */}
        <div className="flex-1 max-w-lg">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight tracking-tight mb-3">
            Tư Vấn Đăng Ký Thi IELTS
          </h1>

          <p className="text-sm text-white/80 leading-relaxed mb-4">
            Đội ngũ Glocal IELTS sẽ đồng hành cùng bạn
            <br />
            trong toàn bộ quá trình đăng ký thi IELTS.
          </p>

          <p className="text-xs text-white/60 leading-relaxed mb-5">
            Hỗ trợ lựa chọn địa điểm thi phù hợp, tư vấn lịch thi,
            hướng dẫn thủ tục đăng ký và giải đáp các thắc mắc liên quan.
          </p>

          {/* Feature row */}
          <div className="flex flex-wrap gap-x-5 gap-y-2 mb-5">
            {[
              { icon: <MapPin className="w-3 h-3" />, label: "Chọn địa điểm thi phù hợp" },
              { icon: <Calendar className="w-3 h-3" />, label: "Tư vấn ngày thi linh hoạt" },
              { icon: <CheckCircle2 className="w-3 h-3" />, label: "Hướng dẫn thủ tục đăng ký" },
              { icon: <ShieldCheck className="w-3 h-3" />, label: "Hỗ trợ trước ngày thi" },
            ].map((f) => (
              <div key={f.label} className="flex items-center gap-1.5 text-white/80 text-xs">
                <span className="text-white/90">{f.icon}</span>
                <span>{f.label}</span>
              </div>
            ))}
          </div>

          {/* Trust stats */}
          <div className="flex flex-wrap items-center gap-5">
            {[
              { value: "3500+", label: "Học viên đã được hỗ trợ" },
              { value: "100%", label: "Tư vấn miễn phí" },
              { value: "IDP & British Council", label: "Đối tác chính thức" },
            ].map((s) => (
              <div key={s.label}>
                <div className="text-white font-extrabold text-base leading-none">{s.value}</div>
                <div className="text-white/50 text-[10px] mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: illustration */}
        <div className="hidden lg:flex items-center justify-center w-64 shrink-0">
          <div className="relative w-56 h-44">
            {/* ── LAPTOP (center) ── */}
            {/* Base */}
            <div
              className="absolute bottom-0 left-1/2 -translate-x-1/2"
              style={{
                width: 100,
                height: 6,
                borderRadius: "0 0 4px 4px",
                background: "rgba(255,255,255,0.25)",
              }}
            />
            {/* Screen outer */}
            <div
              className="absolute bottom-5 left-1/2 -translate-x-1/2"
              style={{
                width: 90,
                height: 58,
                borderRadius: "8px 8px 0 0",
                background: "rgba(255,255,255,0.15)",
                border: "1.5px solid rgba(255,255,255,0.35)",
              }}
            >
              {/* Screen inner */}
              <div
                className="absolute inset-1 rounded-md overflow-hidden"
                style={{ background: "rgba(10,10,30,0.45)", backdropFilter: "blur(8px)" }}
              >
                <div
                  className="text-center text-white/50 text-[5px] font-semibold tracking-widest pt-1"
                  style={{ fontFamily: "monospace" }}
                >
                  IELTS REGISTRATION
                </div>
                <div className="text-center text-white font-bold pt-px" style={{ fontSize: 10 }}>
                  Glocal IELTS
                </div>
                <div className="mx-2 border-t border-white/10 my-0.5" />
                {[
                  "Chọn địa điểm thi",
                  "Chọn ngày thi",
                  "Hoàn tất đăng ký",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-1 px-2 py-px">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                    <span className="text-white/70 text-[5px]">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── CALENDAR (left of laptop) ── */}
            <div
              className="absolute bottom-7 left-0 rounded-lg overflow-hidden"
              style={{
                width: 22,
                height: 26,
                background: "rgba(255,255,255,0.2)",
                border: "1px solid rgba(255,255,255,0.35)",
              }}
            >
              {/* Calendar header */}
              <div
                className="text-center text-white/90 text-[4px] font-bold py-0.5"
                style={{ background: "rgba(255,255,255,0.15)" }}
              >
                IELTS
              </div>
              {/* Calendar grid dots */}
              <div className="flex flex-wrap justify-center gap-px pt-1 px-1">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="w-1 h-1 rounded-full bg-white/30" />
                ))}
              </div>
              <div className="text-center text-white/70 text-[5px] mt-0.5 font-bold">15</div>
            </div>

            {/* ── HEADPHONES (right of laptop) ── */}
            <div className="absolute bottom-7 right-0" style={{ width: 22, height: 28 }}>
              <div
                className="absolute left-0 bottom-0 rounded-full"
                style={{
                  width: 14,
                  height: 14,
                  background: "rgba(255,255,255,0.25)",
                  border: "1px solid rgba(255,255,255,0.4)",
                }}
              />
              <div
                className="absolute right-0 bottom-0 rounded-full"
                style={{
                  width: 14,
                  height: 14,
                  background: "rgba(255,255,255,0.25)",
                  border: "1px solid rgba(255,255,255,0.4)",
                }}
              />
              <div
                className="absolute top-0 left-1/2 -translate-x-1/2 rounded-t-full"
                style={{
                  width: 16,
                  height: 16,
                  border: "2px solid rgba(255,255,255,0.4)",
                  borderBottom: "none",
                }}
              />
            </div>

            {/* ── PLANT (far right) ── */}
            <div className="absolute bottom-14 right-2" style={{ width: 10, height: 16 }}>
              <div
                className="absolute bottom-0 left-1/2 -translate-x-1/2"
                style={{ width: 2, height: 8, background: "rgba(255,255,255,0.4)", borderRadius: 1 }}
              />
              <div
                className="absolute top-0 left-0 rounded-full"
                style={{ width: 7, height: 7, background: "rgba(134,239,172,0.6)" }}
              />
              <div
                className="absolute top-1 right-0 rounded-full"
                style={{ width: 6, height: 6, background: "rgba(107,210,139,0.5)" }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function ConsultPage() {
  return (
    <PublicPageShell hero={null}>
      <ConsultHero />
      <SupportRegisterFormSection />
    </PublicPageShell>
  );
}
