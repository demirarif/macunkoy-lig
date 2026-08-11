import type { Metadata } from "next";
import Link from "next/link";
import { requireManager } from "@/lib/auth/current";
import { Panel, SectionTitle } from "@/components/Ui";
import { computeStandings } from "@/lib/services/standings";
import { formatDateTR } from "@/lib/time";
import { ChangePasswordForm, RenameTeamForm } from "./ProfileForms";
import { logoutAction } from "./actions";

export const metadata: Metadata = { title: "Profil" };

export default async function ProfilPage() {
  const { state, manager, player } = await requireManager();
  const row = computeStandings(state).find((r) => r.managerId === manager.id);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header>
        <h1 className="text-3xl font-black uppercase leading-none tracking-tight text-chalk">
          {manager.teamName ?? player.name}
        </h1>
        <p className="mt-1 text-sm text-chalk-dim">
          {player.name} · {row ? `${row.rank}. sıra, ${row.totalPoints} puan` : "henüz puan yok"}
        </p>
        <p className="text-xs text-chalk-faint">
          {formatDateTR(manager.createdAt)} tarihinden beri
        </p>
      </header>

      <Panel>
        <SectionTitle>Takım adı</SectionTitle>
        <RenameTeamForm current={manager.teamName ?? ""} />
      </Panel>

      <Panel>
        <SectionTitle hint="En az 4 karakter.">Şifre değiştir</SectionTitle>
        <ChangePasswordForm />
      </Panel>

      <Panel>
        <SectionTitle>Kurallar</SectionTitle>
        <Link
          href="/kurallar"
          className="block rounded-xl bg-ink-850 px-4 py-3 text-sm font-bold text-chalk-dim transition hover:bg-ink-800"
        >
          Puanlama, bütçe ve kaptan kurallarının tamamı →
        </Link>
      </Panel>

      <form action={logoutAction}>
        <button
          type="submit"
          className="w-full rounded-xl bg-danger/10 py-3.5 text-sm font-black uppercase tracking-widest text-danger ring-1 ring-danger/30"
        >
          Çıkış yap
        </button>
      </form>
    </div>
  );
}
