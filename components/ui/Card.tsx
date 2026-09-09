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
        "bg-white rounded-2xl border border-slate-200/80 shadow-xs",
        hover && "hover:shadow-md hover:border-brand-200 hover:-translate-y-0.5 transition-all duration-200",
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
    <Card className="p-4 sm:p-5">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-1.5 truncate">{title}</p>
          <p className="text-xl sm:text-2xl font-black text-slate-900 leading-none">{value}</p>
          {trendLabel && (
            <div className="flex items-center gap-1.5 mt-2">
              {trend !== 0 && (
                trend > 0
                  ? <TrendingUp className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  : <TrendingDown className="w-3.5 h-3.5 text-rose-500 shrink-0" />
              )}
              {trend !== 0 && (
                <span className={cn("text-xs font-bold", trend > 0 ? "text-emerald-600" : "text-rose-600")}>
                  {trend > 0 ? "+" : ""}{trend}%
                </span>
              )}
              <span className="text-[11px] text-slate-500 font-medium">{trendLabel}</span>
              {suffix && <span className="text-[11px] text-slate-400">{suffix}</span>}
            </div>
          )}
        </div>
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border", iconBg)}>
          <Icon className={cn("w-5 h-5", iconColor)} />
        </div>
      </div>
    </Card>
  );
}
