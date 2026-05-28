# Program Deadline Scraping & Storage

**Tarih:** 2026-05-27
**Durum:** Brainstorming onaylandı, implementation plan'a hazır
**Sahip:** Kerem Yarar (product owner) + Claude (implementer)

---

## Özet (Plain Turkish — Kerem için)

ItalyPath veritabanındaki **top 10-15 popüler İtalyan üniversitesinin bölümleri** için **non-EU başvuru deadline** bilgisini internetten çekeceğiz.

**Her bölüm için 3 bilgi saklanacak:**
1. **Deadline tarihi** (örn. "15 Mayıs 2027", veya "rolling" / "henüz açıklanmadı")
2. **Opsiyonel not** (örn. "erken başvuru 11 Haziran'da kapanır")
3. **Kaynak URL'i** (verinin çekildiği sayfa — sonradan doğrulama için)

**Plus**: tüm dataset için tek bir "En son kontrol: 2026-05-27" etiketi.

**Nasıl çekilecek (scrape ve extraction AYRI):**

1. **Scrape script** (otomatik): Chrome browsing skill ile her admission sayfasını ziyaret eder, sayfanın temizlenmiş içeriğini **markdown olarak bir klasöre kaydeder** (her URL için 1 dosya). LLM çağrısı YOK — script "dumb" ve hızlı.
2. **LLM extraction** (Kerem tarafından, script dışında): Kerem o klasördeki tüm dosyaları toptan bir LLM'e (Gemini, Claude, veya daha iyi bir şey) yedirir, deadline'ları yapılandırılmış JSON olarak çıkarır. Burada Kerem prompt'u ve LLM'i kendisi seçer.
3. **Apply script** (otomatik): O JSON dosyasını okur, `app/data.ts`'e işler.

**Avantaj:** Scrape (yavaş, browser gerektirir) ile extraction (LLM, prompt iteration gerektirir) birbirinden bağımsız. Daha iyi LLM çıkarsa veya prompt iyileştirilirse sadece adım 2 yeniden çalıştırılır, scrape tekrar yapılmaz.

**Sıklık:** One-shot (bir kerelik). Gelecek senelerde yeniden çalıştırılabilir.

**UI'ye nasıl yansır:** Bu spec'in dışında — ayrı bir iş olarak ele alınacak.

---

## Hedef Kitle & Kullanım

- **Audience:** Non-EU (Türk) öğrenci, çoğunlukla English-taught program hedefliyor
- **Birincil use case:** Program detay sayfasında "Son başvuru: 15 May 2027" gibi bir satır gösterilmesi (UI ayrı spec'te)
- **Kapsam dışı:** EU/İtalyan vatandaşı deadline'ları, vize/Universitaly tarihleri, dokuman teslim takvimleri

---

## Veri Modeli

### Yeni tip: `ProgramDeadline`

Dosya: `app/data.ts`

```ts
export interface ProgramDeadline {
  date: string;       // ISO format ("2027-05-15") | "rolling" | "TBA"
  note?: string;      // serbest metin, örn: "Erken admission 11 Haz; regular Oct'a kadar"
  sourceUrl: string;  // verinin çekildiği URL (provenance)
}
```

**Neden `date: string` (Date değil):** "rolling" / "TBA" gibi non-date değerleri taşıyabilmek için. Strict tarih validation runtime'da değil, separate guard script'inde yapılır.

### Yeni override map

Mevcut `DEPARTMENT_LANGUAGE_OVERRIDES` / `DEPARTMENT_DURATION_OVERRIDES` / `DEPARTMENT_LEVEL_OVERRIDES` pattern'i ile aynı:

```ts
export const DEPARTMENT_DEADLINE_OVERRIDES: Partial<Record<DepartmentKey, ProgramDeadline>> = {
  "1:civil-engineering": {
    date: "2027-06-11",
    note: "Early admission round; regular ends Oct 2027",
    sourceUrl: "https://www.polimi.it/en/.../deadlines",
  },
  "1:architectural-design": { /* ... */ },
  // ~50-80 entry, key alfabetik sıralı (mevcut pattern ile uyumlu)
};
```

### Dataset-level constant

```ts
export const DEPARTMENT_DEADLINES_LAST_CHECKED_AT = "2026-05-27" as const;
```

Tüm dataset için tek tarih. Per-entry "lastChecked" tutmuyoruz — Kerem'in kararı: scrape tek-shot yapılıyor, tarih bilinçli olarak ortak.

### `Department` interface'e ek

```ts
export interface Department {
  // ... existing: name, slug, languages, durationYears, level
  deadline?: ProgramDeadline;  // undefined = bilinmiyor / scrape edilmedi
}
```

### `withDepartmentMetadata()` patch'i

```ts
return {
  ...department,
  languages: [...languages],
  durationYears: department.durationYears ?? DEPARTMENT_DURATION_OVERRIDES[departmentKey] ?? DEFAULT_DEPARTMENT_DURATION_YEARS,
  level: department.level ?? DEPARTMENT_LEVEL_OVERRIDES[departmentKey] ?? DEFAULT_DEPARTMENT_LEVEL,
  deadline: DEPARTMENT_DEADLINE_OVERRIDES[departmentKey],  // undefined ok
};
```

Default davranış: deadline yoksa `undefined`. UI'da render olmaz (out of scope).

---

## Curated Target Üniversiteler

İlk pass için 15 üniversite. Kerem son listeyi onaylar:

| Pos | ID | Üniversite | Şehir | Tip | Neden listede |
|-----|-----|------------|-------|-----|---------------|
| 1   | 1  | Politecnico di Milano | Milano | Devlet | QS #1 IT, mühendislik/mimarlık |
| 2   | 2  | Sapienza University of Rome | Roma | Devlet | En büyük IT uni |
| 3   | 3  | University of Bologna | Bologna | Devlet | Dünyanın en eskisi |
| 4   | 4  | Politecnico di Torino | Torino | Devlet | Mühendislik |
| 5   | 7  | Bocconi University | Milano | Özel | Avrupa #1 economics |
| 6   | 8  | Università Cattolica del Sacro Cuore | Milano | Özel | Popüler özel |
| 7   | -  | Università degli Studi di Milano (La Statale) | Milano | Devlet | TBD: data.ts'te mevcut mu? |
| 8   | -  | Università di Padova | Padova | Devlet | Eski, kapsamlı |
| 9   | -  | Università di Pisa | Pisa | Devlet | Bilim/mühendislik |
| 10  | -  | Università di Firenze | Firenze | Devlet | Sosyal bilimler |
| 11  | -  | Università di Trento | Trento | Devlet | Innovation focus |
| 12  | -  | Università di Pavia | Pavia | Devlet | Medicine |
| 13  | -  | Roma Tor Vergata | Roma | Devlet | Economics, engineering |
| 14  | -  | Università di Torino | Torino | Devlet | Comprehensive |
| 15  | -  | Università di Verona | Verona | Devlet | Medicine, business |

**TODO (implementation aşamasında):** `app/data.ts`'ten her bir uni'nin gerçek `id`'sini doğrula. Listede olmayanlar için Kerem onayı veya farklı uni önerisi.

---

## Scrape Pipeline (Approach C: Chrome browsing skill, **iki ayrı aşama**)

### Step 1 — Curated targets dosyası

Dosya: `lib/deadlines/targets.ts`

```ts
export interface DeadlineTarget {
  universityId: number;
  admissionUrls: {
    cycle: "bachelor" | "master" | "both";
    url: string;
    appliesToSlugs?: string[];  // bazı uni'lerde program-specific URL
  }[];
}

export const DEADLINE_TARGETS: DeadlineTarget[] = [
  // {
  //   universityId: 1,
  //   admissionUrls: [
  //     { cycle: "bachelor", url: "https://www.polimi.it/.../bachelor-deadlines" },
  //     { cycle: "master", url: "https://www.polimi.it/.../master-deadlines" },
  //   ],
  // },
  // ...
];
```

İlk pass'te her uni için 1-2 URL. Curated by Claude during implementation, reviewed by Kerem before scrape başlar.

### Step 2 — Scrape script (dumb, içerik kaydedici)

Dosya: `scripts/scrape-deadlines.mjs`

**Tek sorumluluk:** Sayfayı ziyaret et, temizlenmiş içeriği bir markdown dosyasına kaydet. LLM çağrısı YOK.

**Akış:**
1. `DEADLINE_TARGETS` listesini oku
2. Her target için, her URL için:
   - `mcp__plugin_superpowers-chrome_chrome__use_browser` ile sayfayı aç
   - Cookie banner / nav / footer hariç ana içerik bölümünü extract et
   - Markdown formatında temizle (header'lar, list'ler, paragraf'lar korunsun)
   - Dosyaya yaz: `tmp/scraped/{universityId}-{cycle}-{shortSlug}.md`
3. Resumable: zaten kaydedilmiş dosyaları atla (file-level checkpoint)
4. Rate-limit: aynı domain'e art arda çağrı yapma (1-2 sn delay)
5. Skip-if-failed: bir URL fail olursa hata logla, devam et

**Her kaydedilen dosyanın formatı:**

```markdown
---
universityId: 1
cycle: bachelor
sourceUrl: https://www.polimi.it/en/.../deadlines
scrapedAt: 2026-05-27T14:32:15Z
---

# Politecnico di Milano — Bachelor Admission Deadlines

(... sayfanın markdown-temiz hali ...)
```

**Çıktı klasörü:** `tmp/scraped/` — her uni × cycle için 1 dosya, ~20-30 dosya toplamda.

### Step 3 — LLM extraction (Kerem tarafından, script dışında)

Bu adım otomatik DEĞİL — Kerem'in elinde:

1. Kerem `tmp/scraped/` klasörüne bakar
2. Tüm markdown dosyalarını topluca bir LLM'e (Gemini, Claude, ChatGPT, vs.) yedirir
3. Şuna benzer bir prompt verir (örnek; Kerem isterse değiştirir):
   > "Bu klasördeki her dosya bir Italyan üniversitesi admission sayfası. Her dosyadan **non-EU başvuru son tarihini** çıkar. Şu JSON formatında bir array dön: `[{ universityId, departmentSlug?, date: 'YYYY-MM-DD'|'rolling'|'TBA', note: '...', sourceUrl, confidence: 'high'|'medium'|'low' }]`. Bir dosyada birden fazla program varsa her biri için entry üret. Belirsizse 'TBA' ve confidence: 'low'."
4. LLM çıktısını `tmp/deadlines-extracted.json` dosyasına kaydeder
5. Düşük-confidence entry'leri elden geçirir

**Convenience:** Claude implementation aşamasında bir `extraction-prompt-template.md` dosyası üretir → Kerem o template'i alır, LLM'e atar. Prompt iteration zaman içinde iyileştirilir.

**Neden ayrı:** Daha iyi bir LLM çıkarsa veya prompt iyileştirilirse Kerem step 2'yi tekrar çalıştırmaz (Chrome browser zahmet, dakikalar). Sadece extraction yeniden yapılır.

### Step 4 — Apply script

Dosya: `scripts/apply-deadlines.mjs`

1. `tmp/deadlines-extracted.json` dosyasını oku (Kerem'in onaylamış olduğu hali)
2. `app/data.ts` içinde `DEPARTMENT_DEADLINE_OVERRIDES` map'ini üret/güncelle
3. Key sırası alfabetik (mevcut override pattern ile uyumlu)
4. `DEPARTMENT_DEADLINES_LAST_CHECKED_AT`'i scrape tarihine güncelle
5. Çıktıyı `app/data.ts`'e idempotent şekilde yaz (mevcut entry'leri korur, yeni olanları ekler)

### Step 5 — Verification

- **TypeScript build:** `npm run build` geçer
- **Yeni guard script:** `scripts/check-deadlines.mjs` (npm: `check:deadlines`):
  - Her override key (`{id}:{slug}`) gerçek bir university+department'a karşılık geliyor mu
  - `date` ISO ya da "rolling"/"TBA" mı
  - `sourceUrl` HTTPS mi
  - `note` boş string değil mi (varsa)
- **package.json:** `"check:deadlines": "node scripts/check-deadlines.mjs"`
- **CI'ya entegre:** Mevcut `npm run check:*` pattern'i ile aynı (örn. check:cities, check:routes)

---

## Riskler & Mitigations

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Sayfa yapısı değişir, scrape bozulur | Yüksek (zamanla) | Source URL kaydedildi, manuel re-scrape mümkün. One-shot olduğu için sürekli bakım yok |
| LLM yanlış extract eder | Orta | Scrape ve extraction ayrı — Kerem prompt'u iterate edebilir, scrape tekrar gerekmez. Düşük-confidence işaretleme |
| Bazı uni'lerin deadline'ı yayınlanmamış | Yüksek (mayıs sonu) | "TBA" değeri destekli, gerçeği yansıtır |
| Chrome browser instabil | Düşük | Skip-if-failed + manuel fallback |
| Cookie banner extraction'ı bozar | Orta | Main content selector ile sınırlı extract; banner content'i ignore edilir |
| Yanlış sayfaya gidilir (curated URL hatalı) | Orta | Kerem implementation öncesi URL listesini onaylar |
| Rate-limit / IP block | Düşük | 1-2 sn delay, ~30 sayfa toplam scrape (15 uni × ~2 URL) |

---

## Out of Scope

- **UI render:** Program detail page'inde "Son başvuru: 15 May 2027" satırı → ayrı spec
- **Translations:** TR/EN deadline string formatting → ayrı spec
- **Notifications/Alerts:** "Deadline yaklaştı" maili → ayrı spec
- **EU deadline'ları:** Sadece non-EU
- **Vize/Universitaly tarihleri:** Sadece üniversite admission
- **Otomatik refresh:** Bu spec one-shot; future spec cron/scheduled refresh ekleyebilir

---

## Implementation Files

| Tür | Yol | Açıklama |
|-----|-----|----------|
| Modify | `app/data.ts` | `ProgramDeadline` tipi + `DEPARTMENT_DEADLINE_OVERRIDES` + dataset constant + `withDepartmentMetadata()` patch |
| New | `lib/deadlines/targets.ts` | Curated 15-uni URL listesi |
| New | `scripts/scrape-deadlines.mjs` | "Dumb" scrape: Chrome browsing → markdown content kaydet. LLM çağrısı YOK. |
| New | `docs/superpowers/specs/extraction-prompt-template.md` | Kerem'in elle LLM'e atacağı prompt template'i |
| New | `scripts/apply-deadlines.mjs` | Kerem'in onayladığı extracted JSON → data.ts override map merge |
| New | `scripts/check-deadlines.mjs` | Validation guard |
| Modify | `package.json` | `"check:deadlines"` script |
| New (gitignored) | `tmp/scraped/*.md` | Scrape output: her uni × cycle için bir markdown dosyası |
| New (gitignored) | `tmp/deadlines-extracted.json` | Kerem'in LLM ile çıkarıp düzelttiği final JSON |
| Modify | `.gitignore` | `tmp/` folder ignore |

---

## Acceptance Criteria (Kerem'in onayı için)

- [ ] Top 15 üniversite listesi son onayı verildi
- [ ] Scrape script çalıştı, `tmp/scraped/` klasöründe her uni için markdown dosyası var
- [ ] Kerem LLM ile extraction yaptı, `tmp/deadlines-extracted.json` hazır
- [ ] Düşük-confidence entry'ler elden geçti, JSON onaylandı
- [ ] Apply script çalıştı, `app/data.ts` güncellendi
- [ ] `npm run build` geçti (TS hatası yok)
- [ ] `npm run check:deadlines` geçti
- [ ] `DEPARTMENT_DEADLINES_LAST_CHECKED_AT` doğru tarihte
- [ ] PR açıldı, Kerem mergeden önce final göz attı

---

## Açık Sorular (Implementation öncesi karara bağlanacak)

1. **15 uni listesi:** TBD'leri (`id: -`) gerçek `data.ts` ID'leriyle eşle, listede olmayan uni'leri ekleme/çıkarma kararı
2. **Tüm bölümler mi, alt küme mi:** Sapienza'da 12 bölüm var; hepsinin deadline'ı aynı mı (university-wide), yoksa farklı mı? Scrape sırasında karar
3. **TBA / boş entry'ler:** Bir uni hiçbir bilgi yayınlamadıysa, override map'e hiç eklemiyor muyuz, yoksa `{ date: "TBA", ... }` mı?  → Recommendation: hiç ekleme (Department.deadline = undefined kalır)
4. **LLM extraction prompt iteration:** İlk pas Kerem hangi LLM'e gönderecek (Gemini / Claude / GPT)? Prompt template'i Claude implementation aşamasında yazar, Kerem ilk pas'ı çalıştırıp sonuca göre prompt'u tweak'ler. Bu spec dahilinde değil — Kerem'in sorumluluğunda.

---

(End of spec — Brainstorming onayı bekliyor)
