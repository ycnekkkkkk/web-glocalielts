"use client";

import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { useCallback, useRef } from "react";
import { Autoplay, Pagination } from "swiper/modules";
import type { Swiper as SwiperType } from "swiper";
import { Swiper, SwiperSlide } from "swiper/react";

import "swiper/css";
import "swiper/css/pagination";

import "./hero-split-carousel.css";

const HERO_SLIDES = [
  {
    title: "Nền tảng hỗ trợ đăng ký thi IELTS lớn nhất Việt Nam",
    bullets: [
      "Đối tác chính thức IDP & BC tại hơn 40 tỉnh thành Việt Nam",
      "Ưu đãi kép từ IDP hoặc BC cùng Global IELTS",
      "Chương trình độc quyền “Du lịch và thi IELTS trong nước và quốc tế”",
    ],
    image:
      "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=1200&q=80",
    imageAlt: "Thí sinh chuẩn bị hồ sơ và đăng ký thi IELTS",
  },
  {
    title: "Thi thử và sửa bài IELTS miễn phí",
    bullets: [
      "Thi thử với kết quả thật và hướng dẫn sửa bài tăng band",
      "Kho tài liệu các bài Writing và Speaking đã được sửa",
      "Có sẵn bài 24/7, bám sát vấn đề và năng lực ngôn ngữ",
    ],
    image:
      "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1200&q=80",
    imageAlt: "Học viên làm bài thi thử IELTS và được chữa bài",
  },
  {
    title: "Thực hành IELTS & Giao lưu văn hóa với Mentor bản xứ Canada",
    bullets: [
      "Thực hành Tiếng Anh thực tế trước khi đi du học định cư",
      "Làm quen văn hóa Canada cùng Mentor",
      "Khung nội dung và hoạt động khoa học thực tế hiệu quả",
    ],
    image:
      "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1200&q=80",
    imageAlt: "Học viên giao lưu nhóm với mentor bản xứ",
  },
] as const;

export default function HeroSplitCarousel() {
  const swiperRef = useRef<SwiperType | null>(null);

  const goPrev = useCallback(() => swiperRef.current?.slidePrev(), []);
  const goNext = useCallback(() => swiperRef.current?.slideNext(), []);

  return (
    <section
      className="relative overflow-hidden border-b border-gray-200/80 bg-gradient-to-br from-slate-50 via-white to-brand-50/25 text-gray-900"
      aria-roledescription="carousel"
      aria-label="Giới thiệu nền tảng"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.55]"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 85% 55% at 100% -10%, rgba(99, 102, 241, 0.09), transparent 55%), radial-gradient(ellipse 70% 45% at 0% 100%, rgba(79, 70, 229, 0.06), transparent 50%)",
        }}
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-200/60 to-transparent" />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-9 sm:pt-11 lg:pt-12">
        <span className="inline-flex items-center rounded-full border border-brand-200/70 bg-white/80 px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-brand-700 shadow-sm backdrop-blur-sm sm:text-xs sm:tracking-[0.2em]">
          Glocal IELTS · Amazing Group
        </span>
      </div>

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pb-9 sm:pb-11">
        <div className="relative isolate max-w-full">
          {/* Nút tùy chỉnh — luôn nằm trong khung, không dùng swiper-button-next/prev mặc định */}
          <button
            type="button"
            aria-label="Slide trước"
            onClick={goPrev}
            className="hero-split-nav-btn hero-split-nav-prev hidden sm:flex"
          >
            <ChevronLeft className="h-5 w-5" strokeWidth={2.25} />
          </button>
          <button
            type="button"
            aria-label="Slide sau"
            onClick={goNext}
            className="hero-split-nav-btn hero-split-nav-next hidden sm:flex"
          >
            <ChevronRight className="h-5 w-5" strokeWidth={2.25} />
          </button>

          <Swiper
            className="hero-split-swiper !pb-11 sm:!pb-10"
            modules={[Autoplay, Pagination]}
            onSwiper={(instance) => {
              swiperRef.current = instance;
            }}
            autoplay={{
              delay: 5000,
              disableOnInteraction: false,
              pauseOnMouseEnter: true,
            }}
            pagination={{ clickable: true }}
            loop
            speed={650}
            slidesPerView={1}
            spaceBetween={20}
          >
            {HERO_SLIDES.map((slide, index) => (
              <SwiperSlide key={slide.title}>
                <div className="grid lg:grid-cols-2 lg:gap-12 xl:gap-14 items-center lg:min-h-[min(400px,68vh)] pt-2 lg:px-1 xl:px-2">
                  <div className="order-2 lg:order-1 flex flex-col justify-center lg:rounded-2xl lg:bg-white/75 lg:ring-1 lg:ring-gray-200/70 lg:shadow-[var(--shadow-card)] lg:p-8 xl:p-9 lg:backdrop-blur-[2px]">
                    <h2 className="text-balance text-2xl sm:text-3xl lg:text-[1.85rem] xl:text-[2.1rem] font-extrabold text-gray-900 tracking-tight leading-[1.18]">
                      {slide.title}
                    </h2>
                    <ul className="mt-6 sm:mt-7 space-y-3 sm:space-y-3.5">
                      {slide.bullets.map((line) => (
                        <li
                          key={line}
                          className="flex gap-3.5 text-gray-600 text-sm sm:text-[0.9375rem] leading-relaxed"
                        >
                          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-700">
                            <Check className="h-3.5 w-3.5" strokeWidth={3} />
                          </span>
                          <span>{line}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="order-1 lg:order-2 w-full flex justify-center lg:justify-end pt-1 lg:pt-0">
                    <div className="relative w-full max-w-lg lg:max-w-none aspect-[4/3] overflow-hidden rounded-2xl bg-gradient-to-br from-brand-100/50 to-slate-200/80 shadow-[0_12px_40px_-12px_rgb(15_23_42/0.18)] ring-1 ring-white/80 ring-offset-2 ring-offset-slate-50/0 sm:ring-2">
                      {/* Replace with real image later */}
                      <Image
                        src={slide.image}
                        alt={slide.imageAlt}
                        fill
                        className="object-cover object-center"
                        sizes="(max-width: 1024px) min(100vw, 36rem), 48vw"
                        priority={index === 0}
                      />
                    </div>
                  </div>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </div>
    </section>
  );
}
