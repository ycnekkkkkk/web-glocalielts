import { cn } from "@/utils/cn";
import { Headphones, Mic, PenLine, ScrollText } from "lucide-react";

type Skill = "listening" | "reading" | "speaking" | "writing";

const SKILL_CONFIG: Record<Skill, {
  label: string;
  icon: React.ElementType;
  gradient: string;
  text: string;
  border: string;
}> = {
  listening: {
    label: "Listening",
    icon: Headphones,
    gradient: "from-blue-500 to-indigo-600",
    text: "text-blue-700",
    border: "border-blue-200",
  },
  reading: {
    label: "Reading",
    icon: ScrollText,
    gradient: "from-emerald-500 to-teal-600",
    text: "text-emerald-700",
    border: "border-emerald-200",
  },
  speaking: {
    label: "Speaking",
    icon: Mic,
    gradient: "from-violet-500 to-purple-600",
    text: "text-violet-700",
    border: "border-violet-200",
  },
  writing: {
    label: "Writing",
    icon: PenLine,
    gradient: "from-amber-500 to-orange-600",
    text: "text-amber-700",
    border: "border-amber-200",
  },
};

interface SkillBadgeProps {
  skill: Skill;
  variant?: "pill" | "card" | "icon";
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function SkillBadge({ skill, variant = "pill", size = "md", className }: SkillBadgeProps) {
  const config = SKILL_CONFIG[skill];
  const Icon = config.icon;

  if (variant === "icon") {
    const iconSize = size === "sm" ? "w-4 h-4" : size === "lg" ? "w-6 h-6" : "w-5 h-5";
    const wrapSize = size === "sm" ? "w-8 h-8" : size === "lg" ? "w-12 h-12" : "w-10 h-10";
    return (
      <div className={cn(`rounded-xl bg-gradient-to-br ${config.gradient} flex items-center justify-center shadow-sm`, wrapSize, className)}>
        <Icon className={cn("text-white", iconSize)} />
      </div>
    );
  }

  if (variant === "card") {
    return (
      <div className={cn("flex flex-col items-center gap-2 p-4 rounded-2xl border bg-white shadow-sm", config.border, className)}>
        <div className={`rounded-xl bg-gradient-to-br ${config.gradient} p-3`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <span className={cn("font-semibold text-sm", config.text)}>{config.label}</span>
      </div>
    );
  }

  // pill variant
  const pillSize = size === "sm" ? "px-2.5 py-1 text-xs" : size === "lg" ? "px-4 py-1.5 text-sm" : "px-3 py-1 text-xs";
  const iconSize = size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-semibold",
        `bg-gradient-to-r ${config.gradient} text-white`,
        pillSize,
        className
      )}
    >
      <Icon className={iconSize} />
      {config.label}
    </span>
  );
}

export { SKILL_CONFIG };
export type { Skill };
