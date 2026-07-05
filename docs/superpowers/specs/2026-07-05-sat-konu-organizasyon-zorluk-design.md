# Tasarım: SAT Konu Organizasyonu (Domain Gruplama) + Zorluk Seçimi

Tarih: 2026-07-05
Durum: Onaylandı (Kerem, 2026-07-05)

## Amaç

Kerem canlı test etti, iki UX sorunu tespit etti:
1. `/sat` konu listesi karman çorman — 19 matematik konusu tek düz listede
   ("Matematik"), insanın çalışası gelmiyor.
2. Zorluk seçimi yok — kullanıcı hedefli (ör. sadece zor) pratik yapamıyor.

Çözüm: (1) konuları veride zaten var olan `domain` alanına göre 4 başlıkta
accordion olarak grupla; (2) bir konuya basınca zorluk seçimi (Karışık/Kolay/
Orta/Zor) çıksın, seçilen zorluk yalnızca o oturumun sorularını süzsün.

## En önemli kısıt: yeni veri YOK

Sorular zaten `difficulty` (1/2/3) ve `domain` taşıyor. API/şema/env değişmez.
Tamamı istemci tarafı. Faz 1/2 (pano, kutlama, rozet, yanlışlarım, karne)
bozulmaz — sadece topics görünümü yeniden düzenlenir + openTopic'e zorluk
filtresi eklenir. Ustalık ve seviye **konu bazında aynı kalır** (zorluk onları
değiştirmez; denemeler hangi zorluk oturumundan gelirse gelsin konuya sayılır).

Domain dağılımı (prod doğrulaması): Algebra 5 konu, Advanced Math 3, Geometry
and Trigonometry 4, Problem-Solving and Data Analysis 7 = 19 konu. Zorluk
dengeli: Kolay 344, Orta 350, Zor 325 soru (her konuda her zorluktan soru var).

## Kapsam

- `lib/sat/domains.ts` (yeni): domain sırası + İngilizce domain → çeviri anahtarı.
- `components/sat/SatDomainGroup.tsx` (yeni): sunum amaçlı accordion (başlık +
  children slot).
- `components/sat/TopicRow.tsx` (değişiklik): "armed" durumunda zorluk çipleri.
- `components/sat/SatBankExplorer.tsx` (değişiklik): domain gruplama + accordion
  state (odak domain'i otomatik açık), armedTopic state, openTopic/restartTopic'e
  zorluk parametresi + havuz filtresi, zorluğu session/completed/summary boyunca taşı.
- `lib/translations.ts`: domain etiketleri (4) + `difficultyMixed` ("Karışık") +
  `difficultySelectLabel` ("zorluk seç") + `noQuestionsAtDifficulty`.

Kapsam dışı: adaptif zorluk (oturum içi otomatik uyarlama), zorluk bazlı ayrı
ustalık/rozet (bilinçli olarak ustalık konu bazında kalır).

## Saf mantık / sözleşme (Codex birebir uygulasın)

### `lib/sat/domains.ts`

```
export const DOMAIN_ORDER = [
  "Algebra",
  "Advanced Math",
  "Problem-Solving and Data Analysis",
  "Geometry and Trigonometry",
];

export function domainOrderIndex(domain: string): number {
  const i = DOMAIN_ORDER.indexOf(domain);
  return i === -1 ? DOMAIN_ORDER.length : i;
}

// çeviri anahtarı (lib/translations.ts sat.* içinde)
export function domainLabelKey(domain: string): string {
  switch (domain) {
    case "Algebra": return "domainAlgebra";
    case "Advanced Math": return "domainAdvancedMath";
    case "Problem-Solving and Data Analysis": return "domainProblemSolving";
    case "Geometry and Trigonometry": return "domainGeometry";
    default: return "domainOther";
  }
}
```

### Zorluk filtresi

```
export type SatDifficultyFilter = "mixed" | 1 | 2 | 3;
// pool = mixed ? tüm sorular : difficulty === d olanlar
```

### Domain gruplama (SatBankExplorer)

- Her section (şu an sadece "math") içindeki `topics`, `topic.domain`'e göre
  gruplanır; gruplar `domainOrderIndex` ile sıralanır.
- Domain başlığı: etiket (`t.sat[domainLabelKey(domain)]`), konu sayısı,
  başlanan konu sayısı (solvedCount > 0), ve domain ustalık %'si.
  - Domain ustalık % = `readinessPct` (mevcut `lib/sat/mastery.ts`) domain'in
    konularına uygulanır: `{correctCount, questionCount}` listesi domain kapsamlı.
- Accordion state: `Set<string>` (açık domain'ler). Başlangıç: yalnızca
  `focusRecommendation.topic.domain` açık (odak domain otomatik açılır); yoksa
  ilk domain açık. Başlığa tıklama toggle eder.
- Açık domain'in içeriği: mevcut `TopicRow` kartları (Faz 1 ustalık kartları),
  domain'in konularıyla.

### Zorluk seçimi (TopicRow + SatBankExplorer)

- SatBankExplorer `armedTopicKey: string | null` tutar. Konu kartına tıklama o
  konuyu "armed" yapar → kart zorluk çiplerini gösterir: **Karışık** (birincil) /
  Kolay / Orta / Zor. Bir çipe tıklama `openTopic(topic, difficulty)` çağırır ve
  armed temizlenir. Tekrar tıklama/başka yere tıklama çipleri gizler.
- `openTopic(topic, difficulty)`:
  1. `fetchSatQuestions(topic...)` (tüm zorluklar).
  2. `pool = filter(difficulty)`; `pool` boşsa `setSessionError(t.sat.noQuestionsAtDifficulty)` ve dur.
  3. `unanswered = pool.filter(no attempt)`; > 0 ise session (o zorlukla),
     değilse `completed` görünümü (o zorluk kapsamındaki wrongQuestionIds ile).
  4. Seçilen `difficulty` session ve completed view state'inde saklanır.
- `restartTopic(topic, difficulty)`: `pool`'u index 0'dan başlatır (tümü).
- Zorluğu taşı: `session` ve `completed` view'ları `difficulty` taşır.
  - `SessionSummary` "Tekrar Çöz" → `restartTopic(topic, view.difficulty)`.
  - `TopicCompleted` "Baştan çöz" → `restartTopic(topic, view.difficulty)`;
    "Yanlışları çöz" mevcut `openMistakes` (zorluktan bağımsız — yanlışlar
    kapsamı tüm zorluklar, mevcut davranış korunur).
- Panodaki "bugünün odağı" düğmesi → `openTopic(focusTopic, "mixed")` (tek
  dokunuş, mevcut resume davranışı).

### Etkilenmeyenler

- `masteryTier`, `readinessPct`, XP/seviye, rozetler, streak: konu bazında
  toplu; zorluk filtresi bunları DEĞİŞTİRMEZ. Denemeler her zaman konuya sayılır.
- Yanlışlarım bölümü, "Karnem" (konu karnesi), "Rozetler" görünümü: değişmez.

## Görünüm

- Domain başlığı kapalıyken: ~4 derli toplu satır (etiket + "5 konu · 3 başlandı
  · %74 ustalık" + mini çubuk + chevron). Açınca konu kartları iner.
- Zorluk çipleri: konu kartında inline; Karışık birincil (sage dolu), diğerleri
  outline. ItalyPath editorial paleti; yeni renk sistemi yok.
- Mobil 375px: çipler sarılabilir (flex-wrap).

## Çeviriler (yeni `sat.*`, TR/EN paralel)

- `domainAlgebra`: "Cebir" / "Algebra"
- `domainAdvancedMath`: "İleri Matematik" / "Advanced Math"
- `domainProblemSolving`: "Problem Çözme ve Veri Analizi" / "Problem-Solving and Data Analysis"
- `domainGeometry`: "Geometri ve Trigonometri" / "Geometry and Trigonometry"
- `domainOther`: "Diğer" / "Other"
- `difficultyMixed`: "Karışık" / "Mixed"
- `difficultySelectLabel`: "zorluk seç" / "pick difficulty"
- `noQuestionsAtDifficulty`: "Bu zorlukta soru yok." / "No questions at this difficulty."
- Mevcut `difficultyEasy`/`difficultyMedium`/`difficultyHard` yeniden kullanılır.
- Domain başlığı özet metni için parametreli anahtarlar (konu sayısı, başlanan,
  ustalık %) mevcut `lib/translations.ts` desenine göre eklenir.

## Hata / kenar durumları

- Bir zorlukta soru yoksa (teoride nadir): `noQuestionsAtDifficulty` gösterilir,
  oturum başlamaz.
- Domain'de hiç konu yoksa o başlık render edilmez.
- Accordion state salt-istemci (localStorage gerekmiyor; her yüklemede odak
  domain açık başlar).
- RW şu an boş (ertelendi); yalnızca math section render edilir — mevcut davranış.

## Doğrulama

- `npx tsc --noEmit`, `npm run lint`, `npm run build` temiz.
- `npm run check:sat-bank` PASS kalır.
- Manuel: /sat aç → 4 domain başlığı, odak domain açık; başlık aç/kapa çalışır;
  bir konuya bas → zorluk çipleri; "Zor" seç → yalnızca zor sorular gelir;
  yarım bırak → tekrar "Zor" ile gir → kaldığın zor sorudan devam; ustalık/XP
  hâlâ konu bazında toplam; 375px mobil.

## Riskler

Orta. En dokunaklı yer SatBankExplorer topics görünümünün yeniden düzenlenmesi
ve zorluğun view state boyunca taşınması (session/completed/summary). Mevcut
akışlar (resume, completed, mistakes, dashboard, badges) korunmalı — Codex
bunları bozmadığını doğrulamalı. Geri alma: tek commit. İki parça uygulanabilir:
(A) domain gruplama/accordion, (B) zorluk seçimi.
```
