-- ============================================================================
-- Macunköy Fantazi Ligi — Supabase kurulumu
-- ============================================================================
--
-- ÇALIŞTIRMA: Supabase panelinde sol menüden "SQL Editor" → "New query" →
-- bu dosyanın tamamını yapıştır → "Run".
--
-- Tek seferlik. Bir daha çalıştırman gerekmiyor (tekrar çalıştırsan da zarar
-- vermez, "if not exists" ile korumalı).
-- ============================================================================


-- ----------------------------------------------------------------------------
-- Ligin tamamı tek satırda, JSONB olarak.
--
-- Neden tek satır? Uygulama veriye yalnızca iki fonksiyonla dokunuyor
-- (readState / mutate) ve bütün lig birkaç yüz kilobayt. 40 kişilik bir ligde
-- veriyi sekiz ayrı tabloya bölmenin pratik bir kazancı yok; buna karşılık
-- kod çok daha basit ve hata yüzeyi çok daha küçük kalıyor.
--
-- İçinde ne var: lig ayarları, 37 oyuncu, menajer hesapları, haftalar, maç
-- istatistikleri, kadrolar ve fiyat geçmişi.
--
-- İleride ilişkisel şemaya geçmek istenirse: supabase/ileride-tam-sema.sql
-- ----------------------------------------------------------------------------
create table if not exists league_state (
  id         smallint    primary key default 1 check (id = 1),

  -- İyimser kilit sayacı. Uygulama yazarken "okuduğum sürüm hâlâ aynı mı"
  -- diye bakıyor; aynı anda iki kişi kadro kaydederse biri ezilmiyor,
  -- ikinci yazma baştan okuyup tekrar deniyor.
  version    bigint      not null default 1,

  data       jsonb       not null,
  updated_at timestamptz not null default now()
);


-- ----------------------------------------------------------------------------
-- Güvenlik: bu tabloya tarayıcıdan erişilemez.
--
-- RLS açık ve hiçbir politika yok. Politikasız + RLS açık demek, service_role
-- dışında hiç kimsenin geçemeyeceği demek. Uygulama Supabase'e yalnızca
-- sunucu tarafından, service_role anahtarıyla bağlanıyor; o anahtar hiçbir
-- zaman tarayıcıya gitmiyor.
-- ----------------------------------------------------------------------------
alter table league_state enable row level security;


-- ----------------------------------------------------------------------------
-- Kurulum tamam.
--
-- Tabloyu şimdi boş göreceksin. Uygulama Supabase'e ilk bağlandığında satırı
-- kendisi oluşturup 37 oyuncu ve 1. hafta ile dolduruyor — ayrıca bir tohumlama
-- betiği çalıştırman gerekmiyor.
--
-- Kontrol etmek için (uygulama bir kez açıldıktan sonra):
--
--   select
--     version,
--     jsonb_array_length(data->'players')   as oyuncu,
--     jsonb_array_length(data->'managers')  as menajer,
--     jsonb_array_length(data->'gameweeks') as hafta,
--     updated_at
--   from league_state;
-- ----------------------------------------------------------------------------
