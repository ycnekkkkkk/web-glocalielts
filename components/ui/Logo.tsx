import { cn } from "@/utils/cn";
import Link from "next/link";
import type { MouseEventHandler } from "react";

/** AG (nhỏ hơn) trước, GI (lớn hơn) sau — đồng bộ mọi chỗ dùng BrandMarks */
const SIZE_PAIR = {
  sm: { ag: "h-6 w-6", gi: "h-[30px] w-[30px]" },
  md: { ag: "h-[34px] w-[34px]", gi: "h-[38px] w-[38px]" },
  lg: { ag: "h-10 w-10", gi: "h-[46px] w-[46px]" },
} as const;

export function BrandMarks({
  light = false,
  size = "md",
  className,
}: {
  light?: boolean;
  size?: keyof typeof SIZE_PAIR;
  className?: string;
}) {
  const { ag, gi } = SIZE_PAIR[size];
  const base = cn("shrink-0 object-contain", light && "drop-shadow-sm");
  return (
    <div
      className={cn("flex items-center gap-1.5 sm:gap-2", className)}
      role="img"
      aria-label="Amazing Group và Glocal IELTS"
    >
      <img src="/logo/logo-ag.svg" alt="" className={cn(ag, base)} width={48} height={48} />
      <img src="/logo/logo-gi.svg" alt="" className={cn(gi, base)} width={64} height={64} />
    </div>
  );
}

interface LogoProps {
  light?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
  /** Khi có, logo (và chữ) bọc trong Link — dùng cho header public / trang auth */
  href?: string;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
}

export default function Logo({ light = false, size = "md", className, href, onClick }: LogoProps) {
  const textColor = light ? "text-white" : "text-gray-900";
  const subColor = light ? "text-brand-300" : "text-brand-600";
  const textSize = size === "sm" ? "text-base" : size === "lg" ? "text-xl" : "text-lg";

  const wordmark = (
    <div className="min-w-0">
      <p className={cn("font-bold leading-none truncate", textColor, textSize)}>Glocal IELTS</p>
      <p className={cn("text-[10px] font-medium leading-none mt-0.5 truncate", subColor)}>Amazing Group</p>
    </div>
  );

  const inner = (
    <>
      <BrandMarks light={light} size={size} />
      {wordmark}
    </>
  );

  const wrap = cn("flex items-center gap-2.5 min-w-0", className);

  if (href) {
    return (
      <Link
        href={href}
        onClick={onClick}
        className={cn(wrap, "rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/80")}
      >
        {inner}
      </Link>
    );
  }

  return <div className={wrap}>{inner}</div>;
}
