"use client";
import { createBrowserClient } from "@/lib/supabase/client";
import type { AuthChangeEvent, AuthError, Session } from "@supabase/supabase-js";
import { ArrowLeft, Eye, EyeOff, Lock, Mail } from "lucide-react";
import Link from "next/link";
import { getOAuthRedirectToUrl } from "@/lib/auth/oauth-redirect";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import Button from "./Button";
import Input from "./Input";
import Logo from "./Logo";

function describeLoginError(error: AuthError): { message: string; suggestResendConfirmation: boolean } {
  const code = error.code ?? "";
  const msg = (error.message || "").toLowerCase();
  if (
    code === "email_not_confirmed" ||
    msg.includes("email not confirmed") ||
    msg.includes("email address not confirmed")
  ) {
    return {
      message:
        "Tài khoản chưa xác nhận email. Mở hộp thư (và Spam), bấm link từ Supabase. Hoặc dùng nút \"Gửi lại email xác nhận\" bên dưới.",
      suggestResendConfirmation: true,
    };
  }
  if (code === "invalid_credentials" || msg.includes("invalid login credentials")) {
    return {
      message:
        "Email hoặc mật khẩu không đúng. Nếu bạn vừa đăng ký, cần xác nhận email trước khi đăng nhập bằng mật khẩu.",
      suggestResendConfirmation: false,
    };
  }
  return { message: error.message || "Đăng nhập thất bại", suggestResendConfirmation: false };
}

export interface RoleLoginConfig {
  role: "student" | "admin" | "teacher" | "organization" | "academic_manager";
  title: string;
  subtitle: string;
  gradient: string;           // Tailwind gradient classes for outer bg
  accentClass: string;        // e.g. "text-sky-600"
  spinnerClass: string;       // e.g. "border-sky-600"
  dashboard: string;          // redirect after login
  oauth?: { provider: "google"; label?: string };
  allowPasswordLogin?: boolean;
  demoAccount?: { email: string; password: string };
  demoLabel?: string;
}

export default function RoleLoginForm({
  config,
  emailConfirmHint = false,
}: {
  config: RoleLoginConfig;
  /** Sau đăng ký khi Supabase bật xác nhận email */
  emailConfirmHint?: boolean;
}) {
  const allowPasswordLogin = config.allowPasswordLogin ?? true;
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showResendConfirmation, setShowResendConfirmation] = useState(false);

  /**
   * Fallback khi callback chỉ xử lý được ở browser (#access_token hoặc bổ sung sau PKCE).
   * Luồng chính: proxy exchange ?code= + Set-Cookie rồi 302 → dashboard.
   */
  useEffect(() => {
    if (!config.oauth?.provider) return;
    const supabase = createBrowserClient();
    let cancelled = false;

    async function goDashboard() {
      if (cancelled) return;
      if (config.role === "student") {
        try {
          await fetch("/api/student/ensure-student-record", { method: "POST" });
        } catch {
          /* Không chặn đăng nhập nếu API lỗi */
        }
      }
      router.refresh();
      router.replace(config.dashboard);
    }

    supabase.auth.getSession().then((res: { data: { session: Session | null } }) => {
      const session = res.data.session;
      if (session?.user) void goDashboard();
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      if (event === "SIGNED_IN" && session?.user) void goDashboard();
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [config.oauth?.provider, config.dashboard, router]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!allowPasswordLogin) {
      toast.error("Khu vực này chỉ hỗ trợ đăng nhập bằng Google.");
      return;
    }
    setShowResendConfirmation(false);
    setLoading(true);
    try {
      const supabase = createBrowserClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error) throw error;

      // Verify role matches this portal
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Không tìm thấy tài khoản");

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      const actualRole = profile?.role || "student";
      if (actualRole !== config.role) {
        await supabase.auth.signOut();
        throw new Error(`Tài khoản này không có quyền truy cập trang ${config.title}`);
      }

      toast.success("Đăng nhập thành công!");
      if (config.role === "student") {
        try {
          await fetch("/api/student/ensure-student-record", { method: "POST" });
        } catch {
          /* bỏ qua */
        }
      }
      router.refresh();
      router.push(config.dashboard);
    } catch (err) {
      if (err && typeof err === "object" && "code" in err) {
        const { message, suggestResendConfirmation } = describeLoginError(err as AuthError);
        setShowResendConfirmation(suggestResendConfirmation);
        toast.error(message);
      } else {
        toast.error(err instanceof Error ? err.message : "Đăng nhập thất bại");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleResendConfirmation() {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      toast.error("Nhập email đã dùng lúc đăng ký");
      return;
    }
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
      toast.error(e instanceof Error ? e.message : "Không gửi được email");
    } finally {
      setLoading(false);
    }
  }

  async function handleOAuth() {
    if (!config.oauth?.provider) return;
    setLoading(true);
    try {
      const supabase = createBrowserClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: config.oauth.provider,
        options: { redirectTo: getOAuthRedirectToUrl() },
      });
      if (error) throw error;
      // Supabase will redirect away; no further action needed.
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Đăng nhập Google thất bại");
      setLoading(false);
    }
  }

  function fillDemo() {
    if (config.demoAccount) {
      setEmail(config.demoAccount.email);
      setPassword(config.demoAccount.password);
    }
  }

  return (
    <div className={`min-h-screen ${config.gradient} flex items-center justify-center p-4`}>
      <div className="w-full max-w-md">
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-white/75 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4 shrink-0" />
            Quay lại trang chủ
          </Link>
        </div>
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex justify-center mb-4">
            <Logo light size="lg" href="/" />
          </div>
          <p className="text-white/60 text-sm">{config.subtitle}</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-8">
          <h1 className="text-xl font-bold text-gray-900 mb-6">{config.title}</h1>

          {emailConfirmHint && (
            <div
              role="status"
              className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
            >
              <p className="font-medium">Bước tiếp theo sau đăng ký</p>
              <p className="mt-1 text-amber-900/90">
                Mở email bạn vừa dùng khi đăng ký (kể cả thư mục Spam), bấm liên kết xác nhận trong email từ
                Supabase, sau đó quay lại trang này và đăng nhập bằng đúng email cùng mật khẩu bạn đã tạo — đây là
                tài khoản thật của bạn.
              </p>
            </div>
          )}

          {/* Demo shortcut */}
          {config.demoAccount && (
            <div className="mb-5">
              <button
                type="button"
                onClick={fillDemo}
                className="w-full text-sm font-medium py-2.5 px-4 rounded-xl border-2 border-dashed border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700 transition-colors"
              >
                ⚡ Demo {config.demoLabel ?? config.title}
              </button>
            </div>
          )}

          {allowPasswordLogin ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <Input
                label="Email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                icon={<Mail className="w-4 h-4" />}
                required
              />
              <Input
                label="Mật khẩu"
                type={showPw ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                icon={<Lock className="w-4 h-4" />}
                iconRight={
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
                required
              />
              <div className="flex justify-end">
                <Link
                  href="/forgot-password"
                  className={`text-xs font-medium ${config.accentClass} hover:opacity-80 transition-opacity`}
                >
                  Quên mật khẩu?
                </Link>
              </div>
              <Button type="submit" loading={loading} className="w-full" size="lg">
                Đăng nhập
              </Button>
            </form>
          ) : (
            <div className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">
              Đăng nhập học viên bằng Google để đảm bảo thông tin tài khoản chính xác.
            </div>
          )}

          {allowPasswordLogin && showResendConfirmation && (
            <div className="mt-4">
              <Button
                type="button"
                variant="outline"
                loading={loading}
                className="w-full"
                size="lg"
                onClick={handleResendConfirmation}
              >
                Gửi lại email xác nhận
              </Button>
            </div>
          )}

          {config.oauth?.provider === "google" && (
            <div className="mt-4">
              <Button
                type="button"
                onClick={handleOAuth}
                loading={loading}
                variant="outline"
                className="w-full"
                size="lg"
              >
                {config.oauth.label ?? "Tiếp tục với Google"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
