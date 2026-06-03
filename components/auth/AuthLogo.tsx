"use client";
import Link from "next/link";

export default function AuthLogo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const s = size === "sm" ? 32 : size === "lg" ? 56 : 44;
  return (
    <Link href="/" className="inline-flex items-center gap-2.5 group" aria-label="Glocal IELTS">
      <img src="/logo/logo-ag.svg" alt="AG" className="object-contain" style={{ width: s, height: s }} />
      <img src="/logo/logo-gi.svg" alt="Glocal IELTS" className="object-contain" style={{ width: s, height: s }} />
      <div className="hidden sm:block">
        <p className="text-[14px] font-bold text-slate-800 leading-none tracking-tight group-hover:text-sky-600 transition-colors">Glocal IELTS</p>
        <p className="text-[10px] font-medium text-slate-400 leading-none mt-0.5 tracking-wider">Amazing Group</p>
      </div>
    </Link>
  );
}
