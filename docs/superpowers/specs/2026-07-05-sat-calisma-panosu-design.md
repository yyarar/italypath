# Tasarım: SAT Çalışma Panosu (Faz 1 — Gamified Dashboard)

Tarih: 2026-07-05
Durum: Faz 1 onaylandı (Kerem, 2026-07-05)

## Amaç

`/sat` açılışı şu an düz bir konu listesi. Kerem'in teşhisi: (1) bana uyum
sağlamıyor, (2) görsel olarak sıradan, (3) ilerleme/emek hissi yok. Görsel yön
kararı: **daha canlı / oyunlaştırılmış** (ama ItalyPath paletinde, neon değil).

Faz 1, konu listesinin üstüne kişiselleştirilmiş bir **çalışma panosu** ekler ve
konu satırlarını **ustalık rozetli kartlara** yükseltir. Üç derde de dokunur:

- Uyum → "Bugünün odağı": en zayıf konuyu bulup yönlendirir
- İlerleme hissi → hazırlık halkası + günlük seri + günlük hedef + ustalık kademeleri
- Görsel → halka, çubuklar, rozetler, canlı vurgular

## En önemli kısıt: yeni veri YOK

Tüm göstergeler zaten elimizdeki veriden türer:

- Doğruluk, ustalık, hazırlık, zayıf-konu önerisi → `topicProgress`
  (correctCount/solvedCount/questionCount) — mevcut.
- Seri (streak) + günlük hedef → deneme **tarihleri**. `sat_attempts.answered_at`
  zaten çekiliyor (`useSatAttempts` sorgusu `answered_at`'i alıyor ama map'te
  atıyor). Sadece yüzeye çıkarılacak. **Şema değişmez, yeni sorgu yok, egress etkisi yok.**

Yeni tablo/sütun/AI/boru hattı/ortam değişkeni yok.

## Kapsam

- `lib/sat/mastery.ts` (yeni): saf fonksiyonlar — ustalık kademesi, doğruluk %,
  hazırlık skoru, günlük hedef sabiti, odak-konu seçimi.
- `lib/sat/useSatAttempts.ts` (değişiklik): ham satırları state'te tut; `attempts`,
  `streak`, `todayCount` türev (useMemo). `recordAttempt` optimistik satır ekler.
- `components/sat/SatDashboardHeader.tsx` (yeni): hazırlık halkası + seri + günlük
  hedef + "bugünün odağı" önerisi.
- `components/sat/TopicRow.tsx` (değişiklik): ustalık rozeti + ilerleme çubuğu +
  doğruluk % taşıyan karta yükselt.
- `components/sat/SatBankExplorer.tsx` (değişiklik): topics görünümünün başına
  dashboard'ı koy; odak önerisi konuyu açsın (mevcut `openTopic`).
- `lib/translations.ts`: yeni `sat.*` anahtarları (TR/EN paralel).

Kapsam dışı (Faz 2): adaptif karışık pratik ("sana özel 10 soru"), kutlama
animasyonları, rozet geçmişi/XP/seviye, oturum içi zorluk uyarlaması.

## Saf mantık (Codex birebir uygulasın)

### `lib/sat/mastery.ts`

```
export const DAILY_GOAL = 10;

export type MasteryTier = "none" | "weak" | "bronze" | "silver" | "gold";

export function accuracyPct(correct: number, solved: number): number {
  if (solved <= 0) return 0;
  return Math.round((correct / solved) * 100);
}

// Kademe: doğruluk temelli, "altın" için kapsama şartı da var
// (2/40 doğru cevapla altın olunmasın diye).
export function masteryTier(solved: number, correct: number, total: number): MasteryTier {
  if (solved <= 0) return "none";
  const acc = correct / solved;
  const coverage = total > 0 ? solved / total : 0;
  if (acc >= 0.9 && coverage >= 0.8) return "gold";
  if (acc >= 0.7) return "silver";   // 0.7–0.9, ve 0.9+ ama kapsama düşükse buraya düşer
  if (acc >= 0.5) return "bronze";
  return "weak";
}

// Genel hazırlık: bankanın tamamına göre doğru cevap oranı.
// Kapsama + doğruluğu birlikte ödüllendirir; dokunulmamış sorular düşürür.
export function readinessPct(
  progressList: { correctCount: number; questionCount: number }[]
): number {
  const totalQ = progressList.reduce((s, p) => s + p.questionCount, 0);
  const totalCorrect = progressList.reduce((s, p) => s + p.correctCount, 0);
  if (totalQ <= 0) return 0;
  return Math.round((totalCorrect / totalQ) * 100);
}
```

### Odak-konu seçimi (SatBankExplorer içinde ya da helper)

- Başlanmış konular (solvedCount > 0) arasında doğruluğu en düşük olanı bul.
- Doğruluğu < %70 ise → `kind: "weak"` (odaklan), o konu.
- Değilse (hepsi güçlü ya da hiç başlanmamış): başlanmamış ilk konu → `kind: "start"`;
  o da yoksa tamamlanmamış ilk konu → `kind: "continue"`.
- Öneri düğmesi `openTopic(focusTopic)` çağırır (mevcut "kaldığın yerden devam").
- Kopya `kind`'a göre değişir (weak/start/continue) — çeviri anahtarları aşağıda.

### Seri (streak) + günlük sayı — `useSatAttempts` içinde

Ham satırlar `{ question_id, selected_answer, is_correct, answered_at }` state'te
tutulur. Türevler:

```
function dayKey(iso): string  // yerel tarih: `${y}-${m}-${d}` (new Date(iso), local)

// attempts (mevcut): question_id -> son deneme (answered_at asc sırasında son)
// todayCount: answered_at'i bugün (yerel) olan satır sayısı
// streak: aktif günlerin kümesi; bugünden (bugün yoksa dünden) geriye peş peşe
//   gün say. Ne bugün ne dün aktifse streak 0.
```

Streak algoritması:
```
const days = new Set(rows.map(r => dayKey(r.answered_at)));
const cursor = new Date();
if (!days.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
let streak = 0;
while (days.has(dayKey(cursor))) { streak++; cursor.setDate(cursor.getDate() - 1); }
```

`recordAttempt`: DB insert'ten önce ham satırlara optimistik satır ekle
(`answered_at: new Date().toISOString()`); böylece streak/todayCount/attempts
tutarlı güncellenir. DB hatasında eklenen satır geri alınır.

Hook artık `{ attempts, recordAttempt, loading, streak, todayCount }` döner.

## Görünüm

### SatDashboardHeader (topics görünümünün en üstü)

Mevcut sade başlığın (ITALYPATH eyebrow + başlık + alt metin) yerini/üstünü alır:

- **Hazırlık halkası:** SVG dairesel ilerleme, ortasında `readinessPct` (%),
  altında "SAT Hazırlık". Renk sage.
- **Seri kartı:** alev ikonu (`ti-flame`, terracotta) + streak sayısı + "günlük seri".
  streak 0 ise cesaretlendiren kopya: "Bugün başla, serini kur".
- **Günlük hedef:** `todayCount`/`DAILY_GOAL` + ince ilerleme çubuğu + "bugünkü hedef".
  Hedef dolunca (todayCount ≥ DAILY_GOAL) çubuk sage-dolu + küçük "tamam" işareti.
- **Bugünün odağı bandı:** odak-konu + kopya (`kind`'a göre) + düğme
  ("Zayıf konunu çöz" / "Başla" / "Devam et") → `openTopic(focusTopic)`.

Framer Motion (stack'te var) ile halkanın dolumuna ince giriş animasyonu opsiyonel;
ağır kutlama YOK (Faz 2).

### TopicRow → ustalık kartı

Her konu satırı şunları taşır:

- Konu adı (serif) + ustalık rozeti (`masteryTier`): Altın (`ti-trophy`, amber),
  Gümüş (`ti-award`, sage-gri), Bronz (amber-koyu), Zayıf (terracotta), Başlanmadı
  (kesikli/nötr).
- İlerleme çubuğu: genişlik = `accuracyPct`; renk kademeye göre.
- Sağda: doğruluk % + "correct/solved" (ör. 78/86).
- Başlanmamışsa: nötr görünüm + "Başla →".
- Tıklama mevcut `onSelect` → `openTopic` (yönlendirme mantığı değişmez).

Not: Mevcut "yanlışlarım" bölümü, "Karnem" (konu karnesi) düğmesi ve oturum/özet
akışları **değişmez**; dashboard onların üstüne biner.

## Çeviriler (yeni `sat.*`, TR/EN paralel)

- `dashboardReadinessLabel`: "SAT Hazırlık" / "SAT readiness"
- `dashboardStreakLabel`: "günlük seri" / "day streak"
- `dashboardStreakEmpty`: "Bugün başla, serini kur" / "Start today, build your streak"
- `dashboardDailyLabel`: "bugünkü hedef" / "today's goal"
- `dashboardDailyDone`: "Hedef tamam" / "Goal done"
- `focusEyebrow`: "Bugünün odağı" / "Today's focus"
- `focusWeakBody`: "{topic} konusunda %{n}'desin — en zayıf alanın." (parametreli)
- `focusStartBody`: "{topic} ile başla — ilk konun." (parametreli)
- `focusContinueBody`: "{topic} konusundan devam et." (parametreli)
- `focusWeakCta`: "Zayıf konunu çöz" / "Practice your weak spot"
- `focusStartCta`: "Başla" / "Start"
- `focusContinueCta`: "Devam et" / "Continue"
- `masteryGold`/`masterySilver`/`masteryBronze`/`masteryWeak`/`masteryNone`:
  "Altın/Gümüş/Bronz/Zayıf/Başlanmadı" (TR) · "Gold/Silver/Bronze/Weak/Not started" (EN)

Parametreli metinler için mevcut çeviri deseni neyse ona uyulsun (elle string
birleştirme kabul, ör. `t.sat.focusWeakBodyPrefix` + topic + ...); Codex mevcut
`lib/translations.ts` yapısına baksın.

## Hata / kenar durumları

- Veri yoksa (yeni kullanıcı): readiness 0, streak 0, todayCount 0; odak = ilk
  konu (`kind: "start"`); dashboard cesaretlendiren boş-durum kopyalarını gösterir,
  patlamaz.
- Attempts yükleniyorken mevcut skeleton korunur; dashboard yüklenince görünür.
- Streak/todayCount tamamen istemci-yerel tarihe göre (answered_at UTC → local).
  Kabul: cihaz saati yanlışsa streak sapabilir; v1 için kabul edilebilir.

## Doğrulama

- `npx tsc --noEmit`, `npm run lint`, `npm run build` temiz.
- `npm run check:sat-bank` PASS kalır.
- Manuel: birkaç soru çöz → dashboard'da todayCount ve streak artmalı; zayıf bir
  konu bırak → "bugünün odağı" onu göstermeli; bir konuyu ustalıkla bitir →
  rozeti yükselmeli; readiness çözdükçe artmalı. Mobil 375px kontrol.

## Riskler

Düşük-orta. Yeni veri yok; `useSatAttempts` refaktörü (map yerine ham satır +
türev) tek dokunaklı yer — mevcut `attempts` tüketicileri (SatBankExplorer)
aynı arayüzü görmeli (`attempts` Map'i korunur). Geri alması: tek commit.
Marka notu: oyunlaştırma bilinçli olarak ItalyPath paletinde tutulur (neon/gradient
yok); editorial kimlikle çatışmayan "canlı ama sakin" ton.
```
