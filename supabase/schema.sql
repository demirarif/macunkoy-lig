-- ============================================================================
-- Macunköy Fantazi Ligi — Supabase (Postgres) şeması
-- ============================================================================
--
-- Bu dosyayı Supabase SQL Editor'e yapıştırıp çalıştır. Ayrıntılı anlatım için
-- depo kökündeki VERI-MIMARISI.md dosyasına bak.
--
-- Tasarım kararı: uygulamaya tarayıcıdan hiçbir tablo açılmıyor. Bütün erişim
-- sunucu tarafından, service_role anahtarıyla yapılıyor. Bu yüzden her tabloda
-- RLS açık ve hiçbir politika yok — service_role dışında kimse geçemez.
-- ============================================================================

create extension if not exists "pgcrypto";

-- --------------------------------------------------------------------------
-- Lig ayarları — tek satır.
--
-- Puanlama ve fiyat katsayıları JSONB olarak tutuluyor çünkü admin panelinden
-- serbestçe değiştiriliyor; her ayar için ayrı sütun açmak her değişiklikte
-- migration gerektirirdi.
-- --------------------------------------------------------------------------
create table if not exists league (
  id           smallint primary key default 1 check (id = 1),
  season_name  text         not null default 'Sezon 1',
  budget       numeric(6,1) not null default 85,
  scoring      jsonb        not null,
  pricing      jsonb        not null,
  updated_at   timestamptz  not null default now()
);

-- --------------------------------------------------------------------------
-- Oyuncu havuzu
-- --------------------------------------------------------------------------
create table if not exists players (
  id           text primary key,              -- 'goktug', 'kamil-reis'
  name         text         not null,
  -- Oyuncunun konabileceği slotlar: 'GK' | 'DEF' | 'MID' | 'FWD'
  slots        text[]       not null check (array_length(slots, 1) between 1 and 4),
  base_price   numeric(4,1) not null,         -- sezon başı fiyatı, hiç değişmez
  price        numeric(4,1) not null,         -- güncel fiyat, her hafta oynar
  -- Haftadan haftaya kaleci ya da oyuncu olabilenler (Barkuz)
  dual_keeper  boolean      not null default false,
  active       boolean      not null default true,
  created_at   timestamptz  not null default now()
);

create index if not exists players_active_idx on players (active) where active;

-- --------------------------------------------------------------------------
-- Menajer hesapları.
--
-- player_id benzersiz: bir isimle iki hesap açılamaz. Hesap, kişi ilk kez
-- kendi ismiyle giriş yaptığında otomatik oluşur.
-- --------------------------------------------------------------------------
create table if not exists managers (
  id                   uuid primary key default gen_random_uuid(),
  player_id            text        not null unique references players (id) on delete cascade,
  team_name            text        unique,     -- isteğe bağlı; boşsa oyuncunun adı görünür
  password_hash        text        not null,   -- bcrypt, 12 tur
  -- Hâlâ varsayılan şifre (kendi ismi) kullanılıyorsa true
  must_change_password boolean     not null default true,
  failed_attempts      smallint    not null default 0,
  locked_until         timestamptz,
  last_seen_at         timestamptz,
  created_at           timestamptz not null default now()
);

-- --------------------------------------------------------------------------
-- Haftalar
--
-- open      → kadro kurulabilir
-- locked    → Salı 23:00 geçti, kadrolar donmuş
-- teams     → admin 22 kişiyi iki takıma böldü
-- completed → skor + reytingler girildi ve onaylandı; ARTIK DEĞİŞMEZ
-- holiday   → o hafta maç yok
-- --------------------------------------------------------------------------
do $$ begin
  create type gameweek_status as enum ('open', 'locked', 'teams', 'completed', 'holiday');
exception when duplicate_object then null;
end $$;

create table if not exists gameweeks (
  id               uuid primary key default gen_random_uuid(),
  number           integer         not null unique,
  status           gameweek_status not null default 'open',
  lock_at          timestamptz     not null,   -- Salı 23:00 (Türkiye saati)
  match_at         timestamptz     not null,   -- bir sonraki Salı 21:00

  -- Pencere açılırken ilan edilen kampanyalı oyuncular
  promo_player_ids text[]          not null default '{}',

  -- Takımlar girildikten sonra dolar
  team_a_ids       text[]          not null default '{}',
  team_b_ids       text[]          not null default '{}',
  captain_ids      text[]          not null default '{}',

  -- Maç sonrası
  score_a          smallint,
  score_b          smallint,
  mvp_player_id    text references players (id),

  -- Doluysa hafta kilitli demektir
  completed_at     timestamptz,
  created_at       timestamptz     not null default now()
);

create index if not exists gameweeks_status_idx on gameweeks (status);

-- --------------------------------------------------------------------------
-- Maç istatistikleri — her hafta her oyuncu için en fazla bir satır
-- --------------------------------------------------------------------------
create table if not exists match_stats (
  gameweek_id uuid         not null references gameweeks (id) on delete cascade,
  player_id   text         not null references players (id)   on delete cascade,
  played      boolean      not null default true,
  -- O hafta kalede mi oynadı. Slot uyuşmazlığı ve gol puanının yanması
  -- doğrudan bu alandan hesaplanır.
  kept_goal   boolean      not null default false,
  team        char(1)      not null check (team in ('A', 'B')),
  goals       smallint     not null default 0 check (goals >= 0),
  rating      numeric(3,1) not null default 6.5 check (rating between 0 and 10),
  primary key (gameweek_id, player_id)
);

-- --------------------------------------------------------------------------
-- Kadrolar — her hafta her menajer için en fazla bir kadro
-- --------------------------------------------------------------------------
create table if not exists squads (
  id           uuid primary key default gen_random_uuid(),
  gameweek_id  uuid        not null references gameweeks (id) on delete cascade,
  manager_id   uuid        not null references managers (id)  on delete cascade,
  formation_id text        not null,   -- 'denge' | 'beton' | 'kontrol' | 'baski' | 'kamikaze'
  -- 'manual' = menajer kurdu, 'rollover' = kilitte otomatik devretti
  source       text        not null default 'manual' check (source in ('manual', 'rollover')),
  updated_at   timestamptz not null default now(),
  unique (gameweek_id, manager_id)
);

create table if not exists squad_picks (
  squad_id  uuid not null references squads (id)  on delete cascade,
  player_id text not null references players (id) on delete cascade,
  -- Menajerin oyuncuyu koyduğu slot. Gerçek rolle uyuşmazsa gol puanı yanar.
  slot      text not null check (slot in ('GK', 'DEF', 'MID', 'FWD')),
  primary key (squad_id, player_id)
);

create index if not exists squad_picks_player_idx on squad_picks (player_id);

-- --------------------------------------------------------------------------
-- Fiyat geçmişi — oyuncu sayfasındaki grafik için.
-- gameweek_number = 0 sezon başı fiyatıdır.
-- --------------------------------------------------------------------------
create table if not exists price_history (
  gameweek_number integer      not null,
  player_id       text         not null references players (id) on delete cascade,
  price           numeric(4,1) not null,
  primary key (gameweek_number, player_id)
);

-- --------------------------------------------------------------------------
-- Güvenlik: hiçbir tablo tarayıcıya açık değil.
-- Uygulama sunucu tarafından service_role anahtarıyla bağlanır ve RLS'i atlar.
-- --------------------------------------------------------------------------
alter table league        enable row level security;
alter table players       enable row level security;
alter table managers      enable row level security;
alter table gameweeks     enable row level security;
alter table match_stats   enable row level security;
alter table squads        enable row level security;
alter table squad_picks   enable row level security;
alter table price_history enable row level security;

-- --------------------------------------------------------------------------
-- Başlangıç ayarları.
--
-- Oyuncu havuzu buraya yazılmıyor: tek doğru kaynak
-- src/lib/domain/players.seed.ts. İki yerde iki liste tutmak, er geç
-- birbirinden kayan iki liste demek.
-- --------------------------------------------------------------------------
insert into league (id, season_name, budget, scoring, pricing)
values (
  1,
  'Sezon 1',
  85,
  '{
    "played": 2,
    "noShow": -5,
    "goal": { "GK": 8, "DEF": 5, "MID": 4, "FWD": 3 },
    "win": 3, "draw": 1, "loss": -2, "mvp": 5,
    "outfieldRatingBands": [
      { "min": 9.0, "points": 5 }, { "min": 8.0, "points": 3 },
      { "min": 7.0, "points": 1 }, { "min": 6.0, "points": 0 },
      { "min": 5.0, "points": -2 }, { "min": 0.0, "points": -4 }
    ],
    "keeperRatingBands": [
      { "min": 8.0, "points": 6 }, { "min": 7.0, "points": 4 },
      { "min": 6.0, "points": 2 }, { "min": 5.0, "points": 0 },
      { "min": 4.0, "points": -1 }, { "min": 0.0, "points": -2 }
    ],
    "captainMultiplier": 2,
    "promoMultiplier": 1.5,
    "promoDiscount": 0.4,
    "promoCount": 3,
    "captainCount": 2
  }'::jsonb,
  '{
    "minPrice": 4, "maxPrice": 20, "step": 0.5,
    "goodRating": 7.5, "badRating": 6.0,
    "goodWeeksForRaise": 2,
    "absentWeeksForDrop": 3, "absentDrop": 0.5,
    "weeklyCap": 1.0
  }'::jsonb
)
on conflict (id) do nothing;
