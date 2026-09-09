"use client";

import { AG_LANDING_VI as t } from "@/lib/ag-landing-vi";
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  HelpCircle,
  Mail,
  MessageSquare,
  Phone,
  PhoneCall,
  ShieldCheck,
  Sparkles,
  Tag,
  User,
  Users,
} from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";

type SupportFormState = {
  type: string;
  full_name: string;
  phone: string;
  email: string;
  code_refer: string;
};

export default function SupportRegisterFormSection() {
  const [form, setForm] = useState<SupportFormState>({
    type: "",
    full_name: "",
    phone: "",
    email: "",
    code_refer: "",
  });
  const [submitting, setSubmitting] = useState(false);

  function submitForm(e: React.FormEvent) {
    e.preventDefault();
    if (!form.type || !form.full_name.trim() || !form.phone.trim() || !form.email.trim()) {
      toast.error("Vui lòng điền đủ các trường bắt buộc.");
      return;
    }
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      toast.success(t.register_success || "Đăng ký tư vấn thành công! Cố vấn sẽ liên hệ bạn sớm.");
      setForm({
        type: "",
        full_name: "",
        phone: "",
        email: "",
        code_refer: "",
      });
    }, 600);
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
      {/* ── MAIN SECTION: Form Left (3 cols) + Advisory Right (2 cols) ── */}
      <div className="grid lg:grid-cols-5 gap-8 mb-12">
        {/* Left: Modern Registration Form */}
        <div className="lg:col-span-3">
          <div className="rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-xs">
            <div className="mb-6 pb-5 border-b border-slate-100">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-50 border border-brand-100 text-brand-700 text-[11px] font-bold uppercase tracking-wider mb-2.5">
                <Sparkles className="w-3.5 h-3.5 text-brand-600" />
                <span>HỖ TRỢ TRỰC TIẾP TỪ HỌC VỤ</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                Đăng Ký Tư Vấn Thi IELTS Miễn Phí
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
                Điền thông tin để được chuyên viên khảo thí liên hệ hỗ trợ hồ sơ, lịch thi IDP / British Council tối ưu.
              </p>
            </div>

            <form onSubmit={submitForm} className="space-y-5">
              {/* Personal Info Grid */}
              <div className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  {/* Full Name */}
                  <div>
                    <label htmlFor="full_name" className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Họ và tên thí sinh <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      <input
                        id="full_name"
                        required
                        placeholder="Nguyễn Văn A"
                        value={form.full_name}
                        onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                        className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 focus:bg-white pl-10 pr-4 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-brand-600 focus:ring-4 focus:ring-brand-500/10 transition-all"
                      />
                    </div>
                  </div>

                  {/* Phone */}
                  <div>
                    <label htmlFor="phone" className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Số điện thoại liên hệ <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      <input
                        id="phone"
                        required
                        placeholder="0901 234 567"
                        value={form.phone}
                        onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                        className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 focus:bg-white pl-10 pr-4 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-brand-600 focus:ring-4 focus:ring-brand-500/10 transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label htmlFor="email" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Địa chỉ Email <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      id="email"
                      type="email"
                      required
                      placeholder="email@example.com"
                      value={form.email}
                      onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                      className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 focus:bg-white pl-10 pr-4 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-brand-600 focus:ring-4 focus:ring-brand-500/10 transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Support Type Selector */}
              <div>
                <label htmlFor="type" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Nhu cầu cần hỗ trợ <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <HelpCircle className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <select
                    id="type"
                    required
                    value={form.type}
                    onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                    className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 focus:bg-white pl-10 pr-4 text-xs sm:text-sm text-slate-800 outline-none focus:border-brand-600 focus:ring-4 focus:ring-brand-500/10 transition-all cursor-pointer"
                  >
                    <option value="">Chọn nhu cầu cần tư vấn...</option>
                    <option value="Đăng ký thi IELTS IDP & British Council">Đăng ký thi IELTS (IDP & British Council)</option>
                    <option value="Tư vấn hình thức thi (Trên giấy / Trên máy tính)">Tư vấn hình thức thi (Trên giấy / Trên máy tính)</option>
                    <option value="Tư vấn địa điểm & lịch thi gần nhất">Tư vấn địa điểm & lịch thi gần nhất</option>
                    <option value="Giải đáp lệ phí thi & các chính sách ưu đãi">Giải đáp lệ phí thi & các chính sách ưu đãi</option>
                    <option value="Tư vấn khóa học bổ trợ cấp tốc">Tư vấn khóa học bổ trợ cấp tốc</option>
                    <option value="Khác">Nhu cầu khác</option>
                  </select>
                </div>
              </div>

              {/* Referral Code */}
              <div>
                <label htmlFor="code_refer" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Mã ưu đãi / Mã giới thiệu <span className="text-slate-400 font-normal">(nếu có)</span>
                </label>
                <div className="relative">
                  <Tag className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    id="code_refer"
                    placeholder="Ví dụ: AG_IELTS2026"
                    value={form.code_refer}
                    onChange={(e) => setForm((f) => ({ ...f, code_refer: e.target.value }))}
                    className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 focus:bg-white pl-10 pr-4 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-brand-600 focus:ring-4 focus:ring-brand-500/10 transition-all"
                  />
                </div>
              </div>

              {/* Submit CTA & Privacy */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full h-11 flex items-center justify-center gap-2 rounded-xl bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white text-xs sm:text-sm font-bold px-4 transition-all shadow-sm hover:shadow cursor-pointer disabled:opacity-60 focus:outline-none focus:ring-4 focus:ring-brand-500/20"
                >
                  {submitting ? (
                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  ) : null}
                  <span>{submitting ? "Đang gửi yêu cầu..." : "Gửi yêu cầu tư vấn ngay"}</span>
                  {!submitting && <ArrowRight className="w-4 h-4" />}
                </button>

                <div className="mt-3 text-center text-xs text-slate-400 flex items-center justify-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Cam kết bảo mật thông tin cá nhân theo tiêu chuẩn học vụ quốc tế</span>
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* Right: Academic Advisory Cards */}
        <div className="lg:col-span-2 space-y-4">
          {/* Main Consultant Card */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center shrink-0">
                <Users className="w-6 h-6 text-brand-600" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 leading-tight">
                  Đội ngũ Cố vấn Glocal IELTS
                </h3>
                <span className="text-[11px] font-medium text-brand-600 leading-tight">
                  Chứng nhận Khảo thí IDP & BC
                </span>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-5">
              Chuyên viên học vụ giàu kinh nghiệm thực chiến sẵn sàng tư vấn hình thức thi (Computer/Paper), phân bổ thời gian ôn tập và hướng dẫn hồ sơ chuẩn xác.
            </p>

            {/* Checklist */}
            <div className="space-y-3 pt-4 border-t border-slate-100 text-xs text-slate-700">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>Tư vấn lựa chọn đối tác thi uy tín (IDP hoặc British Council)</span>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>Lựa chọn lịch thi và địa điểm thuận tiện nhất cho thí sinh</span>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>Hướng dẫn chi tiết thủ tục, thanh toán lệ phí minh bạch</span>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>Tặng cẩm nang quy chế phòng thi và bí kíp tâm lý phòng thi</span>
              </div>
            </div>
          </div>

          {/* SLA Card */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 text-brand-600" />
            </div>
            <div>
              <div className="text-[11px] font-medium text-slate-400">Thời gian phản hồi cam kết</div>
              <div className="text-sm font-bold text-slate-900">Trong vòng 2 giờ làm việc</div>
            </div>
          </div>

          {/* Hotline Quick Call Card */}
          <div className="rounded-2xl border border-slate-200/90 bg-slate-900 text-white p-5 shadow-xs relative overflow-hidden">
            <div className="pointer-events-none absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-brand-500/20 blur-xl" />
            <div className="relative z-10 flex items-center justify-between">
              <div>
                <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Cần hỗ trợ gấp?</div>
                <div className="text-sm font-bold text-white mt-0.5">Tổng đài Học vụ Glocal IELTS</div>
                <div className="text-xs text-brand-300 font-medium mt-1">Hoạt động 8:00 – 21:00 hàng ngày</div>
              </div>
              <a
                href="tel:0901234567"
                className="w-10 h-10 rounded-xl bg-brand-600 hover:bg-brand-500 flex items-center justify-center text-white transition-all shrink-0 shadow-xs cursor-pointer"
                title="Gọi ngay"
              >
                <PhoneCall className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* ── PROCESS SECTION: 4-Step Standardized Workflow ── */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-8 lg:p-10 shadow-xs">
        <div className="text-center max-w-xl mx-auto mb-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-[11px] font-bold uppercase tracking-wider mb-2.5">
            <span>QUY TRÌNH HỖ TRỢ</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            4 Bước Đăng Ký Thi IELTS Chuẩn Hóa
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Quy trình khép kín giúp thí sinh chuẩn bị bài bản, an tâm bước vào kỳ thi thực tế.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              step: "01",
              title: "Điền thông tin & nhu cầu",
              desc: "Cung cấp thông tin cá nhân, mục tiêu band điểm và thời gian dự kiến thi.",
            },
            {
              step: "02",
              title: "Cố vấn liên hệ hỗ trợ",
              desc: "Chuyên viên học vụ kết nối qua điện thoại / Zalo trong vòng 2 giờ làm việc.",
            },
            {
              step: "03",
              title: "Tư vấn lịch & địa điểm",
              desc: "Lựa chọn ca thi IDP hoặc BC phù hợp nhất với kế hoạch cá nhân của bạn.",
            },
            {
              step: "04",
              title: "Hoàn tất thủ tục & cẩm nang",
              desc: "Nhận xác nhận đăng ký chính thức kèm bộ tài liệu chuẩn bị phòng thi IELTS.",
            },
          ].map((item) => (
            <div
              key={item.step}
              className="flex flex-col p-5 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-brand-200 hover:shadow-xs transition-all relative group"
            >
              <div className="text-2xl font-black text-brand-600/30 group-hover:text-brand-600 transition-colors mb-2">
                {item.step}
              </div>
              <h3 className="text-sm font-bold text-slate-900 mb-1.5">{item.title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

