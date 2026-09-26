"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { useUserDocuments } from "@/lib/documents/useUserDocuments";
import { type DocumentCategoryKey } from "@/lib/documents/categories";
import { MAX_DOCUMENT_BYTES, documentExtensionFor } from "@/lib/documents/limits";
import DocumentsHeader from "@/components/documents/DocumentsHeader";
import UploadDock from "@/components/documents/UploadDock";
import CategoryPickerSheet from "@/components/documents/CategoryPickerSheet";
import CategoryGroup from "@/components/documents/CategoryGroup";
import DocumentsEmptyState from "@/components/documents/DocumentsEmptyState";

export default function DocumentsPage() {
  const { t } = useLanguage();
  const { groups, flatDocs, loading, loadError, uploading, upload, remove, reload, createViewUrl } =
    useUserDocuments();

  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingCategory, setPendingCategory] = useState<DocumentCategoryKey | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelected = (file: File) => {
    setError(null);
    if (file.size > MAX_DOCUMENT_BYTES) {
      setError(t.documents.errors.size);
      return;
    }
    if (!documentExtensionFor(file.type)) {
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

  const handleView = async (storagePath: string): Promise<string | null> => {
    setError(null);
    try {
      return await createViewUrl(storagePath);
    } catch {
      setError(t.documents.errors.viewFail);
      return null;
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
              className="mt-4 border-l-2 border-[var(--editorial-terracotta)] bg-[var(--editorial-surface)] px-3 py-2 text-[12px] text-[var(--editorial-terracotta-ink)]"
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

        {loadError && !loading && (
          <div className="mt-10 border border-[var(--editorial-border)] bg-[var(--editorial-surface)] px-6 py-8 text-center">
            <p className="text-[13px] text-[var(--editorial-ink)]">{t.documents.loadError}</p>
            <button
              type="button"
              onClick={() => void reload()}
              className="mt-4 border border-[var(--editorial-sage)] px-4 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--editorial-sage)] transition-colors hover:bg-[var(--editorial-sage)] hover:text-white"
            >
              {t.documents.retry}
            </button>
          </div>
        )}

        {!loading && !loadError && flatDocs.length === 0 && !uploading && <DocumentsEmptyState />}

        {flatDocs.length > 0 && (
          <div className="pb-4">
            {groups.map((g) => (
              <CategoryGroup
                key={g.key}
                categoryKey={g.key}
                docs={g.docs}
                onDelete={handleDelete}
                onView={handleView}
              />
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
