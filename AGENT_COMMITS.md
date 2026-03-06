## 🛠️ Yapılan Değişiklikler (Bu Chat'te)

### Commit 1: `feat: AI Mentor streaming and memory logic completed`
| Dosya | Değişiklik |
|-------|------------|
| `app/api/chat/route.ts` | ❌ Eski: Tek mesaj gönderim, JSON yanıt → ✅ Yeni: `sendMessageStream`, full history, sistem promptu, ReadableStream yanıt |
| `app/ai-mentor/page.tsx` | ❌ Eski: `fetch` + `res.json()` bekleme → ✅ Yeni: Stream okuma, durdur butonu (AbortController), yazıyor animasyonu, aria-label'lar |

### Commit 2 (Favori Birleşik Hook):
| Dosya | Değişiklik |
|-------|------------|
| `lib/useFavorites.ts` | 🆕 Oluşturuldu: Birleşik favori hook'u (localStorage + Supabase) |
| `app/universities/page.tsx` | ♻️ localStorage lojiği → `useFavorites` hook'una geçildi |
| `app/universities/[id]/page.tsx` | ♻️ Supabase + Clerk direkt çağrıları → `useFavorites` hook'una geçildi, `any` cast kaldırıldı |
| `app/favorites/page.tsx` | ♻️ Supabase + Clerk direkt çağrıları → `useFavorites` hook'una geçildi, i18n eklendi |

### Commit 3 (Performans ve Güvenlik):
| Dosya | Değişiklik |
|-------|------------|
| `next.config.ts` | 🖼️ `images.remotePatterns` tanımlanarak Unsplash ve Pexels domainleri eklendi |
| `app/universities/page.tsx` | ⚡ `<Image>` component ve liste filtresi için `useMemo` optimizasyonları yapıldı |
| `app/universities/[id]/page.tsx` | ⚡ `<Image>` component eklendi, dış linke `rel="noopener noreferrer"` güvenlik açığı kapatıldı |
| `proxy.ts` | 🔓 `/universities(.*)` ve `/isee(.*)` rotaları public hale getirip i18n/arama indexlenmesi sağlandı |
| `app/template.tsx` | 🐛 Framer Motion `AnimatePresence` temelli sayfa "çift render" olma glitch hatası çözüldü |
| `app/globals.css` | 🌗 Bozuk Dark Mode ayarı silinerek tüm projenin sadece kusursuz Işık (Light) modunda çalışması zorunlu kılındı |
| `app/not-found.tsx` | 🧭 Next.js standartlarına uygun, çift dilli ve özel tasarımlı 404 Not Found sayfası eklendi |
| `app/page.tsx` | 🌍 Eksik i18n çevirileri (Belge Cüzdanı) eklendi ve Footer'daki ölü / boş link sızıntıları giderildi |
| `app/universities/[id]/layout.tsx` | 🔍 Server Component olarak oluşturulup dinamik SEO (`generateMetadata`) işlemi `use client` sayfasından ayrılarak build hatası (çatışması) ortadan kaldırıldı |
| `app/documents/page.tsx` | 🌍 Hard-coded Türkçe → i18n çevirilerine geçildi |
| `components/BottomNav.tsx` | 🌍 Hard-coded İngilizce label'lar → i18n çevirilerine geçildi |
| `lib/translations.ts` | ➕ `favorites`, `documents`, `bottomNav` çeviri blokları eklendi (TR + EN) |
| `types/index.ts` | 🧹 Kullanılmayan `University` ve `Message` interfaceleri kaldırıldı |
| `lib/gemini-service.ts` | 🗑️ Silindi (ölü kod, hiçbir yerden import edilmiyordu) |
| `datatemizyedek.ts` | 🗑️ Silindi (124KB yedek dosya) |
| `datayedek.ts` | 🗑️ Silindi (25KB yedek dosya) |

### Commit 4 (Modülerlik — Ana Sayfa):
| Dosya | Değişiklik |
|-------|------------|
| `app/page.tsx` | ♻️ 169 satırlık monolitik sayfa → küçük bir bileşen birleştirici haline getirildi (bugün ~18 satır) |
| `components/Navbar.tsx` | 🆕 Oluşturuldu: Masaüstü + mobil navigasyon, Clerk auth, dil geçiş butonu |
| `components/HeroSection.tsx` | 🆕 Oluşturuldu: Hero başlık, rozet ve birincil CTA butonu |
| `components/FeaturesSection.tsx` | 🆕 Oluşturuldu: Üniversiteler, AI Mentor ve Belge Cüzdanı 3'lü grid |
| `components/IseeSection.tsx` | 🆕 Oluşturuldu: ISEE hesaplayıcıya yönlendiren gradient CTA kartı |
| `components/Footer.tsx` | 🆕 Oluşturuldu: Alt bilgi logosu ve sosyal medya linkleri |

### Commit 5 (Güvenlik, SEO ve Erişilebilirlik):
| Dosya | Değişiklik |
|-------|------------|
| `app/documents/page.tsx` | 🔒 L145: Eksik `rel="noopener noreferrer"` eklendi (tabnabbing güvenlik açığı kapatıldı) |
| `package.json` | 🗑️ `katex` ve `@types/katex` kaldırıldı (3 paket silindi, kullanılmıyordu) |
| `app/error.tsx` | 🆕 Oluşturuldu: Çift dilli (TR/EN) Global Error Boundary |
| `app/sitemap.ts` | 🆕 Oluşturuldu: Tüm statik rotalar + 45 üniversite detay sayfası dahil |
| `app/robots.ts` | 🆕 Oluşturuldu: Public rotalar açık, seçili korumalı rotalar kapalı |
| `components/Navbar.tsx` | ♻️ `<nav aria-label>` ve her iki dil butonu için `aria-label` eklendi |
| `app/universities/page.tsx` | ♻️ Arama kutusu, dil butonu, favori filtre ve kart favori butonlarına `aria-label` + `aria-pressed` eklendi |
| `app/favorites/page.tsx` | ♻️ Geri dön linkine `aria-label` eklendi |
| `proxy.ts` | 🔓 `/sitemap.xml` ve `/robots.txt` public route listesine eklendi (Clerk redirect'e takılıyordu) |

### Commit 6 (Veri Genişletme — Yedek Merge):
| Dosya | Değişiklik |
|-------|------------|
| `app/data.ts` | 📊 `yedek` dosyasındaki 217 girişten bölüm verileri çekildi. 76 yeni bölüm mevcut 45 üniversiteye eklendi, 17 yeni üniversite oluşturuldu. Toplam: 62 üniversite, 262 bölüm (o commit anında 860 → 1180 satır). Replica ve geçersiz girişler (10 adet) atlandı. Tuscia duplicate tespit edilip düzeltildi. Sonraki güncellemelerle dosya bugün daha uzundur. |
| `yedek` | 📁 Universitaly scraping verisini içeren JSON kaynak dosyası (merge sonrası korundu) |

### Commit 7 (Bölüm Detay Sayfaları):
| Dosya | Değişiklik |
|-------|------------|
| `app/data.ts` | 🔄 `departments: string[]` → `departments: Department[]` (name + slug). 262 bölüme otomatik slug üretildi |
| `app/universities/[id]/departments/[deptSlug]/page.tsx` | 🆕 Bölüm detay sayfası (hero, üniversite bilgileri, diğer bölümler, AI CTA) |
| `app/universities/[id]/departments/[deptSlug]/layout.tsx` | 🆕 Bölüm SEO metadata (Server Component) |
| `app/universities/[id]/page.tsx` | ♻️ Tıklanabilir bölüm kartları eklendi (Link ile `/departments/{slug}` rotasına yönlendirme) |
| `app/universities/page.tsx` | ♻️ `dep` → `dep.name` olarak güncellendi |
| `app/api/chat/route.ts` | ♻️ `.join()` → `.map(d => d.name).join()` olarak güncellendi |
| `lib/translations.ts` | ➕ `department` çeviri bloğu eklendi (TR + EN, 7 anahtar) |
| `app/sitemap.ts` | ➕ ~262 bölüm URL'i eklendi |

### Commit 8 (Gelişmiş Filtreler + URL Sync):
| Dosya | Değişiklik |
|-------|-----------|
| `app/universities/page.tsx` | ➕ Şehir dropdown (46 şehir, sayılı: "Milano (5)"), Devlet/Özel toggle butonları, Temizle butonu, sonuç sayacı ("49 / 62"). `useState` → `useSearchParams` ile URL sync (`?city=Milano&type=Devlet&q=design&fav=1`). Filtreler sayfa yenilenmede korunur ve paylaşılabilir |

### Commit 9 (Premium Empty States):
| Dosya | Değişiklik |
|-------|-----------|
| `lib/translations.ts` | ➕ +16 yeni çeviri anahtarı (TR + EN): favorites (emptyTitle, emptySubtitle, emptyCta, emptyRecommendTitle), documents (emptyTitle, emptySubtitle, emptyStep1-4, emptyHint), aiMentor (promptsTitle, prompt1-4) |
| `app/favorites/page.tsx` | ♻️ Basit boş ekran → Gradient pulse kalp ikonu + Sparkles rozeti, başlık/alt yazı, gradient CTA butonu (`/universities`), 3 öneri kartı (PoliMi, Bologna, Bocconi) stagger animasyonlu |
| `app/documents/page.tsx` | ♻️ Basit boş ekran → Gradient FileText ikonu, 4 maddelik belge checklist'i (Pasaport, Transkript, Diploma, Dil Sertifikası) slide-in animasyonlu + amber ipucu kutusu ("Pasaportla başla!") |
| `app/ai-mentor/page.tsx` | ♻️ `handleSend` → yeniden kullanılabilir `sendPrompt` fonksiyonuna refactor. Welcome mesajının altına 4 tıklanabilir prompt chip'i eklendi (tıklayınca otomatik gönderim). Chip'ler sadece sohbet başlamadan görünür (`messages.length === 1`), stagger animasyonlu |

### Commit 10 (Scroll Progress Bar):
| Dosya | Değişiklik |
|-------|-----------|
| `components/ScrollProgress.tsx` | 🆕 Oluşturuldu: Framer Motion `useScroll` + `useSpring` ile fizik-bazlı scroll ilerleme çubuğu. 3px ince gradient (indigo→blue→sky), `z-50`, sayfa tepesindeyken otomatik gizlenir |
| `app/universities/[id]/page.tsx` | ➕ `<ScrollProgress />` eklendi |
| `app/universities/[id]/departments/[deptSlug]/page.tsx` | ➕ `<ScrollProgress />` eklendi |

### Commit 11 (Shared Element Transitions — View Transitions API):
| Dosya | Değişiklik |
|-------|-----------|
| `next.config.ts` | ➕ `experimental.viewTransition: true` — Next.js route değişikliklerini `document.startViewTransition()` ile sarar |
| `app/template.tsx` | ♻️ Framer Motion sayfa fade animasyonu kaldırıldı → passthrough. View Transitions API artık geçişleri natively yönetiyor |
| `app/globals.css` | ➕ View Transition CSS: sayfa geneli fade+slide (0.25-0.3s), paylaşılan elemanlar crossfade (0.35s), `::view-transition-old/new` pseudo elementleri |
| `app/universities/page.tsx` | ➕ Kart image container: `style={{ viewTransitionName: \`uni-hero-\${uni.id}\` }}`, başlık: `uni-title-{id}` |
| `app/universities/[id]/page.tsx` | ➕ Hero container: `viewTransitionName: uni-hero-{id}`, h1 başlık: `uni-title-{id}` — kart ile eşleşen morph geçişi |
| `Not` | ℹ️ Bu yaklaşım daha sonra Commit 14'te sadeleştirilip Framer Motion route transition modeline taşındı. |

### Commit 12 (Lint Stabilizasyonu — 0 Error/0 Warning):
| Dosya | Değişiklik |
|-------|-----------|
| `context/LanguageContext.tsx` | ♻️ `useEffect` içi senkron `setState` kaldırıldı; lazy initializer + güvenli `localStorage` okuması eklendi |
| `types/index.ts` | ➕ `UserDocument` interface'i eklendi |
| `app/documents/page.tsx` | ♻️ `any` kaldırıldı, `UserDocument` kullanıldı, `fetchDocs` dependency uyarısı kapatıldı, güvenli `unknown` hata yakalama eklendi |
| `app/universities/page.tsx` | ♻️ Unescaped quote (`"{searchTerm}"`) JSX-safe hale getirildi |
| `components/Footer.tsx` | ♻️ Geçici `/` sosyal linkleri non-clickable etiketlere çevrildi |
| `app/api/chat/route.ts` | ♻️ Kullanılmayan `err` değişkeni kaldırıldı |
| `app/favorites/page.tsx` | ♻️ Kalan `<img>` etiketi `next/image` ile değiştirildi |

### Commit 13 (Supabase Güvenlik Hardening — Clerk + RLS + Signed URL):
| Dosya | Değişiklik |
|-------|-----------|
| `lib/supabaseClient.ts` | ➕ `createClerkSupabaseClient()` eklendi (Supabase `accessToken` callback ile Clerk JWT entegrasyonu) |
| `lib/useFavorites.ts` | 🔐 Giriş yapmış kullanıcı favori sorguları Clerk `supabase` template token'ı ile çalışacak şekilde güncellendi |
| `app/documents/page.tsx` | 🔐 `getPublicUrl` kaldırıldı; `createSignedUrls` (10 dk) ile private bucket uyumlu görüntüleme akışı eklendi; DB'ye `file_url` olarak `storage_path` yazımı hizalandı |
| `types/index.ts` | ➕ `UserDocument.signed_url` opsiyonel alanı eklendi |
| `supabase/rls_hardening.sql` | 🆕 `favorites`, `user_documents`, `storage.objects` için RLS/policy hardening scripti eklendi |
| `SUPABASE_SECURITY_RUNBOOK.md` | 🆕 Dashboard adımlarını sadeleştiren operasyon runbook'u eklendi (reserved claim notları + `storage.objects owner` hatası için UI fallback rehberi ile güncellendi) |
| `Supabase Dashboard` | ✅ `documents` bucket private (`public=false`) yapıldı; `storage.objects` policy'leri yalnızca `authenticated` rolüne indirildi (SELECT/INSERT/UPDATE/DELETE 4 policy) |

### Commit 14 (Route Transition Stabilizasyonu — Framer Motion):
| Dosya | Değişiklik |
|-------|-----------|
| `components/RouteTransition.tsx` | 🆕 Oluşturuldu: `AnimatePresence + LayoutGroup` ile route seviyesinde fade/slide/scale/blur geçişi (reduced-motion fallback dahil) |
| `app/layout.tsx` | ➕ `<RouteTransition>{children}</RouteTransition>` entegre edildi; tüm sayfalar tek geçiş katmanından geçiyor |
| `app/template.tsx` | ♻️ Minimal passthrough olarak bırakıldı (çakışan animasyon katmanları kaldırıldı) |
| `app/universities/page.tsx` | ➕ Kart görseli ve başlığına `layoutId` eklendi (`uni-hero-{id}`, `uni-title-{id}`) |
| `app/universities/[id]/page.tsx` | ➕ Detay hero ve başlıkta eşleşen `layoutId` kullanılarak shared-element hissi güçlendirildi |
| `next.config.ts` | ♻️ `experimental.viewTransition` kaldırıldı; geçiş sorumluluğu tamamen Framer Motion'a alındı |

### Commit 15 (Tutarlılık, Doğrulama ve Erişilebilirlik):
| Dosya | Değişiklik |
|-------|-----------|
| `lib/useFavorites.ts` | ♻️ Auth değişiminde state sıfırlama sertleştirildi; `localStorage` verisi normalize edildi; Supabase `insert/delete` response `error` alanları kontrol edilip optimistic rollback güvenilir hale getirildi |
| `app/documents/page.tsx` | ♻️ İlk yükleme hataları yakalanır hale geldi; upload sırasında DB insert fail olursa storage cleanup eklenerek orphan object riski kapatıldı; delete akışında storage ve DB hata objeleri kontrol edilmeye başlandı |
| `app/api/chat/route.ts` | ♻️ `GEMINI_API_KEY` guard eklendi; JSON parse + `messages` şema doğrulaması, mesaj sayısı/uzunluk limiti ve kontrollü `400/503/500` yanıtları eklendi |
| `app/ai-mentor/page.tsx` | ♻️ Hard-coded AI Mentor UI string'leri çevirilere taşındı; welcome mesajı aktif dile göre yenilenir hale geldi; API hata mesajı JSON'dan okunarak kullanıcıya daha tutarlı gösterilir |
| `lib/translations.ts` | ➕ AI Mentor için `title`, `welcome`, `thinking`, `reset`, `inputPlaceholder`, `stop`, `send`, `error` anahtarları eklendi (TR + EN) |
| `app/layout.tsx` | ♻️ Kök `<html lang>` varsayılanı `tr` olarak düzeltildi; zoom kısıtları (`maximumScale: 1`, `userScalable: false`) native uygulama hissi için geri eklenip korunuyor |
| `context/LanguageContext.tsx` | ➕ Aktif dilin `document.documentElement.lang` ile senkronlanması eklendi |
| `proxy.ts` | 🔓 `/ai-mentor(.*)` public route listesine eklendi; sitemap ve CTA akışlarıyla auth boundary hizalandı |
| `app/robots.ts` | ➕ `/ai-mentor` robots allow listesine eklendi |
| `app/sitemap.ts` | ♻️ Volatile `lastModified: new Date()` alanları kaldırıldı; sitemap kayıtları artık değişken zaman damgaları üretmiyor |

### Commit 16 (Güvenlik Hardening & Performans İyileştirmeleri):
| Dosya | Değişiklik |
|-------|-----------|
| `proxy.ts` | 🔒 `/api/chat(.*)` public route listesinden çıkarılarak uç nokta sadece oturum açmış kullanıcılara özel hale getirildi (API cost/abuse önlemi) |
| `app/documents/page.tsx` | 🔒 Client-side 5MB boyut (size) ve MimeType (image/pdf) doğrulama limitleri eklenerek bucket/storage şişirme (depolama) tehlikesi kapatıldı |
| `lib/translations.ts` | ➕ `documents` objeleri altına (`fileSizeError`, `fileTypeError`) çevirileri TR ve EN için eklendi |

### Commit 17 (Font Optimizasyonu ve Build Fix):
| Dosya | Değişiklik |
|-------|-----------|
| `app/layout.tsx` | ⚡ `next/font/google` üzerinden `Geist` fetch işlemi kaldırılarak, CI/CD ve sandbox ortamlarındaki dış bağlantı kısıtlı build hatası/riski tamamen ortadan kaldırıldı |
| `app/globals.css` | 🗑️ Artık kullanılmayan `var(--font-geist-sans)` gibi font css-variable tanımları silindi |

### Commit 18 (Premium UI Polishing):
| Dosya | Değişiklik |
|-------|-----------|
| `components/RouteTransition.tsx` | ✨ Sayfa geçişleri `easeOut`/`linear` mekanizmasından daha pürüzsüz ve organik olan `spring` matematiğine taşındı |
| `app/universities/page.tsx` | ✨ Üniversite grid listesine içeriklerin bir saniye arayla aşağıdan kayarak aktığı `staggerChildren` animasyonu eklendi, hero görseli ve liste başlığının transitionı `spring` ağırlıklı yenilendi |
| `app/favorites/page.tsx` | ✨ Önerilen favoriler listesi için statik gecikmeli `duration` iptal edilip dinamik hesaplanan `spring` easing kullanıldı |
| `app/globals.css` | 🗑️ Artık kullanılmayan View Transitions API (`::view-transition-(*)`) legacy animasyon CSS seçicileri silindi |

### Commit 19 (Route Transition Refactor — Native Hissiyat):
| Dosya | Değişiklik |
|-------|-----------|
| `components/RouteTransition.tsx` | ♻️ Ağır `blur/scale` geçişleri kaldırıldı; hafif `opacity + y` akışına geçildi |
| `components/RouteTransition.tsx` | ♻️ `AnimatePresence mode="sync"` yerine `mode="popLayout"` kullanıldı (çift render/layout thrash etkisi azaltıldı) |

### Commit 20 (Üniversite Veri Katmanı Ayrıştırma):
| Dosya | Değişiklik |
|-------|-----------|
| `app/api/universities/route.ts` | 🆕 Üniversite verisini cache header'ları ile dönen public API endpoint eklendi |
| `lib/useUniversitiesData.ts` | 🆕 In-memory cache + request deduplication yapan client veri hook'u eklendi |
| `app/universities/page.tsx` | ♻️ `data.ts` client import'u kaldırıldı; veri kaynağı `useUniversitiesData` oldu |
| `app/favorites/page.tsx` | ♻️ `data.ts` client import'u kaldırıldı; veri kaynağı `useUniversitiesData` oldu |
| `app/universities/[id]/page.tsx` | ♻️ `data.ts` client import'u kaldırıldı; veri kaynağı `useUniversitiesData` oldu |
| `app/universities/[id]/departments/[deptSlug]/page.tsx` | ♻️ `data.ts` client import'u kaldırıldı; veri kaynağı `useUniversitiesData` oldu |
| `proxy.ts` | 🔓 `/api/universities(.*)` public route listesine eklendi |

### Commit 21 (Motion Accessibility + Scroll Stabilizasyonu):
| Dosya | Değişiklik |
|-------|-----------|
| `app/ai-mentor/page.tsx` | ♻️ Stream sırasında sürekli `smooth-scroll` yerine yeni mesajda `smooth`, chunk akışında `auto` davranışı eklendi |
| `components/BottomNav.tsx` | ♿ `useReducedMotion` entegrasyonu ile aktif ring pulse ve hover/tap ölçek animasyonları erişilebilir hale getirildi |
| `components/HeroSection.tsx` | ♿ `useReducedMotion` entegrasyonu ile blob/mouse-follow/ping/beam animasyonları azaltılmış harekete göre kapatıldı |
| `app/ai-mentor/page.tsx` | ♿ Typing indicator ve status pulse animasyonları reduced-motion modunda statik hale getirildi |
| `app/globals.css` | ♿ `@media (prefers-reduced-motion: reduce)` bloğu eklenerek CSS tabanlı infinite animasyonlar kapatıldı |

### Commit 22 (Transition Katman Tutarlılığı + Native Scroll):
| Dosya | Değişiklik |
|-------|-----------|
| `app/layout.tsx` | ♻️ `<BottomNav />`, `RouteTransition` içine alındı; sayfa geçişleri tek katmanda bütünleşti |
| `app/globals.css` | ♻️ `overscroll-behavior-y: none` kaldırıldı; doğal platform scroll/overscroll davranışı geri kazanıldı |

### Commit 23 (Magic UI Bento Arka Plan Animasyonları):
| Dosya | Değişiklik |
|-------|-----------|
| `components/ui/marquee.tsx` | 🆕 Magic UI yaklaşımıyla sonsuz yatay/dikey kayan içerik bileşeni eklendi (`repeat`, `duration`, `reverse`, `pauseOnHover`, reduced-motion fallback) |
| `components/ui/animated-list.tsx` | 🆕 Döngüsel bildirim/liste animasyonu eklendi (`AnimatePresence`, interval tabanlı sıralı akış, reduced-motion fallback) |
| `components/ui/border-beam.tsx` | 🆕 İlk sürüm border beam bileşeni eklendi (AI kart arka plan entegrasyonu için) |
| `components/FeaturesSection.tsx` | ♻️ Bento kartları dekoratif arka plan katmanlarıyla güncellendi: Üniversite kartına `Marquee`, Belge kartına `AnimatedList`, AI kartına `BorderBeam`; soft mask + pointer-events güvenliği eklendi |
| `lib/translations.ts` | ➕ Merkezi i18n yapısına `featureAnimations.marquee[]` ve `featureAnimations.docList[]` alanları eklendi (TR + EN) |
| `app/globals.css` | ➕ Yeni animasyon keyframe/utility sınıfları eklendi: `marquee-x`, `marquee-y`, `soft-beam-sweep`, `soft-fade-up`, `animate-marquee-x/y`, `mask-fade-horizontal/vertical`; reduced-motion kuralları genişletildi |

### Commit 24 (Border Beam Magic UI Birebir Düzeltme):
| Dosya | Değişiklik |
|-------|-----------|
| `components/ui/border-beam.tsx` | ♻️ Bileşen API'si Magic UI çizgisine taşındı: `size`, `duration`, `anchor`, `borderWidth`, `colorFrom`, `colorTo`, `delay`, `className`, `style`, `reverse`, `initialOffset`, `transition`; `opacity` prop'u kaldırıldı |
| `components/ui/border-beam.tsx` | ♻️ Implementasyon `motion + offsetPath(rect) + offsetDistance` ve mask compositing tekniğine geçirildi; reduced-motion modunda statik ama görünür beam davranışı eklendi |
| `components/FeaturesSection.tsx` | ♻️ AI Mentor kartında beam katman sırası düzeltildi (`z-index`); kullanım `duration={8}` ve `size={100}` olacak şekilde Magic UI demosuna yaklaştırıldı |

### Commit 25 (Border Beam İlk Açılış Donukluk Fix — CSS Motoru):
| Dosya | Değişiklik |
|-------|-----------|
| `components/ui/border-beam.tsx` | ♻️ Beam animasyonu Framer Motion'dan CSS keyframe (`border-beam`) motoruna taşındı; `offsetPath(rect)` tekniği korundu ve ilk mount/hydration anında donuk başlama sorunu hedeflenerek stabil başlangıç sağlandı |
| `components/ui/border-beam.tsx` | ♻️ `useReducedMotion` akışı netleştirildi (`null` fallback), reduced-motion modunda beam statik pozisyonda görünür bırakıldı |
| `components/ui/border-beam.tsx` | ♻️ Safari uyumluluğu için `WebkitMask*` ve `WebkitOffset*` stilleri güçlendirildi; `transition.duration/delay` değerleri backward-compat olarak CSS süresine yansıtıldı |
| `app/globals.css` | ➕ `.animate-border-beam` utility sınıfı eklendi; `@keyframes border-beam` içine `-webkit-offset-distance` satırları eklendi; reduced-motion bloğuna `animate-border-beam` dahil edildi |

### Commit 26 (Build Type Error Stabilizasyonu):
| Dosya | Değişiklik |
|-------|-----------|
| `components/FeaturesSection.tsx` | ♻️ Vercel TypeScript build hatası için `useReducedMotion()` çıktısı `boolean`'a normalize edildi (`const shouldReduceMotion = useReducedMotion() ?? false`) |
| `components/ui/border-beam.tsx` | ♻️ CSS değişken tipleri genişletildi (`WebkitOffsetPath/WebkitOffsetDistance`) ve `tsc` uyumluluğu güçlendirildi |

### Commit 27 (Hero CTA — Magic UI Pulsating Button):
| Dosya | Değişiklik |
|-------|-----------|
| `components/ui/pulsating-button.tsx` | 🆕 Magic UI dokümantasyonuna uyumlu `PulsatingButton` bileşeni eklendi (`pulseColor`, `duration`, `forwardRef`) |
| `components/HeroSection.tsx` | ♻️ Ana CTA (`Hemen Başla / Get Started`) yeni `PulsatingButton` ile değiştirildi; efekt yalnızca bu butona uygulandı |
| `app/globals.css` | ➕ `pulsating-button` keyframe'i, `--animate-pulsating-button` token'ı ve `.animate-pulsating-button` utility sınıfı eklendi; reduced-motion bloğuna dahil edildi |
| `lib/utils.ts` | 🆕 `cn()` yardımcı fonksiyonu eklendi (UI className birleştirme için) |

### Commit 28 (Agent Dokümantasyon Senkronu):
| Dosya | Değişiklik |
|-------|-----------|
| `AGENT_CONTEXT.md` | ♻️ Orta öncelik listesine AI Mentor için "girişsiz `Failed to fetch`" problemi netleştirildi; giriş yapıldığında çalıştığı notu eklendi |
| `AGENT_COMMITS.md` | ♻️ Son yapılan stabilizasyon ve CTA animasyon değişikliklerini kapsayan commit geçmişi agent dokümantasyonu ile hizalandı |

### Commit 29 (Auth Boundary Kuralı — AI Mentor Login Zorunlu):
| Dosya | Değişiklik |
|-------|-----------|
| `proxy.ts` | 🔒 `/ai-mentor(.*)` public route listesinden çıkarıldı; AI Mentor artık giriş gerektiriyor |
| `app/robots.ts` | ♻️ `/ai-mentor` allow listesinden çıkarılıp disallow listesine alındı |
| `app/sitemap.ts` | ♻️ `/ai-mentor` sitemap statik route listesinden kaldırıldı |
| `AGENT_CONTEXT.md` | ♻️ Public route listesi ve bilinen sorunlar bölümü yeni auth kuralına göre güncellendi |

### Commit 30 (Protected Link Redirect + Route Matrix Smoke Check):
| Dosya | Değişiklik |
|-------|-----------|
| `components/Navbar.tsx` | 🔐 AI Mentor menü linki signed-out kullanıcıda `/sign-in?redirect_url=/ai-mentor` olacak şekilde güncellendi |
| `components/BottomNav.tsx` | 🔐 Orta AI butonu signed-out kullanıcıda login redirect akışına bağlandı |
| `components/FeaturesSection.tsx` | 🔐 AI Mentor ve Belge Cüzdanı kartları signed-out kullanıcıda sırasıyla `/sign-in?redirect_url=/ai-mentor` ve `/sign-in?redirect_url=/documents` hedeflerine yönlendiriliyor |
| `app/universities/[id]/page.tsx` | 🔐 "Bu Okulu AI'ya Sor" CTA'sı signed-out kullanıcı için login redirect ile güncellendi |
| `app/universities/[id]/departments/[deptSlug]/page.tsx` | 🔐 "Bu Bölümü AI'ya Sor" CTA'sı signed-out kullanıcı için login redirect ile güncellendi |
| `scripts/check-route-access.mjs` | 🆕 `proxy.ts` public/protected route matrisini doğrulayan smoke check script'i eklendi |
| `package.json` | ➕ `check:routes` script'i eklendi (`node scripts/check-route-access.mjs`) |

### Commit 31 (Bento Grid API Birebir Entegrasyon Refactor):
| Dosya | Değişiklik |
|-------|-----------|
| `components/ui/bento-grid.tsx` | 🆕 Magic UI örneğiyle uyumlu `BentoGrid` ve `BentoCard` reusable bileşenleri eklendi (`features[]` tabanlı kullanım API'si) |
| `components/FeaturesSection.tsx` | ♻️ Manuel kart yerleşimi kaldırıldı; bölüm `features[] -> <BentoCard />` modeline taşındı ve mevcut Marquee / AnimatedList / BorderBeam arka planları yeni API ile entegre edildi |
