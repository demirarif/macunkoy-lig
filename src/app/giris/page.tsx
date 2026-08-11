import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { sampleName } from "@/lib/auth/accounts";
import { getManagerId } from "@/lib/auth/session";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Giriş" };
export const dynamic = "force-dynamic";

export default async function GirisPage() {
  if (await getManagerId()) redirect("/");
  const example = await sampleName();

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-5 py-10">
      <header className="mb-9 text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.35em] text-neon">
          @macunkoyfutbol
        </p>
        <h1 className="mt-3 text-5xl font-black uppercase leading-[0.85] tracking-tight text-chalk">
          Macunköy
          <br />
          <span className="text-neon">Fantazi Ligi</span>
        </h1>
      </header>

      <LoginForm sampleName={example} />

      <footer className="mt-12 text-center">
        <Link
          href="/admin/giris"
          className="text-[11px] font-semibold uppercase tracking-[0.2em] text-chalk-faint hover:text-chalk-dim"
        >
          Admin girişi
        </Link>
      </footer>
    </main>
  );
}
