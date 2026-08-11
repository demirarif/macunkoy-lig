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

## 2. Şu an nerede duruyor (ve neden geçici)

Şu anda bütün lig tek bir JSON dosyasında: `.data/league.json`.

Bunu bilerek böyle yaptım. Projeyi klonlayan biri `npm install && npm run dev`
deyip hiçbir kurulum yapmadan çalışan bir lig görebilsin istedim. Tek makinede
sorunsuz çalışıyor: yazmalar sıraya alınıyor, önce geçici dosyaya yazılıp sonra
yerine taşınıyor (yazma yarıda kalırsa veri bozulmuyor), okumalar dosyanın
değişiklik zamanına bakan bir önbellekten geçiyor.

**Ama yayına alırken bu yetmez.** Vercel'de uygulama birden fazla sunucuda
çalışıyor ve her sunucunun kendi geçici diski var. Ali'nin kadrosu bir sunucuya,
Veli'nin kadrosu başka bir sunucuya yazılır; ikisi birbirini görmez. Üstelik
sunucu yeniden başladığında disk silinir — bütün sezon uçar.

Bu yüzden **yayına almadan önce mutlaka gerçek bir veritabanına geçilmeli.**

---

## 3. Ne istiyorum: Supabase

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

Bu yüzden `schema.sql` içinde her tabloda RLS açık ve **hiçbir politika yok**.
Politikasız + RLS açık = `service_role` dışında kimse geçemez. Kasıtlı.

---

## 4. Tablolar ve neden öyle

Şemanın tamamı `supabase/schema.sql` içinde. Burada her tablonun neden o şekilde
tasarlandığını anlatıyorum.

### `league` — tek satırlık ayar tablosu

Bütçe, puanlama katsayıları, fiyat algoritması parametreleri. `id = 1` kısıtıyla
tek satır olmaya zorlanıyor.

Puanlama ve fiyat ayarlarını **JSONB** olarak tutuyorum. Her katsayı için ayrı
sütun açsaydım, admin panelinden bir ayar eklemek istediğimde migration yazmam
gerekirdi. Bu ayarlar sık sık kurcalanacak; esnek olsun istiyorum.

### `players` — 37 kişilik havuz

`id` metin ve elle yazılmış (`goktug`, `kamil-reis`). UUID kullanmadım çünkü
figür dosyaları `public/players/<id>.png` diye duruyor ve seed verisi bu id'lerle
yazılı. Okunabilir olması işime geliyor.

`slots` bir metin dizisi (`{'DEF','MID'}`). Çok mevkili oyuncular var — Arif hem
defans hem orta saha hem forvet oynayabiliyor. Ayrı bir `player_positions`
tablosu açmak bu boyutta gereksiz karmaşa olurdu.

`base_price` ile `price` ayrı: biri sezon başı fiyatı, hiç değişmiyor; diğeri
her hafta oynuyor.

`dual_keeper` sadece Barkuz için ama alan olarak duruyor — ileride başka biri de
kaleye geçmeye başlarsa işaretleriz.

### `managers` — hesaplar

`player_id` **benzersiz**. Bu tek satır bütün kayıt mantığımı taşıyor: bir isimle
yalnızca bir hesap açılabilir. Kayıt formu diye bir şey yok; kişi ilk kez kendi
ismiyle giriş yaptığında hesap kendiliğinden oluşuyor.

`must_change_password`: ilk girişte şifre kişinin kendi ismi. Bu alan true
olduğu sürece kendi şifresini belirlemesi isteniyor.

`failed_attempts` ve `locked_until`: 6 yanlış denemeden sonra giriş 15 dakika
kapanıyor. Şifreler kısa olabileceği için bu koruma gerekli.

### `gameweeks` — haftalar

Beş durumu var ve akış **tek yönlü**:

```
open  →  locked  →  teams  →  completed
                      ↓
                   holiday
```

`completed_at` doluysa hafta kilitli demektir. Geri açma yolu bilerek yok. Bir
hafta tamamlandıktan sonra puanların değişmesini istemiyorum — grup içinde
tartışma çıkarır.

Takım listelerini (`team_a_ids`, `team_b_ids`) dizi olarak tutuyorum, ayrı bir
tablo açmadım. Haftada 22 kayıt için ilişki tablosu kurmak bu boyutta fazla
geliyor; dizi hem okunması hem yazması daha basit.

### `match_stats` — maç verisi

Hafta + oyuncu birleşik anahtar. Bir oyuncunun bir haftada tek satırı olabilir.

`kept_goal` alanı kritik. Fantazi tarafındaki "mevki bahsi" kuralı tamamen buna
bakıyor: menajerin oyuncuyu koyduğu slot ile `kept_goal` uyuşmuyorsa gol puanı
yanıyor. Admin'in tek yapması gereken o hafta kalede kimin oynadığını
işaretlemek; gerisini sistem hesaplıyor.

`played` alanı "kadroya girdi ama gelmedi" durumunu ayırıyor. Bu kişiyi seçen
menajerler −5 yiyor.

### `squads` + `squad_picks` — kadrolar

Burada ilişki tablosu kullandım çünkü hangi oyuncunun **hangi slota** konduğunu
bilmem gerekiyor. Sadece oyuncu listesi yetmez: Barkuz'u kaleye mi forvete mi
koyduğun puanı doğrudan değiştiriyor.

`source` alanı `manual` mi `rollover` mı olduğunu tutuyor. Kadro kurmayan
menajerlere kilitte otomatik kadro yazılıyor; arayüzde "bu kadro geçen haftadan
devretti" uyarısı bu alandan geliyor.

Hafta + menajer benzersiz: bir menajerin bir haftada tek kadrosu olur.

### `price_history` — fiyat geçmişi

Oyuncu sayfasındaki fiyat grafiği için. `gameweek_number = 0` sezon başı
fiyatını tutuyor.

Bu tabloyu bilerek ayrı tuttum: `players.price` sadece "şu anki fiyat"ı biliyor,
geçmişi bilmiyor. İkisini karıştırmak istemedim.

---

## 5. Kurulum — adım adım

### Adım 1: Supabase projesi

1. [supabase.com](https://supabase.com) → yeni proje
2. Bölge olarak **Frankfurt** seç (Türkiye'ye en yakın, gecikme düşük olur)
3. Veritabanı şifresini bir yere kaydet

### Adım 2: Şemayı çalıştır

Supabase panelinde **SQL Editor** → yeni sorgu → `supabase/schema.sql`
dosyasının tamamını yapıştır → çalıştır.

Bu, bütün tabloları, RLS ayarlarını ve başlangıç lig ayarlarını kuruyor.
Oyuncu havuzunu **bilerek** SQL'e yazmadım — tek doğru kaynak
`src/lib/domain/players.seed.ts`. İki yerde iki liste tutarsam er geç
birbirinden kayarlar.

### Adım 3: Anahtarları al

Supabase panelinde **Project Settings → API**:

- `Project URL` → `SUPABASE_URL`
- `service_role` anahtarı → `SUPABASE_SERVICE_ROLE_KEY`

> **Bu anahtar veritabanının tam yetkili anahtarı.** Asla tarayıcıya gitmemeli,
> asla `NEXT_PUBLIC_` ön ekiyle tanımlanmamalı, asla depoya commit edilmemeli.
> Sadece sunucu tarafı kodda ve Vercel'in ortam değişkenlerinde yaşayacak.

### Adım 4: Kodu bağla

Bu, projedeki tek gerçek geliştirme işi. Uygulamanın tamamı veriye
`src/lib/db/store.ts` içindeki **iki fonksiyon** üzerinden erişiyor:

```ts
readState(): Promise<LeagueState>
mutate<T>(fn: (state: LeagueState) => T): Promise<T>
```

Başka hiçbir dosya doğrudan veriye dokunmuyor. Bu yüzden Supabase'e geçiş,
bu iki fonksiyonun içini değiştirmekten ibaret. Sayfalar, servisler, puanlama
motoru — hiçbiri değişmiyor.

İki yol var:

**A) Basit yol — tabloları oku, tek nesne kur.**
`readState` bütün tabloları çekip `LeagueState` şeklinde birleştirir, `mutate`
değişen kısımları geri yazar. Yazmalarda çakışma olmasın diye Postgres
tarafında bir advisory lock kullanılır. Bu, en az kod değişikliğiyle çalışan
yol ve bizim ölçeğimizde fazlasıyla yeterli.

**B) Doğru yol — hedeflenmiş sorgular.**
Zamanla `readState` yerine ihtiyaca göre sorgular yazılır (sadece açık haftayı
çek, sadece bir menajerin kadrosunu çek). Daha verimli ama daha çok iş.

**Benim tercihim A ile başlamak.** 40 kişilik bir ligde bütün state birkaç yüz
kilobayt; her istekte çekmek sorun değil. İhtiyaç olursa sonra B'ye geçilir.

Gereken paketler:

```bash
npm install @supabase/supabase-js
```

(Şu an bu paket bağımlılıklarda yok — kullanılmadığı için kaldırdım. Geçişi
yapan kişi kurar.)

### Adım 5: Oyuncu havuzunu aktar

Şema kurulduktan sonra `players` tablosu boş olacak. Bir kerelik bir betikle
`SEED_PLAYERS` listesini tabloya yazmak gerekiyor. `scripts/` altına
`seed-supabase.ts` diye bir betik eklenip `npm run seed` ile çalıştırılabilir.

### Adım 6: Vercel

1. Depoyu Vercel'e bağla
2. Ortam değişkenlerini gir:

| Değişken | Ne |
|---|---|
| `SESSION_SECRET` | En az 32 karakter rastgele dizi. Değişirse herkesin oturumu kapanır. |
| `ADMIN_USERNAME` | Admin kullanıcı adı |
| `ADMIN_PASSWORD` | **Mutlaka değiştir.** Depodaki örnek değeri kullanma. |
| `SUPABASE_URL` | Supabase proje adresi |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role anahtarı |

3. Deploy

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

1. Bütün ligi dışa aktar, arşivle
2. `gameweeks`, `match_stats`, `squads`, `squad_picks`, `price_history`
   tablolarını boşalt
3. `players.price` değerlerini `base_price` ile eşitle (fiyatlar sıfırlansın)
4. İstenirse `base_price` değerleri geçen sezonun performansına göre elle
   güncellensin
5. `managers` tablosuna **dokunma** — hesaplar ve şifreler kalsın
6. `league.season_name` güncellensin

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
