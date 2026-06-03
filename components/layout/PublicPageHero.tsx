type PublicPageHeroProps = {
  title: string;
  subtitle?: string;
  eyebrow?: string;
};

export default function PublicPageHero({ title, subtitle, eyebrow = "Glocal IELTS · Amazing Group" }: PublicPageHeroProps) {
  return (
    <section className="relative overflow-hidden">
      {/* Subtle divider from hero to content area */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: "linear-gradient(to bottom, transparent 0%, rgba(255,255,255,0.3) 100%)",
        }}
      />
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-12 md:py-14">
        {eyebrow ? <p className="text-xs sm:text-sm font-semibold uppercase tracking-[0.18em] text-brand-500/80 mb-3">{eyebrow}</p> : null}
        <h1 className={`text-2xl sm:text-3xl md:text-4xl font-extrabold leading-tight tracking-tight text-gray-900 max-w-3xl ${!eyebrow ? "mt-6" : ""}`}>{title}</h1>
        {subtitle ? <p className="mt-3 text-sm sm:text-base text-gray-500/80 max-w-2xl leading-relaxed">{subtitle}</p> : null}
      </div>
    </section>
  );
}
