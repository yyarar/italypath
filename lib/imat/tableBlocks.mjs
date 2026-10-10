// IMAT soru metnindeki tablolari ayirir (STATUS #103 (a), 2026-10-10). Ayni modulu soru karti
// (components/imat/ImatQuestionCard.tsx) ve testi (scripts/imat/test-table-blocks.mjs) dogrudan ice aktarir;
// bu yuzden JS olarak yazildi (tipler tableBlocks.d.mts).
//
// Metin sozlesmesi degismez (gorsel okuma runbook'u; lib/sat/mathSegments.mjs): tablo `\n\n` ile ayrilmis kendi
// blogudur, her satir bir `\n` satiridir, hucreler ` | ` (bosluk-dikey cizgi-bosluk) ile ayrilir, ilk satir basliktir,
// bas/son dikey cizgi yoktur; yalniz bos sol ust kose hucresi bos ilk hucre olarak yazilir (satir ` | ` ile baslar).
// Hucrede `$...$`, Unicode alt/ust simge ve `<i>` olabilir; formul icindeki ` | ` hucre ayirmaz, `\$` gercek dolardir.
const CELL_SEPARATOR = " | ";
const ESCAPED_DOLLAR = "\u0000";
// lib/sat/mathSegments.mjs ile ayni formul siniri: once cift dolar, sonra tek dolar.
const MATH_BOUNDARY = /(\$\$[^$]+\$\$|\$[^$]+\$)/g;

// Satiri formul disindaki ` | ` noktalarindan boler; ayirac yoksa tek hucreli dizi doner.
function cellsOf(line) {
  const cells = [""];
  String(line)
    .replaceAll("\\$", ESCAPED_DOLLAR)
    .split(MATH_BOUNDARY)
    .forEach((part, index) => {
      if (index % 2 === 1) {
        cells[cells.length - 1] += part;
        return;
      }
      const pieces = part.split(CELL_SEPARATOR);
      cells[cells.length - 1] += pieces[0];
      cells.push(...pieces.slice(1));
    });
  return cells.map((cell) => cell.replaceAll(ESCAPED_DOLLAR, "\\$"));
}

/**
 * Tek satirlik metin (sik) bir tablo satiriysa hucrelerini, degilse null doner.
 * Tablo satiri: `\n` icermez ve formul disinda en az bir ` | ` tasir (` | ` ile baslayan satirin ilk hucresi bostur).
 */
export function splitTableRow(text) {
  const source = String(text);
  if (source.includes("\n")) return null;
  const cells = cellsOf(source);
  return cells.length >= 2 ? cells : null;
}

/**
 * Metni metin ve tablo bloklarina ayirir: { kind: "text", value } ya da { kind: "table", rows, headerOnly? }.
 * - Metin `\n\n` bloklarina, her blok `\n` satirlarina bolunur. Ayni blokta ust uste en az iki tablo satiri tablodur
 *   (ilk satir baslik; satirlar duzensiz olabilir, her satir kendi hucre sayisini korur). Tablodan once ve sonra ayni
 *   bloktaki satirlar metin kalir (`\n` ile; or. tablonun ustundeki baslik satiri).
 * - Komsusu tablo satiri olmayan tek tablo satiri metindir; yalniz metnin SON satiriysa yalniz baslikli tablodur
 *   ({ rows: [hucreler], headerOnly: true }): siklari tablonun satirlari olan sorularda baslik soru metninin sonundadir.
 * - Metin aynen kalir (tek `\n` dahil); arada tablo olmayan metin parcalari `\n\n` ile yeniden birlesir, yani tablosuz
 *   metin tek bir metin blogu olarak girdiyle birebir aynidir. Bos metin bos dizi doner.
 */
export function splitTableBlocks(text) {
  const source = String(text);
  if (source === "") return [];
  const blocks = [];
  let pending = null;
  const pushText = (value, separator) => {
    pending = pending === null ? value : `${pending}${separator}${value}`;
  };
  const pushTable = (table) => {
    if (pending !== null) blocks.push({ kind: "text", value: pending });
    pending = null;
    blocks.push(table);
  };

  const paragraphs = source.split("\n\n");
  paragraphs.forEach((paragraph, paragraphIndex) => {
    const lines = paragraph.split("\n");
    const rows = lines.map(splitTableRow);
    const lastParagraph = paragraphIndex === paragraphs.length - 1;
    // Bu paragrafin ilk metin satiri onceki paragrafin metnine `\n\n` ile, sonrakiler `\n` ile eklenir.
    let separator = "\n\n";
    let index = 0;
    while (index < lines.length) {
      let end = index;
      while (end < lines.length && rows[end] !== null) end += 1;
      const runLength = end - index;
      if (runLength >= 2) {
        pushTable({ kind: "table", rows: rows.slice(index, end) });
        separator = "\n\n";
        index = end;
      } else if (runLength === 1 && lastParagraph && end === lines.length) {
        pushTable({ kind: "table", rows: [rows[index]], headerOnly: true });
        index = end;
      } else {
        // Tablo olmayan satir (ya da tek tablo satiri): bir sonraki en az iki satirlik tabloya kadar metin.
        const textEnd = runLength === 1 ? end : index + 1;
        pushText(lines.slice(index, textEnd).join("\n"), separator);
        separator = "\n";
        index = textEnd;
      }
    }
  });
  if (pending !== null) blocks.push({ kind: "text", value: pending });
  return blocks;
}
