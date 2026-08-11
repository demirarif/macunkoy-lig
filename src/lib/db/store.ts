import "server-only";
import type { LeagueState } from "./state";
import * as fileStore from "./file-store";
import * as supabaseStore from "./supabase-store";

/**
 * Veri katmanının tek kapısı.
 *
 * Uygulamanın tamamı veriye yalnızca buradaki iki fonksiyonla dokunuyor:
 * `readState` ve `mutate`. Hangi deponun kullanılacağını ortam belirliyor:
 *
 *   SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY tanımlıysa  →  Supabase (yayın)
 *   tanımlı değilse                                       →  .data/league.json (yerel)
 *
 * Böylece projeyi klonlayan biri hiçbir kurulum yapmadan çalıştırabiliyor,
 * yayında ise gerçek veritabanı devreye giriyor. Seçim her çağrıda yapılıyor
 * (modül yüklenirken değil) ki betikler ve testler ortamı sonradan
 * ayarlayabilsin.
 */
function impl() {
  const useSupabase = Boolean(
    process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
  return useSupabase ? supabaseStore : fileStore;
}

/** Hangi deponun kullanıldığı — açılış günlüğü ve sağlık kontrolü için. */
export function activeStore(): "supabase" | "dosya" {
  return process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
    ? "supabase"
    : "dosya";
}

export function readState(): Promise<LeagueState> {
  return impl().readState();
}

/**
 * Durumu güvenli biçimde değiştirir.
 *
 * `fn` state'in bir kopyasını alır ve üzerinde serbestçe oynar; dönen değer
 * kalıcı hâle gelir. `fn` hata fırlatırsa hiçbir şey yazılmaz.
 *
 * Not: Supabase deposunda yazma çakışması olursa `fn` yeniden çalıştırılır.
 * Bu yüzden `fn` yalnızca state üzerinde çalışmalı, dışarıya yan etkisi
 * olmamalı (ör. şifre hash'leme mutate dışında yapılıyor).
 */
export function mutate<T>(fn: (state: LeagueState) => T | Promise<T>): Promise<T> {
  return impl().mutate(fn);
}

/** Testler ve "sezonu sıfırla" için. */
export function resetState(state?: LeagueState): Promise<void> {
  return state === undefined ? impl().resetState() : impl().resetState(state);
}
