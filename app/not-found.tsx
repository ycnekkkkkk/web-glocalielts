import Link from "next/link";
import Button from "@/components/ui/Button";
import Logo from "@/components/ui/Logo";
import { Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="text-center max-w-md">
        <div className="mb-8">
          <Logo className="justify-center" />
        </div>
        <h1 className="text-8xl font-black text-brand-100 mb-4">404</h1>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Trang không tồn tại</h2>
        <p className="text-gray-500 text-sm mb-8">Trang bạn đang tìm kiếm đã bị di chuyển hoặc không tồn tại.</p>
        <Link href="/">
          <Button icon={<Home className="w-4 h-4" />}>Về trang chủ</Button>
        </Link>
      </div>
    </div>
  );
}
