"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

const TABS = [
  { href: "/kadro", label: "Kadrom", icon: ShirtIcon },
  { href: "/fikstur", label: "Fikstür", icon: CalendarIcon },
  { href: "/lig", label: "Lig", icon: TrophyIcon },
  { href: "/puanlar", label: "Puanlar", icon: ChartIcon },
  { href: "/havuz", label: "Havuz", icon: UsersIcon },
] as const;

export function Nav({ teamName }: { teamName: string }) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <>
      {/* Üst şerit */}
      <header className="sticky top-0 z-40 glass">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <Link href="/" className="flex items-baseline gap-2">
            <span className="text-lg font-black uppercase tracking-tight text-chalk">
              Macunköy
            </span>
            <span className="text-lg font-black uppercase tracking-tight text-neon">FL</span>
          </Link>

          <nav className="hidden gap-1 sm:flex">
            {TABS.map((tab) => (
              <Link
                key={tab.href}
                href={tab.href}
                className={`relative rounded-lg px-3 py-1.5 text-sm font-bold uppercase tracking-wide transition ${
                  isActive(tab.href) ? "text-neon" : "text-chalk-faint hover:text-chalk-dim"
                }`}
              >
                {tab.label}
                {isActive(tab.href) && (
                  <motion.span
                    layoutId="nav-underline"
                    className="absolute inset-x-2 -bottom-0.5 h-0.5 rounded-full bg-neon"
                  />
                )}
              </Link>
            ))}
          </nav>

          <Link
            href="/profil"
            className="max-w-[9rem] truncate rounded-full bg-ink-800 px-3 py-1.5 text-xs font-bold text-chalk-dim ring-1 ring-ink-700"
          >
            {teamName}
          </Link>
        </div>
      </header>

      {/* Alt sekme çubuğu — mobil */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 glass pb-[env(safe-area-inset-bottom)] sm:hidden"
        aria-label="Ana gezinme"
      >
        <ul className="mx-auto flex max-w-3xl">
          {TABS.map((tab) => {
            const active = isActive(tab.href);
            const Icon = tab.icon;
            return (
              <li key={tab.href} className="flex-1">
                <Link
                  href={tab.href}
                  className={`flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-bold uppercase tracking-wide transition ${
                    active ? "text-neon" : "text-chalk-faint"
                  }`}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon className="h-5 w-5" />
                  {tab.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}

type IconProps = { className?: string };

function CalendarIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" strokeLinecap="round" />
    </svg>
  );
}

function ChartIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" strokeLinecap="round" />
    </svg>
  );
}

function ShirtIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M9 3 4 5.5 5.5 10 8 9.2V21h8V9.2l2.5.8L20 5.5 15 3a3 3 0 0 1-6 0Z" strokeLinejoin="round" />
    </svg>
  );
}

function TrophyIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M7 4h10v5a5 5 0 0 1-10 0z" strokeLinejoin="round" />
      <path d="M7 5H4v2a3 3 0 0 0 3 3M17 5h3v2a3 3 0 0 1-3 3M10 14h4l.5 3.5h-5z M8 21h8" strokeLinejoin="round" />
    </svg>
  );
}

function UsersIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 20a6 6 0 0 1 12 0M16 5.5a3 3 0 0 1 0 5.5M17.5 20a5.5 5.5 0 0 0-2-4.3" strokeLinecap="round" />
    </svg>
  );
}
