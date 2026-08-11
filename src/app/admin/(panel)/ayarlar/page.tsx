import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/current";
import { Panel, SectionTitle } from "@/components/Ui";
import {
  AddPlayerForm,
  BudgetForm,
  PlayerAdmin,
  ScoringForm,
  SeasonForm,
} from "./SettingsForms";

export const metadata: Metadata = { title: "Ayarlar · Admin" };

export default async function AdminAyarlarPage() {
  const state = await requireAdmin();
  const s = state.config.scoring;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <header>
        <h1 className="text-3xl font-black uppercase leading-none tracking-tight text-chalk">
          Ayarlar
        </h1>
        <p className="mt-1 text-xs text-chalk-faint">
          Buradaki her sayı kurallar sayfasına da anında yansır.
        </p>
      </header>

      <Panel>
        <SectionTitle>Sezon</SectionTitle>
        <SeasonForm current={state.seasonName} />
      </Panel>

      <Panel>
        <SectionTitle>Bütçe</SectionTitle>
        <BudgetForm current={state.config.budget} />
      </Panel>

      <Panel>
        <SectionTitle hint="Reyting basamakları kod içinde tanımlı; bunlar tek tek puanlar">
          Puanlama
        </SectionTitle>
        <ScoringForm
          initial={{
            played: s.played,
            noShow: s.noShow,
            win: s.win,
            draw: s.draw,
            loss: s.loss,
            mvp: s.mvp,
            captainMultiplier: s.captainMultiplier,
            promoMultiplier: s.promoMultiplier,
            promoDiscount: s.promoDiscount,
            promoCount: s.promoCount,
            goalGK: s.goal.GK,
            goalDEF: s.goal.DEF,
            goalMID: s.goal.MID,
            goalFWD: s.goal.FWD,
          }}
        />
      </Panel>

      <Panel>
        <SectionTitle hint="Fiyat, mevki, havuzdan çıkarma ve hesap sıfırlama">
          Oyuncular ({state.players.length})
        </SectionTitle>
        <PlayerAdmin
          players={state.players}
          registeredPlayerIds={state.managers.map((m) => m.playerId)}
        />
      </Panel>

      <Panel>
        <SectionTitle>Havuza oyuncu ekle</SectionTitle>
        <AddPlayerForm />
      </Panel>
    </div>
  );
}
