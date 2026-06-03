"use client";

import CourseCardSlider from "@/components/landing/CourseCardSlider";
import HeroSplitCarousel from "@/components/landing/HeroSplitCarousel";
import PublicSiteFooter from "@/components/layout/PublicSiteFooter";
import TopBar from "@/components/landing/TopBar";
import type { PublicCourse } from "@/types/database";
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

type TabKey = "tab1" | "tab2" | "tab3";

export default function AgHomeV2Landing({ courses }: { courses: PublicCourse[] }) {
  const [tab, setTab] = useState<TabKey>("tab1");
  const [form, setForm] = useState({ type: "", full_name: "", phone: "", email: "", code_refer: "" });

  function submitForm(e: React.FormEvent) {
    e.preventDefault();
    if (!form.type || !form.full_name.trim() || !form.phone.trim() || !form.email.trim()) {
      toast.error("Vui lòng điền đầy đủ các trường bắt buộc.");
      return;
    }
    toast.success("Cảm ơn bạn! Đội ngũ sẽ liên hệ trong 24 giờ.");
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
    <>
      {/* ── Shared seamless gradient wrapper ── */}
      <div
        className="relative"
        style={{
          background: "linear-gradient(165deg, #F8F7FC 0%, #F3F0FF 25%, #E9DEFF 50%, #F3F0FF 75%, #F8F7FC 100%)",
          minHeight: "100vh",
        }}
      >
        {/* Ambient glow blobs — layered for premium SaaS depth */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div
            className="absolute -top-32 -right-32 w-[800px] h-[800px] rounded-full blur-[140px]"
            style={{ background: "radial-gradient(circle, rgba(108,99,255,0.14) 0%, rgba(108,99,255,0.06) 35%, transparent 60%)" }}
          />
          <div
            className="absolute -top-16 -left-48 w-[600px] h-[600px] rounded-full blur-[120px]"
            style={{ background: "radial-gradient(circle, rgba(233,222,255,0.7) 0%, rgba(243,240,255,0.3) 40%, transparent 65%)" }}
          />
          <div
            className="absolute top-[55%] left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full blur-[140px]"
            style={{ background: "radial-gradient(circle, rgba(108,99,255,0.08) 0%, transparent 65%)" }}
          />
          <div
            className="absolute top-[70%] -left-24 w-[400px] h-[400px] rounded-full blur-[100px]"
            style={{ background: "radial-gradient(circle, rgba(108,99,255,0.07) 0%, transparent 65%)" }}
          />
        </div>

        {/* TopBar floats over the gradient */}
        <TopBar />

        <main className="relative z-10">
          <HeroSplitCarousel />

          {/* ── Features grid ── */}
          <section className="py-20 lg:py-28 bg-white">
            <div className="max-w-6xl mx-auto px-5 lg:px-8">
              <div className="text-center max-w-2xl mx-auto mb-16">
                <span className="inline-block text-xs font-semibold tracking-widest uppercase text-brand-500 mb-4">Tại sao chọn chúng tôi</span>
                <h2 className="text-3xl lg:text-4xl font-black text-gray-900 tracking-tight leading-tight">
                  Mọi thứ bạn cần để chinh phục band điểm IELTS mong muốn
                </h2>
                <p className="mt-4 text-base text-gray-500 leading-relaxed">
                  Chương trình luyện IELTS toàn diện kết hợp hướng dẫn chuyên gia, đề thi thực tế và hỗ trợ từ giáo viên bản ngữ.
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-5">
                {[
                  {
                    icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" /></svg>,
                    title: "Đối tác chính thức IDP & BC",
                    desc: "Đối tác đăng ký thi chính thức tại 40+ tỉnh thành với ưu đãi độc quyền và ưu tiên đặt lịch thi.",
                    color: "#5B5BD6",
                  },
                  {
                    icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" /></svg>,
                    title: "Đề thi thực tế",
                    desc: "Bài mock test full-length với kết quả tức thì và phản hồi chi tiết từ chuyên gia về Writing & Speaking.",
                    color: "#5B5BD6",
                  },
                  {
                    icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" /></svg>,
                    title: "Giảng viên bản ngữ",
                    desc: "Luyện tập với mentor Canada để có giao tiếp thực tế và hòa nhập văn hóa trước khi du học.",
                    color: "#5B5BD6",
                  },
                  {
                    icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" /></svg>,
                    title: "Chương trình IELTS chuyên sâu",
                    desc: "Khóa học có cấu trúc bài bản, thiết kế bởi giáo viên IELTS chứng chỉ, phủ đủ cả 4 kỹ năng.",
                    color: "#5B5BD6",
                  },
                  {
                    icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>,
                    title: "Theo dõi tiến độ",
                    desc: "Bảng điều khiển giám sát band điểm cải thiện theo thời gian với phân tích dữ liệu chi tiết.",
                    color: "#5B5BD6",
                  },
                  {
                    icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
                    title: "Học mọi lúc, mọi nơi",
                    desc: "Truy cập tài liệu luyện tập và đề thi mock 24/7. Học theo tốc độ riêng trên mọi thiết bị.",
                    color: "#5B5BD6",
                  },
                ].map(f => (
                  <div key={f.title} className="group p-7 rounded-[20px] bg-white border border-gray-100 hover:border-gray-200 hover:shadow-[0_8px_40px_-8px_rgba(0,0,0,0.08)] transition-all duration-300">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-110"
                      style={{ background: `${f.color}15` }}>
                      <span style={{ color: f.color }}>{f.icon}</span>
                    </div>
                    <h3 className="text-base font-bold text-gray-900">{f.title}</h3>
                    <p className="mt-2.5 text-sm text-gray-500 leading-relaxed">{f.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── Courses section ── */}
          <section className="py-20 lg:py-28 bg-white">
            <div className="max-w-6xl mx-auto px-5 lg:px-8">
              <div className="flex items-end justify-between mb-12">
                <div>
                  <span className="inline-block text-xs font-semibold tracking-widest uppercase text-brand-500 mb-3">Khám phá</span>
                  <h2 className="text-3xl lg:text-4xl font-black text-gray-900 tracking-tight">Khóa học nổi bật</h2>
                </div>
                <a href="/courses" className="hidden sm:inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors">
                  Xem tất cả <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
                </a>
              </div>
              <CourseCardSlider courses={orderedCourses} />
            </div>
          </section>

          {/* ── CTA banner ── */}
          <section className="pb-20 lg:pb-28 bg-white">
            <div className="max-w-6xl mx-auto px-5 lg:px-8">
              <div className="relative overflow-hidden rounded-[24px] px-8 lg:px-14 py-14 lg:py-16 text-center"
                style={{ background: "linear-gradient(135deg, #5B5BD6 0%, #6B6BD6 35%, #5B5BD6 65%, #7B79E8 100%)" }}>
                <div className="absolute top-0 right-0 w-80 h-80 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }} />
                <div className="absolute -bottom-20 -left-10 w-60 h-60 rounded-full" style={{ background: "rgba(255,255,255,0.05)" }} />
                <div className="absolute top-10 right-10 w-4 h-4 rounded-full" style={{ background: "rgba(255,255,255,0.2)" }} />
                <div className="absolute bottom-20 right-40 w-2 h-2 rounded-full" style={{ background: "rgba(255,255,255,0.15)" }} />
                <div className="absolute top-[20%] left-[20%] w-2 h-2 rounded-full" style={{ background: "rgba(255,255,255,0.1)" }} />
                <div className="absolute bottom-[30%] left-[10%] w-1.5 h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.12)" }} />
                <div className="relative z-10">
                  <h2 className="text-2xl lg:text-4xl font-black text-white tracking-tight">
                    Sẵn sàng bắt đầu hành trình IELTS của bạn?
                  </h2>
                  <p className="mt-3 text-white/70 text-sm lg:text-base max-w-xl mx-auto">
                    Tham gia cùng hàng nghìn học viên đã chinh phục band điểm mong muốn cùng Glocal IELTS.
                  </p>
                  <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
                    <a href="/register"
                      className="px-7 py-3.5 bg-white text-brand-600 font-semibold text-sm rounded-2xl hover:bg-white/95 hover:shadow-xl transition-all duration-200">
                      Bắt đầu miễn phí
                    </a>
                    <a href="/courses"
                      className="px-7 py-3.5 text-white/90 font-medium text-sm rounded-2xl border border-white/30 hover:bg-white/10 transition-all duration-200">
                      Xem khóa học
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ── Registration form ── */}
          <section id="support-register-form" className="py-20 lg:py-28 bg-white">
            <div className="max-w-6xl mx-auto px-5 lg:px-8">
              <div className="grid lg:grid-cols-2 gap-12 lg:gap-16">
                <div className="lg:pt-4">
                  <span className="inline-block text-xs font-semibold tracking-widest uppercase text-brand-500 mb-4">Bắt đầu ngay</span>
                  <h2 className="text-3xl lg:text-4xl font-black text-gray-900 tracking-tight leading-tight">
                    Đăng ký tư vấn IELTS miễn phí
                  </h2>
                  <p className="mt-5 text-base text-gray-500 leading-relaxed">
                    Điền thông tin, đội ngũ chuyên gia sẽ liên hệ bạn trong 24 giờ với lộ trình học cá nhân hóa.
                  </p>
                  <div className="mt-8 space-y-4">
                    {[
                      "Lộ trình học cá nhân hóa theo trình độ hiện tại của bạn",
                      "Hướng dẫn đăng ký thi IDP & BC từ chuyên gia",
                      "Bài mock test miễn phí để đánh giá band điểm",
                      "Học bổng độc quyền và tư vấn khóa học phù hợp",
                    ].map(item => (
                      <div key={item} className="flex items-start gap-3">
                        <span className="mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(108,99,255,0.1)" }}>
                          <svg className="w-3 h-3 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                        </span>
                        <span className="text-sm text-gray-600">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-[24px] border border-gray-100 p-7 lg:p-8 shadow-[0_4px_40px_-12px_rgba(0,0,0,0.06)]">
                  <form onSubmit={submitForm} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Quan tâm đến</label>
                      <select
                        value={form.type}
                        onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100 transition-all"
                        required
                      >
                        <option value="">Chọn một tùy chọn</option>
                        <option value="ielts-course">Khóa học IELTS</option>
                        <option value="mock-test">Thi thử</option>
                        <option value="study-abroad">Tư vấn du học</option>
                        <option value="other">Khác</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Họ và tên</label>
                      <input
                        type="text"
                        value={form.full_name}
                        onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                        placeholder="Nhập họ và tên của bạn"
                        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 placeholder:text-gray-300 outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100 transition-all"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Số điện thoại</label>
                        <input
                          type="tel"
                          value={form.phone}
                          onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                          placeholder="Số điện thoại"
                          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 placeholder:text-gray-300 outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100 transition-all"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Email</label>
                        <input
                          type="email"
                          value={form.email}
                          onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                          placeholder="Địa chỉ email"
                          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 placeholder:text-gray-300 outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100 transition-all"
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Mã giới thiệu (Tùy chọn)</label>
                      <input
                        type="text"
                        value={form.code_refer}
                        onChange={e => setForm(f => ({ ...f, code_refer: e.target.value }))}
                        placeholder="Nhập mã giới thiệu"
                        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 placeholder:text-gray-300 outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100 transition-all"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full mt-2 py-3.5 text-sm font-semibold text-white rounded-xl transition-all duration-200 hover:opacity-90 hover:shadow-lg hover:shadow-brand-500/20"
                      style={{ background: "linear-gradient(135deg, #5B5BD6 0%, #6B6BD6 100%)" }}
                    >
                      Nhận tư vấn miễn phí
                    </button>
                    <p className="text-center text-xs text-gray-400">Không spam. Hủy đăng ký bất kỳ lúc nào.</p>
                  </form>
                </div>
              </div>
            </div>
          </section>

          <PublicSiteFooter />
        </main>
      </div>
    </>
  );
}
