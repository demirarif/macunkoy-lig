import type { ComponentProps, ReactNode } from "react";

/** Uygulama boyunca tekrar eden küçük yüzeyler. Hepsi sunucu bileşeni. */

export function Panel({
  children,
  className = "",
  ...rest
}: ComponentProps<"section">) {
  return (
    <section
      className={`rounded-2xl bg-ink-900/70 p-4 edge-light ${className}`}
      {...rest}
    >
      {children}
    </section>
  );
}

export function SectionTitle({
  children,
  hint,
  action,
}: {
  children: ReactNode;
  hint?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div>
        <h2 className="text-lg font-extrabold uppercase tracking-wider text-chalk">
          {children}
        </h2>
        {hint && <p className="text-xs text-chalk-faint">{hint}</p>}
      </div>
      {action}
    </div>
  );
}

const BADGE_TONES = {
  neutral: "bg-ink-800 text-chalk-dim ring-ink-700",
  good: "bg-neon/15 text-neon ring-neon/30",
  bad: "bg-danger/15 text-danger ring-danger/30",
  warn: "bg-flare/15 text-flare ring-flare/30",
  cool: "bg-sky-cool/15 text-sky-cool ring-sky-cool/30",
} as const;

export function Badge({
  children,
  tone = "neutral",
  className = "",
}: {
  children: ReactNode;
  tone?: keyof typeof BADGE_TONES;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ring-1 ${BADGE_TONES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

export function Stat({
  label,
  value,
  sub,
  tone = "neutral",
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: "neutral" | "good" | "bad";
}) {
  const color =
    tone === "good" ? "text-neon" : tone === "bad" ? "text-danger" : "text-chalk";
  return (
    <div className="rounded-xl bg-ink-850/80 px-3 py-2.5 edge-light">
      <div className="text-[10px] font-bold uppercase tracking-widest text-chalk-faint">
        {label}
      </div>
      <div className={`text-2xl font-black leading-tight tabular ${color}`}>{value}</div>
      {sub && <div className="text-[11px] text-chalk-faint">{sub}</div>}
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-ink-700 px-4 py-10 text-center">
      <p className="text-sm font-bold text-chalk-dim">{title}</p>
      {children && <p className="mt-1 text-xs text-chalk-faint">{children}</p>}
    </div>
  );
}

export function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <p
      role="alert"
      className="rounded-lg bg-danger/10 px-3 py-2 text-sm font-medium text-danger ring-1 ring-danger/30"
    >
      {children}
    </p>
  );
}
