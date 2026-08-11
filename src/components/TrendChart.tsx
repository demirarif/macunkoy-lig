"use client";

import { useId, useMemo, useState } from "react";

/**
 * Tek serili çizgi grafiği — reyting ve fiyat geçmişi için.
 *
 * Bilerek küçük ve elle yazılmış SVG: bir grafik kütüphanesi bu iş için
 * gereğinden ağır olurdu. Kurallar:
 *  - tek seri, o yüzden lejant yok; başlık seriyi adlandırıyor
 *  - 2px çizgi, silik ızgara, son noktada doğrudan etiket
 *  - fare/dokunma ile çapraz kılavuz ve değer balonu
 *  - oynamadığı haftalar çizgide boşluk olarak görünür
 */

export interface TrendPoint {
  label: string;
  value: number | null;
}

export function TrendChart({
  title,
  points,
  color,
  decimals = 1,
  suffix = "",
  min,
  max,
  height = 132,
}: {
  title: string;
  points: TrendPoint[];
  color: string;
  /** Değerlerin kaç ondalıkla yazılacağı. Biçimlendirici fonksiyon yerine sayı:
   *  bu bileşen sunucu bileşenlerinden çağrılıyor ve fonksiyon geçirilemez. */
  decimals?: number;
  suffix?: string;
  min?: number;
  max?: number;
  height?: number;
}) {
  const gradientId = useId();
  const [hover, setHover] = useState<number | null>(null);
  const format = (value: number) => value.toFixed(decimals);

  const values = points.map((p) => p.value).filter((v): v is number => v !== null);
  const lo = min ?? (values.length ? Math.min(...values) : 0);
  const hi = max ?? (values.length ? Math.max(...values) : 1);
  const span = hi - lo || 1;

  const W = 300;
  const H = 100;
  const PAD_X = 6;
  const PAD_Y = 10;

  const coords = useMemo(
    () =>
      points.map((p, i) => ({
        ...p,
        x:
          points.length === 1
            ? W / 2
            : PAD_X + (i / (points.length - 1)) * (W - PAD_X * 2),
        y:
          p.value === null
            ? null
            : PAD_Y + (1 - (p.value - lo) / span) * (H - PAD_Y * 2),
      })),
    [points, lo, span],
  );

  // Oynamadığı haftalarda çizgiyi kes — sahte süreklilik üretmesin.
  const segments = useMemo(() => {
    const out: Array<Array<{ x: number; y: number }>> = [];
    let run: Array<{ x: number; y: number }> = [];
    for (const c of coords) {
      if (c.y === null) {
        if (run.length) out.push(run);
        run = [];
      } else {
        run.push({ x: c.x, y: c.y });
      }
    }
    if (run.length) out.push(run);
    return out;
  }, [coords]);

  const last = [...coords].reverse().find((c) => c.y !== null);
  const active = hover !== null ? coords[hover] : null;

  if (values.length === 0) {
    return (
      <figure>
        <figcaption className="mb-2 text-xs font-bold uppercase tracking-widest text-chalk-faint">
          {title}
        </figcaption>
        <p className="rounded-xl bg-ink-850/60 px-3 py-6 text-center text-xs text-chalk-faint">
          Henüz veri yok
        </p>
      </figure>
    );
  }

  return (
    <figure>
      <figcaption className="mb-1.5 flex items-baseline justify-between">
        <span className="text-xs font-bold uppercase tracking-widest text-chalk-faint">
          {title}
        </span>
        {active?.value != null ? (
          <span className="text-xs font-bold tabular text-chalk">
            {active.label} · {format(active.value)}
            {suffix}
          </span>
        ) : (
          last?.value != null && (
            <span className="text-xs font-bold tabular" style={{ color }}>
              {format(last.value)}
              {suffix}
            </span>
          )
        )}
      </figcaption>

      <div
        className="relative rounded-xl bg-ink-850/60 px-1 py-1"
        style={{ height }}
        onMouseLeave={() => setHover(null)}
      >
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="h-full w-full touch-none"
          role="img"
          aria-label={`${title}: ${points
            .filter((p) => p.value !== null)
            .map((p) => `${p.label} ${format(p.value as number)}${suffix}`)
            .join(", ")}`}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.28" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Silik ızgara */}
          {[0, 0.5, 1].map((t) => (
            <line
              key={t}
              x1={0}
              x2={W}
              y1={PAD_Y + t * (H - PAD_Y * 2)}
              y2={PAD_Y + t * (H - PAD_Y * 2)}
              stroke="currentColor"
              strokeWidth="0.5"
              className="text-ink-700"
            />
          ))}

          {segments.map((seg, i) => (
            <g key={i}>
              {seg.length > 1 && (
                <path
                  d={`M ${seg.map((p) => `${p.x} ${p.y}`).join(" L ")} L ${
                    seg[seg.length - 1].x
                  } ${H} L ${seg[0].x} ${H} Z`}
                  fill={`url(#${gradientId})`}
                />
              )}
              <path
                d={`M ${seg.map((p) => `${p.x} ${p.y}`).join(" L ")}`}
                fill="none"
                stroke={color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            </g>
          ))}

          {/* Oynamadığı haftalar: taban çizgisinde içi boş işaret */}
          {coords.map((c, i) =>
            c.y === null ? (
              <circle
                key={`gap-${i}`}
                cx={c.x}
                cy={H - 3}
                r="2"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
                className="text-chalk-faint"
              />
            ) : null,
          )}

          {active?.y != null && (
            <>
              <line
                x1={active.x}
                x2={active.x}
                y1={0}
                y2={H}
                stroke={color}
                strokeWidth="1"
                strokeDasharray="3 3"
                opacity="0.6"
                vectorEffect="non-scaling-stroke"
              />
              <circle cx={active.x} cy={active.y} r="4" fill={color} stroke="#0b1016" strokeWidth="2" />
            </>
          )}

          {last?.y != null && hover === null && (
            <circle cx={last.x} cy={last.y} r="3.5" fill={color} stroke="#0b1016" strokeWidth="2" />
          )}

          {/* Dokunma/fare hedefleri — işaretlerden geniş */}
          {coords.map((c, i) => (
            <rect
              key={`hit-${i}`}
              x={c.x - W / (points.length * 2)}
              y={0}
              width={W / points.length}
              height={H}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
              onTouchStart={() => setHover(i)}
            />
          ))}
        </svg>
      </div>
    </figure>
  );
}
