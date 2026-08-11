import fs from "node:fs/promises";
import path from "node:path";
import { initialState, type LeagueState } from "./state";

/**
 * Dosya tabanlı depo — yerel geliştirme için.
 *
 * Projeyi klonlayan biri hiçbir kurulum yapmadan `npm run dev` diyip çalışan bir
 * lig görebilsin diye var. Tek süreçte güvenli: yazmalar sıraya alınıyor, önce
 * geçici dosyaya yazılıp sonra yerine taşınıyor.
 *
 * Yayında KULLANILMAZ. Vercel'de proje dizini salt okunur ve her sunucu
 * örneğinin kendi diski var; veri bölünür. Orada Supabase devreye giriyor
 * (bkz. supabase-store.ts).
 */

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "league.json");

/** Aynı anda gelen iki isteğin birbirinin yazdığını ezmesini engelleyen kuyruk. */
let writeChain: Promise<unknown> = Promise.resolve();

/**
 * Bellek önbelleği, dosyanın değişiklik zamanına bağlı. Böylece `npm run demo`
 * gibi başka bir süreç dosyayı değiştirdiğinde sunucu bayat veri göstermiyor.
 */
let cache: { state: LeagueState; mtimeMs: number } | null = null;

async function loadFromDisk(): Promise<LeagueState> {
  try {
    const stat = await fs.stat(DATA_FILE);
    if (cache && cache.mtimeMs === stat.mtimeMs) return cache.state;
    const raw = await fs.readFile(DATA_FILE, "utf8");
    const state = JSON.parse(raw) as LeagueState;
    cache = { state, mtimeMs: stat.mtimeMs };
    return state;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    const fresh = initialState();
    await writeToDisk(fresh);
    return fresh;
  }
}

async function writeToDisk(state: LeagueState): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = `${DATA_FILE}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(state, null, 2), "utf8");
  await fs.rename(tmp, DATA_FILE);
  const stat = await fs.stat(DATA_FILE);
  cache = { state, mtimeMs: stat.mtimeMs };
}

export async function readState(): Promise<LeagueState> {
  return loadFromDisk();
}

export async function mutate<T>(fn: (state: LeagueState) => T | Promise<T>): Promise<T> {
  const run = async (): Promise<T> => {
    const current = await readState();
    const draft = structuredClone(current);
    const result = await fn(draft);
    await writeToDisk(draft);
    return result;
  };
  const next = writeChain.then(run, run);
  // Zincirin bir hatada kopmaması için hatayı yutarak devam ettiriyoruz;
  // hata yine de çağırana iletilir.
  writeChain = next.catch(() => undefined);
  return next;
}

export async function resetState(state: LeagueState = initialState()): Promise<void> {
  await writeToDisk(state);
}
