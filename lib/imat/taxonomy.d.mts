// lib/imat/taxonomy.mjs icin tipler (ayni modul hem Next hem Node betikleri tarafindan
// dogrudan ice aktarildigi icin JS olarak yazildi).
import type { ImatSection } from "./types";

export type ImatField = "physics" | "math";

export interface ImatTaxonomyTopic {
  section: ImatSection;
  slug: string;
  /** Ingilizce etiket. */
  label: string;
  /** Yalniz physics-math alt konularinda (`physics-math-general` haric). */
  field?: ImatField;
}

/** Kagit sirasiyla bes bolum. */
export const SECTIONS: readonly ImatSection[];

/** Alt konulari `field` tasiyan bolumler ve gecerli alan degerleri. */
export const SECTION_FIELD: Readonly<Partial<Record<ImatSection, readonly ImatField[]>>>;

/** 45 alt konu: bolum sirasi, sonra bolum icindeki sira; her bolumun `<bolum>-general` kutusu dahil. */
export const TOPICS: readonly Readonly<ImatTaxonomyTopic>[];

export function topicsForSection(section: ImatSection): Readonly<ImatTaxonomyTopic>[];

/** Bilinmeyen slug icin undefined. */
export function findTopic(slug: string): Readonly<ImatTaxonomyTopic> | undefined;

/** `<bolum>-general` kutusunun slug'i; bilinmeyen bolumde hata firlatir. */
export function generalSlug(section: ImatSection): string;

export const MOCK_YEARS: readonly number[];

/** Bir deneme kagidinin bolum basina soru sayisi (toplam 60). */
export const MOCK_SECTION_COUNTS: Readonly<Record<ImatSection, number>>;

/** Kagit sirasi (SECTIONS ile ayni). */
export const MOCK_SECTION_ORDER: readonly ImatSection[];
