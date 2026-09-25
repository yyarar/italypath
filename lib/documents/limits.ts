// Belge Cüzdanı yükleme kuralları. supabase/rls_hardening.sql içindeki
// documents deposu ve user_documents kurallarıyla aynı olmalı;
// scripts/check-documents-ui.mjs iki tarafı karşılaştırır.

export const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024;

export const MAX_DOCUMENT_FILE_NAME_LENGTH = 255;

// Depoya yalnız bu türler girer; dosya uzantısı da buradan gelir
// (kullanıcının dosya adından değil).
export const DOCUMENT_MIME_EXTENSIONS: ReadonlyArray<readonly [string, string]> = [
  ["application/pdf", "pdf"],
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/heic", "heic"],
  ["image/heif", "heif"],
];

const EXTENSION_BY_MIME = new Map(DOCUMENT_MIME_EXTENSIONS);

export function documentExtensionFor(mimeType: string): string | null {
  return EXTENSION_BY_MIME.get(mimeType) ?? null;
}

/** Postgres gibi kod noktası sayarak dosya adını kayıt sınırına kısaltır. */
export function documentRecordName(fileName: string): string {
  return Array.from(fileName).slice(0, MAX_DOCUMENT_FILE_NAME_LENGTH).join("");
}
