import Link from "next/link";

const socialLinks = [
  { label: "Facebook", href: "https://facebook.com", text: "f" },
  { label: "Twitter", href: "https://twitter.com", text: "t" },
  { label: "Instagram", href: "https://instagram.com", text: "IG" },
  { label: "YouTube", href: "https://youtube.com", text: "▶" },
];

export default function PublicSiteFooter() {
  return (
    <footer className="bg-indigo-950 text-white mt-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Column 1 */}
          <div className="space-y-4">
            <div className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
              {/* circular logo (placeholder) */}
              <img
                src="/logo/logo-gi.svg"
                alt="Glocal IELTS GI"
                className="w-10 h-10 object-contain rounded-full"
              />
            </div>
            <p className="text-sm text-white/80 leading-relaxed">
              Từ học IELTS đến phát triển thành công dân toàn cầu, người có suy nghĩ toàn cầu và hành động địa phương
            </p>
          </div>

          {/* Column 2 */}
          <div className="space-y-4">
            <h3 className="text-base font-bold">Về chúng tôi</h3>
            <div className="flex flex-col gap-2 text-sm text-white/80">
              <Link href="/#support-register-form" className="hover:text-yellow-200 transition-colors">
                Hỗ trợ
              </Link>
              <Link href="/courses" className="hover:text-yellow-200 transition-colors">
                Khóa học
              </Link>
              <Link href="/#mentoring" className="hover:text-yellow-200 transition-colors">
                Cố vấn
              </Link>
            </div>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-full border border-yellow-300/60 bg-yellow-300/10 px-4 py-2 text-sm font-semibold text-yellow-200 hover:bg-yellow-300/15 transition-colors"
            >
              Language: Vietnam
            </button>
          </div>

          {/* Column 3 */}
          <div className="space-y-4">
            <h3 className="text-base font-bold">Thông tin công ty</h3>
            <div className="text-sm text-white/80 space-y-2 leading-relaxed">
              <p>Công ty Cổ phần Amazing Group</p>
              <p>118/40 Bạch Đằng, Phường 24, Bình Thạnh, TP. HCM</p>
              <p>
                MST: <span className="font-semibold text-white/90">031 440 5624</span>
              </p>
            </div>
          </div>

          {/* Column 4 */}
          <div className="space-y-4">
            <h3 className="text-base font-bold">Địa chỉ</h3>
            <div className="text-sm text-white/80 space-y-2 leading-relaxed">
              <p>Hotline: 028 6686 0602 – 0937 728 043</p>
              <p>Email: glocalielts@gmail.com</p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              {socialLinks.map(({ label, href, text }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={label}
                  className="w-10 h-10 rounded-full bg-yellow-400 text-indigo-950 flex items-center justify-center hover:bg-yellow-300 transition-colors"
                >
                  <span className="font-bold leading-none text-sm" aria-hidden>
                    {text}
                  </span>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 flex flex-col sm:flex-row items-center sm:justify-between gap-3">
          <p className="text-xs sm:text-sm text-white/70">Copyright © Glocal IELTS | All Rights Reserved</p>
          <div className="flex flex-wrap items-center justify-center sm:justify-end gap-x-4 gap-y-2 text-xs sm:text-sm text-white/70">
            <a href="#" className="hover:text-yellow-200 transition-colors">
              Student Regulations
            </a>
            <a href="#" className="hover:text-yellow-200 transition-colors">
              Teacher Regulations
            </a>
            <a href="#" className="hover:text-yellow-200 transition-colors">
              Program Participation Rules
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
