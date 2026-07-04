// SPR (sayi girisli) cevap normalizasyonu ve eslestirme.
// Kabul edilen yazimlar: tam sayi (-12), ondalik (0.75 / .75), kesir (3/4).
export function parseNumeric(value: string): number | null {
  const trimmed = value.trim().replace(",", ".");
  if (!trimmed) return null;

  const fractionMatch = trimmed.match(/^(-?\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/);
  if (fractionMatch) {
    const denominator = Number(fractionMatch[2]);
    if (denominator === 0) return null;
    return Number(fractionMatch[1]) / denominator;
  }

  const numberMatch = trimmed.match(/^-?(?:\d+\.?\d*|\.\d+)$/);
  if (!numberMatch) return null;
  return Number(trimmed);
}

const TOLERANCE = 1e-4;

export function isSprAnswerCorrect(input: string, accepted: string[]): boolean {
  const inputValue = parseNumeric(input);
  if (inputValue === null) return false;

  return accepted.some((candidate) => {
    const candidateValue = parseNumeric(candidate);
    return candidateValue !== null && Math.abs(candidateValue - inputValue) <= TOLERANCE;
  });
}

export function isMcqAnswerCorrect(selected: string, accepted: string[]): boolean {
  return accepted.includes(selected);
}
