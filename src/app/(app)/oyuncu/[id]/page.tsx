import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireManager } from "@/lib/auth/current";
import { currentGameweek, lastCompletedGameweek } from "@/lib/db/state";
import { effectivePrice } from "@/lib/domain/scoring";
import { SLOT_LABEL_LONG } from "@/lib/domain/types";
import { ownershipFor, playerSeasonStats, completedGameweeks } from "@/lib/services/standings";
import { PlayerCard } from "@/components/PlayerCard";
import { TrendChart } from "@/components/TrendChart";
import { Badge, EmptyState, Panel, SectionTitle, Stat } from "@/components/Ui";
import { TIER_STYLES, tierFor } from "@/lib/ui/tiers";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { state } = await requireManager();
  const { id } = await params;
  const player = state.players.find((p) => p.id === id);
  return { title: player?.name ?? "Oyuncu" };
}

export default async function OyuncuPage({ params }: { params: Promise<{ id: string }> }) {
  const { state } = await requireManager();
  const { id } = await params;
  const player = state.players.find((p) => p.id === id);
  if (!player) notFound();

  const gw = currentGameweek(state);
  const stats = playerSeasonStats(state, player.id);
  const settled = lastCompletedGameweek(state);
  const ownership = settled ? (ownershipFor(state, settled.id).get(player.id) ?? 0) : 0;
  const weeks = completedGameweeks(state);
  const tier = TIER_STYLES[tierFor(player.price)];
  const isPromo = gw.promoPlayerIds.includes(player.id);
  const totalWeeks = stats.appearances + stats.missed;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex items-start gap-4">
        <PlayerCard
          player={player}
          size="lg"
          isPromo={isPromo}
          displayPrice={effectivePrice(player, gw, state.config.scoring)}
        />
        <div className="min-w-0 flex-1 pt-1">
          <h1 className="text-3xl font-black uppercase leading-none tracking-tight text-chalk">
            {player.name}
          </h1>
          <p className="mt-1 text-sm text-chalk-dim">
            {player.slots.map((s) => SLOT_LABEL_LONG[s]).join(" · ")}
          </p>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            <Badge tone="neutral">{tier.label}</Badge>
            {isPromo && <Badge tone="warn">Kampanyada</Badge>}
            {player.dualKeeper && <Badge tone="cool">Kaleci / Oyuncu</Badge>}
            {ownership > 0 && <Badge tone="good">%{ownership} menajerde</Badge>}
          </div>
        </div>
      </div>

      {player.dualKeeper && (
        <Panel className="border border-flare/25">
          <SectionTitle hint="Kadroya koyarken hangi slota koyduğun bir bahis">
            Bu arkadaş bir kumar
          </SectionTitle>
          <p className="text-sm text-chalk-dim">
            {player.name} bazı haftalar kaleye geçiyor, bazı haftalar sahada oynuyor. Hangisi
            olacağını admin maç günü belirliyor.
          </p>
          <ul className="mt-3 space-y-1.5 text-sm">
            <li className="flex gap-2">
              <span className="text-neon">✓</span>
              <span className="text-chalk-dim">
                Doğru slota koydun → tam puan, gol dahil.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-flare">!</span>
              <span className="text-chalk-dim">
                Forvete koydun ama kaleye geçti → <strong>gol puanı yanar</strong>, sadece
                kaleci reyting puanını alırsın.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-flare">!</span>
              <span className="text-chalk-dim">
                Kaleye koydun ama sahada oynadı → <strong>gol puanı yanar</strong>, saha
                reyting tablosundan puanlanır.
              </span>
            </li>
          </ul>
          {totalWeeks > 0 && (
            <p className="mt-3 rounded-lg bg-ink-850 px-3 py-2 text-xs text-chalk-dim">
              Bu sezon <strong className="text-chalk">{stats.keeperWeeks}</strong> hafta
              kalede, <strong className="text-chalk">{stats.appearances - stats.keeperWeeks}</strong>{" "}
              hafta sahada oynadı.
            </p>
          )}
        </Panel>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat
          label="Fiyat"
          value={player.price.toFixed(1)}
          sub={`başlangıç ${player.basePrice.toFixed(1)}`}
        />
        <Stat
          label="Ortalama reyting"
          value={stats.averageRating?.toFixed(1) ?? "—"}
          sub={`${stats.appearances} maç`}
        />
        <Stat label="Gol" value={stats.goals} sub={`${stats.mvpCount} kez maçın adamı`} />
        <Stat
          label="Devamlılık"
          value={totalWeeks > 0 ? `%${Math.round((stats.appearances / totalWeeks) * 100)}` : "—"}
          sub={`${stats.missed} hafta yetişemedi`}
          tone={
            totalWeeks === 0
              ? "neutral"
              : stats.appearances / totalWeeks >= 0.75
                ? "good"
                : "bad"
          }
        />
      </div>

      {weeks.length === 0 ? (
        <EmptyState title="Henüz maç oynanmadı">
          İlk hafta kapandığında grafikler dolmaya başlayacak.
        </EmptyState>
      ) : (
        <Panel className="space-y-5">
          <TrendChart
            title="Haftalık reyting"
            color="var(--color-neon)"
            min={0}
            max={10}
            points={stats.ratingHistory.map((r) => ({
              label: `${r.gameweek}. hf`,
              value: r.rating,
            }))}
          />
          <TrendChart
            title="Fiyat geçmişi"
            color="var(--color-flare)"
            suffix=" birim"
            points={stats.priceHistory.map((p) => ({
              label: p.gameweek === 0 ? "başlangıç" : `${p.gameweek}. hf`,
              value: p.price,
            }))}
          />
        </Panel>
      )}

      <Panel>
        <SectionTitle hint="Bu oyuncunun menajerlere kazandırdığı ham puan (çarpansız)">
          Fantazi getirisi
        </SectionTitle>
        <div className="grid grid-cols-3 gap-3">
          <Stat
            label="Toplam puan"
            value={stats.fantasyPoints}
            tone={stats.fantasyPoints >= 0 ? "good" : "bad"}
          />
          <Stat label="Kaç kadroda" value={stats.timesSelected} />
          <Stat label="Kaptanlık" value={stats.captainCount} />
        </div>
      </Panel>
    </div>
  );
}
