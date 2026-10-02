"use client";

import katex from "katex";
import "katex/dist/katex.min.css";
import { useMemo } from "react";

import { splitMathText } from "@/lib/sat/mathSegments.mjs";

// prompt/choices/aciklama metinlerindeki formulleri KaTeX ile render eder.
// Veri sozlesmesi ve ayirma kurali lib/sat/mathSegments.mjs icindedir (icerik taramasi
// ayni modulu kullanir): `$...$` satir ici, `$$...$$` ayri satirda, `\$` gercek dolar.
// Metin pipeline'imizdan gelir (guvenilir kaynak); yine de metin kisimlari
// React text node olarak basilir, yalnizca KaTeX HTML'i dangerouslySetInnerHTML alir.
export default function MathText({ text, className }: { text: string; className?: string }) {
  const segments = useMemo(() => splitMathText(text), [text]);

  return (
    <span className={className}>
      {segments.map((segment, index) => {
        if (segment.kind === "text") {
          return <span key={index}>{segment.value}</span>;
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
