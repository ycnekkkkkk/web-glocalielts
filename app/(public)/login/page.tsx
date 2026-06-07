"use client";

import { createBrowserClient } from "@/lib/supabase/client";
import { getOAuthRedirectToUrl } from "@/lib/auth/oauth-redirect";
import Link from "next/link";
import { useState, useEffect, Suspense } from "react";
import toast from "react-hot-toast";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [remember, setRemember] = useState(false);
  const [particles, setParticles] = useState<Array<{ x: string; y: string; s: number; op: number }>>([]);

  useEffect(() => {
    setParticles(
      [
        { x: "8%", y: "12%", s: 1.5 },
        { x: "22%", y: "8%", s: 1 },
        { x: "35%", y: "18%", s: 2 },
        { x: "55%", y: "6%", s: 1 },
        { x: "70%", y: "15%", s: 1.5 },
        { x: "85%", y: "10%", s: 1 },
        { x: "15%", y: "30%", s: 1 },
        { x: "45%", y: "28%", s: 1.5 },
        { x: "80%", y: "25%", s: 1 },
        { x: "60%", y: "35%", s: 2 },
        { x: "25%", y: "42%", s: 1 },
        { x: "75%", y: "40%", s: 1.5 },
        { x: "10%", y: "55%", s: 1 },
        { x: "50%", y: "50%", s: 1 },
        { x: "90%", y: "55%", s: 1.5 },
        { x: "30%", y: "65%", s: 1 },
        { x: "65%", y: "60%", s: 2 },
        { x: "5%", y: "75%", s: 1 },
        { x: "40%", y: "72%", s: 1.5 },
        { x: "88%", y: "70%", s: 1 },
      ].map((p) => ({ ...p, op: 0.15 + Math.random() * 0.2 }))
    );
  }, []);

  // After OAuth redirect, middleware exchanges the code for a session.
  // Check if user is now authenticated and redirect to dashboard.
  useEffect(() => {
    async function checkAuth() {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      if (!code) return;

      const supabase = createBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        toast.success("Đăng nhập thành công!");
        window.location.href = "/student/dashboard";
      }
    }
    checkAuth();
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const supabase = createBrowserClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error) {
        const msg = (error.message || "").toLowerCase();
        if (error.code === "email_not_confirmed" || msg.includes("email not confirmed")) {
          toast.error("Tài khoản chưa được xác nhận. Kiểm tra hộp thư (và Spam).");
        } else if (error.code === "invalid_credentials" || msg.includes("invalid")) {
          toast.error("Email hoặc mật khẩu không đúng.");
        } else {
          toast.error(error.message || "Đăng nhập thất bại");
        }
        setLoading(false);
        return;
      }
      toast.success("Đăng nhập thành công!");
      window.location.href = "/student/dashboard";
    } catch {
      toast.error("Đăng nhập thất bại");
      setLoading(false);
    }
  }

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
      toast.error(err instanceof Error ? err.message : "Đăng nhập Google thất bại");
      setOauthLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* ── LEFT PANEL ── */}
      <div
        className="hidden lg:flex flex-col relative overflow-hidden"
        style={{ width: "55%", background: "linear-gradient(160deg, #070B3D 0%, #111C66 50%, #4F46E5 100%)" }}
      >
        {/* Star particles */}
        <div className="absolute inset-0 pointer-events-none">
          {particles.map((p, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-white"
              style={{
                left: p.x,
                top: p.y,
                width: p.s,
                height: p.s,
                opacity: p.op,
              }}
            />
          ))}
          {/* Curved geometric lines */}
          <svg className="absolute inset-0 w-full h-full opacity-10" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d="M0,60 Q30,20 60,50 T100,30" stroke="rgba(168,139,250,0.5)" strokeWidth="0.3" fill="none" />
            <path d="M0,80 Q40,40 80,70 T100,50" stroke="rgba(168,139,250,0.3)" strokeWidth="0.3" fill="none" />
            <path d="M20,0 Q50,50 80,20 T100,60" stroke="rgba(168,139,250,0.2)" strokeWidth="0.3" fill="none" />
          </svg>
          {/* Glow blobs */}
          <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-indigo-500/20 blur-3xl" />
          <div className="absolute -bottom-20 -left-10 w-60 h-60 rounded-full bg-purple-500/15 blur-3xl" />
          <div className="absolute top-1/2 right-1/4 w-40 h-40 rounded-full bg-violet-500/10 blur-2xl" />
        </div>

        {/* Back button */}
        <div className="relative z-10 p-8">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-2xl border border-white/25 text-white/80 text-xs font-medium px-4 py-1.5 hover:bg-white/10 hover:text-white hover:border-white/40 transition-all backdrop-blur-sm"
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
            Chào mừng
            <br />
            <span style={{ background: "linear-gradient(135deg, #C084FC 0%, #A78BFA 50%, #818CF8 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              trở lại!
            </span>
          </h1>

          {/* Description */}
          <p className="mt-4 text-sm text-white/60 leading-relaxed max-w-sm">
            Tiếp tục hành trình chinh phục IELTS
            <br />và theo dõi tiến độ học tập của bạn.
          </p>

          {/* Benefits */}
          <div className="mt-5 space-y-2">
            {[
              "Truy cập khóa học IELTS",
              "Làm đề thi thử sát với đề thật",
              "Theo dõi tiến độ học tập",
              "Nhận đánh giá kỹ năng bằng AI",
            ].map((item) => (
              <div key={item} className="flex items-center gap-2.5 text-sm text-white/70">
                <div className="w-5 h-5 rounded-full bg-emerald-400/20 border border-emerald-400/30 flex items-center justify-center shrink-0">
                  <svg className="w-2.5 h-2.5 text-emerald-400" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 8l3.5 3.5L13 4.5" />
                  </svg>
                </div>
                {item}
              </div>
            ))}
          </div>

          {/* Stats */}
          <div className="flex items-center gap-3 mt-6">
            {[
              { emoji: "👨‍🎓", value: "3.500+", label: "Học viên\nđã tin tưởng" },
              { emoji: "😊", value: "98%", label: "Hài lòng với\nchất lượng" },
              { emoji: "🎓", value: "10+", label: "Khóa học\nchuyên sâu" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-white/10 bg-white/8 backdrop-blur-sm px-4 py-3 text-center flex-1">
                <div className="text-lg mb-1">{s.emoji}</div>
                <div className="text-white font-extrabold text-lg leading-none">{s.value}</div>
                <div className="text-white/40 text-[10px] leading-tight mt-1 whitespace-pre-line">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Illustration: Laptop + Books + Headphones */}
          <div className="relative mt-auto pb-0">
            {/* LAPTOP center */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2">
              <div style={{ width: 120, height: 7, borderRadius: "0 0 6px 6px", background: "rgba(255,255,255,0.15)" }} />
              <div
                style={{
                  width: 108, height: 70, borderRadius: "10px 10px 0 0",
                  background: "rgba(255,255,255,0.12)", border: "1.5px solid rgba(255,255,255,0.3)",
                  position: "absolute", bottom: 6, left: "50%", transform: "translateX(-50%)",
                }}
              >
                <div className="absolute inset-1 rounded-md overflow-hidden" style={{ background: "rgba(10,10,30,0.5)" }}>
                  <div className="text-center text-white/40 text-[5px] font-bold tracking-widest pt-1" style={{ fontFamily: "monospace" }}>IELTS DASHBOARD</div>
                  <div className="text-center text-white font-bold" style={{ fontSize: 11 }}>Band Score: 7.5</div>
                  <div className="mx-2 mt-0.5 h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: "70%", background: "linear-gradient(90deg, #A78BFA, #C084FC)" }} />
                  </div>
                  <div className="flex justify-between px-2 mt-0.5 text-white/50 text-[4px]">
                    <span>L:7.5</span><span>R:6.5</span><span>S:6.5</span><span>W:6.0</span>
                  </div>
                </div>
              </div>
            </div>

            {/* BOOKS bottom left */}
            <div className="absolute bottom-0 left-2" style={{ width: 28, height: 36 }}>
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  style={{
                    position: "absolute", bottom: i * 8, left: 0,
                    width: 28, height: 10, borderRadius: "3px",
                    background: `rgba(255,255,255,${0.08 + i * 0.03})`,
                    border: "1px solid rgba(255,255,255,0.15)",
                    transform: `rotate(${-3 + i * 2}deg)`,
                  }}
                />
              ))}
              <div style={{ position: "absolute", bottom: 24, left: 4, width: 18, height: 10, borderRadius: "3px", background: "rgba(168,139,250,0.3)", border: "1px solid rgba(168,139,250,0.5)", transform: "rotate(-5deg)" }} />
            </div>

            {/* HEADPHONES bottom right */}
            <div className="absolute bottom-0 right-6" style={{ width: 30, height: 34 }}>
              <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: 20, height: 18, borderRadius: "9999px 9999px 0 0", border: "2px solid rgba(255,255,255,0.35)", borderBottom: "none" }} />
              <div style={{ position: "absolute", bottom: 0, left: 0, width: 14, height: 16, borderRadius: "6px", background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)" }} />
              <div style={{ position: "absolute", bottom: 0, right: 0, width: 14, height: 16, borderRadius: "6px", background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)" }} />
            </div>
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div
        className="flex-1 flex flex-col items-center justify-center p-6"
        style={{ width: "45%", background: "#F8F9FC" }}
      >
        {/* Language switch */}
        <div className="absolute top-6 right-6">
          <button type="button" className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 font-medium transition-colors cursor-pointer">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20" />
            </svg>
            🌐 Tiếng Việt
          </button>
        </div>

        {/* Login card */}
        <div className="w-full max-w-[520px]">
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Chào mừng trở lại</h2>
          <p className="mt-1.5 text-sm text-slate-500 leading-relaxed">
            Đăng nhập để tiếp tục hành trình IELTS của bạn.
          </p>

          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            {/* Email field */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Email hoặc tên đăng nhập
              </label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Nhập email hoặc tên đăng nhập"
                  required
                  className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-3 text-sm text-slate-800 placeholder:text-slate-300 outline-none transition-all duration-200 hover:border-slate-300 focus:border-brand-400 focus:shadow-[0_0_0_3px_rgba(108,99,255,0.15)]"
                />
              </div>
            </div>

            {/* Password field */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Mật khẩu</label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0110 0v4" />
                  </svg>
                </div>
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu"
                  required
                  className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-10 py-3 text-sm text-slate-800 placeholder:text-slate-300 outline-none transition-all duration-200 hover:border-slate-300 focus:border-brand-400 focus:shadow-[0_0_0_3px_rgba(108,99,255,0.15)]"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPw ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Options row */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-slate-500 cursor-pointer">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-200 text-brand-500 cursor-pointer"
                />
                Ghi nhớ đăng nhập
              </label>
              <Link href="/forgot-password" className="text-xs text-slate-500 hover:text-brand-600 font-medium transition-colors">
                Quên mật khẩu?
              </Link>
            </div>

            {/* Login button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-2xl text-white text-sm font-bold py-3.5 px-4 transition-all duration-200 cursor-pointer"
              style={{
                background: "linear-gradient(135deg, #6C63FF 0%, #8B5CF6 50%, #6C63FF 100%)",
                backgroundSize: "200% 200%",
                boxShadow: "0 4px 16px rgba(108,99,255,0.35)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundPosition = "100% 100%";
                (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)";
                (e.currentTarget as HTMLElement).style.boxShadow = "0 6px 24px rgba(108,99,255,0.5)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundPosition = "0% 0%";
                (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 16px rgba(108,99,255,0.35)";
              }}
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : null}
              {loading ? "Đang đăng nhập..." : "Đăng nhập"}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-xs text-slate-400 uppercase tracking-widest font-medium">hoặc</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          {/* Google button */}
          <button
            type="button"
            onClick={handleGoogle}
            disabled={oauthLoading}
            className="w-full flex items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-700 text-sm font-semibold py-3 px-4 transition-all duration-200 shadow-sm hover:shadow-md"
          >
            {oauthLoading ? (
              <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#fff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#fff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#fff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#fff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            <span>Đăng nhập với Google</span>
          </button>

          {/* Register link */}
          <div className="mt-5 text-center">
            <p className="text-sm text-slate-500">
              Chưa có tài khoản?{" "}
              <Link href="/register" className="text-brand-600 hover:text-brand-700 font-semibold transition-colors">
                Đăng ký miễn phí
              </Link>
            </p>
          </div>

          {/* Trust bar */}
          <div className="mt-6 grid grid-cols-3 gap-3">
            {[
              { icon: "🛡", title: "Bảo mật tuyệt đối", desc: "Thông tin của bạn được bảo vệ an toàn" },
              { icon: "🎓", title: "Nội dung chuẩn IELTS", desc: "Học liệu chất lượng từ chuyên gia" },
              { icon: "🎧", title: "Đồng hành lâu dài", desc: "Hỗ trợ bạn trong suốt quá trình học" },
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

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
