"use client";

import MathText from "@/components/sat/MathText";
import { splitPassageBlocks, type PassageLineKind } from "@/lib/sat/mathSegments.mjs";

// Okuma ve Yazma soru metni: paragraf paragraf, satir satir (kural lib/sat/mathSegments.mjs splitPassageBlocks;
// onizleme scripts/sat/rw/render-rw-preview.mjs ayni kurali kullanir). Paragraflar arasi bir bos satir
// (onceki whitespace-pre-line ritmi). Siir/diyalog dizesi ve not maddesi sarildiginda devam satiri iceriden
// baslar; dar ekranda sarma ile gercek satir sonu ayirt edilir. `Text 1` / `Text 2` etiketi kalin.
// Satir metni MathText ile cizilir (alti cizili/italik isaretleri).
const LINE_CLASS: Record<Exclude<PassageLineKind, "bullet">, string | undefined> = {
  plain: undefined,
  label: "font-semibold",
  verse: "pl-[1.5em] -indent-[1.5em]",
};

export default function PassageText({ text }: { text: string }) {
  return (
    <div className="space-y-8">
      {splitPassageBlocks(text).map((block, blockIndex) => (
        <div key={blockIndex}>
          {block.lines.map((line, lineIndex) =>
            line.kind === "bullet" ? (
              // Madde imi sabit genislikte; sarilan metin imin sagindan hizalanir.
              <div key={lineIndex} className="flex">
                <span className="w-[1.25em] shrink-0">•</span>
                <MathText text={line.text.slice(2)} className="min-w-0" />
              </div>
            ) : (
              <div key={lineIndex} className={LINE_CLASS[line.kind]}>
                <MathText text={line.text} />
              </div>
            )
          )}
        </div>
      ))}
    </div>
  );
}
