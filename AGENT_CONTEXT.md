# ItalyPath — Agent Context & Knowledge Base

> Bu dosya, projeyi anlayan bir AI agent tarafından oluşturulmuştur. Yeni agentler bu dosyayı okuyarak projenin mimarisini, yapılan değişiklikleri ve bilinen sorunları hızlıca kavrayabilir.

---

## 🎯 Proje Tanımı

İtalya'da eğitim almak isteyen Türk öğrenciler için **yapay zeka destekli rehber uygulaması**. Üniversite arama, AI mentörlük, belge yönetimi, ISEE burs hesaplayıcı ve favoriler gibi özellikler sunar. Mobil öncelikli tasarıma sahiptir; temel mobil web app metadata'sı mevcut olsa da tam PWA paketi (manifest + ikon seti) henüz tamamlanmamıştır.

---

## 🧰 Teknoloji Yığını

| Katman | Teknoloji | Sürüm |
|--------|-----------|-------|
| Framework | Next.js (App Router) | 16.1.6 |
| UI | React | 19.2.3 |
| Stil | Tailwind CSS | v4 |
| Animasyon | Framer Motion | 12.34.0 |
| İkonlar | Lucide React | 0.563.0 |
| Markdown | React Markdown | 10.1.0 |
| Auth | Clerk (`@clerk/nextjs`) | 6.37.3 |
| Veritabanı | Supabase (`@supabase/supabase-js`) | 2.95.3 |
| AI | Google Gemini (`@google/generative-ai`) | 0.24.1 |
| AI SDK | Vercel AI SDK (`ai`, `@ai-sdk/google`, `@ai-sdk/react`) | `ai` 6.0.78 / `@ai-sdk/google` 3.0.23 / `@ai-sdk/react` 3.0.80 |
| Dil | TypeScript | 5.x |

> ℹ️ **AI SDK Notu:** Bu paketler projede kurulu olsa da mevcut AI Mentor implementasyonu `@google/generative-ai` üzerinden native streaming kullanır. `@ai-sdk/react` içindeki `useChat` hook'u bu akışta kullanılmamaktadır.

---

## 📁 Proje Yapısı (Uygulama Odaklı Özet)

> Aşağıdaki ağaç repo'nun tam envanteri değil; mimariyi anlamak için kritik uygulama dosyalarını özetler.

```
italypath-main/
├── app/
│   ├── page.tsx                    # Ana sayfa (bileşen birleştirici — sadece import + render)
│   ├── layout.tsx                  # Root layout (Clerk, LanguageProvider, BottomNav)
│   ├── template.tsx                # Next.js template boundary (minimal passthrough)
│   ├── not-found.tsx               # Özel 404 Hata Sayfası
│   ├── error.tsx                   # Çift dilli Global Error Boundary
│   ├── sitemap.ts                  # Dinamik sitemap (statik rotalar + 62 üniversite + 262 bölüm)
│   ├── robots.ts                   # Robots.txt (seçili public rotalar açık, bazı korumalı rotalar kapalı)
│   ├── globals.css                 # Tailwind v4 + mobil PWA stilleri
│   ├── favicon.ico                 # Site ikonu
│   ├── data.ts                     # 62 üniversite, 262 bölüm verisi (1219 satır, ~69KB, Department[] objeler, çift dilli)
│   ├── ai-mentor/page.tsx          # AI sohbet arayüzü (streaming + durdur butonu + prompt chip önerileri)
│   ├── api/chat/route.ts           # AI backend (Gemini streaming + sohbet hafızası)
│   ├── universities/
│   │   ├── page.tsx                # Üniversite listesi (arama, şehir/tip filtreleri, URL sync, favoriler)
│   │   └── [id]/
│   │       ├── layout.tsx          # SEO (`generateMetadata`) için Server Component
│   │       ├── page.tsx            # Üniversite detay Ui (`use client`)
│   │       └── departments/
│   │           └── [deptSlug]/
│   │               ├── layout.tsx  # Bölüm SEO (`generateMetadata`) Server Component
│   │               └── page.tsx   # Bölüm detay UI (`use client`)
│   ├── documents/page.tsx          # Belge cüzdanı (Supabase Storage upload/delete + premium empty state)
│   ├── favorites/page.tsx          # Favori üniversiteler listesi (premium empty state + 3 öneri kartı)
│   └── isee/page.tsx               # ISEE burs hesaplayıcı (scala equivalente formülü)
├── components/
│   ├── BottomNav.tsx               # Mobil alt navigasyon (4 sekme, ortada AI butonu)
│   ├── Navbar.tsx                  # Üst navigasyon (masaüstü + mobil, Clerk auth, dil butonu)
│   ├── HeroSection.tsx             # Ana sayfa Hero bölümü (başlık, rozet, CTA)
│   ├── FeaturesSection.tsx         # Ana sayfa 3'lü özellik grid kartları
│   ├── IseeSection.tsx             # Ana sayfa ISEE hesaplayıcı CTA kartı
│   ├── RouteTransition.tsx         # Route geçiş katmanı (Framer Motion + shared layout)
│   ├── ScrollProgress.tsx          # Scroll ilerleme çubuğu (Framer Motion useScroll + useSpring)
│   └── Footer.tsx                  # Alt bilgi (logo, sosyal etiketler)
├── context/
│   └── LanguageContext.tsx          # TR/EN dil sistemi (Context + localStorage)
├── lib/
│   ├── supabaseClient.ts           # Supabase client (anon key)
│   ├── translations.ts             # Tüm UI çevirileri (TR + EN)
│   └── useFavorites.ts             # Birleşik favori hook'u (localStorage + Supabase)
├── types/
│   └── index.ts                    # Paylaşılan tipler (Language, UserDocument)
├── next.config.ts                  # Next.js yapılandırması (remotePatterns: Unsplash, Pexels, plus.unsplash.com)
├── proxy.ts                        # Clerk Request Boundary (Next.js 16 standardı)
├── SUPABASE_SECURITY_RUNBOOK.md    # Clerk + Supabase RLS adım adım operasyon rehberi
├── supabase/
│   └── rls_hardening.sql           # RLS + Storage policy hardening SQL scripti
└── public/                         # Varsayılan SVG'ler (file, globe, next, vercel, window)
```

---

## 🔑 Önemli Mimari Kararlar

### 1. Dil Sistemi (i18n)
- `context/LanguageContext.tsx` → React Context + `localStorage` ile dil tercihi saklanır
- `LanguageProvider`, aktif dili runtime'da `document.documentElement.lang` ile senkronlar
- `lib/translations.ts` → Tüm UI metinleri burada (navbar, hero, list, detail, isee, favorites, documents, bottomNav, department)
- Üniversite verileri (`data.ts`) → `description_en`, `features_en` opsiyonel alanları ile çift dilli
- Dil değiştirme: Navbar ve üniversite listesi gibi toggle sunan ekranlarda `toggleLanguage()` çağrılır

### 2. Favori Sistemi (`lib/useFavorites.ts`)
- **Misafir kullanıcı:** `localStorage` → `italyPathFavorites` key'i
- **Giriş yapmış kullanıcı:** Supabase `favorites` tablosu (`user_id`, `university_id`)
- Giriş yapmış kullanıcı istekleri Clerk `supabase` JWT template token'ı ile Supabase'e gider (`createClerkSupabaseClient`)
- Hook tüm sayfalarda aynı API sunar: `{ favorites, toggleFavorite, isFavorite, loading, isLoggedIn }`
- Auth durumu değiştiğinde state deterministik temizlenir; logout sonrası stale favori state'i bırakılmaz
- Optimistic update uygulanmış (UI anında güncellenir, Supabase response `error` dönerse geri alınır)

### 3. AI Mentor Streaming
- **Backend** (`api/chat/route.ts`): `@google/generative-ai` paketi ile `sendMessageStream` kullanılır
- Tüm mesaj geçmişi Gemini chat history olarak iletilir (sohbet hafızası)
- Sistem promptu: Üniversite veritabanından oluşturulan bağlam + mentör kişilik tanımı
- İstek gövdesi temel şema doğrulamasından geçer (`messages[]`, rol, boş olmayan içerik, adet/uzunluk sınırları)
- `GEMINI_API_KEY` yoksa kontrollü `503` döner; malformed body doğrudan `500` üretmez
- **Frontend** (`ai-mentor/page.tsx`): `fetch` + `ReadableStream` + `TextDecoder` ile chunk chunk okuma
- `AbortController` ile kullanıcı yanıtı yarıda kesebilir (kırmızı durdur butonu)
- Stream başlayana kadar zıplayan 3 nokta animasyonu gösterilir
- AI Mentor ekranındaki temel UI metinleri artık `lib/translations.ts` üzerinden dil uyumlu çalışır

### 4. Belge Cüzdanı
- Supabase Storage `documents` bucket'ına dosya yükleme
- Supabase `user_documents` tablosuna metadata yazma
- Kamera ile doğrudan tarama (`capture="environment"`) veya galeriden dosya seçme
- Clerk `user.id` ile kullanıcıya özel dosya yolu: `{userId}/{timestamp}.{ext}`
- Belge görüntüleme için kalıcı public URL yerine kısa ömürlü signed URL (`createSignedUrls`) kullanılır
- Upload akışında storage başarılı, DB insert başarısız olursa yüklenen obje cleanup edilir
- Silme akışında hem storage hem DB response hataları kontrol edilir; sessiz başarısızlık bırakılmaz

### 5. Clerk Request Boundary (proxy.ts)
- `proxy.ts` dosyasında tanımlı (Next.js 16 yeni Request Boundary standardı uyarınca).
- Public rotalar: `/`, `/ai-mentor(.*)`, `/api/chat(.*)`, `/sign-in(.*)`, `/sign-up(.*)`, `/universities(.*)`, `/isee(.*)`, `/sitemap.xml`, `/robots.txt`
- Diğer tüm rotalar `auth.protect()` ile korumalı

### 6. Bölüm Detay Sayfaları
- `data.ts`'teki `departments` alanı `Department[]` obje dizisidir (`{ name, slug }`).
- Slug alanları veri setinde hazır tutulur; mevcut veriler bölüm adlarından türetilmiş URL-safe slug'lar içerir. Aynı üniversite içinde benzersizdir.
- Rota: `/universities/[id]/departments/[deptSlug]`
- SEO: `layout.tsx` (Server Component) → dinamik `generateMetadata()` — `page.tsx` ile aynı klasörde
- Üniversite detay sayfasındaki bölüm kartları `Link` ile bu rotaya yönlendirilir

---

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
| `app/layout.tsx` | ♻️ `maximumScale` / `userScalable` kısıtları kaldırıldı; kök `<html lang>` varsayılanı `tr` olarak düzeltildi |
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

---

## ⚠️ Bilinen Sorunlar & Açık Öneriler

###  Orta Öncelik
1. **PWA eksikleri:** `public/manifest.webmanifest` ve uygulama ikonları (`192x192`, `512x512`) oluşturulmalı. Şu anda tasarım aşamasındadır. Dokunma.
2. **Tekrarlanan görseller:** `data.ts`'te yeni eklenen 17 üniversite ve id 30+ üniversitelerin çoğu aynı placeholder görseli kullanıyor.
3. **Üniversite Karşılaştırma:** 2-3 üniversiteyi yan yana kıyaslama (ücret, bölüm sayısı, şehir, özellikler). Mevcut `data.ts` yapısıyla yapılabilir, ek veri gerekmez. Favori sisteminden beslenebilir.
4. **Şehir Rehberi:** Her şehir için yaşam maliyeti, ulaşım, iklim, öğrenci nüfusu bilgisi. Şehir filtresi zaten mevcut — detay sayfası eklenebilir.
5. **Animasyon Polishing:** Route geçişleri artık Framer Motion ile çalışıyor, ama "ultra premium" his için easing/duration, kart hover ile page transition uyumu ve olası stagger akışları daha da rafine edilebilir.
6. **Build, dış ağa bağımlı Google font fetch nedeniyle kırılabiliyor**
   - `app/layout.tsx` `next/font/google` ile `Geist` ve `Geist Mono` çekiyor.
   - Bu turdaki `npm run build`, sandbox ağ kısıtı altında bu iki font fetch'i nedeniyle failed oldu.
   - İnternet erişimi olmayan CI/CD veya kısıtlı build ortamlarında üretim build'i kırılabilir.

### 🟢 Düşük Öncelik
1. **Legacy CSS temizlik:** `app/globals.css` içindeki eski View Transition selector'ları aktif akışta kullanılmıyor; fırsat olduğunda temizlenebilir.
2. **Supabase SSR:** `@supabase/ssr` paketi ile server/client ayrımı.
3. **Veri dosyası client bundle'a gereğinden fazla taşınıyor**
   - `app/data.ts` yaklaşık `68,685` byte ve birçok client component tarafından import ediliyor (`universities`, `favorites`, detail sayfaları).
   - Ölçek büyüdükçe ilk yükleme ve hydration maliyeti artacaktır.
   - Şu an kabul edilebilir, ancak veri büyüme trendi sürerse server-side veri katmanına taşınmalı.
### 🧠 Bilinmeyen / Sessiz Tehditler

- **Bundle creep:** veri dosyası büyüdükçe performans düşüşü bir anda değil, sessizce ve parça parça hissedilir; bu tip tehditler geç fark edilir.

---

## 🔐 Environment Değişkenleri

Dosya: `.env.local` (git'te yok, `.gitignore`'da)

| Değişken | Kullanım |
|----------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase proje URL'i |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonim API anahtarı |
| `GEMINI_API_KEY` | Google Gemini AI API anahtarı |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk yayın anahtarı |
| `CLERK_SECRET_KEY` | Clerk gizli anahtar |

---

## 🚀 Çalıştırma

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # Production build
npm run lint       # ESLint kontrolü
```

---

## 📌 Supabase Tablo Yapısı (Tahmin)

```sql
-- Favoriler
CREATE TABLE favorites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,          -- Clerk user ID
  university_id TEXT NOT NULL,     -- data.ts'teki university.id
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Belgeler
CREATE TABLE user_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  storage_path TEXT NOT NULL,      -- Supabase Storage path
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

> ⚠️ Bu tablo yapıları koddan tahmin edilmiştir. Gerçek şema Supabase Dashboard'dan doğrulanmalıdır.

---


## 🛑 STRICT AGENT GUIDELINES (AI'lar İçin Kesin Kurallar)

> **DİKKAT YENİ AGENT:** Aşağıdaki kurallar projenin bütünlüğünü korumak için yazılmıştır. Bu kuralları çiğnediğin an Next.js build'i kırılacaktır. Asla inisiyatif alıp bu kuralların dışına çıkma.

1. **Supabase TypeScript Kuralları**
   - Şu an projede `types/supabase.ts` (Database Generated Types) **YOKTUR**. `lib/supabaseClient.ts` düz JS tipleriyle çalışmaktadır. 
   - Yeni bir veritabanı sorgusu yazarken `any` kullanmaktan kaçın; `types/index.ts` içine spesifik interface yaz. Zamanı geldiğinde Supabase CLI ile type-generation işlemi yapılacaktır.

2. **Tailwind CSS v4 Standartları**
   - Bu projede **Tailwind v4** kullanılmaktadır. 
   - `tailwind.config.ts` veya `tailwind.config.js` dosyası **YOKTUR** ve oluşturulmamalıdır.
   - Tüm özel temalar, fontlar ve değişkenler sadece `app/globals.css` içinde `@theme` ve `:root` mantığıyla tanımlanır.

3. **React State Management & Hooks**
   - Küresel (Global) state için sadece **React Context** (`context/` klasörü) kullanılacaktır.
   - Redux, Zustand veya Jotai gibi dış kütüphaneler projeye eklenecek kadar karmaşık bir veri ağacı yoktur, KESİNLİKLE önermeyin.
   - Hook'lar `lib/` klasörü içinde toplanmalıdır (örneğin `useFavorites.ts`).

4. **Next.js 16 (App Router) Component Mimarisi**
   - `"use client"` direktifi sadece hook (useState, useEffect vb.), onClick veya tarayıcı API'si gerektiren en uç (yaprak) komponentlere eklenmelidir.
   - **Kritik Kural:** Dinamik Meta Verileri (`generateMetadata()`) KESİNLİKLE `"use client"` ibaresi olan sayfalarda barınamaz (Build hatası yaratır). SEO gerektiren her dinamik sayfa için mecburen aynı klasörde ayrı bir `layout.tsx` (Server Component) yaratılmalı ve SEO tarafı orada işlenmelidir. 
   - Detay sayfalarındaki asenkron veri çekme opsiyonları (`fetch`) mümkünse Server Component'lerde tutulmalıdır. 
   - Route güvenliği sadece `proxy.ts` (Clerk Request Boundary) ile sağlanır, eski tip `middleware.ts` oluşturulmayacaktır.

*(Bu dosyanın son sürümü Agent Antigravity tarafından v4 standartlarına uygun olarak mühürlenmiştir.)*
