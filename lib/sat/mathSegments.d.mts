// lib/sat/mathSegments.mjs icin tipler (ayni modul hem Next hem Node betikleri tarafindan
// dogrudan ice aktarildigi icin JS olarak yazildi).

export type MathSegmentKind = "text" | "inline" | "display";

export interface MathSegment {
  kind: MathSegmentKind;
  /** Metin parcasinda gorunen yazi; formul parcasinda sinirlayicisiz LaTeX. */
  value: string;
}

export function splitMathText(text: string): MathSegment[];

export function mapTextOutsideMath(text: string, fn: (textPart: string) => string): string;
