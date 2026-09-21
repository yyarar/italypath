# ItalyPath - Ajan Giris Dosyasi

Son guncelleme: 2026-09-21 · Dogrulandigi commit: `ab38759`

Bu dosya yeni bir ajanin ilk okuyacagi kisa giristir: okuma sirasi, degismez calisma kurallari ve belge sozlesmesi. Mimari ayrinti `AGENT_CONTEXT.md`, acik isler `docs/STATUS.md`, tasarim/plan gecmisi `docs/superpowers/INDEX.md` icindedir. Buradaki kurallar `AGENT_CONTEXT.md` "Agent Kurallari" bolumunun ozetidir; celiski olursa AGENT_CONTEXT ve kod esastir.

## Okuma sirasi

1. `AGENTS.md` (bu dosya)
2. `AGENT_CONTEXT.md`: guncel mimari, veri katmani, route matrisi, feature sozlesmeleri, 20 agent kurali
3. `docs/STATUS.md`: tek acik is listesi ve kanitlanmis son durum
4. Isle ilgili feature dosyalari ve o feature'in guard scripti (`AGENT_CONTEXT.md` "Komutlar")
5. Gerektiginde: `SEO_AUDIT.md` (olcum kaydi; son bolumler guncel, §1 ozeti 28 Agustos snapshot'i), `SUPABASE_SECURITY_RUNBOOK.md`, `DATA_ENTRY_GUIDE.md`
6. `docs/superpowers/INDEX.md`: her tasarim/plan belgesinin durumu ve kaniti; plan checkbox'lari ilerleme gostermez

Arsivler baslangic rehberi degildir: `AGENT_CONTEXT_FIX_REPORT.md` (2026-06-11 uygulanmis audit), `AGENT_COMMITS.md` (SHA'siz, eksik eski notlar), `EDITORIAL_AUDIT.md` (Temmuz 2026 snapshot), `docs/CONTEXT_AUDIT_2026-09-19.md` (son degerlendirme; 1-3. adimlari uygulandi).

## Degismez kurallar (ozet)

- Route guvenligi yalnizca `proxy.ts`; `middleware.ts` olusturma. Public/protected tek kaynak: `proxy.ts` + `AGENT_CONTEXT.md` "Auth ve Route Matrix". `/ai-mentor` public (AI masasi arayuzde paused), `/api/chat` ve `/ekip/*` protected.
- Runtime'da `app/data.ts` import etme. Liste yuzeyleri `getUniversitiesDirectory()`, tek okul `getUniversityById()`; tam veri seti compose'unu geri getirme (egress diyeti). ISR sayfalarinda sunucu tarafinda `searchParams`/`cookies()`/`headers()` okuma.
- `program_degree_class_codes` view'i dizin sorgusunun bagimliligidir; yeni Supabase ortaminda `supabase/program_degree_class_codes.sql` ile olustur.
- `SUPABASE_SERVICE_ROLE_KEY` server-only; `NEXT_PUBLIC_*` alanina veya client dosyasina asla girmez. Prod Supabase migration ve silme yalnizca Kerem onayiyla.
- UI metinleri `lib/translations.ts` icinde TR/EN paralel; hard-code yok. Tailwind v4 token'lari `app/globals.css`; `tailwind.config.*` yok. Global state icin Context + mevcut hook'lar; Redux/Zustand/Jotai yok.
- SEO: gizli metin yok; schema yalnizca sayfada gorunen, dogrulanmis bilgi. `generateMetadata()` server `layout.tsx`'te kalir. Sitemap `lastModified` uydurma tarih tasimaz.
- Terracotta renkli metin `--editorial-terracotta-ink`; `RouteTransition` icindeki `AnimatePresence initial={false}` kalir; mobil zoom kilidi bilincli urun karari, yeniden onerme.
- Sehir rehberlerinde uydurma bilgi yok (`unresearched` acikca gosterilir). Sosyal icerikte uydurma sayi, sahte social proof, kaynaksiz "degisken kural" yok; sayilar tarihli snapshot.
- Kok dosyalar (`/llms.txt` gibi `.txt`) proxy matcher'da statik sayilmaz: public olacaksa `proxy.ts` allowlist ve `scripts/check-route-access.mjs` listesi birlikte guncellenir.
- Dirty worktree varsay; baskasinin degisikligini revert etme. Baska oturumlar ayni klasorde main'e commit atabilir: commit'lerde dosyalari acikca ekle (`git add -A` yok), ozellik isi icin `.worktrees/` kullan.
- Kerem (urun sahibi) kod okumaz: sade Turkce, madde madde; sohbette TS/JS kod blogu gosterme. Verilen kapsamin disina cikmadan once acik evet/hayir al; onayli cok bolumlu iste her bolumde ara onay sorma. Secenek sunmadan once amaci ve ogrenci senaryosunu anlat.
- Canliya karsi yogun curl/Lighthouse Vercel challenge tetikler; olcumu seyrek tut. Paralel arastirma ajanlarini 5-10 ile sinirla, dalga dalga calistir.

## Dogrulama

- Her degisiklikten sonra ilgili guard'i calistir (`AGENT_CONTEXT.md` "Komutlar"). Belge, ortam veya route degisikliginde en az: `check:routes`, `check:auth-production`, `check:ai-search`, `check:expert-leads`, `check:mentor-desks`, `check:seo-vitals`, `check:university-data-source`.
- "Kontroller yesil" ifadesi tarihlidir; bugunku durum icin guard'i yeniden kos.
- Test edilmis Node surumu: 20.20.1 (2026-09-21). `package.json` icinde `engines` yok.

## Belge sozlesmesi

- Her tasarim/plan/arsiv belgesinin ustunde durum satiri bulunur: `UYGULANDI`, `KISMEN`, `UYGULANMADI`, `IPTAL`, `YERINE GECTI`, `ARSIV`, `LEGACY`, `BASKA PROJE`, `AKTIF REFERANS`; yaninda tarih ve kanit (commit, kayit bolumu veya kod dosyasi). Kanitsiz "tamamlandi" yazilmaz; checkbox'lar toplu isaretlenmez.
- Tasarim tarihi ile dogrulama tarihi ayri tutulur. Kod mevcut davranisi, tasarim hedefi, canli olcum yalnizca olculdugu ani anlatir.
- Sayilar tarihli snapshot olarak yazilir; guncel sayim `AGENT_CONTEXT.md` "Canli university/program verisi" bolumundedir.
- Yeni acik is `docs/STATUS.md`'ye eklenir, biten is ayni dosyada "Kapananlar"a tasinir; `AGENT_CONTEXT.md`'ye is listesi yazilmaz.
- Komutlar dort turdur: offline kontrol (`check:*`), canli okuma (`validate-supabase-*`), DB yazma (`import-*`, once dry-run), legacy arac (`clean:med`).
