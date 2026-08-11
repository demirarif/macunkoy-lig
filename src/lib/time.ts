/**
 * Zaman yardımcıları.
 *
 * Türkiye 2016'dan beri yaz saati uygulamıyor; yıl boyunca sabit UTC+3.
 * Bu yüzden saat dilimi hesabını sabit ofsetle yapmak güvenli ve
 * sunucunun kendi saat diliminden bağımsız çalışıyor.
 */

export const TR_OFFSET_MINUTES = 3 * 60;

/** Salı. 0 = Pazar. */
const TUESDAY = 2;

/** Kadroların kilitlendiği saat (Türkiye saatiyle). */
export const LOCK_HOUR_TR = 23;
/** Maçın başladığı saat (Türkiye saatiyle). */
export const MATCH_HOUR_TR = 21;

/** Verilen anın Türkiye saatiyle takvim alanları. */
function trParts(date: Date) {
  const shifted = new Date(date.getTime() + TR_OFFSET_MINUTES * 60_000);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
    weekday: shifted.getUTCDay(),
  };
}

/** Türkiye saatiyle verilen tarih/saati gerçek (UTC) ana çevirir. */
export function fromTR(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute = 0,
): Date {
  return new Date(Date.UTC(year, month, day, hour, minute) - TR_OFFSET_MINUTES * 60_000);
}

/**
 * `from` anından sonraki ilk Salı saat `hour` (TR).
 * `from` zaten Salı ve saat geçmemişse o günü döndürür.
 */
export function nextTuesdayAt(from: Date, hour: number): Date {
  const p = trParts(from);
  let daysAhead = (TUESDAY - p.weekday + 7) % 7;
  if (daysAhead === 0 && (p.hour > hour || (p.hour === hour && p.minute > 0))) {
    daysAhead = 7;
  }
  return fromTR(p.year, p.month, p.day + daysAhead, hour);
}

/**
 * Bir haftanın takvimi: kadrolar Salı 23:00'te kilitlenir,
 * maç bir sonraki Salı 21:00'de oynanır.
 */
export function scheduleFor(lockAt: Date): { lockAt: string; matchAt: string } {
  const p = trParts(lockAt);
  const matchAt = fromTR(p.year, p.month, p.day + 7, MATCH_HOUR_TR);
  return { lockAt: lockAt.toISOString(), matchAt: matchAt.toISOString() };
}

const TR_DATE = new Intl.DateTimeFormat("tr-TR", {
  timeZone: "Europe/Istanbul",
  day: "numeric",
  month: "long",
  weekday: "long",
});

const TR_DATETIME = new Intl.DateTimeFormat("tr-TR", {
  timeZone: "Europe/Istanbul",
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
});

const TR_SHORT = new Intl.DateTimeFormat("tr-TR", {
  timeZone: "Europe/Istanbul",
  day: "2-digit",
  month: "2-digit",
});

export function formatDateTR(iso: string): string {
  return TR_DATE.format(new Date(iso));
}

export function formatDateTimeTR(iso: string): string {
  return TR_DATETIME.format(new Date(iso));
}

export function formatShortTR(iso: string): string {
  return TR_SHORT.format(new Date(iso));
}

/**
 * Sunucu tarafındaki "şimdi".
 *
 * Sunucu bileşenleri render sırasında saf olmayan çağrı yapmamalı; bunu
 * await'lenen bir yardımcıya taşıyarak hem kuralı hem de okunabilirliği koruyoruz.
 */
export async function serverNow(): Promise<number> {
  return Date.now();
}

export interface Countdown {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
  expired: boolean;
}

export function countdown(targetIso: string, now: number): Countdown {
  const totalMs = new Date(targetIso).getTime() - now;
  const clamped = Math.max(0, totalMs);
  return {
    days: Math.floor(clamped / 86_400_000),
    hours: Math.floor(clamped / 3_600_000) % 24,
    minutes: Math.floor(clamped / 60_000) % 60,
    seconds: Math.floor(clamped / 1000) % 60,
    totalMs,
    expired: totalMs <= 0,
  };
}
