"use client";
import ChangePasswordCard from "@/components/account/ChangePasswordCard";
import PageWrapper from "@/components/layouts/PageWrapper";

export default function StudentAccountPage() {
  return (
    <PageWrapper>
      <div className="page-header">
        <h1 className="page-title">Tài khoản</h1>
        <p className="page-subtitle">Quản lý bảo mật tài khoản của bạn</p>
      </div>
      <ChangePasswordCard />
    </PageWrapper>
  );
}
