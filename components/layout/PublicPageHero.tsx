type PublicPageHeroProps = {
  title: string;
  subtitle?: string;
  /** Nhãn nhỏ phía trên tiêu đề (mặc định giống landing) */
  eyebrow?: string;
};

export default function PublicPageHero({ title, subtitle, eyebrow = "Glocal IELTS · Amazing Group" }: PublicPageHeroProps) {
  return (
    <section className="relative overflow-hidden border-b border-brand-900/30 bg-gradient-to-br from-brand-950 via-brand-900 to-indigo-950 text-white">
      <div className="pointer-events-none absolute inset-0 opacity-40 bg-[radial-gradient(ellipse_90%_60%_at_50%_-10%,rgba(129,140,248,0.45),transparent)]" />
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-12 md:py-14">
        <p className="text-xs sm:text-sm font-semibold uppercase tracking-[0.18em] text-brand-200/95 mb-3">{eyebrow}</p>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-tight tracking-tight text-white max-w-3xl">{title}</h1>
        {subtitle ? <p className="mt-3 text-sm sm:text-base text-brand-100/90 max-w-2xl leading-relaxed">{subtitle}</p> : null}
      </div>
    </section>
  );
}
