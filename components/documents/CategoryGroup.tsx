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
