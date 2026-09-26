# ItalyPath - Ajan Giris Dosyasi

Son guncelleme: 2026-09-21 · Dogrulandigi commit: `ab38759` · 2026-09-26: `check:offline` push kurali, canli veritabani ve skill guncelleme kurallari (guvenlik denetimi kart 11)

Bu dosya yeni bir ajanin ilk okuyacagi kisa giristir: okuma sirasi, degismez calisma kurallari ve belge sozlesmesi. Mimari ayrinti `AGENT_CONTEXT.md`, acik isler `docs/STATUS.md`, tasarim/plan gecmisi `docs/superpowers/INDEX.md` icindedir. Buradaki kurallar `AGENT_CONTEXT.md` "Agent Kurallari" bolumunun ozetidir; celiski olursa AGENT_CONTEXT ve kod esastir.

## Okuma sirasi

1. `AGENTS.md` (bu dosya)
2. `AGENT_CONTEXT.md`: guncel mimari, veri katmani, route matrisi, feature sozlesmeleri, 20 agent kurali
3. `docs/STATUS.md`: tek acik is listesi ve kanitlanmis son durum
4. Isle ilgili feature dosyalari ve o feature'in guard scripti (`AGENT_CONTEXT.md` "Komutlar")
5. Gerektiginde: `SEO_AUDIT.md` (olcum kaydi; son bolumler guncel, §1 ozeti 28 Agustos snapshot'i), `SUPABASE_SECURITY_RUNBOOK.md`, `DATA_ENTRY_GUIDE.md`, `docs/USAGE_LIMITS.md` (servis planlari, limitler, olculmus kullanim; veri cekme, ISR veya deploy temposunu etkileyen her iste once bunu oku)
6. `docs/superpowers/INDEX.md`: her tasarim/plan belgesinin durumu ve kaniti; plan checkbox'lari ilerleme gostermez

Arsivler baslangic rehberi degildir: `AGENT_CONTEXT_FIX_REPORT.md` (2026-06-11 uygulanmis audit), `AGENT_COMMITS.md` (SHA'siz, eksik eski notlar), `EDITORIAL_AUDIT.md` (Temmuz 2026 snapshot), `docs/CONTEXT_AUDIT_2026-09-19.md` (son degerlendirme; 1-3. adimlari uygulandi).

## Degismez kurallar (ozet)

- Route guvenligi yalnizca `proxy.ts`; `middleware.ts` olusturma. Public/protected tek kaynak: `proxy.ts` + `AGENT_CONTEXT.md` "Auth ve Route Matrix". `/ai-mentor` public (gonullu + uzman masasi; AI masasi 2026-09-26'da kaldirildi), `/api/sat/*` ve `/ekip/*` protected.
- Runtime'da `app/data.ts` import etme. Liste yuzeyleri `getUniversitiesDirectory()`, okul sayfasi `getUniversityById()` (dizin kaydi), program sayfasi `getProgramPageData()` (yalnizca o programin kabul satiri); tam veri seti compose'unu veya okul basina tum kabul dosyalarini geri getirme (egress diyeti). ISR sayfalarinda ve onlari saran layout'larda (`app/layout.tsx` dahil) sunucu tarafinda `searchParams`/`cookies()`/`headers()`/`auth()`/`currentUser()`/`connection()` okuma ve veri hatasini yakalama (son saglam sayfa kalsin; `check:seo-vitals` zorlar).
- `program_degree_class_codes` view'i dizin sorgusunun bagimliligidir; yeni Supabase ortaminda `supabase/program_degree_class_codes.sql` ile olustur.
- `SUPABASE_SERVICE_ROLE_KEY` ve `SUPABASE_SECRET_KEY` server-only; `NEXT_PUBLIC_*` alanina veya client dosyasina asla girmez. Katalog okumalari (okul/program/kabul dosyasi) yalnizca `lib/universities.server.ts` icinde `SUPABASE_SECRET_KEY` (`sb_secret_…`) ile yapilir; anon anahtara geri dusme yok (2026-09-26). anon/authenticated'in katalog tablolarinda yetkisi yok; `public`'te yeni tablo kapali baslar, gereken grant'i SQL dosyasinda RLS ile birlikte acikca yaz (kart 4, `supabase/data_api_privileges.sql`). Ayni Supabase'e `~/remake` iOS uygulamasi da bagli: yetki degisikliginde onu da hesaba kat. Prod Supabase migration ve silme yalnizca Kerem onayiyla.
- Canli veritabaninda `execute_sql` yalniz okuma icindir: DDL/DML yok. Sema degisikligi yalniz `supabase/*.sql` dosyasiyla ve Kerem onayiyla (oncesinde yedek + `--verify`); veri yazma `import-*`/`cleanup:*` betikleriyle, once kuru calistirma. Supabase skill'i sema degisikligi icin `execute_sql` onerir; bu projede bu kural onceliklidir (tek veritabani canli).
- Skill guncellemelerinde (`npx skills update` vb.) `-y` kullanilmaz; guncellemeden once gelen fark okunur, beklenmeyen talimat degisikligi varsa Kerem'e sorulur.
- UI metinleri `lib/translations.ts` icinde TR/EN paralel; hard-code yok. Tailwind v4 token'lari `app/globals.css`; `tailwind.config.*` yok. Global state icin Context + mevcut hook'lar; Redux/Zustand/Jotai yok.
- SEO: gizli metin yok; schema yalnizca sayfada gorunen, dogrulanmis bilgi. `generateMetadata()` server `layout.tsx`'te kalir. Sitemap `lastModified` uydurma tarih tasimaz.
- Terracotta renkli metin `--editorial-terracotta-ink`; `RouteTransition` icindeki `AnimatePresence initial={false}` kalir; mobil zoom kilidi bilincli urun karari, yeniden onerme.
- Sehir rehberlerinde uydurma bilgi yok (`unresearched` acikca gosterilir). Sosyal icerikte uydurma sayi, sahte social proof, kaynaksiz "degisken kural" yok; sayilar tarihli snapshot.
- Kok dosyalar (`/llms.txt` gibi `.txt`) proxy matcher'da statik sayilmaz: public olacaksa `proxy.ts` allowlist ve `scripts/check-route-access.mjs` listesi birlikte guncellenir.
- Dirty worktree varsay; baskasinin degisikligini revert etme. Baska oturumlar ayni klasorde main'e commit atabilir: commit'lerde dosyalari acikca ekle (`git add -A` yok), ozellik isi icin `.worktrees/` kullan.
- Kerem (urun sahibi) kod okumaz: sade Turkce, madde madde; sohbette TS/JS kod blogu gosterme. Verilen kapsamin disina cikmadan once acik evet/hayir al; onayli cok bolumlu iste her bolumde ara onay sorma. Secenek sunmadan once amaci ve ogrenci senaryosunu anlat.
- Canliya karsi yogun curl/Lighthouse Vercel challenge tetikler; olcumu seyrek tut. Paralel arastirma ajanlarini 5-10 ile sinirla, dalga dalga calistir.

## Dogrulama

- Her push'tan once `npm run check:offline` yesil olmali (tum cevrimdisi `check:*`/`test:*` + lint + `tsc --noEmit`, ~20 sn; canliya istek atmaz). Surec kuralidir, git hook/CI yok. Kirmizi varsa push yok; nedeni Kerem'e yazilir.
- Her degisiklikten sonra ilgili guard'i calistir (`AGENT_CONTEXT.md` "Komutlar"). Belge, ortam veya route degisikliginde en az: `check:routes`, `check:auth-production`, `check:ai-search`, `check:expert-leads`, `check:mentor-desks`, `check:seo-vitals`, `check:university-data-source`.
- "Kontroller yesil" ifadesi tarihlidir; bugunku durum icin guard'i yeniden kos.
- Test edilmis Node surumu: 24.13.0 (2026-09-25); `package.json` `engines.node` = `24.x` (Vercel de 24 kullanir). Bu makinede PATH'te once Homebrew Node 20 gelebilir; `node -v` ile kontrol et, Node 24 `/usr/local/bin/node`.

## Belge sozlesmesi

- Her tasarim/plan/arsiv belgesinin ustunde durum satiri bulunur: `UYGULANDI`, `KISMEN`, `UYGULANMADI`, `IPTAL`, `YERINE GECTI`, `ARSIV`, `LEGACY`, `BASKA PROJE`, `AKTIF REFERANS`; yaninda tarih ve kanit (commit, kayit bolumu veya kod dosyasi). Kanitsiz "tamamlandi" yazilmaz; checkbox'lar toplu isaretlenmez.
- Tasarim tarihi ile dogrulama tarihi ayri tutulur. Kod mevcut davranisi, tasarim hedefi, canli olcum yalnizca olculdugu ani anlatir.
- Sayilar tarihli snapshot olarak yazilir; guncel sayim `AGENT_CONTEXT.md` "Canli university/program verisi" bolumundedir.
- Yeni acik is `docs/STATUS.md`'ye eklenir, biten is ayni dosyada "Kapananlar"a tasinir; `AGENT_CONTEXT.md`'ye is listesi yazilmaz.
- Komutlar dort turdur: offline kontrol (`check:*`, `test:*`; toplusu `check:offline`), canli okuma (`check:data`, `check:program-details`, `validate-supabase-*`; `check:hub-onboarding` yalniz `ITALYPATH_API_BASE` verilince canliya gider), DB yazma (`import-*`, `cleanup:*`, once dry-run), legacy arac (`clean:med`).
