# SAT Math Soru Çıkarma — Prompt Şablonu ve Runbook

Bu runbook `tmp/sat-bank/math-images/` altındaki soru görüntülerini yapılandırılmış
JSON'a çevirir. Kural: pilot (plan Task 6) Kerem onayından geçmeden toplu çalıştırma
(plan Task 9) yapılmaz.

Not (2026-07-03 tespiti): Formatted PDF seti, Unformatted setin süpersetidir.
Math bankasının gerçek boyutu 1039 sorudur (821 değil); bunların 1019'unun cevabı
vardır, cevapsız 20 sorunun tamamı "Area and Volume 1.pdf" kaynaklıdır (eksik anahtar).
Soru listesinin tek doğru kaynağı `tmp/sat-bank/math-manifest.json` dosyasıdır.

## Süreç

1. `tmp/sat-bank/math-manifest.json`'dan hedef sorular seçilir (skill bazında).
2. Her soru görüntüsü Read tool ile açılır ve aşağıdaki şablona göre JSON üretilir.
3. Çıktı `tmp/sat-bank/math-questions/<skill_slug>-<difficulty>.json` dosyasına
   dizi olarak yazılır (manifest'teki id/section/domain/skill/skill_slug/difficulty/
   source_file alanları kopyalanır, aşağıdaki alanlar eklenir).
4. Aynı anda en fazla 5-10 paralel alt görev (oturum limiti kuralı).

## Soru başına üretilecek alanlar

- `question_type`: Görüntüde A./B./C./D. şıkları varsa "mcq", yoksa "spr".
- `prompt`: Soru metni. Matematik ifadeleri $...$ içinde LaTeX olarak yaz
  (kesir: \frac{a}{b}, üs: x^{2}, kök: \sqrt{x}, eşitsizlik: \leq \geq).
  Metindeki değişkenler de $x$ gibi sarılır. Satır sonu gerekiyorsa \n kullan.
- `choices`: mcq ise {"A": "...", "B": "...", "C": "...", "D": "..."} — şık
  içerikleri de LaTeX kuralına uyar. spr ise null.
- `figure`: Görüntüde grafik, geometri çizimi veya tablo varsa
  {"bbox": [x0, y0, x1, y1], "kind": "graph" | "geometry" | "table"} —
  bbox, SORU GÖRÜNTÜSÜNE göre 0-1 aralığında normalize koordinatlar
  (sol-üst köşe x0,y0; sağ-alt x1,y1; şekli tam saracak şekilde, soru metnini
  içermeden). Şekil yoksa null. Tablolar da figure sayılır (metne çevirme).
- `needs_review`: Görüntü bulanık, ifade belirsiz veya LaTeX'e çevrilemeyen
  bir öğe varsa true + `review_note` alanına tek cümle neden.

## Pilot sonrası eklenen kurallar (2026-07-03; toplu işte zorunlu)

- **Para tutarları `\$` ile yazılır** (ör. `\$2.00`, `\$1,576`). Çıplak `$`
  yalnızca matematik sınırlayıcıdır; para için kullanılırsa render bozulur.
- **Şıkları görsel olan sorular** (ör. "Which of the following is the graph
  of ..."): `choices` değerleri `"Graph A"`..`"Graph D"` olur; `figure.bbox`
  A./B./C./D. etiketleri DAHİL dört görseli birden kapsar (soru metni hariç);
  bu desen needs_review gerektirmez.
- **mcq şık metinleri asla boş bırakılmaz** — boş şık, uygulama katmanında
  sorunun sessizce elenmesine yol açar.

## Yasaklar

- CEVAP ÜRETME. Doğru cevap anahtardan gelir; senin işin yalnızca soruyu
  yazıya dökmek. Görüntüde işaretli cevap yok zaten.
- Soruyu yorumlama, sadeleştirme, çevirme. Birebir aktar (İngilizce kalır).
- Emin olmadığın karakteri tahmin etme; needs_review işaretle.

## Çıktı doğrulama

Her dosya yazıldıktan sonra: `node scripts/sat/validate-bank.mjs` çalıştırılabilir
(kısmi veriyle de çalışır) — JSON şema hataları ve cevap eşleşmezlikleri raporlanır.

## Pilot kapsamı (plan Task 6) — manifest'e göre kesin sayılar

- `linear-functions` difficulty 1/2/3: 39 + 28 + 19 = 86 soru (kesir/formül yoğun)
- `percentages` difficulty 3: 17 soru (SPR/sayı girişli tip yoğun)
- Toplam: 103 soru

Oturum limiti sıkışıksa pilot iki parçada koşulabilir:
Parça A = `linear-functions-1` (39) + `percentages-3` (17) = 56 soru — önce bu
sunulur; Parça B = `linear-functions-2` + `linear-functions-3` (47) sonraki
oturuma kalabilir. Kerem onayı Parça A çıktısı üzerinden de verilebilir; toplu
çalıştırma (Task 9) yine de tam pilot bitmeden başlamaz.

Pilot çıktısı Kerem'e örneklemle sunulur; onay gelmeden Task 9'a geçilmez.
Pilot hangi modelle koşulduysa toplu çıkarma da AYNI modelle koşulmalıdır.
