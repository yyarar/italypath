"use client";

import katex from "katex";
import "katex/dist/katex.min.css";
import { useMemo } from "react";

// prompt/choices metinlerindeki $...$ bolumlerini KaTeX ile render eder.
// Veri sozlesmesi: para tutarlari `\$` ile kacislidir (or. \$2.00); kacisli
// dolar metin olarak basilir, ciplak $ ciftleri matematik sinirlayicidir.
// Metin pipeline'imizdan gelir (guvenilir kaynak); yine de metin kisimlari
// React text node olarak basilir, yalnizca KaTeX HTML'i dangerouslySetInnerHTML alir.
const ESCAPED_DOLLAR = "\u0000";

export default function MathText({ text, className }: { text: string; className?: string }) {
  const segments = useMemo(
    () => text.replaceAll("\\$", ESCAPED_DOLLAR).split(/(\$[^$]+\$)/g),
    [text]
  );

  return (
    <span className={className}>
      {segments.map((segment, index) => {
        if (segment.startsWith("$") && segment.endsWith("$") && segment.length > 2) {
          const tex = segment.slice(1, -1).replaceAll(ESCAPED_DOLLAR, "\\$");
          let html: string;
          try {
            html = katex.renderToString(tex, { throwOnError: true });
          } catch {
            return <span key={index}>{tex}</span>;
          }
          return <span key={index} dangerouslySetInnerHTML={{ __html: html }} />;
        }
        return <span key={index}>{segment.replaceAll(ESCAPED_DOLLAR, "$")}</span>;
      })}
    </span>
  );
}
