"use client";

import { createBrowserClient } from "@/lib/supabase/client";
import { getOAuthRedirectToUrl } from "@/lib/auth/oauth-redirect";
import { ArrowLeft, ArrowRight, CheckCircle2, Eye, EyeOff, Lock, Mail, ShieldCheck, Sparkles } from "lucide-react";
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

  // After OAuth redirect, check if user is authenticated and redirect to dashboard
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
          toast.error("Email hoặc mật khẩu không chính xác.");
        } else {
          toast.error(error.message || "Đăng nhập thất bại");
        }
        setLoading(false);
        return;
      }
      toast.success("Đăng nhập thành công!");
      window.location.href = "/student/dashboard";
    } catch {
      toast.error("Đăng nhập thất bại. Vui lòng thử lại.");
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
    <div className="flex min-h-screen lg:h-screen lg:overflow-hidden bg-white">
      {/* ── 1. LEFT PANEL: ACADEMIC BRANDING & INSTITUTIONAL TRUST ── */}
      <div className="hidden lg:flex flex-col justify-between relative overflow-hidden w-1/2 bg-slate-900 text-white p-8 xl:p-12 border-r border-slate-800 selection:bg-brand-500/30">
        {/* Ambient subtle glow */}
        <div className="pointer-events-none absolute -top-40 -left-40 w-96 h-96 rounded-full bg-brand-600/15 blur-[120px]" />
        <div className="pointer-events-none absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-indigo-500/10 blur-[120px]" />

        {/* Top: Navigation & Dual Logo */}
        <div className="relative z-10">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700/60 transition-all cursor-pointer mb-6 xl:mb-8 shadow-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Quay lại trang chủ</span>
          </Link>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-2.5 py-1.5">
              <img src="/logo/logo-ag.svg" alt="Amazing Group" className="w-6 h-6 object-contain" />
              <div className="w-px h-4 bg-white/10" />
              <img src="/logo/logo-gi.svg" alt="Glocal IELTS" className="w-6 h-6 object-contain" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-white tracking-tight leading-tight">Glocal IELTS</span>
              <span className="text-[10px] font-medium text-slate-400 leading-tight">Hệ sinh thái Amazing Group</span>
            </div>
          </div>
        </div>

        {/* Center: Educational Authority & Value Proposition */}
        <div className="relative z-10 max-w-lg my-auto py-4">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-300 text-[10px] font-bold uppercase tracking-wider mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />
            <span>Cổng Học Tập & Khảo Thí Chuẩn Cambridge</span>
          </div>

          <h1 className="text-2xl xl:text-3xl font-extrabold text-white tracking-tight leading-snug mb-3">
            Đăng nhập vào không gian học thuật IELTS
          </h1>

          <p className="text-xs xl:text-sm text-slate-300 leading-relaxed mb-6">
            Truy cập giáo trình độc quyền, luyện đề thi 4 kỹ năng bám sát format Cambridge 15–19 và theo dõi báo cáo phân tích năng lực chi tiết.
          </p>

          {/* Key Value Checklist */}
          <div className="space-y-3 text-xs xl:text-sm text-slate-200">
            <div className="flex items-center gap-2.5">
              <div className="w-4.5 h-4.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              </div>
              <span className="font-medium">Chương trình đào tạo IELTS cá nhân hóa theo từng band điểm</span>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="w-4.5 h-4.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              </div>
              <span className="font-medium">Phòng thi thử 4 kỹ năng mô phỏng 100% đề thi IDP & British Council</span>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="w-4.5 h-4.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              </div>
              <span className="font-medium">Chấm chữa chi tiết Writing & Speaking cùng Hội đồng Giảng viên</span>
            </div>
          </div>
        </div>

        {/* Bottom: Academic Endorsement & Partnership Note */}
        <div className="relative z-10 rounded-xl bg-white/5 border border-white/10 p-3.5 xl:p-4 backdrop-blur-sm">
          <p className="text-xs text-slate-300 leading-relaxed italic">
            “Đồng hành cùng học viên bứt phá mục tiêu IELTS với lộ trình học tập khoa học, kiểm tra năng lực minh bạch và cố vấn học vụ tận tâm.”
          </p>
          <div className="mt-2.5 pt-2.5 border-t border-white/10 flex items-center justify-between text-[10px] text-slate-400 font-medium">
            <span className="text-slate-300 font-semibold">Hội đồng Học thuật Glocal IELTS</span>
            <span>Đối tác Khảo thí IDP & BC</span>
          </div>
        </div>
      </div>

      {/* ── 2. RIGHT PANEL: CLEAN, INTENTIONAL FORM ── */}
      <div className="flex-1 flex flex-col justify-between p-6 sm:p-8 lg:p-8 xl:p-12 overflow-y-auto">
        {/* Mobile top link & branding */}
        <div className="lg:hidden flex items-center justify-between mb-6 pb-3 border-b border-slate-100">
          <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Trang chủ</span>
          </Link>
          <div className="flex items-center gap-2">
            <img src="/logo/logo-gi.svg" alt="Glocal IELTS" className="w-6 h-6 object-contain" />
            <span className="text-xs font-bold text-slate-900">Glocal IELTS</span>
          </div>
        </div>

        {/* Form Container (Width clamped to max-md for optimal readability measure) */}
        <div className="w-full max-w-md mx-auto my-auto">
          {/* Header */}
          <div className="mb-5">
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Đăng nhập tài khoản
            </h2>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Chào mừng bạn trở lại. Nhập thông tin để tiếp tục học tập.
            </p>
          </div>

          {/* Primary SSO Action: Google */}
          <button
            type="button"
            onClick={handleGoogle}
            disabled={oauthLoading}
            className="w-full h-10 flex items-center justify-center gap-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-700 text-xs sm:text-sm font-semibold transition-all shadow-2xs hover:shadow-xs cursor-pointer focus:outline-none focus:ring-4 focus:ring-slate-100"
          >
            {oauthLoading ? (
              <div className="w-4 h-4 border-2 border-slate-300 border-t-brand-600 rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
            )}
            <span>Đăng nhập nhanh với Google</span>
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">hoặc email</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          {/* Direct Input Form */}
          <form onSubmit={handleLogin} className="space-y-3.5">
            {/* Email Field */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Email hoặc Tên đăng nhập
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  autoComplete="email"
                  className="w-full h-10 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 focus:bg-white pl-10 pr-4 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-brand-600 focus:ring-4 focus:ring-brand-500/10 transition-all"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">Mật khẩu</label>
                <Link href="/forgot-password" className="text-xs text-brand-600 hover:text-brand-700 font-semibold transition-colors">
                  Quên mật khẩu?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu"
                  required
                  autoComplete="current-password"
                  className="w-full h-10 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 focus:bg-white pl-10 pr-10 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-brand-600 focus:ring-4 focus:ring-brand-500/10 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  aria-label={showPw ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer rounded-lg hover:bg-slate-100"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center pt-0.5">
              <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-slate-300 text-brand-600 focus:ring-brand-500/20 cursor-pointer"
                />
                <span>Ghi nhớ đăng nhập trên thiết bị này</span>
              </label>
            </div>

            {/* Primary Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-10.5 mt-1.5 flex items-center justify-center gap-2 rounded-xl bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white text-xs sm:text-sm font-bold px-4 transition-all shadow-sm hover:shadow cursor-pointer disabled:opacity-60 focus:outline-none focus:ring-4 focus:ring-brand-500/20"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : null}
              <span>{loading ? "Đang xác thực..." : "Đăng nhập vào hệ thống"}</span>
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          {/* Switch to Register */}
          <div className="mt-4 text-center text-xs text-slate-500">
            Chưa có tài khoản học viên?{" "}
            <Link href="/register" className="text-brand-600 hover:text-brand-700 font-bold transition-colors">
              Đăng ký miễn phí
            </Link>
          </div>
        </div>

        {/* Footer Institutional Assurance */}
        <div className="text-center pt-4 border-t border-slate-100">
          <div className="inline-flex items-center gap-1.5 text-[11px] text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
            <span>Hệ thống bảo mật dữ liệu học vụ chuẩn quốc tế • Glocal IELTS © 2026</span>
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
