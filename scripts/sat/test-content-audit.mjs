import assert from "node:assert/strict";
import { auditRow, findMarkers, katexIssues, mathWordResidue } from "./lib/content-audit.mjs";

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

console.log("test-content-audit PASS");
