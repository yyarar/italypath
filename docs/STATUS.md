# ItalyPath — Açık İşler ve Son Durum

Tarih: 2026-09-21 · Doğrulandığı commit: `ab38759`

Bu dosya projenin **tek** açık iş listesidir (`docs/CONTEXT_AUDIT_2026-09-19.md` önerisi). Her değişiklikte tarihi ve kanıtı güncelle; biten işi "Kapananlar"a taşı. Mimari `AGENT_CONTEXT.md`'de, tarihsel ölçümler `SEO_AUDIT.md`'de, tasarım/plan durumları `docs/superpowers/INDEX.md`'de tutulur.

Sütunlar: **Kanıt / kaynak** = repo dosyası, commit, kayıt bölümü veya canlı sayım. **Karar** = Kerem'in vermesi gereken karar varsa.

## Kanıtlanmış son durum (2026-09-21)

| Konu | Durum | Kanıt |
| --- | --- | --- |
| Canlı veri | 56 okul, 39 şehir, 941 program, 941 kabul dosyası (%100), 803 programda resmî degree class kodu | Supabase `count(*)`, 2026-09-21 |
| Sitemap | 1.004 URL (7 statik + 56 okul + 941 program) | `SEO_AUDIT.md` §23.2 |
| SAT bankası | 1.019 Math sorusu, `needs_review` 0, 1.019/1.019 `explanation_en`; `explanation_tr` yok; Reading/Writing bankada yok | Supabase sayımı, 2026-09-21 |
| Erişim | `/llms.txt` canlıda 200 (oturumsuz); `/ai-mentor` public, AI masası arayüzde paused | canlı HEAD isteği 2026-09-21; `proxy.ts`, `lib/mentor/channels.ts` |
| Guard'lar | routes, auth-production, ai-search, expert-leads, mentor-desks, seo-vitals, university-data-source, home-consultation, program-metadata, auth-ui, hub-onboarding, cities, isee yeşil | yerel koşu, 2026-09-21 |
| Son deploy'lar | Program detay Deploy 3+4 (§23), `/llms.txt` düzeltmesi (f58fcd0), context düzeltmesi (631a2a4), §24 + Instagram paketi (ab38759) | Git, 2026-09-21 |
| Doğrulanmamış | GSC ekranı bu turda görüntülenmedi; Rich Results Test yapılmadı; Vercel/Supabase dashboard okunmadı | — |

## Açık işler

### A. Zaman kritik

| # | İş | Kanıt / kaynak | Karar |
| --- | --- | --- | --- |
| 1 | Supabase Free egress mühleti: dönem 27 Eylül'de sıfırlanır, 14 Ekim'e kadar hedef < 1 GB; ikinci mühlet yok. Supabase Usage izlenmeli | `SEO_AUDIT.md` §20.6, §24.5 | — |
| 2 | GSC kontrolü 23-30 Eylül: dizin / `noindex` / keşfedildi / 404 sayıları, sitemap yeniden gönderimi (1.004), tarama istatistikleri | `SEO_AUDIT.md` §24.5 kontrol listesi | — |
| 3 | Rich Results Test ile bir dosyalı program sayfasında `EducationalOccupationalProgram` doğrulaması | `SEO_AUDIT.md` §23.3 | — |
| 4 | 2027/28 tarih tazelemesi: Kasım–Aralık 2026'da tüm site program tarihleri (bazı okullar şimdiden 2027/28 takvimi taşıyor) | `tmp/uni-research/STATUS.md` (yerel, Git dışı), 19 Eylül notu | Tempo |

### B. Veri güncelliği

| # | İş | Kanıt / kaynak | Karar |
| --- | --- | --- | --- |
| 5 | Burs haritası: 8 `verified-full` bölge (Campania, Emilia-Romagna, Lazio, Lombardia, Marche, Piemonte, Puglia, Toscana) 24 Eylül 2026'da 2026/27 resmî bandolarıyla güncellendi (Kerem onayı; araştırma `burs-8-bolge-2026-27-research/`, Git dışı; ölü 6 link değişti; Lazio ve Lombardia eşikleri ISEE aracıyla eşitlendi). **Açık kalan:** 12 `registry-only` bölge (Abruzzo, Basilicata, Calabria, Friuli VG, Liguria, Molise, Sardegna, Sicilia, Trentino-AA, Umbria, Valle d'Aosta, Veneto) hâlâ 9 Mart 2026 tarihli kurum dizini; `ardis.fvg.it` bu makineden çözümlenemedi. Kasım–Aralık 2026'da 2027/28 tazelemesiyle birlikte ele alınabilir | `lib/scholarships/regions.ts`; `burs-8-bolge-2026-27-research/results/` | 12 dizin bölgesi için tur kararı |
| 6 | Topluluklar: 19 kayıt `lastCheckedAt` 2026-03-10. **Kerem kararı (23 Eylül): bu turda dokunulmuyor.** Otomatik link kontrolü 23 Eylül: 13 WhatsApp daveti geçerli ama `sapienza-2026-2027` grubunun adı artık "GRUP KAPANDI"; bazı grup adları değişmiş (Padova TR, Florence 2025/2026, UniBO 2026-2027, ER.GO Yardımlaşma 2026/2027); 3 kayıt eski dönem kohortu (Unito 22/23, Unito 23/24, Sapienza 23/24); Telegram geçerli; 5 Facebook grubu otomatik istekte okunamıyor (bot koruması), elle/Chrome kontrolü gerekir | `lib/community-links.ts`; link kontrolü 2026-09-23 | Kapanan grup + kohort grupları kararı |
| 7 | ISEE referansları 2026/27 (doğrulama 2026-09-17): Ocak 2027'de yeni yıl kuru, yaz 2027'de yeni şartname limitleri | `lib/isee/reference.ts` | — |
| 8 | Instagram CAPTIONS.md: "64 üniversite", "1.008 program", "900 program" 8 Eylül snapshot'ı; yayın öncesi 56 / 941 / 941 ile güncellenmeli, "her programın yanında kaynak" vaadi dosyalı oranla eşleşmeli; taslak/onaylı/yayımlandı etiketi yok | `content/instagram/CAPTIONS.md` satır 19, 160, 199; audit madde 9 | Yayın kararı |
| 9 | 16 okulun `website` alanı Google arama linki | 19 Eylül notu (`tmp/uni-research/STATUS.md`) | Kerem: şimdilik hayır |

### C. SEO ve performans

| # | İş | Kanıt / kaynak | Karar |
| --- | --- | --- | --- |
| 10 | Font diyeti: 10 preload dosyası → ilk ekranda kullanılan ağırlıklar (aday 400 + 600); latin-ext kalır | `SEO_AUDIT.md` §19.6/2, §22 | Sıralama |
| 11 | Clerk JS diyeti: herkese açık sayfalarda ~188 KiB kullanılmayan JS; auth regresyon testi şart | `SEO_AUDIT.md` §19.6/3 | Sıralama |
| 12 | Ön görüşme SSS'sine FAQPage şeması; program sayfası LCP görselinde `priority`/`sizes` | `SEO_AUDIT.md` §22/4 | Sıralama |
| 13 | Anahtar kelime listesi (GSC + otomatik tamamlama) ve şehir/bölge sayfası kararı | `SEO_AUDIT.md` §21 2. faz, §22/3 | Kapsam |
| 14 | `Organization` + `WebSite` JSON-LD her sayfada tekrar ediyor (geçerli; düşük öncelikli sadeleştirme) | `app/layout.tsx` | — |
| 15 | Dış sinyal (bağlantı/otorite) kararı; Kerem'e sorulmadan açılmaz | `SEO_AUDIT.md` §24.4 | Kerem |
| 16 | Küçük erişilebilirlik: `label-content-name-mismatch` linkleri, dekoratif rakam kararı; `meta-viewport` bulgusu bilinçli zoom kilidi (95 bu karar değişmeden mümkün değil) | `SEO_AUDIT.md` §19.6/5, §23.2 | Zoom: karar verildi |

### D. Ürün ve özellik borcu

| # | İş | Kanıt / kaynak | Karar |
| --- | --- | --- | --- |
| 17 | Sentry hata izleme kurulmadı (`package.json`'da sentry paketi yok); DSN bekleniyor | `package.json` | DSN |
| 18 | Yasal metinler için hukukçu incelemesi yapılmadı; iletişim adresi `contact@italypath.com` yayında (2bfd9f2, 21 Temmuz) | `EDITORIAL_AUDIT.md` uyarısı, `lib/legal/documents.ts` | Hukukçu |
| 19 | PWA paketi yok: `public/manifest.webmanifest` ve 192/512 ikonlar | repo | Öncelik |
| 20 | Üniversite karşılaştırma özelliği yok (favori + dizin modeliyle yapılabilir) | fikir | Öncelik |
| 21 | AI mentor masası arayüzde paused; açılırsa önce system prompt boyutu, latency ve maliyet ölçülmeli (941 programlık dizin) | `lib/mentor/channels.ts`, `app/api/chat/route.ts` | Kerem |
| 22 | SAT: figür onarım backlog'u 2 kayıt; `explanation_tr` hiç yok (1.019 soruda yalnız `explanation_en`); Reading/Writing bankaya alınmadı (07-03 planı Math + R/W hedefliyordu) | `tmp/sat-bank/remediation/figure-repair-backlog.json` (yerel); Supabase sayımı | Kapsam |
| 23 | `app/data.ts` legacy seed'deki tekrarlı/placeholder görseller (runtime kullanmaz) | `app/data.ts` | Düşük |
| 24 | Yerel `next dev`'de program detay sayfaları 404 verdi (canlıda 200), 19 Eylül notu; bu turda yeniden denenmedi | `tmp/uni-research/STATUS.md` | Doğrulama |

### E. Repo ve belge hijyeni

| # | İş | Kanıt / kaynak | Karar |
| --- | --- | --- | --- |
| 25 | Araştırma/import artifact'leri: `output/` 58 MB (93 izlenen dosya), `*-admission-requirements/`, `city-content-research/` repoda; dış depo mu `.gitignore` mu | `git ls-files output`, `du` | Kerem |
| 26 | Git dışı çalışma: `app/communities/prototype/` + `components/prototypes/communities/` (topluluk seçici prototipleri), `dosyasiz-108-program-research/` (1,7 MB araştırma girdisi), `docs/CONTEXT_AUDIT_2026-09-19.md` (bu listenin kaynağı); commit veya sil | `git status` | Kerem |
| 27 | Legacy dosyalar: `lib/deadlines/targets.ts` (yalnız legacy runbook atıf yapar), `scripts/save-scraped.mjs`, `scripts/scrape-deadlines-runbook.md`, `components/ui/scroll-based-velocity.tsx`; sil veya "kullanma" etiketi | grep, `AGENT_CONTEXT.md` repo hijyeni | Silme onayı |
| 28 | `AGENT_CONTEXT.md` kısaltma (audit önerisi ~200–300 satır): tekrar ve tarihsel anlatım ayıklanacak; kural listesi ve guard eşlemeleri korunur | audit "Önerilen sade yapı" | Ertelendi |
| 29 | `docs/superpowers` planlarındaki checkbox'lar (33 plan, 14 işaretli / 1.427 işaretsiz) ilerlemeyi yansıtmaz; durum `docs/superpowers/INDEX.md`'de tutulur, checkbox'lar toplu işaretlenmez | INDEX.md | — |
| 30 | `DATA_ENTRY_GUIDE.md` 39 satır: hedef ortam, dry-run, yedek, yazılabilir alanlar, kaynak/akademik yıl, import sonrası cache kontrolü eksik | audit madde 11 | Sıralama |
| 31 | `check:docs` (belge yol/npm script referans guard'ı) ve `engines` ile Node pinleme önerileri | audit | Kerem |
| 32 | `SUPABASE_SECURITY_RUNBOOK.md`: kapsam, SQL bağımlılıkları (view, SAT, expert_leads) ve son doğrulama tarihi eklenmeli | audit dosya tablosu | Sıralama |

## Kapananlar (son 7 gün)

- 2026-09-24: Burs haritasında 8 ayrıntılı bölge 2026/27 çağrılarına geçirildi (8 Sonnet ajanı, resmî bando PDF'leri, 36 canlı kaynak adresi; eşik değişimi yalnız Lazio ve Lombardia'da).
- 2026-09-19: 108 dosyasız program turu kapandı (41 import, 67 program + 8 okul silindi; 751/752/246 düzeltildi). `check:cities` yükleyici hatası (afe5d01).
- 2026-09-21: Program detay Deploy 3+4 (`SEO_AUDIT.md` §23); Task 6 (dosyasız noindex) bilinçli iptal.
- 2026-09-21: `/llms.txt` canlıda 404 → 200 (f58fcd0); `check:auth-production` bayat `/ai-mentor` beklentisi düzeltildi (Temmuz'dan beri kırmızıydı).
- 2026-09-21: AGENT_CONTEXT/README/.env.example erişim modeli, sayılar, view bağımlılığı (631a2a4); `SEO_AUDIT.md` §24 ve Instagram paketi commit (ab38759); `AGENTS.md`, bu dosya ve `docs/superpowers/INDEX.md` oluşturuldu, 74 tasarım/plan belgesine durum satırı eklendi.
