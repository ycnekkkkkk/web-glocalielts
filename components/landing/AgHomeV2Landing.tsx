"use client";

import Button from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import CourseCardSlider from "@/components/landing/CourseCardSlider";
import HeroSplitCarousel from "@/components/landing/HeroSplitCarousel";
import PublicSiteFooter from "@/components/layout/PublicSiteFooter";
import PublicSiteHeader from "@/components/layout/PublicSiteHeader";
import { AG_LANDING_VI as t } from "@/lib/ag-landing-vi";
import type { PublicCourse } from "@/types/database";
import { Banknote, Check, ChevronRight, Heart, Sparkles } from "lucide-react";
import Image from "next/image";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";

type TabKey = "tab1" | "tab2" | "tab3";

const COURSE_CATEGORIES = [
  "Pronunciation",
  "Speaking",
  "IELTS Mentorship",
  "IELTS Rocket",
  "A+ Teacher",
  "Practice IELTS with Native Teacher",
  "Exchange Culture with Local Mentor",
  "Hạ Hạ Mentoring Coaching",
  "[AG x HR] Series Training Intern",
] as const;

const PARTNER_LOGOS = ["/doitac/1.png", "/doitac/2.png", "/doitac/3.png", "/doitac/4.png", "/doitac/5.png", "/doitac/6.png", "/doitac/7.png"] as const;
const UPCOMING_EVENTS = [
  {
    title: "Workshop Listening 7.0+",
    date: "19:30 · 20/04/2026",
    mode: "Online Zoom",
    note: "Phân tích bẫy đề thật + chiến lược làm Part 2, Part 3.",
  },
  {
    title: "Mock Test 4 kỹ năng có chấm Speaking",
    date: "08:00 · 27/04/2026",
    mode: "Offline · TP.HCM",
    note: "Thi thử đầy đủ, trả band dự kiến và góp ý chi tiết.",
  },
  {
    title: "Q&A Du học + IELTS Pathway",
    date: "19:00 · 04/05/2026",
    mode: "Hybrid",
    note: "Lộ trình IELTS theo mục tiêu học bổng và hồ sơ du học.",
  },
] as const;

const CLIENT_FEEDBACKS = [
  {
    name: "Nguyễn Minh Anh",
    target: "IELTS 7.0",
    quote:
      "Mình thích nhất phần chữa Writing rất cụ thể theo từng tiêu chí. Sau 6 tuần, điểm task response tăng rõ rệt.",
  },
  {
    name: "Trần Hoàng Long",
    target: "IELTS 6.5",
    quote:
      "Thi thử mô phỏng sát đề thật, đặc biệt Speaking có nhận xét thẳng vào lỗi phát âm và ý tưởng nên tiến bộ nhanh.",
  },
  {
    name: "Lê Khánh Ngọc",
    target: "IELTS 7.5",
    quote:
      "Mentor theo sát từng giai đoạn, có lịch học linh hoạt. Mình vừa đi làm vừa ôn vẫn giữ được tiến độ.",
  },
] as const;

function detectCategory(course: PublicCourse): string {
  const raw =
    `${course.slug ?? ""} ${course.title} ${course.short_description ?? ""} ${course.description ?? ""}`.toLowerCase();
  const rawNoAccent = raw.normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/đ/g, "d").replace(/Đ/g, "d");

  const upper = `${course.slug ?? ""} ${course.title}`.toUpperCase();

  // Legacy/program header entries
  if (raw.includes("ielts mentorship")) return "IELTS Mentorship";

  // Code-first mapping for legacy codes that don't contain keyword strings
  if (
    upper.includes("CMO1") ||
    upper.includes("GIG1") ||
    upper.includes("GIO1") ||
    raw.includes("pronunciation")
  ) {
    return "Pronunciation";
  }

  if (upper.includes("CMG1") || upper.includes("SPG5") || raw.includes("speaking")) return "Speaking";
  if (
    upper.includes("IM01") ||
    upper.includes("IM02") ||
    upper.includes("IM03") ||
    upper.includes("IMO1") ||
    upper.includes("IMO2") ||
    upper.includes("IMO3") ||
    upper.includes("IMG") ||
    upper.includes("GIG2")
  )
    return "IELTS Mentorship";

  if (upper.includes("RIG") || upper.includes("RIO") || raw.includes("rocket")) return "IELTS Rocket";

  if (raw.includes("a+ teacher") || raw.includes("a plus teacher")) return "A+ Teacher";
  if (raw.includes("native teacher")) return "Practice IELTS with Native Teacher";
  if (raw.includes("exchange culture") || raw.includes("local mentor")) return "Exchange Culture with Local Mentor";
  if (raw.includes("hạ hạ") || raw.includes("ha ha") || raw.includes("mentoring coaching")) return "Hạ Hạ Mentoring Coaching";

  // Title-based mapping (legacy). These items may not include clear keywords in text.
  if (rawNoAccent.includes("tu duy lam it duoc nhieu")) return "Hạ Hạ Mentoring Coaching";
  if (rawNoAccent.includes("yearly reflection")) return "Hạ Hạ Mentoring Coaching";
  if (rawNoAccent.includes("bi kip gioi danh cho hoc sinh luoi")) return "Hạ Hạ Mentoring Coaching";
  if (raw.includes("[ag x hr]") || raw.includes("series training intern")) return "[AG x HR] Series Training Intern";
  return "Khác";
}

export default function AgHomeV2Landing({ courses }: { courses: PublicCourse[] }) {
  const [tab, setTab] = useState<TabKey>("tab1");
  const [form, setForm] = useState({
    type: "",
    full_name: "",
    phone: "",
    email: "",
    code_refer: "",
  });

  function submitForm(e: React.FormEvent) {
    e.preventDefault();
    if (!form.type || !form.full_name.trim() || !form.phone.trim() || !form.email.trim()) {
      toast.error("Vui lòng điền đủ các trường bắt buộc.");
      return;
    }
    toast.success(t.register_success);
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
    const ordered = COURSE_CATEGORIES.filter((c) => (groupedCourses.get(c) ?? []).length > 0);
    return ordered;
  }, [groupedCourses]);

  const orderedCourses = useMemo(() => {
    return categoryOrder.flatMap((cat) => groupedCourses.get(cat) ?? []);
  }, [categoryOrder, groupedCourses]);

  return (
    <div className="min-h-screen bg-slate-50 text-gray-900">
      <PublicSiteHeader />

      <HeroSplitCarousel />

      <section className="py-12 sm:py-16 bg-slate-50 border-b border-gray-200/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 leading-snug">
            <span className="text-brand-600">{t.support}</span> {t.for_ielts_exam_registration}
            <br />
            <span className="text-gray-800">{t.with_idp_or_british_council}</span>
          </h2>
          <div className="grid md:grid-cols-3 gap-6 lg:gap-8 mt-12 text-left">
            <Card className="p-6 flex flex-col items-center text-center h-full border-brand-100/80 bg-white">
              <div className="w-20 h-20 mb-4 rounded-2xl bg-brand-100 flex items-center justify-center">
                <Sparkles className="w-10 h-10 text-brand-600" strokeWidth={1.5} />
              </div>
              <h4 className="font-bold text-lg mb-2 text-gray-900">{t.convenient}</h4>
              <p className="text-sm text-gray-600 leading-relaxed">{t.conten01}</p>
            </Card>
            <Card className="p-6 flex flex-col items-center text-center h-full border-brand-100/80 bg-white">
              <div className="w-20 h-20 mb-4 rounded-2xl bg-indigo-100 flex items-center justify-center">
                <Banknote className="w-10 h-10 text-indigo-700" strokeWidth={1.5} />
              </div>
              <h4 className="font-bold text-lg mb-2 text-gray-900">{t.expense}</h4>
              <p className="text-sm text-gray-600 leading-relaxed">{t.conten02}</p>
            </Card>
            <Card className="p-6 flex flex-col items-center text-center h-full border-brand-100/80 bg-white">
              <div className="w-20 h-20 mb-4 rounded-2xl bg-violet-100 flex items-center justify-center">
                <Heart className="w-10 h-10 text-violet-700" strokeWidth={1.5} />
              </div>
              <h4 className="font-bold text-lg mb-2 text-gray-900">{t.tam}</h4>
              <p className="text-sm text-gray-600 leading-relaxed">{t.conten03}</p>
            </Card>
          </div>
          <div className="mt-10 flex justify-center">
            <a href="#support-register-form">
              <Button type="button" size="lg" variant="primary" className="px-10">
                {t.register_now}
              </Button>
            </a>
          </div>
        </div>
      </section>

      <section className="py-12 sm:py-16 bg-white border-b border-gray-200/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-center text-gray-900 mb-2">
            <span className="block">{t.events}</span>
            <span className="block text-brand-600">{t.upcoming}</span>
          </h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {UPCOMING_EVENTS.map((event) => (
              <Card key={event.title} className="p-5 sm:p-6 bg-slate-50/80 border-brand-100/70">
                <p className="text-xs font-semibold tracking-wide text-brand-700 uppercase">{event.mode}</p>
                <h3 className="mt-2 text-base sm:text-lg font-bold text-gray-900 leading-snug">{event.title}</h3>
                <p className="mt-2 text-sm font-medium text-gray-700">{event.date}</p>
                <p className="mt-3 text-sm text-gray-600 leading-relaxed">{event.note}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 sm:py-16 bg-slate-50 border-b border-gray-200/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-center mb-1 text-gray-900">
            <span className="block">{t.courses}</span>
            <span className="block text-brand-600 mt-1">{t.courses_attribute}</span>
          </h2>
          <div className="mt-10">
            <CourseCardSlider courses={orderedCourses} />
          </div>
        </div>
      </section>

      <section className="py-12 sm:py-20 bg-white border-b border-gray-200/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-2 gap-10 items-center mb-14">
            <div>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold leading-tight text-gray-900">
                <span className="block">{t.text1}</span>
                <span className="block">{t.text2}</span>
              </h2>
              <ul className="mt-6 space-y-3 text-gray-700 text-sm sm:text-base leading-relaxed">
                <li className="flex gap-2">
                  <Check className="w-5 h-5 text-brand-600 shrink-0 mt-0.5" />
                  {t.conten04}
                </li>
                <li className="flex gap-2">
                  <Check className="w-5 h-5 text-brand-600 shrink-0 mt-0.5" />
                  {t.conten05}
                </li>
                <li className="flex gap-2">
                  <Check className="w-5 h-5 text-brand-600 shrink-0 mt-0.5" />
                  {t.conten06}
                </li>
              </ul>
            </div>
            <div className="relative aspect-video overflow-hidden rounded-2xl border border-brand-100/80">
              <Image
                src="https://images.unsplash.com/photo-1488998427799-e3362cec87c3?auto=format&fit=crop&w=1400&q=80"
                alt="Buổi tư vấn đăng ký thi IELTS"
                fill
                className="object-cover object-center"
                sizes="(max-width: 1024px) 100vw, 48vw"
              />
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="p-6 sm:p-8 flex gap-4 bg-gradient-to-br from-amber-50 to-orange-50 border-amber-100/90">
              <div className="relative w-16 h-16 shrink-0">
                <Image src="/landing-ag/icon-mentoring-1.svg" alt="" fill className="object-contain" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">{t.content14}</h3>
                <ul className="mt-3 space-y-2 text-sm text-gray-700">
                  <li className="flex gap-2">
                    <Check className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    {t.content15}
                  </li>
                  <li className="flex gap-2">
                    <Check className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    {t.content16}
                  </li>
                  <li className="flex gap-2">
                    <Check className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    {t.content17}
                  </li>
                </ul>
                <a
                  href="#support-register-form"
                  className="inline-flex items-center gap-1 mt-4 text-brand-700 font-semibold text-sm hover:text-brand-800 hover:underline"
                >
                  {t.more} <ChevronRight className="w-4 h-4" />
                </a>
              </div>
            </Card>
            <Card className="p-6 sm:p-8 flex gap-4 bg-gradient-to-br from-brand-50 to-indigo-50 border-brand-100/90">
              <div className="relative w-16 h-16 shrink-0">
                <Image src="/landing-ag/icon-mentoring-2.svg" alt="" fill className="object-contain" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">{t.content19}</h3>
                <ul className="mt-3 space-y-2 text-sm text-gray-700">
                  <li className="flex gap-2">
                    <Check className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" />
                    {t.content20}
                  </li>
                  <li className="flex gap-2">
                    <Check className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" />
                    {t.content21}
                  </li>
                  <li className="flex gap-2">
                    <Check className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" />
                    {t.content22}
                  </li>
                </ul>
                <a
                  href="#support-register-form"
                  className="inline-flex items-center gap-1 mt-4 text-brand-700 font-semibold text-sm hover:text-brand-800 hover:underline"
                >
                  {t.more} <ChevronRight className="w-4 h-4" />
                </a>
              </div>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-12 sm:py-16 bg-slate-50 border-b border-gray-200/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-center mb-10 text-gray-900">
            <span className="text-brand-600">{t.support}</span> {t.other}
            <br />
            <span className="text-gray-800 font-semibold text-lg sm:text-xl md:text-2xl mt-1 block">
              {t.passion_for_lifetime_companion}
            </span>
          </h2>
          <div className="flex flex-wrap justify-center gap-2 mb-8 border-b border-gray-200 pb-4">
            {(
              [
                { id: "tab1" as TabKey, label: t.tab_study_abroad_consulting },
                { id: "tab2" as TabKey, label: t.tab_study_abroad_support },
                { id: "tab3" as TabKey, label: t.tab_doVisa },
              ] as const
            ).map((x) => (
              <button
                key={x.id}
                type="button"
                onClick={() => setTab(x.id)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${tab === x.id
                    ? "bg-brand-600 text-white shadow-sm"
                    : "bg-white text-gray-700 border border-gray-200 hover:bg-brand-50/80 hover:border-brand-200"
                  }`}
              >
                {x.label}
              </button>
            ))}
          </div>
          <div className="grid md:grid-cols-2 gap-8 items-start">
            <div>
              {tab === "tab1" && (
                <>
                  <h3 className="text-lg font-bold text-gray-900">{t.tab_study_abroad_consulting}</h3>
                  <ul className="mt-4 space-y-3 text-gray-700 text-sm leading-relaxed">
                    <li className="flex gap-2">
                      <Check className="w-5 h-5 text-brand-600 shrink-0" />
                      {t.content26}
                    </li>
                    <li className="flex gap-2">
                      <Check className="w-5 h-5 text-brand-600 shrink-0" />
                      {t.content27}
                    </li>
                    <li className="flex gap-2">
                      <Check className="w-5 h-5 text-brand-600 shrink-0" />
                      {t.content28}
                    </li>
                  </ul>
                </>
              )}
              {tab === "tab2" && (
                <>
                  <h3 className="text-lg font-bold text-gray-900">{t.tab_study_abroad_support}</h3>
                  <ul className="mt-4 space-y-3 text-gray-700 text-sm leading-relaxed">
                    <li className="flex gap-2">
                      <Check className="w-5 h-5 text-brand-600 shrink-0" />
                      {t.content08}
                    </li>
                    <li className="flex gap-2">
                      <Check className="w-5 h-5 text-brand-600 shrink-0" />
                      {t.content09}
                    </li>
                    <li className="flex gap-2">
                      <Check className="w-5 h-5 text-brand-600 shrink-0" />
                      {t.content10}
                    </li>
                  </ul>
                </>
              )}
              {tab === "tab3" && (
                <>
                  <h3 className="text-lg font-bold text-gray-900">{t.tab_doVisa}</h3>
                  <ul className="mt-4 space-y-3 text-gray-700 text-sm leading-relaxed">
                    <li className="flex gap-2">
                      <Check className="w-5 h-5 text-brand-600 shrink-0" />
                      {t.understand_visa_law}
                    </li>
                    <li className="flex gap-2">
                      <Check className="w-5 h-5 text-brand-600 shrink-0" />
                      {t.well_groomed_and_professional}
                    </li>
                    <li className="flex gap-2">
                      <Check className="w-5 h-5 text-brand-600 shrink-0" />
                      {t.canada_usa_australia_new_zealand}
                    </li>
                  </ul>
                </>
              )}
            </div>
            <div className="relative aspect-video overflow-hidden rounded-2xl border border-brand-100/80">
              <Image
                src="https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=1400&q=80"
                alt="Mentor hỗ trợ lộ trình học và du học"
                fill
                className="object-cover object-center"
                sizes="(max-width: 1024px) 100vw, 48vw"
              />
            </div>
          </div>
        </div>
      </section>

      <section id="support-register-form" className="py-12 sm:py-20 bg-white border-b border-gray-200/80 scroll-mt-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-5 gap-10 items-stretch">
            <div className="lg:col-span-2">
              <Card className="h-full p-6 sm:p-8 border-brand-100/80 bg-slate-50/50">
                <h3 className="text-lg sm:text-xl font-bold text-brand-700 mb-6">{t.register_support_now}</h3>
                <form onSubmit={submitForm} className="space-y-4">
                  <div>
                    <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
                      {t.what_for_support}
                    </label>
                    <select
                      id="type"
                      required
                      value={form.type}
                      onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
                    >
                      <option value="">{t.choose_your_need}</option>
                      <option value={t.opt_ietls_practice_test}>{t.opt_ietls_practice_test}</option>
                      <option value={t.opt_support_registration}>{t.opt_support_registration}</option>
                      <option value={t.opt_video_english_course}>{t.opt_video_english_course}</option>
                      <option value={t.opt_mentorship}>{t.opt_mentorship}</option>
                      <option value={t.opt_ielts_class}>{t.opt_ielts_class}</option>
                      <option value={t.opt_classes_with_native}>{t.opt_classes_with_native}</option>
                      <option value={t.opt_visa}>{t.opt_visa}</option>
                      <option value={t.opt_study_abroad}>{t.opt_study_abroad}</option>
                      <option value={t.opt_register_extracurricular_program}>{t.opt_register_extracurricular_program}</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-1">
                      {t.full_name}
                    </label>
                    <input
                      id="full_name"
                      required
                      value={form.full_name}
                      onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                    <p className="text-xs text-gray-500 mt-1">{t.printed_in_capitals_and_accented}</p>
                  </div>
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                      {t.phone}
                    </label>
                    <input
                      id="phone"
                      required
                      value={form.phone}
                      onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                      {t.email}
                    </label>
                    <input
                      id="email"
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="code_refer" className="block text-sm font-medium text-gray-700 mb-1">
                      {t.code_refer}
                    </label>
                    <input
                      id="code_refer"
                      value={form.code_refer}
                      onChange={(e) => setForm((f) => ({ ...f, code_refer: e.target.value }))}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <Button type="submit" variant="primary" className="w-full mt-2">
                    {t.register}
                  </Button>
                </form>
              </Card>
            </div>
            <div className="lg:col-span-3 relative h-full min-h-[240px] overflow-hidden rounded-2xl border border-brand-100/60 hidden lg:block">
              <Image
                src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1600&q=80"
                alt="Học viên trao đổi cùng giảng viên trong buổi định hướng"
                fill
                className="object-cover object-center"
                sizes="(max-width: 1024px) 100vw, 60vw"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="py-12 sm:py-16 bg-slate-50 border-b border-gray-200/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-2 gap-10 items-start">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                <span className="block">{t.story}</span>
                <span className="block mt-1 text-brand-700">{t.from_ielts_to_local_impact}</span>
              </h2>
              <ul className="mt-8 space-y-8">
                <li className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-brand-600 text-white font-bold flex items-center justify-center shrink-0 text-sm shadow-sm">
                    01
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900">{t.vision}</h4>
                    <p className="mt-2 text-gray-600 text-sm leading-relaxed">{t.content11}</p>
                  </div>
                </li>
                <li className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-brand-600 text-white font-bold flex items-center justify-center shrink-0 text-sm shadow-sm">
                    02
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900">{t.mission}</h4>
                    <p className="mt-2 text-gray-600 text-sm leading-relaxed">{t.content12}</p>
                  </div>
                </li>
              </ul>
            </div>
            <div className="relative aspect-video overflow-hidden rounded-2xl border border-brand-100/80">
              <Image
                src="https://images.unsplash.com/photo-1513258496099-48168024aec0?auto=format&fit=crop&w=1400&q=80"
                alt="Hành trình học viên từ luyện thi đến mục tiêu du học"
                fill
                className="object-cover object-center"
                sizes="(max-width: 1024px) 100vw, 48vw"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="py-12 sm:py-16 bg-white border-b border-gray-200/80">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <Card className="p-8 sm:p-10 border-brand-100/60 bg-gradient-to-b from-white to-brand-50/20">
            <h3 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 leading-relaxed">
              <span className="block">{t.content23}</span>
              <span className="block mt-2">{t.content24}</span>
              <span className="block mt-2 text-brand-800">{t.content25}</span>
            </h3>
          </Card>
        </div>
      </section>

      <section className="py-12 sm:py-16 bg-slate-50 border-b border-gray-200/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-center mb-2 text-gray-900">
            <span className="block">{t.feeling}</span>
            <span className="block text-brand-600 mt-1">{t.client}</span>
          </h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {CLIENT_FEEDBACKS.map((item) => (
              <Card key={item.name} className="p-5 sm:p-6 bg-white">
                <p className="text-sm text-gray-700 leading-relaxed">&ldquo;{item.quote}&rdquo;</p>
                <div className="mt-4 border-t border-gray-100 pt-3">
                  <p className="text-sm font-bold text-gray-900">{item.name}</p>
                  <p className="text-xs text-brand-700 font-medium mt-1">Mục tiêu: {item.target}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 sm:py-20 bg-white border-b border-gray-200/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-xl sm:text-2xl font-bold mb-8 text-gray-900">{t.partner}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
            {PARTNER_LOGOS.map((src, idx) => (
              <Card key={src} className="p-4 sm:p-5 bg-white border-gray-200/80">
                <div className="relative h-14 sm:h-16">
                  <Image
                    src={src}
                    alt={`Đối tác ${idx + 1}`}
                    fill
                    sizes="(max-width: 640px) 45vw, (max-width: 1024px) 28vw, 220px"
                    className="object-contain"
                  />
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <PublicSiteFooter />
    </div>
  );
}
