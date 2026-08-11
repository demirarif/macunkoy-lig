import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth/session";
import { AdminLoginForm } from "./AdminLoginForm";

export const metadata: Metadata = { title: "Admin Girişi" };
export const dynamic = "force-dynamic";

export default async function AdminGirisPage() {
  if (await isAdmin()) redirect("/admin");

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4 py-10">
      <h1 className="mb-1 text-center text-3xl font-black uppercase tracking-tight text-chalk">
        Admin
      </h1>
      <p className="mb-6 text-center text-sm text-chalk-faint">
        Bu giriş menajer hesabından tamamen ayrıdır.
      </p>
      <AdminLoginForm />
      <a
        href="/giris"
        className="mt-8 text-center text-xs font-semibold uppercase tracking-widest text-chalk-faint hover:text-chalk-dim"
      >
        Menajer girişine dön
      </a>
    </main>
  );
}
