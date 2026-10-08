import assert from "node:assert/strict";
import { SECTIONS, TOPICS, findTopic, generalSlug, topicsForSection, MOCK_SECTION_COUNTS } from "../../lib/imat/taxonomy.mjs";
import { scoreExam, normalizeAnswers, isLate, MAX_SCORE, EXAM_QUESTION_COUNT } from "../../lib/imat/scoring.mjs";
import { createExamState, examReducer, mergeDrafts, unansweredCount } from "../../lib/imat/examState.mjs";

// Taksonomi
assert.deepEqual(SECTIONS, ["reading-general", "logic", "biology", "chemistry", "physics-math"]);
assert.equal(new Set(TOPICS.map((t) => t.slug)).size, TOPICS.length, "slug benzersiz");
for (const s of SECTIONS) assert.ok(findTopic(generalSlug(s)), `${s} general kutusu`);
assert.equal(topicsForSection("biology").length, 13);
assert.equal(Object.values(MOCK_SECTION_COUNTS).reduce((a, b) => a + b, 0), EXAM_QUESTION_COUNT);
for (const t of topicsForSection("physics-math")) if (t.slug !== "physics-math-general") assert.ok(["physics", "math"].includes(t.field));

// Puanlama: 60 soru, 40 dogru, 15 yanlis, 5 bos -> 60 - 6 = 54.00
const qs = Array.from({ length: 60 }, (_, i) => ({ id: `q${i}`, section: SECTIONS[i % 5], correctAnswer: "A" }));
const answers = {};
qs.slice(0, 40).forEach((q) => (answers[q.id] = "A"));
qs.slice(40, 55).forEach((q) => (answers[q.id] = "B"));
const r = scoreExam(qs, answers);
assert.deepEqual([r.correctCount, r.wrongCount, r.blankCount, r.score], [40, 15, 5, 54]);
assert.equal(Object.keys(r.sectionBreakdown).length, 5);
assert.equal(scoreExam(qs, Object.fromEntries(qs.map((q) => [q.id, "A"]))).score, MAX_SCORE);
assert.equal(scoreExam(qs, Object.fromEntries(qs.map((q) => [q.id, "B"]))).score, -24);
assert.equal(scoreExam([{ id: "a", section: "logic", correctAnswer: "C" }], { a: "C" }).score, 1.5);
assert.deepEqual(normalizeAnswers({ a: "A", b: "x", c: "B", d: 1 }, ["a", "b", "zz"]), { a: "A" });
assert.equal(isLate("2026-10-08T12:00:01Z", "2026-10-08T12:00:00Z"), true);
assert.equal(isLate("2026-10-08T11:59:59Z", "2026-10-08T12:00:00Z"), false);

// Deneme durumu
let st = createExamState({ sessionId: "s1", questionIds: ["a", "b", "c"] });
st = examReducer(st, { type: "answer", questionId: "a", letter: "D" });
st = examReducer(st, { type: "toggleFlag", questionId: "b" });
st = examReducer(st, { type: "next" });
assert.deepEqual([st.answers.a, st.flags.b, st.index], ["D", true, 1]);
st = examReducer(st, { type: "goto", index: 99 });
assert.equal(st.index, 2, "index sinirlanir");
st = examReducer(st, { type: "clear", questionId: "a" });
assert.equal(st.answers.a, undefined);
assert.equal(unansweredCount(["a", "b", "c"], { b: "A" }), 2);
assert.deepEqual(mergeDrafts({ answers: { a: "A" }, savedAt: 5 }, { answers: { a: "B" }, savedAt: 9 }).answers, { a: "B" });
assert.deepEqual(mergeDrafts({ answers: { a: "A" }, savedAt: 9 }, { answers: { a: "B" }, savedAt: 9 }).answers, { a: "A" });
console.log("test:imat-scoring OK");
