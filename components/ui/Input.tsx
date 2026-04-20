import { cn } from "@/utils/cn";
import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
}

export default function Input({ label, error, hint, icon, iconRight, className, id, ...props }: InputProps) {
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
            "w-full border-2 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400",
            "bg-white focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100",
            "hover:border-gray-300 transition-colors duration-150",
            error ? "border-red-400 focus:border-red-400 focus:ring-red-400/20" : "border-gray-200",
            icon && "pl-10",
            iconRight && "pr-10",
            className,
          )}
          {...props}
        />
        {iconRight && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">{iconRight}</div>
        )}
      </div>
      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
      {hint && !error && <p className="mt-1.5 text-xs text-gray-500">{hint}</p>}
    </div>
  );
}
