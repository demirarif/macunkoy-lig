import type { Metadata } from "next";
import { requireManager } from "@/lib/auth/current";
import { FORMATIONS, SQUAD_SIZE } from "@/lib/domain/rules";
import { SLOT_LABEL_LONG } from "@/lib/domain/types";
import { Panel, SectionTitle } from "@/components/Ui";

export const metadata: Metadata = { title: "Kurallar" };

/**
 * Kural sayfası doğrudan yürürlükteki ayarlardan üretilir.
 * Admin panelinden bir sayı değiştirilirse burası da anında değişir —
 * kurallarla gerçek puanlamanın arası hiç açılmaz.
 */
export default async function KurallarPage() {
  const { state } = await requireManager();
  const { scoring, pricing, budget } = state.config;

  const outfieldBands = scoring.outfieldRatingBands.map(bandLabel);
  const keeperBands = scoring.keeperRatingBands.map(bandLabel);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header>
        <h1 className="text-3xl font-black uppercase leading-none tracking-tight text-chalk">
          Kurallar
        </h1>
        <p className="mt-1 text-xs text-chalk-faint">
          Bu sayfa yürürlükteki ayarlardan otomatik üretilir.
        </p>
      </header>

      <Panel>
        <SectionTitle>Haftalık döngü</SectionTitle>
        <ol className="space-y-2.5 text-sm text-chalk-dim">
          {[
            ["Salı 21:00", "Maç oynanır."],
            ["Salı 23:00", "Kadrolar kilitlenir. Kadro kurmayanın geçen haftaki takımı devreder."],
            ["Salı 23:01", "Anket atılır, 22 kişi belli olur."],
            ["Salı 23:02", "Kadronu aç: kaç adamın yetişti, gör."],
            ["Çarşamba–Cuma", "Reytingler girilir, puanlar açıklanır, fiyatlar güncellenir."],
          ].map(([when, what]) => (
            <li key={when} className="flex gap-3">
              <span className="w-28 shrink-0 text-xs font-black uppercase tracking-wide text-neon">
                {when}
              </span>
              <span>{what}</span>
            </li>
          ))}
        </ol>
      </Panel>

      <Panel>
        <SectionTitle hint={`Bütçe ${budget} birim · ${SQUAD_SIZE} oyuncu`}>Kadro</SectionTitle>
        <p className="mb-3 text-sm text-chalk-dim">
          1 kaleci + 6 oyuncu. Her hafta sıfırdan kurarsın, transfer yok. Bütçe en fazla üç
          pahalı oyuncu alacak şekilde ayarlandı — dördüncüsü matematiksel olarak sığmaz.
        </p>
        <ul className="space-y-1.5">
          {FORMATIONS.map((f) => (
            <li key={f.id} className="rounded-lg bg-ink-850/70 px-3 py-2">
              <span className="text-sm font-black uppercase tracking-wide text-chalk">
                {f.name}
              </span>
              <span className="block text-xs text-chalk-faint">{f.tagline}</span>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel>
        <SectionTitle hint="Saha oyuncuları (D / OS / FW)">Puanlama</SectionTitle>
        <Table
          rows={[
            ["Ankete yetişti ve oynadı", scoring.played],
            [`Gol — ${SLOT_LABEL_LONG.DEF}`, scoring.goal.DEF],
            [`Gol — ${SLOT_LABEL_LONG.MID}`, scoring.goal.MID],
            [`Gol — ${SLOT_LABEL_LONG.FWD}`, scoring.goal.FWD],
            ["Galibiyet", scoring.win],
            ["Beraberlik", scoring.draw],
            ["Mağlubiyet", scoring.loss],
            ["Maçın adamı", scoring.mvp],
            ...outfieldBands,
            ["Ankete yetişemedi", scoring.noShow],
          ]}
        />
      </Panel>

      <Panel>
        <SectionTitle hint="Halısahada maçlar bol gollü geçtiği için kalecilere ayrı ve daha bağışlayıcı bir tablo uygulanır.">
          Kaleci puanlaması
        </SectionTitle>
        <Table
          rows={[
            ["Oynadı", scoring.played],
            ...keeperBands,
            ["Gol atarsa", scoring.goal.GK],
            ["Ankete yetişemedi", scoring.noShow],
          ]}
        />
        <p className="mt-3 rounded-lg bg-ink-850 px-3 py-2 text-xs text-chalk-dim">
          En kötü kaleci haftası bile{" "}
          <strong className="text-chalk">
            {scoring.keeperRatingBands[scoring.keeperRatingBands.length - 1].points +
              scoring.played +
              scoring.loss}
          </strong>{" "}
          puanla sınırlıdır — yani ankete basmayan birini seçmekten ({scoring.noShow}) her
          zaman daha iyidir.
        </p>
      </Panel>

      <Panel>
        <SectionTitle>Kaptan ve kampanya</SectionTitle>
        <ul className="space-y-3 text-sm text-chalk-dim">
          <li>
            <strong className="text-chalk">Kaptanlar.</strong> Anket dolduktan sonra admin her
            takımdan bir kaptan ilan eder. Kadronda kaç kaptan varsa hepsi{" "}
            <strong className="text-flare">{scoring.captainMultiplier}x</strong> puan alır —
            artısı da eksisi de iki katı. Kadrolar anketten önce kilitlendiği için kaptanı
            tutturmak tahmin işidir.
          </li>
          <li>
            <strong className="text-chalk">Kampanya.</strong> Her hafta admin{" "}
            {scoring.promoCount} oyuncu seçer. O hafta fiyatları %
            {Math.round(scoring.promoDiscount * 100)} indirimli ve puanları{" "}
            <strong className="text-flare">{scoring.promoMultiplier}x</strong>. Dikkat:
            çarpan negatife de uygulanır — kampanyalı oyuncu ankete yetişemezse{" "}
            {scoring.noShow * scoring.promoMultiplier} puan yersin.
          </li>
          <li>
            <strong className="text-chalk">Mevki bahsi.</strong> Hem kaleci hem oyuncu olabilen
            arkadaşları istediğin slota koyabilirsin. Slot o haftaki gerçek rolüyle uyuşmazsa{" "}
            <strong className="text-danger">gol puanı yanar</strong>; reyting puanını gerçekte
            oynadığı rolün tablosundan alırsın.
          </li>
        </ul>
      </Panel>

      <Panel>
        <SectionTitle hint={`${pricing.minPrice} – ${pricing.maxPrice} birim aralığında`}>
          Fiyatlar nasıl değişiyor
        </SectionTitle>
        <ul className="space-y-2 text-sm text-chalk-dim">
          <li>
            <strong className="text-chalk">{pricing.goodWeeksForRaise} hafta üst üste</strong>{" "}
            {pricing.goodRating} ve üzeri reyting → fiyat yükselir.
          </li>
          <li>
            <strong className="text-chalk">Tek hafta</strong> {pricing.badRating} altı reyting
            → fiyat anında düşer.
          </li>
          <li>
            {pricing.absentWeeksForDrop} hafta üst üste görünmeyen oyuncu {pricing.absentDrop}{" "}
            birim ucuzlar.
          </li>
          <li>
            Değişim sönümlüdür: pahalı oyuncu neredeyse hiç yükselmez, ucuz oyuncu neredeyse
            hiç düşmez. Hareket hep orta seviyede olur. Haftalık tavan ±{pricing.weeklyCap}.
          </li>
        </ul>
      </Panel>
    </div>
  );
}

function bandLabel(
  band: { min: number; points: number },
  index: number,
  all: Array<{ min: number; points: number }>,
): [string, number] {
  const upper = index === 0 ? null : all[index - 1].min;
  const label =
    upper === null
      ? `Reyting ${band.min.toFixed(1)}+`
      : band.min === 0
        ? `Reyting ${upper.toFixed(1)} altı`
        : `Reyting ${band.min.toFixed(1)} – ${(upper - 0.1).toFixed(1)}`;
  return [label, band.points];
}

function Table({ rows }: { rows: Array<[string, number]> }) {
  return (
    <ul className="divide-y divide-ink-850">
      {rows.map(([label, points]) => (
        <li key={label} className="flex items-center justify-between py-2 text-sm">
          <span className="text-chalk-dim">{label}</span>
          <span
            className={`font-black tabular ${
              points > 0 ? "text-neon" : points < 0 ? "text-danger" : "text-chalk-faint"
            }`}
          >
            {points > 0 ? "+" : ""}
            {points}
          </span>
        </li>
      ))}
    </ul>
  );
}
