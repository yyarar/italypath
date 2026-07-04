# Tasarım: SAT Bankası — Kaldığın Yerden Devam

Tarih: 2026-07-04
Durum: Tasarım onaylandı (Kerem, 2026-07-04)

## Amaç

Şu an bir konuya "Devam Et" ile girildiğinde her zaman ilk sorudan başlanıyor
ve daha önce çözülmüş sorular yeniden gösteriliyor. Etiket "Devam Et" dese de
davranış öyle değil. Bu özellik, "Devam Et"i gerçek anlamda kaldığın yerden
devam ettirecek: sadece henüz çözülmemiş soruları getirecek.

Bağlam: SAT bankası özelliği canlıda çalışıyor (protected `/sat`). Ana bileşen
`components/sat/SatBankExplorer.tsx`. Kullanıcı denemeleri `sat_attempts`
tablosunda; `lib/sat/useSatAttempts.ts` bunları `attempts` Map'i olarak verir
(question_id -> son deneme). `SatBankExplorer` içindeki `topicProgress` Map'i
her konu için solvedCount/correctCount/wrongQuestionIds/wrongCount hesaplar.

## Kapsam

- `components/sat/SatBankExplorer.tsx`: konu açma mantığı (resume + restart),
  yeni "tamamlandı" görünümü
- `components/sat/TopicRow.tsx`: kalan soru sayısı / tamamlandı durumu
- `components/sat/SessionSummary.tsx`: "Tekrar Çöz" artık baştan-hepsini demeli;
  genel ustalık satırı (opsiyonel bonus)
- Yeni küçük bileşen: `components/sat/TopicCompleted.tsx` (tamamlanmış konu ekranı)
- `lib/translations.ts`: yeni `sat.*` anahtarları (TR/EN paralel)

Kapsam dışı: yeni veritabanı tablosu/sütunu, sunucu kodu, yeni ortam değişkeni,
soru sıralamasını karıştırma (shuffle), yanlışlarım akışına dokunma.

## Davranış Sözleşmesi

Kaynak gerçek: `attempts` Map'i. Bir sorunun `attempts`'te kaydı varsa
"çözülmüş" sayılır (doğru ya da yanlış fark etmez). Kullanıcı soruları sıralı
çözdüğü için "ilk çözülmemiş soru" = "kaldığı yer".

### Konu açma (TopicRow tıklaması → `openTopic`)

1. Konunun tüm soruları çekilir (mevcut `fetchSatQuestions`, sıra korunur).
2. `unanswered = attempts'te kaydı olmayan sorular` (sıra korunur).
3. `unanswered.length > 0` ise → o sorularla `session` başlat (index 0,
   correctInSession 0).
4. `unanswered.length === 0` ise (konu tamamen çözülmüş) → yeni `completed`
   görünümü göster.

Not: Kullanıcı sıralı ilerlediği için "ilk çözülmemişten sona kadar" ile "tüm
çözülmemişler" pratikte aynıdır; robustluk için "tüm çözülmemişler" kullanılır
(arada boşluk kalırsa da doğru çalışır).

### Baştan çözme (`restartTopic`)

Denemeleri yok sayıp **tüm** soruları index 0'dan başlatır. Şuralardan çağrılır:

- `SessionSummary` "Tekrar Çöz" düğmesi (bugün `openTopic` çağırıyor; artık
  `restartTopic` çağıracak — aksi halde bitmiş konuda "Tekrar Çöz" boş session
  açardı).
- `TopicCompleted` "Baştan çöz" düğmesi.

### Tamamlanmış konu görünümü (`completed` view / `TopicCompleted`)

Küçük editorial kart:

- Başlık: "Bu konuyu bitirdin" + kısa alt metin.
- Aksiyonlar:
  - "Baştan çöz" → `restartTopic(topic)`
  - "Yanlışları çöz (N)" → yalnızca `wrongCount > 0` ise; `openMistakes(topic,
    wrongQuestionIds)` (mevcut fonksiyon)
  - "Konulara dön" → topics görünümü

### TopicRow etiketi

- Başlanmamış (solvedCount === 0) → `startTopic` ("Çözmeye Başla")
- Başlanmış, kalan > 0 → `continueTopic` + kalan sayısı (ör. "Devam Et · 19
  soru kaldı"). Kalan = `questionCount - solvedCount`.
- Kalan === 0 → `topicCompletedLabel` ("Tamamlandı") görünümü; tıklama yine
  `onSelect` çağırır ve `completed` görünümüne düşer.

### SessionSummary

- `onRetry` artık `restartTopic` yolunu kullanır (baştan-hepsi).
- Bonus (opsiyonel, düşük risk): oturum sonucunun (X/Y) altına genel ustalık
  satırı: "Bu konuda toplam A/B doğru". A/B, `topicProgress.get(topicKey)`'ten
  gelir (oturum sonrası `attempts` güncel olduğundan doğru sayıyı verir).

## View Modeli

`SatBankExplorer` View union'ına yeni mod eklenir:

- Mevcut: `{ mode: "topics" }` | `{ mode: "session"; ... }` | `{ mode:
  "summary"; ... }`
- Yeni: `{ mode: "completed"; topic: SatTopic; wrongQuestionIds: string[] }`

`openTopic` artık ya `session` ya `completed` moduna geçer.

## Çeviriler (yeni `sat.*` anahtarları, TR/EN)

- `remainingLabel`: "soru kaldı" / "left"
- `topicCompletedLabel`: "Tamamlandı" / "Completed"
- `completedTitle`: "Bu konuyu bitirdin" / "You finished this topic"
- `completedBody`: kısa açıklama (TR/EN)
- `restartTopic`: "Baştan çöz" / "Start over"
- `overallMasteryLabel` (bonus): "Bu konuda toplam" / "In this topic"

Mevcut anahtarlar yeniden kullanılır: `continueTopic`, `startTopic`,
`retryTopic`, `backToTopics`, `retryMistakes`, `wrongLabel`, `summaryCorrect`.

## Hata / kenar durumları

- Konu açma sırasında fetch hatası: mevcut `setSessionError(t.sat.loadError)`
  davranışı korunur.
- Oturum sırasında `attempts` optimistik büyür ama oturumun soru listesi
  açılışta sabitlenir (mid-session liste değişmez) — mevcut davranış korunur.
- Başlanmamış konu: `unanswered === tüm sorular` → session (bugünkü davranışla
  aynı). Regression yok.

## Doğrulama

- `npx tsc --noEmit`, `npm run lint`, `npm run build` temiz.
- `npm run check:sat-bank` PASS kalır (yeni bileşen guard'ı bozmaz).
- Manuel: bir konuda birkaç soru çöz → çık → tekrar gir (kalanla başlamalı) →
  hepsini bitir → "Tamamlandı" + tamamlanmış ekran → "Baştan çöz" hepsini
  yeniden açmalı. Mobil 375px kontrol.

## Riskler

Düşük. Tamamı istemci; yeni veri yok; iki fonksiyonun (resume/restart)
ayrışması dışında mevcut akışlar değişmiyor. Geri alması kolay (tek commit).
