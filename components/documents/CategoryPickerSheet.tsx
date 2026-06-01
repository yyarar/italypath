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
