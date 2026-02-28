# ItalyPath — Agent Context & Knowledge Base

> Bu dosya, projeyi anlayan bir AI agent tarafından oluşturulmuştur. Yeni agentler bu dosyayı okuyarak projenin mimarisini, yapılan değişiklikleri ve bilinen sorunları hızlıca kavrayabilir.

---

## 🎯 Proje Tanımı

İtalya'da eğitim almak isteyen Türk öğrenciler için **yapay zeka destekli rehber uygulaması**. Üniversite arama, AI mentörlük, belge yönetimi, ISEE burs hesaplayıcı ve favoriler gibi özellikler sunar. Mobil öncelikli (PWA-ready) tasarıma sahiptir.

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
| AI SDK | Vercel AI SDK (`ai`, `@ai-sdk/google`, `@ai-sdk/react`) | v6 (yeni API) |
| Dil | TypeScript | 5.x |

> ⚠️ **AI SDK v6 Uyarısı:** `@ai-sdk/react` v6'da `useChat` hook'u tamamen değişti. Eski `handleSubmit`, `handleInputChange`, `isLoading`, `input` property'leri artık yok. Yeni API: `sendMessage`, `status`, `UIMessage.parts`. Bu nedenle AI Mentor **native Google AI streaming** kullanılarak yazıldı, Vercel AI SDK'nın `useChat` hook'u kullanılmadı.

---

## 📁 Proje Yapısı

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
- `lib/translations.ts` → Tüm UI metinleri burada (navbar, hero, list, detail, isee, favorites, documents, bottomNav, department)
- Üniversite verileri (`data.ts`) → `description_en`, `features_en` opsiyonel alanları ile çift dilli
- Dil değiştirme: Navbar ve üniversite listesi gibi toggle sunan ekranlarda `toggleLanguage()` çağrılır

### 2. Favori Sistemi (`lib/useFavorites.ts`)
- **Misafir kullanıcı:** `localStorage` → `italyPathFavorites` key'i
- **Giriş yapmış kullanıcı:** Supabase `favorites` tablosu (`user_id`, `university_id`)
- Giriş yapmış kullanıcı istekleri Clerk `supabase` JWT template token'ı ile Supabase'e gider (`createClerkSupabaseClient`)
- Hook tüm sayfalarda aynı API sunar: `{ favorites, toggleFavorite, isFavorite, loading, isLoggedIn }`
- Optimistic update uygulanmış (UI anında güncellenir, hata olursa geri alınır)

### 3. AI Mentor Streaming
- **Backend** (`api/chat/route.ts`): `@google/generative-ai` paketi ile `sendMessageStream` kullanılır
- Tüm mesaj geçmişi Gemini chat history olarak iletilir (sohbet hafızası)
- Sistem promptu: Üniversite veritabanından oluşturulan bağlam + mentör kişilik tanımı
- **Frontend** (`ai-mentor/page.tsx`): `fetch` + `ReadableStream` + `TextDecoder` ile chunk chunk okuma
- `AbortController` ile kullanıcı yanıtı yarıda kesebilir (kırmızı durdur butonu)
- Stream başlayana kadar zıplayan 3 nokta animasyonu gösterilir

### 4. Belge Cüzdanı
- Supabase Storage `documents` bucket'ına dosya yükleme
- Supabase `user_documents` tablosuna metadata yazma
- Kamera ile doğrudan tarama (`capture="environment"`) veya galeriden dosya seçme
- Clerk `user.id` ile kullanıcıya özel dosya yolu: `{userId}/{timestamp}.{ext}`
- Belge görüntüleme için kalıcı public URL yerine kısa ömürlü signed URL (`createSignedUrls`) kullanılır

### 5. Clerk Request Boundary (proxy.ts)
- `proxy.ts` dosyasında tanımlı (Next.js 16 yeni Request Boundary standardı uyarınca).
- Public rotalar: `/`, `/api/chat`, `/sign-in`, `/sign-up`, `/universities(.*)`, `/isee(.*)`, `/sitemap.xml`, `/robots.txt`
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
| `app/page.tsx` | ♻️ 169 satırlık monolitik sayfa → 14 satırlık bileşen birleştirici haline getirildi |
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
| `app/data.ts` | 📊 `yedek` dosyasındaki 217 girişten bölüm verileri çekildi. 76 yeni bölüm mevcut 45 üniversiteye eklendi, 17 yeni üniversite oluşturuldu. Toplam: 62 üniversite, 262 bölüm (860 → 1180 satır). Replica ve geçersiz girişler (10 adet) atlandı. Tuscia duplicate tespit edilip düzeltildi. |
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

---

## ⚠️ Bilinen Sorunlar & Açık Öneriler

### 🚨 Yüksek Öncelik
1. **Public AI endpoint doğrudan maliyet/suistimal yüzeyi oluşturuyor**
   - `proxy.ts` içinde `/api/chat(.*)` public bırakılmış durumda.
   - `app/api/chat/route.ts` içinde auth, rate limit, payload boyutu, mesaj sayısı veya token sınırı yok.
   - Sonuç: herhangi bir anonim istemci bu endpoint'i sınırsız çağırıp Gemini maliyeti oluşturabilir; prompt injection değil, doğrudan **API bütçesi sömürüsü / DoS-by-cost** riski vardır.
2. **AI route request doğrulaması zayıf**
   - `app/api/chat/route.ts` içinde `messages` gövdesi şemasız okunuyor ve `messages[messages.length - 1].content` doğrudan kullanılıyor.
   - Bozuk veya kasıtlı malformed body, gereksiz 500 üretir; log şişmesi ve hata gürültüsü yaratır.
   - Bu, public endpoint olduğu için pratikte saldırı yüzeyini büyütür.

### 🟡 Orta Öncelik
1. **PWA eksikleri:** `public/manifest.webmanifest` ve uygulama ikonları (`192x192`, `512x512`) oluşturulmalı. Şu anda tasarım aşamasındadır. Dokunma.
2. **Tekrarlanan görseller:** `data.ts`'te yeni eklenen 17 üniversite ve id 30+ üniversitelerin çoğu aynı placeholder görseli kullanıyor.
3. **Üniversite Karşılaştırma:** 2-3 üniversiteyi yan yana kıyaslama (ücret, bölüm sayısı, şehir, özellikler). Mevcut `data.ts` yapısıyla yapılabilir, ek veri gerekmez. Favori sisteminden beslenebilir.
4. **Şehir Rehberi:** Her şehir için yaşam maliyeti, ulaşım, iklim, öğrenci nüfusu bilgisi. Şehir filtresi zaten mevcut — detay sayfası eklenebilir.
5. **Animasyon Polishing:** Route geçişleri artık Framer Motion ile çalışıyor, ama "ultra premium" his için easing/duration, kart hover ile page transition uyumu ve olası stagger akışları daha da rafine edilebilir.
6. **Favorites optimistic update akışı Supabase hata dönüşlerini kaçırıyor**
   - `lib/useFavorites.ts` içinde `insert()` ve `delete()` sonuçlarındaki `error` alanı kontrol edilmiyor; sadece `try/catch` var.
   - Supabase çoğu DB/RLS hatasını throw etmek yerine response içinde döndürdüğü için UI tarafı başarılı sanıp state'i yanlış bırakabilir.
   - Sonuç: favori kalbi ile gerçek veritabanı durumu sessizce ayrışabilir.
7. **Documents yükleme/silme akışında kısmi başarısızlıklar orphan data üretebilir**
   - `app/documents/page.tsx` yüklemede önce storage, sonra DB insert yapıyor; DB insert başarısız olursa yüklenen dosya geri temizlenmiyor.
   - Silmede storage silme ve DB silme çağrılarının hata objeleri kontrol edilmiyor.
   - Sonuç: orphan storage object, orphan DB row veya kullanıcıya yanlış "silindi" algısı oluşabilir.
8. **Sitemap ile auth boundary senkron değil**
   - `app/sitemap.ts` içinde `/ai-mentor` sitemap'e eklenmiş.
   - `proxy.ts` tarafında `/ai-mentor` public değil.
   - Sonuç: arama motorlarına ve crawler'lara giriş gerektiren rota ilan ediliyor; crawl bütçesi boşa gider, kalite sinyali düşer.
9. **Build, dış ağa bağımlı Google font fetch nedeniyle kırılabiliyor**
   - `app/layout.tsx` `next/font/google` ile `Geist` ve `Geist Mono` çekiyor.
   - Bu turdaki `npm run build`, sandbox ağ kısıtı altında bu iki font fetch'i nedeniyle failed oldu.
   - İnternet erişimi olmayan CI/CD veya kısıtlı build ortamlarında üretim build'i kırılabilir.
10. **Documents bucket için istemci tarafı doğrulama yetersiz**
    - `app/documents/page.tsx` sadece `accept` attribute'u kullanıyor; dosya tipi/boyutu için gerçek runtime kontrol yok.
    - Auth'lu bir kullanıcı developer tools veya custom client ile beklenmeyen içerik ve büyük dosya yükleyebilir.
    - RLS kullanıcı izolasyonunu sağlıyor, ama **storage maliyeti ve abuse** riskini çözmüyor.

### 🟢 Düşük Öncelik
1. **Legacy CSS temizlik:** `app/globals.css` içindeki eski View Transition selector'ları aktif akışta kullanılmıyor; fırsat olduğunda temizlenebilir.
2. **Supabase SSR:** `@supabase/ssr` paketi ile server/client ayrımı.
3. **Veri dosyası client bundle'a gereğinden fazla taşınıyor**
   - `app/data.ts` yaklaşık `68,685` byte ve birçok client component tarafından import ediliyor (`universities`, `favorites`, detail sayfaları).
   - Ölçek büyüdükçe ilk yükleme ve hydration maliyeti artacaktır.
   - Şu an kabul edilebilir, ancak veri büyüme trendi sürerse server-side veri katmanına taşınmalı.
4. **Erişilebilirlikte gereksiz kısıt var**
   - `app/layout.tsx` içinde `maximumScale: 1` ve `userScalable: false` ayarlı.
   - Bu, görme erişilebilirliği için negatif; mobil native hissi sağlasa da profesyonel erişilebilirlik standardını aşağı çeker.
5. **Dil durumu ile `<html lang>` senkron değil**
   - `app/layout.tsx` içinde `<html lang="en">` sabit.
   - Uygulama TR/EN switch ediyor ama document language güncellenmiyor.
   - SEO ve ekran okuyucu doğruluğu açısından eksik.
6. **Dokümantasyon drift'i mevcut**
   - Bu dosyanın teknoloji tablosunda AI SDK bölümü ile `package.json` birebir örtüşmüyor.
   - Kod gerçeği: `ai@6.0.78`, `@ai-sdk/react@3.0.80`, `@ai-sdk/google@3.0.23`.
   - Yeni agent'ların yanlış varsayım üretmemesi için bu fark göz önünde bulundurulmalı.

### 🧠 Bilinmeyen / Sessiz Tehditler

- **Cost amplification:** bugün görünmeyen ama en gerçek tehdit, AI endpoint'in anonim ve limitsiz kalmasıdır. Trafik artana kadar fark edilmeyebilir; fatura geldiğinde görünür olur.
- **Storage creep:** upload ve delete akışındaki kısmi hata senaryoları zaman içinde sessiz veri artığı ve maliyet oluşturabilir.
- **SEO trust erosion:** auth gerektiren rotaların sitemap/robots gibi açık sinyallerle karışması, zamanla indeks kalitesi ve crawl verimliliğini düşürür.
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
