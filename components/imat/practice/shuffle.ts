import type { ImatQuestion } from "@/lib/imat/types";

// Tohumlu (seed) karistirma: ayni tohum ayni sirayi verir. mulberry32, kucuk ve yeterince duzgun.
function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = state;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

// Fisher-Yates; girdiyi degistirmez, yeni dizi doner.
export function shuffleSeeded<T>(items: readonly T[], seed: number): T[] {
  const random = mulberry32(seed);
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

// Konu pratigi sirasi: once cozulmemis sorular, sonra daha once cozulenler; her grup ayri karistirilir.
// Girdi (onbellekteki dizi) degismez.
export function orderPracticeQuestions(
  questions: readonly ImatQuestion[],
  isAnswered: (questionId: string) => boolean,
  seed: number,
): ImatQuestion[] {
  const unanswered = questions.filter((question) => !isAnswered(question.id));
  const answered = questions.filter((question) => isAnswered(question.id));
  return [...shuffleSeeded(unanswered, seed), ...shuffleSeeded(answered, seed + 1)];
}
