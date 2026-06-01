# Belge Cüzdanı Redesign — Editorial Categorized Document Wallet

**Date:** 2026-06-01
**Scope:** Rebuild the `/documents` page (Belge Cüzdanı) from scratch into an editorial, category-organized document wallet that matches the rest of the app's visual system. Adds one nullable `category` column to `user_documents`. No new env vars, no new dependencies, no new Supabase tables.
**Status:** Brainstorm approved (visual companion) · ready for implementation plan.

---

## 1. Goal & motivation

`/documents` is the **last** screen still using the old generic style: `bg-[#f8fafc]`, indigo gradient tiles (`linear-gradient(135deg, #4f46e5…)`), `rounded-3xl` cards, `shadow-xl shadow-indigo-600/20`, blurred blobs, `font-black uppercase tracking-tighter`, and an amber "Lightbulb" hint box. Every other surface (home, hub, mentor, communities, scholarships, cities, universities) has migrated to the editorial paper/sage/terracotta system. The wallet looks AI-generated next to them.

It is also functionally "dumb": every upload is an untyped file in a single flat list. The hub already shows an 8-item "core kit" checklist, but that mapping is decorative (sequential ticks, not real document types).

**Two decisions locked during brainstorming (with the product owner, who is the Italy-process domain expert):**

1. **No fixed "required documents" list.** Required documents differ per department/program across 64 universities and 240 programs. We do not have — and will not maintain — a per-program requirements dataset. Claiming "X/8 required" would be false. (Direction B from brainstorming was explicitly rejected for this reason.)
2. **Model = categorized wallet.** On upload the user assigns the document a **type/category** from a fixed set; documents are grouped by category. This fits every department because categories are generic document *types* (reused across all applications), not department-specific requirements. The wallet organizes; it does not prescribe.

The redesign delivers: the editorial visual language + category-grouped organization + a calm upload→categorize flow, while preserving 100% of the existing functional contract (Supabase Storage upload, signed-URL viewing, delete, camera scan, stage auto-advance, cleanup-on-failure).

---

## 2. Visual language anchors

Uses ONLY the editorial token system already in `app/globals.css`. No new tokens, no new fonts.

| Token | Use |
|---|---|
| `--editorial-paper` (#f8f7f1) | Page background |
| `--editorial-surface` (#fffefa) | Type chips, category picker sheet |
| `--editorial-ink` (#15201c) | Headlines, filenames, primary text |
| `--editorial-muted` (#59645f) | Summary line, dates, captions |
| `--editorial-sage` (#1f4f46) | Primary "Belge Tara" action, "Görüntüle" links, selected category chip |
| `--editorial-terracotta` (#b75b38) | Eyebrow, category group micro-labels |
| `--editorial-border` (#d8ded9) | All borders, row dividers, type chips |
| `--editorial-band` (#f5f1e8) | Optional tinted surface (e.g. empty-state panel) |

**Typography:**
- Headline (`Belge Cüzdanı`): Tailwind `font-serif` (system Georgia/Times — same as hub/mentor), large, `tracking-[-0.01em]`, tight leading.
- Body, filenames, dates: `font-sans` (system, layout default).
- Eyebrow + category micro-labels: 10–11px, `tracking-[0.18em]`–`[0.22em]`, uppercase, weight 700. Eyebrow = terracotta; category labels = terracotta; status/meta micro-labels = sage or muted.

**Surfaces & motion:**
- Sharp borders only. No `rounded-3xl`/`rounded-2xl` oversized radii (the picker sheet may use a modest top radius). Elevation via 1px hairline borders, not shadows.
- Hairline (`border-b border-[--editorial-border]`) dividers between document rows.
- Motion: subtle Framer Motion (sheet slide-in, row enter/exit) consistent with the app; all continuous/entrance motion guarded by `useReducedMotion` / `prefers-reduced-motion`.

**Banned (carried over from the editorial-ui banned list):**
- Indigo / purple / blue gradients, `linear-gradient(135deg, #4f46e5…)`, `--gradient-hero`.
- `bg-[#f8fafc]`, `shadow-xl shadow-indigo-600/20`, blurred blobs (`blur-xl`), `rounded-3xl`.
- `font-black uppercase tracking-tighter`, amber hint boxes (`bg-amber-50`).
- Native `alert()` / `confirm()` for errors and delete — replaced by editorial inline messaging + a custom in-row confirm.

---

## 3. Category registry

Fixed set of **6 categories**, stored as stable keys; labels come from translations (TR/EN) so i18n keeps working.

| Order | Key | TR label | EN label |
|---|---|---|---|
| 1 | `identity` | Kimlik & Resmî | Identity & Official |
| 2 | `academic` | Akademik | Academic |
| 3 | `language` | Dil | Language |
| 4 | `letters` | Mektuplar | Letters |
| 5 | `financial` | Mali / ISEE | Financial / ISEE |
| 6 | `other` | Diğer | Other |

- The DB stores the **key** (e.g. `"academic"`), never the localized label.
- Any `NULL` / unknown key (e.g. legacy rows created before this change) resolves to `other` for display.
- Single source of truth: `lib/documents/categories.ts` (`DocumentCategoryKey` type, `DOCUMENT_CATEGORY_ORDER`, `resolveCategoryKey()`). Custom user-defined categories are **out of scope for v1** (see §10).

---

## 4. Data model & data flow

**DB change (prerequisite — see §11):**
```sql
alter table public.user_documents add column if not exists category text;
```
Nullable, no default, no RLS change (column-level addition; existing select/insert/delete-own-row policies are unaffected).

**Type change (`types/index.ts`):**
- `UserDocument` gains `category?: string | null`.

**Read path (unchanged shape + category):**
1. `select('*')` from `user_documents` where `user_id = user.id`, ordered `created_at desc`.
2. `createSignedUrls(storagePaths, 600s)` for viewing (10-min expiry, as today).
3. Attach `signed_url`; resolve `category` via `resolveCategoryKey(row.category)`.
4. Group rows by category in `DOCUMENT_CATEGORY_ORDER`; only non-empty groups render.

**Summary line** (header): `{count} belge · {distinctTypeCount} türde · son ekleme {relativeDate}`. Derived client-side from the fetched rows; hidden when empty.

---

## 5. Upload flow (upload → categorize)

Two entry actions in the UploadDock:
- **Belge Tara** — camera. `<input type="file" accept="image/*" capture="environment">` (filled sage button).
- **Dosya Yükle** — picker. `<input type="file" accept="image/*,application/pdf">` (dashed outline button).

Flow:
1. User taps an action → native file/camera picker.
2. On file selected, validate **before** anything else (kept from current page): size ≤ 5 MB; type `image/*` or `application/pdf`. On failure → **inline editorial error** (no `alert()`), file discarded.
3. Valid file is held in component state → **CategoryPickerSheet** slides up: eyebrow "Belge Ekleniyor", serif "Bu belge hangi tür?", subtitle "{fileName} seçildi", the 6 category chips, `Kaydet` + `Vazgeç`.
4. `Kaydet` is enabled only after a category is chosen (explicit categorization is the point of the model).
5. On `Kaydet`:
   - Upload to Storage `documents` bucket at `${user.id}/${Date.now()}.${ext}` (unchanged).
   - Insert `user_documents` row `{ user_id, file_name, file_url, storage_path, category }`.
   - **Cleanup contract preserved:** if storage succeeds but DB insert fails, remove the uploaded object.
   - `advanceStageIfBefore("documents")` (unchanged).
   - Refetch; sheet closes; new row appears in its category group.
6. `Vazgeç` / dismiss → discard held file, no upload.

Uploading indicator: editorial inline "Yükleniyor…" (sage), replaces the current indigo spinner row.

---

## 6. Information architecture & components

`/documents` stays a `"use client"` orchestrator (needs Clerk + Supabase hooks). Logic and view are decomposed to focused units (mirrors the `components/hub/*` + `lib/hub/*` convention).

```
app/documents/page.tsx          # orchestrator: auth/user gate, hook wiring, compose
lib/documents/
  categories.ts                 # DocumentCategoryKey, DOCUMENT_CATEGORY_ORDER, resolveCategoryKey()
  useUserDocuments.ts           # { groups, flatDocs, loading, error, uploading, upload(file,category), remove(id,path), reload }
components/documents/
  DocumentsHeader.tsx           # back link · terracotta eyebrow · serif h1 · summary line
  UploadDock.tsx                # Belge Tara + Dosya Yükle buttons + hidden inputs → onFileSelected(file)
  CategoryPickerSheet.tsx       # bottom sheet: chips + Kaydet/Vazgeç (AnimatePresence, reduced-motion guard)
  CategoryGroup.tsx             # terracotta micro-label + count + hairline DocumentRow list
  DocumentRow.tsx               # type chip (PDF/IMG) · filename · date · Görüntüle ↗ · delete(inline confirm)
  DocumentsEmptyState.tsx       # editorial empty: eyebrow · serif headline · gentle line · category preview
```

**Page skeleton (top→bottom):** Header → UploadDock → (inline error / uploading) → CategoryGroup × N **or** DocumentsEmptyState. CategoryPickerSheet is an overlay.

`useUserDocuments` encapsulates the `createClerkSupabaseClient(getToken 'supabase')` client (same pattern as `useDocumentsCount` and the current page), so the orchestrator holds no Supabase calls directly.

---

## 7. States

- **Loading:** minimal muted placeholder (optional `shimmer` token rows); no layout jump.
- **Empty (no docs):** DocumentsEmptyState — terracotta eyebrow, serif headline ("Belge cüzdanın henüz boş"), one calm line, the two upload actions remain visible above, and a muted one-line preview of the 6 category names. No indigo circle, no amber box.
- **Uploading:** inline sage "Yükleniyor…" indicator.
- **Error (validation / upload / delete):** inline editorial message in ink/terracotta near the action; auto-dismiss or dismissible. No native dialogs.
- **Delete confirm:** in-row editorial confirm ("Sil? Evet · Vazgeç") replacing native `confirm()`. Delete checks both storage and DB responses (no silent failure — preserved).
- **View:** `Görüntüle ↗` opens `signed_url` in a new tab; rendered disabled/muted if a signed URL is unavailable (preserved).

---

## 8. Translations (`t.documents`, TR + EN)

`t.documents` is used **only** by `app/documents/page.tsx`, so the block is reshaped freely. New shape:

- `eyebrow` ("İtalya Başvuru Evrakları"), `title` ("Belge Cüzdanı")
- `summary`: `{ docs: "belge", types: "türde", lastAdded: "son ekleme" }`
- `actions`: `{ scan: "Belge Tara", upload: "Dosya Yükle" }`
- `sheet`: `{ eyebrow: "Belge Ekleniyor", title: "Bu belge hangi tür?", selectedSuffix: "seçildi", save: "Kaydet", cancel: "Vazgeç" }`
- `categories`: `{ identity, academic, language, letters, financial, other }` (labels per §3)
- `row`: `{ view: "Görüntüle", delete: "Sil", confirmYes: "Evet", confirmNo: "Vazgeç" }`
- `uploading: "Yükleniyor…"`
- `errors`: `{ size: "Dosya 5MB'tan büyük olamaz.", type: "Sadece resim ve PDF yüklenebilir.", generic: "Bir şeyler ters gitti, tekrar dene.", deleteFail: "Silme başarısız oldu." }`
- `empty`: `{ eyebrow, title: "Belge cüzdanın henüz boş", text, categoriesHint }`

**Removed (only the documents page referenced them):** `subtitle`, `scan`, `upload` (flat), `uploading` (reshaped), `savedDocs`, `view` (flat), `empty`, `deleteConfirm`, `emptyTitle`, `emptySubtitle`, `emptyStep1..4`, `emptyHint`, `fileSizeError`, `fileTypeError`. Both TR and EN blocks updated in lockstep (the file keeps strict TR/EN parity).

---

## 9. Compatibility (unchanged surfaces)

- **`lib/hub/useDocumentsCount.ts`** — counts rows only; unaffected by the new column.
- **Hub `BelgeCell` + home StudyDossier** — count-based decorative "core kit" checklist; still works. Reflecting real categories there is a future enhancement, **out of scope**.
- **proxy.ts / robots** — `/documents` stays protected + disallowed; no routing/SEO change.
- **Stage tracker** — `advanceStageIfBefore("documents")` preserved.

---

## 10. Non-goals (explicitly out of scope)

- Per-department / per-program **required-document lists** (rejected — data doesn't exist, varies by program).
- **Per-target-school folders** (brainstorm Option 3) — deferred as a possible future layer.
- **Custom user-defined categories** — v1 ships the fixed 6; custom is a future follow-up.
- Inline image **thumbnails** / in-app preview — viewing stays via signed-URL new tab.
- File **rename**, multi-file batch upload, drag-reorder.
- Any change to hub/home document widgets.
- New dependencies, new env vars, new tables, `tailwind.config.*`, or `middleware.ts` (per AGENT_CONTEXT strict guidelines).

---

## 11. Prerequisite: DB column

Before upload can persist a category, add the column (Supabase SQL editor, or appended to `supabase/` scripts):

```sql
alter table public.user_documents add column if not exists category text;
```

- Idempotent; safe to run once. Existing rows → `NULL` → render under "Diğer".
- No RLS/policy change required.
- The code will insert `category`; if the column is missing the insert fails — so this MUST be applied before shipping. Until applied, the wallet still **reads/lists/deletes** correctly.

---

## 12. Verification

Project convention is node smoke-checks + lint + build (no unit-test framework). Plan will:

1. **TDD-style smoke check first:** add `scripts/check-documents-ui.mjs` + `check:documents-ui` npm script (mirrors `check-editorial-ui.mjs`): forbid old generic tokens in `app/documents/page.tsx` and `components/documents/*` (`#4f46e5`, `linear-gradient(135deg`, `shadow-indigo`, `rounded-3xl`, `bg-[#f8fafc]`, `font-black`, `bg-amber-50`, `blur-xl`); assert presence of editorial tokens (`var(--editorial-`) + the 6 category keys in `lib/documents/categories.ts`. Author it red, then build to green.
2. `npm run lint`
3. `npm run build`
4. **Manual visual pass** (`npm run dev`): upload via both actions → category sheet → grouped appearance; Görüntüle opens; inline delete confirm; empty state; TR↔EN toggle parity; `prefers-reduced-motion`.
5. Apply §11 DB column in the test Supabase project before exercising upload.

---

## 13. Open follow-ups (post-v1)

- Custom categories (user-defined types).
- Inline thumbnails / in-app document preview.
- Per-application folders (Option 3) as an organizing layer on top of categories.
- Hub `BelgeCell` reflecting real category coverage instead of decorative sequential ticks.
