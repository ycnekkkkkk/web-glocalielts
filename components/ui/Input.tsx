import { cn } from "@/utils/cn";
import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
}

export default function Input({ label, error, icon, iconRight, className, id, ...props }: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">{icon}</div>
        )}
        <input
          id={inputId}
          className={cn(
            "w-full border rounded-xl px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400",
            "bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500",
            "transition-all duration-150",
            error ? "border-red-400 focus:border-red-400 focus:ring-red-400/20" : "border-gray-200 hover:border-gray-300",
            icon && "pl-10",
            iconRight && "pr-10",
            className
          )}
          {...props}
        />
        {iconRight && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">{iconRight}</div>
        )}
      </div>
      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
    </div>
  );
}
