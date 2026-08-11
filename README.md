# Macunköy Fantazi Ligi

Macunköy'de her Salı 11-11 halısaha maçı yapan ~40 kişilik grubun kendi fantazi ligi.
Ligde oynayan herkes aynı zamanda sahadaki futbolculardan biri.

Instagram: [@macunkoyfutbol](https://instagram.com/macunkoyfutbol)

---

## İçindekiler

- [Oyun nasıl çalışıyor](#oyun-nasıl-çalışıyor)
- [Haftalık döngü](#haftalık-döngü)
- [Kadro kurma](#kadro-kurma)
- [Puanlama](#puanlama)
- [Kaptan ve kampanya](#kaptan-ve-kampanya)
- [Kaleci ve mevki bahsi](#kaleci-ve-mevki-bahsi)
- [Fiyatlar nasıl değişiyor](#fiyatlar-nasıl-değişiyor)
- [Ekranlar](#ekranlar)
- [Admin paneli](#admin-paneli)
- [Kurulum ve çalıştırma](#kurulum-ve-çalıştırma)
- [Oyuncu figürleri](#oyuncu-figürleri)
- [Proje yapısı](#proje-yapısı)
- [Yayına alma](#yayına-alma)

---

## Oyun nasıl çalışıyor

Havuzda **37 oyuncu** var — grubun tamamı. Her hafta bunlardan 22'si sahaya çıkıyor.

Sen bir menajersin ve **85 birimlik bir bütçeyle 7 kişilik bir fantazi takımı**
kuruyorsun: 1 kaleci + 6 oyuncu. Seçtiğin oyuncular o hafta sahada ne yaparsa sen
o kadar puan alıyorsun.

İki şey aynı anda doğru:

1. **Sen bir menajersin.** Lig tablosunda kümülatif puanınla yarışıyorsun.
2. **Sen bir futbolcusun.** Sahada iyi oynarsan seni kadrosuna koyan menajerlere
   puan kazandırıyorsun ve fiyatın yükseliyor.

Oyunun can alıcı noktası şu: **kadronu, o hafta kimin sahaya çıkacağını bilmeden
kuruyorsun.** Kadrolar Salı gecesi kilitleniyor, kimin geleceği ondan sonra belli
oluyor. Kadrondaki biri o hafta sahaya çıkmazsa sana **−5 puan** yazıyor. Yani
sadece "kim iyi oynar"ı değil, "kim gelir"i de bilmek gerekiyor.

---

## Haftalık döngü

```
SALI 21:00     Maç oynanır
SALI 23:00     ⛔ KADROLAR KİLİTLENİR
                  Bu kilit, BİR SONRAKİ HAFTANIN maçı için.
                  Kadro kurmayanın geçen haftaki takımı otomatik devreder.
SALI 23:00+    Grup içinde kimin geleceği belli olur
               Admin sahaya çıkacak 22 kişiyi iki takıma bölüp panele girer
               → Herkes kadrosundan kaç kişinin sahada olduğunu görür
ERTESİ SALI    Maç oynanır
ÇARŞ–CUMA      Admin skoru, golleri, reytingleri girer
               "HAFTAYI TAMAMLA" → puanlar açıklanır, fiyatlar güncellenir
               Bu haftadan sonra o hafta bir daha değiştirilemez
```

### Haftanın durumları

| Durum | Ne demek | Ne yapılabilir |
|---|---|---|
| **Kadro açık** | Seçim penceresi açık | Menajerler kadro kurar/değiştirir |
| **Kilitli** | Salı 23:00 geçti | Kadrolar donmuş, admin takımları bekliyor |
| **Takımlar belli** | 22 kişi girildi | Herkes kaç adamının sahada olduğunu görür |
| **Tamamlandı** | Skor + reytingler girildi ve onaylandı | **Kilitli — asla değişmez** |
| **Maç yok** | O hafta tatil | Kimse puan almaz, tablo donar |

**Kilit otomatik.** Cron kurmaya gerek yok: Salı 23:00'ten sonra siteye giren ilk
kişi kilidi tetikliyor. Kimse son dakika kadro değiştiremiyor.

**"Tamamla" tek yönlü.** Bir hafta tamamlandıktan sonra puanları değiştirmenin
yolu yok. Bu bilerek böyle — kapanan hafta kapanmıştır.

---

## Kadro kurma

**1 kaleci + 6 oyuncu, 85 birim bütçe.** Her hafta sıfırdan kurulur, transfer
sistemi yok. Kurmazsan geçen haftaki takımın aynen devreder (bütçeye sığmıyorsa
sistem en pahalıdan başlayarak onarır).

### Dizilişler

| Diziliş | Kadro | Karakter |
|---|---|---|
| **2-2-2 Denge** | 2 D · 2 OS · 2 FW | Standart. Her hafta işini görür. |
| **3-2-1 Beton** | 3 D · 2 OS · 1 FW | Defans golü +5. Ucuz defanslarla bütçe artırırsın. |
| **2-3-1 Kontrol** | 2 D · 3 OS · 1 FW | En dengeli puan dağılımı. |
| **1-3-2 Baskı** | 1 D · 3 OS · 2 FW | Riskli. Gol yağmuru haftalarında patlar. |
| **1-2-3 Kamikaze** | 1 D · 2 OS · 3 FW | Forvet golü sadece +3 ama üç ihtimal. |

Gol puanı mevkiye göre ters orantılı olduğu için hiçbir diziliş "her zaman doğru"
değil.

### Bütçe neden 85?

Havuzdaki fiyatlar 4 ile 18 arasında. 85 birim şu dengeyi kuruyor:

- Sıfır yıldızlı, her mevkide orta seviye bir 2-2-2 **tam olarak 85 eder**
  (Yusuf 13 + Mali 13 + Uğur 11 + Mamadou 12 + Baran 12 + Onur 12 + Kamil 12).
- **Üç pahalı oyuncu** alabilirsin (Servan 18 + Alper 16 + Taha 16 = 50) ama
  kadronun kalan dördünü dipten doldurmak zorunda kalırsın.
- **Dördüncü yıldız** çoğu dizilişte matematiksel olarak sığmaz.

Bu sayı admin panelinden değiştirilebilir ama bu denge bozulur.

---

## Puanlama

### Saha oyuncuları (Defans / Orta Saha / Forvet)

| Olay | Puan |
|---|---|
| Sahaya çıktı | **+2** |
| Gol — Defans | **+5** |
| Gol — Orta saha | **+4** |
| Gol — Forvet | **+3** |
| Galibiyet | **+3** |
| Beraberlik | **+1** |
| Mağlubiyet | **−2** |
| Maçın adamı | **+5** |
| Reyting 9.0+ | **+5** |
| Reyting 8.0 – 8.9 | **+3** |
| Reyting 7.0 – 7.9 | **+1** |
| Reyting 6.0 – 6.9 | 0 |
| Reyting 5.0 – 5.9 | **−2** |
| Reyting 5.0 altı | **−4** |
| **Kadroda ama sahaya çıkmadı** | **−5** |

### Kaleciler

Halısahada maçlar bol gollü geçtiği için kaleciler normal tabloyla puanlansa
kimse kaleci almazdı. Ayrı ve daha bağışlayıcı bir tablo uygulanıyor:

| Kaleci reytingi | 8+ | 7–7.9 | 6–6.9 | 5–5.9 | 4–4.9 | 4 altı |
|---|---|---|---|---|---|---|
| Puan | **+6** | **+4** | **+2** | 0 | **−1** | **−2** |

Üstüne sahaya çıktı +2, galibiyet/beraberlik/mağlubiyet +3/+1/−2, maçın adamı +5,
gol atarsa +8.

**Önemli tasarım kararı:** kaleci tablosunun tabanı −2. Yani **en kötü kaleci
haftası bile (−2), kadroya alıp sahaya çıkmayan birinden (−5) daha iyi.** Kaleci
seçmek riskli ama asla saçma değil.

### Örnek bir hafta

> **2-2-2 Denge**
> - Emre (K) 6.5 reyting, galibiyet → **+7**
> - Kaan (D) 7.8 reyting + 1 gol, galibiyet → **+11**
> - Serkan (D) sahaya çıkmadı → **−5**
> - Murat (OS, **KAPTAN**) 8.4 + 1 gol, galibiyet → 12 × 2 = **+24**
> - Burak (OS) 5.2 reyting, mağlubiyet → **−2**
> - Onur (FW, **KAMPANYALI**) 9.1 + 2 gol + maçın adamı, galibiyet → 21 × 1.5 = **+31.5**
> - Cem (FW) 6.8 reyting, mağlubiyet → **0**
>
> **Toplam: 66.5 puan**

---

## Kaptan ve kampanya

### Kaptanlar

Kadrolar kilitlendikten **sonra** admin, sahaya çıkan 22 kişi arasından her
takımdan birer kaptan ilan ediyor. Kadronda kaç kaptan varsa **hepsi 2x** puan
alıyor.

Artısı da eksisi de iki katı — kaptanlık risksiz bir ödül değil.

Kadrolar kaptanlar belli olmadan kilitlendiği için, "bu hafta kim kaptan olur"
tahmini ayrı bir beceri. Grupta kaptanlığı hep aynı birkaç kişi yapıyorsa onları
kadroda tutmak mantıklı olur.

### Kampanya

Her hafta admin **3 oyuncu** seçiyor. O hafta bu oyuncular:

- Fiyatları **%40 indirimli** — bütçende yer açar
- Puanları **1.5 katı**

Dikkat: çarpan negatife de uygulanıyor. Kampanyalı bir oyuncu sahaya çıkmazsa
−5 değil **−7.5** yersin.

Kampanya, kadro kurma penceresi açıldığında ilan edilir; indirimi görerek seçim
yaparsın.

---

## Kaleci ve mevki bahsi

Havuzda sadece üç kişi kaleci slotuna konabiliyor: **Talha**, **Yusuf** ve
**Barkuz**. Barkuz özel bir durum — bazı haftalar kaleye geçiyor, bazı haftalar
sahada oynuyor. Hangisi olacağını admin maç günü belirliyor.

Bu yüzden Barkuz'u kadroya koyarken **hangi slota koyduğun bir bahis**:

| Sen koydun | O hafta gerçekte | Sonuç |
|---|---|---|
| Kaleci | Kalede oynadı | ✅ Tam puan, kaleci tablosundan |
| Forvet | Forvette oynadı | ✅ Tam puan, gol dahil |
| Forvet | Kaleye geçti | ⚠️ **Gol puanı yanar.** Kaleci reyting tablosundan puanlanır |
| Kaleci | Sahada oynadı | ⚠️ **Gol puanı yanar.** Saha reyting tablosundan puanlanır |
| Herhangi | Sahaya hiç çıkmadı | ❌ **−5** |

Tek cümleyle: **slot ile gerçek rol uyuşmazsa gol puanı yanar; reyting puanını
gerçekte oynadığı rolün tablosundan alırsın.**

Barkuz'un kaleci olma ihtimalini tahmin etmek için oyuncu sayfasında "bu sezon
kaç hafta kalede, kaç hafta sahada oynadı" bilgisi duruyor.

---

## Fiyatlar nasıl değişiyor

Fiyat aralığı **4.0 – 20.0** birim. Sezon başı fiyatları admin belirliyor,
sonrası otomatik:

```
2 hafta üst üste reyting ≥ 7.5   →   fiyat yükselir
1 hafta reyting < 6.0             →   fiyat anında düşer
3 hafta üst üste sahaya çıkmadı   →   0.5 birim ucuzlar
```

Değişim miktarı **sönümlü**:

```
yükselme = 0.5 × (20 − fiyat) / 16
düşme    = 0.5 × (fiyat − 4)  / 16
haftalık tavan: ±1.0
```

Pratikte ne demek:

| Oyuncu | Durum | Fiyat değişimi |
|---|---|---|
| Servan (18.0) | 2 hafta üst üste iyi | **+0.06** |
| Mamadou (12.0) | 2 hafta üst üste iyi | **+0.25** |
| Ömer (5.0) | Kötü hafta | **−0.03** |
| Mamadou (12.0) | Kötü hafta | **−0.25** |

Yani hareket hep orta seviyede olur. Yıldız oyuncu uçmaz, dip oyuncu yok olmaz.
Ucuz ve iyi oynayan bir oyuncu yavaş yavaş pahalanır — onu erken keşfeden avantaj
kazanır.

Oynamadığı haftalar "iyi hafta serisini" bozmaz; sadece atlanır.

---

## Ekranlar

### Menajer tarafı

| Ekran | Ne var |
|---|---|
| **Giriş** (`/giris`) | İsim + şifre. İlk girişte şifren kendi ismin. |
| **Kadrom** (`/kadro`) | Üç panel: solda sen, ortada çim saha, sağda 37 kişilik havuz. Listeden birine basınca figürü sahaya uçar. Diziliş seçimi, bütçe çubuğu, geri sayım. |
| **Fikstür** (`/fikstur`) | Hafta hafta: skor, MVP, kadromdan kaç kişi sahaya çıktı, kaç puan aldım, haftadaki sıram. |
| **Lig** (`/lig`) | Kümülatif menajer sıralaması, sıra değişimi okları, hafta listesi. |
| **Puanlar** (`/puanlar`) | "Kim kaç puan getiriyor" — her oyuncunun haftalık ortalama ham getirisi. Verim (fiyat başına getiri), gol, reyting, seçilme oranına göre sıralanır. |
| **Havuz** (`/havuz`) | 37 oyuncu, fiyat, ortalama reyting, devamlılık, fiyat hareketi. |
| **Oyuncu kartı** (`/oyuncu/<id>`) | Reyting ve fiyat grafiği, sezon istatistikleri, fantazi getirisi. Barkuz gibi çift rollülerde bahis anlatımı. |
| **Hafta detayı** (`/hafta/<n>`) | Kadromun puan dökümü (satıra basınca kalem kalem açılır), haftanın sıralaması, sahadaki iki takım. |
| **Kurallar** (`/kurallar`) | Yürürlükteki bütün sayılar — ayarlardan otomatik üretilir, hiç eskimez. |

### Kart seviyeleri

Oyuncu kartları fiyata göre seviye alıyor. Fiyat her hafta oynadığı için bir
oyuncunun kartı sezon içinde seviye atlayabilir ya da düşebilir:

| Fiyat | Seviye |
|---|---|
| 4 – 7 | Bronz |
| 8 – 11 | Gümüş |
| 12 – 15 | Altın |
| 16+ | **Macunköy Efsanesi** (siyah) |

---

## Admin paneli

Ayrı giriş, ayrı oturum. Menajer hesabı hiçbir koşulda admin paneline giremiyor.

| Sayfa | Ne yapar |
|---|---|
| **Fikstür** (`/admin`) | Sıradaki iş öne çıkar ("3. hafta takımları bekleniyor"). Bütün haftalar durumlarıyla listeli. |
| **Hafta** (`/admin/hafta/<n>`) | Bir haftanın tamamı tek ekranda — aşağıda anlatılıyor. |
| **Veriler** (`/admin/veriler`) | Maç raporu ve sezon tablosu — herkesin her haftaki verisi. |
| **Puanlar** (`/admin/puanlar`) | Menajer lig tablosu + oyuncu bazlı getiri. |
| **Ayarlar** (`/admin/ayarlar`) | Bütçe, puanlama katsayıları, oyuncu havuzu, hesap sıfırlama. |

### Haftalık iş akışı (`/admin/hafta/<n>`)

Telefondan tek elle yapılabilecek şekilde tasarlandı. Üç adım:

**① Kampanyalı oyuncular** — o hafta indirimli ve 1.5x olacak 3 kişiyi işaretle.

**② Takımlar** — 37 isimlik ızgarada isme dokunarak: bir kez → A takımı,
iki kez → B takımı, üç kez → sahada değil. Altında her takımdan bir kaptan seç.
"Takımları kaydet" dediğinde bir sonraki haftanın penceresi de otomatik açılır.

**③ Maç verisi** — skor (+/− butonları), sonra her oyuncu için tek satır:

```
[figür] Alper          [Gelmedi] [Kale] [MVP]
        Gol  − 2 +          Reyting  − 8.5 +
```

Reytingler **6.5 varsayılan** gelir; sadece değiştireceğine dokunursun.
Her değişiklik **1.2 saniye sonra otomatik kaydedilir** — yarıda bırakıp sonra
devam edebilirsin. Üstte canlı kontroller: kaç kaleci işaretlendi, kaç kişi
gelmedi, girilen gol sayısı skorla uyuşuyor mu.

**"Haftayı tamamla"** — onay sorar, sonra puanlar açıklanır, fiyatlar güncellenir
ve **hafta kilitlenir**.

### Veriler ekranı

**Hafta raporu:** skor tabelası, iki takım yan yana tablo. Her satırda figür,
isim, mevki, gol, reyting (renkli hücre), fantazi puanı, kaç menajer seçmiş.
Rozetler: K (kaptan), GK (o hafta kalede), MVP, % (kampanyalı). Altta sahaya
çıkmayanlar ve onları seçenlerin kaybı.

**Sezon tablosu:** 37 oyuncu × bütün haftalar matrisi. Her hücre o haftanın
reytingi, reytinge göre renkli. Hücrenin sağ üstünde gol sayısı, sol üstünde ★
varsa maçın adamı. Sağda toplam sütunları. İsim sütunu kaydırırken sabit kalır.

---

## Kurulum ve çalıştırma

```bash
npm install
npm run demo      # 12 hesap + tamamlanmış 1 hafta + açık 2. hafta üretir
npm run dev       # http://localhost:3000
```

**Menajer girişi:** İsim `Göktuğ`, şifre `Göktuğ`
(demo hesaplarının hepsinde şifre kendi ismi)

**Admin girişi:** `/admin/giris` → `.env.local` içindeki `ADMIN_USERNAME` /
`ADMIN_PASSWORD`

Gerçek sezona başlarken demoyu temizle:

```bash
npm run sifirla
```

### Komutlar

| Komut | Ne yapar |
|---|---|
| `npm run dev` | Geliştirme sunucusu |
| `npm run build` | Yayın derlemesi |
| `npm test` | Puanlama, fiyat ve kadro motoru testleri (34 test) |
| `npm run demo` | Demo verisi üretir — **mevcut veriyi siler** |
| `npm run sifirla` | Ligi tertemiz sıfırlar |
| `npm run figurler` | Oyuncu görsellerini işleyip `public/players/`'a yazar |
| `npm run duman` | Çalışan sunucudaki bütün sayfaları gezip kontrol eder |

### Ortam değişkenleri

`.env.example` dosyasına bak. Gereken üç değer:

```
SESSION_SECRET=en-az-32-karakterlik-rastgele-bir-dizi
ADMIN_USERNAME=Admin
ADMIN_PASSWORD=guclu-bir-sifre
```

`SESSION_SECRET` değişirse herkesin oturumu kapanır. Admin bilgileri
veritabanında **tutulmaz**, sadece ortam değişkeninde yaşar.

---

## Oyuncu figürleri

Kaynak görseller `oyuncu gorseller/` klasöründe.
`scripts/figures.json` hangi görselin hangi oyuncuya ait olduğunu tutuyor.

```bash
npm run figurler
```

Bu komut görselleri şeffaf kenarlarından kırpar, hepsini aynı yüksekliğe
normalize eder ve `public/players/<oyuncu-id>.png` olarak yazar. Eşlemesi
olmayan oyunculara geçici olarak mevcut görsellerden biri atanır (çıktıda `~`
ile işaretlenir).

Şu an 15 figür gerçek, kalan 22'si geçici olarak bunlardan birini kullanıyor.

**Yeni figür eklemek:** görseli `oyuncu gorseller/` içine koy,
`scripts/figures.json`'a bir satır ekle, komutu tekrar çalıştır.

### Prompt şablonu

Köşeli parantezleri değiştir, gerisi sabit kalsın — 37 kart yan yana geldiğinde
tek bir set gibi dursun:

```
Full-body stylized 3D character illustration of a male amateur footballer,
semi-realistic cartoon style (Pixar meets FIFA Ultimate Team), confident
hero pose: standing upright, arms crossed over chest, feet shoulder-width
apart, chin slightly raised, looking directly at the camera. Slight low
camera angle, full body visible from head to boots, character perfectly
centered with even margins.

Wearing a plain [KIT] football jersey with no logos or numbers, black
shorts, white knee socks, black football boots.

[HAIR] hair, [FACIAL_HAIR], [BUILD] build, [SKIN] skin tone, [AGE].

Soft studio rim lighting from top-left, subtle cool blue fill light from
the right, clean specular highlights on the jersey. Fully transparent
background, no ground shadow, no text, no logos, no props.
3:4 aspect ratio, high detail, sharp focus.
```

| Alan | Seçenekler |
|---|---|
| `[KIT]` | red / royal blue / white / black / neon yellow / dark green |
| `[HAIR]` | short black · buzz cut · curly dark brown · slicked-back · bald · shoulder-length wavy |
| `[FACIAL_HAIR]` | clean-shaven · short stubble · full black beard · thick mustache |
| `[BUILD]` | slim · athletic · stocky · heavyset · tall and lanky |
| `[SKIN]` | fair · light olive · olive · tan · brown |
| `[AGE]` | in his mid-20s · in his early 30s · in his late 30s · in his 40s |

---

## Proje yapısı

```
src/
  lib/domain/          Oyunun kuralları — çerçeveden ve veritabanından bağımsız,
                       saf ve testli kod
    types.ts             Alan modeli
    rules.ts             Bütün ayarlanabilir sayılar ve dizilişler
    players.seed.ts      37 oyuncu
    scoring.ts           Puanlama motoru
    pricing.ts           Fiyat algoritması
    squad.ts             Kadro doğrulama ve otomatik kadro
    *.test.ts            34 test

  lib/db/              Veri katmanı (bkz. VERI-MIMARISI.md)
  lib/services/        Haftalık akış, lig tablosu, maç raporları
  lib/auth/            Oturum, hesap, şifre
  lib/ui/              Kart seviyeleri ve renkler
  lib/time.ts          Türkiye saati, kilit takvimi, geri sayım

  app/(app)/           Menajer ekranları
  app/admin/           Admin paneli
  app/giris/           Giriş

  components/          Oyuncu kartı, figür, grafik, geri sayım, ortak yüzeyler

scripts/
  import-figures.mjs   Görsel işleme
  demo-verisi.ts       Demo verisi + uçtan uca akış testi
  smoke.ts             Bütün sayfaları gezen duman testi

supabase/schema.sql    Yayına alırken kullanılacak Postgres şeması
VERI-MIMARISI.md       Verinin nasıl tutulduğu ve Supabase'e geçiş
```

**Önemli:** Oyunun kuralları `src/lib/domain/` içinde React'ten ve veritabanından
tamamen bağımsız duruyor. Bir kuralı değiştirmek istediğinde tek yere dokunuyorsun
ve testler seni koruyor.

---

## Yayına alma

**Veri tarafı için önce [VERI-MIMARISI.md](VERI-MIMARISI.md) dosyasını oku.**
Şu anki JSON dosyası tek sunucuda çalışır ama Vercel gibi dağıtık bir ortamda
veriyi böler. O belge neyin nasıl kurulacağını adım adım anlatıyor.

Kısaca:

1. Supabase'de proje aç, `supabase/schema.sql` dosyasını çalıştır
2. `src/lib/db/store.ts` içindeki iki fonksiyonun Supabase sürümünü yaz
3. Vercel'e bağla, ortam değişkenlerini gir
4. `ADMIN_PASSWORD`'ü mutlaka değiştir

### Güvenlik

- Menajer ve admin oturumları **ayrı çerezler**. Menajer hesabı admin paneline
  giremiyor, her admin işlemi oturumu tekrar doğruluyor.
- Şifreler **bcrypt** (12 tur) ile saklanıyor. 6 yanlış denemeden sonra giriş
  15 dakika kapanıyor.
- Admin bilgileri veritabanında değil, ortam değişkeninde.
- Bir isimle yalnızca bir hesap açılabiliyor; hesap açıldıktan sonra varsayılan
  şifre (kişinin kendi ismi) çalışmıyor.
