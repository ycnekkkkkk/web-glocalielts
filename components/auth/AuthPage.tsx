"use client";
import Link from "next/link";

export default function AuthPage({ children, logo, title, subtitle, footer }: {
  children: React.ReactNode;
  logo?: React.ReactNode;
  title?: string;
  subtitle?: string;
  footer?: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex">
      {/* Left panel - dark brand side */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#0a1628] relative overflow-hidden flex-col justify-between p-10">
        {/* Subtle radial gradient */}
        <div className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse at 30% 40%, rgba(14,165,233,0.12) 0%, transparent 60%), radial-gradient(ellipse at 80% 80%, rgba(56,189,248,0.08) 0%, transparent 50%)",
          }}
        />

        {/* Top: logo */}
        <div className="relative z-10">
          <Link href="/" className="inline-flex items-center gap-2.5 group">
            <img src="/logo/logo-ag.svg" alt="AG" className="w-10 h-10 object-contain" />
            <img src="/logo/logo-gi.svg" alt="Glocal IELTS" className="w-10 h-10 object-contain" />
            <div>
              <p className="text-[15px] font-bold text-white leading-none tracking-tight">Glocal IELTS</p>
              <p className="text-[10px] font-medium text-white/40 leading-none mt-0.5 tracking-wider">Amazing Group</p>
            </div>
          </Link>
        </div>

        {/* Center: brand message */}
        <div className="relative z-10 space-y-4">
          <h2 className="text-4xl xl:text-5xl font-black text-white leading-[1.1] tracking-tight">
            Khám Phá<br />
            <span className="text-transparent bg-clip-text"
              style={{ backgroundImage: "linear-gradient(135deg, #6C63FF 0%, #A78BFA 50%, #6C63FF 100%)" }}
            >
              Tiềm Năng IELTS
            </span>
          </h2>
          <p className="text-base text-white/50 max-w-sm leading-relaxed">
            Chinh phục điểm IELTS mong muốn cùng đội ngũ giảng viên chuyên nghiệp. Tham gia cùng hàng nghìn học viên thành công.
          </p>
        </div>

        {/* Bottom: decorative geometric */}
        <div className="relative z-10 flex items-center gap-4">
          {/* Stats */}
          {[
            { num: "3.500+", label: "Học viên" },
            { num: "98%", label: "Đánh giá" },
            { num: "10+", label: "Khóa học" },
          ].map(s => (
            <div key={s.label} className="text-center">
              <p className="text-lg font-bold text-white">{s.num}</p>
              <p className="text-[10px] text-white/40 uppercase tracking-wider">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Decorative shapes */}
        <div className="absolute right-0 bottom-0 pointer-events-none">
          <svg width="320" height="280" viewBox="0 0 320 280" fill="none" className="opacity-20">
            <circle cx="280" cy="250" r="120" stroke="#A78BFA" strokeWidth="1" />
            <circle cx="280" cy="250" r="80" stroke="#A78BFA" strokeWidth="0.5" />
            <circle cx="280" cy="250" r="40" stroke="#A78BFA" strokeWidth="0.5" />
            <line x1="160" y1="250" x2="320" y2="250" stroke="#A78BFA" strokeWidth="0.5" />
            <line x1="280" y1="130" x2="280" y2="270" stroke="#A78BFA" strokeWidth="0.5" />
            <line x1="200" y1="170" x2="320" y2="250" stroke="#A78BFA" strokeWidth="0.5" />
            <line x1="200" y1="250" x2="320" y2="170" stroke="#A78BFA" strokeWidth="0.5" />
            {[[60,40],[120,80],[180,30],[240,60],[300,20],[80,140],[160,120],[220,100],[280,80]].map(([cx,cy],i) => (
              <circle key={i} cx={cx} cy={cy} r="2" fill="#A78BFA" />
            ))}
          </svg>
        </div>

        {/* Floating accent circles */}
        <div className="absolute top-20 right-10 w-2 h-2 rounded-full bg-purple-400/30" />
        <div className="absolute top-40 left-20 w-3 h-3 rounded-full bg-purple-400/20" />
        <div className="absolute bottom-40 right-20 w-1.5 h-1.5 rounded-full bg-purple-300/25" />
        <div className="absolute top-60 left-40 w-2 h-2 rounded-full bg-purple-300/15" />
      </div>

      {/* Right panel - white form side */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-10 bg-white">
        <div className="w-full max-w-[420px]">
          {/* Mobile logo */}
          <div className="lg:hidden mb-8 flex items-center gap-2.5">
            <img src="/logo/logo-ag.svg" alt="AG" className="w-9 h-9 object-contain" />
            <img src="/logo/logo-gi.svg" alt="Glocal IELTS" className="w-9 h-9 object-contain" />
            <p className="text-[14px] font-bold text-slate-800">Glocal IELTS</p>
          </div>

          {/* Header */}
          {title && (
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{title}</h1>
          )}
          {subtitle && (
            <p className="mt-2 text-sm text-slate-500 leading-relaxed">{subtitle}</p>
          )}

          {/* Content */}
          <div className="mt-8">
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <div className="mt-6">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
