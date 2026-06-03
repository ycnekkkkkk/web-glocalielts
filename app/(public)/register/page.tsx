"use client";

import { createBrowserClient } from "@/lib/supabase/client";
import { getOAuthRedirectToUrl } from "@/lib/auth/oauth-redirect";
import Link from "next/link";
import { useState } from "react";
import toast from "react-hot-toast";

export default function RegisterPage() {
  const [oauthLoading, setOauthLoading] = useState(false);

  async function handleGoogle() {
    setOauthLoading(true);
    try {
      const supabase = createBrowserClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: getOAuthRedirectToUrl() },
      });
      if (error) throw error;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Đăng ký Google thất bại");
      setOauthLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* ── LEFT PANEL ── */}
      <div
        className="hidden lg:flex flex-col relative overflow-hidden"
        style={{ width: "55%", background: "linear-gradient(160deg, #1E1B4B 0%, #312E81 40%, #4C1D95 100%)" }}
      >
        {/* Background glow blobs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-purple-500/20 blur-3xl" />
          <div className="absolute bottom-0 -left-24 w-72 h-72 rounded-full bg-indigo-500/15 blur-3xl" />
          <div className="absolute top-1/2 left-1/3 w-48 h-48 rounded-full bg-violet-500/10 blur-2xl" />
        </div>

        {/* Back button */}
        <div className="relative z-10 p-8">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-full border border-white/25 text-white/80 text-xs font-medium px-4 py-1.5 hover:bg-white/10 hover:text-white hover:border-white/40 transition-all backdrop-blur-sm"
          >
            <svg className="w-3 h-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 12L6 8l4-4" />
            </svg>
            Quay lại trang chủ
          </Link>
        </div>

        {/* Logo */}
        <div className="relative z-10 px-8 pb-4">
          <div className="flex items-center gap-2.5">
            <img src="/logo/logo-ag.svg" alt="AG" className="w-9 h-9 object-contain" />
            <img src="/logo/logo-gi.svg" alt="Glocal IELTS" className="w-9 h-9 object-contain" />
            <div>
              <div className="text-white font-bold text-[15px] leading-none">Glocal IELTS</div>
              <div className="text-white/40 text-[10px] font-medium tracking-wider mt-0.5">Amazing Group</div>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="relative z-10 flex-1 px-8 pt-6 flex flex-col">
          {/* Headline */}
          <h1 className="text-4xl xl:text-5xl font-black text-white leading-[1.1] tracking-tight">
            Bắt đầu hành trình
            <br />
            <span style={{ background: "linear-gradient(135deg, #C084FC 0%, #A78BFA 50%, #818CF8 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              chinh phục IELTS
            </span>
          </h1>

          {/* Description */}
          <p className="mt-4 text-sm text-white/60 leading-relaxed max-w-sm">
            Tạo tài khoản miễn phí để truy cập hệ sinh thái
            học IELTS toàn diện và thông minh.
          </p>

          {/* Benefits list */}
          <div className="mt-5 space-y-2">
            {[
              "Khóa học IELTS chất lượng cao",
              "Luyện đề thi thử sát với đề thật",
              "Theo dõi tiến độ học tập",
              "Đánh giá kỹ năng bằng AI",
            ].map((item) => (
              <div key={item} className="flex items-center gap-2.5 text-sm text-white/70">
                <div className="w-4.5 h-4.5 rounded-full bg-emerald-400/20 border border-emerald-400/30 flex items-center justify-center shrink-0">
                  <svg className="w-2.5 h-2.5 text-emerald-400" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 8l3.5 3.5L13 4.5" />
                  </svg>
                </div>
                {item}
              </div>
            ))}
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-3 mt-6">
            {[
              { value: "3.500+", label: "Học viên\nđã tin tưởng" },
              { value: "98%", label: "Hài lòng với\nchất lượng" },
              { value: "10+", label: "Khóa học\nchuyên sâu" },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-xl border border-white/10 bg-white/8 backdrop-blur-sm px-4 py-3 text-center"
              >
                <div className="text-white font-extrabold text-lg leading-none">{s.value}</div>
                <div className="text-white/40 text-[10px] leading-tight mt-1 whitespace-pre-line">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Illustration: Laptop + Books + Headphones */}
          <div className="relative mt-auto pb-0">
            {/* ── LAPTOP (center) ── */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2">
              {/* Laptop base */}
              <div
                style={{
                  width: 120,
                  height: 7,
                  borderRadius: "0 0 6px 6px",
                  background: "rgba(255,255,255,0.15)",
                }}
              />
              {/* Laptop screen outer */}
              <div
                style={{
                  width: 108,
                  height: 70,
                  borderRadius: "10px 10px 0 0",
                  background: "rgba(255,255,255,0.12)",
                  border: "1.5px solid rgba(255,255,255,0.3)",
                  position: "absolute",
                  bottom: 6,
                  left: "50%",
                  transform: "translateX(-50%)",
                }}
              >
                {/* Screen content */}
                <div
                  className="absolute inset-1 rounded-md overflow-hidden"
                  style={{ background: "rgba(10,10,30,0.5)", backdropFilter: "blur(6px)" }}
                >
                  <div className="text-center text-white/40 text-[5px] font-bold tracking-widest pt-1" style={{ fontFamily: "monospace" }}>
                    IELTS DASHBOARD
                  </div>
                  <div className="text-center text-white font-bold" style={{ fontSize: 11 }}>
                    Overall Band: 7.5
                  </div>
                  {/* Progress bar */}
                  <div className="mx-2 mt-0.5 h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: "70%", background: "linear-gradient(90deg, #A78BFA, #C084FC)" }} />
                  </div>
                  <div className="text-center text-white/50 text-[4px] mt-0.5">Listening · Reading · Speaking · Writing</div>
                </div>
              </div>
            </div>

            {/* ── BOOKS (bottom left) ── */}
            <div
              className="absolute bottom-0 left-2"
              style={{ width: 28, height: 36 }}
            >
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  style={{
                    position: "absolute",
                    bottom: i * 8,
                    left: 0,
                    width: 28,
                    height: 10,
                    borderRadius: "3px",
                    background: `rgba(255,255,255,${0.08 + i * 0.03})`,
                    border: "1px solid rgba(255,255,255,0.15)",
                    transform: `rotate(${-3 + i * 2}deg)`,
                  }}
                />
              ))}
              <div
                style={{
                  position: "absolute",
                  bottom: 24,
                  left: 4,
                  width: 18,
                  height: 10,
                  borderRadius: "3px",
                  background: "rgba(168,139,250,0.3)",
                  border: "1px solid rgba(168,139,250,0.5)",
                  transform: "rotate(-5deg)",
                }}
              />
            </div>

            {/* ── HEADPHONES (bottom right) ── */}
            <div
              className="absolute bottom-0 right-6"
              style={{ width: 30, height: 34 }}
            >
              {/* Band */}
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: 20,
                  height: 18,
                  borderRadius: "9999px 9999px 0 0",
                  border: "2px solid rgba(255,255,255,0.35)",
                  borderBottom: "none",
                }}
              />
              {/* Left ear cup */}
              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  width: 14,
                  height: 16,
                  borderRadius: "6px",
                  background: "rgba(255,255,255,0.15)",
                  border: "1px solid rgba(255,255,255,0.3)",
                }}
              />
              {/* Right ear cup */}
              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  right: 0,
                  width: 14,
                  height: 16,
                  borderRadius: "6px",
                  background: "rgba(255,255,255,0.15)",
                  border: "1px solid rgba(255,255,255,0.3)",
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div
        className="flex-1 flex flex-col items-center justify-center p-6"
        style={{ width: "45%", background: "#F8F8FC" }}
      >
        {/* Language switch */}
        <div className="absolute top-6 right-6">
          <button
            type="button"
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 font-medium transition-colors cursor-pointer"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20" />
            </svg>
            🌐 Tiếng Việt
          </button>
        </div>

        {/* Main card */}
        <div className="w-full max-w-[560px]">
          {/* Title */}
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Tạo tài khoản miễn phí</h2>
          <p className="mt-1.5 text-sm text-slate-500 leading-relaxed">
            Đăng ký ngay để bắt đầu hành trình chinh phục IELTS
          </p>

          {/* Feature row */}
          <div className="grid grid-cols-3 gap-3 mt-5 mb-6">
            {[
              { icon: "📚", label: "Học mọi lúc" },
              { icon: "🎯", label: "Lộ trình rõ ràng" },
              { icon: "💬", label: "Hỗ trợ 24/7" },
            ].map((f) => (
              <div key={f.label} className="text-center">
                <div className="text-2xl mb-1">{f.icon}</div>
                <p className="text-[10px] text-slate-400 font-medium leading-tight">{f.label}</p>
              </div>
            ))}
          </div>

          {/* Google button */}
          <button
            type="button"
            onClick={handleGoogle}
            disabled={oauthLoading}
            className="w-full flex items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-700 text-sm font-semibold py-3.5 px-4 transition-all duration-200 shadow-sm hover:shadow-md"
          >
            {oauthLoading ? (
              <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#fff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#fff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#fff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#fff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            <span>Đăng ký với Google</span>
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-xs text-slate-400 uppercase tracking-widest font-medium">hoặc</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          {/* Benefits box */}
          <div className="rounded-2xl border border-brand-100/50 bg-brand-50/60 p-4 space-y-2">
            {[
              "Khóa học IELTS chất lượng cao",
              "Luyện đề thi thử & đánh giá kỹ năng",
              "Học cùng giảng viên bản ngữ",
              "Theo dõi tiến độ học tập",
            ].map((item) => (
              <div key={item} className="flex items-center gap-2.5 text-xs text-slate-600">
                <div className="w-4 h-4 rounded-full bg-brand-100 flex items-center justify-center shrink-0">
                  <svg className="w-2.5 h-2.5 text-brand-600" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 8l3.5 3.5L13 4.5" />
                  </svg>
                </div>
                {item}
              </div>
            ))}
          </div>

          {/* Legal */}
          <p className="mt-4 text-center text-[11px] text-slate-400 leading-relaxed">
            Khi đăng ký, bạn đồng ý với{" "}
            <Link href="/terms" className="text-slate-500 hover:text-brand-600 transition-colors underline">Điều khoản sử dụng</Link>
            {" "}và{" "}
            <Link href="/privacy" className="text-slate-500 hover:text-brand-600 transition-colors underline">Chính sách bảo mật</Link>
          </p>

          {/* Login link */}
          <div className="mt-4 text-center">
            <p className="text-sm text-slate-500">
              Đã có tài khoản?{" "}
              <Link href="/login" className="text-brand-600 hover:text-brand-700 font-semibold transition-colors">
                Đăng nhập ngay
              </Link>
            </p>
          </div>

          {/* Trust bar */}
          <div className="mt-6 grid grid-cols-3 gap-3">
            {[
              { icon: "🛡", title: "Bảo mật tuyệt đối", desc: "Thông tin được bảo vệ an toàn" },
              { icon: "🎓", title: "Cam kết chất lượng", desc: "Nội dung học chuẩn IELTS" },
              { icon: "🤝", title: "Đồng hành cùng bạn", desc: "Hỗ trợ trong suốt quá trình học" },
            ].map((t) => (
              <div key={t.title} className="text-center">
                <div className="text-base">{t.icon}</div>
                <div className="text-[10px] font-semibold text-slate-700 mt-0.5 leading-tight">{t.title}</div>
                <div className="text-[9px] text-slate-400 mt-0.5 leading-tight">{t.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
