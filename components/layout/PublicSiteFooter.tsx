import Link from "next/link";

const COLUMNS = [
  {
    title: "Sản phẩm & Khảo thí",
    links: [
      { label: "Khóa học IELTS", href: "/courses" },
      { label: "Luyện Speaking 1-on-1", href: "/courses" },
      { label: "Phòng thi thử 4 kỹ năng", href: "/thi-thu" },
      { label: "Đăng ký thi IDP / BC", href: "/consult" },
      { label: "Lộ trình học cá nhân", href: "/courses" },
    ],
  },
  {
    title: "Hỗ trợ học thuật",
    links: [
      { label: "Hướng dẫn làm bài thi", href: "#" },
      { label: "Cổng học tập học viên", href: "/student/dashboard" },
      { label: "Cổng dành cho giảng viên", href: "/teacher/classes" },
      { label: "Chính sách bảo mật", href: "#" },
      { label: "Điều khoản sử dụng", href: "#" },
    ],
  },
  {
    title: "Về chúng tôi",
    links: [
      { label: "Giới thiệu Glocal IELTS", href: "#" },
      { label: "Đội ngũ giảng viên", href: "#" },
      { label: "Đối tác khảo thí quốc tế", href: "#" },
      { label: "Tin tức & Hoạt động", href: "#" },
      { label: "Liên hệ hợp tác", href: "/contact" },
    ],
  },
  {
    title: "Liên hệ & Địa chỉ",
    links: [
      { label: "Hotline: 028 6686 0602", href: "tel:02866860602" },
      { label: "glocalielts@gmail.com", href: "mailto:glocalielts@gmail.com" },
      { label: "118/40 Bạch Đằng, P.24, Q.Bình Thạnh, TP.HCM", href: "#" },
      { label: "Giờ làm việc: 08:00 – 21:00 (T2–CN)", href: "#" },
    ],
  },
];

export default function PublicSiteFooter() {
  return (
    <footer className="bg-slate-950 text-slate-400 border-t border-slate-800/80">
      {/* Subtle top accent line */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-brand-500/30 to-transparent" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        {/* ── TOP ROW ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-8 mb-10">
          {/* Brand column */}
          <div className="col-span-2 sm:col-span-4 lg:col-span-1">
            <div className="flex items-center gap-2.5 mb-3">
              <img src="/logo/logo-ag.svg" alt="AG" className="w-6 h-6 object-contain" />
              <img src="/logo/logo-gi.svg" alt="Glocal IELTS" className="w-6 h-6 object-contain" />
              <div className="flex flex-col">
                <span className="text-xs font-bold text-white tracking-tight leading-none">Glocal IELTS</span>
                <span className="text-[9px] font-medium text-slate-400 leading-none mt-0.5">Amazing Group</span>
              </div>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed mb-4 max-w-xs">
              Hệ thống đào tạo và khảo thí IELTS chuẩn quốc tế, đồng hành cùng học viên và giảng viên bứt phá mục tiêu.
            </p>
            {/* Social */}
            <div className="flex items-center gap-2">
              {[
                {
                  label: "Facebook",
                  href: "https://facebook.com",
                  icon: (
                    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor">
                      <path d="M18.77 7.46H14.5v-1.9c0-.9.6-1.1 1-1.1h3V.5h-4.33C10.24.5 9.5 3.44 9.5 5.32v2.15h-3v4h3v12h5v-12h3.85l.42-4z" />
                    </svg>
                  ),
                },
                {
                  label: "TikTok",
                  href: "https://tiktok.com",
                  icon: (
                    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor">
                      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.27 8.27 0 004.84 1.55V6.79a4.85 4.85 0 01-1.07-.1z" />
                    </svg>
                  ),
                },
                {
                  label: "YouTube",
                  href: "https://youtube.com",
                  icon: (
                    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor">
                      <path d="M23.5 6.19a3.02 3.02 0 00-2.12-2.14C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.38.55A3.02 3.02 0 00.5 6.19 31.4 31.4 0 000 12a31.4 31.4 0 00.5 5.81 3.02 3.02 0 002.12 2.14C4.5 20.5 12 20.5 12 20.5s7.5 0 9.38-.55a3.02 3.02 0 002.12-2.14A31.4 31.4 0 0024 12a31.4 31.4 0 00-.5-5.81zM9.6 15.6V8.4L15.8 12l-6.2 3.6z" />
                    </svg>
                  ),
                },
                {
                  label: "Instagram",
                  href: "https://instagram.com",
                  icon: (
                    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor">
                      <path d="M12 2.16c3.2 0 3.58.01 4.85.07 3.25.15 4.77 1.69 4.92 4.92.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.15 3.23-1.69 4.77-4.92 4.92-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-3.23-.15-4.77-1.69-4.92-4.92C2.22 15.58 2.2 15.2 2.2 12s.01-3.58.07-4.85C2.43 3.83 3.97 2.31 7.2 2.16 8.47 2.1 8.86 2.1 12 2.1zm0 1.8c-3.17 0-3.56.01-4.8.07-1.2.06-2.08.27-2.82.58-.77.32-1.43.76-2.08 1.41-.65.65-1.09 1.31-1.41 2.08-.31.74-.52 1.62-.58 2.82-.06 1.24-.07 1.63-.07 4.8s.01 3.56.07 4.8c.06 1.2.27 2.08.58 2.82.32.77.76 1.43 1.41 2.08.65.65 1.31 1.09 2.08 1.41.74.31 1.62.52 2.82.58 1.24.06 1.63.07 4.8.07s3.56-.01 4.8-.07c1.2-.06 2.08-.27 2.82-.58.77-.32 1.43-.76 2.08-1.41.65-.65 1.09-1.31 1.41-2.08.31-.74.52-1.62.58-2.82.06-1.24.07-1.63.07-4.8s-.01-3.56-.07-4.8c-.06-1.2-.27-2.08-.58-2.82-.32-.77-.76-1.43-1.41-2.08-.65-.65-1.31-1.09-2.08-1.41-.74-.31-1.62-.52-2.82-.58C15.56 2.97 15.17 2.96 12 2.96zm0 2.44a5.2 5.2 0 100 10.4 5.2 5.2 0 000-10.4zm0 1.62a3.58 3.58 0 110 7.16 3.58 3.58 0 010-7.16zm5.92-3.98a1.34 1.34 0 100 2.68 1.34 1.34 0 000-2.68z" />
                    </svg>
                  ),
                },
              ].map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={s.label}
                  className="w-8 h-8 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
                >
                  {s.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 mb-3.5">{col.title}</h3>
              <div className="flex flex-col gap-2.5">
                {col.links.map((link) => (
                  <Link
                    key={link.label}
                    href={link.href}
                    className="text-xs text-slate-400 hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Divider & Copyright */}
        <div className="border-t border-slate-900 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© 2026 Glocal IELTS | Amazing Group. Bảo lưu mọi quyền.</p>
          <div className="flex items-center gap-4">
            <Link href="#" className="hover:text-slate-300 transition-colors">Chính sách bảo mật</Link>
            <Link href="#" className="hover:text-slate-300 transition-colors">Điều khoản dịch vụ</Link>
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="hover:text-slate-300 transition-colors cursor-pointer"
            >
              Về đầu trang ↑
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
