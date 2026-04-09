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
  "from-brand-400 to-brand-600",
  "from-emerald-400 to-teal-600",
  "from-sky-400 to-blue-600",
  "from-purple-400 to-violet-600",
  "from-amber-400 to-orange-600",
  "from-rose-400 to-pink-600",
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
