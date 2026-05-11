"use client";
import { useEffect, useRef } from "react";
import { cn } from "@/utils/cn";

interface WaveformBarsProps {
  isActive?: boolean;
  barCount?: number;
  className?: string;
  color?: string;
  /** If provided, uses live audio analysis */
  analyserNode?: AnalyserNode | null;
}

export function WaveformBars({
  isActive = false,
  barCount = 32,
  className,
  color = "#6366f1",
  analyserNode,
}: WaveformBarsProps) {
  const barsRef = useRef<HTMLDivElement[]>([]);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isActive) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      // Reset bars to baseline
      barsRef.current.forEach((bar) => {
        if (bar) bar.style.height = "4px";
      });
      return;
    }

    if (analyserNode) {
      const bufferLength = analyserNode.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      function draw() {
        analyserNode!.getByteFrequencyData(dataArray);
        const step = Math.floor(bufferLength / barCount);
        barsRef.current.forEach((bar, i) => {
          if (!bar) return;
          const value = dataArray[i * step] || 0;
          const height = Math.max(4, (value / 255) * 60);
          bar.style.height = `${height}px`;
        });
        rafRef.current = requestAnimationFrame(draw);
      }
      draw();
    } else {
      // Decorative animation
      function animate() {
        barsRef.current.forEach((bar, i) => {
          if (!bar) return;
          const t = Date.now() / 1000;
          const wave = Math.sin(t * 3 + i * 0.4) * 0.5 + 0.5;
          const wave2 = Math.sin(t * 2.3 + i * 0.6) * 0.3 + 0.7;
          const height = Math.max(4, Math.min(60, (wave * wave2 * 48) + 8));
          bar.style.height = `${height}px`;
        });
        rafRef.current = requestAnimationFrame(animate);
      }
      animate();
    }

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isActive, analyserNode, barCount]);

  return (
    <div
      className={cn("flex items-end gap-0.5", className)}
      style={{ height: 64 }}
      aria-hidden="true"
    >
      {Array.from({ length: barCount }).map((_, i) => (
        <div
          key={i}
          ref={(el) => { barsRef.current[i] = el!; }}
          className="rounded-full flex-1"
          style={{
            backgroundColor: color,
            height: 4,
            opacity: isActive ? 0.8 + (i % 3) * 0.07 : 0.3,
            transition: "opacity 0.3s",
            minWidth: 2,
          }}
        />
      ))}
    </div>
  );
}
