"use client";

import Button from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { AG_LANDING_VI as t } from "@/lib/ag-landing-vi";
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
    <section className="py-12 sm:py-20 bg-white border-b border-gray-200/80" aria-label="Tư vấn đăng ký">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid lg:grid-cols-5 gap-10 items-start">
          <div className="lg:col-span-2">
            <Card className="p-6 sm:p-8 border-brand-100/80 bg-slate-50/50">
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

          <div
            className="lg:col-span-3 relative min-h-[240px] rounded-2xl bg-gradient-to-br from-brand-50/80 to-slate-100 border border-brand-100/60 hidden lg:block"
            aria-hidden
          />
        </div>
      </div>
    </section>
  );
}

