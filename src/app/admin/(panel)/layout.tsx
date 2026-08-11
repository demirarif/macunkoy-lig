import Link from "next/link";
import { requireAdmin } from "@/lib/auth/current";
import { adminLogoutAction } from "./actions";

export const dynamic = "force-dynamic";

const LINKS = [
  { href: "/admin", label: "Fikstür" },
  { href: "/admin/veriler", label: "Veriler" },
  { href: "/admin/puanlar", label: "Puanlar" },
  { href: "/admin/ayarlar", label: "Ayarlar" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-40 glass">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 px-4">
          <Link href="/admin" className="text-lg font-black uppercase tracking-tight text-flare">
            Admin
          </Link>
          <nav className="flex gap-0.5 overflow-x-auto no-scrollbar">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-bold uppercase tracking-wide text-chalk-dim hover:bg-ink-800"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <form action={adminLogoutAction}>
            <button
              type="submit"
              className="shrink-0 text-xs font-bold uppercase tracking-wide text-chalk-faint hover:text-danger"
            >
              Çıkış
            </button>
          </form>
        </div>
      </header>
      {/* Geniş: sezon tablosu 37 satır × hafta sütunlarını yan yana gösterebilsin. */}
      <main className="mx-auto w-full max-w-6xl px-3 pb-16 pt-5 sm:px-4">{children}</main>
    </div>
  );
}
