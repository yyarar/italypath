// Hesap silindiginde (Clerk user.deleted) kullaniciya ait Supabase verisini kaldirir.
// Saf modul: istemci disaridan verilir. Service role istemcisi lib/account/deleteUserData.server.ts
// icinde kurulur; davranis scripts/test-account-deletion.mjs ile sahte istemcide denenir.

export const USER_DOCUMENTS_BUCKET = "documents";

// Kullanici kimligi `user_id` sutununda duran tablolar. mentor_messages ve mentor_rpc_idempotency
// mentor_conversations'a "on delete cascade" ile bagli oldugu icin gorusmeyle birlikte silinir.
export const USER_DATA_TABLES = [
  "user_documents",
  "favorites",
  "user_profiles",
  "sat_attempts",
  "mentor_conversations",
] as const;

export type UserDataTable = (typeof USER_DATA_TABLES)[number];

export interface UserDataDeletionResult {
  files: number;
  rows: Record<UserDataTable, number>;
}

interface StorageEntry {
  name: string;
  id: string | null;
}

interface StorageError {
  message: string;
}

interface UserDocumentsBucket {
  list(
    path: string,
    options: { limit: number; offset: number; sortBy: { column: string; order: string } },
  ): Promise<{ data: StorageEntry[] | null; error: StorageError | null }>;
  remove(paths: string[]): Promise<{ error: StorageError | null }>;
}

interface DeleteByUserQuery {
  eq(
    column: "user_id",
    value: string,
  ): PromiseLike<{ error: { message: string; code?: string } | null; count: number | null }>;
}

export interface UserDataClient {
  storage: { from(bucket: string): UserDocumentsBucket };
  from(table: UserDataTable): { delete(options: { count: "exact" }): DeleteByUserQuery };
}

const LIST_PAGE_SIZE = 100;
const REMOVE_BATCH_SIZE = 100;
// Yuklemeler duz `{kullanici}/{zaman}.{uzanti}` yoluna gider; alt klasor beklenmez ama
// dogrudan depo cagrisiyla acilmis olabilir. Sinirsiz ozyineleme yerine sabit derinlik.
const MAX_FOLDER_DEPTH = 4;

// Kimlik depo klasoru olarak kullanildigi icin yalniz Clerk kullanici kimligi bicimi kabul edilir.
export function isClerkUserId(value: unknown): value is string {
  return typeof value === "string" && /^user_[A-Za-z0-9]{1,100}$/.test(value);
}

async function listFiles(
  bucket: UserDocumentsBucket,
  folder: string,
  depth: number,
): Promise<string[]> {
  const files: string[] = [];
  for (let offset = 0; ; offset += LIST_PAGE_SIZE) {
    const { data, error } = await bucket.list(folder, {
      limit: LIST_PAGE_SIZE,
      offset,
      sortBy: { column: "name", order: "asc" },
    });
    if (error) throw new Error("storage_list_failed");

    const entries = data ?? [];
    for (const entry of entries) {
      const entryPath = `${folder}/${entry.name}`;
      // Supabase listesinde klasorlerin id'si yoktur.
      if (entry.id) {
        files.push(entryPath);
      } else if (depth < MAX_FOLDER_DEPTH) {
        files.push(...(await listFiles(bucket, entryPath, depth + 1)));
      } else {
        throw new Error("storage_folder_too_deep");
      }
    }
    if (entries.length < LIST_PAGE_SIZE) return files;
  }
}

// Once dosyalar, sonra satirlar: bir adim hata verirse fonksiyon hata firlatir ve Clerk olayi
// yeniden gonderir. Her adim tekrar calismaya dayaniklidir (silinmis veri yeniden silinmez, hata vermez).
// Hata mesajlari kullanici kimligi tasimaz.
export async function deleteUserData(
  client: UserDataClient,
  userId: string,
): Promise<UserDataDeletionResult> {
  if (!isClerkUserId(userId)) throw new Error("invalid_user_id");

  const bucket = client.storage.from(USER_DOCUMENTS_BUCKET);
  const files = await listFiles(bucket, userId, 0);
  for (let index = 0; index < files.length; index += REMOVE_BATCH_SIZE) {
    const { error } = await bucket.remove(files.slice(index, index + REMOVE_BATCH_SIZE));
    if (error) throw new Error("storage_remove_failed");
  }
  if (files.length > 0 && (await listFiles(bucket, userId, 0)).length > 0) {
    throw new Error("storage_files_remaining");
  }

  const rows = {} as Record<UserDataTable, number>;
  for (const table of USER_DATA_TABLES) {
    const { error, count } = await client
      .from(table)
      .delete({ count: "exact" })
      .eq("user_id", userId);
    if (error) throw new Error(`table_delete_failed:${table}:${error.code ?? "unknown"}`);
    rows[table] = count ?? 0;
  }

  return { files: files.length, rows };
}
