"use client";
import PageWrapper from "@/components/layouts/PageWrapper";
import { Card } from "@/components/ui/Card";
import { BrandMarks } from "@/components/ui/Logo";
import { BookOpen, GraduationCap, Sparkles, Target } from "lucide-react";

function DiamondTitle({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="text-sm font-bold text-gray-900 mt-5 mb-2 flex items-start gap-2.5">
      <span className="text-brand-600 shrink-0 text-base leading-none mt-0.5" aria-hidden>
        ◆
      </span>
      <span>{children}</span>
    </h4>
  );
}

const BRANCHES = [
  {
    key: "pre",
    title: "Pre-IELTS",
    icon: BookOpen,
    meta: "3 tháng · THCS",
    description: "Nền tảng 4 kỹ năng, nội dung biên soạn từ SGK tiếng Anh.",
  },
  {
    key: "u15",
    title: "U15 IELTS",
    icon: GraduationCap,
    meta: "4 năm · 8 học kỳ · THCS",
    description: "Tiếp thu tự nhiên, lý thuyết kết hợp hoạt động giải trí theo lứa tuổi.",
  },
  {
    key: "u18",
    title: "U18 IELTS",
    icon: Target,
    meta: "1 năm",
    description: "Hoàn thiện kỹ năng & luyện thi IELTS, giáo trình bài bản.",
  },
] as const;

export default function AdminCurriculumPage() {
  return (
    <PageWrapper>
      <div className="w-full space-y-6">
        <div className="page-header mb-0">
          <h1 className="page-title">Chương trình</h1>
          <p className="page-subtitle">Thông tin nổi bật và giới thiệu chương trình Glocal IELTS</p>
        </div>

        {/* Hero — cùng full width với các Card bên dưới, màu brand khớp admin */}
        <Card className="overflow-hidden p-0 border border-gray-100">
          <div className="relative bg-linear-to-br from-brand-950 via-brand-900 to-brand-800 px-6 py-8 sm:px-8 sm:py-9 text-white">
            <div
              className="absolute inset-0 opacity-[0.15] pointer-events-none"
              style={{
                backgroundImage:
                  "radial-gradient(ellipse 80% 60% at 20% 0%, rgb(255 255 255 / 0.35), transparent 55%), radial-gradient(ellipse 70% 50% at 100% 100%, rgb(129 140 248 / 0.4), transparent 50%)",
              }}
            />
            <div className="relative flex flex-col lg:flex-row lg:items-stretch lg:justify-between gap-8">
              <div className="flex items-start gap-4 min-w-0">
                <div
                  className="rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center gap-2 px-3 py-2.5 shrink-0 shadow-sm"
                  title="Glocal IELTS · Amazing Group"
                >
                  <BrandMarks light size="lg" className="gap-2.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.18em] text-brand-200/95">
                    Amazing Group
                  </p>
                  <p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mt-1">GLOCAL IELTS</p>
                  <p className="text-sm text-brand-100/95 mt-1.5 font-medium">From IELTS to Local Impact</p>
                </div>
              </div>
              <div className="lg:max-w-md lg:border-l lg:border-white/15 lg:pl-8 flex items-start gap-3 shrink-0">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4 text-brand-200" />
                </div>
                <p className="text-sm text-brand-50/95 leading-relaxed pt-0.5">
                  <span className="font-semibold text-white">Học mà chơi — chơi mà học:</span> video bài giảng kết hợp thực
                  hành giải trí, phù hợp học sinh địa phương.
                </p>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6 sm:p-8 border border-gray-100">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 pb-5 border-b border-gray-100">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-brand-600 mb-1.5">Thông tin nổi bật</p>
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">Giới thiệu chương trình</h2>
            </div>
            <span className="inline-flex items-center rounded-full bg-brand-50 text-brand-800 text-xs font-semibold px-3 py-1.5 border border-brand-100 w-fit">
              Cam kết đầu ra tối thiểu 4.0
            </span>
          </div>

          <div className="text-sm text-gray-700 space-y-4 leading-relaxed mt-6">
            <p>
              <strong className="text-gray-900">Glocal IELTS</strong> là chương trình học tiếng Anh trực tuyến có người
              hướng dẫn với cam kết đầu ra thấp nhất là 4.0, đặc biệt hướng tới các bạn học sinh vùng địa phương. Đây chính
              là cánh cửa giúp các bạn mở ra những cơ hội phát triển bản thân và nghề nghiệp trong tương lai. Chương trình được
              thiết kế với phương pháp:{" "}
              <strong className="text-gray-900">“Học mà chơi — chơi mà học”</strong> qua các video bài giảng kết hợp với
              thực hành giải trí, phù hợp với tính cách năng động của học sinh ở nhiều địa phương.
            </p>
          </div>

          <p className="text-sm font-semibold text-gray-900 mt-8 mb-3">Cấu trúc — 3 chương trình nhánh</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
            {BRANCHES.map(({ key, title, icon: Icon, meta, description }) => (
              <div
                key={key}
                className="group rounded-xl border border-gray-200 bg-linear-to-b from-white to-gray-50/80 p-4 sm:p-5 text-left shadow-sm transition-all duration-200 hover:border-brand-200 hover:shadow-md focus-within:ring-2 focus-within:ring-brand-500/25 focus-within:border-brand-300 outline-none"
                tabIndex={0}
                role="article"
                aria-label={title}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center text-brand-700 group-hover:bg-brand-600 group-hover:text-white transition-colors">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-gray-900 text-sm">{title}</h3>
                    <p className="text-xs text-brand-700 font-medium mt-0.5">{meta}</p>
                  </div>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6 sm:p-8 border border-gray-100">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 pb-3 border-b border-gray-100 flex items-center gap-2">
            <span className="w-1 h-6 rounded-full bg-brand-600 shrink-0" aria-hidden />
            Vì sao nên chọn Glocal IELTS?
          </h2>

          <h3 className="text-base font-bold text-gray-900 mt-6 flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-100 text-brand-700 text-xs font-extrabold shrink-0">
              1
            </span>
            Phương pháp học mới lạ
          </h3>
          <DiamondTitle>Cá nhân hóa lộ trình học</DiamondTitle>
          <ul className="list-disc pl-5 text-sm text-gray-700 space-y-2 leading-relaxed marker:text-brand-500">
            <li>
              Lớp học nhỏ, đảm bảo hiệu quả (học viên học 1-1 với giáo viên hoặc học nhóm, tối đa 5 bạn/nhóm).
            </li>
            <li>Mỗi học viên được thiết kế lộ trình riêng, phát huy ưu điểm, hạn chế nhược điểm.</li>
            <li>
              Rèn luyện toàn diện 4 kỹ năng <strong className="text-gray-800">Nghe — Nói — Đọc — Viết</strong>.
            </li>
            <li>Đội ngũ học vụ và giáo viên theo sát học viên, đảm bảo đầu ra theo đúng cam kết.</li>
          </ul>

          <DiamondTitle>Không có bài tập về nhà</DiamondTitle>
          <ul className="list-disc pl-5 text-sm text-gray-700 space-y-2 leading-relaxed marker:text-brand-500">
            <li>
              Học viên chủ động học kiến thức trước buổi học nhờ các video{" "}
              <strong className="text-gray-800">Before Lesson</strong>, hình thành tự học và tư duy phản biện.
            </li>
            <li>Thời gian trên lớp dành cho luyện tập, sửa lỗi và nâng cao kỹ năng cùng giáo viên.</li>
            <li>
              Tối ưu thời lượng buổi học, mở rộng không gian luyện tập để đạt mục tiêu trong khuôn khổ 1 năm.
            </li>
          </ul>

          <h3 className="text-base font-bold text-gray-900 mt-8 flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-100 text-brand-700 text-xs font-extrabold shrink-0">
              2
            </span>
            Ứng dụng công nghệ hiện đại
          </h3>
          <DiamondTitle>Hệ thống video bài giảng sống động</DiamondTitle>
          <ul className="list-disc pl-5 text-sm text-gray-700 space-y-2 leading-relaxed marker:text-brand-500">
            <li>Video phục vụ học trước buổi học; trong buổi học học viên vẫn nhận hỗ trợ 100% từ giáo viên.</li>
            <li>Thống nhất nội dung học thuật, slide trình bày khoa học và thẩm mỹ.</li>
            <li>
              Video bổ trợ mô phỏng phương pháp học, đề thi thực tế và hoạt động giải trí tiếng Anh, truyền cảm hứng luyện
              IELTS.
            </li>
            <li>
              Gameshow tiếng Anh kiểu “học mà chơi” có sự tham gia của nghệ sĩ/nhân vật nổi tiếng, do{" "}
              <strong className="text-gray-800">Amazing Group</strong> sản xuất.
            </li>
          </ul>

          <DiamondTitle>Nền tảng quản trị lớp học tiên tiến</DiamondTitle>
          <ul className="list-disc pl-5 text-sm text-gray-700 space-y-2 leading-relaxed marker:text-brand-500">
            <li>
              Sử dụng hệ thống <strong className="text-gray-800">Center Online</strong> để quản lý lớp và đăng tải bài học.
            </li>
            <li>Học viên và phụ huynh dễ dàng theo dõi tiến độ học tập.</li>
            <li>Học viên thuận tiện hoàn thành bài tập và các bài kiểm tra định kỳ.</li>
            <li>
              Nâng cao khả năng tiếp thu bài trên lớp nhờ hệ thống <strong className="text-gray-800">E-learning</strong> tích
              hợp, chuẩn bị bài trước ở nhà với các bài tập Before Lesson.
            </li>
          </ul>
        </Card>
      </div>
    </PageWrapper>
  );
}
