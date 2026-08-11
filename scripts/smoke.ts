/**
 * Duman testi — çalışan sunucuya gerçek bir oturumla girip tüm sayfaları gezer.
 *
 *   npm run duman            (varsayılan http://localhost:3000)
 *   npm run duman -- 3001    (başka port)
 *
 * Her sayfanın 200 döndüğünü, beklenen metni içerdiğini ve Next'in hata
 * kabuğunu basmadığını doğrular.
 */

import fs from "node:fs";
import path from "node:path";
import { SignJWT } from "jose";
import { readState } from "@/lib/db/store";

// .env.local'i elle yüklüyoruz: tsx, node'un --env-file bayrağını iletmiyor.
for (const line of readEnvFile(".env.local")) {
  const eq = line.indexOf("=");
  if (eq < 1 || line.trimStart().startsWith("#")) continue;
  const key = line.slice(0, eq).trim();
  if (!process.env[key]) process.env[key] = line.slice(eq + 1).trim();
}

function readEnvFile(file: string): string[] {
  const full = path.join(process.cwd(), file);
  if (!fs.existsSync(full)) return [];
  return fs.readFileSync(full, "utf8").replace(/^﻿/, "").split(/\r?\n/);
}

const port = process.argv[2] ?? "3000";
const BASE = `http://localhost:${port}`;

interface Check {
  path: string;
  expect: string[];
  as: "manager" | "admin" | "anon";
}

async function makeCookie(payload: Record<string, string>): Promise<string> {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET yok — .env.local yüklenmedi mi?");
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(new TextEncoder().encode(secret));
}

async function main() {
  const state = await readState();
  const manager = state.managers[0];
  if (!manager) {
    console.error("Kayıtlı menajer yok. Önce `npm run demo` çalıştır.");
    process.exit(1);
  }
  const settled = state.gameweeks.find((g) => g.status === "completed");
  const samplePlayer = state.players[0];

  const managerCookie = `mfl_manager=${await makeCookie({ managerId: manager.id })}`;
  const adminCookie = `mfl_admin=${await makeCookie({ admin: "demo" })}`;

  const checks: Check[] = [
    { path: "/giris", expect: ["Macunköy", "Fantazi Ligi"], as: "anon" },
    { path: "/admin/giris", expect: ["Admin"], as: "anon" },
    { path: "/", expect: ["Lig tablosu"], as: "manager" },
    { path: "/kadro", expect: ["Kalan bütçe", "Denge", "Kamikaze"], as: "manager" },
    { path: "/lig", expect: ["Lig Tablosu", "Haftalar"], as: "manager" },
    { path: "/fikstur", expect: ["Fikstür", "Toplam puanım"], as: "manager" },
    { path: "/puanlar", expect: ["Kim Kaç Puan Getiriyor"], as: "manager" },
    { path: "/havuz", expect: ["Oyuncu Havuzu"], as: "manager" },
    { path: `/oyuncu/${samplePlayer.id}`, expect: [samplePlayer.name, "Fantazi getirisi"], as: "manager" },
    { path: "/kurallar", expect: ["Kurallar", "Kaleci puanlaması"], as: "manager" },
    { path: "/profil", expect: ["Takım adı", "Şifre değiştir"], as: "manager" },
    { path: "/admin", expect: ["Haftalık Akış", "Fikstür"], as: "admin" },
    { path: "/admin/hafta/1", expect: ["Hafta", "Maç verisi"], as: "admin" },
    
    
    { path: "/admin/veriler", expect: ["Veriler", "Hafta raporu"], as: "admin" },
    { path: "/admin/puanlar", expect: ["Puanlar"], as: "admin" },
    { path: "/admin/ayarlar", expect: ["Ayarlar", "Puanlama"], as: "admin" },
  ];

  if (settled) {
    checks.push({
      path: `/hafta/${settled.number}`,
      expect: ["Hafta", "Haftanın sıralaması"],
      as: "manager",
    });
  }

  let failures = 0;

  for (const check of checks) {
    const cookie =
      check.as === "manager" ? managerCookie : check.as === "admin" ? adminCookie : "";
    let line = `${check.path.padEnd(24)} `;
    try {
      const response = await fetch(`${BASE}${check.path}`, {
        headers: cookie ? { cookie } : {},
        redirect: "manual",
      });
      const body = await response.text();
      const missing = check.expect.filter((needle) => !body.includes(needle));
      const crashed =
        body.includes("Application error") ||
        body.includes("Unhandled Runtime Error") ||
        body.includes("__next_error__");

      if (response.status !== 200) {
        line += `✕ HTTP ${response.status}`;
        failures++;
      } else if (crashed) {
        line += "✕ sayfa hata verdi";
        failures++;
      } else if (missing.length) {
        line += `✕ beklenen metin yok: ${missing.join(", ")}`;
        failures++;
      } else {
        line += `✓ 200  ${(body.length / 1024).toFixed(0)} KB`;
      }
    } catch (error) {
      line += `✕ ${(error as Error).message}`;
      failures++;
    }
    console.log(line);
  }

  // Oturumsuz erişim engellenmeli.
  for (const guarded of ["/", "/kadro", "/admin", "/admin/ayarlar"]) {
    const response = await fetch(`${BASE}${guarded}`, { redirect: "manual" });
    const ok = response.status === 307 || response.status === 302;
    console.log(`${`${guarded} (oturumsuz)`.padEnd(24)} ${ok ? "✓ yönlendirildi" : `✕ HTTP ${response.status}`}`);
    if (!ok) failures++;
  }

  // Menajer oturumu admin paneline giremesin.
  const leak = await fetch(`${BASE}/admin/ayarlar`, {
    headers: { cookie: managerCookie },
    redirect: "manual",
  });
  const blocked = leak.status === 307 || leak.status === 302;
  console.log(
    `${"/admin (menajer kimliği)".padEnd(24)} ${blocked ? "✓ engellendi" : `✕ HTTP ${leak.status}`}`,
  );
  if (!blocked) failures++;

  console.log(
    failures === 0 ? "\nTüm sayfalar çalışıyor." : `\n${failures} kontrol başarısız.`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
