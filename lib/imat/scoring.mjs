// IMAT deneme puanlamasi: tek kaynak. Ayni modulu hem site hem betikler dogrudan ice aktarir
// (tipler scoring.d.mts). Sunucu teslimde skoru bu fonksiyonla hesaplar.
//
// Sozlesme: 60 soru, 100 dakika; dogru +1,5, yanlis -0,4, bos 0; en yuksek puan 90.
import { SECTIONS } from "./taxonomy.mjs";

export const EXAM_QUESTION_COUNT = 60;
export const EXAM_DURATION_MINUTES = 100;
export const POINTS_CORRECT = 1.5;
export const POINTS_WRONG = -0.4;
export const POINTS_BLANK = 0;
export const MAX_SCORE = 90;
export const CHOICE_KEYS = Object.freeze(["A", "B", "C", "D", "E"]);

function answerFor(answers, questionId) {
  return answers && typeof answers === "object" && Object.hasOwn(answers, questionId) ? answers[questionId] : undefined;
}

// Yalnizca verilen soru kimliklerine ait ve A-E harfi olan yanitlar kalir.
export function normalizeAnswers(answers, questionIds) {
  const result = {};
  for (const id of questionIds) {
    const letter = answerFor(answers, id);
    if (CHOICE_KEYS.includes(letter)) result[id] = letter;
  }
  return result;
}

// Yanlis: yalnizca A-E icindeki ve dogru olmayan harf. Geri kalan her sey (yok, gecersiz) bos sayilir.
export function scoreExam(questions, answers) {
  let correctCount = 0;
  let wrongCount = 0;
  let blankCount = 0;
  const sectionBreakdown = Object.fromEntries(SECTIONS.map((section) => [section, { correct: 0, wrong: 0, blank: 0 }]));
  for (const question of questions) {
    const letter = answerFor(answers, question.id);
    const outcome = !CHOICE_KEYS.includes(letter) ? "blank" : letter === question.correctAnswer ? "correct" : "wrong";
    if (outcome === "correct") correctCount += 1;
    else if (outcome === "wrong") wrongCount += 1;
    else blankCount += 1;
    if (sectionBreakdown[question.section]) sectionBreakdown[question.section][outcome] += 1;
  }
  const raw = POINTS_CORRECT * correctCount + POINTS_WRONG * wrongCount + POINTS_BLANK * blankCount;
  return { correctCount, wrongCount, blankCount, score: Math.round(raw * 100) / 100, sectionBreakdown };
}

// Teslim zamani son tarihten sonraysa gec sayilir (esitlik gec degildir).
export function isLate(submittedAtIso, deadlineAtIso) {
  return Date.parse(submittedAtIso) > Date.parse(deadlineAtIso);
}
