import { cn } from "@/utils/cn";
import { TrendingDown, TrendingUp } from "lucide-react";
import React from "react";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
}

export function Card({ className, hover, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "bg-white rounded-2xl border border-gray-100 shadow-[var(--shadow-card)]",
        hover && "hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5 transition-all duration-200",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  iconBg: string;
  trend?: number;
  trendLabel?: string;
  suffix?: string;
}

export function StatsCard({ title, value, icon: Icon, iconColor, iconBg, trend = 0, trendLabel, suffix }: StatsCardProps) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-500 font-medium mb-2 truncate">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {trendLabel && (
            <div className="flex items-center gap-1 mt-1.5">
              {trend !== 0 && (
                trend > 0
                  ? <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                  : <TrendingDown className="w-3.5 h-3.5 text-red-500" />
              )}
              {trend !== 0 && (
                <span className={cn("text-xs font-semibold", trend > 0 ? "text-emerald-600" : "text-red-600")}>
                  {trend > 0 ? "+" : ""}{trend}%
                </span>
              )}
              <span className="text-xs text-gray-400">{trendLabel}</span>
              {suffix && <span className="text-xs text-gray-400">{suffix}</span>}
            </div>
          )}
        </div>
        <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center shrink-0", iconBg)}>
          <Icon className={cn("w-5 h-5", iconColor)} />
        </div>
      </div>
    </Card>
  );
}
