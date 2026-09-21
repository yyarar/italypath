# Sosyal medya

Instagram: **@eduitalya** — kreatif/marketing içeriklerinde marka adı "Eduitalya Italypath".

## İçerik üretimi

Yayına hazır görseller ve caption'lar: `content/instagram/`

- `posts/` — 1080×1350 tek görsel post
- `stories/` — 1080×1920 story
- `CAPTIONS.md` — her görselin Türkçe caption'ı, hashtag'i, yayın sırası, bio önerisi
- `_generator/` — görselleri üreten script

Yeniden üretmek için (Google Chrome kurulu olmalı):

```bash
cd content/instagram/_generator && node build.mjs
```

Generator marka paletini (`app/globals.css`: paper/sage/terracotta) ve Spectral + Hanken
Grotesk fontlarını kullanır. Her görselde otomatik taşma kontrolü vardır; içerik kutuya
sığmazsa build hata verir.

## Kural

Sosyal içerikteki her rakam canlı Supabase verisinden veya sürümlü şehir maliyet modelinden
gelmeli. `docs/AI_SEARCH_VISIBILITY_PLAN.md` içindeki guardrail'ler burada da geçerli:
uydurma istatistik, sahte social proof veya kaynaksız "değişken kural" (tarih, burs eşiği,
vize şartı) yok. Maliyet aralıkları her zaman "tahmindir" notuyla verilir.
