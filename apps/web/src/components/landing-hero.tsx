import { site } from "@/content/site";

function Avatar({ label, src }: { label: string; src?: string }) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        className="h-6 w-6 rounded-full object-cover"
      />
    );
  }
  const initial = label.trim().charAt(0).toUpperCase() || "•";
  return (
    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/15 text-[10px] font-medium">
      {initial}
    </span>
  );
}

export function LandingHero() {
  const { nav, navCta, badge, headline, subhead, primaryCta, socialProof, name } =
    site;

  return (
    <div className="landing-root relative h-[100dvh] w-full overflow-hidden text-[var(--ink)]">
      <div className="hero-bg" aria-hidden>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="hero-bg__img"
          src={site.backgroundImage}
          alt=""
          decoding="async"
          width={1024}
          height={576}
        />
        <div className="hero-bg__vignette" />
      </div>

      <div className="relative z-10 flex h-full flex-col">
        {/* Nav */}
        <header className="rise flex items-center justify-between gap-4 px-5 py-5 md:px-10">
          <a
            href="/"
            className="text-[1.35rem] font-medium tracking-[-0.03em] text-white"
          >
            {name}
          </a>

          <nav className="hidden items-center gap-8 text-[0.92rem] text-white/80 md:flex">
            {nav.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="transition-colors duration-300 hover:text-white"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <a
            href={navCta.href}
            className="rounded-full border border-white/80 bg-white px-4 py-2 text-[0.85rem] font-medium text-[var(--surface-ink)] transition duration-300 hover:bg-white/90"
          >
            {navCta.label}
          </a>
        </header>

        {/* Center stage */}
        <main className="flex flex-1 flex-col items-center justify-center px-5 pb-6 pt-2 text-center">
          <a
            href={badge.href}
            className="rise rise-d1 inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/25 px-3 py-1.5 text-[0.8rem] text-white/90 backdrop-blur-sm transition duration-300 hover:border-white/30"
          >
            <Avatar label={badge.label} src={badge.avatar || undefined} />
            <span>{badge.label}</span>
          </a>

          <h1 className="rise rise-d2 mt-7 max-w-[18ch] text-balance text-[2.35rem] font-medium leading-[1.08] tracking-[-0.03em] text-white sm:text-[3.1rem] md:max-w-[22ch] md:text-[3.75rem] lg:text-[4.25rem]">
            <span className="block">{headline.before}</span>
            <span className="mt-1 block font-[family-name:var(--font-serif)] text-[1.05em] font-normal italic tracking-[-0.02em]">
              {headline.accent}
            </span>
          </h1>

          <p className="rise rise-d3 mt-5 max-w-[36rem] text-pretty text-[0.98rem] leading-relaxed text-[var(--ink-muted)] md:text-[1.05rem]">
            {subhead}
          </p>

          <a
            href={primaryCta.href}
            className="rise rise-d4 mt-8 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-[0.95rem] font-medium text-[var(--surface-ink)] shadow-[0_10px_40px_rgba(0,0,0,0.25)] transition duration-300 hover:bg-white/92 active:scale-[0.98]"
          >
            {primaryCta.label}
            <span
              className="inline-block h-4 w-4 rounded-[3px]"
              style={{
                background:
                  "conic-gradient(from 180deg, #4285f4, #ea4335, #fbbc05, #34a853, #4285f4)",
              }}
              aria-hidden
            />
          </a>
        </main>

        {/* Social proof */}
        <footer className="rise rise-d5 px-5 pb-8 md:px-10 md:pb-10">
          <p className="mb-4 text-center text-[0.68rem] font-medium uppercase tracking-[0.22em] text-[var(--ink-faint)]">
            {socialProof.label}
          </p>
          <ul className="mx-auto flex max-w-3xl flex-wrap items-end justify-center gap-x-12 gap-y-5 md:gap-x-16">
            {socialProof.brands.map((brand) => (
              <li key={brand.name} className="text-center">
                <a
                  href={brand.href}
                  className="group inline-flex flex-col items-center gap-1"
                >
                  <span className="text-[1.35rem] font-medium tracking-[-0.03em] text-white/90 transition group-hover:text-white md:text-[1.5rem]">
                    {brand.name}
                  </span>
                  <span className="text-[0.72rem] text-white/40 transition group-hover:text-white/60">
                    {brand.caseStudyLabel}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </footer>
      </div>
    </div>
  );
}
