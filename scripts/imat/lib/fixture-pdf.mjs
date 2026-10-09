// Test yardimcisi: uydurma metinli en kucuk PDF (Courier 11 pt, WinAnsiEncoding; pdftotext ve pdfinfo okur). Yalniz
// test-*.mjs fiksturleri icin; sinav metni tasimaz.
//
// pages: [[{ x, top, text }]] (top = sayfanin ustunden PDF noktasi, pdfplumber bbox'i gibi). Kelimeler tek tek, esit
// aralikli yerlestirilir; boylece kaydirilmis (shift) metin katmani da kelime bosluklarini korur. shift > 0: her karakter
// kod noktasi - shift olarak yazilir (2021 kagidi gibi glif kaydirmali metin katmani; pdftotext kaydirilmis karakter verir).
// toUnicode: { bayt: kod noktasi } yazi tipine ToUnicode tablosu ekler (Cambridge kagitlarindaki Word ciktisi gibi: tire
// glifi U+00AD, noktali virgul U+037E verir); listede olmayan bayt WinAnsi ile okunur.
const ADVANCE = 0.6; // Courier: her glif 0.6 em

function toUnicodeCMap(map) {
  const hex = (n, digits) => n.toString(16).toUpperCase().padStart(digits, "0");
  const entries = Object.entries(map).map(([code, point]) => `<${hex(Number(code), 2)}> <${hex(point, 4)}>`);
  return [
    "/CIDInit /ProcSet findresource begin",
    "12 dict begin",
    "begincmap",
    "/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def",
    "/CMapName /Fixture-UCS def",
    "/CMapType 2 def",
    "1 begincodespacerange",
    "<00> <FF>",
    "endcodespacerange",
    `${entries.length} beginbfchar`,
    ...entries,
    "endbfchar",
    "endcmap",
    "CMapName currentdict /CMap defineresource pop",
    "end",
    "end",
  ].join("\n");
}

export function makePdf(pages, { width = 595, height = 842, size = 11, shift = 0, toUnicode = null } = {}) {
  const advance = size * ADVANCE;
  const escape = (s) => s.replace(/[\\()]/g, (c) => `\\${c}`);
  const encode = (s) => [...s].map((c) => String.fromCharCode(c.charCodeAt(0) - shift)).join("");
  const objects = [];
  const add = (body) => {
    objects.push(body);
    return objects.length;
  };
  const catalog = add(null);
  const pagesId = add(null);
  let unicode = "";
  if (toUnicode) {
    const cmap = toUnicodeCMap(toUnicode);
    unicode = ` /ToUnicode ${add(`<< /Length ${Buffer.byteLength(cmap, "latin1")} >>\nstream\n${cmap}\nendstream`)} 0 R`;
  }
  const font = add(`<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding${unicode} >>`);
  const kids = [];
  for (const lines of pages) {
    const ops = ["BT", `/F1 ${size} Tf`];
    for (const { x, top, text } of lines) {
      const baseline = height - top - size * 0.8;
      let column = 0;
      for (const part of text.split(/( +)/)) {
        if (part && !part.startsWith(" ")) ops.push(`1 0 0 1 ${(x + column * advance).toFixed(2)} ${baseline.toFixed(2)} Tm (${escape(encode(part))}) Tj`);
        column += part.length;
      }
    }
    ops.push("ET");
    const stream = ops.join("\n");
    const content = add(`<< /Length ${Buffer.byteLength(stream, "latin1")} >>\nstream\n${stream}\nendstream`);
    kids.push(add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${width} ${height}] /Resources << /Font << /F1 ${font} 0 R >> >> /Contents ${content} 0 R >>`));
  }
  objects[catalog - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
  objects[pagesId - 1] = `<< /Type /Pages /Kids [${kids.map((kid) => `${kid} 0 R`).join(" ")}] /Count ${kids.length} >>`;
  let out = "%PDF-1.4\n";
  const offsets = [];
  objects.forEach((body, index) => {
    offsets.push(Buffer.byteLength(out, "latin1"));
    out += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = Buffer.byteLength(out, "latin1");
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("")}`;
  out += `trailer\n<< /Size ${objects.length + 1} /Root ${catalog} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, "latin1");
}
