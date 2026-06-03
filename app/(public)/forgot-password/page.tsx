"use client";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Logo from "@/components/ui/Logo";
import { createBrowserClient } from "@/lib/supabase/client";
import BackButton from "@/components/ui/BackButton";
import { useState } from "react";
import toast from "react-hot-toast";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const supabase = createBrowserClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSubmitted(true);
      toast.success("Đã gửi email khôi phục mật khẩu!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gửi email thất bại");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-brand-950 via-brand-900 to-brand-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-6">
            <BackButton href="/login" label="Quay lại đăng nhập" variant="inline" className="text-brand-200/90 hover:text-white" />
        </div>
        <div className="text-center mb-8">
          <div className="inline-flex justify-center mb-4">
            <Logo light size="lg" href="/" />
          </div>
          <p className="text-brand-300 text-sm">Khôi phục mật khẩu tài khoản của bạn</p>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl p-8">
          <h1 className="text-xl font-bold text-gray-900 mb-6">Quên mật khẩu?</h1>
          
          {submitted ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8" />
              </div>
              <p className="text-gray-600 mb-6">
                Chúng tôi đã gửi một liên kết đặt lại mật khẩu đến <strong>{email}</strong>. Vui lòng kiểm tra hộp thư đến (và cả thư mục Spam) của bạn.
              </p>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => setSubmitted(false)}
              >
                Gửi lại email khác
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <Input
                label="Email của bạn"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                icon={<Mail className="w-4 h-4" />}
                required
                hint="Nhập địa chỉ email bạn đã sử dụng để đăng ký"
              />
              <Button type="submit" loading={loading} className="w-full" size="lg">
                Gửi link đặt lại mật khẩu
              </Button>
            </form>
          )}

          <p className="text-center text-sm text-gray-500 mt-8">
            Bạn nhớ mật khẩu rồi?{" "}
            <Link href="/login" className="text-brand-600 font-semibold hover:text-brand-700">Đăng nhập ngay</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
