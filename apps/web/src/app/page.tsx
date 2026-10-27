import { site } from "@/content/site";

export default function HomePage() {
  const { headline, subhead, primaryCta } = site;

  return (
    <div className="landing">
      <div className="landing__bg" aria-hidden>
        <img
          src={site.backgroundImage}
          alt=""
          decoding="async"
          width={1024}
          height={576}
        />
      </div>
      <div className="landing__inner">
        <h1>
          <span>{headline.before}</span>
          <span>{headline.accent}</span>
        </h1>
        <p>{subhead}</p>
        <a href={primaryCta.href} className="btn landing__cta">
          {primaryCta.label}
        </a>
      </div>
    </div>
  );
}
