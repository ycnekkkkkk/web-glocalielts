"use client";
import { X, ChevronDown, ChevronUp } from "lucide-react";

interface StudentTagProps {
  fullName: string;
  studentCode?: string | null;
  isExpanded: boolean;
  onToggle: () => void;
  onRemove: () => void;
}

export default function StudentTag({
  fullName,
  studentCode,
  isExpanded,
  onToggle,
  onRemove,
}: StudentTagProps) {
  const initials = fullName
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const hue = (fullName.charCodeAt(0) * 37 + fullName.charCodeAt(1) * 13) % 360;

  return (
    <div className="inline-flex flex-col gap-1">
      <div className={`inline-flex items-center gap-2 px-2 py-1.5 rounded-xl border-2 transition-all ${
        isExpanded 
          ? "bg-brand-50 border-brand-200 shadow-sm" 
          : "bg-white border-gray-100 hover:border-gray-200"
      }`}>
        <div
          className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-[10px] font-black text-white shadow-sm"
          style={{ background: `hsl(${hue}, 55%, 50%)` }}
        >
          {initials}
        </div>
        <div className="flex items-center gap-1.5 cursor-pointer select-none" onClick={onToggle}>
          <span className="text-xs font-bold text-gray-800">{fullName}</span>
          {studentCode && (
            <span className="text-[10px] font-bold text-gray-400">({studentCode})</span>
          )}
          {isExpanded ? (
            <ChevronUp className="w-3.5 h-3.5 text-brand-500" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
          )}
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
