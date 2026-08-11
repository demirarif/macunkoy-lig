import type { Metadata } from "next";
import { requireManager } from "@/lib/auth/current";
import { currentGameweek, lastCompletedGameweek } from "@/lib/db/state";
import { effectivePrice, round1 } from "@/lib/domain/scoring";
import { ownershipFor, playerSeasonStats } from "@/lib/services/standings";
import { PoolBrowser, type PoolEntry } from "./PoolBrowser";

export const metadata: Metadata = { title: "Havuz" };

export default async function HavuzPage() {
  const { state } = await requireManager();
  const gw = currentGameweek(state);
  const settled = lastCompletedGameweek(state);
  const ownership = settled ? ownershipFor(state, settled.id) : new Map<string, number>();

  const entries: PoolEntry[] = state.players
    .filter((p) => p.active)
    .map((player) => {
      const stats = playerSeasonStats(state, player.id);
      const history = stats.priceHistory;
      const previous = history.length >= 2 ? history[history.length - 2].price : player.price;
      return {
        player,
        effectivePrice: effectivePrice(player, gw, state.config.scoring),
        isPromo: gw.promoPlayerIds.includes(player.id),
        appearances: stats.appearances,
        missed: stats.missed,
        goals: stats.goals,
        averageRating: stats.averageRating,
        ownership: ownership.get(player.id) ?? 0,
        priceDelta: round1(player.price - previous),
      };
    });

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <header>
        <h1 className="text-3xl font-black uppercase leading-none tracking-tight text-chalk">
          Oyuncu Havuzu
        </h1>
        <p className="mt-1 text-xs text-chalk-faint">
          {entries.length} oyuncu · fiyatlar her hafta performansa göre oynar
        </p>
      </header>

      <PoolBrowser entries={entries} />
    </div>
  );
}
