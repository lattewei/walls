import { site } from "@/content/site";

export function LandingHero() {
  const { headline, subhead, primaryCta, name } = site;

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
        <header className="rise flex items-center px-5 py-5 md:px-10">
          <a
            href="/"
            className="text-[1.35rem] font-medium tracking-[-0.03em] text-white"
          >
            {name}
          </a>
        </header>

        <main className="flex flex-1 flex-col items-center justify-center px-5 pb-16 pt-2 text-center">
          <h1 className="rise rise-d2 max-w-[18ch] text-balance text-[2.35rem] font-medium leading-[1.08] tracking-[-0.03em] text-white sm:text-[3.1rem] md:max-w-[22ch] md:text-[3.75rem] lg:text-[4.25rem]">
            <span className="block">{headline.before}</span>
            <span className="mt-1 block font-[family-name:var(--font-serif)] text-[1.05em] font-normal italic tracking-[-0.02em]">
              {headline.accent}
            </span>
          </h1>

          <p className="rise rise-d3 mt-5 max-w-[34rem] text-pretty text-[0.98rem] leading-relaxed text-[var(--ink-muted)] md:text-[1.05rem]">
            {subhead}
          </p>

          <a
            href={primaryCta.href}
            className="rise rise-d4 mt-8 inline-flex items-center rounded-full bg-white px-6 py-3 text-[0.95rem] font-medium text-[var(--surface-ink)] shadow-[0_10px_40px_rgba(0,0,0,0.25)] transition duration-300 hover:bg-white/92 active:scale-[0.98]"
          >
            {primaryCta.label}
          </a>
        </main>
      </div>
    </div>
  );
}
