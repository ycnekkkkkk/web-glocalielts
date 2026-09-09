"use client";

import CourseCardSlider from "@/components/landing/CourseCardSlider";
import HeroSplitCarousel from "@/components/landing/HeroSplitCarousel";
import PublicSiteFooter from "@/components/layout/PublicSiteFooter";
import PublicSiteHeader from "@/components/layout/PublicSiteHeader";
import type { PublicCourse } from "@/types/database";
import { ArrowRight, CheckCircle2, GraduationCap, Laptop, Sparkles, Target } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";

function detectCategory(course: PublicCourse): string {
  const raw = `${course.slug ?? ""} ${course.title} ${course.short_description ?? ""} ${course.description ?? ""}`.toLowerCase();
  const rawNoAccent = raw.normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/đ/g, "d").replace(/Đ/g, "d");
  const upper = `${course.slug ?? ""} ${course.title}`.toUpperCase();
  if (raw.includes("ielts mentorship")) return "IELTS Mentorship";
  if (upper.includes("CMO1") || upper.includes("GIG1") || upper.includes("GIO1") || raw.includes("pronunciation")) return "Pronunciation";
  if (upper.includes("CMG1") || upper.includes("SPG5") || raw.includes("speaking")) return "Speaking";
  if (upper.includes("IM01") || upper.includes("IM02") || upper.includes("IM03") || upper.includes("IMO1") || upper.includes("IMO2") || upper.includes("IMO3") || upper.includes("IMG") || upper.includes("GIG2")) return "IELTS Mentorship";
  if (upper.includes("RIG") || upper.includes("RIO") || raw.includes("rocket")) return "IELTS Rocket";
  if (raw.includes("a+ teacher") || raw.includes("a plus teacher")) return "A+ Teacher";
  if (raw.includes("native teacher")) return "Practice IELTS with Native Teacher";
  if (raw.includes("exchange culture") || raw.includes("local mentor")) return "Exchange Culture with Local Mentor";
  if (raw.includes("hạ hạ") || raw.includes("ha ha") || raw.includes("mentoring coaching")) return "Hạ Hạ Mentoring Coaching";
  if (rawNoAccent.includes("tu duy lam it duoc nhieu")) return "Hạ Hạ Mentoring Coaching";
  if (rawNoAccent.includes("yearly reflection")) return "Hạ Hạ Mentoring Coaching";
  if (rawNoAccent.includes("bi kip gioi danh cho hoc sinh luoi")) return "Hạ Hạ Mentoring Coaching";
  if (raw.includes("[ag x hr]") || raw.includes("series training intern")) return "[AG x HR] Series Training Intern";
  return "Khác";
}

const COURSE_CATEGORIES = [
  "Pronunciation", "Speaking", "IELTS Mentorship", "IELTS Rocket", "A+ Teacher",
  "Practice IELTS with Native Teacher", "Exchange Culture with Local Mentor",
  "Hạ Hạ Mentoring Coaching", "[AG x HR] Series Training Intern",
] as const;

export default function AgHomeV2Landing({ courses }: { courses: PublicCourse[] }) {
  const [form, setForm] = useState({ full_name: "", phone: "", target: "6.5-7.0" });

  function submitForm(e: React.FormEvent) {
    e.preventDefault();
    if (!form.full_name.trim() || !form.phone.trim()) {
      toast.error("Vui lòng điền họ tên và số điện thoại.");
      return;
    }
    toast.success("Cảm ơn bạn! Đội ngũ tư vấn sẽ liên hệ trong 24 giờ.");
    setForm({ full_name: "", phone: "", target: "6.5-7.0" });
  }

  const groupedCourses = useMemo(() => {
    const map = new Map<string, PublicCourse[]>();
    for (const c of courses) {
      const cat = detectCategory(c);
      const existing = map.get(cat) ?? [];
      existing.push(c);
      map.set(cat, existing);
    }
    return map;
  }, [courses]);

  const categoryOrder = useMemo(() => {
    return COURSE_CATEGORIES.filter(c => (groupedCourses.get(c) ?? []).length > 0);
  }, [groupedCourses]);

  const orderedCourses = useMemo(() => {
    return categoryOrder.flatMap(cat => groupedCourses.get(cat) ?? []);
  }, [categoryOrder, groupedCourses]);

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col selection:bg-brand-100 selection:text-brand-900">
      {/* ── 1. Top Bar ── */}
      <PublicSiteHeader />

      <main className="flex-1 flex flex-col">
        {/* ── 2. Hero Section ── */}
        <HeroSplitCarousel />

        {/* ── 3. The 3 Core Pillars (Thiết kế cao cấp, thẩm mỹ, không bị đè chữ) ── */}
        <section className="py-16 lg:py-22 bg-slate-50/70 border-y border-slate-200/80">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold mb-3.5">
                <Sparkles className="w-3.5 h-3.5 text-brand-600" />
                <span>HỆ THỐNG ĐÀO TẠO & KHẢO THÍ</span>
              </div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
                Nền tảng tích hợp trọn vẹn cho hành trình IELTS
              </h2>
              <p className="mt-3 text-sm text-slate-600 leading-relaxed max-w-xl mx-auto">
                Đồng hành cùng học viên và giảng viên từ lộ trình học tập, thi thử 4 kỹ năng đến theo dõi tiến độ chuẩn quốc tế.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {/* Pillar 1: Đào tạo Khóa học */}
              <div className="p-6 rounded-2xl border border-slate-200 bg-white hover:border-brand-300 hover:shadow-md transition-all flex flex-col justify-between group">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-11 h-11 rounded-xl bg-brand-50 text-brand-600 border border-brand-100 flex items-center justify-center transition-transform group-hover:scale-105">
                      <GraduationCap className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-brand-700 bg-brand-50/80 px-2.5 py-1 rounded-full border border-brand-100">
                      Khóa học & Lộ trình
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 mb-2">Đào tạo IELTS Chuyên sâu</h3>
                  <p className="text-xs text-slate-600 leading-relaxed mb-4">
                    Lộ trình bài bản từ mất gốc đến 7.5+, rèn luyện Speaking 1-on-1 cùng đội ngũ giáo viên bản ngữ và mentor chuyên môn cao.
                  </p>

                  <ul className="space-y-2 text-xs text-slate-600">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Lớp học kèm 1-on-1 chuyên sâu</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Cam kết chuẩn đầu ra văn bản</span>
                    </li>
                  </ul>
                </div>

                <Link
                  href="/courses"
                  className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-bold text-brand-700 bg-brand-50 hover:bg-brand-100 rounded-xl transition-all border border-brand-200/70 mt-6"
                >
                  Khám phá các khóa học
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {/* Pillar 2: Khảo thí & Luyện đề chuẩn quốc tế (Highlight card) */}
              <div className="p-6 rounded-2xl border-2 border-brand-500/30 bg-white hover:border-brand-500 hover:shadow-md transition-all flex flex-col justify-between relative group">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-11 h-11 rounded-xl bg-brand-600 text-white shadow-xs flex items-center justify-center transition-transform group-hover:scale-105">
                      <Target className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                      Khảo thí Cambridge
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 mb-2">Hệ thống Khảo thí 4 Kỹ năng</h3>
                  <p className="text-xs text-slate-600 leading-relaxed mb-4">
                    Hơn 200+ đề thi sát thực tế IDP & British Council, đánh giá chi tiết Writing & Speaking theo đúng 4 tiêu chí chấm thi quốc tế.
                  </p>

                  <ul className="space-y-2 text-xs text-slate-600">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Đề thi cập nhật từ Cam 15-19</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Phân tích chi tiết từng lỗi sai</span>
                    </li>
                  </ul>
                </div>

                <Link
                  href="/thi-thu"
                  className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-xl shadow-xs transition-all mt-6"
                >
                  Vào phòng thi thử ngay
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {/* Pillar 3: Cổng tương tác Học viên & Giáo viên */}
              <div className="p-6 rounded-2xl border border-slate-200 bg-white hover:border-brand-300 hover:shadow-md transition-all flex flex-col justify-between group">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center transition-transform group-hover:scale-105">
                      <Laptop className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
                      Không gian học vụ
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 mb-2">Cổng Học tập Tương tác (LMS)</h3>
                  <p className="text-xs text-slate-600 leading-relaxed mb-4">
                    Không gian số chuyên biệt cho Học viên và Giáo viên: quản lý lịch học, nộp bài tập về nhà, chấm bài và theo dõi biểu đồ tiến độ.
                  </p>

                  <ul className="space-y-2 text-xs text-slate-600">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Tương tác trực tiếp thầy và trò</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Giám sát tiến độ học tập 24/7</span>
                    </li>
                  </ul>
                </div>

                <Link
                  href="/login"
                  className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-xl transition-all border border-slate-200 mt-6"
                >
                  Đăng nhập Cổng học tập
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── 4. Khóa học IELTS Nổi Bật (Bán khóa học & Đào tạo) ── */}
        <section className="py-16 lg:py-20 bg-slate-50/70 border-y border-slate-200/80">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold mb-3">
                  <GraduationCap className="w-3.5 h-3.5 text-brand-600" />
                  <span>CHƯƠNG TRÌNH ĐÀO TẠO</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  Lộ trình học tập theo mục tiêu của bạn
                </h2>
              </div>
              <Link
                href="/courses"
                className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-brand-600 hover:text-brand-700 transition-colors"
              >
                <span>Xem tất cả khóa học</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <CourseCardSlider courses={orderedCourses} />
          </div>
        </section>

        {/* ── 5. Quick Consultation Form (Thiết kế hiện đại, màu sắc hài hòa) ── */}
        <section id="support-register-form" className="py-16 lg:py-20 bg-white">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="rounded-3xl bg-slate-900 text-white p-8 sm:p-10 lg:p-12 shadow-xl border border-slate-800 relative overflow-hidden">
              {/* Subtle ambient lighting */}
              <div className="pointer-events-none absolute -top-24 -right-24 h-96 w-96 rounded-full bg-brand-500/15 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-indigo-500/10 blur-3xl" />

              <div className="grid lg:grid-cols-12 gap-8 items-center relative z-10">
                
                {/* Left: Value Proposition */}
                <div className="lg:col-span-7">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-brand-200 text-xs font-bold uppercase tracking-wider mb-4">
                    <Sparkles className="w-3.5 h-3.5 text-brand-300" />
                    <span>TƯ VẤN KHÓA HỌC & TEST NĂNG LỰC</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white leading-tight">
                    Sẵn sàng bứt phá Band điểm IELTS của bạn?
                  </h2>
                  <p className="mt-3 text-sm text-slate-300 max-w-lg leading-relaxed">
                    Điền thông tin để nhận bài test năng lực 4 kỹ năng miễn phí và được chuyên gia học thuật xây dựng lộ trình học tập cá nhân hóa chuẩn Cambridge.
                  </p>

                  <div className="mt-6 space-y-2.5">
                    <div className="flex items-center gap-2 text-xs text-white/90">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Bài test 4 kỹ năng đánh giá band điểm tức thì</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-white/90">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Tư vấn khóa học phù hợp với mục tiêu & thời gian</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-white/90">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Ưu đãi độc quyền lệ phí thi IDP & British Council chính thức</span>
                    </div>
                  </div>
                </div>

                {/* Right: Streamlined 3-field form card */}
                <div className="lg:col-span-5 bg-white text-slate-900 rounded-2xl p-6 sm:p-7 shadow-2xl border border-slate-100">
                  <h3 className="text-base font-bold text-slate-900 mb-1">Đăng ký tư vấn lộ trình</h3>
                  <p className="text-xs text-slate-500 mb-4">Chuyên viên học vụ sẽ liên hệ trong 24 giờ</p>

                  <form onSubmit={submitForm} className="space-y-3.5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Họ và tên</label>
                      <input
                        type="text"
                        value={form.full_name}
                        onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                        placeholder="Nhập họ và tên"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/70 focus:bg-white px-3.5 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition-all"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Số điện thoại / Zalo</label>
                      <input
                        type="tel"
                        value={form.phone}
                        onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                        placeholder="Số điện thoại của bạn"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/70 focus:bg-white px-3.5 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition-all"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Mục tiêu Band điểm</label>
                      <select
                        value={form.target}
                        onChange={e => setForm(f => ({ ...f, target: e.target.value }))}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/70 focus:bg-white px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition-all cursor-pointer"
                      >
                        <option value="5.5-6.0">IELTS 5.5 - 6.0 (Cơ bản đến Khá)</option>
                        <option value="6.5-7.0">IELTS 6.5 - 7.0 (Mục tiêu chuẩn)</option>
                        <option value="7.5+">IELTS 7.5+ (Xuất sắc / Du học)</option>
                        <option value="other">Tư vấn thi thử / Khác</option>
                      </select>
                    </div>

                    <button
                      type="submit"
                      className="w-full mt-2 py-3 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-xl transition-all shadow-sm hover:shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <span>Nhận tư vấn & Lộ trình miễn phí</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                    <p className="text-center text-[10px] text-slate-400">Cam kết bảo mật thông tin cá nhân</p>
                  </form>
                </div>

              </div>
            </div>
          </div>
        </section>

        {/* ── 8. Footer ── */}
        <PublicSiteFooter />
      </main>
    </div>
  );
}
