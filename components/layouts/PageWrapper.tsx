import { cn } from "@/utils/cn";

interface PageWrapperProps {
  children: React.ReactNode;
  className?: string;
}

export default function PageWrapper({ children, className }: PageWrapperProps) {
  return (
    <main className={cn("content-area", className)}>
      <div className="page-container animate-[var(--animate-fade-in)]">
        {children}
      </div>
    </main>
  );
}
