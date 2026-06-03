"use client";
import Link from "next/link";
import { cn } from "@/utils/cn";
import { ArrowLeft } from "lucide-react";

type Variant = "pill" | "button" | "inline";

interface BackButtonProps {
  href: string;
  label: string;
  variant?: Variant;
  className?: string;
}

export default function BackButton({ href, label, variant = "pill", className }: BackButtonProps) {
  if (variant === "inline") {
    return (
      <Link
        href={href}
        className={cn(
          "inline-flex items-center gap-1.5 text-sm font-medium text-gray-500",
          "hover:text-brand-600 transition-all duration-150",
          className
        )}
      >
        <ArrowLeft className="w-4 h-4" />
        <span>{label}</span>
      </Link>
    );
  }

  if (variant === "button") {
    return (
      <Link href={href} className={cn("inline-block", className)}>
        <button
          type="button"
          className={cn(
            "group inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full",
            "border border-gray-200 bg-white",
            "text-xs font-semibold text-gray-600",
            "shadow-sm",
            "hover:border-brand-300 hover:bg-brand-50/70",
            "hover:text-brand-700 hover:shadow-md",
            "transition-all duration-200 cursor-pointer",
          )}
        >
          <ArrowLeft className="w-3.5 h-3.5 text-gray-400 group-hover:text-brand-600 group-hover:-translate-x-0.5 transition-all duration-200" />
          <span>{label}</span>
        </button>
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className={cn(
        "group inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full",
        "border border-gray-200 bg-white",
        "text-xs font-semibold text-gray-600",
        "shadow-sm",
        "hover:border-brand-300 hover:bg-brand-50/70",
        "hover:text-brand-700 hover:shadow-md",
        "transition-all duration-200",
        className
      )}
    >
      <ArrowLeft className="w-3.5 h-3.5 text-gray-400 group-hover:text-brand-600 group-hover:-translate-x-0.5 transition-all duration-200" />
      <span>{label}</span>
    </Link>
  );
}
