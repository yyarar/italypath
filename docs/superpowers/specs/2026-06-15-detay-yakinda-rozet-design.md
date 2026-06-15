# "Detay Yakında" Rozeti ve Boş Durum

**Tarih:** 2026-06-15
**Durum:** Tasarım onaylandı, implementasyon planı bekleniyor
**Sahip:** Kerem (PO)
**Tetik:** iOS (Swift) sürümünde mevcut "Detay yakında" davranışını web'e taşımak.

---

## 1. Sorun

Üniversite detay sayfasındaki program listesinde, henüz `program_admission_details` satırı eklenmemiş programlar bugünkü web sürümünde diğerleriyle aynı görünür: terracotta ok, aynı tipografi, aynı tıklama davranışı. Kullanıcı tıklayınca açılan program sayfasında ise admission paneli yerine sessiz bir boşluk oluşur — sayfa "yarım" hisseder.

iOS sürümü bu sorunu liste seviyesinde "Detay yakında" rozetiyle çözer; web'de eşdeğeri yok.

## 2. Amaç

Web sürümünde:

- Programın admission detayı henüz girilmemişse listede o satırı **"Detay yakında"** rozetiyle işaretle.
- Kullanıcı yine de tıklayabilsin; program detay sayfasında — admission paneli yerine — kısa, kibar bir "Kabul detayları yakında" boş durum kartı görünsün.
- Veri ekibi `program_admission_details` satırını eklediği anda hem rozet hem boş durum kendi kendine kalksın; ek bir bayrak/yayın akışı gerekmesin.

## 3. Kapsam Dışı

- iOS'taki numaralı satır prefix'i (1, 2, 3…) ve "Lisans · 3 Yıl" alt satırı — bunlar ayrı bir tasarım kararı; bu iş onları içermez.
- Detayı yok satırlarını listenin altına ayrı bir grup olarak ayırmak.
- `program_admission_details` veri girişi yapmak / eksik programları doldurmak.
- iOS'taki agresif soluk (gri) satır görünümü; web'de rozet tek başına yeterli sinyal.

## 4. Belirleyici Koşul

**Tek kaynak:** `Department.admissionDetails` alanı.

- Boşsa (`undefined` / `null`) → "Detay yakında" durumu.
- Doluysa → mevcut davranış (ok + admission paneli).

`app/data.ts`, `types/index.ts`, Supabase şeması, `lib/universities.server.ts` değişmez. Yeni bir bayrak alanı, manuel override veya ayrı bir flag tablosu eklenmez.

## 5. Bileşen ve Veri Akışı

### 5.1 Liste satırı — `components/university-details/ProgramTransitionEntry.tsx`

- Mevcut sağdaki `<ArrowRight />` ikonu, `department.admissionDetails` doluysa render edilir.
- `admissionDetails` boşsa onun yerine **"Detay yakında"** rozeti gelir:
  - Editorial palet: `bg-[var(--editorial-paper)]`, `border border-[var(--editorial-border)]`, `text-[var(--editorial-muted)]`.
  - `text-[11px] font-bold uppercase tracking-[0.14em]` (üniversite kartlarındaki diğer mini etiketlerle uyumlu).
  - `rounded-full px-3 py-1` — pill formu.
  - Hover state değişmez; satır yine `hover:bg-[var(--editorial-paper)]`.
  - Sage/terracotta kullanılmaz; rozet "sessiz bir not" hissi verir, CTA değildir.
- Buton `disabled` olmaz; tıklama akışı korunur.

### 5.2 Boş durum kartı — `components/university-details/ComingSoonNotice.tsx` (yeni)

- Saf sunum bileşeni. Props: `title: string`, `body: string`.
- `ProgramAdmissionDetailsPanel`'in görsel diliyle uyumlu: editorial border + paper arka plan, serif başlık + muted gövde.
- Bir satır başlık (`font-serif text-2xl`), bir paragraf gövde (`text-sm leading-relaxed text-[var(--editorial-muted)]`).
- İkon/illüstrasyon yok; sade tipografi.

### 5.3 Detay sayfası — `app/universities/[id]/departments/[deptSlug]/page.tsx`

Mevcut:

```
{department.admissionDetails ? (
  <ProgramAdmissionDetailsPanel details={department.admissionDetails} ... />
) : null}
```

Değişiklik:

```
{department.admissionDetails ? (
  <ProgramAdmissionDetailsPanel details={department.admissionDetails} ... />
) : (
  <ComingSoonNotice
    title={t.department.detailsComingSoonTitle}
    body={t.department.detailsComingSoonBody}
  />
)}
```

Sayfanın diğer parçaları (ProgramPortraitHeader, ProgramMetaStrip, DetailMentorPrompt, vb.) aynen kalır.

## 6. Çeviri Anahtarları

`lib/translations.ts` içine üç yeni metin (TR + EN paralel):

| Anahtar | TR | EN |
|---|---|---|
| `programDirectory.detailComingSoon` | `Detay yakında` | `Details coming soon` |
| `department.detailsComingSoonTitle` | `Kabul detayları yakında` | `Admission details coming soon` |
| `department.detailsComingSoonBody` | `Bu programın resmi başvuru bilgileri eklendikçe burada görünecek. Şimdilik üstteki temel bilgileri kullanabilirsin.` | `Official admission information for this program will appear here as it is added. For now, you can rely on the basics above.` |

Hard-code metin yok; mevcut çeviri yapısına uyumlu.

## 7. Erişilebilirlik

- Rozet metni statik (`<span>`); ekran okuyucu doğrudan okur. `aria-label` gerekmez.
- Buton `disabled` olmadığı için klavye odağı ve tıklama davranışı korunur.
- Renkler editorial palette içinden — kontrast oranları zaten validated (`check:editorial-ui`).

## 8. Veri / API / Auth Etkisi

Yok.

- Supabase şema değişikliği yok.
- `getUniversitiesData()` zaten `admissionDetails` alanını dolduruyor; ek alan eklenmiyor.
- `proxy.ts` rotaları, Clerk, `/api/universities` etkilenmiyor.
- AI Mentor system prompt boyutu etkilenmiyor.

## 9. Test ve Doğrulama

Mevcut script'ler değiştirilmez. Kapsam küçük olduğu için yeni script eklenmez.

Manuel kontrol:

1. `npm run lint` ve `npm run build` temiz.
2. `/universities/[id]` sayfasında: hem `admissionDetails` dolu (örn. Bocconi'de bilinen bir program) hem boş (henüz import edilmemiş bir program) olan üniversiteye gir; iki satır türünün de doğru render edildiğini gör.
3. `/universities/[id]/departments/[deptSlug]` sayfasında: boş olan programın sayfasında "Kabul detayları yakında" kartının panelin yerini aldığını gör.
4. Mobil viewport (375px) ve desktop'ta liste rozet görünümünü kontrol et — pill taşmamalı, uzun program adında satır kırılmamalı.
5. Dil değiştir (TR↔EN); üç metin de güncelleniyor.

## 10. Geri Alma

Yeni dosya `ComingSoonNotice.tsx` ve üç çeviri anahtarı silinir; `ProgramTransitionEntry.tsx` ve department sayfasındaki üç-satırlık değişiklik geri alınır. Veri tarafında hiçbir kalıntı bırakmaz.

## 11. Açık Noktalar

Yok. Implementasyon planına geçilebilir.
