# ItalyPath — Servis Abonelikleri ve Kullanım Limitleri

Durum: AKTIF REFERANS · Oluşturma: 2026-09-25 · Son güncelleme: 2026-09-26 (Gemini fatura kontrolü kapandı, Kerem kararı) · 2026-09-26 (sayfa ağırlığı ve sunucu işi, kart 10) · 2026-09-26 (aylık bağımlılık kontrolü, güvenlik kartı 11) · 2026-09-26 (Gemini kaldırıldı, güvenlik kartı 6) · 2026-09-25 (yedek satırları, G2#2) · Kanıt: Supabase MCP (org planı, DB/Storage boyutu, edge log sayımı), Kerem'in panel ekranları (Vercel Usage, Supabase Usage, Clerk Overview, Name.com; 2026-09-25), resmî limit/fiyat sayfaları (her satırda URL)

Bu belge projenin kullandığı dış servislerin planını, limitini, ölçülmüş kullanımını ve limit aşımında ne olduğunu tutar. Kullanım limitleri sorumluluğu 2026-09-25'ten beri ayrı bir ajan rolüdür. Yeni bir servis eklenirse buraya satır açılır; plan değişirse tarih ve kanıtla güncellenir. Açık işler `docs/STATUS.md`'dedir.

Limit sayıları 2026-09-25'te resmî sayfalardan ve panellerden doğrulandı; sağlayıcılar bunları değiştirir, karar vermeden önce URL'den veya panelden yeniden kontrol et. "DOĞRULANMADI" işaretli değerler resmî sayfada bulunamadı.

## Özet

| Servis | Ne için | Plan | Planın kaynağı | Risk (2026-09-25) |
| --- | --- | --- | --- | --- |
| Vercel (takım "yyarar's projects") | Barındırma, ISR, görsel optimizasyonu, Web Analytics | **Hobby** | Vercel Usage ekranı, 2026-09-25 | **En yüksek:** ISR Writes %38, Fluid Active CPU %44 (30 gün); Hobby ticari kullanımı yasaklıyor; aşımda özellik 30 gün durur |
| Supabase (proje "Path", `kskbnxxyviowmrlskwke`) | Veritabanı, Storage (belgeler), Realtime (gönüllü masa) | **Free** | MCP `get_organization` + Usage ekranı, 2026-09-25 | Orta: dönem 8,04/5 GB (kapanıyor); yeni dönemde günlük 20-65 MB; 14 Ekim'den sonra ikinci mühlet yok |
| Clerk (uygulama "Italypath", Production) | Giriş/kayıt (Google OAuth + e-posta kodu) | **Student** (GitHub Student Developer Pack) | Clerk Overview ekranı, 2026-09-25 | Düşük: Pro eşdeğeri limit, 50.000 MRU; haftalık aktif 1 |
| Google Gemini API | Kullanılmıyor (AI masası ve `/api/chat` 2026-09-26'da kaldırıldı) | Kaldırıldı (Kerem kararı, 2026-09-25) | Kerem; `docs/STATUS.md` Kapananlar | Yok: AI Studio anahtarları ve Vercel `GEMINI_API_KEY` 2026-09-26'da silindi |
| Name.com | `italypath.app` alan adı + DNS | Tek alan adı, otomatik yenileme açık, bitiş **2 Mayıs 2027**, WHOIS gizli | Name.com ekranı, 2026-09-25 | Düşük |
| GitHub (`yyarar/italypath`) | Kod deposu | Free varsayılıyor | `.github/workflows` yok | Yok (Actions kullanılmıyor); Clerk Student planı GitHub bağlantısına bağlı |
| Unsplash / Pexels | Görseller (hesap/anahtar yok, doğrudan URL) | — | `next.config.ts` remotePatterns | Vercel görsel dönüşüm kotasını tüketir |

Kerem'in beyanı (2026-09-25): başka ücretli servis yok; hiçbir servisten limit uyarı e-postası gelmedi; gerçek bir iletişim e-postası yok.

## Vercel

Plan: **Hobby** (2026-09-25). Supabase org'u Vercel Marketplace üzerinden yönetildiği için Supabase'in fatura ve plan değişikliği de Vercel panelinden yapılır.

Ölçülen kullanım, "Last 30 Days" (26 Ağustos 15:00 – 25 Eylül), Kerem'in Usage ekranı:

| Kalem | Kullanım / Hobby limiti | Oran | Bizde ne tüketir |
| --- | --- | ---: | --- |
| **Fluid Active CPU** | 1 sa 46 dk / 4 sa | **%44** | Dinamik sayfalar, API rotaları, ISR yeniden üretimi |
| **ISR Writes** | 77K / 200K | **%38** | Her deploy sonrası ve içerik değişince sayfaların ISR önbelleğine yazılması |
| Fast Origin Transfer | 2,08 GB / 10 GB | %21 | ISR üretimi, fonksiyon yanıtları |
| Image Optimization – Transformations | 303 / 5K | %6 | `next/image` + Unsplash/Pexels |
| Function Invocations | 47K / 1M | %5 | Dinamik sayfalar, API, ISR |
| Edge Requests | 41K / 1M | %4 | Tüm istekler |
| Fluid Provisioned Memory | 10,6 / 360 GB-saat | %3 | Aynı fonksiyonlar |
| ISR Reads | 27K / 1M | %3 | ISR önbelleğinden okuma |
| Fast Data Transfer | 1,71 GB / 100 GB | %2 | Ziyaretçiye giden içerik |
| Image Optimization – Cache Reads / Writes | 4,4K / 300K · 3,6K / 100K | %1 / %4 | Görsel önbelleği |
| Edge Request CPU Duration | 11 sn / 1 sa | %0 | — |
| Web Analytics Events | 333 / 50K | %1 | `<Analytics />` |
| Speed Insights, Edge Middleware, Edge Function units, Global Config, Microfrontends | 0 | %0 | Kullanılmıyor |

ISR Writes nasıl sayılır (https://vercel.com/docs/incremental-static-regeneration/limits-and-pricing):

- Yazma birimi 8 KB'lık sıkıştırılmış veridir; büyük sayfa daha çok birim yazar.
- Yenileme çalışır ama içerik değişmemişse **yazma sayılmaz**. Yani 3 saatlik `revalidate` tek başına yazma üretmez; içerik değişimi ve yeni deploy üretir.
- Her deploy'un ISR önbelleği ayrıdır: push → yeni deploy → taranan her sayfa yeniden yazılır.
- ISR 16 Eylül'de devreye girdi; 16-24 Eylül arasında **13 push** (dolayısıyla 13 deploy) oldu.

Günlük ISR Writes (Usage grafiğinden okunan yaklaşık değerler, 2026-09-25; 15 Eylül öncesi ~0):

| Gün | Yazma birimi | O gün/önceki gece push |
| --- | ---: | --- |
| 16 Eylül | ~8K | 4 push (ISR'nin ilk yayını) |
| 17 Eylül | ~15K | 1 push; sitemap yeniden gönderimi sonrası tarama |
| 18 Eylül | ~16K | — (ilk tam tarama) |
| 19 Eylül | ~9,5K | 3 push |
| 20 Eylül | ~3,5K | — |
| 21 Eylül | ~8,5K | 4 push |
| 22-23 Eylül | ~4,5K, ~3K | — |
| 24-25 Eylül | ~4,5K, ~4,5K (25'i yarım gün) | 24 Eylül gece 1 push |

Yorum: push günleri ve ilk tam tarama zirve yapıyor, push olmayan günlerde taban ~3-5K/gün. Taban sürerse 30 günde ~100-150K eder; her push ~5-10K ekler. 16-18 Eylül zirveleri (~39K) pencereden 16-18 Ekim'de düşer. Tahmin: Ekim ortasına kadar haftada 1-2 toplu push ile ~%80'de kalır, bugünkü tempoyla (10 günde 13 push) 200K'ya dayanır. Push olmayan günlerde de tabanın sürmesinin iki olası açıklaması var: (1) her deploy'dan sonra tarayıcılar 1.000 sayfayı birkaç günde yeniden gezip yeni önbelleğe ilk kez yazdırıyor; (2) yenilemede çıktı değişiyor (deterministik olmayan içerik). Bir hafta push'suz dönemde taban düşmezse (2) incelenmeli; sayfa çıktısını küçültmek de yazma birimini düşürür (https://vercel.com/kb/guide/how-to-reduce-isr-writes). Rota bazlı yazma kırılımı (ISR Observability) Hobby'de yok.

### Push bütçesi (2026-09-25 tahmini)

Varsayımlar: Hobby sınırı 30 günlük kayan pencerede uygulanır (en kötü durum; sabit dönem ise daha rahat). Push'suz gün tabanı 3-5K yazma, push yapılan gün +5-10K (19 ve 21 Eylül'den). 16-18 Eylül'deki ilk tam tarama zirvesi (~39K) pencereden 16-18 Ekim'de düşer; sıkışık dönem bu tarihe kadardır.

| Senaryo (16 Ekim'e kadar) | Tepe pencere (orta tahmin: taban 4K) | Sonuç |
| --- | --- | --- |
| Hiç push yok | ~157K (%78) | Sınırın altında ama %80'e yakın |
| Haftada 1 push | ~172-187K (%86-94) | Sınırın altında, marj dar |
| Haftada 2 push | ~183-213K | Sınırda; kötü senaryoda 14 Ekim civarı aşım |
| Haftada 3+ push | 198-250K | 11-14 Ekim civarı aşım |

Karar kuralı: 17 Ekim'e kadar haftada en fazla 1 toplu push; acil düzeltme dışında ek push yok. Usage ekranında ISR Writes %85'i geçerse Kerem'e sor (seçenek: Pro'ya bir aylığına geçiş). 18 Ekim'den sonra hesap yeni günlük değerlerle yenilenir. Hobby'de ISR Writes aşımında tam olarak ne olduğu (yalnızca ISR mi duruyor, proje mi) resmî sayfada net değil (DOĞRULANMADI); en kötü ihtimal site sayfalarının üretilememesi.

Vercel "Ignored Build Step" (yalnız belge/araştırma değişen push'larda build'i atlama) değerlendirildi ve **Kerem kararıyla uygulanmadı (2026-09-25)**: kazanç orta (son 13 push'un 3'ü site dışı dosyaydı), eksileri var (atlanan build yine günlük deploy kotasına sayılır; dashboard "Redeploy" için "Use project's Ignore Build Step" kutucuğu kaldırılmalı; ileride yanlış atlama riski). Yeniden önerme koşulu: ISR Writes 30 günlük pencerede %80'i geçer ve toplu push kuralı yetmezse; o zaman da önce Kerem'e sor.

Fluid Active CPU (günlük grafik, 2026-09-25): 27 Ağustos-15 Eylül ~3-4 dk/gün, 16-25 Eylül ~3,5-5,5 dk/gün (19 ve 21 Eylül zirve ~5,3 dk). Egress diyeti CPU'yu düşürmedi; tarama arttıkça hafif yükseliyor. Bugünkü tempo ~2-2,5 saat/30 gün (%50-60); 4 saati aşmak için günlük ~8 dk gerekir. İzlenecek, acil değil.

Hobby limitleri (https://vercel.com/docs/plans/hobby, https://vercel.com/docs/limits): 100 deploy/gün, 1 eşzamanlı build, 45 dk/build; Firewall'da 3 IP kuralı + 3 özel kural, DDoS koruması açık.

Aşımda (https://vercel.com/docs/pricing/manage-and-optimize-usage):

- Genel kural: aşılan özellik **30 gün durur** (Hobby'de ücretlendirme yok, durdurma var).
- Görsel optimizasyonu: yeni görseller 402 döner (site açık kalır, alt metin görünür); önbellekteki görseller çalışır.
- Web Analytics: 3 gün tolerans, sonra durur; 7 gün sonra döner.
- Limite yaklaşınca otomatik e-posta uyarısı gelir; özel eşik ve Spend Management yalnızca Pro'da.

**Ticari kullanım:** Hobby "non-commercial personal use only" (https://vercel.com/docs/limits/fair-use-guidelines#commercial-usage). Tanım geniş: bir ürün/hizmetin satışının reklamını yapmak ticari sayılır. Ücretli danışmanlığa lead toplayan `/on-gorusme` formu bu tanıma girer. Pro: üye başı 20 $/ay + aylık kullanım kredisi, Spend Management (bildirim, webhook, projeyi otomatik durdurma). Karar Kerem'in.

Kullanım ekranı: Vercel → "yyarar's projects" → **Usage** (sol menüde kalem bazında günlük grafik). Hobby'de kullanım sayılarının TEK kaynağı bu ekrandır.

Vercel CLI (2026-09-25 kuruldu, `vercel` 60.0.1, `/opt/homebrew/bin/vercel`; Kerem `vercel login` ile girdi, kullanıcı `yyarar`, takım `yyarars-projects`, proje `italypath`):

- `vercel usage` Hobby'de çalışmaz: "Billing cost data is unavailable" (Hobby'de fatura verisi yok; `/v1/billing/charges` aynı kaynak).
- `vercel metrics` (ISR write units, CPU, istek sayısı) **Observability Plus** ister (ücretli eklenti) → Hobby'de kullanılamaz; satın alma önerilmez.
- İşe yarayanlar: `vercel ls italypath` (production deploy listesi ve sayısı), `vercel env ls production --project italypath` (değişken ADLARI; değer okuma), `vercel inspect <url>`.
- 2026-09-25 `vercel env ls`: `GEMINI_API_KEY` production'da hâlâ tanımlıydı; 2026-09-26'da Kerem kaldırdı (ad listesinde yok). `quizkey` (Development/Preview/Production, ~9 Şubat 2026'da Clerk ve Gemini anahtarlarıyla aynı gün eklenmiş) hiçbir commit'te, dalda veya çalışma dosyasında geçmiyor; site kullanmıyor, Kerem kaynağını bilmiyor. Kullanım/maliyet riski yok; silmek isteğe bağlı temizlik (Vercel → italypath → Settings → Environment Variables).

## Supabase

Plan: **Free** (org `vercel_icfg_JxVKe7WOES0MaNzN0IHBPnDg`). Dönem her ayın 27'sinde başlar.

| Kalem | Free limit | Ölçülen (2026-09-25) | Kaynak |
| --- | --- | --- | --- |
| Egress (uncached) | 5 GB | Dönem 27 Ağu – 27 Eyl: **8,04 GB** (aşım 3,04 GB). Günlük: 15 Eylül zirve 683 MB; 16-25 Eylül ~20-65 MB | Usage ekranı |
| Cached egress | 5 GB (ayrı faturalanır) | — | https://supabase.com/pricing |
| Veritabanı boyutu | 500 MB | 27 MB (en büyük tablo `program_admission_details` 10 MB) | `pg_database_size` |
| Storage | 1 GB | 4,6 MB, 265 nesne, 2 bucket | `storage.objects` |
| Auth MAU | 50.000 | Kullanılmıyor (auth Clerk'te) | — |
| Realtime | 200 eşzamanlı bağlantı, 2M mesaj/ay | 24 saatte 52 websocket isteği | edge log |
| Edge Functions | 500.000 çağrı/ay | Kullanılmıyor | — |

Panel uyarısı (2026-09-25): "Organization exceeded its quota in the previous billing cycle · Projects will be restricted from 14 Oct, 2026 if your organization remains over quota." 27 Eylül'de başlayan dönem 14 Ekim'e kadar 5 GB'ın altında kalmalı; bugünkü tempoyla beklenen ~0,5-1 GB.

Aşımda (https://supabase.com/docs/guides/platform/billing-faq): mühlet verilir; mühletten sonra tekrar aşılırsa **ikinci mühlet yok**, org kısıtlanır: projeler durdurulabilir, veritabanı salt okunur olabilir veya tüm API istekleri **HTTP 402** döner. Bu olursa tüm program/okul sayfaları "veri yüklenemedi" gösterir. 7 gün hareketsiz Free proje durdurulur (bot trafiği olduğu için pratik risk değil).

Pro: 25 $/ay; 250 GB egress + 250 GB cached egress dahil. Vercel Marketplace org'unda plan değişikliği Vercel panelinden yapılır; Spend Cap'in orada olup olmadığı DOĞRULANMADI.

### Egress ölçümü ve eğilimi

Supabase MCP egress byte'ı vermez; edge loglarda yanıt boyutu yok. Yöntem: 24 saatlik edge log'da istek türlerini say, tür başına yanıt boyutunu SQL ile ölç (`json_agg(...)::text` uzunluğu), sıkıştırma oranı uygula. 25 Eylül kalibrasyonu: log yöntemi oran 3-4 ile 75-100 MB/gün verdi, Usage ekranı ~40-65 MB gösterdi → etkin oran ~5-6. Karar için Usage ekranı esastır, log sayımı eğilim içindir.

| Gün | Hedefli kabul çekimi (`university_id=eq.`) | Dizin çekimi | Usage ekranı |
| --- | --- | --- | --- |
| 14 Eylül (diyet öncesi) | 128 tam çekim (4,6 MB) | — | ~590 MB (15 Eylül 683 MB) |
| 16-17 Eylül | 250 | 111 | ~20-35 MB |
| 23 Eylül | 295 | 141 | ~35 MB |
| 25 Eylül (son 24 saat) | **604** | 171 | ~40-50 MB |

Sınıflandırma tuzağı: `select=department_id` hem dizin (varlık) sorgusuna hem tam kolon listesine uyar. Önce `university_id=eq.` kontrol et, dizin sayısı = toplam − hedefli.

Neden artıyor: program sayfası `getUniversityById()` ile okulun **tüm** kabul dosyalarını çeker (Sapienza 97 satır, ham ~540 KB; en büyük okul ham ~2 MB). ISR 3 saatte bir yenilenir, in-memory memo instance başınadır ve her deploy memo'yu sıfırlar. Google taraması arttıkça çekim sayısı artar. 25 Eylül'de en çok çekilen okullar: id 3 (42), 4 (33), 9 (30), 14 (29), 18 (28).

Önerilen düzeltme: program sayfası yalnızca kendi kabul satırını çeksin (tahmini ~10 kat düşüş). Kerem bu işi ayrı bir ajana soracak (2026-09-25). **2026-09-26: uygulandı, dalda, push bekliyor** (güvenlik kartı 2): program sayfası yalnız kendi satırını çeker, okul sayfası hiç kabul dosyası çekmez; ayrıntı `AGENT_CONTEXT.md` "Veri Katmani". Yayından sonra Usage ekranında günlük egress'in düştüğü kontrol edilmeli.

### Olay geçmişi

| Tarih | Olay | Kök neden | Çözüm |
| --- | --- | --- | --- |
| 2026-07-02 | Egress ~32,5 GB (Free kotanın %650'si) | Google taraması + önbelleksiz tam compose | 3 saatlik in-memory memo (e8e2237) |
| 2026-09-15 | Egress 7,27 GB (%145), dönem sonunda 8,04 GB; kısıtlama tarihi 14 Ekim | Her soğuk instance 4,6 MB tam çekim; kabul dosyaları +%58; tarama ve sık deploy | Egress diyeti + ISR (44b4e11…b9138dc), `SEO_AUDIT.md` §20 |

## Clerk

Plan: **Student** ("Personal workspace", Clerk ekranı 2026-09-25). Kaynak: https://clerk.com/github-student-developer-pack, https://clerk.com/pricing

- Limitler Pro planına eşit: 50.000 MRU (kayıttan 24 saat+ sonra geri dönen kullanıcı), sınırsız sosyal bağlantı, Clerk markasının kaldırılması, MFA. SMS dahil değil (kullanılmıyor).
- Süre: GitHub Student Developer Pack'ten mezun olana kadar. Sonra **Hobby'ye (Free) düşer**; Free de 50.000 MRU verir, en fazla 3 sosyal bağlantı (bizde 1: Google). Student planı için GitHub hesabının Clerk'e bağlı kalması şart.
- Ölçülen: 21 Eylül haftası aktif 1, yeni 0; son 3 ayda haftalık en fazla ~4 kullanıcı (Overview grafiği).
- Kullanım ekranı: Clerk panel → Italypath → Overview. Otomatik kullanım uyarısı belgelenmemiş.

## Google Gemini API

Durum: KALDIRILDI (2026-09-26). Kerem kararı (2026-09-25): AI mentor kaldırılacak.

- 2026-09-26: Kerem Google AI Studio'daki tüm Gemini anahtarlarını sildi ve Vercel'den `GEMINI_API_KEY`'i kaldırdı. Aynı gün kod tarafı (`/api/chat`, AI masası, `ai`/`@ai-sdk/*`/`@google/generative-ai` paketleri) dalda kaldırıldı; push Kerem onayıyla. Ayrıntı `docs/STATUS.md` Kapananlar.
- Elle fatura kontrolü (Şubat 2026'dan bu yana Gemini kullanım/faturası): **kapandı, yapılmayacak** (Kerem kararı, 2026-09-26). Gerekçe: anahtarlar silindi, GitHub uyarısı kapandı.

## Name.com ve iletişim adresi

- `italypath.app`: Name.com hesabındaki tek alan adı; otomatik yenileme açık, bitiş 2 Mayıs 2027, WHOIS gizli, Domain Safe. DNS: apex A ve `www` CNAME Vercel'e (`AGENT_CONTEXT.md`). `contact@italypath.app` Name.com e-posta yönlendirmesiyle Kerem'in Gmail'ine gider (25 Eylül 2026 kuruldu; Name.com MX kayıtları, deneme e-postası ulaştı ama ilk seferde Gmail spam'ine düştü).
- **`italypath.com` bize ait değil** (2026-09-25 kontrolü): Ergonet (İtalya) DNS'inde, Google Workspace MX'i var ve "Italian Citizenship & Visa Lawyers" başlıklı başka bir site sunuyor. Yasal sayfalardaki `contact@italypath.com` (`lib/legal/documents.ts`) bu şirketin e-postasına gider. Kerem kararı (2026-09-25): yeni adres `contact@italypath.app`, Name.com'un ücretsiz e-posta yönlendirmesiyle (yalnızca alır, 10 MB ek sınırı, gönderme yok; Name.com nameserver'ları şart, `italypath.app` zaten Name.com NS'inde). Takip `docs/STATUS.md` #18.

## Kontrol takvimi

| Sıklık | Ne | Nasıl |
| --- | --- | --- |
| Haftalık (pazartesi 09:00, otomatik) | Supabase egress, Vercel deploy sayısı, `GEMINI_API_KEY` durumu (2026-09-26'dan beri beklenen: tanımlı değil) | Zamanlanmış görev "ItalyPath haftalık kullanım kontrolü" (`~/.claude/scheduled-tasks/italypath-weekly-usage-check/`); rapor `tmp/usage/YYYY-MM-DD.md` (Git dışı); uygulama kapalıysa bir sonraki açılışta çalışır |
| Haftalık (elle; Kerem veya ajan) | Supabase yedeği (veritabanı + `documents` + `sat-figures`) | `npm run backup:supabase -- --run`, ardından `-- --verify`; arşiv `BACKUP_DIR`'e yazılır, sonra bilgisayar dışına kopyalanır. Tek yedek egress üst sınırı ~16,6 MB (2026-09-25). Ayrıntı: `SUPABASE_SECURITY_RUNBOOK.md` bölüm 7 |
| Canlıya yazan her işten önce (`--apply`, import, SQL güncelleme/silme, migration) | Supabase yedeği | Aynı komutlar; `--verify` geçmeden canlı yazma başlamaz (`DATA_ENTRY_GUIDE.md`) |
| Aylık (ayın ilk pazartesi) | Vercel ISR Writes, Fluid Active CPU, Fast Origin Transfer | Kerem'den Usage ekranı; hedef 30 günlük pencerede < %60 |
| Ayın 27'si civarı | Supabase dönem kapanışı | Kerem'den Usage ekranı |
| Aylık (ayın ilk pazartesi) | Ön görüşme talepleri saklama temizliği (2026-09-26, Kerem kararı: tamamlanan/ulaşılamayan 6 ay, şüpheli 30 gün) | `npm run cleanup:expert-leads` (kuru çalıştırma, yalnız sayı okur); Kerem onayıyla `-- --apply`. Egress ihmal edilebilir |
| Aylık | Vercel Usage tamamı, Clerk kullanıcı sayısı | Kerem'den ekran görüntüsü |
| Aylık (ayın ilk pazartesi; 2026-09-26, güvenlik denetimi S6#7) | Bağımlılık güvenliği ve sürüm geriliği | Yerelde `npm audit --omit=dev` ve `npm outdated` (canlı siteye/Supabase'e istek yok). Sonuç `docs/STATUS.md` "Kanıtlanmış son durum" tablosuna tarihli yazılır; yamalar ayrı push yapılmadan bir sonraki kod push'una eklenir (acil güvenlik yaması hariç), öncesinde `npm run check:offline`. Ana sürüm geçişleri (ör. Clerk Core 3) ayrı iş olarak STATUS'a girer. İlk koşu 2026-09-26: audit 0 açık |
| Yıllık | Alan adı yenileme (2 Mayıs 2027), Clerk Student planının sürmesi | Name.com, Clerk |

## Kullanımı koruyan kurallar (ajanlar için)

- Yeni bir veri yüzeyi Supabase'den yalnızca ihtiyacı olan satırı ve kolonu çeker; liste yüzeyi `getUniversitiesDirectory()`, detay hedefli sorgu (`AGENT_CONTEXT.md` kural 6 ve 17).
- **Deploy sayısı kullanım demektir.** Her push yeni bir Vercel deploy'u üretir: ISR önbelleği (ISR Writes), memo'lar (Supabase egress) ve soğuk instance'lar (Active CPU) sıfırlanır. Push'ları topla; yalnız belge commit'lerini tek başına push etme, bir sonraki kod push'uyla gönder.
- Sabit içerikli sayfa `force-dynamic` olmaz (her ziyarette fonksiyon + CPU). Filtre ve seçimler adres satırına `window.history.replaceState` ile yazılır; `router.replace`/`router.push` dinamik sayfada her tuşta sunucu render'ı üretir (kart 10, 2026-09-26: `/isee` ve `/communities` statik, üç gezgin `replaceState`). Burs haritası GeoJSON'u tarayıcı önbelleğine girer (~27 KB gzip).
- ISR sayfalarının çıktısı deterministik kalır: render'da `new Date()`, `Math.random()` veya istek başına değişen veri yok (değişen içerik her yenilemede yazma üretir).
- Canlıya karşı polling en az 60 sn aralıkla, Lighthouse art arda en fazla 3-4 koşu (Vercel Firewall challenge'ı).
- Yeni `next/image` kaynağı veya yeni görsel genişliği görsel dönüşüm kotasını tüketir (Hobby 5.000/ay).
- Paralel araştırma ajanları 5-10 ile sınırlı (Claude oturum limiti).
- Supabase yedeği egress harcar (2026-09-25: tek yedek ≤ ~16,6 MB; dump 3,3 MB + 265 dosya 4,5 MB). Haftalık yedek ve canlı yazma öncesi yedek dışında çalıştırma; deneme modu (`--dry-run`) yalnız sayım okur.
- Bu belgedeki bir planı veya limiti değiştiren her bilgi tarih ve kanıtla girilir.
