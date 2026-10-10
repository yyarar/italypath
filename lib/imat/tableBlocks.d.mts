// lib/imat/tableBlocks.mjs icin tipler (ayni modul hem Next hem Node betikleri tarafindan
// dogrudan ice aktarildigi icin JS olarak yazildi).

export interface TextBlock {
  kind: "text";
  /** Metin aynen; komsu metin bloklari `\n\n` ile birlesmis halde. */
  value: string;
}

export interface TableBlock {
  kind: "table";
  /** Ilk satir baslik; her satir kendi hucre sayisini korur (bos hucre bos dizgi). */
  rows: string[][];
}

export type PromptBlock = TextBlock | TableBlock;

/** Tek satirlik metin formul disinda ` | ` tasiyorsa hucreleri, degilse null. */
export function splitTableRow(text: string): string[] | null;

export function splitTableBlocks(text: string): PromptBlock[];
