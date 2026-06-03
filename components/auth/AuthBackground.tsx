"use client";
import { useEffect, useRef, useState } from "react";

interface FloatingSymbol {
  symbol: string;
  x: number;
  y: number;
  size: number;
  opacity: number;
  speed: number;
  angle: number;
  rotationSpeed: number;
  type: "symbol" | "shape";
  shapeType?: "circle" | "triangle" | "diamond";
  pulsePhase: number;
  pulseSpeed: number;
}

const SYMBOLS = [
  "∑", "∫", "∂", "∏", "√", "∞", "π", "θ", "Δ", "Ω",
  "λ", "μ", "σ", "φ", "ψ", "α", "β", "γ", "ε", "ζ",
  "÷", "×", "±", "≈", "≠", "≤", "≥", "⊂", "⊃", "∈",
  "∪", "∩", "∅", "∇", "⊕", "⊗", "⟨", "⟩", "‖", "⌈",
  "f(x)", "e^x", "ln", "log", "sin", "cos", "tan", "lim",
];

const COLORS = [
  "rgba(255, 255, 255, 0.08)",   // white
  "rgba(200, 240, 255, 0.08)",   // light blue
  "rgba(180, 220, 255, 0.06)",   // sky
  "rgba(220, 240, 255, 0.07)",   // pale blue
  "rgba(255, 255, 255, 0.05)",   // white dim
  "rgba(210, 235, 255, 0.06)",   // ice blue
];

const SHAPES: ("circle" | "triangle" | "diamond")[] = ["circle", "triangle", "diamond"];

function generateSymbol(index: number, total: number, viewportW: number, viewportH: number): FloatingSymbol {
  const isSymbol = Math.random() > 0.25;
  return {
    symbol: isSymbol ? SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)] : "",
    x: Math.random() * viewportW,
    y: Math.random() * viewportH,
    size: isSymbol
      ? 14 + Math.random() * 22
      : 8 + Math.random() * 16,
    opacity: 0.06 + Math.random() * 0.14,
    speed: 0.15 + Math.random() * 0.35,
    angle: Math.random() * 360,
    rotationSpeed: (Math.random() - 0.5) * 0.4,
    type: isSymbol ? "symbol" : "shape",
    shapeType: SHAPES[Math.floor(Math.random() * SHAPES.length)],
    pulsePhase: Math.random() * Math.PI * 2,
    pulseSpeed: 0.008 + Math.random() * 0.015,
  };
}

export default function AuthBackground({ symbolCount = 28 }: { symbolCount?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const symbolsRef = useRef<FloatingSymbol[]>([]);
  const animFrameRef = useRef<number>(0);
  const timeRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    symbolsRef.current = Array.from({ length: symbolCount }, (_, i) =>
      generateSymbol(i, symbolCount, width, height)
    );

    function draw() {
      ctx.clearRect(0, 0, width, height);
      timeRef.current += 1;

      symbolsRef.current.forEach((sym, i) => {
        sym.y -= sym.speed;
        sym.angle += sym.rotationSpeed;
        sym.pulsePhase += sym.pulseSpeed;

        if (sym.y < -80) {
          sym.y = height + 80;
          sym.x = Math.random() * width;
        }

        const pulse = 0.8 + 0.2 * Math.sin(sym.pulsePhase);
        const alpha = sym.opacity * pulse;

        ctx.save();
        ctx.translate(sym.x, sym.y);
        ctx.rotate((sym.angle * Math.PI) / 180);

        if (sym.type === "symbol") {
          ctx.font = `${sym.size}px "Times New Roman", serif`;
          ctx.fillStyle = COLORS[i % COLORS.length].replace(/[\d.]+\)$/, `${alpha})`);
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(sym.symbol, 0, 0);
        } else {
          ctx.strokeStyle = COLORS[i % COLORS.length].replace(/[\d.]+\)$/, `${alpha})`);
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          const s = sym.size;
          if (sym.shapeType === "circle") {
            ctx.arc(0, 0, s / 2, 0, Math.PI * 2);
          } else if (sym.shapeType === "triangle") {
            ctx.moveTo(0, -s / 2);
            ctx.lineTo(s / 2, s / 2);
            ctx.lineTo(-s / 2, s / 2);
            ctx.closePath();
          } else {
            ctx.moveTo(0, -s / 2);
            ctx.lineTo(s / 2, 0);
            ctx.lineTo(0, s / 2);
            ctx.lineTo(-s / 2, 0);
            ctx.closePath();
          }
          ctx.stroke();
        }

        ctx.restore();
      });

      animFrameRef.current = requestAnimationFrame(draw);
    }

    draw();

    function onResize() {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    }

    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener("resize", onResize);
    };
  }, [symbolCount]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
}
