"use client";
import Button from "@/components/ui/Button";
import Logo from "@/components/ui/Logo";
import { getOAuthRedirectToUrl } from "@/lib/auth/oauth-redirect";
import { createBrowserClient } from "@/lib/supabase/client";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import toast from "react-hot-toast";

export default function RegisterPage() {
  const [loading, setLoading] = useState(false);

  return (
    <div className="min-h-screen bg-linear-to-br from-brand-950 via-brand-900 to-brand-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-brand-200/90 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4 shrink-0" />
            Quay lại trang chủ
          </Link>
        </div>
        <div className="text-center mb-8">
          <div className="inline-flex justify-center mb-4">
            <Logo light size="lg" href="/" />
          </div>
          <p className="text-brand-300 text-sm">Tạo tài khoản mới</p>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl p-8">
          <h1 className="text-xl font-bold text-gray-900 mb-2">Đăng ký học viên</h1>
          <p className="text-sm text-gray-500 mb-5">
            Dùng Google để đảm bảo email tài khoản là email thật.
          </p>
          <div>
            <Button
              type="button"
              variant="primary"
              loading={loading}
              className="w-full"
              size="lg"
              onClick={async () => {
                try {
                  setLoading(true);
                  const supabase = createBrowserClient();
                  const { error } = await supabase.auth.signInWithOAuth({
                    provider: "google",
                    options: { redirectTo: getOAuthRedirectToUrl() },
                  });
                  if (error) throw error;
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Đăng nhập Google thất bại");
                } finally {
                  setLoading(false);
                }
              }}
            >
              Tiếp tục với Google
            </Button>
          </div>

          <p className="text-center text-sm text-gray-500 mt-6">
            Đã có tài khoản?{" "}
            <Link href="/login" className="text-brand-600 font-semibold hover:text-brand-700">Đăng nhập</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
