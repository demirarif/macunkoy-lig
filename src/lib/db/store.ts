import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import { initialState, type LeagueState } from "./state";

/**
 * Veri katmanı.
 *
 * Şu an tek bir JSON dosyası kullanıyoruz: proje `npm run dev` dedikten sonra
 * hiçbir kurulum gerektirmeden çalışsın diye. Supabase'e geçince bu dosyanın
 * yerini `supabase-store.ts` alacak; dışarıya açılan `readState` / `mutate`
 * arayüzü aynı kalacağı için uygulama kodunun tek satırı değişmeyecek.
 */

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "league.json");

/**
 * Aynı anda gelen iki isteğin birbirinin yazdığını ezmesini engelleyen basit kuyruk.
 * Tek süreçte çalışan dev sunucusu için yeterli; Supabase'te bu işi veritabanı devralacak.
 */
let writeChain: Promise<unknown> = Promise.resolve();

/**
 * Bellek önbelleği, dosyanın değişiklik zamanına bağlı.
 *
 * Sadece "en son okuduğumdan beri değişti mi" kontrolü yapıyoruz; böylece
 * `npm run demo` gibi başka bir süreç dosyayı değiştirdiğinde sunucu bayat
 * veri göstermiyor. Her istekte JSON.parse etmenin de önüne geçiyor.
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
  // Önce geçici dosyaya yaz, sonra yerine taşı: yazma yarıda kalırsa
  // eldeki veri bozulmasın.
  const tmp = `${DATA_FILE}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(state, null, 2), "utf8");
  await fs.rename(tmp, DATA_FILE);
  const stat = await fs.stat(DATA_FILE);
  cache = { state, mtimeMs: stat.mtimeMs };
}

export async function readState(): Promise<LeagueState> {
  return loadFromDisk();
}

/**
 * Durumu güvenli biçimde değiştirir.
 *
 * `fn` state'in bir kopyasını alır ve üzerinde serbestçe oynayabilir;
 * dönen değer kalıcı hâle gelir. `fn` bir sonuç döndürmek isterse
 * `[state, result]` çifti yerine kapanış değişkeni kullanmak daha okunaklı.
 */
export async function mutate<T>(
  fn: (state: LeagueState) => T | Promise<T>,
): Promise<T> {
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

/** Testler ve "sezonu sıfırla" için. */
export async function resetState(state: LeagueState = initialState()): Promise<void> {
  await writeToDisk(state);
}
