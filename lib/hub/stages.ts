export const STAGE_IDS = [
  "discovery",
  "shortlist",
  "documents",
  "application",
  "result",
] as const;

export type HubStageId = (typeof STAGE_IDS)[number];

export const DEFAULT_STAGE: HubStageId = "discovery";

export type StageState = "done" | "active" | "upcoming";

export function isValidStage(value: unknown): value is HubStageId {
  return (
    typeof value === "string" &&
    (STAGE_IDS as readonly string[]).includes(value)
  );
}

export function getStageIndex(id: HubStageId): number {
  return STAGE_IDS.indexOf(id);
}

export function getStageState(target: HubStageId, current: HubStageId): StageState {
  const t = getStageIndex(target);
  const c = getStageIndex(current);
  if (t < c) return "done";
  if (t === c) return "active";
  return "upcoming";
}
