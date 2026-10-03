import assert from "node:assert/strict";
import { MARK_TAGS, mapTextOutsideMath, splitMathText, splitRichText, stripMarks } from "../../lib/sat/mathSegments.mjs";
import {
  auditRow,
  findMarkers,
  fixLiteralNewlineEscapes,
  katexIssues,
  literalNewlineEscapeCount,
  markIssues,
  mathSegments,
  mathWordResidue,
} from "./lib/content-audit.mjs";

// --- Formul ayirma kurali (site ile ortak modul; STATUS #100) --------------------------------
// Eski kural (yalniz tek dolar): cift dolar gormeyen her metinde yeni kural ayni sonucu vermeli.
const legacySplit = (text) =>
  String(text)
    .replaceAll("\\$", "\u0000")
    .split(/(\$[^$]+\$)/g)
    .filter((part) => part !== "")
    .map((part) =>
      part.startsWith("$") && part.endsWith("$") && part.length > 2
        ? { kind: "inline", value: part.slice(1, -1).replaceAll("\u0000", "\\$") }
        : { kind: "text", value: part.replaceAll("\u0000", "$") }
    );
for (const sample of [
  "What is $2+2$?",
  "It costs \\$2.00 and $x$ is \\$3.",
  "$a$$b$ back to back, then $c$",
  "No math at all.\nSecond line.",
  "",
  "Lone $ sign and $y=\\frac{1}{2}$",
]) {
  assert.deepEqual(splitMathText(sample), legacySplit(sample), `tek dolarli metin eski kuralla ayni ayrilmali: ${sample}`);
}

assert.deepEqual(
  splitMathText("Area is:\n$$A = \\pi r^2$$\nHere $r = 5$ holds."),
  [
    { kind: "text", value: "Area is:" },
    { kind: "display", value: "A = \\pi r^2" },
    { kind: "text", value: "Here " },
    { kind: "inline", value: "r = 5" },
    { kind: "text", value: " holds." },
  ],
  "cift dolar ayri satir formuludur; sonrasinda metin ile formul yer degistirmez, cevresindeki tek satir sonu atilir"
);
assert.deepEqual(
  splitMathText("so $$x = 1$$ and \\$5"),
  [
    { kind: "text", value: "so " },
    { kind: "display", value: "x = 1" },
    { kind: "text", value: " and $5" },
  ],
  "satir ortasindaki cift dolar da ayri satir formuludur; kacisli dolar metin kalir"
);
assert.deepEqual(
  splitMathText("A\n\n$$x$$\n\nB").map((segment) => segment.value),
  ["A\n", "x", "\nB"],
  "bos satirla ayrilmis formulde yalniz birer satir sonu atilir"
);
assert.deepEqual(mathSegments("Before $$x+1$$ after $y$."), ["x+1", "y"], "tarama iki tur formulu de gorur");
assert.equal(katexIssues("Before $$\\frac{a}{b}$$ after $y$.").length, 0, "gecerli cift dolarli formul temiz");
assert.ok(katexIssues("Bad $$\\frak{$$ here").length > 0, "bozuk cift dolarli formul yakalanmali");
for (const sample of ["plain", "a $x$ b $$y$$ c \\$4", "$a$$b$", "line\nbreak $$z$$\n"]) {
  assert.equal(mapTextOutsideMath(sample, (part) => part), sample, `degistirmeyen esleme metni aynen geri vermeli: ${sample}`);
}

// --- Harf olarak yazilmis satir sonu (STATUS #99) -----------------------------------------------
const brokenExplanation = "The radius is $5$.\\n\\nChoice A is incorrect because $a \\ne b$ and $\\nu = 2$.\\nChoice B: $x \\\\n+1$.";
assert.equal(literalNewlineEscapeCount(brokenExplanation), 3, "formul disindaki uc ham satir sonu sayilmali");
assert.equal(
  fixLiteralNewlineEscapes(brokenExplanation),
  "The radius is $5$.\n\nChoice A is incorrect because $a \\ne b$ and $\\nu = 2$.\nChoice B: $x \\\\n+1$.",
  "ham satir sonu gercek satir sonuna doner; formul icindeki \\ne, \\nu ve \\\\n degismez"
);
assert.deepEqual(
  mathSegments(fixLiteralNewlineEscapes(brokenExplanation)),
  mathSegments(brokenExplanation),
  "duzeltme formullere dokunmaz"
);
assert.equal(literalNewlineEscapeCount(fixLiteralNewlineEscapes(brokenExplanation)), 0, "duzeltme sonrasi ham satir sonu kalmaz");
assert.equal(literalNewlineEscapeCount("Clean text with $a \\neq b$.\nReal newline."), 0, "temiz aciklama sayilmaz");
assert.equal(fixLiteralNewlineEscapes("Clean $a \\neq b$.\nOk."), "Clean $a \\neq b$.\nOk.", "temiz aciklama degismez");

// Gercek pozitifler (canli bozuk kayitlardan alinan desenler)
assert.ok(findMarkers("$(x + 2 close ( \\times (x + 3 close ($").length > 0, "close-glued yakalanmali");
assert.ok(findMarkers("$2comma3$ and $-2comma3$").length > 0, "comma yakalanmali");
assert.ok(findMarkers("$t = the fraction with numerator v anddenominator 331.3$").length > 0, "fraction yakalanmali");
assert.ok(findMarkers("$y = (x - 1 close ( squared$").length > 0, "squared yakalanmali");
assert.ok(findMarkers("v = 331.3 + 0.606\\timest").some((h) => h.family === "bad-latex"), "\\timest yakalanmali");
assert.ok(mathWordResidue("$1andy=3$").length > 0, "math ici kelime artigi yakalanmali");

// Dogal Ingilizce false-positive olmamali
assert.equal(findMarkers("Which value is closest to the mean?").length, 0, "closest temiz");
assert.equal(findMarkers("The object accelerates at 5 meters per second squared.").length, 0, "per second squared temiz");
assert.equal(findMarkers("How close is the estimate to the actual value?").length, 0, "duz close temiz");
assert.equal(mathWordResidue("$55\\text{centimeters}\\left(\\text{cm}\\right)$").length, 0, "\\text govdesi temiz");
assert.equal(mathWordResidue("$45\\pi$").length, 0, "komutlar temiz");
assert.equal(mathWordResidue("square $ABCD$ and parallelogram $PQRS$").length, 0, "geometri etiketleri temiz");

// KaTeX kontrolu
assert.equal(katexIssues("A cylinder has volume $45\\pi$.").length, 0, "gecerli LaTeX temiz");
assert.ok(katexIssues("Broken $\\frak{$ math").length + findMarkers("Broken $\\frak{$ math").length > 0, "bozuk LaTeX yakalanmali");

// auditRow butunlesik
assert.deepEqual(auditRow({ prompt: "What is $2+2$?", choices: { A: "$4$", B: "$5$", C: "$6$", D: "$7$" } }), [], "temiz soru bos donmeli");

// --- Satir ici isaretler (RW metin sozlesmesi, plan 2026-10-03) ----------------------------------
const seg = (kind, value, marks = "") => ({ kind, value, italic: marks.includes("i"), underline: marks.includes("u") });
assert.deepEqual(MARK_TAGS, ["<u>", "</u>", "<i>", "</i>"], "dort etiket");
assert.deepEqual(splitRichText("Plain text, no marks."), [seg("text", "Plain text, no marks.")], "duz metin tek parca");
assert.deepEqual(
  splitRichText("The <u>underlined portion</u> is key."),
  [seg("text", "The "), seg("text", "underlined portion", "u"), seg("text", " is key.")],
  "tek isaret"
);
assert.deepEqual(
  splitRichText("<u>see <i>Ulysses</i> now</u>."),
  [seg("text", "see ", "u"), seg("text", "Ulysses", "ui"), seg("text", " now", "u"), seg("text", ".")],
  "iki ayri tur ic ice"
);
assert.deepEqual(
  splitRichText("If $a<b$ and $x<i>y$ then <i>c</i>"),
  [seg("text", "If "), seg("inline", "a<b"), seg("text", " and "), seg("inline", "x<i>y"), seg("text", " then "), seg("text", "c", "i")],
  "formul icindeki < isaret degil; formul parcasi isaret tasimaz"
);
assert.deepEqual(
  splitRichText("<i>a $x$ b</i> c"),
  [seg("text", "a ", "i"), seg("inline", "x"), seg("text", " b", "i"), seg("text", " c")],
  "italik formulun iki yaninda surer"
);
assert.deepEqual(splitRichText("x <b>y</b> a<U>b"), [seg("text", "x <b>y</b> a<U>b")], "dort etiket disindaki < duz metin");
for (const sample of ["<u>never closed", "stray</i> close", "<i><i>double</i>", "</u></i><u>", "<u>a\n$$x$$\n</i>b"]) {
  assert.doesNotThrow(() => splitRichText(sample), `dengesiz girdi cokmemeli: ${sample}`);
}
assert.deepEqual(splitRichText("<u>never closed"), [seg("text", "never closed", "u")], "kapanmayan isaret sonda kapanmis sayilir");
assert.deepEqual(splitRichText("stray</i> close"), [seg("text", "stray close")], "karsiliksiz kapanis atilir");
assert.deepEqual(splitRichText("a<u></u>b"), [seg("text", "ab")], "ayni isaretli komsu parcalar birlesir");
for (const sample of [
  "What is $2+2$?",
  "It costs \\$2.00 and $x$ is \\$3.",
  "$a$$b$ back to back, then $c$",
  "No math at all.\nSecond line.",
  "",
  "Area is:\n$$A = \\pi r^2$$\nHere $r = 5$ holds.",
  "A\n\n$$x$$\n\nB",
]) {
  assert.deepEqual(
    splitRichText(sample).map(({ kind, value }) => ({ kind, value })),
    splitMathText(sample),
    `isaretsiz metinde splitMathText ile ayni: ${sample}`
  );
}
assert.equal(
  stripMarks("A <u>b</u> <i>c</i> <b>d</b> <U>e $x<i>y$ \\$5\n"),
  "A b c <b>d</b> <U>e $x<i>y$ \\$5\n",
  "stripMarks yalniz dort etiketi siler; formul ve diger yazi aynen kalir"
);
assert.equal(stripMarks("No marks, $a<b$ and \\$4."), "No marks, $a<b$ and \\$4.", "isaretsiz metin degismez");

// markIssues: bes sorun turu
const issueKinds = (text) => markIssues(text).map((issue) => issue.split(":")[0]);
for (const clean of [
  "Plain sentence.",
  "The <u>quick</u> fox read <u><i>Ulysses</i></u> twice.",
  "<i>line one</i>\n<i>line two</i>",
  "<i>a $x$ b</i>",
  "Compare $a<b$ and $x<i>y$ freely.",
  "Costs \\$5 < \\$6.",
]) {
  assert.deepEqual(markIssues(clean), [], `temiz: ${clean}`);
}
assert.deepEqual(issueKinds("<u>never closed"), ["mark-unbalanced"], "kapanmamis isaret");
assert.deepEqual(issueKinds("stray</i> close"), ["mark-unbalanced"], "karsiliksiz kapanis");
assert.deepEqual(issueKinds("<u>a <u>b</u> c</u>"), ["mark-nested"], "ayni tur ic ice");
assert.deepEqual(issueKinds("x <i></i> y"), ["mark-empty"], "bos isaret");
assert.deepEqual(issueKinds("x <u> </u> y"), ["mark-empty"], "yalniz bosluk tasiyan isaret bos sayilir");
assert.deepEqual(issueKinds("<i>line one\nline two</i>"), ["mark-newline"], "satir sonunu asan isaret");
for (const tagLike of ["<b>bold</b>", "a </em> b", "<br>", "the <u class=\"x\">", "the <u word", "<U>caps</U>"]) {
  assert.ok(issueKinds(tagLike).includes("mark-tag-like"), `etikete benzeyen yazi: ${tagLike}`);
}

console.log("test-content-audit PASS");
