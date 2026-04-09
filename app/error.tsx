"use client";
import Button from "@/components/ui/Button";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { useEffect } from "react";

export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-8 h-8 text-red-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Đã xảy ra lỗi</h2>
        <p className="text-gray-500 text-sm mb-6">{error.message || "Có lỗi không mong muốn xảy ra. Vui lòng thử lại."}</p>
        <Button onClick={reset} icon={<RefreshCw className="w-4 h-4" />}>Thử lại</Button>
      </div>
    </div>
  );
}
