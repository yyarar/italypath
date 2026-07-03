# Tasarım: SAT Soru Bankası (Soru Çözüm Merkezi)

Tarih: 2026-07-03
Durum: Tasarım onaylandı; yazılı spec kullanıcı incelemesinde

## Amaç

Kerem'in masaüstündeki "SAT Question Bank PDFs" klasöründe duran 1410 resmi SAT
sorusunu (821 Math + 589 Reading and Writing) yapılandırılmış veriye çevirip,
giriş yapmış kullanıcılara app içinde interaktif bir soru çözme deneyimi sunmak.

Kullanıcı akışı: bölüm seç (Math / Reading and Writing) → konu seç → soruları
tek tek çöz → anında doğru/yanlış geri bildirimi al → ilerleme kaydedilsin.

## Kaynak Veri Envanteri

Klasör: `~/Desktop/SAT Question Bank PDFs/`

- `Question Bank (Formatted)/`: görüntü tabanlı, düzenli dizilmiş soru PDF'leri.
  Metin katmanında yalnızca soru numaraları ve soru kimlikleri var; soru gövdesi
  ve formüller görüntü. Konu klasörü + dosya adındaki 1/2/3 zorluk seviyesini verir.
- `Question Bank (Unformatted)/`: College Board export formatı. Metin katmanı
  var: soru kimliği, alan (domain), beceri (skill) her soru için metin olarak
  çıkıyor. Reading and Writing sorularının tamamı (pasaj + soru + 4 şık) temiz
  metin. Math sorularında düz metin kısmı çıkıyor ama formüller ve şıklar
  görüntü olarak gömülü.
- `Question Bank (Formatted)/Answers/`: cevap anahtarı PDF'leri. Metin katmanından
  soru kimliği → doğru cevap eşlemesi script ile çıkarılabiliyor.

Kritik tespitler:

1. Math tarafında önemli oranda "grid-in" (şıksız, sayı girişli / SPR) soru var.
   Örnek: "Percentages 3" 17 sorunun 9'u sayısal cevaplı. Veri modeli ve UI iki
   soru tipini de desteklemeli: `mcq` ve `spr`.
2. 87 soru PDF'ine karşılık 86 cevap anahtarı var; bir anahtar eksik. Pipeline
   hangi dosya olduğunu raporlamalı; o dosyanın soruları cevapları başka
   kaynaktan doğrulanana kadar import edilmez. LLM'e cevap ürettirmek yasak.
3. Bazı sorularda grafik/tablo görseli var; bunlar kırpılıp görsel dosyası
   olarak saklanmalı.
4. Soru kimlikleri (8 haneli hex) resmi College Board soru bankası kimlikleri.
   Telif gereği içerik yalnızca giriş gerektiren, indekslenmeyen yüzeylerde sunulur.

## Kapsam

- PDF → yapılandırılmış veri boru hattı (script + ayrı LLM extract adımı)
- Supabase'de `sat_questions` ve `sat_attempts` tabloları + RLS
- Şekil görselleri için Supabase Storage bucket'ı
- Protected `/sat` deneyimi: bölüm/konu seçimi, soru kartı, anında geri
  bildirim, konu bazlı ilerleme
- Protected soru API'si (egress-guard'lı, memo'lu)
- TR/EN arayüz metinleri (`lib/translations.ts`)
- Yeni doğrulama script'i (`npm run check:sat-bank`)

Kapsam dışı (sonraki fazlar):

- Türkçe çözüm açıklamaları (karar: yapılacak ama acele değil; şemada
  `explanation_tr` alanı boş bekler)
- Süreli mod / karışık mini deneme
- "Yanlışlarım" tekrar listesi
- AI Mentor köprüsü ("bu soruyu açıkla")
- Public/SEO yüzeyi (bilinçli olarak yok; telif)

## Seçilen Yaklaşım

**Tam metin çıkarma (Yaklaşım 2).** Sorular metin + matematik dizgi formatı
(KaTeX/LaTeX delimiterlı) olarak saklanır; yalnızca şekiller görsel olur.

Reddedilen alternatifler:

- *Soru = resim:* 1410 görselin sürekli servis edilmesi Supabase egress kota
  krizini (2026-07-02 öncesi %650 aşım) yeniden davet eder; editorial tasarıma,
  karanlık moda, aramaya ve gelecekteki Türkçe açıklama entegrasyonuna aykırı.
- *Karma başlangıç (RW metin, Math resim):* iki render altyapısı + sonradan
  taşıma borcu.

## Veri Modeli

Supabase generated types yok; `types/index.ts` içine explicit row interface
eklenir (`SatQuestionRow`, `SatAttemptRow`). Prod'a tablo eklemeden önce
Kerem onayı alınır (mevcut kural).

### `sat_questions`

- `id` (text, PK): resmi 8-hex soru kimliği
- `section` (text): `math` | `reading-writing`
- `domain` (text): ör. "Algebra", "Craft and Structure"
- `skill` (text): ör. "Linear Functions", "Words in Context"
- `difficulty` (int): 1 | 2 | 3 (dosya adından)
- `question_type` (text): `mcq` | `spr`
- `prompt` (text): soru gövdesi; RW'de pasaj dahil; matematik ifadeleri
  `$...$` LaTeX delimiterlı
- `choices` (jsonb, null): mcq için `{A,B,C,D}` metinleri (LaTeX destekli);
  spr'de null
- `correct_answer` (jsonb): mcq'da `["C"]`; spr'de kabul edilen cevap
  yazımları dizisi (ör. `["3/4", "0.75", ".75"]`)
- `figure_path` (text, null): Storage'daki şekil dosyası yolu
- `explanation_tr` (text, null): faz 2 Türkçe çözüm alanı
- `source_file` (text): hangi PDF'ten geldiği (izlenebilirlik)
- `created_at` (timestamptz)

Okuma: yalnızca server (API route) üzerinden. Üniversite tablolarından farklı
olarak bu içerik korumalıdır: anon key ile select AÇILMAZ (aksi halde soru
bankası PostgREST üzerinden herkese sızar). RLS açık kalır, anon/authenticated
için select policy tanımlanmaz; server API route'u Supabase'e service role ile
erişir. Bu, yeni bir server-only env değişkeni gerektirir:
`SUPABASE_SERVICE_ROLE_KEY` (yalnızca server tarafında; client bundle'a asla
girmez; Vercel'de environment variable olarak eklenir).

### `sat_attempts`

- `id` (uuid, PK, default)
- `user_id` (text): Clerk user id
- `question_id` (text, FK → sat_questions)
- `selected_answer` (text): işaretlenen şık veya girilen sayı
- `is_correct` (boolean)
- `answered_at` (timestamptz, default now)

Append-only; ilerleme "soru başına son deneme" olarak türetilir. RLS modeli
`user_profiles` ile aynı: `requesting_user_id()` — herkes yalnızca kendi
satırlarını görür/yazar. SQL setup dosyası: `supabase/sat_bank.sql`.

### Şekil görselleri

- Bucket: `sat-figures`, public read; dosyalar sıkıştırılmış (WebP, makul
  genişlik), path'ler soru kimliği bazlı
- Uzun `Cache-Control` (immutable) ile CDN önbelleği; egress baskısı düşük
- Sadece şekilli azınlık soruda kullanılır

### SPR cevap eşleştirme kuralı

Öğrenci girişi normalize edilir: boşluk kırpma, `3/4` gibi kesirler sayısal
değere çevrilir, ondalık karşılaştırma toleransla yapılır ve
`correct_answer` dizisindeki herhangi bir yazımla eşleşme doğru sayılır.
Mantık `lib/sat/` altında saf fonksiyon olarak yazılır ve test edilebilir olur.

## PDF → Veri Boru Hattı

Kerem'in kuralı: script işi ile LLM extract işi ayrı adımlardır; LLM adımı
pilot onayından geçmeden ölçeklenmez. Ara çıktılar `tmp/sat-bank/` altında
tutulur (gitignore'da), repoya commit edilmez. Script'ler `scripts/sat/`
altında yaşar.

- **Adım 1 — mekanik çıkarma (LLM yok):**
  - RW: Unformatted PDF metin katmanından 589 sorunun tamamı (künye + pasaj +
    soru + şıklar) parse edilir → JSON
  - Cevap anahtarları: 86 key PDF'ten kimlik → cevap eşlemesi → JSON; eksik
    anahtar dosyası burada tespit edilip raporlanır
  - Math: Formatted PDF sayfaları görüntüye çevrilir; metin katmanındaki soru
    numarası koordinatlarından her soru ayrı görüntü parçasına kesilir
- **Adım 2 — pilot LLM extract:** 2 konu seçilir (kesir/formül yoğun bir Algebra
  konusu + SPR yoğun bir Problem-Solving konusu, ~50 soru). Soru görüntülerinden
  yapılandırılmış JSON (prompt + choices LaTeX'li) çıkarılır. Şekilli sorular
  işaretlenir. **Kerem kaliteye bakar; onay yoksa ölçekleme yok.**
- **Adım 3 — toplu LLM extract:** pilot onayıyla kalan Math soruları dalga
  dalga işlenir (aynı anda en fazla 5-10 paralel iş; oturum limiti kuralı).
  İstenirse şüpheci mod: ikili bağımsız çıkarma + fark çıkanları elle inceleme.
- **Adım 4 — doğrulama + import:**
  - Bütünlük: beklenen soru sayısı dosya bazında tutuyor mu; her sorunun
    cevabı anahtarla eşleşiyor mu; mcq'larda 4 şık var mı; spr cevapları
    parse ediliyor mu; şekil bekleyen soruların görseli mevcut mu
  - Temiz geçerse Supabase'e import (script, idempotent upsert) ve şekillerin
    Storage'a yüklenmesi
  - Eksik anahtarlı dosyanın soruları cevap doğrulanana kadar dışarıda kalır

## Uygulama Yüzeyi

### Route ve erişim

- `app/sat/page.tsx`: protected (proxy.ts public listesine EKLENMEZ; varsayılan
  korumalı). SEO hedefi yok; `/hub` benzeri client deneyim kabul edilir.
- `app/api/sat/questions/route.ts`: protected API. Clerk auth kontrolü
  (`/api/chat` deseni). Sorgu paramları: `section`, `skill`. Yanıt yalnızca o
  konunun sorularını taşır (~10-100 KB metin).
- Egress guard: soru seti deploy sonrası değişmeyen statik içerik olduğundan
  `lib/universities.server.ts` deseni uygulanır — server-side in-memory memo
  (3 saat TTL, stale-on-error). Route yanıtı `no-store`.
- `app/robots.ts`: `/sat` disallow listesine eklenir.
- Doğru cevap istemciye soru ile birlikte iner (v1 kabulü; kullanıcı zaten
  giriş yapmış ve içerik çalışma amaçlı). Cevap sunucuda saklansın istenirse
  faz 2'de "cevabı API'de doğrula" modeline geçilebilir.

### Sayfa yapısı ve bileşenler

- `app/sat/page.tsx`: bölüm kartları (Math / Reading and Writing) + konu
  listesi. Her konu satırında: konu adı, soru sayısı, kullanıcının ilerlemesi
  ("12/34 çözüldü, 9 doğru" gibi), zorluk kırılımı.
- Soru çözme görünümü (aynı route içinde client state ile konu oturumu):
  - `components/sat/QuestionCard.tsx`: künye etiketleri (konu, seviye, kimlik),
    prompt, varsa şekil görseli, mcq şıkları veya spr sayı girişi
  - Cevap sonrası: anında doğru/yanlış, doğru cevabın gösterimi, "Sonraki soru"
  - Konu sonu özeti: doğru/yanlış sayısı, tekrar çözme daveti
- Hook'lar `lib/sat/` altında: `useSatQuestions.ts` (fetch + client memo,
  `useUniversitiesData` deseni), `useSatProgress.ts` (attempts okuma/yazma,
  optimistic update + rollback `useFavorites` deseni)
- Matematik dizgi: KaTeX (hafif, MIT) eklenir; prompt/choices içindeki `$...$`
  ifadeleri render eden küçük bir `MathText` bileşeni yazılır. KaTeX yalnızca
  `/sat` yüzeyinde yüklenir (bundle'a global maliyet bindirmez).
- Tasarım dili: mevcut editorial paper/sage/terracotta, serif başlıklar,
  keskin border. Gradient/sparkle yok. Mobil öncelikli: şıklar tam genişlik
  dokunma hedefleri, spr'de sayısal klavye (`inputmode`).
- Navigasyon: Navbar'a ve hub'a `/sat` girişi (hub'da kompakt kart). BottomNav
  v1'de değişmez.
- Tüm metinler `lib/translations.ts` `sat.*` namespace'inde TR/EN paralel.
  Soru içerikleri İngilizce kalır (SAT İngilizce bir sınav); arayüz iki dilli.

### Hata durumları

- API/Supabase hatası: route-level editorial hata bloğu (mevcut desen), global
  error'a düşürülmez
- Şekil görseli yüklenemezse: alt metinli sade placeholder; soru yine çözülebilir
- Attempts yazımı başarısızsa: optimistic update geri alınır, kullanıcıya
  sessiz olmayan ama nazik bir uyarı gösterilir; çözme akışı bloklanmaz

## Doğrulama

- Yeni: `npm run check:sat-bank` (`scripts/check-sat-bank.mjs`)
  - route guard: `/sat` proxy public listesinde değil; robots disallow içeriyor
  - veri sözleşmesi: soru tipleri, şık sayıları, cevap formatları, figure
    path bütünlüğü (import edilmiş veri üzerinde veya export JSON üzerinde)
  - egress politikası: soru API'sinde memo + no-store mevcut
- Mevcut check'ler yeşil kalır: `check:routes`, `check:university-data-source`
  başta olmak üzere tam liste
- Pipeline doğrulaması Adım 4'te ayrıca çalışır (import öncesi zorunlu kapı)

## Riskler

1. Math LLM extract hataları → pilot kapısı + anahtar çapraz kontrolü +
   örneklem incelemesi + istenirse ikili çıkarma
2. Eksik cevap anahtarı (1 dosya) → import dışı bırakma + Kerem'e raporlama
3. KaTeX render kenar durumları (uzun ifadeler, tablolar) → pilot çıktısında
   gerçek cihazda görsel kontrol
4. Attempts tablosunun büyümesi → append-only, küçük satırlar; sorgu her zaman
   user_id filtreli; v1 için endişe değil, izlenir
5. Telif → yalnızca protected + noindex yüzey; public örnek soru yok (Karma
   model bilinçli reddedildi)

## Fazlar

- **Faz 1 (bu spec):** pipeline + veri + `/sat` çözme deneyimi + ilerleme
- **Faz 2 adayları:** Türkçe çözüm açıklamaları (toplu üretim + örneklem
  onayı), yanlışlar listesi, mini deneme/süreli mod, AI Mentor köprüsü,
  cevabın sunucuda doğrulanması

## Uygulama Notu

Planlama ve gözetim bu oturumların sahibi agent'ta kalır; uygulama görevleri
Kerem tarafından başka agent'lara tek tek dağıtılacaktır. Bu nedenle uygulama
planı, her görev bağımsız yürütülebilecek şekilde (kendi bağlamı, dosya
listesi ve doğrulama adımıyla) yazılmalıdır.
