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

/** Satir ici isaret etiketleri (RW metin sozlesmesi): `<u>`, `</u>`, `<i>`, `</i>`. */
export const MARK_TAGS: readonly string[];

export interface RichSegment extends MathSegment {
  /** Formul parcalarinda her zaman false. */
  italic: boolean;
  underline: boolean;
}

export function splitRichText(text: string): RichSegment[];

export function stripMarks(text: string): string;

/** Okuma ve Yazma pasaj satiri turu (splitPassageBlocks). */
export type PassageLineKind = "plain" | "label" | "bullet" | "verse";

export interface PassageLine {
  /** Satirin isaretli metni; `bullet` satirinda bastaki `• ` dahil. */
  text: string;
  kind: PassageLineKind;
}

export interface PassageBlock {
  /** Bir paragrafin (`\n\n` ile ayrilmis) satirlari (`\n` ile ayrilmis). */
  lines: PassageLine[];
}

export function splitPassageBlocks(text: string): PassageBlock[];
