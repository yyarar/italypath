export type BadgeTrack = "effort" | "mastery" | "streak";

export interface Badge {
  id: string;
  track: BadgeTrack;
  unlocked: boolean;
  current: number;
  target: number;
}

export interface BadgeInputs {
  totalSolved: number;
  totalCorrect: number;
  goldCount: number;
  domainFullyGold: boolean;
  longestStreak: number;
}

export function evaluateBadges(i: BadgeInputs): Badge[] {
  const t = (id: string, track: BadgeTrack, current: number, target: number): Badge => ({
    id,
    track,
    current,
    target,
    unlocked: current >= target,
  });

  return [
    t("isinma", "effort", i.totalSolved, 25),
    t("maratoncu", "effort", i.totalSolved, 250),
    t("binSoru", "effort", i.totalSolved, 1000),
    t("ilkAltin", "mastery", i.goldCount, 1),
    t("altinAvcisi", "mastery", i.goldCount, 5),
    { id: "bolumUstasi", track: "mastery", current: i.domainFullyGold ? 1 : 0, target: 1, unlocked: i.domainFullyGold },
    t("alevlendi", "streak", i.longestStreak, 3),
    t("haftalik", "streak", i.longestStreak, 7),
    t("aylik", "streak", i.longestStreak, 30),
  ];
}
