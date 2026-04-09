import PublicPageHero from "@/components/layout/PublicPageHero";
import PublicPageShell from "@/components/layout/PublicPageShell";
import SupportRegisterFormSection from "@/components/support/SupportRegisterFormSection";

export default function ConsultPage() {
  return (
    <PublicPageShell
      hero={
        <PublicPageHero
          title="Tư vấn đăng ký thi IELTS"
          subtitle="Điền thông tin để nhận tư vấn & hỗ trợ đăng ký thi."
          eyebrow="Glocal IELTS · Amazing Group"
        />
      }
    >
      <SupportRegisterFormSection />
    </PublicPageShell>
  );
}

