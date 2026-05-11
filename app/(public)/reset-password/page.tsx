"use client";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Logo from "@/components/ui/Logo";
import { createBrowserClient } from "@/lib/supabase/client";
import { Eye, EyeOff, Lock, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);

  useEffect(() => {
    const supabase = createBrowserClient();
    
    async function checkSession() {
      // Check if we have a session (the recovery link should have signed us in)
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        toast.error("Liên kết hết hạn hoặc không hợp lệ. Vui lòng yêu cầu lại.");
        router.replace("/forgot-password");
      } else {
        setIsVerifying(false);
      }
    }
    
    void checkSession();
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("Mật khẩu xác nhận không khớp");
      return;
    }
    if (password.length < 6) {
      toast.error("Mật khẩu phải có ít nhất 6 ký tự");
      return;
    }

    setLoading(true);
    try {
      const supabase = createBrowserClient();
      const { error } = await supabase.auth.updateUser({
        password: password,
      });
      if (error) throw error;
      
      setSuccess(true);
      toast.success("Đổi mật khẩu thành công!");
      
      // Sign out to force fresh login
      await supabase.auth.signOut();
      
      setTimeout(() => {
        router.push("/login");
      }, 3000);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Đổi mật khẩu thất bại");
    } finally {
      setLoading(false);
    }
  }

  if (isVerifying) {
    return (
      <div className="min-h-screen bg-linear-to-br from-brand-950 via-brand-900 to-brand-800 flex items-center justify-center p-4">
        <div className="text-white text-center">
          <div className="w-12 h-12 border-4 border-brand-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p>Đang xác thực liên kết...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-brand-950 via-brand-900 to-brand-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex justify-center mb-4">
            <Logo light size="lg" href="/" />
          </div>
          <p className="text-brand-300 text-sm">Thiết lập mật khẩu mới cho tài khoản</p>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl p-8">
          <h1 className="text-xl font-bold text-gray-900 mb-6">Đặt lại mật khẩu</h1>
          
          {success ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <p className="text-gray-600 mb-6">
                Mật khẩu của bạn đã được cập nhật thành công. Đang chuyển hướng bạn quay lại trang đăng nhập...
              </p>
              <Link href="/login">
                <Button variant="primary" className="w-full">
                  Đăng nhập ngay
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Mật khẩu mới"
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
              <Input
                label="Xác nhận mật khẩu"
                type={showPw ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                icon={<Lock className="w-4 h-4" />}
                required
              />
              <div className="pt-2">
                <Button type="submit" loading={loading} className="w-full" size="lg">
                  Cập nhật mật khẩu
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
