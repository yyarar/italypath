#!/usr/bin/env node
/**
 * Supabase canli yedek ve geri yukleme provasi (guvenlik denetimi G2#2, 2026-09-25).
 *
 * Yedeklenen: `public` semasi (tablolar + veriler, kullanici tablolari dahil; RLS politikalari,
 * fonksiyonlar, trigger'lar, view, yetkiler) pg_dump custom formatinda ve BACKUP_BUCKETS icindeki
 * Storage dosyalari (Storage API, service-role). Hepsi tek tar arsivinde, gpg ile parolayla (AES256)
 * sifrelenip repo DISINDAKI BACKUP_DIR klasorune yazilir. Tablo satir ve nesne sayilari dump ile ayni
 * snapshot icinde manifest.json'a kaydedilir; --drill bu sayilari gecici yerel Postgres'e geri
 * yuklenen kopyayla karsilastirir.
 *
 * Kullanim:
 *   npm run backup:supabase -- --dry-run          canlidan yalniz sayim okur, hicbir sey yazmaz (varsayilan)
 *   npm run backup:supabase -- --run              gercek yedek (Supabase egress harcar; sik calistirma)
 *   npm run backup:supabase -- --verify [arsiv]   arsivi acar, dosya ozetlerini kontrol eder (canliya baglanmaz)
 *   npm run backup:supabase -- --drill [arsiv]    verify + gecici yerel kumeye geri yukleme + sayim karsilastirma
 *   [arsiv] verilmezse BACKUP_DIR icindeki en yeni arsiv kullanilir. --out <klasor> BACKUP_DIR'i ezer.
 *
 * Ortam (.env.local veya ortam degiskeni; degerler hicbir zaman yazdirilmaz, loglanmaz):
 *   SUPABASE_DB_URL      Postgres baglanti dizesi (Dashboard -> Connect -> Session pooler, port 5432)
 *   BACKUP_PASSPHRASE    arsiv parolasi (en az 16 karakter); kaybolursa yedek acilamaz
 *   BACKUP_DIR           arsiv klasoru; repo icinde olamaz
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY   Storage indirme (--run)
 *   POSTGRES_BIN         (istege bagli) pg_dump/pg_restore/psql/initdb/pg_ctl klasoru
 */
import { createHash } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BACKUP_BUCKETS = ["documents", "sat-figures"];
const ARCHIVE_PREFIX = "italypath-supabase-";
const ARCHIVE_SUFFIX = ".tar.gpg";
const MANIFEST_FORMAT = "italypath-supabase-backup/1";
const MIN_PASSPHRASE_LENGTH = 16;
const PG_TOOLS = ["pg_dump", "pg_restore", "psql", "initdb", "pg_ctl"];

class UserError extends Error {}

// ---------------------------------------------------------------------------
// Ortam ve gizli degerler
// ---------------------------------------------------------------------------

function loadEnvLocal() {
  const envFile = join(REPO_ROOT, ".env.local");
  if (!existsSync(envFile)) return {};
  const values = {};
  for (const line of readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$/);
    if (!match) continue;
    let value = match[2].trim();
    if (
      value.length >= 2 &&
      ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'")))
    ) {
      value = value.slice(1, -1);
    }
    values[match[1]] = value;
  }
  return values;
}

const env = { ...loadEnvLocal(), ...process.env };
const secrets = new Set();

function rememberSecret(value) {
  if (!value || value.length < 6) return;
  secrets.add(value);
  secrets.add(encodeURIComponent(value));
}

for (const name of ["SUPABASE_DB_URL", "BACKUP_PASSPHRASE", "SUPABASE_SERVICE_ROLE_KEY"]) {
  rememberSecret(env[name]);
}

function scrub(text) {
  let output = String(text ?? "");
  for (const secret of secrets) output = output.split(secret).join("<gizli>");
  return output;
}

// Alt sureclere yalnizca gereken degiskenler gider; parola ve anahtarlar gitmez.
function baseEnv(extra = {}) {
  const inherited = {};
  for (const name of ["PATH", "HOME", "TMPDIR", "USER", "GNUPGHOME"]) {
    if (process.env[name]) inherited[name] = process.env[name];
  }
  return { ...inherited, LC_ALL: "C", LANG: "C", COPYFILE_DISABLE: "1", ...extra };
}

// ---------------------------------------------------------------------------
// Kucuk yardimcilar
// ---------------------------------------------------------------------------

function run(command, args, { childEnv = baseEnv(), input, allowFailure = false, label } = {}) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    env: childEnv,
    input,
    maxBuffer: 256 * 1024 * 1024,
  });
  if (result.error) {
    throw new UserError(`${label ?? command} calistirilamadi: ${scrub(result.error.message)}`);
  }
  if (result.status !== 0 && !allowFailure) {
    const detail = scrub(`${result.stderr ?? ""}${result.stdout ?? ""}`).trim();
    throw new UserError(`${label ?? command} basarisiz (cikis ${result.status})${detail ? `:\n${detail}` : ""}`);
  }
  return result;
}

function waitForExit(child, label) {
  return new Promise((resolvePromise, reject) => {
    child.once("error", (error) => reject(new UserError(`${label} calistirilamadi: ${scrub(error.message)}`)));
    child.once("close", (code) => resolvePromise(code));
  });
}

function collect(stream) {
  let text = "";
  stream?.setEncoding("utf8");
  stream?.on("data", (chunk) => {
    text += chunk;
  });
  return () => text;
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function sha256File(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function quoteIdentifier(value) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

function sqlLiteral(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function pad(text, width) {
  const value = String(text);
  return value.length >= width ? value : value + " ".repeat(width - value.length);
}

function padLeft(text, width) {
  const value = String(text);
  return value.length >= width ? value : " ".repeat(width - value.length) + value;
}

function timestampForName(date = new Date()) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

// ---------------------------------------------------------------------------
// Argumanlar
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const options = { mode: "dry-run", archive: null, out: null };
  const modes = new Set();
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--dry-run") modes.add("dry-run");
    else if (arg === "--run") modes.add("run");
    else if (arg === "--verify" || arg === "--drill") {
      modes.add(arg.slice(2));
      if (argv[index + 1] && !argv[index + 1].startsWith("--")) {
        options.archive = argv[index + 1];
        index += 1;
      }
    } else if (arg === "--out") {
      options.out = argv[index + 1];
      index += 1;
      if (!options.out) throw new UserError("--out bir klasor ister.");
    } else if (arg === "--help" || arg === "-h") modes.add("help");
    else throw new UserError(`Bilinmeyen secenek: ${arg} (--help ile kullanimi gor)`);
  }
  if (modes.size > 1) throw new UserError("Tek mod sec: --dry-run, --run, --verify veya --drill.");
  if (modes.size === 1) options.mode = [...modes][0];
  return options;
}

// ---------------------------------------------------------------------------
// Araclar: PostgreSQL ve gpg
// ---------------------------------------------------------------------------

function toolVersion(path) {
  const result = spawnSync(path, ["--version"], { encoding: "utf8", env: baseEnv() });
  if (result.error || result.status !== 0) return null;
  const match = result.stdout.match(/\(PostgreSQL\)\s+(\d+)(?:\.(\d+))?/);
  return match ? { major: Number(match[1]), text: result.stdout.trim() } : null;
}

function candidateBinDirectories() {
  const directories = [];
  if (env.POSTGRES_BIN) directories.push(env.POSTGRES_BIN);
  for (const version of [18, 17, 16, 15]) {
    directories.push(`/opt/homebrew/opt/postgresql@${version}/bin`, `/usr/local/opt/postgresql@${version}/bin`);
  }
  const pgConfig = spawnSync("pg_config", ["--bindir"], { encoding: "utf8", env: baseEnv() });
  if (!pgConfig.error && pgConfig.status === 0 && pgConfig.stdout.trim()) directories.push(pgConfig.stdout.trim());
  return [...new Set(directories)].filter((directory) => existsSync(directory));
}

// Sunucu surumunden eski pg_dump calismaz (Supabase 17 -> en az pg_dump 17).
function findPostgresTools(minimumMajor, names) {
  const seen = [];
  for (const directory of candidateBinDirectories()) {
    const versions = names.map((name) => toolVersion(join(directory, name)));
    if (versions.every((version) => version && version.major >= minimumMajor)) {
      return {
        directory,
        major: versions[0].major,
        version: versions[0].text,
        ...Object.fromEntries(names.map((name) => [name, join(directory, name)])),
      };
    }
    seen.push(`${directory} (${versions.map((version) => version?.major ?? "yok").join("/")})`);
  }
  return { missing: true, seen };
}

function requirePostgresTools(minimumMajor, names) {
  const tools = findPostgresTools(minimumMajor, names);
  if (tools.missing) {
    throw new UserError(
      `PostgreSQL ${minimumMajor}+ araclari bulunamadi (${names.join(", ")}). ` +
        `Kurulum: brew install postgresql@${minimumMajor} (veya POSTGRES_BIN ile klasor ver). ` +
        `Bakilan: ${tools.seen.join(", ") || "yok"}`,
    );
  }
  return tools;
}

function anyPsql() {
  for (const directory of candidateBinDirectories()) {
    const path = join(directory, "psql");
    if (toolVersion(path)) return path;
  }
  throw new UserError("psql bulunamadi. Kurulum: brew install postgresql@17");
}

function findGpg() {
  for (const candidate of ["/opt/homebrew/bin/gpg", "/usr/local/bin/gpg", "gpg"]) {
    const result = spawnSync(candidate, ["--version"], { encoding: "utf8", env: baseEnv() });
    if (!result.error && result.status === 0) {
      return { path: candidate, version: result.stdout.split("\n")[0].trim() };
    }
  }
  return null;
}

function requireGpg() {
  const gpg = findGpg();
  if (!gpg) throw new UserError("gpg bulunamadi. Kurulum: brew install gnupg");
  return gpg;
}

// Eski gpg surumleri de acabilsin diye RFC 4880 (AES256 + MDC); parola gpg-agent'ta saklanmaz.
const GPG_COMMON = ["--batch", "--yes", "--quiet", "--no-symkey-cache", "--pinentry-mode", "loopback", "--passphrase-fd", "3"];
const GPG_ENCRYPT = [
  "--rfc4880",
  "--symmetric",
  "--cipher-algo",
  "AES256",
  "--s2k-mode",
  "3",
  "--s2k-digest-algo",
  "SHA512",
  "--s2k-count",
  "65011712",
];

// ---------------------------------------------------------------------------
// Baglanti ve klasor kontrolleri
// ---------------------------------------------------------------------------

function connectionEnv() {
  const raw = env.SUPABASE_DB_URL;
  if (!raw) {
    throw new UserError(
      "SUPABASE_DB_URL tanimli degil. Supabase Dashboard -> Connect -> Session pooler baglanti dizesini .env.local'a ekle.",
    );
  }
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new UserError("SUPABASE_DB_URL okunamadi (postgresql://kullanici:parola@sunucu:5432/postgres biciminde olmali).");
  }
  if (!/^postgres(ql)?:$/.test(url.protocol)) throw new UserError("SUPABASE_DB_URL postgresql:// ile baslamali.");
  const password = decodeURIComponent(url.password);
  rememberSecret(password);
  if (!password || /YOUR-PASSWORD/i.test(raw)) {
    throw new UserError("SUPABASE_DB_URL icinde veritabani parolasi yok (ya da [YOUR-PASSWORD] yer tutucusu duruyor).");
  }
  if (url.port === "6543") {
    throw new UserError("SUPABASE_DB_URL transaction pooler (6543). pg_dump icin Session pooler (5432) dizesini kullan.");
  }
  return {
    PGHOST: url.hostname,
    PGPORT: url.port || "5432",
    PGUSER: decodeURIComponent(url.username),
    PGPASSWORD: password,
    PGDATABASE: decodeURIComponent(url.pathname.replace(/^\//, "")) || "postgres",
    PGSSLMODE: url.searchParams.get("sslmode") || "require",
    PGAPPNAME: "italypath-backup",
    PGCONNECT_TIMEOUT: "20",
  };
}

function projectRef() {
  try {
    return new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split(".")[0];
  } catch {
    return "bilinmiyor";
  }
}

function repositoryRoots() {
  const roots = new Set([REPO_ROOT]);
  const common = spawnSync("git", ["-C", REPO_ROOT, "rev-parse", "--path-format=absolute", "--git-common-dir"], {
    encoding: "utf8",
    env: baseEnv(),
  });
  if (!common.error && common.status === 0 && common.stdout.trim()) roots.add(dirname(common.stdout.trim()));
  return [...roots].map((root) => (existsSync(root) ? realpathSync(root) : root));
}

function isInside(child, parent) {
  const path = relative(parent, child);
  return path === "" || (!path.startsWith("..") && !path.startsWith(sep) && path !== "..");
}

function describeBackupDir(options, { mustExist }) {
  const configured = options.out ?? env.BACKUP_DIR;
  if (!configured) return { ok: false, problem: "BACKUP_DIR tanimli degil (repo disinda bir klasor sec)." };
  const absolute = resolve(configured.replace(/^~(?=$|\/)/, process.env.HOME ?? "~"));
  if (!existsSync(absolute)) {
    return mustExist
      ? { ok: false, path: absolute, problem: `Klasor yok: ${absolute}` }
      : { ok: false, path: absolute, problem: `Klasor henuz yok: ${absolute}` };
  }
  const real = realpathSync(absolute);
  if (!statSync(real).isDirectory()) return { ok: false, path: real, problem: `Klasor degil: ${real}` };
  for (const root of repositoryRoots()) {
    if (isInside(real, root)) {
      return { ok: false, path: real, problem: `Yedek klasoru repo icinde olamaz (${root}). Depo herkese acik.` };
    }
  }
  const offMachine = /\/Volumes\/|\/Mobile Documents\/|\/CloudStorage\//.test(real);
  return { ok: true, path: real, offMachine };
}

function requireBackupDir(options) {
  const described = describeBackupDir(options, { mustExist: true });
  if (!described.ok) throw new UserError(described.problem);
  return described;
}

function requirePassphrase() {
  const passphrase = env.BACKUP_PASSPHRASE;
  if (!passphrase) throw new UserError("BACKUP_PASSPHRASE tanimli degil.");
  if (passphrase.length < MIN_PASSPHRASE_LENGTH) {
    throw new UserError(`BACKUP_PASSPHRASE en az ${MIN_PASSPHRASE_LENGTH} karakter olmali.`);
  }
  if (/[\r\n]/.test(passphrase)) throw new UserError("BACKUP_PASSPHRASE satir sonu iceremez.");
  return passphrase;
}

function listArchives(directory) {
  return readdirSync(directory)
    .filter((name) => name.startsWith(ARCHIVE_PREFIX) && name.endsWith(ARCHIVE_SUFFIX))
    .sort()
    .map((name) => join(directory, name));
}

function resolveArchive(options) {
  if (options.archive) {
    const path = resolve(options.archive.replace(/^~(?=$|\/)/, process.env.HOME ?? "~"));
    if (!existsSync(path)) throw new UserError(`Arsiv bulunamadi: ${path}`);
    return path;
  }
  const { path } = requireBackupDir(options);
  const archives = listArchives(path);
  if (archives.length === 0) throw new UserError(`${path} icinde yedek arsivi yok.`);
  return archives[archives.length - 1];
}

// ---------------------------------------------------------------------------
// SQL: nesne ve satir sayilari (canli ve geri yuklenen kopyada ayni sorgu)
// ---------------------------------------------------------------------------

const INSPECT_SQL = `
select json_build_object(
  'server_version', current_setting('server_version'),
  'server_version_num', current_setting('server_version_num')::int,
  'captured_at', now(),
  'objects', json_build_object(
    'tables', (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind in ('r', 'p') and not exists (select 1 from pg_depend d where d.classid = 'pg_class'::regclass and d.objid = c.oid and d.deptype = 'e')),
    'views', (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'v' and not exists (select 1 from pg_depend d where d.classid = 'pg_class'::regclass and d.objid = c.oid and d.deptype = 'e')),
    'materialized_views', (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'm' and not exists (select 1 from pg_depend d where d.classid = 'pg_class'::regclass and d.objid = c.oid and d.deptype = 'e')),
    'sequences', (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'S' and not exists (select 1 from pg_depend d where d.classid = 'pg_class'::regclass and d.objid = c.oid and d.deptype = 'e')),
    'indexes', (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind in ('i', 'I')),
    'constraints', (select count(*) from pg_constraint k join pg_namespace n on n.oid = k.connamespace where n.nspname = 'public'),
    'functions', (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and not exists (select 1 from pg_depend d where d.classid = 'pg_proc'::regclass and d.objid = p.oid and d.deptype = 'e')),
    'triggers', (select count(*) from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and not t.tgisinternal),
    'policies', (select count(*) from pg_policy p join pg_class c on c.oid = p.polrelid join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public'),
    'rls_enabled_tables', (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind in ('r', 'p') and c.relrowsecurity),
    'types', (select count(*) from pg_type t join pg_namespace n on n.oid = t.typnamespace where n.nspname = 'public' and (t.typtype in ('e', 'd', 'r', 'm') or (t.typtype = 'c' and exists (select 1 from pg_class c where c.oid = t.typrelid and c.relkind = 'c'))) and not exists (select 1 from pg_depend d where d.classid = 'pg_type'::regclass and d.objid = t.oid and d.deptype = 'e')),
    'table_grants', (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace cross join lateral aclexplode(c.relacl) a where n.nspname = 'public'),
    'function_grants', (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace cross join lateral aclexplode(p.proacl) a where n.nspname = 'public' and not exists (select 1 from pg_depend d where d.classid = 'pg_proc'::regclass and d.objid = p.oid and d.deptype = 'e')),
    'default_privileges', (select count(*) from pg_default_acl d join pg_namespace n on n.oid = d.defaclnamespace where n.nspname = 'public'),
    'realtime_tables', (select count(*) from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public')
  ),
  'realtime_table_names', (
    select coalesce(json_agg(tablename order by tablename), '[]'::json)
    from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public'
  ),
  'tables', (
    select coalesce(json_object_agg(c.relname, json_build_object(
      'rows', (xpath('/row/n/text()', query_to_xml(format('select count(*) as n from %I.%I', n.nspname, c.relname), false, true, '')))[1]::text::bigint,
      'bytes', pg_table_size(c.oid)
    ) order by c.relname), '{}'::json)
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'p')
      and not exists (select 1 from pg_depend d where d.classid = 'pg_class'::regclass and d.objid = c.oid and d.deptype = 'e')
  )
)::text`;

function storageSql(buckets) {
  const list = `array[${buckets.map(sqlLiteral).join(", ")}]::text[]`;
  return `
select json_build_object(
  'buckets', (
    select coalesce(json_agg(json_build_object(
      'id', b.id, 'name', b.name, 'public', b.public,
      'file_size_limit', b.file_size_limit, 'allowed_mime_types', b.allowed_mime_types
    ) order by b.id), '[]'::json)
    from storage.buckets b where b.id = any(${list})
  ),
  'objects', (
    select coalesce(json_agg(json_build_object(
      'bucket', o.bucket_id, 'name', o.name,
      'size', (o.metadata ->> 'size')::bigint, 'mimetype', o.metadata ->> 'mimetype',
      'etag', o.metadata ->> 'eTag', 'updated_at', o.updated_at
    ) order by o.bucket_id, o.name), '[]'::json)
    from storage.objects o where o.bucket_id = any(${list})
  ),
  'policies', (
    select coalesce(json_agg(json_build_object(
      'table', p.tablename, 'name', p.policyname, 'command', p.cmd, 'roles', p.roles,
      'using', p.qual, 'with_check', p.with_check
    ) order by p.tablename, p.policyname), '[]'::json)
    from pg_policies p where p.schemaname = 'storage'
  )
)::text`;
}

function queryJson(psqlPath, sql, childEnv, label) {
  const result = run(psqlPath, ["-X", "-q", "-A", "-t", "-v", "ON_ERROR_STOP=1", "-c", sql], {
    childEnv,
    label,
  });
  return JSON.parse(result.stdout.trim());
}

// Tek bir psql oturumu: snapshot'i disari aktarir ve ayni snapshot icinde sayim yapar.
class PsqlSession {
  constructor(psqlPath, childEnv) {
    this.child = spawn(psqlPath, ["-X", "-q", "-A", "-t", "-v", "ON_ERROR_STOP=1"], {
      env: childEnv,
      stdio: ["pipe", "pipe", "pipe"],
    });
    this.buffer = "";
    this.stderr = "";
    this.waiters = [];
    this.sequence = 0;
    this.exitCode = null;
    this.child.stdout.setEncoding("utf8");
    this.child.stderr.setEncoding("utf8");
    this.child.stdout.on("data", (chunk) => {
      this.buffer += chunk;
      this.flush();
    });
    this.child.stderr.on("data", (chunk) => {
      this.stderr += chunk;
    });
    this.child.stdin.on("error", () => {});
    this.closed = new Promise((resolvePromise) => {
      this.child.once("close", (code) => {
        this.exitCode = code ?? 1;
        for (const waiter of this.waiters.splice(0)) {
          waiter.reject(new UserError(`psql oturumu kapandi (cikis ${this.exitCode}): ${scrub(this.stderr).trim()}`));
        }
        resolvePromise(this.exitCode);
      });
      this.child.once("error", (error) => {
        this.exitCode = 1;
        for (const waiter of this.waiters.splice(0)) {
          waiter.reject(new UserError(`psql calistirilamadi: ${scrub(error.message)}`));
        }
        resolvePromise(1);
      });
    });
  }

  query(sql) {
    this.sequence += 1;
    const marker = `__italypath_backup_${this.sequence}__`;
    return new Promise((resolvePromise, reject) => {
      if (this.exitCode !== null) {
        reject(new UserError(`psql oturumu kapali: ${scrub(this.stderr).trim()}`));
        return;
      }
      this.waiters.push({ marker, resolve: resolvePromise, reject });
      this.child.stdin.write(`${sql.trim().replace(/;?\s*$/, ";")}\n\\echo ${marker}\n`);
    });
  }

  flush() {
    while (this.waiters.length > 0) {
      const waiter = this.waiters[0];
      const index = this.buffer.indexOf(`${waiter.marker}\n`);
      if (index === -1) return;
      const output = this.buffer.slice(0, index);
      this.buffer = this.buffer.slice(index + waiter.marker.length + 1);
      this.waiters.shift();
      waiter.resolve(output.trim());
    }
  }

  async close() {
    if (this.exitCode === null) this.child.stdin.end("\\q\n");
    return this.closed;
  }
}

// ---------------------------------------------------------------------------
// Sifreli arsiv
// ---------------------------------------------------------------------------

async function encryptDirectory(gpg, sourceDirectory, outputPath, passphrase) {
  const partial = `${outputPath}.partial`;
  const tar = spawn("/usr/bin/tar", ["-cf", "-", "-C", sourceDirectory, "."], {
    env: baseEnv(),
    stdio: ["ignore", "pipe", "pipe"],
  });
  const encrypt = spawn(gpg.path, [...GPG_COMMON, ...GPG_ENCRYPT, "--output", partial], {
    env: baseEnv(),
    stdio: ["pipe", "ignore", "pipe", "pipe"],
  });
  const tarErrors = collect(tar.stderr);
  const gpgErrors = collect(encrypt.stderr);
  encrypt.stdio[3].on("error", () => {});
  encrypt.stdin.on("error", () => {});
  encrypt.stdio[3].end(passphrase);
  tar.stdout.pipe(encrypt.stdin);
  const [tarCode, gpgCode] = await Promise.all([waitForExit(tar, "tar"), waitForExit(encrypt, "gpg")]);
  if (tarCode !== 0 || gpgCode !== 0) {
    rmSync(partial, { force: true });
    throw new UserError(`Arsiv olusturulamadi (tar ${tarCode}, gpg ${gpgCode}): ${scrub(tarErrors() + gpgErrors()).trim()}`);
  }
  chmodSync(partial, 0o600);
  renameSync(partial, outputPath);
}

async function decryptArchive(gpg, archivePath, passphrase, targetDirectory) {
  const decrypt = spawn(gpg.path, [...GPG_COMMON, "--decrypt", archivePath], {
    env: baseEnv(),
    stdio: ["ignore", "pipe", "pipe", "pipe"],
  });
  const tar = spawn("/usr/bin/tar", ["-xf", "-", "-C", targetDirectory], {
    env: baseEnv(),
    stdio: ["pipe", "ignore", "pipe"],
  });
  const gpgErrors = collect(decrypt.stderr);
  const tarErrors = collect(tar.stderr);
  decrypt.stdio[3].on("error", () => {});
  tar.stdin.on("error", () => {});
  decrypt.stdio[3].end(passphrase);
  decrypt.stdout.pipe(tar.stdin);
  const [gpgCode, tarCode] = await Promise.all([waitForExit(decrypt, "gpg"), waitForExit(tar, "tar")]);
  if (gpgCode !== 0) {
    const detail = scrub(gpgErrors()).trim();
    if (/bad session key|decryption failed/i.test(detail)) {
      throw new UserError("Arsiv acilamadi: parola yanlis (BACKUP_PASSPHRASE bu arsivin parolasi degil).");
    }
    throw new UserError(`Arsiv cozulemedi (gpg ${gpgCode}): ${detail}`);
  }
  if (tarCode !== 0) throw new UserError(`Arsiv acilamadi (tar ${tarCode}): ${scrub(tarErrors()).trim()}`);
}

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

function safeObjectPath(bucket, name) {
  const segments = name.split("/");
  if (!name || name.startsWith("/") || segments.some((segment) => segment === "" || segment === "." || segment === "..")) {
    throw new UserError(`Guvenli olmayan Storage yolu atlanmadi, yedek durduruldu: ${bucket}/${name}`);
  }
  return join("storage", bucket, ...segments);
}

async function downloadStorageObjects(objects, stagingDirectory) {
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    throw new UserError("Storage indirmek icin NEXT_PUBLIC_SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY gerekli (.env.local).");
  }
  const { createClient } = await import("@supabase/supabase-js");
  const client = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const files = [];
  for (const object of objects) {
    const file = safeObjectPath(object.bucket, object.name);
    const { data, error } = await client.storage.from(object.bucket).download(object.name);
    if (error || !data) {
      throw new UserError(`Storage indirme basarisiz: ${object.bucket}/${object.name} (${scrub(error?.message ?? "bos yanit")})`);
    }
    const bytes = Buffer.from(await data.arrayBuffer());
    if (Number.isFinite(object.size) && object.size !== null && bytes.length !== object.size) {
      throw new UserError(
        `Storage boyutu tutmadi: ${object.bucket}/${object.name} (kayit ${object.size}, inen ${bytes.length}). Yedegi tekrar calistir.`,
      );
    }
    const destination = join(stagingDirectory, file);
    mkdirSync(dirname(destination), { recursive: true, mode: 0o700 });
    writeFileSync(destination, bytes, { mode: 0o600 });
    files.push({
      ...object,
      file,
      bytes: bytes.length,
      sha256: createHash("sha256").update(bytes).digest("hex"),
    });
  }
  return files;
}

// ---------------------------------------------------------------------------
// Modlar
// ---------------------------------------------------------------------------

function printHelp() {
  console.log(`Kullanim:
  npm run backup:supabase -- --dry-run          ne yedeklenecegini ve tahmini boyutu gosterir (hicbir sey yazmaz)
  npm run backup:supabase -- --run              sifreli yedek arsivi olusturur (Supabase egress harcar)
  npm run backup:supabase -- --verify [arsiv]   arsivi acar ve dosya ozetlerini kontrol eder
  npm run backup:supabase -- --drill [arsiv]    gecici yerel Postgres'e geri yukler ve sayimlari karsilastirir
Ayrinti: SUPABASE_SECURITY_RUNBOOK.md "Yedek ve geri yukleme".`);
}

async function dryRun(options) {
  console.log("ItalyPath Supabase yedegi - DENEME (hicbir sey yazilmaz, yalniz sayim okunur)\n");
  const childEnv = baseEnv(connectionEnv());
  const psqlPath = anyPsql();
  const snapshot = queryJson(psqlPath, INSPECT_SQL, childEnv, "canli sayim");
  const storage = queryJson(psqlPath, storageSql(BACKUP_BUCKETS), childEnv, "Storage listesi");
  const serverMajor = Math.floor(snapshot.server_version_num / 10000);

  console.log(`Kaynak: proje ${projectRef()}, Postgres ${snapshot.server_version}`);
  const tables = Object.entries(snapshot.tables);
  const totalRows = tables.reduce((sum, [, table]) => sum + Number(table.rows), 0);
  const totalBytes = tables.reduce((sum, [, table]) => sum + Number(table.bytes), 0);
  const o = snapshot.objects;
  console.log(
    `\nVeritabani (public semasi): ${o.tables} tablo, ${o.views} view, ${o.functions} fonksiyon, ${o.policies} RLS politikasi, ` +
      `${o.indexes} indeks, ${o.triggers} trigger, ${o.constraints} kisit, ${o.sequences} sequence`,
  );
  console.log(`  ${pad("tablo", 30)} ${padLeft("satir", 7)}  ${padLeft("alan", 9)}`);
  for (const [name, table] of tables) {
    console.log(`  ${pad(name, 30)} ${padLeft(table.rows, 7)}  ${padLeft(formatBytes(Number(table.bytes)), 9)}`);
  }
  console.log(`  ${pad("toplam", 30)} ${padLeft(totalRows, 7)}  ${padLeft(formatBytes(totalBytes), 9)}`);

  const storageBytes = storage.objects.reduce((sum, object) => sum + Number(object.size ?? 0), 0);
  for (const bucket of BACKUP_BUCKETS) {
    const objects = storage.objects.filter((object) => object.bucket === bucket);
    const bytes = objects.reduce((sum, object) => sum + Number(object.size ?? 0), 0);
    const info = storage.buckets.find((item) => item.id === bucket);
    console.log(
      `\nBelge deposu "${bucket}": ${objects.length} dosya, ${formatBytes(bytes)}${info ? (info.public ? " (public bucket)" : " (private bucket)") : " (bucket bulunamadi!)"}`,
    );
  }
  console.log(`Storage politikalari (bilgi icin manifest'e yazilir): ${storage.policies.length}`);

  console.log(
    `\nTahmini egress: en fazla ~${formatBytes(totalBytes + storageBytes)} (tablo alani + dosyalar; indeksler indirilmez)`,
  );
  console.log(`Tahmini arsiv boyutu: en fazla ~${formatBytes(totalBytes + storageBytes)} (dump sikistirilir)`);

  console.log("\nHazirlik:");
  const checks = [];
  const tools = findPostgresTools(serverMajor, ["pg_dump", "psql"]);
  checks.push([
    !tools.missing,
    tools.missing
      ? `pg_dump ${serverMajor}+ yok (sunucu ${serverMajor}). Kurulum: brew install postgresql@${serverMajor}`
      : `pg_dump ${tools.major} (${tools.directory})`,
  ]);
  const restoreTools = findPostgresTools(serverMajor, PG_TOOLS);
  checks.push([
    !restoreTools.missing,
    restoreTools.missing ? `geri yukleme provasi icin PostgreSQL ${serverMajor}+ sunucu araclari yok` : "geri yukleme provasi araclari hazir",
  ]);
  const gpg = findGpg();
  checks.push([Boolean(gpg), gpg ? gpg.version : "gpg yok (brew install gnupg)"]);
  const passphrase = env.BACKUP_PASSPHRASE;
  checks.push([
    Boolean(passphrase) && passphrase.length >= MIN_PASSPHRASE_LENGTH,
    passphrase
      ? passphrase.length >= MIN_PASSPHRASE_LENGTH
        ? "BACKUP_PASSPHRASE tanimli"
        : `BACKUP_PASSPHRASE ${MIN_PASSPHRASE_LENGTH} karakterden kisa`
      : "BACKUP_PASSPHRASE tanimli degil",
  ]);
  checks.push([
    Boolean(env.NEXT_PUBLIC_SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY),
    "Storage icin NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY",
  ]);
  const backupDir = describeBackupDir(options, { mustExist: true });
  checks.push([backupDir.ok, backupDir.ok ? `hedef klasor: ${backupDir.path}` : backupDir.problem]);
  for (const [ok, text] of checks) console.log(`  ${ok ? "OK " : "EKSIK"} ${text}`);
  if (backupDir.ok) {
    console.log(
      backupDir.offMachine
        ? "  OK  hedef bilgisayar disinda da duruyor (harici disk veya bulut klasoru)"
        : "  UYARI hedef yalniz bu bilgisayarda; disarida kopyasi yok",
    );
    const archives = listArchives(backupDir.path);
    console.log(`  bilgi: klasorde ${archives.length} yedek var${archives.length ? `, en yenisi ${archives.at(-1).split(sep).pop()}` : ""}`);
    console.log(`  olusacak arsiv: ${ARCHIVE_PREFIX}${timestampForName()}${ARCHIVE_SUFFIX}`);
  }
  const ready = checks.every(([ok]) => ok);
  console.log(ready ? "\nGercek yedek icin: npm run backup:supabase -- --run" : "\nEksikler tamamlanmadan --run calismaz.");
}

async function runBackup(options) {
  const passphrase = requirePassphrase();
  const backupDir = requireBackupDir(options);
  const gpg = requireGpg();
  const connection = connectionEnv();
  const childEnv = baseEnv(connection);
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new UserError("Storage icin NEXT_PUBLIC_SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY gerekli (.env.local).");
  }

  const probe = queryJson(anyPsql(), "select json_build_object('v', current_setting('server_version_num')::int)::text", childEnv, "baglanti");
  const serverMajor = Math.floor(probe.v / 10000);
  const tools = requirePostgresTools(serverMajor, ["pg_dump", "psql"]);

  const createdAt = new Date();
  const archiveName = `${ARCHIVE_PREFIX}${timestampForName(createdAt)}${ARCHIVE_SUFFIX}`;
  const archivePath = join(backupDir.path, archiveName);
  if (existsSync(archivePath)) throw new UserError(`Ayni adla arsiv zaten var: ${archivePath}`);

  const staging = mkdtempSync(join(tmpdir(), "italypath-backup-"));
  chmodSync(staging, 0o700);
  const cleanup = () => rmSync(staging, { recursive: true, force: true });
  process.once("SIGINT", () => {
    cleanup();
    process.exit(130);
  });

  try {
    console.log(`ItalyPath Supabase yedegi basliyor -> ${archivePath}`);
    mkdirSync(join(staging, "db"), { mode: 0o700 });
    const dumpPath = join(staging, "db", "public.dump");

    // 1) Snapshot: sayimlar ve pg_dump ayni veri anini gorur.
    const session = new PsqlSession(tools.psql, childEnv);
    let snapshotConsistent = true;
    let inspection;
    let storage;
    try {
      await session.query("begin isolation level repeatable read read only");
      const snapshotId = await session.query("select pg_export_snapshot()");
      inspection = JSON.parse(await session.query(INSPECT_SQL));
      storage = JSON.parse(await session.query(storageSql(BACKUP_BUCKETS)));
      console.log(`  sayim alindi: ${inspection.objects.tables} tablo, ${storage.objects.length} dosya kaydi`);
      const dumpArgs = [
        "--format=custom",
        "--schema=public",
        "--no-password",
        "--lock-wait-timeout=30000",
        `--file=${dumpPath}`,
      ];
      const withSnapshot = run(tools.pg_dump, [...dumpArgs, `--snapshot=${snapshotId}`], {
        childEnv,
        allowFailure: true,
        label: "pg_dump",
      });
      if (withSnapshot.status !== 0) {
        const detail = scrub(withSnapshot.stderr).trim();
        if (!/snapshot/i.test(detail)) throw new UserError(`pg_dump basarisiz: ${detail}`);
        console.log("  uyari: snapshot paylasilamadi (baglanti havuzu); dump ayri anda alinacak, sayimlar tekrar okunacak");
        snapshotConsistent = false;
      }
    } finally {
      await session.close();
    }

    if (!snapshotConsistent) {
      run(tools.pg_dump, ["--format=custom", "--schema=public", "--no-password", "--lock-wait-timeout=30000", `--file=${dumpPath}`], {
        childEnv,
        label: "pg_dump",
      });
      inspection = queryJson(tools.psql, INSPECT_SQL, childEnv, "canli sayim");
      storage = queryJson(tools.psql, storageSql(BACKUP_BUCKETS), childEnv, "Storage listesi");
    }
    chmodSync(dumpPath, 0o600);
    const dumpBytes = statSync(dumpPath).size;
    console.log(`  pg_dump tamam: ${formatBytes(dumpBytes)}`);

    // 2) Storage dosyalari
    const files = await downloadStorageObjects(storage.objects, staging);
    const storageBytes = files.reduce((sum, file) => sum + file.bytes, 0);
    console.log(`  Storage tamam: ${files.length} dosya, ${formatBytes(storageBytes)}`);

    // 3) Manifest (gizli deger icermez)
    const gpgVersion = gpg.version;
    const manifest = {
      format: MANIFEST_FORMAT,
      created_at: createdAt.toISOString(),
      project_ref: projectRef(),
      source: {
        server_version: inspection.server_version,
        server_version_num: inspection.server_version_num,
        captured_at: inspection.captured_at,
        snapshot_consistent: snapshotConsistent,
      },
      tools: { pg_dump: tools.version, gpg: gpgVersion },
      database: {
        schema: "public",
        file: "db/public.dump",
        bytes: dumpBytes,
        sha256: sha256File(dumpPath),
        objects: inspection.objects,
        tables: inspection.tables,
        // pg_dump --schema=public yayin uyeligini icermez; geri yuklemede bu listeyle yeniden kurulur.
        realtime_tables: inspection.realtime_table_names,
      },
      storage: {
        buckets: storage.buckets,
        policies: storage.policies,
        objects: files,
      },
    };
    writeFileSync(join(staging, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o600 });

    // 4) Sifreli arsiv + hemen acma kontrolu
    await encryptDirectory(gpg, staging, archivePath, passphrase);
    const check = mkdtempSync(join(tmpdir(), "italypath-backup-check-"));
    try {
      await decryptArchive(gpg, archivePath, passphrase, check);
      const reopened = JSON.parse(readFileSync(join(check, "manifest.json"), "utf8"));
      if (reopened.database.sha256 !== sha256File(join(check, "db", "public.dump"))) {
        throw new UserError("Arsiv kontrolu basarisiz: dump ozeti tutmadi.");
      }
    } finally {
      rmSync(check, { recursive: true, force: true });
    }

    const archiveBytes = statSync(archivePath).size;
    const totalRows = Object.values(inspection.tables).reduce((sum, table) => sum + Number(table.rows), 0);
    console.log(`\nYedek hazir: ${archivePath}`);
    console.log(`  arsiv ${formatBytes(archiveBytes)}, ${inspection.objects.tables} tablo / ${totalRows} satir, ${files.length} dosya`);
    const tableBytes = Object.values(inspection.tables).reduce((sum, table) => sum + Number(table.bytes), 0);
    console.log(`  tahmini egress: en fazla ~${formatBytes(tableBytes + storageBytes)} (tablo alani + dosyalar)`);
    console.log(`  tutarlilik: ${snapshotConsistent ? "sayimlar ve dump ayni snapshot" : "ayri anlar (sayim farki olabilir)"}`);
    console.log(
      backupDir.offMachine
        ? "  hedef bilgisayar disinda da duruyor"
        : "  UYARI: hedef yalniz bu bilgisayarda; arsivi harici diske veya buluta kopyala",
    );
    console.log(`Kontrol: npm run backup:supabase -- --verify "${archivePath}"`);
  } finally {
    cleanup();
  }
}

async function openAndVerify(archivePath, passphrase, gpg, targetDirectory) {
  await decryptArchive(gpg, archivePath, passphrase, targetDirectory);
  const manifestPath = join(targetDirectory, "manifest.json");
  if (!existsSync(manifestPath)) throw new UserError("Arsivde manifest.json yok; bu bir ItalyPath yedegi degil.");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  if (manifest.format !== MANIFEST_FORMAT) throw new UserError(`Bilinmeyen yedek bicimi: ${manifest.format}`);

  const problems = [];
  const dumpPath = join(targetDirectory, manifest.database.file);
  if (!existsSync(dumpPath)) problems.push("dump dosyasi yok");
  else if (sha256File(dumpPath) !== manifest.database.sha256) problems.push("dump ozeti tutmadi");

  let filesOk = 0;
  for (const object of manifest.storage.objects) {
    const path = join(targetDirectory, object.file);
    if (!existsSync(path)) problems.push(`dosya yok: ${object.file}`);
    else if (sha256File(path) !== object.sha256) problems.push(`dosya ozeti tutmadi: ${object.file}`);
    else filesOk += 1;
  }
  return { manifest, dumpPath, filesOk, problems };
}

function tocSummary(pgRestorePath, dumpPath) {
  const listing = run(pgRestorePath, ["--list", dumpPath], { label: "pg_restore --list" }).stdout;
  const kinds = [
    "TABLE DATA",
    "TABLE",
    "VIEW",
    "SEQUENCE SET",
    "SEQUENCE OWNED BY",
    "SEQUENCE",
    "INDEX",
    "FK CONSTRAINT",
    "CONSTRAINT",
    "FUNCTION",
    "TRIGGER",
    "POLICY",
    "ROW SECURITY",
    "DEFAULT ACL",
    "ACL",
    "PUBLICATION TABLE",
    "COMMENT",
    "DEFAULT",
  ];
  const counts = {};
  let entries = 0;
  for (const line of listing.split("\n")) {
    if (!/^\d+;/.test(line)) continue;
    entries += 1;
    const body = line.replace(/^\d+;\s+\d+\s+\d+\s+/, "");
    const kind = kinds.find((candidate) => body.startsWith(`${candidate} `)) ?? "DIGER";
    counts[kind] = (counts[kind] ?? 0) + 1;
  }
  return { entries, counts };
}

// Runbook'taki gercek geri yukleme ayni listeyi kullanir: yalniz "SCHEMA - public" satiri cikar.
function writeRestoreList(pgRestorePath, dumpPath, listPath) {
  const listing = run(pgRestorePath, ["--list", dumpPath], { label: "pg_restore --list" }).stdout;
  const kept = listing.split("\n").filter((line) => !/^\d+;\s+\d+\s+\d+\s+SCHEMA\s+-\s+public\s/.test(line));
  writeFileSync(listPath, kept.join("\n"), { mode: 0o600 });
}

async function verify(options) {
  const passphrase = requirePassphrase();
  const gpg = requireGpg();
  const archivePath = resolveArchive(options);
  const workspace = mkdtempSync(join(tmpdir(), "italypath-verify-"));
  try {
    console.log(`Arsiv: ${archivePath} (${formatBytes(statSync(archivePath).size)})`);
    const { manifest, dumpPath, filesOk, problems } = await openAndVerify(archivePath, passphrase, gpg, workspace);
    const serverMajor = Math.floor(manifest.source.server_version_num / 10000);
    const tools = requirePostgresTools(serverMajor, ["pg_restore"]);
    const toc = tocSummary(tools.pg_restore, dumpPath);
    const tableCount = Object.keys(manifest.database.tables).length;
    console.log(`  acildi: parola dogru, gpg butunluk kontrolu gecti`);
    console.log(`  yedek ani: ${manifest.source.captured_at} (Postgres ${manifest.source.server_version})`);
    console.log(
      `  dump: ${formatBytes(manifest.database.bytes)}, ${toc.entries} icerik kaydi; ` +
        `TABLE ${toc.counts.TABLE ?? 0}, TABLE DATA ${toc.counts["TABLE DATA"] ?? 0}, POLICY ${toc.counts.POLICY ?? 0}, ` +
        `FUNCTION ${toc.counts.FUNCTION ?? 0}, INDEX ${toc.counts.INDEX ?? 0}, TRIGGER ${toc.counts.TRIGGER ?? 0}`,
    );
    if ((toc.counts["TABLE DATA"] ?? 0) !== tableCount) {
      problems.push(`dump'ta ${toc.counts["TABLE DATA"] ?? 0} tablo verisi var, manifest ${tableCount} tablo diyor`);
    }
    console.log(`  dosyalar: ${filesOk}/${manifest.storage.objects.length} ozet tuttu`);
    if (problems.length > 0) {
      for (const problem of problems) console.log(`  SORUN: ${problem}`);
      throw new UserError("Arsiv kontrolu basarisiz.");
    }
    console.log("SONUC: arsiv saglam.");
  } finally {
    rmSync(workspace, { recursive: true, force: true });
  }
}

function freePort() {
  return new Promise((resolvePromise, reject) => {
    const server = createServer();
    server.unref();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      server.close(() => resolvePromise(port));
    });
  });
}

// Supabase'in hazir kurdugu roller, auth semasi ve Realtime yayini; dump bunlara atif yapar.
const SUPABASE_STUBS_SQL = `
create role anon nologin noinherit;
create role authenticated nologin noinherit;
create role service_role nologin noinherit bypassrls;
create role authenticator nologin noinherit;
create role supabase_admin nologin;
create schema auth;
create function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb
$$;
create function auth.uid() returns uuid language sql stable as $$
  select nullif(auth.jwt() ->> 'sub', '')::uuid
$$;
create function auth.role() returns text language sql stable as $$
  select nullif(auth.jwt() ->> 'role', '')
$$;
grant usage on schema auth to anon, authenticated, service_role;
create schema extensions;
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pgcrypto') then
    create extension pgcrypto schema extensions;
  end if;
  if exists (select 1 from pg_available_extensions where name = 'uuid-ossp') then
    create extension "uuid-ossp" schema extensions;
  end if;
end
$$;
create publication supabase_realtime;
`;

async function drill(options) {
  const passphrase = requirePassphrase();
  const gpg = requireGpg();
  const archivePath = resolveArchive(options);
  const workspace = mkdtempSync(join(tmpdir(), "italypath-drill-"));
  const dataDirectory = join(workspace, "data");
  // Kisa soket yolu (macOS ~103 karakter siniri) ve yalniz bu kullaniciya acik klasor; TCP dinlenmez.
  const socketDirectory = mkdtempSync("/tmp/ipd-");
  const extractDirectory = join(workspace, "archive");
  let tools = null;
  let started = false;

  const cleanup = () => {
    if (started && tools) {
      spawnSync(tools.pg_ctl, ["-D", dataDirectory, "-m", "fast", "-w", "stop"], { env: baseEnv(), encoding: "utf8" });
      started = false;
    }
    rmSync(workspace, { recursive: true, force: true });
    rmSync(socketDirectory, { recursive: true, force: true });
  };
  process.once("SIGINT", () => {
    cleanup();
    process.exit(130);
  });

  try {
    console.log(`Geri yukleme provasi: ${archivePath}`);
    mkdirSync(extractDirectory, { mode: 0o700 });
    const { manifest, dumpPath, filesOk, problems } = await openAndVerify(archivePath, passphrase, gpg, extractDirectory);
    const serverMajor = Math.floor(manifest.source.server_version_num / 10000);
    tools = requirePostgresTools(serverMajor, PG_TOOLS);
    console.log(`  arsiv acildi; yerel PostgreSQL ${tools.major} (${tools.directory})`);

    const port = await freePort();
    run(tools.initdb, ["-D", dataDirectory, "-A", "trust", "-U", "postgres", "--no-locale", "-E", "UTF8"], {
      label: "initdb",
    });
    chmodSync(socketDirectory, 0o700);
    run(
      tools.pg_ctl,
      ["-D", dataDirectory, "-l", join(workspace, "postgres.log"), "-o", `-F -h '' -p ${port} -k ${socketDirectory}`, "-w", "start"],
      { label: "pg_ctl start" },
    );
    started = true;
    const localEnv = baseEnv({ PGHOST: socketDirectory, PGPORT: String(port), PGUSER: "postgres", PGDATABASE: "postgres" });
    console.log(`  gecici kume calisiyor (yalniz yerel soket, LC_ALL=C)`);

    run(tools.psql, ["-X", "-q", "-v", "ON_ERROR_STOP=1", "-c", "create database restore_drill"], {
      childEnv: localEnv,
      label: "create database",
    });
    const drillEnv = { ...localEnv, PGDATABASE: "restore_drill" };
    run(tools.psql, ["-X", "-q", "-v", "ON_ERROR_STOP=1"], {
      childEnv: drillEnv,
      input: SUPABASE_STUBS_SQL,
      label: "Supabase rol/sema taslaklari",
    });
    // Hedefte public semasi zaten var (yeni Supabase projesinde de oyle): CREATE SCHEMA satiri listeden cikar.
    const listPath = join(workspace, "restore.list");
    writeRestoreList(tools.pg_restore, dumpPath, listPath);
    run(
      tools.pg_restore,
      ["--dbname=restore_drill", "--exit-on-error", "--single-transaction", "--no-password", `--use-list=${listPath}`, dumpPath],
      { childEnv: drillEnv, label: "pg_restore" },
    );
    console.log("  pg_restore hatasiz tamamlandi (CREATE SCHEMA public haric, tek transaction)");
    const realtimeTables = manifest.database.realtime_tables ?? [];
    if (realtimeTables.length > 0) {
      const names = realtimeTables.map((name) => `public.${quoteIdentifier(name)}`).join(", ");
      run(tools.psql, ["-X", "-q", "-v", "ON_ERROR_STOP=1", "-c", `alter publication supabase_realtime add table ${names}`], {
        childEnv: drillEnv,
        label: "Realtime yayini",
      });
      console.log(`  Realtime yayini manifest'ten yeniden kuruldu: ${realtimeTables.join(", ")}`);
    }

    const restored = queryJson(tools.psql, INSPECT_SQL, drillEnv, "geri yuklenen sayim");
    const rows = [];
    const liveTables = manifest.database.tables;
    const tableNames = [...new Set([...Object.keys(liveTables), ...Object.keys(restored.tables)])].sort();
    for (const name of tableNames) {
      const live = liveTables[name]?.rows ?? "-";
      const back = restored.tables[name]?.rows ?? "-";
      rows.push({ group: "tablo", name, live, back, ok: String(live) === String(back) });
    }
    const objectNames = [...new Set([...Object.keys(manifest.database.objects), ...Object.keys(restored.objects)])];
    for (const name of objectNames) {
      const live = manifest.database.objects[name] ?? "-";
      const back = restored.objects[name] ?? "-";
      rows.push({ group: "nesne", name, live, back, ok: String(live) === String(back) });
    }

    console.log(`\n  ${pad("", 6)} ${pad("ad", 28)} ${padLeft("yedek ani", 9)} ${padLeft("geri yuklenen", 13)}`);
    for (const row of rows) {
      console.log(
        `  ${pad(row.group, 6)} ${pad(row.name, 28)} ${padLeft(row.live, 9)} ${padLeft(row.back, 13)}  ${row.ok ? "tuttu" : "TUTMADI"}`,
      );
    }
    console.log(
      `  ${pad("dosya", 6)} ${pad("Storage (sha256)", 28)} ${padLeft(manifest.storage.objects.length, 9)} ${padLeft(filesOk, 13)}  ${
        filesOk === manifest.storage.objects.length ? "tuttu" : "TUTMADI"
      }`,
    );

    const tableRows = rows.filter((row) => row.group === "tablo");
    const objectRows = rows.filter((row) => row.group === "nesne");
    const mismatches = rows.filter((row) => !row.ok).length + problems.length;
    console.log(
      `\nSONUC: ${mismatches === 0 ? "TUTTU" : "TUTMADI"} - tablo ${tableRows.filter((row) => row.ok).length}/${tableRows.length}, ` +
        `nesne turu ${objectRows.filter((row) => row.ok).length}/${objectRows.length}, dosya ${filesOk}/${manifest.storage.objects.length}` +
        (manifest.source.snapshot_consistent ? "" : " (yedek ayri anlarda alinmisti)"),
    );
    for (const problem of problems) console.log(`  SORUN: ${problem}`);
    if (mismatches > 0) process.exitCode = 1;
  } finally {
    cleanup();
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.mode === "help") return printHelp();
  if (options.mode === "dry-run") return dryRun(options);
  if (options.mode === "run") return runBackup(options);
  if (options.mode === "verify") return verify(options);
  if (options.mode === "drill") return drill(options);
  return printHelp();
}

try {
  await main();
} catch (error) {
  const message = scrub(error instanceof UserError ? error.message : error?.stack ?? error);
  console.error(`\nHATA: ${message}`);
  if (/could not translate host name|Network is unreachable|No route to host|timeout expired/i.test(message)) {
    console.error("Ipucu: Supabase Dashboard -> Connect -> Session pooler dizesini kullan (dogrudan baglanti yalniz IPv6).");
  }
  if (/password authentication failed/i.test(message)) {
    console.error("Ipucu: veritabani parolasi yanlis; Dashboard -> Project Settings -> Database'den kontrol et.");
  }
  process.exit(1);
}
