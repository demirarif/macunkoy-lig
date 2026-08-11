import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { initialState, type LeagueState } from "./state";

/**
 * Supabase (Postgres) tabanlı depo — yayın için.
 *
 * Ligin tamamı `league_state` tablosunda **tek satır** hâlinde, JSONB olarak
 * duruyor. Bu bilinçli bir tercih: uygulama zaten veriye yalnızca `readState` /
 * `mutate` üzerinden dokunuyor, veri birkaç yüz kilobayt ve 40 kişilik bir ligde
 * ilişkisel şemaya bölmenin pratik bir kazancı yok. İleride gerekirse
 * `supabase/ileride-tam-sema.sql` içindeki tablolara geçilebilir.
 *
 * Eşzamanlı yazma: iyimser kilit. Her satırın bir `version` numarası var;
 * yazarken "okuduğum sürüm hâlâ aynıysa yaz" diyoruz. Araya biri girmişse
 * hiçbir satır güncellenmiyor, biz de baştan okuyup tekrar deniyoruz. Böylece
 * iki menajerin aynı anda kadro kaydetmesi birbirini ezmiyor.
 */

const TABLE = "league_state";
const ROW_ID = 1;
const MAX_RETRIES = 6;
/** Postgres'in "aynı birincil anahtar zaten var" hata kodu. */
const UNIQUE_VIOLATION = "23505";

let client: SupabaseClient | null = null;

function db(): SupabaseClient {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY tanımlı değil. " +
        "Vercel'de ortam değişkenlerini kontrol et.",
    );
  }
  client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

interface StateRow {
  version: number;
  data: LeagueState;
}

/** Satırı okur; ilk açılışta yoksa ligi tohumlar. */
async function fetchRow(): Promise<StateRow> {
  const { data, error } = await db()
    .from(TABLE)
    .select("version, data")
    .eq("id", ROW_ID)
    .maybeSingle();

  if (error) {
    throw new Error(`Lig verisi okunamadı: ${error.message}`);
  }
  if (data) {
    return { version: data.version as number, data: data.data as LeagueState };
  }

  // Tablo boş: ilk çalıştırma. 37 oyuncu ve 1. hafta ile başlat.
  const fresh = initialState();
  const insert = await db()
    .from(TABLE)
    .insert({ id: ROW_ID, version: 1, data: fresh });

  if (insert.error) {
    // Aynı anda iki istek geldiyse biri kaybeder; onun eklediğini okuyalım.
    if (insert.error.code === UNIQUE_VIOLATION) return fetchRow();
    throw new Error(`Lig verisi oluşturulamadı: ${insert.error.message}`);
  }
  return { version: 1, data: fresh };
}

export async function readState(): Promise<LeagueState> {
  return (await fetchRow()).data;
}

export async function mutate<T>(fn: (state: LeagueState) => T | Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const row = await fetchRow();
    const draft = structuredClone(row.data);

    // `fn` hata fırlatırsa (ör. GameweekError) buradan dışarı çıkar ve
    // hiçbir şey yazılmaz — istediğimiz davranış bu.
    const result = await fn(draft);

    const { data, error } = await db()
      .from(TABLE)
      .update({
        data: draft,
        version: row.version + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", ROW_ID)
      .eq("version", row.version) // iyimser kilit
      .select("version");

    if (error) throw new Error(`Lig verisi kaydedilemedi: ${error.message}`);
    if (data && data.length > 0) return result;
    // Sürüm tutmadı: araya başka bir yazma girdi. Baştan oku, tekrar dene.
  }

  throw new Error(
    "Aynı anda çok fazla değişiklik yapıldı, kaydedilemedi. Biraz sonra tekrar dene.",
  );
}

export async function resetState(state: LeagueState = initialState()): Promise<void> {
  const { error } = await db()
    .from(TABLE)
    .upsert({
      id: ROW_ID,
      version: 1,
      data: state,
      updated_at: new Date().toISOString(),
    });
  if (error) throw new Error(`Lig sıfırlanamadı: ${error.message}`);
}
