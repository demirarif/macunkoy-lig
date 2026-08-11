/**
 * Oyuncu figürlerini karta hazır hâle getirir.
 *
 *   npm run figurler
 *
 * Ne yapar:
 *  1. "oyuncu gorseller" klasöründeki PNG'leri okur
 *  2. Etrafındaki şeffaf boşluğu kırpar (üretilen görsellerde bol miktarda var)
 *  3. Hepsini aynı yüksekliğe normalize eder ki kartlarda figürler aynı boyda dursun
 *  4. public/players/<oyuncu-id>.png olarak yazar
 *
 * scripts/figures.json içindeki eşlemeyi kullanır. Eşlemede olmayan oyunculara
 * mevcut görsellerden sırayla biri atanır — figürler tamamlandıkça JSON'a satır
 * ekleyip komutu yeniden çalıştırman yeterli.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE_DIR = path.join(ROOT, "oyuncu gorseller");
const OUT_DIR = path.join(ROOT, "public", "players");
const MAP_FILE = path.join(ROOT, "scripts", "figures.json");

/** Kart figür alanına göre seçildi: tüm figürler aynı yükseklikte render edilir. */
const TARGET_HEIGHT = 760;
const MAX_WIDTH = 620;

async function readPlayerIds() {
  // players.seed.ts'i TypeScript derlemeden okumak için id'leri doğrudan ayıklıyoruz.
  const source = await fs.readFile(
    path.join(ROOT, "src", "lib", "domain", "players.seed.ts"),
    "utf8",
  );
  const body = source.slice(
    source.indexOf("const SEED: Record<string, Seed> = {"),
    source.indexOf("export const SEED_PLAYERS"),
  );
  const ids = [];
  for (const match of body.matchAll(/^\s*"?([a-z0-9-]+)"?:\s*\[/gm)) {
    ids.push(match[1]);
  }
  return ids;
}

async function main() {
  const manifest = JSON.parse(await fs.readFile(MAP_FILE, "utf8"));
  const explicit = manifest.map ?? {};
  const playerIds = await readPlayerIds();

  let available;
  try {
    available = (await fs.readdir(SOURCE_DIR))
      .filter((f) => /\.(png|jpe?g|webp)$/i.test(f))
      .sort();
  } catch {
    console.error(`Kaynak klasör bulunamadı: ${SOURCE_DIR}`);
    process.exit(1);
  }
  if (available.length === 0) {
    console.error("Kaynak klasörde görsel yok.");
    process.exit(1);
  }

  await fs.mkdir(OUT_DIR, { recursive: true });

  // Eşlemesi olmayan oyuncular için: sırayla dağıt ama yan yana gelenler
  // aynı görseli almasın diye adım sayısını görsel sayısına asal tut.
  const unmapped = playerIds.filter((id) => !explicit[id]);
  const stride = available.length % 2 === 0 ? 3 : 2;
  const fallback = new Map();
  unmapped.forEach((id, i) => {
    fallback.set(id, available[(i * stride + 1) % available.length]);
  });

  let written = 0;
  let reused = 0;

  for (const id of playerIds) {
    const isExplicit = Boolean(explicit[id]);
    const file = explicit[id] ?? fallback.get(id);
    const source = path.join(SOURCE_DIR, file);

    try {
      await fs.access(source);
    } catch {
      console.warn(`  ! ${id}: kaynak yok (${file}) — atlandı`);
      continue;
    }

    await sharp(source)
      .ensureAlpha()
      // Üretilen görsellerde figürün etrafında çok geniş şeffaf alan var;
      // kırpmazsak kartlarda figür minicik görünüyor.
      .trim({ threshold: 12 })
      .resize({
        height: TARGET_HEIGHT,
        width: MAX_WIDTH,
        fit: "inside",
        withoutEnlargement: false,
      })
      .png({ compressionLevel: 9, quality: 90 })
      .toFile(path.join(OUT_DIR, `${id}.png`));

    written++;
    if (!isExplicit) reused++;
    console.log(`  ${isExplicit ? "✓" : "~"} ${id}.png`);
  }

  console.log(
    `\n${written} figür yazıldı → public/players/` +
      (reused > 0
        ? `\n${reused} tanesi geçici olarak başka bir figürü kullanıyor (~ ile işaretli).`
        : ""),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
