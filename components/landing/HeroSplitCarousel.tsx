"use client";

import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState, useEffect, useCallback } from "react";

// ─── Slide data ───────────────────────────────────────────────────────────
const SLIDES = [
  {
    badge: "Đăng ký thi IDP & BC nhanh chóng",
    headline: [
      { normal: "Hỗ trợ đăng ký thi ", bold: "IELTS chính thức " },
      { normal: "nhận ưu đãi độc quyền", bold: null },
    ],
    headlineGradient: ["6C63FF", "8B7FFF", "A78BFA"],
    sub: "Giữ chỗ thi IELTS (IDP & BC) nhanh chóng với thủ tục đơn giản. Nhận ngay bộ tài liệu dự đoán đề độc quyền và voucher giảm lệ phí thi.",
    ctaPrimary: "Đăng ký giữ chỗ ngay",
    ctaSecondary: "Xem lịch thi mới nhất",
    ctaPrimaryHref: "/dang-ky-thi",
    ctaSecondaryHref: "/lich-thi",
    heroImage: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1200&q=80",
    stats: [
      { value: "0đ", label: "Phí dịch vụ" },
      { value: "100%", label: "Bảo mật thông tin" },
      { value: "Top 1", label: "Đối tác IDP & BC" },
    ],
  },
  {
    badge: "Lộ trình cá nhân hóa",
    headline: [
      { normal: "Khóa học ", bold: "IELTS cam kết đầu ra " },
      { normal: "bằng văn bản", bold: null },
    ],
    headlineGradient: ["F59E0B", "FBBF24", "FDE68A"],
    sub: "Lộ trình tinh gọn từ mất gốc đến 7.5+ thiết kế riêng theo năng lực. Học và tương tác trực tiếp cùng đội ngũ giảng viên 8.5+ IELTS giàu kinh nghiệm.",
    ctaPrimary: "Khám phá khóa học",
    ctaSecondary: "Nhận test năng lực miễn phí",
    ctaPrimaryHref: "/courses",
    ctaSecondaryHref: "/tu-van",
    heroImage: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80",
    stats: [
      { value: "8.5", label: "Điểm trung bình GV" },
      { value: "1-on-1", label: "Sửa bài viết & nói" },
      { value: "98%", label: "Học viên đạt mục tiêu" },
    ],
  },
  {
    badge: "Công nghệ luyện thi đột phá",
    headline: [
      { normal: "Luyện thi ", bold: "IELTS thông minh " },
      { normal: "với AI chấm chữa chi tiết", bold: null },
    ],
    headlineGradient: ["10B981", "34D399", "6EE7B7"],
    sub: "Trải nghiệm hệ thống bài Mock Test sát thực tế. Thuật toán thông minh phân tích chính xác điểm yếu giúp bạn tối ưu thời gian ôn luyện.",
    ctaPrimary: "Thi thử miễn phí ngay",
    ctaSecondary: "Khám phá công nghệ",
    ctaPrimaryHref: "/thi-thu",
    ctaSecondaryHref: "/cong-nghe",
    heroImage: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=1200&q=80",
    stats: [
      { value: "200+", label: "Đề thi thực tế" },
      { value: "30+", label: "Đề thi mô phỏng" },
      { value: "24/7", label: "AI hỗ trợ giải đáp" },
    ],
  },
];


// ─── Helper ────────────────────────────────────────────────────────────────
function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return "108,99,255";
  return `${parseInt(result[1], 16)},${parseInt(result[2], 16)},${parseInt(result[3], 16)}`;
}

// ─── Component ──────────────────────────────────────────────────────────────
export default function HeroSplitCarousel() {
  const [current, setCurrent] = useState(0);
  const [animKey, setAnimKey] = useState(0);

  const next = useCallback(() => {
    setCurrent((c) => (c + 1) % SLIDES.length);
    setAnimKey((k) => k + 1);
  }, []);

  const prev = useCallback(() => {
    setCurrent((c) => (c - 1 + SLIDES.length) % SLIDES.length);
    setAnimKey((k) => k + 1);
  }, []);

  useEffect(() => {
    const id = setInterval(next, 5000);
    return () => clearInterval(id);
  }, [next]);

  const slide = SLIDES[current];
  const rgb = hexToRgb(slide.headlineGradient[0]);
  const rgb2 = hexToRgb(slide.headlineGradient[1]);

  const gradientText = {
    background: `linear-gradient(135deg, #${slide.headlineGradient[0]} 0%, #${slide.headlineGradient[1]} 60%, #${slide.headlineGradient[2]} 100%)`,
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
    display: "inline",
  };

  const ctaGradient = {
    background: `linear-gradient(135deg, #${slide.headlineGradient[0]} 0%, #${slide.headlineGradient[1]} 100%)`,
    boxShadow: `0 4px 24px rgba(${rgb},0.30), 0 2px 8px rgba(${rgb},0.15)`,
  };

  const badgeStyle = {
    background: `rgba(${rgb}, 0.10)`,
    color: `#${slide.headlineGradient[0]}`,
    border: `1px solid rgba(${rgb}, 0.20)`,
  };

  // Animation styles — individual properties (no shorthand to avoid React conflict with animationDelay)
  const makeSlideLeft = (delay = 0) => ({
    animationName: "slideInLeft",
    animationDuration: "0.55s",
    animationTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
    animationFillMode: "both",
    animationDelay: `${delay}s`,
  });
  const makeSlideRight = (delay = 0) => ({
    animationName: "slideInRight",
    animationDuration: "0.55s",
    animationTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
    animationFillMode: "both",
    animationDelay: `${delay}s`,
  });
  const makeFadeUp = (delay = 0) => ({
    animationName: "fadeUp",
    animationDuration: "0.55s",
    animationTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
    animationFillMode: "both",
    animationDelay: `${delay}s`,
  });

  const carouselBtnStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 36,
    height: 36,
    borderRadius: "50%",
    background: "rgba(255,255,255,0.92)",
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
    border: "1px solid rgba(255,255,255,0.8)",
    boxShadow: "0 2px 12px rgba(0,0,0,0.10)",
    cursor: "pointer",
    transition: "all 0.2s ease",
    color: "#374151",
  };

  return (
    <section className="relative overflow-hidden">
      <style>{`
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-40px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(40px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Decorative glow blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute -top-24 -right-24 w-[700px] h-[700px] rounded-full blur-[120px]"
          style={{ background: `radial-gradient(circle, rgba(${rgb},0.18) 0%, rgba(${rgb2},0.08) 40%, transparent 70%)` }}
        />
        <div
          className="absolute -top-8 -left-40 w-[500px] h-[500px] rounded-full blur-[100px]"
          style={{ background: "radial-gradient(circle, rgba(233,222,255,0.6) 0%, rgba(243,240,255,0.3) 40%, transparent 70%)" }}
        />
        <div
          className="absolute top-[60%] left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full blur-[120px]"
          style={{ background: `radial-gradient(circle, rgba(${rgb},0.10) 0%, transparent 70%)` }}
        />
        <div
          className="absolute top-[8%] left-[12%] w-2 h-2 rounded-full"
          style={{ background: `rgba(${rgb},0.20)` }}
        />
        <div
          className="absolute top-[25%] right-[18%] w-1.5 h-1.5 rounded-full"
          style={{ background: `rgba(${rgb},0.18)` }}
        />
        <div
          className="absolute bottom-[15%] left-[6%] w-1 h-1 rounded-full"
          style={{ background: `rgba(${rgb},0.14)` }}
        />
      </div>

      <div className="relative max-w-6xl mx-auto px-5 lg:px-8">
        {/* Main Hero Grid */}
        <div className="grid lg:grid-cols-2 gap-8 xl:gap-12 items-center pt-28 pb-12 lg:pt-32 lg:pb-16">

          {/* Left: Text Content */}
          <div className="flex flex-col justify-center">
            <div
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-wider mb-5 w-fit"
              style={{ ...badgeStyle, ...makeSlideLeft(0), letterSpacing: "0.06em" }}
              key={`badge-${animKey}`}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: `#${slide.headlineGradient[0]}` }} />
              {slide.badge}
            </div>

            <h1
              className="font-extrabold leading-tight tracking-tight"
              key={`headline-${animKey}`}
              style={{ ...makeFadeUp(0.05), fontSize: "clamp(2rem, 3.8vw, 3.25rem)", lineHeight: 1.1, letterSpacing: "-0.02em", color: "#1F2937", maxWidth: "520px" }}
            >
              {slide.headline.map((part, i) =>
                part.bold ? (
                  <span key={i} className="font-black" style={gradientText}>{part.bold}</span>
                ) : (
                  <span key={i}>{part.normal}</span>
                )
              )}
            </h1>

            <p
              key={`sub-${animKey}`}
              className="mt-4 text-[13px] leading-relaxed"
              style={{ color: "#6B7280", maxWidth: "360px", ...makeFadeUp(0.10) }}
            >
              {slide.sub}
            </p>

            <div
              className="mt-6 flex items-center gap-3"
              key={`cta-${animKey}`}
              style={makeFadeUp(0.15)}
            >
              <Link
                href={slide.ctaPrimaryHref}
                className="inline-flex items-center gap-2 text-sm font-semibold text-white rounded-full transition-all duration-200 hover:opacity-90 hover:shadow-lg"
                style={{ padding: "0 28px", height: "52px", ...ctaGradient }}
              >
                {slide.ctaPrimary}
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href={slide.ctaSecondaryHref}
                className="inline-flex items-center gap-2 text-sm font-medium rounded-full transition-all duration-200"
                style={{
                  padding: "0 24px",
                  height: "52px",
                  color: `#${slide.headlineGradient[0]}`,
                  background: `rgba(${rgb},0.06)`,
                  border: `1px solid rgba(${rgb},0.18)`,
                }}
              >
                {slide.ctaSecondary}
              </Link>
            </div>

            <div
              className="mt-5 flex items-center gap-3"
              key={`social-${animKey}`}
              style={makeFadeUp(0.20)}
            >
              <div className="flex items-center">
                {[
                  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=40&q=80",
                  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=40&q=80",
                  "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=40&q=80",
                  "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=40&q=80",
                ].map((src, i) => (
                  <div
                    key={i}
                    className="relative overflow-hidden rounded-full"
                    style={{
                      width: 28, height: 28,
                      marginLeft: i === 0 ? 0 : -8,
                      border: "2px solid white",
                      zIndex: 4 - i,
                      boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                    }}
                  >
                    <img src={src} alt="" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
              <p className="text-[12px] leading-relaxed" style={{ color: "#6B7280" }}>
                <span className="font-bold" style={{ color: `#${slide.headlineGradient[0]}` }}>15.000+</span> học viên đã tin tưởng{" "}
                <span className="font-semibold" style={{ color: `#${slide.headlineGradient[0]}` }}>Glocal IELTS</span>
              </p>
            </div>
          </div>

          {/* Right: Hero Image + Controls */}
          <div className="relative order-first lg:order-last" key={`right-wrap-${animKey}`}>
            {/* Main hero image */}
            <div
              className="relative overflow-hidden rounded-[28px]"
              key={`image-${animKey}`}
              style={{
                aspectRatio: "4/3",
                boxShadow: `0 20px 60px rgba(${rgb},0.12), 0 8px 24px rgba(${rgb},0.08), 0 0 0 1px rgba(${rgb},0.06)`,
                ...makeSlideRight(),
              }}
            >
              <Image
                src={slide.heroImage}
                alt={slide.badge}
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
                priority
              />

              {/* Glassmorphic stats card */}
              <div
                className="absolute left-4 bottom-4 z-10 flex items-center gap-4 rounded-2xl bg-white/90 backdrop-blur-md px-4 py-3"
                style={{
                  boxShadow: "0 8px 24px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.06)",
                  border: "1px solid rgba(255,255,255,0.6)",
                }}
              >
                {slide.stats.map((s) => (
                  <div key={s.label} className="text-center">
                    <p
                      className="font-black leading-none"
                      style={{ fontSize: "clamp(0.875rem, 1.5vw, 1.125rem)", color: "#111827" }}
                    >
                      {s.value}
                    </p>
                    <p className="mt-0.5 text-[9px] font-medium tracking-wide" style={{ color: "#9CA3AF" }}>
                      {s.label}
                    </p>
                  </div>
                ))}
              </div>

              {/* Top gradient overlay */}
              <div
                className="absolute inset-x-0 top-0 h-16 pointer-events-none"
                style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.08) 0%, transparent 100%)" }}
              />
            </div>

            {/* Navigation buttons */}
            <button
              style={carouselBtnStyle}
              className="absolute left-[-18px] top-1/2 -translate-y-1/2 z-30 hover:scale-110"
              onClick={prev}
              aria-label="Previous slide"
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "white";
                (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 4px 16px rgba(0,0,0,0.15)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.92)";
                (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 2px 12px rgba(0,0,0,0.10)";
              }}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              style={carouselBtnStyle}
              className="absolute right-[-18px] top-1/2 -translate-y-1/2 z-30 hover:scale-110"
              onClick={next}
              aria-label="Next slide"
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "white";
                (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 4px 16px rgba(0,0,0,0.15)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.92)";
                (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 2px 12px rgba(0,0,0,0.10)";
              }}
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Dot indicators */}
            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2">
              {SLIDES.map((_, i) => (
                <button
                  key={i}
                  onClick={() => { setCurrent(i); setAnimKey((k) => k + 1); }}
                  className="rounded-full transition-all duration-300"
                  style={{
                    width: 8, height: 8,
                    background: i === current ? `#${slide.headlineGradient[0]}` : `rgba(${rgb},0.30)`,
                    opacity: i === current ? 1 : 0.45,
                    transform: i === current ? "scale(1.4)" : "scale(1)",
                  }}
                  aria-label={`Go to slide ${i + 1}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Partner showcase card */}
        <div
          className="mx-auto overflow-hidden"
          style={{
            maxWidth: "900px",
            marginTop: "48px",
            marginBottom: "8px",
            borderRadius: "28px",
            background: "rgba(255,255,255,0.65)",
            backdropFilter: "blur(24px) saturate(180%)",
            WebkitBackdropFilter: "blur(24px) saturate(180%)",
            boxShadow: "0 8px 40px rgba(108,99,255,0.08), 0 1px 0 rgba(255,255,255,0.8) inset",
            border: "1px solid rgba(255,255,255,0.60)",
            padding: "10px 14px",
          }}
        >
          <p
            className="text-center text-[10px] font-semibold uppercase tracking-[0.15em] mb-5"
            style={{ color: "#9CA3AF" }}
          >
            Đối tác chính thức
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6">
            {[
              { name: "Glocal IELTS", src: "/logo/doitac/1.png" },
              { name: "IDP Education", src: "/logo/doitac/2.png" },
              { name: "British Council", src: "/logo/doitac/3.png" },
              { name: "IELTS by British Council", src: "/logo/doitac/4.png" },
              { name: "British Council | IDP", src: "/logo/doitac/5.png" },
              { name: "IELTS Official", src: "/logo/doitac/6.png" },
              { name: "Cambridge English", src: "/logo/doitac/7.png" },
            ].map((p) => (
              <img
                key={p.name}
                src={p.src}
                alt={p.name}
                className="object-contain"
                style={{ height: 90, width: "auto", maxWidth: 120, opacity: 0.8 }}
                title={p.name}
              />
            ))}
          </div>
        </div>

        {/* Bottom spacing */}
        <div
          className="h-8"
          style={{ background: "linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.6) 100%)" }}
        />
      </div>
    </section>
  );
}
