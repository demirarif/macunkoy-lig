/**
 * Supabase bağlantısını uçtan uca dener.
 *
 *   npm run supabase:test
 *
 * .env.local içindeki SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY değerlerini
 * kullanır. Sırayla: tabloya erişebiliyor muyuz, satır var mı (yoksa oluşturuyor
 * mu), yazma çalışıyor mu, iyimser kilit dönüyor mu.
 *
 * Bir şey ters giderse tam olarak hangi adımda ve neden takıldığını söyler.
 */

import fs from "node:fs";
import path from "node:path";

// .env.local'i elle yüklüyoruz: tsx, node'un --env-file bayrağını iletmiyor.
loadEnv(".env.local");

function loadEnv(file: string) {
  const full = path.join(process.cwd(), file);
  if (!fs.existsSync(full)) return;
  for (const line of fs.readFileSync(full, "utf8").replace(/^﻿/, "").split(/\r?\n/)) {
    const eq = line.indexOf("=");
    if (eq < 1 || line.trimStart().startsWith("#")) continue;
    const key = line.slice(0, eq).trim();
    if (!process.env[key]) process.env[key] = line.slice(eq + 1).trim();
  }
}

function step(n: number, label: string) {
  process.stdout.write(`${n}. ${label.padEnd(46, ".")} `);
}

/** Eski biçim JWT anahtarların içindeki rolü okumak için — doğrulama yapmaz. */
function decodeJwt(token: string): string {
  const payload = token.split(".")[1];
  if (!payload) return "";
  try {
    return Buffer.from(payload, "base64url").toString("utf8");
  } catch {
    return "";
  }
}

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  step(1, "Ortam değişkenleri");
  if (!url || !key) {
    console.log("EKSİK");
    console.error(
      "\n.env.local içine şunları ekle:\n" +
        "  SUPABASE_URL=https://<proje>.supabase.co\n" +
        "  SUPABASE_SERVICE_ROLE_KEY=<service_role anahtarı>\n",
    );
    process.exit(1);
  }
  if (!/^https:\/\/[a-z0-9]+\.supabase\.co\/?$/.test(url)) {
    console.log("ŞÜPHELİ");
    console.error(`\nSUPABASE_URL beklenen biçimde değil: ${url}`);
    console.error("Örnek: https://mpwpoyfflhzftjcmnnbm.supabase.co\n");
    process.exit(1);
  }
  // Supabase iki biçim veriyor: yeni "sb_secret_..." ve eski JWT.
  // Yanlışlıkla herkese açık anahtarın (anon / sb_publishable_) girilmesini yakala.
  if (key.startsWith("sb_publishable_") || /"role":"anon"/.test(decodeJwt(key))) {
    console.log("YANLIŞ ANAHTAR");
    console.error(
      "\nBu herkese açık (anon) anahtar. Gizli olanı kullan:\n" +
        "  Project Settings > API keys > 'secret' ya da 'service_role'\n",
    );
    process.exit(1);
  }
  if (key.length < 30) {
    console.log("ŞÜPHELİ");
    console.error("\nAnahtar çok kısa görünüyor. Tamamını kopyaladın mı?\n");
    process.exit(1);
  }
  console.log("tamam");

  // Ortam hazır olduğu için store artık Supabase sürümünü seçecek.
  const { activeStore, readState, mutate } = await import("@/lib/db/store");

  step(2, "Seçilen depo");
  const store = activeStore();
  console.log(store);
  if (store !== "supabase") {
    console.error("\nBeklenen 'supabase' idi. Ortam değişkenleri okunmamış.\n");
    process.exit(1);
  }

  step(3, "Tabloyu oku (yoksa ligi oluştur)");
  let state;
  try {
    state = await readState();
    console.log("tamam");
  } catch (error) {
    console.log("HATA");
    console.error(`\n${(error as Error).message}\n`);
    console.error("Muhtemel sebepler:");
    console.error("  · supabase/kurulum.sql çalıştırılmamış (league_state tablosu yok)");
    console.error("  · service_role yerine anon anahtarı kullanılmış");
    console.error("  · SUPABASE_URL yanlış proje\n");
    process.exit(1);
  }

  step(4, "İçerik kontrolü");
  console.log(
    `${state.players.length} oyuncu, ${state.managers.length} menajer, ${state.gameweeks.length} hafta`,
  );
  if (state.players.length !== 37) {
    console.error("\nUYARI: 37 oyuncu bekleniyordu. Tabloda eski bir veri olabilir.\n");
  }

  step(5, "Yazma denemesi");
  const before = state.seasonName;
  try {
    await mutate((draft) => {
      draft.seasonName = before; // içerik değişmiyor, sadece sürüm artıyor
    });
    console.log("tamam");
  } catch (error) {
    console.log("HATA");
    console.error(`\n${(error as Error).message}\n`);
    console.error("service_role anahtarı yazma yetkisi vermiyor olabilir.\n");
    process.exit(1);
  }

  console.log("\nHer şey çalışıyor. Vercel'e aynı iki değişkeni ekleyip yeniden dağıtabilirsin.");
}

main().catch((error) => {
  console.error("\nBeklenmeyen hata:", error);
  process.exit(1);
});
