import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import ts from "typescript";

// Hesap silme (Clerk user.deleted) veri temizligi testleri. Saf modul sahte bir Supabase
// istemcisiyle denenir; canli veritabanina baglanilmaz.

const root = process.cwd();
const modulePath = path.join(root, "lib", "account", "userDataDeletion.ts");

async function importModule() {
  const tempDir = await mkdtemp(path.join(tmpdir(), "account-deletion-"));
  try {
    const source = await readFile(modulePath, "utf8");
    const compiled = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2020 },
    }).outputText;
    const file = path.join(tempDir, "userDataDeletion.mjs");
    await writeFile(file, compiled, "utf8");
    return await import(`file://${file}`);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

const { USER_DATA_TABLES, USER_DOCUMENTS_BUCKET, deleteUserData, isClerkUserId } = await importModule();

const USER_ID = "user_2abcDEF123ghiJKL456mno789";

// Sahte istemci: depo bir yol listesi, tablolar kullanici basina satir sayisi tutar.
function createFakeClient({ files = [], rows = {}, failRemove = false, failTable = null, ignoreRemove = false } = {}) {
  const store = new Set(files);
  const calls = { list: [], remove: [], deletes: [] };

  function entriesUnder(prefix) {
    const names = new Map();
    for (const file of store) {
      if (!file.startsWith(`${prefix}/`)) continue;
      const rest = file.slice(prefix.length + 1);
      const [head, ...tail] = rest.split("/");
      names.set(head, tail.length === 0 ? `id-${file}` : null);
    }
    return [...names.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, id]) => ({ name, id }));
  }

  const bucket = {
    async list(prefix, { limit, offset }) {
      calls.list.push({ prefix, limit, offset });
      return { data: entriesUnder(prefix).slice(offset, offset + limit), error: null };
    },
    async remove(paths) {
      calls.remove.push([...paths]);
      if (failRemove) return { data: null, error: { message: "boom" } };
      if (!ignoreRemove) paths.forEach((file) => store.delete(file));
      return { data: [], error: null };
    },
  };

  return {
    calls,
    store,
    storage: {
      from(name) {
        assert.equal(name, USER_DOCUMENTS_BUCKET);
        return bucket;
      },
    },
    from(table) {
      return {
        delete(options) {
          assert.deepEqual(options, { count: "exact" });
          return {
            async eq(column, value) {
              calls.deletes.push({ table, column, value });
              if (table === failTable) return { error: { message: "denied", code: "42501" }, count: null };
              return { error: null, count: rows[table] ?? 0 };
            },
          };
        },
      };
    },
  };
}

// 1) Kimlik bicimi: depo klasoru olarak kullanilacagi icin yalniz Clerk kullanici kimligi.
assert.equal(isClerkUserId(USER_ID), true);
for (const bad of ["", "user_", "user_a/b", "../user_abc", "user_abc/..", "org_2abc", "user_abc def", null, 42, undefined]) {
  assert.equal(isClerkUserId(bad), false, `isClerkUserId(${JSON.stringify(bad)})`);
}
assert.equal(isClerkUserId(`user_${"a".repeat(200)}`), false, "cok uzun kimlik reddedilir");

// 2) Tablolar ve sira sozlesmesi (gorusme mesajlari veritabaninda cascade ile gider).
assert.deepEqual(USER_DATA_TABLES, [
  "user_documents",
  "favorites",
  "user_profiles",
  "sat_attempts",
  "mentor_conversations",
]);
assert.equal(USER_DOCUMENTS_BUCKET, "documents");

// 3) Mutlu yol: 250 dosya (sayfalama) + alt klasor; baska kullanicinin dosyasina dokunulmaz.
{
  const own = Array.from({ length: 250 }, (_, index) => `${USER_ID}/${1700000000000 + index}.pdf`);
  const nested = [`${USER_ID}/eski/pasaport.pdf`];
  const other = ["user_2otherUser000000000000000/1.pdf"];
  const client = createFakeClient({
    files: [...own, ...nested, ...other],
    rows: { user_documents: 251, favorites: 3, user_profiles: 1, sat_attempts: 40, mentor_conversations: 2 },
  });

  const result = await deleteUserData(client, USER_ID);

  assert.equal(result.files, 251);
  assert.deepEqual(result.rows, {
    user_documents: 251,
    favorites: 3,
    user_profiles: 1,
    sat_attempts: 40,
    mentor_conversations: 2,
  });
  assert.deepEqual([...client.store], other, "yalniz kendi klasoru silinir");
  assert.ok(client.calls.remove.every((batch) => batch.length <= 100), "silme partileri en fazla 100 dosya");
  assert.ok(
    client.calls.remove.flat().every((file) => file.startsWith(`${USER_ID}/`)),
    "silinen her yol kullanici klasorunde",
  );
  assert.ok(client.calls.list.every((call) => call.prefix.startsWith(USER_ID)), "listeleme kullanici klasorunde");
  assert.deepEqual(
    client.calls.deletes.map((call) => call.table),
    USER_DATA_TABLES,
  );
  assert.ok(client.calls.deletes.every((call) => call.column === "user_id" && call.value === USER_ID));
}

// 4) Dosyasi olmayan kullanici: depo cagrisi bos gecer, satirlar yine silinir.
{
  const client = createFakeClient({ rows: { favorites: 1 } });
  const result = await deleteUserData(client, USER_ID);
  assert.equal(result.files, 0);
  assert.equal(client.calls.remove.length, 0);
  assert.equal(client.calls.deletes.length, USER_DATA_TABLES.length);
}

// 5) Depo silme hatasi: satirlara dokunulmaz, hata firlar (Clerk yeniden dener).
{
  const client = createFakeClient({ files: [`${USER_ID}/1.pdf`], failRemove: true });
  await assert.rejects(deleteUserData(client, USER_ID), /storage_remove_failed/);
  assert.equal(client.calls.deletes.length, 0);
}

// 6) Silme hata vermeden dosya birakirsa satirlar silinmez.
{
  const client = createFakeClient({ files: [`${USER_ID}/1.pdf`], ignoreRemove: true });
  await assert.rejects(deleteUserData(client, USER_ID), /storage_files_remaining/);
  assert.equal(client.calls.deletes.length, 0);
}

// 7) Tablo hatasi: sonraki tablolara gecilmez; hata mesaji kullanici kimligi tasimaz.
{
  const client = createFakeClient({ failTable: "user_profiles" });
  await assert.rejects(deleteUserData(client, USER_ID), (error) => {
    assert.match(error.message, /table_delete_failed:user_profiles:42501/);
    assert.ok(!error.message.includes(USER_ID));
    return true;
  });
  assert.deepEqual(
    client.calls.deletes.map((call) => call.table),
    ["user_documents", "favorites", "user_profiles"],
  );
}

// 8) Gecersiz kimlik: hicbir cagri yapilmaz.
{
  const client = createFakeClient({ files: ["x/1.pdf"] });
  await assert.rejects(deleteUserData(client, "../x"), /invalid_user_id/);
  assert.equal(client.calls.list.length + client.calls.remove.length + client.calls.deletes.length, 0);
}

// 9) Tekrar calisma: ikinci cagri ayni sonucu hatasiz verir (Clerk ayni olayi yeniden gonderebilir).
{
  const client = createFakeClient({ files: [`${USER_ID}/1.pdf`] });
  await deleteUserData(client, USER_ID);
  const again = await deleteUserData(client, USER_ID);
  assert.equal(again.files, 0);
}

console.log("Account deletion tests passed.");
