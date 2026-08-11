"use client";

import { useEffect, useState } from "react";
import { countdown } from "@/lib/time";

/**
 * Kilide geri sayım.
 *
 * Sunucu ile istemci saatinin farklı olma ihtimaline karşı ilk render'da
 * sunucudan gelen `serverNow` değerini kullanır, sonra istemci saatiyle devam eder.
 * Böylece hidrasyon uyuşmazlığı olmaz ve sayaç sıçramaz.
 */
export function Countdown({
  targetIso,
  serverNow,
}: {
  targetIso: string;
  serverNow: number;
}) {
  const [now, setNow] = useState(serverNow);

  useEffect(() => {
    // İstemcinin saati yanlışsa geri sayım da yanlış olurdu; sunucudan gelen
    // an ile aradaki farkı bir kez ölçüp her tıkta o farkı düşüyoruz.
    const drift = Date.now() - serverNow;
    // İlk düzeltmenin gecikmesi görünmesin diye saniyeden kısa aralık.
    const id = setInterval(() => setNow(Date.now() - drift), 250);
    return () => clearInterval(id);
  }, [serverNow]);

  const c = countdown(targetIso, now);

  if (c.expired) {
    return (
      <p className="text-2xl font-black uppercase tracking-wider text-danger">Kilitlendi</p>
    );
  }

  const urgent = c.totalMs < 6 * 3600_000;

  return (
    <div
      className={`flex items-end gap-1.5 tabular ${urgent ? "text-danger" : "text-chalk"}`}
      role="timer"
      aria-live="off"
    >
      {c.days > 0 && <Unit value={c.days} label="gün" />}
      <Unit value={c.hours} label="sa" pad />
      <Unit value={c.minutes} label="dk" pad />
      <Unit value={c.seconds} label="sn" pad />
    </div>
  );
}

function Unit({ value, label, pad = false }: { value: number; label: string; pad?: boolean }) {
  return (
    <span className="flex items-baseline gap-0.5">
      <span className="text-3xl font-black leading-none">
        {pad ? String(value).padStart(2, "0") : value}
      </span>
      <span className="text-xs font-bold uppercase opacity-60">{label}</span>
    </span>
  );
}
