import { cn } from "@/utils/cn";
import Image from "next/image";

type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";

interface AvatarProps {
  src?: string | null;
  name?: string;
  size?: AvatarSize;
  className?: string;
  color?: string;
}

const sizeClasses: Record<AvatarSize, string> = {
  xs: "w-6 h-6 text-[10px]",
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-12 h-12 text-base",
  xl: "w-16 h-16 text-lg",
};

const gradients = [
  "from-brand-600 to-indigo-700",
  "from-indigo-600 to-violet-700",
  "from-emerald-600 to-teal-700",
  "from-slate-700 to-slate-900",
  "from-amber-600 to-orange-700",
  "from-rose-600 to-pink-700",
];


function getGradient(name: string): string {
  let sum = 0;
  for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
  return gradients[sum % gradients.length];
}

function getInitials(name: string): string {
  const parts = name.split(" ");
  return parts.slice(-2).map(p => p[0]?.toUpperCase() || "").join("");
}

export default function Avatar({ src, name = "", size = "md", className }: AvatarProps) {
  const sizeClass = sizeClasses[size];
  const gradient = getGradient(name);
  const initials = getInitials(name);

  if (src) {
    return (
      <div className={cn("relative rounded-full overflow-hidden shrink-0", sizeClass, className)}>
        <Image src={src} alt={name} fill className="object-cover" />
      </div>
    );
  }

  return (
    <div className={cn("rounded-full flex items-center justify-center font-bold text-white shrink-0 bg-gradient-to-br", gradient, sizeClass, className)}>
      {initials || "?"}
    </div>
  );
}
