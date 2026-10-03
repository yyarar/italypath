// SAT metinlerindeki formul sinirlarini ayirir. Ayni modulu hem site
// (components/sat/MathText.tsx) hem icerik taramasi (scripts/sat/lib/content-audit.mjs)
// dogrudan ice aktarir; bu yuzden JS olarak yazildi (tipler mathSegments.d.mts).
//
// Veri sozlesmesi:
// - `$...$`   satir ici formul
// - `$$...$$` ayri satirda formul (STATUS #100, 2026-10-02; onceden taninmiyordu ve
//             cift dolardan sonra metin ile formul yer degistiriyordu)
// - `\$`      gercek dolar isareti (or. \$2.00); formul baslatmaz
// - `<u>...</u>` alti cizili, `<i>...</i>` italik (RW metin sozlesmesi, plan 2026-10-03). Baska etiket
//             yoktur; bu dort etiket disindaki her `<` duz metindir. Isaretler yalniz formul disinda taninir.
const ESCAPED_DOLLAR = "\u0000";
// Cift dolar once denenir; `$a$$b$` gibi arka arkaya iki satir ici formul yine iki ayri formuldur.
const MATH_BOUNDARY = /(\$\$[^$]+\$\$|\$[^$]+\$)/g;

function splitRaw(text) {
  // Yakalama gruplu split: cift sirali parcalar metin, tek sirali parcalar formuldur.
  return String(text).replaceAll("\\$", ESCAPED_DOLLAR).split(MATH_BOUNDARY);
}

/**
 * Metni sirali parcalara ayirir: { kind: "text" | "inline" | "display", value }.
 * Formul parcalarinda `value` sinirlayicisiz LaTeX'tir. Ayri satirdaki formul kendi blogunu
 * actigi icin hemen oncesindeki ve sonrasindaki tek satir sonu atilir (cift bosluk olmasin).
 */
export function splitMathText(text) {
  const segments = [];
  splitRaw(text).forEach((part, index) => {
    if (index % 2 === 1) {
      const display = part.startsWith("$$");
      const tex = display ? part.slice(2, -2) : part.slice(1, -1);
      segments.push({ kind: display ? "display" : "inline", value: tex.replaceAll(ESCAPED_DOLLAR, "\\$") });
    } else {
      segments.push({ kind: "text", value: part.replaceAll(ESCAPED_DOLLAR, "$") });
    }
  });

  segments.forEach((segment, index) => {
    if (segment.kind !== "display") return;
    const before = segments[index - 1];
    const after = segments[index + 1];
    if (before?.kind === "text" && before.value.endsWith("\n")) before.value = before.value.slice(0, -1);
    if (after?.kind === "text" && after.value.startsWith("\n")) after.value = after.value.slice(1);
  });

  return segments.filter((segment) => segment.kind !== "text" || segment.value !== "");
}

/**
 * Formullere dokunmadan yalniz formul disindaki metne `fn` uygular ve metni yeniden birlestirir.
 * `fn` degistirmezse sonuc girdiyle birebir aynidir.
 */
export function mapTextOutsideMath(text, fn) {
  return splitRaw(text)
    .map((part, index) => (index % 2 === 1 ? part : fn(part)))
    .join("")
    .replaceAll(ESCAPED_DOLLAR, "\\$");
}

export const MARK_TAGS = Object.freeze(["<u>", "</u>", "<i>", "</i>"]);
const MARK_TAG = /(<\/?[ui]>)/;
const MARK_TAG_GLOBAL = /<\/?[ui]>/g;

/**
 * splitMathText parcalarina isaret durumu ekler: { kind, value, italic, underline }.
 * Formul parcalari splitMathText ile aynidir ve isaret tasimaz; isaret durumu formulun iki yaninda surer.
 * Ayni isaretli komsu metin parcalari birlesir (isaretsiz metinde cikti splitMathText ile ayni).
 * Dengesiz girdi cokmez: kapanmayan isaret metin sonunda kapanmis sayilir, karsiliksiz kapanis atilir.
 */
export function splitRichText(text) {
  const marks = { italic: false, underline: false };
  const segments = [];
  for (const segment of splitMathText(text)) {
    if (segment.kind !== "text") {
      segments.push({ ...segment, italic: false, underline: false });
      continue;
    }
    segment.value.split(MARK_TAG).forEach((part, index) => {
      if (index % 2 === 1) {
        // Ayni tur ic ice acilis ve karsiliksiz kapanis durumu degistirmez (markIssues raporlar).
        marks[part.at(-2) === "u" ? "underline" : "italic"] = !part.startsWith("</");
        return;
      }
      if (part === "") return;
      const last = segments.at(-1);
      if (last?.kind === "text" && last.italic === marks.italic && last.underline === marks.underline) {
        last.value += part;
      } else {
        segments.push({ kind: "text", value: part, ...marks });
      }
    });
  }
  return segments;
}

/** Dort isaret etiketini siler, baska hicbir seye dokunmaz. Formul icindeki `<` LaTeX'tir, silinmez. */
export function stripMarks(text) {
  return mapTextOutsideMath(text, (part) => part.replace(MARK_TAG_GLOBAL, ""));
}

const PASSAGE_LABEL = /^Text [12]$/;
const PASSAGE_BULLET = "• ";

/**
 * Okuma ve Yazma pasajini paragraf (`\n\n`) ve satir (`\n`) bloklarina ayirir; site (components/sat/PassageText.tsx)
 * ve onizleme (scripts/sat/rw/render-rw-preview.mjs) ayni kurali kullanir. Satir turu:
 * - `label`  tam olarak `Text 1` / `Text 2` olan satir
 * - `bullet` `• ` ile baslayan not maddesi (madde imi `text` icinde kalir)
 * - `verse`  etiket satirlari cikinca iki ya da daha cok satir kalan ve hic madde tasimayan paragrafin
 *            her satiri (siir, diyalog): sarilan devam satiri iceriden baslar, gercek satir sonu ayirt edilir
 * - `plain`  geri kalan her satir (tek satirlik paragraf, not listesinin giris satiri, etiketin altindaki pasaj)
 * Saf fonksiyon; isaretlere (`<u>`, `<i>`) dokunmaz, onlari satir icinde MathText cizer.
 */
export function splitPassageBlocks(text) {
  const source = String(text);
  if (source === "") return [];
  return source.split("\n\n").map((paragraph) => {
    const lines = paragraph.split("\n");
    const body = lines.filter((line) => !PASSAGE_LABEL.test(line));
    const verse = body.length >= 2 && !body.some((line) => line.startsWith(PASSAGE_BULLET));
    return {
      lines: lines.map((line) => ({
        text: line,
        kind: PASSAGE_LABEL.test(line) ? "label" : line.startsWith(PASSAGE_BULLET) ? "bullet" : verse ? "verse" : "plain",
      })),
    };
  });
}
