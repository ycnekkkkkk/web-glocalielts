"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function OrganizationLoginPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/academic-manager");
  }, [router]);
  return null;
}
