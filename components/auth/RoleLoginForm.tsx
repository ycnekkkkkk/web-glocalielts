"use client";
import { createBrowserClient } from "@/lib/supabase/client";
import type { AuthChangeEvent, AuthError, Session } from "@supabase/supabase-js";
import { getOAuthRedirectToUrl } from "@/lib/auth/oauth-redirect";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import Link from "next/link";
import Button from "@/components/ui/Button";
import AuthPage from "@/components/auth/AuthPage";

function describeLoginError(error: AuthError): { message: string; suggestResend: boolean } {
  const code = error.code ?? "";
  const msg = (error.message || "").toLowerCase();
  if (code === "email_not_confirmed" || msg.includes("email not confirmed") || msg.includes("email address not confirmed")) {
    return { message: "Tài khoản chưa được xác nhận. Kiểm tra hộp thư (và Spam).", suggestResend: true };
  }
  if (code === "invalid_credentials" || msg.includes("invalid login credentials")) {
    return { message: "Email hoặc mật khẩu không đúng.", suggestResend: false };
  }
  return { message: error.message || "Đăng nhập thất bại", suggestResend: false };
}

interface LoginConfig {
  role: "student" | "admin" | "teacher" | "organization" | "academic_manager";
  title: string;
  subtitle: string;
  dashboard: string;
  oauth?: { provider: "google"; label?: string };
  allowPasswordLogin?: boolean;
  demoAccount?: { email: string; password: string };
  demoLabel?: string;
}

export default function RoleLoginForm({
  config,
  emailConfirmHint = false,
}: {
  config: LoginConfig;
  emailConfirmHint?: boolean;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showResend, setShowResend] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [inputFocus, setInputFocus] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!config.oauth?.provider) return;
    const supabase = createBrowserClient();
    supabase.auth.getSession().then((res: { data: { session: Session | null } }) => {
      if (res.data.session?.user) void handlePostLogin();
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      if (event === "SIGNED_IN" && session?.user) void handlePostLogin();
    });
    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handlePostLogin() {
    if (config.role === "student") {
      try { await fetch("/api/student/ensure-student-record", { method: "POST" }); } catch { /* ignore */ }
    }
    router.refresh();
    router.replace(config.dashboard);
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!config.allowPasswordLogin) {
      toast.error("Khu vực này chỉ hỗ trợ đăng nhập Google.");
      return;
    }
    setShowResend(false);
    setLoading(true);
    try {
      const supabase = createBrowserClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error) throw error;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Account not found");
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
      const actualRole = profile?.role || "student";
      if (actualRole !== config.role) {
        await supabase.auth.signOut();
        throw new Error(`Tài khoản này không có quyền truy cập: ${config.title}`);
      }
      toast.success("Đăng nhập thành công!");
      await handlePostLogin();
    } catch (err) {
      if (err && typeof err === "object" && "code" in err) {
        const { message, suggestResend } = describeLoginError(err as AuthError);
        setShowResend(suggestResend);
        toast.error(message);
      } else {
        toast.error(err instanceof Error ? err.message : "Đăng nhập thất bại");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleOAuth() {
    if (!config.oauth?.provider) return;
    setOauthLoading(true);
    try {
      const supabase = createBrowserClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: config.oauth.provider,
        options: { redirectTo: getOAuthRedirectToUrl() },
      });
      if (error) throw error;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Đăng nhập Google thất bại");
      setOauthLoading(false);
    }
  }

  async function handleResend() {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) { toast.error("Nhập email đã dùng khi đăng ký"); return; }
    setLoading(true);
    try {
      const supabase = createBrowserClient();
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: trimmed,
        options: { emailRedirectTo: `${window.location.origin}/login` },
      });
      if (error) throw error;
      toast.success("Đã gửi lại email xác nhận. Kiểm tra hộp thư và Spam.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Không thể gửi email");
    } finally {
      setLoading(false);
    }
  }

  function fillDemo() {
    if (config.demoAccount) {
      setEmail(config.demoAccount.email);
      setPassword(config.demoAccount.password);
    }
  }

  const inputClass = (focused: boolean) =>
    `w-full rounded-xl border px-4 py-3 text-sm text-slate-800 placeholder:text-slate-300 outline-none transition-all duration-200 bg-white ${
      focused
        ? "border-brand-400 shadow-[0_0_0_3px_rgba(108,99,255,0.15)]"
        : "border-slate-200 hover:border-slate-300"
    }`;

  if (!mounted) return null;

  return (
    <AuthPage
      title={config.title}
      subtitle={config.subtitle}
      footer={
        <p className="text-sm text-slate-500">
          Chưa có tài khoản?{" "}
          <Link href="/register" className="text-brand-600 hover:text-brand-700 font-semibold transition-colors">
            Đăng ký miễn phí
          </Link>
        </p>
      }
    >
      {/* Demo shortcut */}
      {config.demoAccount && (
        <button
          type="button"
          onClick={fillDemo}
          className="w-full mb-5 text-xs font-medium py-2.5 px-4 rounded-xl border border-dashed border-brand-300 text-brand-600 hover:border-brand-400 hover:text-brand-700 hover:bg-brand-50 transition-all duration-200"
        >
          Demo {config.demoLabel ?? "Tài khoản demo"}
        </button>
      )}

      {emailConfirmHint && (
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <p className="font-semibold">Bước tiếp theo sau khi đăng ký</p>
          <p className="mt-1 text-amber-700 text-xs leading-relaxed">
            Mở email của bạn (kiểm tra thư mục Spam), nhấn vào link xác nhận, sau đó đăng nhập với email và mật khẩu.
          </p>
        </div>
      )}

      {config.allowPasswordLogin ? (
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onFocus={() => setInputFocus("email")}
              onBlur={() => setInputFocus(null)}
              placeholder="your@email.com"
              className={inputClass(inputFocus === "email")}
              required
            />
          </div>

          <div>
            <div className="flex justify-end mb-1.5">
              <Link href="/forgot-password" className="text-xs text-slate-400 hover:text-brand-600 transition-colors">
                Quên mật khẩu?
              </Link>
            </div>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                onFocus={() => setInputFocus("pw")}
                onBlur={() => setInputFocus(null)}
                placeholder="Password"
                className={`${inputClass(inputFocus === "pw")} pr-12`}
                required
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors"
              >
                {showPw ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.543 7-1.275 4.057-5.064 7-9.543 7-4.477 0-8.268-2.943-9.543-7z" /></svg>
                )}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            loading={loading}
            className="w-full"
            size="lg"
            style={{
              background: "linear-gradient(135deg, #6C63FF 0%, #8B5CF6 50%, #6C63FF 100%)",
              backgroundSize: "200% 200%",
              color: "#fff",
              boxShadow: "0 4px 16px rgba(108,99,255,0.35)",
            } as React.CSSProperties}
            onMouseEnter={e => {
              (e.target as HTMLElement).style.backgroundPosition = "100% 100%";
              (e.target as HTMLElement).style.transform = "translateY(-1px)";
              (e.target as HTMLElement).style.boxShadow = "0 6px 24px rgba(108,99,255,0.5)";
            }}
            onMouseLeave={e => {
              (e.target as HTMLElement).style.backgroundPosition = "0% 0%";
              (e.target as HTMLElement).style.transform = "translateY(0)";
              (e.target as HTMLElement).style.boxShadow = "0 4px 16px rgba(108,99,255,0.35)";
            }}
          >
            Đăng nhập
          </Button>

          {showResend && (
            <button type="button" onClick={handleResend} className="w-full text-xs text-brand-500 hover:text-brand-700 transition-colors">
              Gửi lại email xác nhận
            </button>
          )}
        </form>
      ) : (
        <div className="rounded-xl border border-brand-100 bg-brand-50 p-3 text-sm text-brand-700">
          Đăng nhập với Google để đảm bảo thông tin tài khoản chính xác.
        </div>
      )}

      {/* Divider */}
      {config.oauth?.provider && (
        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-slate-200" />
          <span className="text-xs text-slate-400 uppercase tracking-widest">hoặc</span>
          <div className="flex-1 h-px bg-slate-200" />
        </div>
      )}

      {/* Google OAuth */}
      {config.oauth?.provider && (
        <button
          type="button"
          onClick={handleOAuth}
          disabled={oauthLoading}
          className="w-full flex items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-700 text-sm font-medium py-3 px-4 transition-all duration-200 shadow-sm hover:shadow"
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
          <span>{config.oauth.label ?? "Continue with Google"}</span>
        </button>
      )}
    </AuthPage>
  );
}
