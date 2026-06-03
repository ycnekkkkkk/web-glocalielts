"use client";

import Button from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { AG_LANDING_VI as t } from "@/lib/ag-landing-vi";
import {
  Calendar,
  CheckCircle2,
  Clock,
  Globe,
  Headphones,
  MessageCircle,
  User,
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

  function submitForm(e: React.FormEvent) {
    e.preventDefault();
    if (!form.type || !form.full_name.trim() || !form.phone.trim() || !form.email.trim()) {
      toast.error("Vui lòng điền đủ các trường bắt buộc.");
      return;
    }
    toast.success(t.register_success);
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      {/* ── MAIN SECTION: Form Left + Support Right ── */}
      <div className="grid lg:grid-cols-5 gap-8 mb-12">
        {/* Left: Registration Form */}
        <div className="lg:col-span-3">
          <Card className="p-6 sm:p-8 border-brand-100/50 shadow-(--shadow-card)">
            <h2 className="text-xl font-extrabold text-gray-900 mb-6 flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-brand-600" />
              Đăng Ký Tư Vấn Miễn Phí
            </h2>

            <form onSubmit={submitForm} className="space-y-6">
              {/* Section 1: Personal info */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-400" />
                  Thông tin cá nhân
                </h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-1">
                      Họ và tên <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="full_name"
                      required
                      placeholder="Nguyễn Văn A"
                      value={form.full_name}
                      onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                      className="w-full rounded-xl border-2 border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:border-brand-400 transition-colors"
                    />
                  </div>
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                      Số điện thoại <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="phone"
                      required
                      placeholder="0901 234 567"
                      value={form.phone}
                      onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                      className="w-full rounded-xl border-2 border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:border-brand-400 transition-colors"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="email"
                      type="email"
                      required
                      placeholder="email@example.com"
                      value={form.email}
                      onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                      className="w-full rounded-xl border-2 border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:border-brand-400 transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Support needs */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-gray-400" />
                  Nhu cầu hỗ trợ
                </h3>
                <select
                  id="type"
                  required
                  value={form.type}
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                  className="w-full rounded-xl border-2 border-gray-200 px-4 py-2.5 text-sm bg-white focus:outline-none focus:border-brand-400 transition-colors"
                >
                  <option value="">Chọn nhu cầu hỗ trợ...</option>
                  <option value="Đăng ký thi IELTS">Đăng ký thi IELTS</option>
                  <option value="Tư vấn lệ phí">Tư vấn lệ phí</option>
                  <option value="Chọn địa điểm thi">Chọn địa điểm thi</option>
                  <option value="Chọn lịch thi">Chọn lịch thi</option>
                  <option value="Khác">Khác</option>
                </select>
              </div>

              {/* Section 3: Referral code */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-gray-400" />
                  Mã giới thiệu <span className="text-gray-400 font-normal">(không bắt buộc)</span>
                </h3>
                <input
                  id="code_refer"
                  placeholder="Nhập mã giới thiệu (nếu có)"
                  value={form.code_refer}
                  onChange={(e) => setForm((f) => ({ ...f, code_refer: e.target.value }))}
                  className="w-full rounded-xl border-2 border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:border-brand-400 transition-colors"
                />
              </div>

              {/* Submit */}
              <div className="flex flex-col gap-3 pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  className="w-full py-3 text-sm font-bold rounded-xl"
                >
                  Đăng ký tư vấn ngay
                </Button>
                <p className="text-center text-xs text-gray-400 flex items-center justify-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-emerald-500" viewBox="0 0 16 16" fill="none">
                    <rect x="2" y="6" width="12" height="9" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M5 6V4.5a3 3 0 016 0V6" stroke="currentColor" strokeWidth="1.5"/>
                  </svg>
                  Thông tin của bạn được bảo mật tuyệt đối
                </p>
              </div>
            </form>
          </Card>
        </div>

        {/* Right: Support Info Card */}
        <div className="lg:col-span-2 space-y-4">
          {/* Consultant profile card */}
          <Card className="p-6 border-brand-100/50 shadow-(--shadow-card)">
            <h3 className="font-extrabold text-gray-900 text-base mb-4">Glocal IELTS hỗ trợ bạn</h3>

            {/* Avatar */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-14 h-14 rounded-full bg-brand-100 flex items-center justify-center shrink-0">
                <Headphones className="w-6 h-6 text-brand-600" />
              </div>
              <div>
                <div className="font-bold text-gray-900 text-sm">IELTS Expert 8.0+</div>
                <div className="text-xs text-gray-500">Đội ngũ tư vấn viên chuyên nghiệp</div>
              </div>
            </div>

            <p className="text-sm text-gray-500 leading-relaxed mb-4">
              Đội ngũ tư vấn viên giàu kinh nghiệm sẵn sàng hỗ trợ bạn lựa chọn hình thức thi,
              địa điểm thi và thời gian phù hợp.
            </p>

            {/* Checklist */}
            <div className="space-y-2.5">
              {[
                "Tư vấn chọn hình thức thi (IDP / British Council)",
                "Tư vấn địa điểm và ngày thi phù hợp",
                "Hướng dẫn thủ tục đăng ký chi tiết",
                "Giải đáp lệ phí và chính sách liên quan",
                "Hỗ trợ trước ngày thi nếu cần",
              ].map((item) => (
                <div key={item} className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span className="text-xs text-gray-600 leading-relaxed">{item}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Response time card */}
          <Card className="p-5 border-brand-100/50 shadow-(--shadow-card)">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5 text-brand-600" />
              </div>
              <div>
                <div className="text-xs text-gray-500">Thời gian phản hồi</div>
                <div className="font-bold text-gray-900 text-sm">Trong vòng 2 giờ làm việc</div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* ── PROCESS SECTION: 4-step timeline ── */}
      <Card className="p-8 border-brand-100/50 shadow-(--shadow-card)">
        <h2 className="text-xl font-extrabold text-gray-900 mb-8 text-center">
          Quy Trình Tư Vấn & Hỗ Trợ
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
          {[
            {
              step: "01",
              icon: <MessageCircle className="w-6 h-6 text-brand-600" />,
              title: "Điền thông tin",
              desc: "Cung cấp thông tin và nhu cầu hỗ trợ.",
            },
            {
              step: "02",
              icon: <Headphones className="w-6 h-6 text-brand-600" />,
              title: "Nhân viên liên hệ",
              desc: "Liên hệ trong vòng 2 giờ làm việc.",
            },
            {
              step: "03",
              icon: <Calendar className="w-6 h-6 text-brand-600" />,
              title: "Tư vấn & chọn lịch thi",
              desc: "Lựa chọn địa điểm và thời gian phù hợp.",
            },
            {
              step: "04",
              icon: <CheckCircle2 className="w-6 h-6 text-brand-600" />,
              title: "Hoàn tất đăng ký",
              desc: "Hướng dẫn hoàn tất thủ tục thi IELTS.",
            },
          ].map((item, i) => (
            <div key={item.step} className="flex flex-col items-center text-center gap-3 relative">
              {/* Connector line */}
              {i < 3 && (
                <div className="hidden xl:block absolute top-6 left-[calc(50%+32px)] w-[calc(100%-64px)] h-px bg-brand-100 z-0" />
              )}
              {/* Step number */}
              <div className="w-12 h-12 rounded-2xl bg-brand-50 border-2 border-brand-100 flex items-center justify-center relative z-10">
                {item.icon}
              </div>
              <div className="text-[10px] font-bold text-brand-400 tracking-widest">{item.step}</div>
              <h3 className="font-bold text-gray-900 text-sm">{item.title}</h3>
              <p className="text-xs text-gray-500 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
