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
