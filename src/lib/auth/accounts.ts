import "server-only";
import bcrypt from "bcryptjs";
import { mutate, readState } from "@/lib/db/store";
import type { Manager, Player } from "@/lib/domain/types";

/**
 * Hesaplar.
 *
 * Kayıt diye ayrı bir adım yok. Havuzdaki herkesin hesabı zaten var sayılır:
 * ismini ve varsayılan şifreni (yine kendi ismin) girersin, hesap ilk girişte
 * kendiliğinden oluşur ve hemen kendi şifreni belirlemen istenir.
 *
 * Bir isimle yalnızca bir hesap olabilir — hesap oluştuktan sonra varsayılan
 * şifre çalışmaz, o isme başkası giremez.
 */

const MAX_ATTEMPTS = 6;
const LOCK_MINUTES = 15;
const BCRYPT_ROUNDS = 12;
const MIN_PASSWORD = 4;
const MAX_PASSWORD = 64;

export class AuthError extends Error {}

/**
 * Türkçe karakterleri ve büyük/küçük farkını yok sayan karşılaştırma anahtarı.
 * "Göktuğ", "goktug", "GÖKTUĞ" hepsi aynı anahtara iner.
 */
export function nameKey(value: string): string {
  const map: Record<string, string> = {
    ç: "c", ğ: "g", ı: "i", i: "i", ö: "o", ş: "s", ü: "u", â: "a", î: "i", û: "u",
  };
  return value
    .toLocaleLowerCase("tr")
    .split("")
    .map((ch) => map[ch] ?? ch)
    .join("")
    .replace(/[^a-z0-9]/g, "");
}

function findPlayerByName(players: Player[], input: string): Player | undefined {
  const key = nameKey(input);
  if (!key) return undefined;
  const active = players.filter((p) => p.active);
  return (
    active.find((p) => nameKey(p.name) === key) ??
    // Tek kelimeyle giriş: "Kamil" → "Kamil Reis". Yalnızca tek eşleşme varsa kabul.
    singleMatch(active.filter((p) => nameKey(p.name).startsWith(key)))
  );
}

function singleMatch(matches: Player[]): Player | undefined {
  return matches.length === 1 ? matches[0] : undefined;
}

export function assertValidPassword(password: string): void {
  if (password.length < MIN_PASSWORD || password.length > MAX_PASSWORD) {
    throw new AuthError(`Şifre en az ${MIN_PASSWORD} karakter olmalı.`);
  }
}

/** Giriş ekranında gösterilecek örnek isim — placeholder için. */
export async function sampleName(): Promise<string> {
  const state = await readState();
  return state.players.find((p) => p.active)?.name ?? "Göktuğ";
}

export interface LoginResult {
  manager: Manager;
  /** Varsayılan şifreyle girdi; hemen değiştirmesi istenecek. */
  mustChangePassword: boolean;
}

/**
 * İsim + şifre ile giriş. Hesap yoksa varsayılan şifreyle (kendi ismi) oluşturur.
 */
export async function login(nameInput: string, password: string): Promise<LoginResult> {
  const state = await readState();
  const player = findPlayerByName(state.players, nameInput);
  if (!player) {
    throw new AuthError(
      "Bu isimde bir oyuncu bulamadım. Adını listedeki gibi yaz ya da admin'e söyle.",
    );
  }

  const existing = state.managers.find((m) => m.playerId === player.id);

  // --- İlk giriş: hesap yok, varsayılan şifre kendi ismi ---
  if (!existing) {
    if (nameKey(password) !== nameKey(player.name)) {
      throw new AuthError(
        `${player.name} için ilk giriş şifresi kendi ismin. Sonra değiştireceksin.`,
      );
    }
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const manager = await mutate((draft) => {
      // Yarış durumu: iki sekmeden aynı anda girilirse ikinci hesabı açmayalım.
      const already = draft.managers.find((m) => m.playerId === player.id);
      if (already) return already;
      const created: Manager = {
        id: `mgr-${player.id}`,
        playerId: player.id,
        teamName: null,
        passwordHash,
        mustChangePassword: true,
        createdAt: new Date().toISOString(),
        lastSeenAt: new Date().toISOString(),
        failedAttempts: 0,
        lockedUntil: null,
      };
      draft.managers.push(created);
      return created;
    });
    return { manager, mustChangePassword: true };
  }

  // --- Normal giriş ---
  if (existing.lockedUntil && new Date(existing.lockedUntil) > new Date()) {
    const mins = Math.ceil((new Date(existing.lockedUntil).getTime() - Date.now()) / 60_000);
    throw new AuthError(`Çok fazla yanlış deneme. ${mins} dakika sonra tekrar dene.`);
  }

  // bcrypt yavaştır; yazma kuyruğunu bloklamasın diye mutate dışında karşılaştırıyoruz.
  const ok = await bcrypt.compare(password, existing.passwordHash);

  const manager = await mutate((draft) => {
    const target = draft.managers.find((m) => m.playerId === player.id);
    if (!target) throw new AuthError("Hesap bulunamadı.");

    if (!ok) {
      target.failedAttempts += 1;
      if (target.failedAttempts >= MAX_ATTEMPTS) {
        target.lockedUntil = new Date(Date.now() + LOCK_MINUTES * 60_000).toISOString();
        target.failedAttempts = 0;
        throw new AuthError(`Çok fazla yanlış deneme. Giriş ${LOCK_MINUTES} dakika kapandı.`);
      }
      throw new AuthError(
        `Şifre yanlış. ${MAX_ATTEMPTS - target.failedAttempts} deneme hakkın kaldı.`,
      );
    }

    target.failedAttempts = 0;
    target.lockedUntil = null;
    target.lastSeenAt = new Date().toISOString();
    return target;
  });

  return { manager, mustChangePassword: manager.mustChangePassword };
}

export async function changePassword(
  managerId: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  assertValidPassword(newPassword);
  const state = await readState();
  const manager = state.managers.find((m) => m.id === managerId);
  if (!manager) throw new AuthError("Hesap bulunamadı.");
  if (!(await bcrypt.compare(currentPassword, manager.passwordHash))) {
    throw new AuthError("Mevcut şifre yanlış.");
  }
  const player = state.players.find((p) => p.id === manager.playerId);
  if (player && nameKey(newPassword) === nameKey(player.name)) {
    throw new AuthError("Yeni şifre kendi ismin olamaz — varsayılan şifre buydu.");
  }
  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  await mutate((draft) => {
    const target = draft.managers.find((m) => m.id === managerId);
    if (!target) return;
    target.passwordHash = passwordHash;
    target.mustChangePassword = false;
  });
}

export async function setTeamName(managerId: string, teamName: string): Promise<void> {
  const clean = teamName.trim().replace(/\s+/g, " ");
  if (clean && (clean.length < 2 || clean.length > 24)) {
    throw new AuthError("Takım adı 2 ile 24 karakter arasında olmalı.");
  }
  await mutate((draft) => {
    const manager = draft.managers.find((m) => m.id === managerId);
    if (!manager) throw new AuthError("Hesap bulunamadı.");
    if (clean) {
      const taken = draft.managers.some(
        (m) =>
          m.id !== managerId &&
          m.teamName?.toLocaleLowerCase("tr") === clean.toLocaleLowerCase("tr"),
      );
      if (taken) throw new AuthError("Bu takım adı alınmış, başka bir tane seç.");
    }
    manager.teamName = clean || null;
  });
}

/** Admin, şifresini unutan arkadaşın hesabını varsayılana döndürebilsin. */
export async function adminResetAccount(playerId: string): Promise<void> {
  await mutate((draft) => {
    draft.managers = draft.managers.filter((m) => m.playerId !== playerId);
  });
}

/**
 * Admin girişi. Kimlik bilgileri ortam değişkenlerinden gelir, veritabanında
 * tutulmaz — böylece uygulamaya sızan biri admin şifresini ele geçiremez.
 */
export async function verifyAdmin(username: string, password: string): Promise<boolean> {
  const expectedUser = process.env.ADMIN_USERNAME;
  const expectedPass = process.env.ADMIN_PASSWORD;
  if (!expectedUser || !expectedPass) {
    throw new AuthError(
      "Admin hesabı tanımlı değil. .env.local içine ADMIN_USERNAME ve ADMIN_PASSWORD ekle.",
    );
  }
  // Zamanlama sızıntısını önlemek için iki karşılaştırma da her zaman çalışır.
  const userOk = timingSafeEqual(username, expectedUser);
  const passOk = timingSafeEqual(password, expectedPass);
  return userOk && passOk;
}

function timingSafeEqual(a: string, b: string): boolean {
  const max = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < max; i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}
