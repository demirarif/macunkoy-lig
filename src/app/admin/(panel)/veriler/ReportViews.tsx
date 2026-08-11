"use client";

import { useMemo, useState } from "react";
import { PlayerFigure } from "@/components/PlayerFigure";
import { Badge } from "@/components/Ui";
import { SLOT_LABEL, type Slot } from "@/lib/domain/types";
import { SLOT_COLORS } from "@/lib/ui/tiers";
import type { MatrixRow, WeekPlayerRow, WeekReport } from "@/lib/services/reports";

export interface ReportViewsProps {
  weeks: Array<{
    number: number;
    status: string;
    scoreA: number | null;
    scoreB: number | null;
    dateLabel: string;
  }>;
  reports: Record<number, SerializedReport>;
  matrix: { weeks: number[]; rows: MatrixRow[] };
}

export interface SerializedReport {
  teamA: WeekPlayerRow[];
  teamB: WeekPlayerRow[];
  outside: WeekPlayerRow[];
  squadCount: number;
  totalGoals: number;
  scoreA: number | null;
  scoreB: number | null;
  mvpName: string | null;
  dateLabel: string;
  status: string;
}

/** Reytinge göre hücre rengi — tabloyu tek bakışta okunur yapar. */
function ratingStyle(rating: number | null): { bg: string; fg: string } {
  if (rating === null) return { bg: "transparent", fg: "var(--color-chalk-faint)" };
  if (rating >= 9) return { bg: "rgba(34,197,94,.85)", fg: "#04140c" };
  if (rating >= 8) return { bg: "rgba(74,222,128,.55)", fg: "#04140c" };
  if (rating >= 7) return { bg: "rgba(134,239,172,.28)", fg: "#dcfce7" };
  if (rating >= 6) return { bg: "rgba(255,255,255,.07)", fg: "#cbd5cf" };
  if (rating >= 5) return { bg: "rgba(251,191,36,.28)", fg: "#fde68a" };
  return { bg: "rgba(244,63,94,.45)", fg: "#ffe4e6" };
}

export function ReportViews(props: ReportViewsProps) {
  const [view, setView] = useState<"hafta" | "sezon">("hafta");
  const latest = props.weeks[0]?.number ?? 1;
  const [week, setWeek] = useState(latest);

  return (
    <div className="space-y-4">
      <div className="flex gap-1">
        {(
          [
            ["hafta", "Hafta raporu"],
            ["sezon", "Sezon tablosu"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setView(key)}
            className={`flex-1 rounded-lg py-2.5 text-xs font-black uppercase tracking-widest transition ${
              view === key ? "bg-flare text-ink-950" : "bg-ink-900 text-chalk-faint"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {view === "hafta" ? (
        <>
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
            {props.weeks.map((w) => (
              <button
                key={w.number}
                type="button"
                onClick={() => setWeek(w.number)}
                className={`shrink-0 rounded-lg px-3 py-2 text-left transition ${
                  week === w.number
                    ? "bg-ink-700 ring-1 ring-flare"
                    : "bg-ink-900 ring-1 ring-ink-800"
                }`}
              >
                <span className="block text-xs font-black text-chalk">{w.number}. hf</span>
                <span className="block text-[10px] tabular text-chalk-faint">
                  {w.scoreA !== null ? `${w.scoreA}-${w.scoreB}` : w.dateLabel}
                </span>
              </button>
            ))}
          </div>
          <WeekView report={props.reports[week]} number={week} />
        </>
      ) : (
        <MatrixView matrix={props.matrix} />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Hafta raporu                                                        */
/* ------------------------------------------------------------------ */

function WeekView({ report, number }: { report?: SerializedReport; number: number }) {
  if (!report) {
    return (
      <p className="rounded-xl bg-ink-900/70 px-4 py-10 text-center text-sm text-chalk-faint">
        {number}. hafta için henüz veri yok.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-ink-900/70 p-4 text-center edge-light">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-chalk-faint">
          {report.dateLabel}
        </p>
        <div className="mt-1 flex items-center justify-center gap-4">
          <span className="text-sm font-black uppercase tracking-wide text-neon">A</span>
          <span className="text-4xl font-black leading-none tabular text-chalk">
            {report.scoreA ?? "–"}
            <span className="mx-2 text-chalk-faint">:</span>
            {report.scoreB ?? "–"}
          </span>
          <span className="text-sm font-black uppercase tracking-wide text-sky-cool">B</span>
        </div>
        <div className="mt-2 flex flex-wrap justify-center gap-1.5">
          {report.mvpName && <Badge tone="warn">MVP {report.mvpName}</Badge>}
          <Badge>{report.totalGoals} gol</Badge>
          <Badge>{report.squadCount} kadro kuruldu</Badge>
          {report.status !== "completed" && <Badge tone="cool">Henüz tamamlanmadı</Badge>}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <TeamTable title="A Takımı" accent="text-neon" rows={report.teamA} />
        <TeamTable title="B Takımı" accent="text-sky-cool" rows={report.teamB} />
      </div>

      {report.outside.length > 0 && (
        <div>
          <h3 className="mb-2 text-xs font-black uppercase tracking-widest text-chalk-faint">
            Sahaya çıkmayanlar ({report.outside.length})
          </h3>
          <ul className="flex flex-wrap gap-1.5">
            {report.outside.map((row) => (
              <li
                key={row.playerId}
                className={`flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] ${
                  row.pickedBy > 0
                    ? "bg-danger/10 text-danger ring-1 ring-danger/25"
                    : "bg-ink-900 text-chalk-faint"
                }`}
              >
                <span className="font-bold">{row.name}</span>
                {row.pickedBy > 0 && (
                  <span className="font-black tabular">
                    {row.pickedBy} kadroda · {row.points}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function TeamTable({
  title,
  accent,
  rows,
}: {
  title: string;
  accent: string;
  rows: WeekPlayerRow[];
}) {
  return (
    <div className="overflow-hidden rounded-2xl bg-ink-900/70 edge-light">
      <div className="flex items-center justify-between px-3 py-2">
        <h3 className={`text-sm font-black uppercase tracking-widest ${accent}`}>{title}</h3>
        <span className="text-[10px] font-bold uppercase tracking-widest text-chalk-faint">
          {rows.length} oyuncu
        </span>
      </div>
      <table className="w-full">
        <thead>
          <tr className="border-y border-ink-800 text-[9px] uppercase tracking-widest text-chalk-faint">
            <th className="py-1.5 pl-3 text-left font-black">Oyuncu</th>
            <th className="py-1.5 text-center font-black">Gol</th>
            <th className="py-1.5 text-center font-black">Rey</th>
            <th className="py-1.5 text-center font-black">Puan</th>
            <th className="py-1.5 pr-3 text-right font-black">Seçen</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const style = ratingStyle(row.rating);
            return (
              <tr key={row.playerId} className="border-b border-ink-850/60 last:border-0">
                <td className="py-1.5 pl-3">
                  <div className="flex items-center gap-2">
                    <span className="grid h-7 w-7 shrink-0 place-items-center overflow-hidden rounded bg-ink-850">
                      <PlayerFigure
                        playerId={row.playerId}
                        name={row.name}
                        className="h-full w-full"
                      />
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1">
                        <span
                          className={`truncate text-xs font-bold ${
                            row.played ? "text-chalk" : "text-chalk-faint line-through"
                          }`}
                        >
                          {row.name}
                        </span>
                        {row.isCaptain && (
                          <span className="text-[8px] font-black text-flare">K</span>
                        )}
                        {row.keptGoal && (
                          <span className="text-[8px] font-black text-sky-cool">GK</span>
                        )}
                        {row.isMvp && (
                          <span className="text-[8px] font-black text-flare">MVP</span>
                        )}
                        {row.isPromo && (
                          <span className="text-[8px] font-black text-flare">%</span>
                        )}
                      </div>
                      <span className="flex gap-1">
                        {row.slots.map((s) => (
                          <span
                            key={s}
                            className={`text-[8px] font-black ${SLOT_COLORS[s as Slot].text}`}
                          >
                            {SLOT_LABEL[s as Slot]}
                          </span>
                        ))}
                      </span>
                    </div>
                  </div>
                </td>
                <td className="py-1.5 text-center text-xs font-black tabular text-chalk">
                  {row.goals > 0 ? row.goals : "–"}
                </td>
                <td className="py-1.5 text-center">
                  <span
                    className="inline-block min-w-8 rounded px-1 py-0.5 text-xs font-black tabular"
                    style={{ background: style.bg, color: style.fg }}
                  >
                    {row.rating?.toFixed(1) ?? "–"}
                  </span>
                </td>
                <td
                  className={`py-1.5 text-center text-xs font-black tabular ${
                    row.points > 0 ? "text-neon" : row.points < 0 ? "text-danger" : "text-chalk-faint"
                  }`}
                >
                  {row.points > 0 ? "+" : ""}
                  {row.points}
                </td>
                <td className="py-1.5 pr-3 text-right text-[11px] tabular text-chalk-faint">
                  {row.pickedBy > 0 ? `${row.pickedBy} · %${row.pickedPercent}` : "–"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sezon tablosu                                                       */
/* ------------------------------------------------------------------ */

type MatrixSort = "points" | "rating" | "goals" | "name";

function MatrixView({ matrix }: { matrix: { weeks: number[]; rows: MatrixRow[] } }) {
  const [sort, setSort] = useState<MatrixSort>("points");
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("tr");
    return matrix.rows
      .filter((r) => !q || r.name.toLocaleLowerCase("tr").includes(q))
      .sort((a, b) => {
        switch (sort) {
          case "rating":
            return (b.averageRating ?? -1) - (a.averageRating ?? -1);
          case "goals":
            return b.goals - a.goals;
          case "name":
            return a.name.localeCompare(b.name, "tr");
          default:
            return b.totalPoints - a.totalPoints;
        }
      });
  }, [matrix.rows, sort, query]);

  if (matrix.weeks.length === 0) {
    return (
      <p className="rounded-xl bg-ink-900/70 px-4 py-10 text-center text-sm text-chalk-faint">
        Henüz oynanmış hafta yok.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Oyuncu ara…"
          className="min-w-40 flex-1 rounded-lg bg-ink-850 px-3 py-2 text-sm text-chalk placeholder:text-chalk-faint edge-light"
        />
        <div className="flex gap-1">
          {(
            [
              ["points", "Puan"],
              ["rating", "Reyting"],
              ["goals", "Gol"],
              ["name", "İsim"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setSort(key)}
              className={`rounded-lg px-2.5 py-2 text-[11px] font-black uppercase tracking-wide transition ${
                sort === key ? "bg-flare text-ink-950" : "bg-ink-850 text-chalk-faint"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl bg-ink-900/70 edge-light">
        <table className="w-full border-collapse">
          <thead>
            <tr className="text-[9px] uppercase tracking-widest text-chalk-faint">
              <th className="sticky left-0 z-10 bg-ink-900 py-2 pl-3 pr-2 text-left font-black">
                Oyuncu
              </th>
              {matrix.weeks.map((w) => (
                <th key={w} className="px-1 py-2 text-center font-black">
                  {w}
                </th>
              ))}
              <th className="px-2 py-2 text-center font-black">Maç</th>
              <th className="px-2 py-2 text-center font-black">Gol</th>
              <th className="px-2 py-2 text-center font-black">Ort</th>
              <th className="px-3 py-2 text-right font-black">Puan</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.playerId} className="border-t border-ink-850/60">
                <td className="sticky left-0 z-10 bg-ink-900 py-1 pl-3 pr-2">
                  <div className="flex items-center gap-1.5">
                    <span className="grid h-6 w-6 shrink-0 place-items-center overflow-hidden rounded bg-ink-850">
                      <PlayerFigure
                        playerId={row.playerId}
                        name={row.name}
                        className="h-full w-full"
                      />
                    </span>
                    <span className="truncate text-[11px] font-bold text-chalk">
                      {row.name}
                    </span>
                  </div>
                </td>

                {row.cells.map((cell) => {
                  const style = ratingStyle(cell.rating);
                  return (
                    <td key={cell.gameweek} className="px-0.5 py-1 text-center">
                      <span
                        className="relative inline-flex h-6 min-w-8 items-center justify-center rounded text-[11px] font-black tabular"
                        style={{ background: style.bg, color: style.fg }}
                        title={
                          cell.rating === null
                            ? "Sahaya çıkmadı"
                            : `Reyting ${cell.rating} · ${cell.goals} gol · ${cell.points} puan`
                        }
                      >
                        {cell.rating?.toFixed(1) ?? (cell.onPitch ? "—" : "·")}
                        {cell.goals > 0 && (
                          <span className="absolute -right-0.5 -top-1 text-[8px] text-flare">
                            {cell.goals}
                          </span>
                        )}
                        {cell.isMvp && (
                          <span className="absolute -left-0.5 -top-1 text-[8px] text-flare">
                            ★
                          </span>
                        )}
                      </span>
                    </td>
                  );
                })}

                <td className="px-2 text-center text-[11px] tabular text-chalk-dim">
                  {row.appearances}
                </td>
                <td className="px-2 text-center text-[11px] font-bold tabular text-chalk">
                  {row.goals || "–"}
                </td>
                <td className="px-2 text-center text-[11px] font-bold tabular text-chalk">
                  {row.averageRating?.toFixed(1) ?? "–"}
                </td>
                <td
                  className={`px-3 text-right text-xs font-black tabular ${
                    row.totalPoints >= 0 ? "text-neon" : "text-danger"
                  }`}
                >
                  {row.totalPoints}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-[10px] text-chalk-faint">
        <span className="font-black uppercase tracking-widest">Renkler:</span>
        {[
          [9, "9+"],
          [8, "8–8.9"],
          [7, "7–7.9"],
          [6, "6–6.9"],
          [5, "5–5.9"],
          [4, "5 altı"],
        ].map(([value, label]) => {
          const style = ratingStyle(value as number);
          return (
            <span key={label} className="flex items-center gap-1">
              <span
                className="inline-block h-3 w-5 rounded"
                style={{ background: style.bg }}
              />
              {label}
            </span>
          );
        })}
        <span>· sağ üst rakam gol, ★ maçın adamı, · sahaya çıkmadı</span>
      </div>
    </div>
  );
}
