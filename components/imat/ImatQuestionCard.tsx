"use client";

import { m, useReducedMotion } from "framer-motion";
import { Check, X } from "lucide-react";

import MathText from "@/components/sat/MathText";
import { useLanguage } from "@/context/LanguageContext";
import { CHOICE_KEYS } from "@/lib/imat/scoring.mjs";
import { splitTableBlocks, splitTableRow } from "@/lib/imat/tableBlocks.mjs";
import type { ImatChoiceKey, ImatQuestion } from "@/lib/imat/types";

interface ImatQuestionCardProps {
  question: ImatQuestion;
  // exam: secim yalniz vurgulanir, dogru/yanlis gosterilmez (deneme yaniti cevap anahtari tasimaz).
  // practice + revealed: dogru sik yesil, yanlis secim kirmizi (SAT QuestionCard gorunumu).
  mode: "practice" | "exam";
  selected: ImatChoiceKey | null;
  revealed: boolean;
  onSelect: (letter: ImatChoiceKey) => void;
}

const CELL_BORDER = "border-[var(--editorial-border)]";
// Genis ekranda yalniz baslikli tablo sik satirlarinin sutunlariyla hizalanir: sol = sik dugmesi cercevesi (1px) + px-4
// (16px) + harf rozeti (28px) + gap-3 (12px) = 57px, sag = px-4 + cerceve = 17px; sutunlar iki tarafta da esit (table-fixed).
const HEADER_ONLY_INSET = "sm:ml-[57px] sm:mr-[17px] sm:w-auto";

// Soru metnindeki tablo: ilk satir baslik (<th>), her hucre MathText. Genis tablo sayfayi degil kendi kutusunu kaydirir.
// headerOnly: metnin son satiri olan tek satirlik baslik; govde satirlari asagidaki siklardir.
function PromptTable({ rows, headerOnly = false }: { rows: string[][]; headerOnly?: boolean }) {
  const [head = [], ...body] = rows;
  return (
    <div
      className={`w-fit max-w-full overflow-x-auto rounded-xl border bg-[var(--editorial-surface)] ${headerOnly ? HEADER_ONLY_INSET : ""} ${CELL_BORDER}`}
    >
      <table className={`border-collapse text-sm leading-6 sm:text-[15px] sm:leading-7 ${headerOnly ? "sm:w-full sm:table-fixed" : ""}`}>
        <thead className="bg-[var(--editorial-band)]">
          <tr>
            {head.map((cell, index) => (
              <th
                key={index}
                scope="col"
                className={`border-l px-2.5 py-1.5 text-left align-bottom font-semibold first:border-l-0 sm:px-3 sm:py-2 ${headerOnly ? "" : "border-b"} ${CELL_BORDER}`}
              >
                <MathText text={cell} />
              </th>
            ))}
          </tr>
        </thead>
        {body.length > 0 ? (
          <tbody>
            {body.map((row, rowIndex) => (
              <tr key={rowIndex} className={`border-t first:border-t-0 even:bg-[rgba(245,241,232,0.5)] ${CELL_BORDER}`}>
                {row.map((cell, index) => (
                  <td key={index} className={`border-l px-2.5 py-1.5 align-top first:border-l-0 sm:px-3 sm:py-2 ${CELL_BORDER}`}>
                    <MathText text={cell} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        ) : null}
      </table>
    </div>
  );
}

// Tablonun tek satiri olan sik (baslik soru metninin sonunda): hucreli tek satir; genis ekranda esit sutunlar
// (siklar alt alta hizali), telefonda sutunlar icerige gore (kelime ortadan bolunmesin).
// Buton icinde <table> gecerli HTML olmadigi icin tablo gorunumu CSS display: table ile span'lerden kurulur.
function ChoiceRow({ cells }: { cells: string[] }) {
  return (
    <span className="min-w-0 flex-1">
      <span className={`table w-full rounded-lg border sm:table-fixed ${CELL_BORDER}`}>
        <span className="table-row">
          {cells.map((cell, index) => (
            <span key={index} className={`table-cell break-words border-l px-2 py-0.5 align-top first:border-l-0 sm:px-3 ${CELL_BORDER}`}>
              <MathText text={cell} />
            </span>
          ))}
        </span>
      </span>
    </span>
  );
}

// Deneme ve konu pratiginin ortak soru karti: bes sik (A-E), gorsel soru metninin altinda.
export default function ImatQuestionCard({
  question,
  mode,
  selected,
  revealed,
  onSelect,
}: ImatQuestionCardProps) {
  const { t } = useLanguage();
  const reduceMotion = useReducedMotion();
  const showKey = mode === "practice" && revealed;
  const topicLabel =
    mode === "practice"
      ? (t.imat.topics as Record<string, string>)[question.topicSlug] ?? question.topic
      : null;

  return (
    <article className="overflow-hidden rounded-[1.4rem] border border-[rgba(31,79,70,0.16)] bg-[rgba(255,254,250,0.88)] p-5 shadow-[0_18px_50px_rgba(21,32,28,0.06)] backdrop-blur-xl sm:p-7">
      <header className="mb-6 flex flex-wrap gap-2 text-[11px] font-semibold text-[var(--editorial-muted)]">
        <span className="rounded-lg bg-[var(--editorial-band)] px-2.5 py-1.5">{t.imat.sections[question.section]}</span>
        {topicLabel ? (
          <span className="rounded-lg bg-[var(--editorial-sage-soft)] px-2.5 py-1.5 text-[var(--editorial-sage)]">{topicLabel}</span>
        ) : null}
      </header>

      {/* Tum bolumlerde ayni cizim: soru metni splitTableBlocks ile metin ve tablo bloklarina ayrilir. Metin blogu MathText:
          `\n` duz satir sonu, `\n\n` paragraf boslugu (whitespace-pre-line), asili girinti yok. IMAT metninde `\n` siir
          dizesi degil olagan satir sonudur (pasaj, kaynak satiri, soru cumlesi, madde); SAT Okuma-Yazma'nin satir satir dize
          kurali burada kullanilmaz. Ust uste ` | ` hucreli satirlar gercek tablo, metnin son satiri olan tek ` | ` satiri yalniz
          baslikli tablo cizilir (metin sozlesmesi degismez).
          <i>/<u> isaretlerini MathText cizer. */}
      <div className="mb-7 space-y-6 text-base leading-8 text-[var(--editorial-ink)]">
        {splitTableBlocks(question.prompt).map((block, index) =>
          block.kind === "table" ? (
            <PromptTable key={index} rows={block.rows} headerOnly={block.headerOnly === true} />
          ) : (
            <div key={index} className="whitespace-pre-line break-words">
              <MathText text={block.value} />
            </div>
          ),
        )}
      </div>

      {question.figureUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={question.figureUrl}
          alt={t.imat.figureAlt}
          className="mb-7 max-w-full rounded-xl border border-[var(--editorial-border)] bg-white"
          loading="lazy"
        />
      ) : null}

      <div className="grid gap-2.5">
        {CHOICE_KEYS.map((key) => {
          const isSelected = selected === key;
          const isCorrectChoice = showKey && question.correctAnswer === key;
          const isWrongSelection = showKey && isSelected && !isCorrectChoice;
          let tone = "border-[var(--editorial-border)] bg-[rgba(255,254,250,0.82)] hover:border-[rgba(31,79,70,0.38)] hover:bg-white";
          if (isCorrectChoice) {
            tone = "border-[var(--editorial-sage)] bg-[var(--editorial-sage-soft)] shadow-[0_4px_14px_rgba(31,79,70,0.08)]";
          } else if (isWrongSelection) {
            tone = "border-[var(--editorial-terracotta)] bg-[rgba(191,95,74,0.08)]";
          } else if (isSelected && !showKey) {
            tone = "border-[var(--editorial-sage)] bg-[var(--editorial-sage-soft)] shadow-[0_4px_14px_rgba(31,79,70,0.08)]";
          }
          const badgeTone =
            isSelected && !showKey
              ? "border-[var(--editorial-sage)] bg-[var(--editorial-sage)] text-white"
              : "border-[var(--editorial-border)] text-[var(--editorial-sage)]";
          const choiceText = question.choices[key] ?? "";
          const choiceCells = splitTableRow(choiceText);

          return (
            <m.button
              key={key}
              type="button"
              disabled={showKey}
              aria-pressed={showKey ? undefined : isSelected}
              onClick={() => onSelect(key)}
              whileTap={showKey || reduceMotion ? undefined : { scale: 0.985 }}
              transition={reduceMotion ? { duration: 0 } : { type: "spring", bounce: 0, duration: 0.28 }}
              className={`flex min-h-14 items-start gap-3 rounded-xl border px-4 py-3.5 text-left text-[14px] leading-6 text-[var(--editorial-ink)] outline-none transition-colors disabled:cursor-default focus-visible:ring-2 focus-visible:ring-[var(--editorial-sage)] focus-visible:ring-offset-2 ${tone}`}
            >
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border font-semibold ${badgeTone}`}>
                {key}
              </span>
              {choiceCells ? (
                <ChoiceRow cells={choiceCells} />
              ) : (
                <MathText text={choiceText} className="min-w-0 flex-1 break-words" />
              )}
              {isCorrectChoice ? (
                <Check className="mt-0.5 h-5 w-5 shrink-0 text-[var(--editorial-sage)]" strokeWidth={2.4} aria-hidden="true" />
              ) : null}
              {isWrongSelection ? (
                <X className="mt-0.5 h-5 w-5 shrink-0 text-[var(--editorial-terracotta-ink)]" strokeWidth={2.4} aria-hidden="true" />
              ) : null}
            </m.button>
          );
        })}
      </div>
    </article>
  );
}
