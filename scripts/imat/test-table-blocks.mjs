// IMAT soru metni tablo bloklari testi (STATUS #103 (a), 2026-10-10): lib/imat/tableBlocks.mjs saf islevleri.
// Ag, PDF ve veritabani yok; fikstur metinleri uydurmadir (hicbir kagittan parca yok: fener, kavanoz, ada adlari).
//
//   PATH=/usr/local/bin:$PATH node scripts/imat/test-table-blocks.mjs   (npm run test:imat-table)
import assert from "node:assert/strict";

import { splitTableBlocks, splitTableRow } from "../../lib/imat/tableBlocks.mjs";

// --- yalniz paragraf: tek metin blogu, metin birebir (tek `\n` ve `\n\n` korunur) ---------------------------------
{
  const text = "The lantern keeper counts jars.\nEach jar holds sand.\n\nHow many jars are left?";
  assert.deepEqual(splitTableBlocks(text), [{ kind: "text", value: text }]);
  assert.deepEqual(splitTableBlocks(""), [], "bos metin blok uretmez");
}

// --- baslikli tablo: ilk satir baslik, satirlar ` | ` ile hucrelere ayrilir ------------------------------------------
{
  const text = "Island | Jars | Lanterns\nNorth | 12 | 3\nSouth | 7 | 5";
  assert.deepEqual(splitTableBlocks(text), [
    {
      kind: "table",
      rows: [
        ["Island", "Jars", "Lanterns"],
        ["North", "12", "3"],
        ["South", "7", "5"],
      ],
    },
  ]);
}

// --- bos sol ust kose: satir ` | ` ile baslar, ilk hucre bos ---------------------------------------------------------
{
  const text = " | Monday | Tuesday\nJars | 4 | 6";
  assert.deepEqual(splitTableBlocks(text), [{ kind: "table", rows: [["", "Monday", "Tuesday"], ["Jars", "4", "6"]] }]);
}

// --- duzensiz satir: her satir kendi hucre sayisini korur; ortada ve sonda bos hucre kalir ---------------------------
{
  const text = "Fen | Ada | Kavanoz | Kum\nmavi | 2\nyesil |  | 5 | ";
  assert.deepEqual(splitTableBlocks(text), [
    { kind: "table", rows: [["Fen", "Ada", "Kavanoz", "Kum"], ["mavi", "2"], ["yesil", "", "5", ""]] },
  ]);
}

// --- yalniz ` | ` satiri (komsusu tablo satiri degil) metindir: blok icinde de, kendi blogunda da ----------------------
{
  const mixed = "Jar count per island\nNorth | South\n\nWhich island has more jars?";
  assert.deepEqual(splitTableBlocks(mixed), [{ kind: "text", value: mixed }]);
  const single = "Which row is right?\n\nNorth | South | East\n\nCount the jars first.";
  assert.deepEqual(splitTableBlocks(single), [{ kind: "text", value: single }]);
  const between = "Lantern log\nNorth | South\nThe keeper counted twice.";
  assert.deepEqual(splitTableBlocks(between), [{ kind: "text", value: between }]);
}

// --- blok icinde ust uste en az iki ` | ` satiri tablodur; oncesi/sonrasi ayni blokta metin kalir (`\n` ile) -----------
{
  assert.deepEqual(splitTableBlocks("Jar count per island\nIsland | Jars\nNorth | 12"), [
    { kind: "text", value: "Jar count per island" },
    { kind: "table", rows: [["Island", "Jars"], ["North", "12"]] },
  ]);
  assert.deepEqual(splitTableBlocks("Tide table\nsecond caption line\n | high | low\nMonday | 4 | 9\nNote: in metres.\nRounded."), [
    { kind: "text", value: "Tide table\nsecond caption line" },
    { kind: "table", rows: [["", "high", "low"], ["Monday", "4", "9"]] },
    { kind: "text", value: "Note: in metres.\nRounded." },
  ]);
  assert.deepEqual(splitTableBlocks("The keeper wrote:\n\nLantern prices\nSize | Price\nsmall | \\$3\n\nWhich is cheapest?"), [
    { kind: "text", value: "The keeper wrote:\n\nLantern prices" },
    { kind: "table", rows: [["Size", "Price"], ["small", "\\$3"]] },
    { kind: "text", value: "Which is cheapest?" },
  ], "onceki bloktaki metin ile tablonun ustundeki metin `\\n\\n` ile birlesir");
  assert.deepEqual(splitTableBlocks("A | B\n1 | 2\nbetween the tables\nC | D\n3 | 4"), [
    { kind: "table", rows: [["A", "B"], ["1", "2"]] },
    { kind: "text", value: "between the tables" },
    { kind: "table", rows: [["C", "D"], ["3", "4"]] },
  ], "ayni blokta metin satiriyla ayrilan iki tablo");
}

// --- metnin SON satiri yalniz ` | ` satiriysa yalniz baslikli tablo (siklar tablonun satirlaridir) -----------------------
{
  assert.deepEqual(splitTableBlocks("Which row is right?\n\nNorth | South | East"), [
    { kind: "text", value: "Which row is right?" },
    { kind: "table", rows: [["North", "South", "East"]], headerOnly: true },
  ]);
  assert.deepEqual(splitTableBlocks("Which row is right?\n\nJar count\nNorth | South"), [
    { kind: "text", value: "Which row is right?\n\nJar count" },
    { kind: "table", rows: [["North", "South"]], headerOnly: true },
  ], "ustunde baslik satiri olan son satir");
  assert.deepEqual(splitTableBlocks(" | Monday | Tuesday"), [{ kind: "table", rows: [["", "Monday", "Tuesday"]], headerOnly: true }]);
  assert.deepEqual(splitTableBlocks("Island | Jars\nNorth | 12"), [{ kind: "table", rows: [["Island", "Jars"], ["North", "12"]] }], "iki satirlik tablo yalniz baslik degil");
  const notLast = "North | South\n\nWhich row is right?";
  assert.deepEqual(splitTableBlocks(notLast), [{ kind: "text", value: notLast }], "son satir degilse yalniz satir metin kalir");
}

// --- hucre icindeki formul bozulmaz; formul icindeki ` | ` hucre ayirmaz, `\$` gercek dolar kalir --------------------
{
  const text = "Quantity | Value\n$\\frac{1}{2}x^2$ | \\$2.50\n$| -3 | = 3$ | H₂O <i>sand</i>";
  assert.deepEqual(splitTableBlocks(text), [
    {
      kind: "table",
      rows: [
        ["Quantity", "Value"],
        ["$\\frac{1}{2}x^2$", "\\$2.50"],
        ["$| -3 | = 3$", "H₂O <i>sand</i>"],
      ],
    },
  ]);
  const onlyInMath = "First line $| a | b |$ here\nSecond line $| c | d |$ here";
  assert.deepEqual(splitTableBlocks(onlyInMath), [{ kind: "text", value: onlyInMath }], "` | ` yalniz formul icindeyse satir tablo satiri degil");
}

// --- tablonun iki yanindaki metin `\n\n` paragraf boslugunu korur; komsu metin bloklari yeniden birlesir -------------
{
  const intro = "The keeper wrote this.\n\nShe checked twice.";
  const outro = "How many lanterns?\nGive the total.\n\nIgnore the tide.";
  const text = `${intro}\n\nIsland | Lanterns\nNorth | 3\n\n${outro}`;
  assert.deepEqual(splitTableBlocks(text), [
    { kind: "text", value: intro },
    { kind: "table", rows: [["Island", "Lanterns"], ["North", "3"]] },
    { kind: "text", value: outro },
  ]);
  const twoTables = "A | B\n1 | 2\n\nC | D\n3 | 4";
  assert.deepEqual(splitTableBlocks(twoTables).map((block) => block.kind), ["table", "table"], "arka arkaya iki tablo ayri kalir");
}

// --- sik satiri: tek satir ve ` | ` iceriyorsa hucreler, degilse null ------------------------------------------------
{
  assert.deepEqual(splitTableRow("12 | 7 | 5"), ["12", "7", "5"]);
  assert.deepEqual(splitTableRow(" | 4"), ["", "4"]);
  assert.deepEqual(splitTableRow("$\\frac{1}{2}$ | \\$3"), ["$\\frac{1}{2}$", "\\$3"]);
  assert.equal(splitTableRow("Twelve jars"), null);
  assert.equal(splitTableRow("$| -3 | = 3$"), null, "formul icindeki ` | ` sik satiri yapmaz");
  assert.equal(splitTableRow("12 | 7\n5 | 4"), null, "cok satirli sik tek satir degil");
}

console.log("test:imat-table OK");
