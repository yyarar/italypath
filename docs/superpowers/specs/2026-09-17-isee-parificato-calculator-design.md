# ISEE Parificato Hesaplayıcı — Baştan Yenileme Tasarımı

Tarih: 2026-09-17
Durum: Kerem onayladı (2026-09-17, sohbet içinde; ara onay istenmeden uygulamaya geçilecek)
Dal / çalışma kopyası: `feat/isee-parificato`, `.worktrees/isee-parificato`

## Amaç

`/isee` sayfasındaki hesaplayıcı bugün İtalya'da yaşayan aileler için geçerli **normal ISEE** formülünü (DPCM 159/2013) uyguluyor ve Türk bir ailenin cevaplayamayacağı İtalya'ya özgü alanlar soruyor (IMU değeri, BTP/buoni/libretti, giacenza media, "Toplam DSU geliri", finansal getiri oranı). Kitlemizin neredeyse tamamı ailesi Türkiye'de yaşayan öğrencilerdir; onlara İtalya'da **ISEE Parificato** (ISEEUP / ISEE estero) hesaplanır.

Hedef: modülü baştan yazmak. Yeni araç yalnızca ISEE Parificato tahmini yapar, soruları TL ve m² ile sorar, sonucu beş ana şehrin burs limitleriyle karşılaştırıp mavi/sarı/kırmızı ışıkla açıklar.

Başarı ölçütü:

- Türk bir veli, İtalyanca terim bilmeden 4 adımda formu doldurabilir.
- Sonuç ekranı "bu rakamla bursa girer miyim?" sorusuna ışık + kısa açıklama + şehir listesiyle cevap verir.
- Her sabit (kur, limit, muafiyet) resmi kaynağa ve tarihe bağlıdır; hesap motoru elle hesaplanmış örneklerle test edilir.
- Mevcut SEO/erişilebilirlik/çeviri sözleşmeleri bozulmaz (`check:seo-vitals`, `check:home-consultation`, `check:routes`).

## Alınmış kararlar (tartışmaya açılmaz)

- Kapsam **yalnızca Türkiye'deki aile** (ISEE Parificato). Normal ISEE hesabı ve ekranı tamamen kaldırılır (git geçmişinde kalır).
- Sonuç: ışık beş ana şehrin (Milano, Torino, Bologna, Roma, Padova) limit **ortalamasına** göre yanar; ortalamaya yakınlar sarı, altı mavi, üstü kırmızı. Altında beş şehrin kendi limitleriyle kısa liste durur.
- Belge rehberi (Türkiye'den hangi belge nasıl alınır) bu işin **dışında**.
- Burs haritası verisinin (`lib/scholarships/regions.ts`) 2026/27'ye güncellenmesi ve Veneto'nun eklenmesi bu işin **dışında**; ayrı görev olarak önerilir. ISEE aracı kendi küçük, kaynaklı limit dosyasını kullanır.
- Form boş açılır; sahte örnek rakam yok. Canlı "anlık sonuç" yok; sonuç 4. adımdan sonra gösterilir.

## Formül ve resmi dayanaklar

İskelet (ER.GO/Unibo "ISEE estero" eki, LazioDisco bando 2026/27 md. 12, Unimi belgesi):

- `ISEE = (ISR + %20 × ISP) ÷ aile katsayısı`
- `ISPE = ISP ÷ aile katsayısı`
- Yurt dışı gelir ve taşınır varlıklar, referans yılın **Banca d'Italia yıllık ortalama kuru** ile euroya çevrilir.
- Yurt dışındaki taşınmazlardan yalnızca **binalar** sayılır; değer = brüt m² × **500 €** (DPCM 9 Nisan 2001 md. 5 geleneği; ER.GO, EDISU, Unipd, Unimi, ERSU aynı). Arsa/tarla sayılmaz. Kalan konut kredisi bina değerine kadar düşülür (EDISU Ek E).
- Muafiyet ve katsayılar **DPCM 159/2013**'e göre uygulanır. Dayanak: Unimi belgesi — "…sono applicate le franchigie riguardanti il reddito e il patrimonio mobiliare ed immobiliare e la scala di equivalenza stabilita dal DPCM 159/2013". Kira indirimi EDISU, LazioDisco ve Unipd belgelerinde ayrıca açıkça geçer.

### Girdiler

| Alan | Birim | Not |
| --- | --- | --- |
| Referans yıl | 2024 / 2025 | Varsayılan 2025 |
| Hane kişi sayısı | kişi (≥1) | Öğrenci dahil, aynı evde yaşayan herkes |
| Çocuk sayısı | kişi (0…hane) | Öğrenci dahil, hanede yaşayan çocuklar |
| 18 yaş altı çocuk var mı | evet/hayır | Katsayı artışı için |
| 3 yaş altı çocuk var mı | evet/hayır | Yalnızca 18 yaş altı "evet" ise sorulur |
| İki ebeveyn (tek ebeveynli ailede o ebeveyn) yılda ≥6 ay çalıştı mı | evet/hayır | Yalnızca 18 yaş altı "evet" ise sorulur |
| Engelli birey sayısı | kişi | İsteğe bağlı, varsayılan 0 |
| Gelir sahipleri | liste: tür (maaşlı / emekli / diğer) + yıllık brüt TL | En az bir satır, tutar > 0 |
| Oturulan ev | kendi evimiz / kirada / kira ödemiyoruz | Zorunlu seçim |
| Ev m² + kalan kredi (TL) | m², TL | "kendi evimiz" ise; kredi isteğe bağlı |
| Yıllık kira (TL) | TL | "kirada" ise |
| Başka bina var mı | evet/hayır | Zorunlu seçim |
| Diğer binalar toplam m² + kalan kredi (TL) | m², TL | "evet" ise; kredi isteğe bağlı |
| Birikim (TL) | TL | 31 Aralık bakiyesi; 0 olabilir |
| Döviz/altın/fon birikimi (euro karşılığı) | € | İsteğe bağlı |

### Hesap adımları

1. `kur = RATES[yıl]` (1 € kaç TL). Tüm TL tutarlar `tutar ÷ kur`.
2. **Gelir (ISR):**
   - Toplam gelir = gelir sahiplerinin euro karşılıkları toplamı.
   - Maaşlı indirimi: kişi başına `min(%20 × gelir, 3.000 €)`.
   - Emekli indirimi: kişi başına `min(%20 × gelir, 1.000 €)`.
   - "Diğer" türde indirim yok.
   - Kira indirimi (yalnızca kirada): `min(kira, 7.000 € + 500 € × max(0, çocuk − 2), indirimler sonrası kalan gelir)`.
   - `ISR = max(0, toplam gelir − maaşlı − emekli − kira)`.
3. **Varlık (ISP):**
   - Oturulan ev (kendi evimiz): `değer = m² × 500`; `net = max(0, değer − kredi)`; `muafiyet = 52.500 + 2.500 × max(0, çocuk − 2)`; `sayılan = max(0, net − muafiyet) × 2/3`.
   - Diğer binalar: `max(0, m² × 500 − kredi)`.
   - Taşınır: `birikim = TL ÷ kur + euro`; `muafiyet = min(6.000 + 2.000 × (hane − 1), 10.000) + 1.000 × max(0, çocuk − 2)`; `net = max(0, birikim − muafiyet)`.
   - `ISP = ev + diğer binalar + taşınır net`.
4. **Aile katsayısı:** 1→1,00; 2→1,57; 3→2,04; 4→2,46; 5→2,85; sonraki her kişi +0,35. Artışlar: 3 çocuk +0,20; 4 çocuk +0,35; 5+ çocuk +0,50; 18 yaş altı çocuk varken ebeveynler çalışıyorsa +0,20 (3 yaş altı çocuk varsa +0,30); engelli birey başına +0,50.
5. `ISE = ISR + 0,2 × ISP`; `ISEE = ISE ÷ katsayı`; `ISPE = ISP ÷ katsayı`. Para değerleri 2 haneye yuvarlanır; ekranda tam euro gösterilir.

Bilinçli olarak modellenmeyenler: finansal varlıkların itibari getirisi (reddito figurativo), ödenen nafaka, engelli sağlık giderleri, "yalnız çalışmayan ebeveyn + yalnızca küçük çocuklar" katsayı istisnası, şirket öz sermayesi ayrıntısı (birikim alanının ipucunda "fon, hisse, şirket payı dahil" denir). Girdi temizliği: negatif/NaN → 0; çocuk ≤ hane; engelli ≤ hane; hane en az 1.

### Sabit veriler (`lib/isee/reference.ts`)

Kurlar — Banca d'Italia yıllık ortalama, "1 € = X TL" (kaynak: tassidicambio.bancaditalia.it REST servisi, alınma 2026-09-17):

| Yıl | Kur |
| --- | --- |
| 2024 | 35,5734 |
| 2025 | 44,8161 |

2026 ortalaması Ocak 2027'de yayımlanınca tek satırla eklenir.

Beş şehir — 2026/27 resmi şartnameleri (doğrulama 2026-09-17):

| Şehir (kurum) | ISEE limiti | ISPE limiti | Extra-UE için istenen yıl | Kaynak |
| --- | --- | --- | --- | --- |
| Milano (Regione Lombardia, DSU) | 26.887,93 € | 58.452,06 € | 2024 | regione.lombardia.it "Borse di studio universitarie 2026/2027"; Polimi "second year preceding" |
| Torino (EDISU Piemonte) | 26.306,25 € | 57.187,53 € | 2025 (kur 31/12/2025) | EDISU bando 2026/27 md. 6, md. 30, Ek E |
| Bologna (ER.GO) | 25.000,00 € | 50.000,00 € | 2025 | ER.GO Norme Generali 2026/27 md. 2.3, md. 7 |
| Roma (LazioDisco) | 28.339,88 € | 61.608,48 € | 2024 | DiSCo bando 2026/27 md. 12, 12.2 |
| Padova (Unipd / ESU) | 26.306,25 € | 43.125,94 € | 2024 | Unipd bando borse 2026/27 md. 5; Guida ISEE 2026 Ek 1 |

Ortalama: ISEE 26.568,06 €; ISPE 54.074,80 € (veriden hesaplanır, elle yazılmaz).

### Işık kuralı (`lib/isee/verdict.ts`)

- Bant: `değer < 0,85 × ortalama` → **mavi**; `değer ≤ 1,10 × ortalama` → **sarı**; üstü → **kırmızı**.
- ISEE ve ISPE ayrı ayrı sınıflanır; **genel ışık = kötü olan**.
- Güvenlik kilidi (2026-09-19 inceleme sonrası): ortalamaya göre mavi çıksa bile herhangi bir şehrin **kendi** limiti aşılıyorsa ("üstünde") genel ışık en az **sarı** yanar. Örnek: ISPE 45.500 € ortalamanın %15 altında kalır ama Padova'nın 43.126 € limitini aşar; yanlışlıkla "rahatsın" denmez.
- Alt bant bilerek geniş: kur yöntemi (Torino 31 Aralık kuru kullanır, 2025'te yıllık ortalamadan ~%11 farklı), referans yıl ve belge farkları tahmini oynatır; en pahalı hata yanlışlıkla "rahatsın" demektir.
- Şehir satırı durumu, o şehrin **kendi** limitlerine göre: `değer < 0,90 × limit` → "altında"; `değer ≤ 1,05 × limit` → "sınırda"; üstü → "üstünde". ISEE ve ISPE'den kötü olan satırın durumudur.
- Genel ışıktan daha kötü durumda şehir varsa açıklamanın altına bir dikkat satırı eklenir (örnek: Padova'nın düşük ISPE limiti).

## Ekran akışı

Sayfa düzeni (mevcut araç sayfası geleneği: Navbar/Footer yok, üstte "Ana sayfaya dön"):

1. Geri bağlantısı + başlık bloğu: H1 "ISEE Parificato hesaplayıcı", kısa açıklama, üç güven notu ("TL ve m² ile", "Resmi kur ve 2026/27 limitleri", "Tahmindir; resmi değeri CAF verir").
2. Sihirbaz kartı (`WizardProgress` + adım içeriği + Geri/Devam).
3. Açıklama bölümü (her zaman görünür, SEO için sunucu HTML'inde): ISEE Parificato nedir; nasıl hesaplanır (500 €/m², kur, %20, katsayı); ISEE ve ISPE farkı; 2026/27 beş şehir limit tablosu; hangi yıl istenir; resmi hesabı kim yapar; kaynak bağlantıları.
4. `ConsultPrompt` (mevcut, `t.consultPrompt.isee`).

Adımlar:

- **Adım 1 — Aile:** "Evde kaç kişi yaşıyorsunuz?" sayı çipleri (1–6, 7+ için sayı alanı); "Bunların kaçı çocuk? (öğrenci dahil)" çipleri; "18 yaşından küçük çocuk var mı?" evet/hayır → evet ise iki ek soru; açılır "Özel durum" içinde engelli birey sayısı.
- **Adım 2 — Yıl ve gelir:** yıl çipleri (2025 seçili gelir) + hangi şehrin hangi yılı istediğini söyleyen ipucu; gelir sahibi satırları (tür çipleri + TL alanı, satır ekle/sil); "brüt" ipucu (kesintiler öncesi; yalnızca neti biliyorsan yaklaşık `net ÷ 0,72`, kaba tahmindir).
- **Adım 3 — Ev ve mülk:** oturulan ev seçimi (`WizardOptionCard`), koşullu alanlar; 500 €/m² bilgi kutusu canlı örnekle ("120 m² = 60.000 €"); diğer binalar evet/hayır + alanlar; "arsa ve tarla sayılmaz" notu.
- **Adım 4 — Birikim:** TL alanı (0 olabilir), isteğe bağlı euro alanı; ipucu: vadesiz, vadeli, döviz, altın hesabı, fon, hisse, şirket payı; 31 Aralık tarihi seçilen yıla göre yazılır.
- **Sonuç:** ışık kutusu (renk + ikon + başlık + açıklama; renk tek sinyal değildir), Tahmini ISEE ve ISPE kartları, beş şehir listesi (şehir, ISEE/ISPE limiti, durum etiketi), "Nasıl hesapladık?" açılır dökümü (kur çevrimi, indirimler, muafiyetler, katsayı, formül satırları, gelir/varlık payı), uyarı metni, düğmeler: "Cevapları düzenle", "Baştan başla", burs haritası bağlantısı.

Davranış kuralları:

- Doğrulama adım bazında; hata mesajı alanın yanında, `role="alert"`; geçersizken ilerlenmez. Düğmeler devre dışı bırakılmaz.
- Adım değişince odak adım başlığına taşınır ve kart görünür alana kaydırılır.
- TL alanları `type="text"`, `inputMode="numeric"`, binlik ayırıcıyla biçimlenir (tr: nokta, en: virgül); yalnızca rakam kabul edilir.
- Durum yalnızca bileşen belleğinde tutulur; `localStorage`/URL yok (finansal veri saklanmaz).
- Dokunma hedefleri ≥ 44 px; mobil öncelikli tek sütun; masaüstünde sihirbaz kartı ortalanmış dar sütun (max ~640 px), açıklama bölümü geniş.
- Işık renkleri editorial palete uyumlu üç yerel ton (mavi, hardal, tuğla); metin/zemin kontrastı WCAG AA. Terracotta metin gerekirse `--editorial-terracotta-ink`.

## Mimari

```text
lib/isee/
  parificato.ts   # saf hesap: calculateParificato(input, rate) → sonuç + döküm; bağımlılıksız
  reference.ts    # kurlar, beş şehir limiti, kaynak/tarih meta verisi; averageLimits()
  verdict.ts      # bandFor(), statusFor(), buildVerdict(); bağımlılıksız (limitler parametre)
  wizardState.ts  # form tipi, boş durum, form → hesap girdisi dönüşümü, adım doğrulayıcıları (saf)
components/isee/
  IseeParificatoClient.tsx  # sayfa client leaf: başlık, sihirbaz, açıklama, ConsultPrompt
  IseeWizard.tsx            # adım durumu, doğrulama, gezinme, sonuç geçişi
  steps/HouseholdStep.tsx, IncomeStep.tsx, PropertyStep.tsx, SavingsStep.tsx
  IseeResult.tsx            # ışık, kartlar, şehir listesi, döküm
  IseeExplainer.tsx         # görünür açıklama/SEO bölümü
  fields.tsx                # MoneyField, NumberChips, ChoiceChips, YesNo, FieldHint, FieldError
  format.ts                 # fill, formatAmount, formatEuro, parseDigits (Intl'siz, hydration güvenli)
```

- `app/isee/page.tsx` yeni client leaf'i render eder (`force-dynamic` korunur); `app/isee/layout.tsx` metadata'sı "ISEE Parificato" odağıyla güncellenir (canonical aynı).
- Onboarding'deki `WizardProgress` ve `WizardOptionCard` yeniden kullanılır.
- Tüm metinler `lib/translations.ts` içinde yeni `iseeTool` ad alanında TR+EN paralel. Eski `isee` ad alanında yalnızca ana sayfa kartının kullandığı anahtarlar kalır; kullanılmayan eski anahtarlar silinir; kart metni ve `IseeSection` maddeleri yeni araca göre hizalanır (maddeler de çeviri dosyasına taşınır).
- Silinenler: `lib/iseeCalculator.ts`, `components/isee/IseeCalculatorClient.tsx`.
- Guard güncellemeleri: `scripts/check-isee-calculator.mjs` baştan yazılır; `scripts/check-home-consultation.mjs` içindeki `IseeCalculatorClient.tsx` yolu yeni dosyaya çevrilir.
- `public/llms.txt` ISEE satırları "ISEE Parificato estimate for families living in Türkiye" olarak netleştirilir.
- `AGENT_CONTEXT.md` ISEE bölümü ve proje ağacı, `AGENT_COMMITS.md` kaydı güncellenir.

## Test ve doğrulama

`npm run check:isee` (baştan yazılan `scripts/check-isee-calculator.mjs`; TypeScript dosyalarını transpile edip içe aktarır):

- Dört elle hesaplanmış aile (tolerans 0,5 €):
  - **A (mavi):** 2025; 4 kişi, 2 çocuk; maaşlı 1.200.000 + 600.000 TL; kendi evi 120 m²; diğer bina 80 m²; birikim 500.000 TL → ISR 34.486,53; ISP 46.156,70; katsayı 2,46; ISEE 17.771,49; ISPE 18.762,89; ışık mavi.
  - **B (kira, 3 çocuk):** 2024; 5 kişi, 3 çocuk, 18 yaş altı var, ebeveynler çalışıyor; maaşlı 900.000 + 480.000 TL; kira 240.000 TL; birikim 300.000 TL + 2.000 € → kira indirimi 6.746,61; ISR 26.347,77; ISP 0; katsayı 3,25; ISEE 8.107,01; ISPE 0; mavi.
  - **C (kırmızı):** 2025; 3 kişi, 1 çocuk; emekli 480.000 TL + diğer 360.000 TL; kendi evi 200 m², kredi 900.000 TL; diğer binalar 330 m²; birikim 2.000.000 TL + 15.000 € → ISR 17.743,26; ISP 232.905,44; katsayı 2,04; ISEE 31.531,55; ISPE 114.169,33; kırmızı.
  - **D (sarı):** 2025; 4 kişi, 2 çocuk; maaşlı 2.400.000 TL; kendi evi 150 m²; diğer bina 60 m²; birikim 800.000 TL → ISR 50.552,18; ISP 52.850,73; ISEE 24.846,48; ISPE 21.484,04; genel sarı; şehirler: Roma "altında", diğer dördü "sınırda".
- Kenar durumlar: kredi > değer → 0; kira kalan geliri aşamaz; 6+ kişi katsayısı; çocuk > hane kırpılır; negatif/NaN → 0; 3 yaş altı +0,30; engelli +0,50; 4 ve 5+ çocuk artışları.
- Işık sınırları: tam `0,85 × ort.` sarı; tam `1,10 × ort.` sarı; bir kuruş üstü kırmızı; genel ışık kötü olanı seçer; ortalama veriden hesaplanır.
- Veri bütünlüğü: beş şehir, pozitif limitler, https kaynak URL'leri, `verifiedAt` ISO tarih; kurlar pozitif.
- Kaynak guard'ları: eski dosyalar yok; `components/isee/*` içinde sabit Türkçe/İngilizce UI metni yerine `t.iseeTool` kullanımı; `lib/isee/*` dosyaları React/Next içe aktarmaz.

Ek: `npm run lint`, `npm run build`, `npm run check:home-consultation`, `npm run check:seo-vitals`, `npm run check:routes`, `npm run check:editorial-ui`. Tarayıcı doğrulaması: mobil (375) ve masaüstünde dört örnek ailenin akışı, hata durumları, klavye ile gezinme, EN dili, konsol hatasız; sunucu HTML'inde H1 + açıklama bölümü + limit tablosu görünür.

## Kapsam dışı / sonraki işler

- Türkiye'den belge toplama rehberi.
- Burs haritasının 2026/27 güncellemesi + Veneto kaydı (ayrı görev önerisi).
- 2026 yıllık ortalama kurunun eklenmesi (Ocak 2027) ve 2027/28 limitleri (2027 yazı).
- Üniversite bazlı harç dilimi tahmini; sonucu hub profiline kaydetme; analitik olayları.
