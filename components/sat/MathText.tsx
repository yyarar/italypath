"use client";

import katex from "katex";
import "katex/dist/katex.min.css";
import { useMemo, type ReactNode } from "react";

import { splitRichText } from "@/lib/sat/mathSegments.mjs";

// prompt/choices/aciklama metinlerindeki formulleri KaTeX ile render eder.
// Veri sozlesmesi ve ayirma kurali lib/sat/mathSegments.mjs icindedir (icerik taramasi
// ayni modulu kullanir): `$...$` satir ici, `$$...$$` ayri satirda, `\$` gercek dolar;
// Okuma ve Yazma metninde `<u>...</u>` alti cizili, `<i>...</i>` italik (plan 2026-10-03).
// Metin pipeline'imizdan gelir (guvenilir kaynak); yine de metin kisimlari
// React text node olarak basilir (isaretler <u>/<em> dugumu), yalnizca KaTeX HTML'i dangerouslySetInnerHTML alir.
// Isaretsiz metinde cikti onceki splitMathText cizimiyle ayni DOM'dur.
export default function MathText({ text, className }: { text: string; className?: string }) {
  const segments = useMemo(() => splitRichText(text), [text]);

  return (
    <span className={className}>
      {segments.map((segment, index) => {
        if (segment.kind === "text") {
          let content: ReactNode = segment.value;
          if (segment.italic) content = <em>{content}</em>;
          if (segment.underline) content = <u className="underline decoration-1 underline-offset-4">{content}</u>;
          return <span key={index}>{content}</span>;
        }
        const display = segment.kind === "display";
        let html: string;
        try {
          html = katex.renderToString(segment.value, { throwOnError: true, displayMode: display });
        } catch {
          return <span key={index}>{segment.value}</span>;
        }
        // Ayri satirdaki uzun formul dar ekranda sayfayi tasirmasin; kendi icinde kayar.
        return (
          <span
            key={index}
            className={display ? "block overflow-x-auto" : undefined}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      })}
    </span>
  );
}
