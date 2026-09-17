# Program Detay Sayfalarını Geliştirme — Ajan Brifi

Tarih: 2026-09-17
Hazırlayan: SEO ajanı (15-17 Eylül oturumu), Kerem'in isteğiyle
Durum: Yeni ajana devredilecek görev. Kapsam ve öncelikler Kerem'le netleştirilmeden uygulamaya geçilmez.

## 0. Nasıl başlanır

1. Sırayla oku: `AGENT_CONTEXT.md` → `SEO_AUDIT.md` §19-22 → bu brif → `docs/superpowers/specs/2026-09-15-university-data-egress-isr-design.md` ve `2026-09-16-internal-linking-phase1-design.md`.
2. `superpowers:brainstorming` ile başla: §6'daki kararları Kerem'e **tek tek, sade Türkçe** sor; kod bloğu gösterme (Kerem ürün sahibi, kod okumaz). Onay sonrası kısa tasarım notu + plan, sonra uygulama.
3. Kerem'in çalışma düzeni: görünür her değişikliği **başlamadan önce ayrı ve net anlat**; plan değişirse bunu da ayrıca söyle; canlıya çıkmadan önce yerel ekran görüntüsü göster; `git push` yalnızca açık "gönder" onayıyla; verilen kapsamın dışına çıkmadan önce açık evet/hayır al; ara adımlarda "devam edeyim mi" diye sorma.
4. Yerelde push edilmemiş belge commit'leri olabilir (`git log origin/main..HEAD`); ilk kod push'unla birlikte gider. Yalnız belge içeren push'lar da Vercel'de deploy + önbellek sıfırlaması yapar; belge commit'lerini biriktir.

## 1. Amaç ve başarı ölçütleri

Program detay sayfası (`/universities/[id]/departments/[deptSlug]`, 1.008 sayfa) sitenin asıl SEO yüzeyi ve ön görüşme hunisinin en kalabalık girişi. Hedef: sayfayı (a) Türk öğrenci için okunur ve karar verdirici, (b) Google için benzersiz ve değerli, (c) ön görüşmeye yönlendiren bir sayfa hâline getirmek; bunu mevcut editorial tasarım dilini, doğrulanmış-kaynak ilkesini ve hız/egress sözleşmesini bozmadan yapmak.

Ölçütler:
- Okunabilirlik: kabul takvimi ve koşulları ham metin bloğu olarak değil, taranabilir yapıda; hiçbir bilgi uydurulmadan, kaynak izi korunarak.
- Arama sonucu görünümü: her program için Türkçe, benzersiz başlık ve açıklama.
- Teknik: Lighthouse erişilebilirlik ≥ 95 (örnek program sayfasında bugün 90), kontrast hatası 0 (korunur), sunucu HTML'inde tüm görünür içerik, program sayfası HTML'i belirgin küçülmüş (bugün ~396 KB ham).
- İş: ön görüşme çağrısına tıklama ölçülebilir olmalı (bugün olay takibi yok).
- Guard'ların tamamı yeşil; görünür değişiklikler Kerem onaylı.

## 2. Mevcut durum

Sayfa anatomisi (sırayla): kırıntı (`DetailBreadcrumb`) → `ProgramPortraitHeader` (okul görseli `priority`, H1 program adı, okul + şehir) → `ProgramMetaStrip` (seviye, süre, dil) → "Okul bağlamı" → `ProgramAdmissionDetailsPanel` ("Kaynaklı kabul dosyası": resmî linkler, kampüs/derece sınıfı/kabul tipi/dil, 1. Başvuru takvimi, 2. Kabul koşulları, belgeler, belirsizlikler, URL bazlı kaynak izi) → `ConsultPrompt` → `ProgramDirectory` (okulun diğer programları) → `RelatedLinks` (aynı şehirdeki okullar, şehir rehberi, bölge bursu).

Dosyalar: `app/universities/[id]/departments/[deptSlug]/{layout,page}.tsx` (metadata, ISR, JSON-LD breadcrumb), `components/university-details/` (`DepartmentDetailClient.tsx` 266 satır, `ProgramAdmissionDetailsPanel.tsx` 943 satır, `programAdmissionPresentation.ts` 190 satır, `ProgramPortraitHeader`, `ProgramMetaStrip`, `ProgramDirectory`, `ProgramTransitionEntry`, `RelatedLinks`, `DetailBreadcrumb`), `lib/universities.server.ts` (`getUniversityById`), `lib/relatedLinks.ts`, `lib/admissionPresence.ts`, `lib/translations.ts` (`department.*`, `related.*`, `breadcrumb.*`, `consultPrompt.*`).

Veri gerçekleri (17 Eylül 2026): 1.008 program (758 yüksek lisans, 214 lisans, 28 tek devre); ~900 kabul dosyası; **108 programın dosyası yok** (69 lisans, 39 yüksek lisans; sayfada "detay yakında"). Dosya alan doluluğu: AB son tarih 871, AB dışı son tarih 882, derece sınıfı 867 (778'inde ayrıştırılabilir resmî kod; 124 kod 2+ okulda ortak), giriş sınavı 879 / 900. AB dışı son tarih metni uzunluğu: medyan 445, p90 1.271, en uzun 5.447 karakter; içerik İngilizce ve "Rounds: Round Name: …; Application Window: …" biçiminde ham.

Ölçüm bazları: GSC'de dizin isteği gönderilen iki program sayfası 28 günde 209 ve 77 gösterim aldı (yeniden taranan program sayfası hemen sonuçlara giriyor); production devtools throttling: gövde 1,0 sn, FCP 3,7 sn, LCP 4,7 sn (LCP öğesi okul görseli; font/CSS/JS bant yarışı site geneli ayrı iş); örnek program sayfası erişilebilirlik 90, kontrast hatası 0.

## 3. Bilinen sorunlar ve fırsatlar

A. **Ham kabul metinleri okunmuyor.** Takvim ve koşullar uzun İngilizce bloklar hâlinde. Öneri: mevcut metni bilgi kaybetmeden yapılandır (tur listesi, tarih satırları, madde işaretleri), üstte yapılandırılmış alanlardan "kısa özet" (son tarihler, kabul tipi, dil, sınav). Türkçeleştirme gerekiyorsa çalışma zamanında LLM **kullanma**; Kerem'in tercihi çevrim dışı toplu işlem (ham kayıt ayrı, LLM adımı ayrı). Uydurma yok; `[uncertain]` ve kaynak alıntıları korunur. Kabul: `npm run check:admission-dossier` yeşil, aynı bilgi daha az kaydırmayla bulunur.
B. **Meta başlık/açıklama İngilizce ve şablon.** Bugün: `"{Program} — {Okul} | ItalyPath"` ve `"Study … in …, Italy. Tuition: …"`. Öneri: Türkçe, benzersiz şablon (program, okul, şehir, seviye, dil; varsa son tarih/sınav gibi ayırt edici alan); dosyası olmayan programlarda boş vaat yok. `programmatic-seo` skill'inin şablon ve ince içerik kurallarını uygula. Kabul: 20 örnek sayfada başlık ≤ ~60, açıklama ~150 karakter, tekrar yok.
C. **`ExpandableText` aynı metni HTML'e iki kez yazıyor** (özet + açılmış hâl). Tek düğüme indir (CSS line-clamp + durum). HTML ağırlığı ve ekran okuyucu tekrarını azaltır.
D. **"Aynı alanda diğer üniversiteler" bloğu yok.** Resmî derece sınıfı kodu (`degree_class`, ör. LM-32) ile eşle; kodu olmayanlarda `lib/hub/recommendations.ts` `FIELD_KEYWORDS`. Sunucu HTML'inde, `RelatedLinks` içinde üçüncü bölüm; en fazla 6-8 link; dizin verisine `degree_class` eklemek gerekiyorsa yalnız kısa kodu ekle (ağır metin asla).
E. **Dosyası olmayan 108 program ince içerik riski.** Karar gerekli (§6): sayfayı faydalı kıl (okul bağlamı, resmî site, aynı alanda dosyalı programlar, ön görüşme) ya da dosya gelene kadar `noindex`/sitemap dışı. Varsayılan öneri: faydalı kıl, indeks kararını Kerem versin.
F. **Yapılandırılmış veri.** Breadcrumb var. `EducationalOccupationalProgram`/`Course` yalnızca sayfada görünen doğrulanmış alanlarla değerlendirilebilir; Rich Results Test ile doğrula. Düşük öncelik.
G. **Sayfa ağırlığı.** Ham HTML ~396 KB (RSC yükünde kabul verisi tekrarı). C maddesi ve client leaf'e geçen prop'ların budanması ile küçült. Görsel zaten `priority`; `sizes`/kalite ayarı ve kaynağın boyutu gözden geçirilebilir.
H. **Erişilebilirlik.** Panelde `details/summary`, küçük yazılar, link adları; `design:accessibility-review` ile tara. Site genelinde bilinen: bazı linklerde `aria-label` görünen metni içermiyor.
I. **Dönüşüm.** `ConsultPrompt` dosyanın altında tek noktada. `cro` skill'iyle yer/ifade gözden geçir; olay takibi ekle (Vercel Analytics `track`, ör. `consult_cta_click` + kaynak sayfa tipi). Sahte aciliyet, fiyat, uydurma sosyal kanıt yok (bkz. `AGENT_CONTEXT.md` ön görüşme kuralları).
J. **Egress yedek optimizasyonu (isteğe bağlı).** Program sayfası bugün okulun tüm kabul satırlarını çekiyor (90-180 KB). Yalnız kendi satırı + diğer programlar için varlık bilgisi yeterli; hedefli egress 5-10 kat düşer. Trafik büyürse yap.

## 4. Dokunulmaz kurallar

- Tasarım dili: editorial paper/sage/terracotta, serif başlık, keskin çerçeve; gradient/sparkle/indigo SaaS kalıbı yok. Terracotta **metin** `text-[var(--editorial-terracotta-ink)]`; base token yalnız buton/arka plan/çerçeve. Mobil zoom kilidi ürün kararıdır, dokunma.
- SEO: gizli metin yok; görünür içerik sunucu HTML'inde; `generateMetadata` server `layout.tsx`'te; kayıt yoksa gerçek 404.
- Veri/egress/ISR sözleşmesi: detay sayfası `getUniversityById`, liste yüzeyleri `getUniversitiesDirectory`; tam veri seti compose'u geri gelmez; tarayıcıya ağır kabul metni gitmez; detay leaf'leri `useUniversitiesData(initial, { fetchWhenInitial: false })`; ISR sayfalarında `revalidate` + boş `generateStaticParams()` korunur, sunucuda `searchParams`/`cookies()`/`headers()` okunmaz.
- **Sitemap tarihi:** program/üniversite şablonunun görünür içeriği değişirse `app/sitemap.ts` `PAGE_TEMPLATE_LAST_MODIFIED` sabitini o deploy tarihine çek ve Kerem'e sitemap'i yeniden göndermesini söyle.
- Çeviriler `lib/translations.ts` içinde TR/EN paralel; hard-code metin yok.
- Guard'lar: `npm run check:university-details-ui`, `check:admission-dossier`, `check:program-details`, `check:university-data-source`, `check:seo-vitals`, `node scripts/check-universities-server-compose.mjs`, `check:routes`, `npx tsc --noEmit`, değişen dosyalarda ESLint. Yeni sözleşme eklersen guard'a yaz.
- Supabase Free kota: mühlet 14 Ekim 2026, ikinci mühlet yok; egress'i artıracak değişiklikten kaçın, production'a karşı ölçümü seyrek tut.

## 5. Kullanılacak skill'ler

- Süreç: `superpowers:brainstorming` → `superpowers:writing-plans` → uygulama → `superpowers:verification-before-completion`.
- İçerik/SEO omurgası: `programmatic-seo` (şablon sayfa kalitesi, benzersiz değer, iç link), `seo-audit` (sayfa içi kontrol listesi), `schema` (F maddesi).
- Tasarım/okunabilirlik: `impeccable` (eleştir/denetle/cilala modları; **mevcut tasarım dili korunur** şartıyla), `minimalist-ui` (ölçülülük rehberi; kendi renk/fontlarını dayatmasına izin verme), `redesign-existing-projects` (denetim listesi), `design:accessibility-review`.
- Dönüşüm ve metin: `cro`, `copywriting` / `design:ux-copy` (Türkçe mikro metin).
- Kullanma: `design-taste-frontend` (açılış sayfaları için), video/animasyon/marka skill'leri.
- Skill'ler emir değil mercektir; bu brifteki kurallarla çelişirse brif kazanır.

## 6. Kerem'e sorulacak kararlar (brainstorming)

1. Öncelik sırası: önerilen A → B → C+G → D → E → I → H → F → J. Onaylıyor mu, neyi öne alır?
2. Kabul metinleri: İngilizce kalsın ama yapılandırılsın mı, yoksa Türkçe özet de istensin mi (çevrim dışı toplu işlemle)?
3. Dosyası olmayan 108 program: sayfayı zenginleştirip indekste mi tutalım, dosya gelene kadar indeks dışı mı?
4. Görsel değişim toleransı: panelin yerleşimi değişebilir mi, yalnız içerik düzeni mi?
5. Ön görüşme çağrısı sayfada ikinci bir noktada (ör. takvimin hemen altı) görünsün mü?

## 7. Doğrulama ve ölçüm protokolü

- Yerel üretim derlemesi (`npm run build` + `.claude/launch.json` `italypath-prod`), sunucu HTML'inde içerik kontrolü, headless Chrome ile uzun pencere ekran görüntüsü (detay sayfalarında sorunsuz; ana sayfada hero `svh` yüzünden işe yaramaz), Kerem'e önizleme.
- Lighthouse: kök neden/etki için `--throttling-method=devtools`; simüle modun "render delay" değeri yanıltıcıdır. Production'a karşı art arda en fazla 3-4 koşu, polling en az 60 sn aralıkla (Vercel otomatik challenge'ı tetiklenir). PSI API anonim kotası dolu olabilir.
- Deploy sonrası: production HTML'de yeni bloklar, `x-vercel-cache` (tarayıcı panelinden same-origin fetch ile okunur), bir hafta sonra GSC (gösterim/tıklama, tarama istatistikleri), Supabase Usage günlük egress (~30 MB bazı).
- Her turun kaydı `SEO_AUDIT.md`'ye yeni bölüm olarak yazılır.

## 8. Kapsam dışı

Font diyeti ve Clerk JS diyeti (site geneli hız işleri), şehir/bölge için gerçek adresli sayfalar, rehber içerik bölümü, üniversite liste sayfası, ana sayfa. Bunlar ayrı işlerdir; bu görevde dokunma, gerekirse Kerem'e öner.

## 9. Yeni ajana ilk mesaj (öneri)

"AGENT_CONTEXT.md, SEO_AUDIT.md (§19-22) ve docs/superpowers/briefs/2026-09-17-program-detail-pages-brief.md dosyalarını oku. Görevin program detay sayfalarını geliştirmek. Önce brifin 6. bölümündeki kararları bana sade Türkçe ve tek tek sor, sonra plan yap."
