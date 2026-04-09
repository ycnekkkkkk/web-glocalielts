"use client";
import ChangePasswordCard from "@/components/account/ChangePasswordCard";
import PageWrapper from "@/components/layouts/PageWrapper";

export default function AcademicManagerAccountPage() {
  return (
    <PageWrapper>
      <div className="page-header">
        <h1 className="page-title">Tài khoản</h1>
        <p className="page-subtitle">Đổi mật khẩu đăng nhập</p>
      </div>
      <ChangePasswordCard />
    </PageWrapper>
  );
}
