// XP: dogru basina 10, yanlis basina 2 (caba az odullendirilir)
export function computeXp(totalCorrect: number, totalSolved: number): number {
  const wrong = Math.max(0, totalSolved - totalCorrect);
  return totalCorrect * 10 + wrong * 2;
}

// L seviyesine ULASMAK icin gereken kumulatif XP = 50 * L * (L - 1)
// (L2=100, L3=300, L4=600, L5=1000; L->L+1 boslugu = 100*L)
export function levelFromXp(xp: number): number {
  let level = 1;
  while (50 * (level + 1) * level <= xp) level += 1;
  return level;
}

export interface LevelProgress {
  level: number;
  xpIntoLevel: number;
  xpForNext: number;
  xpToNext: number;
  progressPct: number;
}

export function levelProgress(xp: number): LevelProgress {
  const level = levelFromXp(xp);
  const floorXp = 50 * level * (level - 1);
  const ceilXp = 50 * (level + 1) * level;
  const xpIntoLevel = xp - floorXp;
  const xpForNext = ceilXp - floorXp;
  return {
    level,
    xpIntoLevel,
    xpForNext,
    xpToNext: xpForNext - xpIntoLevel,
    progressPct: Math.round((xpIntoLevel / xpForNext) * 100),
  };
}
