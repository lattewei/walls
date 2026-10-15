import { initials, sleeveFrom } from "@/lib/cover";

export function Sleeve({
  seed,
  label,
  className = "",
  size = "md",
}: {
  seed: string;
  label?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const mark = size === "sm" ? "text-sm" : size === "lg" ? "text-5xl md:text-7xl" : "text-2xl";
  return (
    <div
      className={`sleeve ${className}`}
      style={sleeveFrom(seed)}
      aria-hidden={label ? undefined : true}
    >
      {label ? (
        <span
          className={`absolute bottom-3 left-3 font-[family-name:var(--font-display)] font-semibold tracking-tight text-white/90 ${mark}`}
        >
          {initials(label)}
        </span>
      ) : null}
    </div>
  );
}
