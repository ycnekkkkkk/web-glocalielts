import { getBandColorClass } from "@/lib/mock-skill/band-mapping";
import { cn } from "@/utils/cn";

interface BandScoreRingProps {
  band: number;
  size?: "sm" | "md" | "lg" | "xl";
  label?: string;
  className?: string;
  animate?: boolean;
}

const sizeMap = {
  sm: { ring: 64, stroke: 6, fontSize: "text-lg", labelSize: "text-xs" },
  md: { ring: 96, stroke: 8, fontSize: "text-2xl", labelSize: "text-xs" },
  lg: { ring: 128, stroke: 10, fontSize: "text-3xl", labelSize: "text-sm" },
  xl: { ring: 160, stroke: 12, fontSize: "text-5xl", labelSize: "text-base" },
};

export function BandScoreRing({
  band,
  size = "md",
  label,
  className,
}: BandScoreRingProps) {
  const { ring, stroke, fontSize, labelSize } = sizeMap[size];
  const radius = (ring - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = band > 0 ? (band / 9) * circumference : 0;
  const colors = getBandColorClass(band);

  // Stroke color based on band
  const strokeColor =
    band >= 8 ? "#10b981" :
    band >= 7 ? "#22c55e" :
    band >= 6 ? "#3b82f6" :
    band >= 5 ? "#f59e0b" :
    band >= 4 ? "#f97316" :
    "#ef4444";

  return (
    <div
      className={cn("relative inline-flex flex-col items-center gap-1", className)}
      role="img"
      aria-label={`IELTS band ${band}${label ? ` for ${label}` : ""}`}
    >
      <div className="relative" style={{ width: ring, height: ring }}>
        <svg
          width={ring}
          height={ring}
          viewBox={`0 0 ${ring} ${ring}`}
          className="-rotate-90"
        >
          {/* Background track */}
          <circle
            cx={ring / 2}
            cy={ring / 2}
            r={radius}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth={stroke}
          />
          {/* Progress arc */}
          <circle
            cx={ring / 2}
            cy={ring / 2}
            r={radius}
            fill="none"
            stroke={strokeColor}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference - progress}
            style={{
              transition: "stroke-dashoffset 1.2s cubic-bezier(0.34, 1.56, 0.64, 1)",
            }}
          />
        </svg>
        {/* Band number in center */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn("font-black leading-none", fontSize, colors.text)}>
            {band > 0 ? band.toFixed(1).replace(".0", "") : "—"}
          </span>
        </div>
      </div>
      {label && (
        <span className={cn("font-semibold text-gray-600 text-center", labelSize)}>
          {label}
        </span>
      )}
    </div>
  );
}
