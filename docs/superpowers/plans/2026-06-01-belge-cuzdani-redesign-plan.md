# Belge Cüzdanı Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Visual craft:** Components are written here in the established editorial idiom. During execution, apply the **high-end-visual-design** skill when polishing spacing / micro-interactions — do not regress to generic tokens (see the smoke check in Task 2).
>
> **Branch & commits:** Execute on a feature branch or git worktree (never the default branch). Commits are local until the user approves a PR/merge. **Every commit message ends with:** `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

**Goal:** Rebuild `/documents` (Belge Cüzdanı) from scratch into an editorial, category-organized document wallet matching the rest of the app, preserving the full Supabase upload/view/delete/stage contract.

**Architecture:** A `"use client"` orchestrator (`app/documents/page.tsx`) wires one data hook (`lib/documents/useUserDocuments.ts`) and six focused presentational components under `components/documents/`. A fixed 6-category registry (`lib/documents/categories.ts`) drives grouping; documents store a `category` key. Upload → pick type (bottom sheet) → save.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind v4 (editorial CSS-var tokens in `globals.css`), Framer Motion, Clerk, Supabase (Storage + `user_documents`), Lucide icons. No new dependencies, no `tailwind.config.*`.

**Spec:** `docs/superpowers/specs/2026-06-01-belge-cuzdani-redesign-design.md`

**Verification model:** No unit-test framework in this repo. Per-task gate = `npx tsc --noEmit`. Feature acceptance gate = `npm run check:documents-ui` (authored red in Task 2 → green in Task 9) + `npm run lint` + `npm run build`.

---

### Task 1: Database column (prerequisite artifact)

**Files:**
- Create: `supabase/add_documents_category.sql`

- [ ] **Step 1: Write the migration SQL**

```sql
-- Belge Cüzdanı — belge "tür"ünü (kategori) saklamak için tek alan.
-- Idempotent. Supabase SQL editor'da bir kez çalıştır. RLS/policy değişmez.
-- Mevcut satırlar NULL kalır ve UI'da "Diğer" altında görünür.
alter table public.user_documents
  add column if not exists category text;
```

- [ ] **Step 2: Commit**

```bash
git add supabase/add_documents_category.sql
git commit -m "chore(documents): add category column migration" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

> **Operational note (surface to product owner):** This SQL must be run in the Supabase project **before** uploads can persist a type. Until then, listing/viewing/deleting still work; new uploads would fail on insert. Do not auto-run; the owner applies it in the Supabase dashboard.

---

### Task 2: UI smoke check (acceptance gate, authored red)

**Files:**
- Create: `scripts/check-documents-ui.mjs`
- Modify: `package.json` (scripts block)

- [ ] **Step 1: Write the smoke-check script**

```js
// Belge Cüzdanı editorial guard — mirrors scripts/check-editorial-ui.mjs.
// Fails if /documents still uses generic tokens, if a component is missing,
// or if the category registry lost a key.
import { readFileSync, existsSync } from "node:fs";

const FORBIDDEN = [
  "#4f46e5",
  "linear-gradient(135deg",
  "shadow-indigo",
  "rounded-3xl",
  "bg-[#f8fafc]",
  "font-black",
  "bg-amber-50",
  "blur-xl",
  "indigo-",
];

const COMPONENT_FILES = [
  "app/documents/page.tsx",
  "components/documents/DocumentsHeader.tsx",
  "components/documents/UploadDock.tsx",
  "components/documents/CategoryPickerSheet.tsx",
  "components/documents/CategoryGroup.tsx",
  "components/documents/DocumentRow.tsx",
  "components/documents/DocumentsEmptyState.tsx",
];

const failures = [];

for (const file of COMPONENT_FILES) {
  if (!existsSync(file)) {
    failures.push(`missing file: ${file}`);
    continue;
  }
  const src = readFileSync(file, "utf8");
  for (const token of FORBIDDEN) {
    if (src.includes(token)) failures.push(`${file} contains forbidden token: ${token}`);
  }
  if (!src.includes("var(--editorial-")) {
    failures.push(`${file} does not use editorial tokens (var(--editorial-…))`);
  }
}

const catFile = "lib/documents/categories.ts";
if (!existsSync(catFile)) {
  failures.push(`missing file: ${catFile}`);
} else {
  const src = readFileSync(catFile, "utf8");
  for (const key of ["identity", "academic", "language", "letters", "financial", "other"]) {
    if (!src.includes(`"${key}"`)) failures.push(`categories.ts missing key: ${key}`);
  }
}

if (failures.length) {
  console.error("check:documents-ui FAILED");
  for (const f of failures) console.error(" - " + f);
  process.exit(1);
}
console.log("check:documents-ui passed");
```

- [ ] **Step 2: Add the npm script**

In `package.json`, inside `"scripts"`, add after `"check:editorial-ui"`:

```json
    "check:documents-ui": "node scripts/check-documents-ui.mjs",
```

- [ ] **Step 3: Run it — expect RED**

Run: `npm run check:documents-ui`
Expected: FAIL — lists `app/documents/page.tsx contains forbidden token: …` and `missing file: …`. This is the intended starting state; it turns green in Task 9.

- [ ] **Step 4: Commit**

```bash
git add scripts/check-documents-ui.mjs package.json
git commit -m "test(documents): add editorial UI smoke check (red)" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Category registry

**Files:**
- Create: `lib/documents/categories.ts`

- [ ] **Step 1: Write the registry**

```ts
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
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/documents/categories.ts
git commit -m "feat(documents): add fixed category registry" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: Add `category` to the UserDocument type

**Files:**
- Modify: `types/index.ts` (the `UserDocument` interface)

- [ ] **Step 1: Add the field**

Replace the existing `UserDocument` interface with:

```ts
export interface UserDocument {
  id: string;
  user_id: string;
  file_name: string;
  file_url: string;
  storage_path: string;
  created_at: string;
  category?: string | null;
  signed_url?: string;
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors (field is optional; existing code unaffected).

- [ ] **Step 3: Commit**

```bash
git add types/index.ts
git commit -m "feat(documents): add category field to UserDocument" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: Add new translation keys (additive — keep old keys for now)

**Files:**
- Modify: `lib/translations.ts` (the top-level `tr.documents` block at ~226 and `en.documents` block at ~716 — the one whose `title` is "Belge Cüzdanı" / "Document Wallet")

> Keep ALL existing keys; just add the new properties below. (Old keys are removed in Task 9 once the page no longer uses them — this keeps the build green meanwhile.) TR and EN must receive the SAME new keys (TypeScript enforces parity).

- [ ] **Step 1: Add new keys to `tr.documents`**

Add these properties inside the `tr.documents` object (alongside the existing ones):

```ts
      eyebrow: "İtalya Başvuru Evrakları",
      summary: { docs: "belge", types: "türde" },
      actions: { scan: "Belge Tara", upload: "Dosya Yükle" },
      sheet: {
        eyebrow: "Belge Ekleniyor",
        title: "Bu belge hangi tür?",
        selectedSuffix: "seçildi",
        save: "Kaydet",
        cancel: "Vazgeç",
      },
      categories: {
        identity: "Kimlik & Resmî",
        academic: "Akademik",
        language: "Dil",
        letters: "Mektuplar",
        financial: "Mali / ISEE",
        other: "Diğer",
      },
      row: { view: "Görüntüle", delete: "Sil", confirmYes: "Evet", confirmNo: "Vazgeç" },
      uploading: "Yükleniyor…",
      errors: {
        size: "Dosya 5MB'tan büyük olamaz.",
        type: "Sadece resim ve PDF yüklenebilir.",
        generic: "Bir şeyler ters gitti, tekrar dene.",
        deleteFail: "Silme başarısız oldu.",
      },
      emptyState: {
        eyebrow: "Boş Cüzdan",
        title: "Belge cüzdanın henüz boş",
        text: "İtalya yolculuğunda ihtiyacın olan belgeleri buraya ekle; tür seçtikçe derli toplu dururlar.",
        categoriesHint: "Kimlik · Akademik · Dil · Mektuplar · Mali · Diğer",
      },
```

- [ ] **Step 2: Add the SAME keys to `en.documents`**

```ts
      eyebrow: "Italy Application Documents",
      summary: { docs: "documents", types: "types" },
      actions: { scan: "Scan Document", upload: "Upload File" },
      sheet: {
        eyebrow: "Adding Document",
        title: "What type is this?",
        selectedSuffix: "selected",
        save: "Save",
        cancel: "Cancel",
      },
      categories: {
        identity: "Identity & Official",
        academic: "Academic",
        language: "Language",
        letters: "Letters",
        financial: "Financial / ISEE",
        other: "Other",
      },
      row: { view: "View", delete: "Delete", confirmYes: "Yes", confirmNo: "Cancel" },
      uploading: "Uploading…",
      errors: {
        size: "File must be under 5MB.",
        type: "Only images and PDFs are allowed.",
        generic: "Something went wrong, please try again.",
        deleteFail: "Deletion failed.",
      },
      emptyState: {
        eyebrow: "Empty Wallet",
        title: "Your document wallet is empty",
        text: "Add the documents you need for your Italy journey; pick a type and they stay neatly organized.",
        categoriesHint: "Identity · Academic · Language · Letters · Financial · Other",
      },
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors (TR/EN shapes match; old page still uses old keys, still present).

- [ ] **Step 4: Commit**

```bash
git add lib/translations.ts
git commit -m "feat(documents): add new editorial translation keys (TR/EN)" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 6: Data hook

**Files:**
- Create: `lib/documents/useUserDocuments.ts`

- [ ] **Step 1: Write the hook**

```ts
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { createClerkSupabaseClient } from "@/lib/supabaseClient";
import { advanceStageIfBefore } from "@/lib/hub/useHubStage";
import {
  DOCUMENT_CATEGORY_ORDER,
  resolveCategoryKey,
  type DocumentCategoryKey,
} from "@/lib/documents/categories";
import type { UserDocument } from "@/types";

const SIGNED_URL_EXPIRES_IN_SECONDS = 60 * 10;

export interface DocumentGroup {
  key: DocumentCategoryKey;
  docs: UserDocument[];
}

export interface UseUserDocuments {
  groups: DocumentGroup[];
  flatDocs: UserDocument[];
  loading: boolean;
  uploading: boolean;
  upload: (file: File, category: DocumentCategoryKey) => Promise<void>;
  remove: (id: string, storagePath: string) => Promise<void>;
  reload: () => Promise<void>;
}

export function useUserDocuments(): UseUserDocuments {
  const { user } = useUser();
  const { getToken } = useAuth();
  const [flatDocs, setFlatDocs] = useState<UserDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const supabase = useMemo(
    () =>
      createClerkSupabaseClient(async () => {
        try {
          return await getToken({ template: "supabase" });
        } catch {
          return null;
        }
      }),
    [getToken],
  );

  const fetchDocs = useCallback(async () => {
    if (!user?.id) {
      setFlatDocs([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("user_documents")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("Belge listeleme hatası:", error);
      setFlatDocs([]);
      setLoading(false);
      return;
    }
    const rows = (data ?? []) as UserDocument[];
    if (!rows.length) {
      setFlatDocs([]);
      setLoading(false);
      return;
    }
    const paths = rows.map((d) => d.storage_path);
    const { data: signed, error: signedError } = await supabase.storage
      .from("documents")
      .createSignedUrls(paths, SIGNED_URL_EXPIRES_IN_SECONDS);
    if (signedError) console.error("İmzalı URL hatası:", signedError);
    const byPath = new Map((signed ?? []).map((s) => [s.path, s.signedUrl ?? undefined]));
    setFlatDocs(rows.map((d) => ({ ...d, signed_url: byPath.get(d.storage_path) })));
    setLoading(false);
  }, [supabase, user?.id]);

  useEffect(() => {
    void fetchDocs();
  }, [fetchDocs]);

  const upload = useCallback(
    async (file: File, category: DocumentCategoryKey) => {
      if (!user?.id) return;
      setUploading(true);
      const ext = file.name.split(".").pop();
      const filePath = `${user.id}/${Date.now()}.${ext}`;
      let inStorage = false;
      let rowCreated = false;
      try {
        const { error: storageError } = await supabase.storage
          .from("documents")
          .upload(filePath, file);
        if (storageError) throw storageError;
        inStorage = true;
        const { error: dbError } = await supabase.from("user_documents").insert({
          user_id: user.id,
          file_name: file.name,
          file_url: filePath,
          storage_path: filePath,
          category,
        });
        if (dbError) throw dbError;
        rowCreated = true;
        advanceStageIfBefore("documents");
        await fetchDocs();
      } catch (err) {
        if (inStorage && !rowCreated) {
          const { error: cleanupError } = await supabase.storage
            .from("documents")
            .remove([filePath]);
          if (cleanupError) console.error("Yükleme sonrası temizleme hatası:", cleanupError);
        }
        throw err;
      } finally {
        setUploading(false);
      }
    },
    [supabase, user?.id, fetchDocs],
  );

  const remove = useCallback(
    async (id: string, storagePath: string) => {
      const { error: storageError } = await supabase.storage
        .from("documents")
        .remove([storagePath]);
      if (storageError) throw storageError;
      const { error: dbError } = await supabase.from("user_documents").delete().eq("id", id);
      if (dbError) throw dbError;
      setFlatDocs((prev) => prev.filter((d) => d.id !== id));
    },
    [supabase],
  );

  const groups = useMemo<DocumentGroup[]>(
    () =>
      DOCUMENT_CATEGORY_ORDER.map((key) => ({
        key,
        docs: flatDocs.filter((d) => resolveCategoryKey(d.category) === key),
      })).filter((g) => g.docs.length > 0),
    [flatDocs],
  );

  return { groups, flatDocs, loading, uploading, upload, remove, reload: fetchDocs };
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/documents/useUserDocuments.ts
git commit -m "feat(documents): add useUserDocuments hook (fetch/group/upload/delete)" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 7: Display components (Header, Row, Group, EmptyState)

**Files:**
- Create: `components/documents/DocumentsHeader.tsx`
- Create: `components/documents/DocumentRow.tsx`
- Create: `components/documents/CategoryGroup.tsx`
- Create: `components/documents/DocumentsEmptyState.tsx`

- [ ] **Step 1: DocumentsHeader.tsx**

```tsx
"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

interface DocumentsHeaderProps {
  docCount: number;
  typeCount: number;
}

export default function DocumentsHeader({ docCount, typeCount }: DocumentsHeaderProps) {
  const { t } = useLanguage();
  return (
    <header className="border-b border-[var(--editorial-border)] px-6 pb-7 pt-6">
      <Link
        href="/"
        className="mb-7 inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--editorial-muted)] transition-colors hover:text-[var(--editorial-sage)]"
      >
        <ArrowLeft className="h-4 w-4" strokeWidth={2} />
        {t.list.backHome}
      </Link>
      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--editorial-terracotta)]">
        {t.documents.eyebrow}
      </p>
      <h1 className="mt-2 font-serif text-4xl font-normal tracking-[-0.01em] text-[var(--editorial-ink)] sm:text-5xl">
        {t.documents.title}
      </h1>
      {docCount > 0 && (
        <p className="mt-3 text-[13px] text-[var(--editorial-muted)]">
          {docCount} {t.documents.summary.docs} · {typeCount} {t.documents.summary.types}
        </p>
      )}
    </header>
  );
}
```

- [ ] **Step 2: DocumentRow.tsx**

```tsx
"use client";

import { useState } from "react";
import { ExternalLink, Trash2 } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import type { UserDocument } from "@/types";

interface DocumentRowProps {
  doc: UserDocument;
  onDelete: (id: string, storagePath: string) => void;
  isLast: boolean;
}

function fileKind(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf") return "PDF";
  if (["jpg", "jpeg", "png", "webp", "heic", "gif"].includes(ext)) return "IMG";
  return (ext || "DOC").slice(0, 3).toUpperCase();
}

export default function DocumentRow({ doc, onDelete, isLast }: DocumentRowProps) {
  const { t, language } = useLanguage();
  const [confirming, setConfirming] = useState(false);

  const dateLabel = new Date(doc.created_at).toLocaleDateString(
    language === "tr" ? "tr-TR" : "en-US",
    { day: "numeric", month: "long", year: "numeric" },
  );

  return (
    <div
      className={`flex items-center gap-3.5 py-3.5 ${
        isLast ? "" : "border-b border-[var(--editorial-border)]"
      }`}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center border border-[var(--editorial-border)] bg-[var(--editorial-surface)] text-[8px] font-bold tracking-[0.06em] text-[var(--editorial-sage)]">
        {fileKind(doc.file_name)}
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[13.5px] font-semibold text-[var(--editorial-ink)]">{doc.file_name}</p>
        <p className="mt-0.5 text-[10px] text-[var(--editorial-muted)]">{dateLabel}</p>
      </div>

      {confirming ? (
        <div className="flex shrink-0 items-center gap-3">
          <button
            type="button"
            onClick={() => onDelete(doc.id, doc.storage_path)}
            className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--editorial-terracotta)]"
          >
            {t.documents.row.confirmYes}
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--editorial-muted)]"
          >
            {t.documents.row.confirmNo}
          </button>
        </div>
      ) : (
        <div className="flex shrink-0 items-center gap-4">
          {doc.signed_url ? (
            <a
              href={doc.signed_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--editorial-sage)]"
            >
              <ExternalLink className="h-3 w-3" strokeWidth={2} />
              {t.documents.row.view}
            </a>
          ) : (
            <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--editorial-border)]">
              <ExternalLink className="h-3 w-3" strokeWidth={2} />
              {t.documents.row.view}
            </span>
          )}
          <button
            type="button"
            onClick={() => setConfirming(true)}
            aria-label={t.documents.row.delete}
            className="text-[var(--editorial-border)] transition-colors hover:text-[var(--editorial-terracotta)]"
          >
            <Trash2 className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: CategoryGroup.tsx**

```tsx
"use client";

import { useLanguage } from "@/context/LanguageContext";
import { type DocumentCategoryKey } from "@/lib/documents/categories";
import type { UserDocument } from "@/types";
import DocumentRow from "@/components/documents/DocumentRow";

interface CategoryGroupProps {
  categoryKey: DocumentCategoryKey;
  docs: UserDocument[];
  onDelete: (id: string, storagePath: string) => void;
}

export default function CategoryGroup({ categoryKey, docs, onDelete }: CategoryGroupProps) {
  const { t } = useLanguage();
  return (
    <section className="mt-8 first:mt-7">
      <div className="mb-1.5 flex items-baseline justify-between">
        <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--editorial-terracotta)]">
          {t.documents.categories[categoryKey]}
        </h2>
        <span className="text-[10px] font-bold tracking-[0.1em] text-[var(--editorial-muted)]">
          {String(docs.length).padStart(2, "0")}
        </span>
      </div>
      {docs.map((doc, i) => (
        <DocumentRow key={doc.id} doc={doc} onDelete={onDelete} isLast={i === docs.length - 1} />
      ))}
    </section>
  );
}
```

- [ ] **Step 4: DocumentsEmptyState.tsx**

```tsx
"use client";

import { useLanguage } from "@/context/LanguageContext";

export default function DocumentsEmptyState() {
  const { t } = useLanguage();
  return (
    <div className="mt-10 border border-[var(--editorial-border)] bg-[var(--editorial-band)] px-7 py-12 text-center">
      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--editorial-terracotta)]">
        {t.documents.emptyState.eyebrow}
      </p>
      <h2 className="mx-auto mt-3 max-w-xs font-serif text-2xl font-normal text-[var(--editorial-ink)]">
        {t.documents.emptyState.title}
      </h2>
      <p className="mx-auto mt-3 max-w-sm text-[13px] leading-relaxed text-[var(--editorial-muted)]">
        {t.documents.emptyState.text}
      </p>
      <p className="mt-6 text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--editorial-muted)]">
        {t.documents.emptyState.categoriesHint}
      </p>
    </div>
  );
}
```

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors (all referenced `t.documents.*` keys exist from Task 5).

- [ ] **Step 6: Commit**

```bash
git add components/documents/DocumentsHeader.tsx components/documents/DocumentRow.tsx components/documents/CategoryGroup.tsx components/documents/DocumentsEmptyState.tsx
git commit -m "feat(documents): add header, row, category group, empty state" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 8: Input components (UploadDock, CategoryPickerSheet)

**Files:**
- Create: `components/documents/UploadDock.tsx`
- Create: `components/documents/CategoryPickerSheet.tsx`

- [ ] **Step 1: UploadDock.tsx**

```tsx
"use client";

import { useRef } from "react";
import { ScanLine, Upload } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

interface UploadDockProps {
  onFileSelected: (file: File) => void;
  disabled?: boolean;
}

export default function UploadDock({ onFileSelected, disabled }: UploadDockProps) {
  const { t } = useLanguage();
  const scanRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFileSelected(file);
    e.target.value = "";
  };

  return (
    <div className="grid grid-cols-2 gap-3">
      <button
        type="button"
        disabled={disabled}
        onClick={() => scanRef.current?.click()}
        className="flex items-center justify-center gap-2 border border-[var(--editorial-sage)] bg-[var(--editorial-sage)] px-4 py-4 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--editorial-paper)] transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        <ScanLine className="h-4 w-4" strokeWidth={2} />
        {t.documents.actions.scan}
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => fileRef.current?.click()}
        className="flex items-center justify-center gap-2 border border-dashed border-[var(--editorial-sage)] bg-[var(--editorial-surface)] px-4 py-4 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--editorial-sage)] transition-colors hover:bg-[var(--editorial-sage-soft)] disabled:opacity-50"
      >
        <Upload className="h-4 w-4" strokeWidth={2} />
        {t.documents.actions.upload}
      </button>

      <input ref={scanRef} type="file" accept="image/*" capture="environment" onChange={handle} className="hidden" />
      <input ref={fileRef} type="file" accept="image/*,application/pdf" onChange={handle} className="hidden" />
    </div>
  );
}
```

- [ ] **Step 2: CategoryPickerSheet.tsx**

```tsx
"use client";

import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useLanguage } from "@/context/LanguageContext";
import { DOCUMENT_CATEGORY_ORDER, type DocumentCategoryKey } from "@/lib/documents/categories";

interface CategoryPickerSheetProps {
  fileName: string | null; // null => kapalı
  selected: DocumentCategoryKey | null;
  onSelect: (key: DocumentCategoryKey) => void;
  onSave: () => void;
  onCancel: () => void;
  busy?: boolean;
}

export default function CategoryPickerSheet({
  fileName,
  selected,
  onSelect,
  onSave,
  onCancel,
  busy,
}: CategoryPickerSheetProps) {
  const { t } = useLanguage();
  const reduce = useReducedMotion();
  const open = fileName !== null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(21,32,28,0.32)]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onCancel}
        >
          <motion.div
            className="w-full max-w-md border-t border-[var(--editorial-border)] bg-[var(--editorial-surface)] px-6 pb-8 pt-6"
            initial={reduce ? { opacity: 0 } : { y: "100%" }}
            animate={reduce ? { opacity: 1 } : { y: 0 }}
            exit={reduce ? { opacity: 0 } : { y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--editorial-terracotta)]">
              {t.documents.sheet.eyebrow}
            </p>
            <h2 className="mt-1.5 font-serif text-2xl font-normal text-[var(--editorial-ink)]">
              {t.documents.sheet.title}
            </h2>
            <p className="mt-1 text-[12px] text-[var(--editorial-muted)]">
              {fileName} {t.documents.sheet.selectedSuffix}
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              {DOCUMENT_CATEGORY_ORDER.map((key) => {
                const active = selected === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => onSelect(key)}
                    className={`border px-3.5 py-2.5 text-[12px] font-medium transition-colors ${
                      active
                        ? "border-[var(--editorial-sage)] bg-[var(--editorial-sage)] text-[var(--editorial-paper)]"
                        : "border-[var(--editorial-border)] bg-[var(--editorial-paper)] text-[var(--editorial-ink)] hover:border-[var(--editorial-sage)]"
                    }`}
                  >
                    {t.documents.categories[key]}
                  </button>
                );
              })}
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={onCancel}
                disabled={busy}
                className="flex-1 border border-[var(--editorial-border)] py-3.5 text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--editorial-muted)] disabled:opacity-50"
              >
                {t.documents.sheet.cancel}
              </button>
              <button
                type="button"
                onClick={onSave}
                disabled={!selected || busy}
                className="flex-[1.6] bg-[var(--editorial-sage)] py-3.5 text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--editorial-paper)] transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                {busy ? t.documents.uploading : t.documents.sheet.save}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add components/documents/UploadDock.tsx components/documents/CategoryPickerSheet.tsx
git commit -m "feat(documents): add upload dock + category picker sheet" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 9: Rewrite the page + remove obsolete translation keys (turns smoke check GREEN)

**Files:**
- Modify (full rewrite): `app/documents/page.tsx`
- Modify: `lib/translations.ts` (replace the whole `tr.documents` and `en.documents` blocks with the FINAL versions below — this removes the now-unused old keys)

- [ ] **Step 1: Replace `app/documents/page.tsx` entirely**

```tsx
"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { useUserDocuments } from "@/lib/documents/useUserDocuments";
import { type DocumentCategoryKey } from "@/lib/documents/categories";
import DocumentsHeader from "@/components/documents/DocumentsHeader";
import UploadDock from "@/components/documents/UploadDock";
import CategoryPickerSheet from "@/components/documents/CategoryPickerSheet";
import CategoryGroup from "@/components/documents/CategoryGroup";
import DocumentsEmptyState from "@/components/documents/DocumentsEmptyState";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

export default function DocumentsPage() {
  const { t } = useLanguage();
  const { groups, flatDocs, loading, uploading, upload, remove } = useUserDocuments();

  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingCategory, setPendingCategory] = useState<DocumentCategoryKey | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelected = (file: File) => {
    setError(null);
    if (file.size > MAX_FILE_SIZE) {
      setError(t.documents.errors.size);
      return;
    }
    if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
      setError(t.documents.errors.type);
      return;
    }
    setPendingCategory(null);
    setPendingFile(file);
  };

  const handleSave = async () => {
    if (!pendingFile || !pendingCategory) return;
    try {
      await upload(pendingFile, pendingCategory);
    } catch {
      setError(t.documents.errors.generic);
    } finally {
      setPendingFile(null);
      setPendingCategory(null);
    }
  };

  const handleDelete = async (id: string, storagePath: string) => {
    setError(null);
    try {
      await remove(id, storagePath);
    } catch {
      setError(t.documents.errors.deleteFail);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--editorial-paper)] pb-32 font-sans text-[var(--editorial-ink)]">
      <DocumentsHeader docCount={flatDocs.length} typeCount={groups.length} />

      <div className="mx-auto max-w-2xl px-6">
        <div className="mt-7">
          <UploadDock onFileSelected={handleFileSelected} disabled={uploading} />
        </div>

        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-4 border-l-2 border-[var(--editorial-terracotta)] bg-[var(--editorial-surface)] px-3 py-2 text-[12px] text-[var(--editorial-terracotta)]"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>

        {uploading && (
          <p className="mt-4 flex items-center gap-2 text-[12px] font-medium text-[var(--editorial-sage)]">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            {t.documents.uploading}
          </p>
        )}

        {!loading && flatDocs.length === 0 && !uploading && <DocumentsEmptyState />}

        {flatDocs.length > 0 && (
          <div className="pb-4">
            {groups.map((g) => (
              <CategoryGroup key={g.key} categoryKey={g.key} docs={g.docs} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </div>

      <CategoryPickerSheet
        fileName={pendingFile?.name ?? null}
        selected={pendingCategory}
        onSelect={setPendingCategory}
        onSave={handleSave}
        onCancel={() => {
          setPendingFile(null);
          setPendingCategory(null);
        }}
        busy={uploading}
      />
    </div>
  );
}
```

- [ ] **Step 2: Replace `tr.documents` block with the final version**

```ts
    documents: {
      eyebrow: "İtalya Başvuru Evrakları",
      title: "Belge Cüzdanı",
      summary: { docs: "belge", types: "türde" },
      actions: { scan: "Belge Tara", upload: "Dosya Yükle" },
      sheet: {
        eyebrow: "Belge Ekleniyor",
        title: "Bu belge hangi tür?",
        selectedSuffix: "seçildi",
        save: "Kaydet",
        cancel: "Vazgeç",
      },
      categories: {
        identity: "Kimlik & Resmî",
        academic: "Akademik",
        language: "Dil",
        letters: "Mektuplar",
        financial: "Mali / ISEE",
        other: "Diğer",
      },
      row: { view: "Görüntüle", delete: "Sil", confirmYes: "Evet", confirmNo: "Vazgeç" },
      uploading: "Yükleniyor…",
      errors: {
        size: "Dosya 5MB'tan büyük olamaz.",
        type: "Sadece resim ve PDF yüklenebilir.",
        generic: "Bir şeyler ters gitti, tekrar dene.",
        deleteFail: "Silme başarısız oldu.",
      },
      emptyState: {
        eyebrow: "Boş Cüzdan",
        title: "Belge cüzdanın henüz boş",
        text: "İtalya yolculuğunda ihtiyacın olan belgeleri buraya ekle; tür seçtikçe derli toplu dururlar.",
        categoriesHint: "Kimlik · Akademik · Dil · Mektuplar · Mali · Diğer",
      },
    },
```

- [ ] **Step 3: Replace `en.documents` block with the final version**

```ts
    documents: {
      eyebrow: "Italy Application Documents",
      title: "Document Wallet",
      summary: { docs: "documents", types: "types" },
      actions: { scan: "Scan Document", upload: "Upload File" },
      sheet: {
        eyebrow: "Adding Document",
        title: "What type is this?",
        selectedSuffix: "selected",
        save: "Save",
        cancel: "Cancel",
      },
      categories: {
        identity: "Identity & Official",
        academic: "Academic",
        language: "Language",
        letters: "Letters",
        financial: "Financial / ISEE",
        other: "Other",
      },
      row: { view: "View", delete: "Delete", confirmYes: "Yes", confirmNo: "Cancel" },
      uploading: "Uploading…",
      errors: {
        size: "File must be under 5MB.",
        type: "Only images and PDFs are allowed.",
        generic: "Something went wrong, please try again.",
        deleteFail: "Deletion failed.",
      },
      emptyState: {
        eyebrow: "Empty Wallet",
        title: "Your document wallet is empty",
        text: "Add the documents you need for your Italy journey; pick a type and they stay neatly organized.",
        categoriesHint: "Identity · Academic · Language · Letters · Financial · Other",
      },
    },
```

- [ ] **Step 4: Run the smoke check — expect GREEN**

Run: `npm run check:documents-ui`
Expected: `check:documents-ui passed`

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors (old keys removed; nothing references them).

- [ ] **Step 6: Commit**

```bash
git add app/documents/page.tsx lib/translations.ts
git commit -m "feat(documents): rewrite wallet page in editorial style; drop legacy keys" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 10: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Lint**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 2: Editorial smoke checks**

Run: `npm run check:documents-ui && npm run check:editorial-ui`
Expected: both pass.

- [ ] **Step 3: Production build**

Run: `npm run build`
Expected: build succeeds; `/documents` compiles as a client route.

- [ ] **Step 4: Manual visual pass** (requires Task 1 SQL applied to the Supabase project + a signed-in user)

Run: `npm run dev`, open `/documents` signed in, and confirm:
  - Empty wallet → editorial empty state (no indigo circle / amber box).
  - "Belge Tara" and "Dosya Yükle" both open picker → category sheet appears → `Kaydet` disabled until a chip is chosen.
  - After save: document appears under its category; summary line shows counts.
  - "Görüntüle" opens the signed URL in a new tab.
  - Delete shows inline "Evet · Vazgeç"; "Evet" removes it.
  - Oversize / wrong-type file → inline error, no native alert.
  - Toggle TR↔EN → all labels translate, layout intact.
  - With `prefers-reduced-motion` on → sheet appears without slide animation.

- [ ] **Step 5: Final commit (if any manual tweaks were needed)**

```bash
git add -A
git commit -m "chore(documents): verification pass" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review

**Spec coverage:**
- §1 goal (editorial + categorized) → Tasks 3–9. ✓
- §2 visual language (tokens, serif, sharp, banned) → enforced by Task 2 smoke check + component code. ✓
- §3 category registry (6 keys) → Task 3. ✓
- §4 data model (category column, type, read/group, signed URLs, summary) → Tasks 1, 4, 6; header summary Task 7. ✓
- §5 upload flow (validate → sheet → save → cleanup → stage) → Task 6 (upload+cleanup+stage), Task 8 (sheet), Task 9 (validate+wire). ✓
- §6 components/IA → Tasks 6–9. ✓
- §7 states (loading/empty/uploading/error/delete-confirm/view) → Tasks 7 (empty, row confirm, view) + 9 (loading/uploading/error wiring). ✓
- §8 translations reshape + parity → Tasks 5 & 9. ✓
- §9 compatibility (hub count, proxy/robots, stage) → unchanged; `advanceStageIfBefore("documents")` kept (Task 6). ✓
- §10 non-goals → nothing in plan adds folders/custom categories/thumbnails. ✓
- §11 DB prerequisite → Task 1 + operational note. ✓
- §12 verification → Tasks 2 & 10. ✓

**Placeholder scan:** No TBD/TODO; every code step shows full file content; no "handle errors appropriately" hand-waving. ✓

**Type consistency:** `DocumentCategoryKey` / `DOCUMENT_CATEGORY_ORDER` / `resolveCategoryKey` (Task 3) used identically in hook (Task 6), sheet (Task 8), group (Task 7), page (Task 9). Hook returns `{ groups, flatDocs, loading, uploading, upload, remove, reload }` — page consumes exactly these. `upload(file, category)` / `remove(id, storagePath)` signatures match call sites. `t.documents.*` keys added in Task 5 match every component reference, and the Task 9 final blocks keep all of them. ✓
