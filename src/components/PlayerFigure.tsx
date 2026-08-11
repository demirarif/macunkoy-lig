"use client";

import Image from "next/image";
import { useState } from "react";
import { hueFor, initialsOf } from "@/lib/ui/tiers";

/**
 * Oyuncu figürü.
 *
 * /public/players/<id>.png dosyası varsa onu gösterir. Yoksa oyuncuya özel
 * renkte, baş harfli bir rozete düşer — böylece figürler tamamlanmadan da lig
 * yayına girebilir ve görseller geldikçe kartlar kendiliğinden dolar.
 *
 * next/image kullanıyoruz: kaynak PNG'ler ortalama 66 KB ve bir ekranda
 * yirmiden fazlası aynı anda görünebiliyor; otomatik WebP/AVIF dönüşümü
 * telefonda ciddi fark yaratıyor.
 */
export function PlayerFigure({
  playerId,
  name,
  className = "",
  priority = false,
}: {
  playerId: string;
  name: string;
  className?: string;
  priority?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const hue = hueFor(playerId);

  if (failed) {
    return (
      <span
        className={`grid place-items-center ${className}`}
        style={{
          background: `radial-gradient(65% 65% at 50% 35%, hsl(${hue} 55% 32% / .9), transparent 70%)`,
          containerType: "inline-size",
        }}
        aria-hidden
      >
        <span
          className="font-black tracking-tight opacity-90"
          style={{
            fontSize: "clamp(0.9rem, 34cqw, 4rem)",
            color: `hsl(${hue} 70% 78%)`,
            textShadow: `0 2px 18px hsl(${hue} 80% 40% / .8)`,
          }}
        >
          {initialsOf(name)}
        </span>
      </span>
    );
  }

  return (
    <span className={`relative block ${className}`}>
      <Image
        src={`/players/${playerId}.png`}
        alt=""
        fill
        sizes="(max-width: 640px) 30vw, 180px"
        priority={priority}
        onError={() => setFailed(true)}
        className="object-contain object-bottom select-none"
        draggable={false}
      />
    </span>
  );
}
