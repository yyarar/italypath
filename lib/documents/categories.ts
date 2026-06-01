// Belge Cüzdanı — sabit kategori (tür) kayıt defteri.
// DB'de KEY saklanır (ör. "academic"); görünen etiketler translations'tan gelir.

export const DOCUMENT_CATEGORY_ORDER = [
  "identity",
  "academic",
  "language",
  "letters",
  "financial",
  "other",
] as const;

export type DocumentCategoryKey = (typeof DOCUMENT_CATEGORY_ORDER)[number];

const KNOWN_KEYS: readonly string[] = DOCUMENT_CATEGORY_ORDER;

/** NULL / bilinmeyen / eski kayıtlar "other" altında toplanır. */
export function resolveCategoryKey(raw: string | null | undefined): DocumentCategoryKey {
  return raw && KNOWN_KEYS.includes(raw) ? (raw as DocumentCategoryKey) : "other";
}
