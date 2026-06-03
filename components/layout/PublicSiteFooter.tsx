import Link from "next/link";

const COLUMNS = [
  {
    title: "Sản phẩm",
    links: [
      { label: "Khóa học IELTS", href: "/courses" },
      { label: "Luyện kỹ năng", href: "/courses" },
      { label: "Luyện đề thi thử", href: "/thi-thu" },
      { label: "Tư vấn đăng ký thi", href: "/consult" },
      { label: "Bảng giá", href: "/courses" },
    ],
  },
  {
    title: "Hỗ trợ",
    links: [
      { label: "Câu hỏi thường gặp", href: "#" },
      { label: "Hướng dẫn sử dụng", href: "#" },
      { label: "Chính sách bảo mật", href: "#" },
      { label: "Điều khoản sử dụng", href: "#" },
    ],
  },
  {
    title: "Về chúng tôi",
    links: [
      { label: "Giới thiệu", href: "#" },
      { label: "Đội ngũ giảng viên", href: "#" },
      { label: "Tin tức & Sự kiện", href: "#" },
      { label: "Liên hệ hợp tác", href: "/contact" },
    ],
  },
  {
    title: "Liên hệ",
    links: [
      { label: "Hotline: 028 6686 0602", href: "tel:02866860602" },
      { label: "glocalielts@gmail.com", href: "mailto:glocalielts@gmail.com" },
      { label: "118/40 Bạch Đằng, P.24, Q.Bình Thạnh, TP.HCM", href: "#" },
      { label: "T2–CN: 08:00–21:00", href: "#" },
    ],
  },
];

export default function PublicSiteFooter() {
  return (
    <footer
      className="text-white/70"
      style={{ background: "#111827" }}
    >
      {/* Top accent line */}
      <div className="h-0.5 w-full" style={{ background: "linear-gradient(90deg,#6C63FF,#8B5CF6,#A78BFA)" }} />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        {/* ── TOP ROW ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-8 mb-8">
          {/* Brand column */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <img src="/logo/logo-ag.svg" alt="AG" className="w-7 h-7 object-contain" />
              <img src="/logo/logo-gi.svg" alt="Glocal IELTS" className="w-7 h-7 object-contain" />
              <span className="text-sm font-bold text-white">Glocal IELTS</span>
            </div>
            <p className="text-xs text-white/40 leading-relaxed mb-3">
              Nền tảng luyện thi IELTS chính thức, đồng hành cùng bạn từ học tập đến chinh phục mục tiêu.
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
                  className="w-7 h-7 rounded-lg bg-white/8 flex items-center justify-center hover:bg-white/15 hover:text-white transition-all"
                >
                  {s.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h3 className="text-xs font-semibold text-white mb-3">{col.title}</h3>
              <div className="flex flex-col gap-2">
                {col.links.map((link) => (
                  <Link
                    key={link.label}
                    href={link.href}
                    className="text-xs text-white/50 hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="border-t border-white/8 pt-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-white/30">
            © 2026 Glocal IELTS | Amazing Group. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <a href="#" className="text-xs text-white/30 hover:text-white/60 transition-colors">Chính sách bảo mật</a>
            <a href="#" className="text-xs text-white/30 hover:text-white/60 transition-colors">Điều khoản</a>
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="text-xs text-white/30 hover:text-white/60 transition-colors cursor-pointer"
            >
              Quay lên trên ↑
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
