"use client";
import { Clock, X } from "lucide-react";
import { DayColumn } from "@/lib/scheduleUtils";

interface ScheduleItemProps {
  day: DayColumn;
  label: string;
  startTime: string;
  endTime: string;
  onUpdate: (field: "startTime" | "endTime", value: string) => void;
  onRemove: () => void;
}

export default function ScheduleItem({
  day,
  label,
  startTime,
  endTime,
  onUpdate,
  onRemove,
}: ScheduleItemProps) {
  return (
    <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-gray-100 shadow-sm animate-in fade-in slide-in-from-left-2 duration-300">
      <div className="w-12 h-10 bg-brand-50 rounded-lg flex items-center justify-center shrink-0">
        <span className="text-xs font-bold text-brand-700">{label}</span>
      </div>
      
      <div className="flex-1 grid grid-cols-2 gap-3">
        <div className="relative">
          <Clock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          <input
            type="time"
            value={startTime}
            onChange={(e) => onUpdate("startTime", e.target.value)}
            className="w-full pl-8 pr-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-100 transition-all"
          />
        </div>
        <div className="relative">
          <Clock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          <input
            type="time"
            value={endTime}
            onChange={(e) => onUpdate("endTime", e.target.value)}
            className="w-full pl-8 pr-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-100 transition-all"
          />
        </div>
      </div>

      <button
        type="button"
        onClick={onRemove}
        className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
        title="Bỏ ngày này"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
