# Veri Mimarisi — Macunköy Fantazi Ligi

> Bu belgeyi projeye sonradan dahil olacak biri okusun diye yazdım. Ligi ben
> kurdum, sistemi ben tasarladım; burada verinin nasıl tutulmasını istediğimi ve
> yayına alırken neyin nasıl kurulacağını anlatıyorum. Kod tarafındaki karşılığı
> için `README.md`'ye bak.

---

## 1. Elimde ne var, ne saklıyorum

Ligde saklanması gereken şey aslında az. Yedi parça var, hepsi bu:

| Ne | Kaç kayıt | Ne sıklıkla değişir |
|---|---|---|
| **Lig ayarları** | 1 satır | Nadiren — bütçe, puan katsayıları |
| **Oyuncular** | 37 satır | Fiyatları her hafta, gerisi çok nadir |
| **Menajer hesapları** | ~37 satır | Bir kez açılır, sonra şifre değişir |
| **Haftalar** | Sezonda ~40 satır | Her hafta bir tane |
| **Maç istatistikleri** | Hafta başına 22 satır | Maçtan sonra bir kez girilir |
| **Kadrolar** | Hafta başına ~37 satır | Hafta boyunca değişir, kilitte donar |
| **Fiyat geçmişi** | Hafta başına 37 satır | Hafta tamamlanınca yazılır |

Bir sezon sonunda toplam kayıt sayısı **birkaç bin**. Bu, veritabanı seçimi
açısından önemli: burada ölçek diye bir sorunumuz yok. Seçimi hız değil,
**güvenilirlik ve kolay yedeklenebilirlik** belirlemeli.

### Saklamadığım şeyler

Bilerek tutmadığım iki şey var, karıştırılmasın:

**Puanlar tutulmuyor.** Hiçbir yerde "Göktuğ 3. haftada 24 puan aldı" diye bir
kayıt yok. Puan her seferinde ham veriden hesaplanıyor: kadro + o haftanın
istatistikleri + o anki puanlama ayarları. Böylece bir kural değiştiğinde bütün
tablo kendiliğinden doğru hâle geliyor, elimde eski kuralla hesaplanmış bayat
puanlar kalmıyor. Lig tablosu da aynı şekilde, her istekte baştan hesaplanıyor.

**Admin şifresi veritabanında değil.** Ortam değişkeninde duruyor. Sebebi basit:
veritabanına sızan biri admin paneline giremesin istiyorum.

---

## 2. Nerede duruyor

Uygulama iki depoyla çalışabiliyor ve hangisini kullanacağını ortam değişkenleri
belirliyor:

| Ortam | Depo | Ne zaman |
|---|---|---|
| Yerel geliştirme | `.data/league.json` | `SUPABASE_*` tanımlı değilse |
| Yayın (Vercel) | Supabase Postgres | `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` doluysa |

Seçim `src/lib/db/store.ts` içinde yapılıyor; uygulamanın geri kalanı hangisinin
çalıştığını bilmiyor.

### Yerel: JSON dosyası

Projeyi klonlayan biri `npm install && npm run dev` deyip hiçbir kurulum
yapmadan çalışan bir lig görebilsin diye. Tek makinede sorunsuz: yazmalar sıraya
alınıyor, önce geçici dosyaya yazılıp sonra yerine taşınıyor (yazma yarıda
kalırsa veri bozulmuyor), okumalar dosyanın değişiklik zamanına bakan bir
önbellekten geçiyor.

**Yayında bu çalışmaz.** Vercel'de proje dizini salt okunur — ilk yazma denemesi
`EROFS: read-only file system` ile patlar ve her sayfa 500 verir. `/tmp`'ye
yazsak bile çözmez: her sunucu örneğinin kendi geçici diski var, veri bölünür ve
her yeni dağıtımda silinir.

### Yayın: Supabase, tek JSONB satırı

Bütün lig `league_state` tablosunda **tek satır** hâlinde duruyor.

**Neden tek satır, neden sekiz tabloya bölmedim:** Uygulama veriye yalnızca iki
fonksiyonla dokunuyor — `readState` ve `mutate`. Bütün lig birkaç yüz kilobayt.
40 kişilik bir ligde veriyi ayrı tablolara bölmenin pratik bir kazancı yok; buna
karşılık kod çok daha basit kalıyor ve eşleme hatası riski sıfırlanıyor. Oyun
mantığını hiç ellemeden veritabanına geçebildik. İleride gerekirse ilişkisel
şemaya geçilir; `supabase/ileride-tam-sema.sql` hazır duruyor.

**Eşzamanlı yazma nasıl çözülüyor:** Satırın bir `version` sayacı var. Yazarken
"okuduğum sürüm hâlâ aynıysa yaz" diyoruz. Araya biri girmişse hiçbir satır
güncellenmiyor; uygulama baştan okuyup tekrar deniyor (en fazla 6 kez). Böylece
iki menajer aynı anda kadro kaydettiğinde biri diğerini ezmiyor.

---

## 3. Neden Supabase

Supabase'i seçmemin sebepleri:

- **Gerçek Postgres.** Verim ilişkisel; haftalar, kadrolar, istatistikler
  birbirine bağlı. Doküman veritabanı bu işi zorlaştırırdı.
- **Ücretsiz katman bize fazlasıyla yeter.** 40 kişilik bir lig, birkaç bin satır.
- **Otomatik yedek ve panel.** Bir şey ters giderse Supabase panelinden tabloya
  bakabiliyorum, SQL çalıştırabiliyorum, yedek alabiliyorum. Bu benim için önemli
  çünkü sezon ortasında veri kaybı kabul edilemez.
- **Vercel ile sorunsuz çalışıyor.**

Alternatifleri de değerlendirdim: Vercel Postgres aynı işi görür ama Supabase'in
paneli daha kullanışlı. SQLite/Turso da olurdu ama yedekleme tarafı elle iş
gerektiriyor.

### Tek kural: veritabanına yalnızca sunucu erişecek

Bunu net olarak istiyorum. Supabase'in `anon` anahtarını tarayıcıya **hiç
koymayacağız**. Bütün okuma ve yazma Next.js sunucu tarafından, `service_role`
anahtarıyla yapılacak.

Sebebi: bu bir fantazi ligi. Tarayıcıya veritabanı erişimi verirsem, biraz
meraklı biri konsolu açıp başkasının kadrosunu okuyabilir ya da kendi puanını
değiştirmeyi deneyebilir. Bütün yetkiyi sunucuda tutunca böyle bir yüzey hiç
oluşmuyor.

Bu yüzden `kurulum.sql` içinde tabloda RLS açık ve **hiçbir politika yok**.
Politikasız + RLS açık = `service_role` dışında kimse geçemez. Kasıtlı.

---

## 4. Veri neye benziyor

Supabase tarafında tek tablo, tek satır var:

```sql
league_state (
  id          smallint     -- her zaman 1
  version     bigint       -- iyimser kilit sayacı
  data        jsonb        -- ligin tamamı
  updated_at  timestamptz
)
```

`data` içindeki yapı `src/lib/db/state.ts` dosyasındaki `LeagueState` tipinin
birebir karşılığı:

```jsonc
{
  "version": 1,
  "seasonName": "Sezon 1",
  "config": {
    "budget": 85,
    "scoring": { /* puan katsayıları, reyting basamakları, çarpanlar */ },
    "pricing": { /* fiyat algoritması parametreleri */ }
  },
  "players": [
    { "id": "goktug", "name": "Göktuğ", "slots": ["FWD","MID"],
      "basePrice": 15, "price": 15.2, "dualKeeper": false, "active": true }
  ],
  "managers": [
    { "id": "mgr-goktug", "playerId": "goktug", "teamName": null,
      "passwordHash": "$2b$12$...", "mustChangePassword": false,
      "failedAttempts": 0, "lockedUntil": null, "createdAt": "...", "lastSeenAt": "..." }
  ],
  "gameweeks": [
    { "id": "gw-1", "number": 1, "status": "completed",
      "lockAt": "...", "matchAt": "...",
      "promoPlayerIds": ["onur","mamadou","yusuf"],
      "calledUpIds": [/* 22 kişi */], "teamAIds": [], "teamBIds": [],
      "captainIds": ["alper","servan"],
      "scoreA": 8, "scoreB": 5, "mvpPlayerId": "taha",
      "stats": [
        { "playerId": "alper", "played": true, "keptGoal": false,
          "team": "A", "goals": 2, "rating": 8.5 }
      ],
      "completedAt": "..." }
  ],
  "squads": [
    { "id": "sq-gw-1-mgr-goktug", "gameweekId": "gw-1", "managerId": "mgr-goktug",
      "formationId": "denge", "source": "manual", "updatedAt": "...",
      "picks": [ { "playerId": "talha", "slot": "GK" } ] }
  ],
  "priceHistory": [
    { "gameweekNumber": 1, "playerId": "goktug", "price": 15.2 }
  ]
}
```

Birkaç tasarım notu:

**Oyuncu id'leri metin ve elle yazılmış** (`goktug`, `kamil-reis`). UUID
kullanmadım çünkü figür dosyaları `public/players/<id>.png` diye duruyor.
Okunabilir olması işime geliyor.

**`squads[].picks` içinde slot da tutuluyor.** Sadece oyuncu listesi yetmezdi:
Barkuz'u kaleye mi forvete mi koyduğun puanı doğrudan değiştiriyor.

**`stats[].keptGoal` kritik.** Fantazi tarafındaki "mevki bahsi" kuralı tamamen
buna bakıyor. Admin'in tek yapması gereken o hafta kalede kimin oynadığını
işaretlemek; gerisini sistem hesaplıyor.

**`gameweeks[].completedAt` doluysa hafta kilitli.** Geri açma yolu bilerek yok.

**Şifreler bcrypt hash'i olarak duruyor**, düz metin hiçbir yerde yok.

Bu yapıyı SQL'den de sorgulayabilirsin:

```sql
-- Lig özeti
select jsonb_array_length(data->'players')  as oyuncu,
       jsonb_array_length(data->'managers') as menajer,
       version, updated_at
from league_state;

-- Oyuncuların güncel fiyatları
select p->>'name' as isim, (p->>'price')::numeric as fiyat
from league_state, jsonb_array_elements(data->'players') p
order by fiyat desc;
```

---

## 5. Kurulum — adım adım

### Adım 1: Supabase projesi

1. [supabase.com](https://supabase.com) → yeni proje
2. Bölge olarak **Frankfurt** seç (Türkiye'ye en yakın)
3. Veritabanı şifresini bir yere kaydet

### Adım 2: Tabloyu kur

Supabase panelinde **SQL Editor** → **New query** → `supabase/kurulum.sql`
dosyasının tamamını yapıştır → **Run**.

Tek seferlik. Tablo boş görünecek — uygulama ilk bağlandığında satırı kendisi
oluşturup 37 oyuncu ve 1. hafta ile dolduruyor. Ayrı bir tohumlama betiği
gerekmiyor.

Oyuncu havuzunu **bilerek** SQL'e yazmadım: tek doğru kaynak
`src/lib/domain/players.seed.ts`. İki yerde iki liste tutarsam er geç
birbirinden kayarlar.

### Adım 3: Anahtarları al

Supabase panelinde **Project Settings → API keys**:

- `Project URL` → `SUPABASE_URL`
- `service_role` anahtarı → `SUPABASE_SERVICE_ROLE_KEY`

> **Bu anahtar veritabanının tam yetkili anahtarı.** Asla tarayıcıya gitmemeli,
> asla `NEXT_PUBLIC_` ön ekiyle tanımlanmamalı, asla depoya commit edilmemeli.
> Sadece sunucu tarafı kodda ve Vercel'in ortam değişkenlerinde yaşayacak.

### Adım 4: Yerelde dene

`.env.local` içine iki değeri yaz, sonra:

```bash
npm run supabase:test
```

Bu betik sırayla ortam değişkenlerini, tabloya erişimi, ilk satırın
oluşturulmasını ve yazma yetkisini kontrol ediyor. Bir şey ters giderse hangi
adımda ve neden takıldığını söylüyor.

### Adım 5: Vercel

1. Depoyu Vercel'e bağla
2. **Settings → Environment Variables** altına beşini de gir:

| Değişken | Ne |
|---|---|
| `SESSION_SECRET` | En az 32 karakter rastgele dizi. Değişirse herkesin oturumu kapanır. |
| `ADMIN_USERNAME` | Admin kullanıcı adı |
| `ADMIN_PASSWORD` | **Mutlaka değiştir.** Depodaki örnek değeri kullanma. |
| `SUPABASE_URL` | Supabase proje adresi |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role anahtarı |

3. **Redeploy** (ortam değişkenleri yalnızca yeni dağıtımlara uygulanır)

> Bu beş değişken eksikse ne olur:
> `SESSION_SECRET` yoksa her sayfa 500 verir. `SUPABASE_*` yoksa uygulama dosya
> deposuna düşmeye çalışır ve Vercel'in salt okunur diskinde `EROFS` hatasıyla
> yine 500 verir. `ADMIN_*` yoksa sadece admin girişi çalışmaz.

---

## 6. Yedekleme

Sezon ortasında veri kaybı kabul edilemez. İki katman istiyorum:

**Otomatik:** Supabase ücretsiz katmanda günlük yedek alıyor. Bu taban güvence.

**Elle:** Her ay bir kez Supabase panelinden **Database → Backups → Download**
ile bir kopya indirip kendi bilgisayarımda saklayacağım. Sezon sonunda da bir
kopya alınacak — geçmiş sezonların tablosu kaybolmasın.

Ayrıca uygulamaya ileride bir **"sezonu dışa aktar"** butonu eklenmeli: bütün
ligi tek JSON dosyası olarak indiren bir admin işlemi. Böyle bir dosya hem yedek
hem de yeni sezona geçerken geçmişi arşivleme yolu olur.

---

## 7. Sezon geçişi

Sezon bittiğinde yapılacaklar:

1. `league_state.data` içeriğini kopyalayıp arşivle (Supabase panelinden tek
   sorguyla alınır)
2. `data` içindeki `gameweeks`, `squads`, `priceHistory` dizilerini boşalt
3. Her oyuncunun `price` değerini `basePrice` ile eşitle (fiyatlar sıfırlansın)
4. İstenirse `basePrice` değerleri geçen sezonun performansına göre elle
   güncellensin
5. `managers` dizisine **dokunma** — hesaplar ve şifreler kalsın
6. `seasonName` güncellensin

Bunun için admin paneline bir "yeni sezon başlat" akışı eklenebilir. Şu an yok;
ilk sezon bitmeden gerekmiyor.

---

## 8. Bilinçli olarak yapmadıklarım

Bunları biri "neden yok?" diye sormasın diye yazıyorum:

**Puan tablosu tutmuyorum.** Yukarıda anlattım — puanlar hep ham veriden
hesaplanıyor. Ölçeğimizde maliyeti yok, tutarlılık kazancı büyük.

**Denetim kaydı (audit log) yok.** Kim ne zaman ne değiştirdi tutulmuyor. Tek
admin var ve tamamlanan haftalar zaten kilitleniyor; bu boyutta gereksiz.

**Kullanıcı e-postası toplamıyorum.** İsim ve şifre yeterli. E-posta olmayınca
şifre sıfırlama akışı da yok — admin, hesabı panelden sıfırlıyor, kişi tekrar
kendi ismiyle giriyor. 40 kişilik bir grupta en pratik çözüm bu.

**Gerçek zamanlı güncelleme (realtime) yok.** Supabase'in realtime özelliği
var ama kullanmıyorum. Kadrolar haftada bir kilitleniyor, puanlar haftada bir
açıklanıyor. Sayfayı yenilemek yeter.

**Çoklu lig / çoklu grup desteği yok.** Bu uygulama tek bir grup için. Başka bir
halısaha grubu isterse kendi kopyasını kurar.
