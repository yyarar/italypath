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
