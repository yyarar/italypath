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
 * Metni `\n\n` bloklarina ayirir: { kind: "table", rows } ya da { kind: "text", value }.
 * Blok, en az iki satirliysa ve her satiri tablo satiriysa tablodur (satirlar duzensiz olabilir; her satir kendi hucre
 * sayisini korur). Geri kalan her blok metindir ve aynen kalir (tek `\n` dahil); komsu metin bloklari `\n\n` ile yeniden
 * birlesir, yani tablosuz metin tek bir metin blogu olarak girdiyle birebir aynidir. Bos metin bos dizi doner.
 */
export function splitTableBlocks(text) {
  const source = String(text);
  if (source === "") return [];
  const blocks = [];
  let pending = null;
  for (const block of source.split("\n\n")) {
    const lines = block.split("\n");
    const rows = lines.map(splitTableRow);
    if (lines.length >= 2 && rows.every((row) => row !== null)) {
      if (pending !== null) blocks.push({ kind: "text", value: pending });
      pending = null;
      blocks.push({ kind: "table", rows });
    } else {
      pending = pending === null ? block : `${pending}\n\n${block}`;
    }
  }
  if (pending !== null) blocks.push({ kind: "text", value: pending });
  return blocks;
}
