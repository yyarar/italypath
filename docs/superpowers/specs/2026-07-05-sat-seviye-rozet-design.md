# Tasarım: SAT Panosu Faz 2 — Seviye, Kutlama, Akıllı Rozetler

Tarih: 2026-07-05
Durum: Onaylandı (Kerem, 2026-07-05)

## Amaç

Faz 1 panosu (hazırlık halkası, seri, günlük hedef, ustalık kartları) canlı.
Faz 2 gamification derinliği ekler: XP/seviye sistemi, seviye-atlama kutlaması
(tek kutlama anı — Kerem kararı) ve üç davranışı ödüllendiren akıllı rozetler.

Bağlam: pre-launch, gerçek kullanıcı yok (hepsi test hesabı). Bu yüzden geriye
dönük göç/koruma karmaşası gerekmez; tek sade guard yeter.

## En önemli kısıt: yeni veri YOK

Her şey mevcut veriden türer. Tek kalıcı depolama `localStorage`'daki
"kutlanan seviye". Yeni tablo/sütun/AI/sunucu/ortam değişkeni yok.

Kaynaklar:
- `topicProgress` (SatBankExplorer): konu başına solvedCount/correctCount +
  `masteryTier` (mevcut `lib/sat/mastery.ts`).
- `SatTopic.domain` (mevcut): bölüm-bazlı rozet için.
- `useSatAttempts`: mevcut `streak` (güncel) + yeni `longestStreak` (en uzun,
  geçmiş deneme tarihlerinden).

## Kapsam

- `lib/sat/levels.ts` (yeni): XP + seviye saf fonksiyonları.
- `lib/sat/badges.ts` (yeni): rozet tanımları + değerlendirme (saf).
- `lib/sat/useSatAttempts.ts` (değişiklik): `longestStreak` ekle.
- `components/sat/LevelUpCelebration.tsx` (yeni): kutlama overlay'i (Framer Motion).
- `components/sat/BadgesView.tsx` (yeni): rozet galerisi.
- `components/sat/SatDashboardHeader.tsx` (değişiklik): seviye/XP göstergesi.
- `components/sat/SatBankExplorer.tsx` (değişiklik): XP/seviye hesabı, kutlama
  tetikleyicisi, "Rozetler" düğmesi + görünümü.
- `lib/translations.ts`: yeni `sat.*` anahtarları (TR/EN paralel).

Kapsam dışı (sonraki fazlar): adaptif karışık pratik, günlük-hedef/seri/ustalık
kutlamaları (bilinçli olarak yalnızca seviye-atlama kutlanır).

## Saf mantık (Codex birebir uygulasın)

### `lib/sat/levels.ts`

```
// XP: doğru başına 10, yanlış başına 2 (çaba az ödüllendirilir)
export function computeXp(totalCorrect: number, totalSolved: number): number {
  const wrong = Math.max(0, totalSolved - totalCorrect);
  return totalCorrect * 10 + wrong * 2;
}

// L seviyesine ULAŞMAK için gereken kümülatif XP = 50 * L * (L - 1)
// (L2=100, L3=300, L4=600, L5=1000; L->L+1 boşluğu = 100*L)
export function levelFromXp(xp: number): number {
  let level = 1;
  while (50 * (level + 1) * level <= xp) level += 1;
  return level;
}

export interface LevelProgress {
  level: number;
  xpIntoLevel: number;
  xpForNext: number;   // = 100 * level
  xpToNext: number;    // xpForNext - xpIntoLevel
  progressPct: number; // 0..100
}

export function levelProgress(xp: number): LevelProgress {
  const level = levelFromXp(xp);
  const floorXp = 50 * level * (level - 1);
  const ceilXp = 50 * (level + 1) * level;
  const xpIntoLevel = xp - floorXp;
  const xpForNext = ceilXp - floorXp;
  return {
    level,
    xpIntoLevel,
    xpForNext,
    xpToNext: xpForNext - xpIntoLevel,
    progressPct: Math.round((xpIntoLevel / xpForNext) * 100),
  };
}
```

### `lib/sat/badges.ts`

Girdi (SatBankExplorer'da mevcut verilerden hesaplanır ve verilir):
`{ totalSolved, totalCorrect, goldCount, domainFullyGold, longestStreak }`.

- `goldCount` = `masteryTier(...) === "gold"` olan konu sayısı.
- `domainFullyGold` = en az bir ana bölümün (domain) TÜM konuları gold ise true.

```
export type BadgeTrack = "effort" | "mastery" | "streak";
export interface Badge {
  id: string;
  track: BadgeTrack;
  unlocked: boolean;
  current: number;  // ilerleme göstergesi için
  target: number;
}

export interface BadgeInputs {
  totalSolved: number;
  totalCorrect: number;
  goldCount: number;
  domainFullyGold: boolean;
  longestStreak: number;
}

export function evaluateBadges(i: BadgeInputs): Badge[] {
  const t = (id, track, current, target) => ({ id, track, current, target, unlocked: current >= target });
  return [
    // Emek (değer = çözülen soru)
    t("isinma", "effort", i.totalSolved, 25),
    t("maratoncu", "effort", i.totalSolved, 250),
    t("binSoru", "effort", i.totalSolved, 1000),
    // Ustalık
    t("ilkAltin", "mastery", i.goldCount, 1),
    t("altinAvcisi", "mastery", i.goldCount, 5),
    { id: "bolumUstasi", track: "mastery", current: i.domainFullyGold ? 1 : 0, target: 1, unlocked: i.domainFullyGold },
    // Süreklilik (değer = en uzun seri)
    t("alevlendi", "streak", i.longestStreak, 3),
    t("haftalik", "streak", i.longestStreak, 7),
    t("aylik", "streak", i.longestStreak, 30),
  ];
}
```

### `useSatAttempts` — `longestStreak`

Mevcut ham satır tarihlerinden en uzun peş peşe gün serisi:

```
const DAY = 86400000;
const dayStarts = [...new Set(rows.map((r) => {
  const d = new Date(r.answered_at); d.setHours(0,0,0,0); return d.getTime();
}))].sort((a, b) => a - b);
let longest = 0, run = 0, prev = null;
for (const t of dayStarts) {
  run = prev !== null && t - prev === DAY ? run + 1 : 1;
  if (run > longest) longest = run;
  prev = t;
}
```

Hook artık `longestStreak` de döner (mevcut `streak`, `todayCount` korunur).
Not: DST gününde t-prev tam bir gün olmayabilir; v1 için kabul edilebilir sapma.

### Kutlama tetikleyici (SatBankExplorer)

- XP = `computeXp(totalCorrect, totalSolved)` (topicProgress toplamlarından).
- `level = levelProgress(xp).level`.
- `localStorage["satCelebratedLevel"]`:
  - Değer yoksa/NaN ise → mevcut `level`'ı yaz, KUTLAMA YOK (sessiz başlatma).
  - Değer varsa ve `level > stored` → kutla (yeni seviye), `stored = level` yaz.
  - Aynı anda birden çok seviye atlanırsa son seviyeyi bir kez kutla.
- Tetikleme `useEffect` ile `level` değişimini izler; `LevelUpCelebration`
  koşullu render edilir. Kullanıcı "Devam" ile kapatır.

## Görünüm

### Seviye göstergesi (SatDashboardHeader)

Panoya seviye kutusu + XP çubuğu: "Seviye {L}", `xpIntoLevel`/`xpForNext`
çubuğu, "sonraki seviyeye {xpToNext} XP". Altın vurgulu (maket referansı).
Props: `levelProgress` sonucu.

### LevelUpCelebration (overlay)

Tam ekran koşullu overlay (gerçek app'te `position: fixed` uygun). Framer
Motion giriş animasyonu: ışın/konfeti, büyük seviye numarası, "Seviye atladın"
üst metni, "Devam" düğmesi. ItalyPath yeşili + altın vurgu; abartısız.

### BadgesView (rozet galerisi)

- "Rozetler" düğmesiyle açılır — mevcut "Karnem"/konu karnesi düğmesi/görünümü
  hangi desende ise ona uyulsun (Codex mevcut yapıya baksın; aynı View
  modeli/buton pattern'i).
- 9 rozet, 3 şeride (Emek/Ustalık/Süreklilik) gruplanır.
- Açık rozet: renkli ikon + ad. Kilitli: gri + koşul metni + ilerleme
  (`current`/`target`, ör. "Altın Avcısı · 3/5"). `bolumUstasi` boolean:
  kilitliyken koşul metnini göster.
- Rozetler KUTLAMA yapmaz (kutlama yalnızca seviye).

## Çeviriler (yeni `sat.*`, TR/EN paralel)

- `levelLabel`: "Seviye" / "Level"
- `levelXpToNext` (parametreli): "sonraki seviyeye {n} XP" / "{n} XP to next level"
- `levelUpEyebrow`: "Seviye atladın" / "Level up"
- `levelUpBody` (parametreli): "Seviye {L}!" / "Level {L}!"
- `levelUpDismiss`: "Devam" / "Continue"
- `badgesButton`: "Rozetler" / "Badges"
- `badgesTitle`: "Rozetler" / "Badges"
- `badgeTrackEffort`/`badgeTrackMastery`/`badgeTrackStreak`: "Emek/Ustalık/Süreklilik"
- Her rozet için ad + kilitli koşul metni (9 rozet):
  isinma, maratoncu, binSoru, ilkAltin, altinAvcisi, bolumUstasi, alevlendi,
  haftalik, aylik. TR birincil; doğal Türkçe. Parametreli metinlerde mevcut
  `lib/translations.ts` desenine uyulsun.

## Hata / kenar durumları

- Veri yoksa: XP 0 → Seviye 1; ilk yükleme `satCelebratedLevel`'ı 1 yapar,
  kutlama yok. Tüm rozetler kilitli, koşullarıyla görünür.
- `localStorage` erişilemezse (private mode vb.): try/catch ile sarmalanır;
  başarısızsa kutlama sessizce atlanır, app patlamaz.
- Attempts yükleniyorken mevcut skeleton korunur.

## Doğrulama

- `npx tsc --noEmit`, `npm run lint`, `npm run build` temiz.
- `npm run check:sat-bank` PASS kalır.
- Manuel: soru çöz → XP/çubuk artmalı; yeterince doğru → seviye atlayınca
  kutlama BİR kez patlamalı, yenileyince tekrar patlamamalı; Rozetler görünümü
  ilerlemeyi doğru göstermeli (ör. 25 soru → "Isınma" açılmalı); 375px mobil.

## Riskler

Düşük. Saf fonksiyonlar test edilebilir; `useSatAttempts`'e yalnızca
`longestStreak` eklenir (mevcut `attempts`/`streak`/`todayCount` korunur, Faz 1
tüketicileri bozulmaz). Kutlama tek dokunaklı yan etki; `localStorage` guard'lı.
Geri alma kolay. İki parça halinde uygulanabilir: (A) seviye+kutlama,
(B) rozetler.
```
