"use client";

import { useLanguage } from "@/context/LanguageContext";
import type { ImatChoiceKey } from "@/lib/imat/types";

interface ExamNavigatorProps {
  questionIds: readonly string[];
  answers: Readonly<Record<string, ImatChoiceKey>>;
  flags: Readonly<Record<string, boolean>>;
  currentIndex: number;
  onGoto: (index: number) => void;
}

// 60 kutucuk: cevapli / bos / isaretli / su anki. Dar ekranda satir kirar; her kutu 44 px.
export default function ExamNavigator({ questionIds, answers, flags, currentIndex, onGoto }: ExamNavigatorProps) {
  const { t } = useLanguage();

  return (
    <nav aria-label={t.imat.mock.navigatorLabel}>
      <ol className="grid grid-cols-[repeat(auto-fill,minmax(2.75rem,1fr))] gap-1.5">
        {questionIds.map((questionId, index) => {
          const answered = Object.hasOwn(answers, questionId);
          const flagged = flags[questionId] === true;
          const current = index === currentIndex;
          const stateLabel = [answered ? t.imat.mock.answeredState : t.imat.mock.blank, flagged ? t.imat.mock.flaggedState : null]
            .filter(Boolean)
            .join(", ");
          return (
            <li key={questionId}>
              <button
                type="button"
                onClick={() => onGoto(index)}
                aria-current={current ? "step" : undefined}
                aria-label={`${index + 1}, ${stateLabel}`}
                className={`relative flex h-11 w-full items-center justify-center rounded-lg border text-[13px] font-semibold tabular-nums outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--editorial-sage)] focus-visible:ring-offset-2 ${
                  answered
                    ? "border-[var(--editorial-sage)] bg-[var(--editorial-sage)] text-white"
                    : "border-[var(--editorial-border)] bg-[rgba(255,254,250,0.88)] text-[var(--editorial-ink)] hover:border-[rgba(31,79,70,0.38)]"
                } ${current ? "ring-2 ring-[var(--editorial-ink)] ring-offset-2 ring-offset-[var(--editorial-paper)]" : ""}`}
              >
                {index + 1}
                {flagged ? (
                  <span
                    aria-hidden="true"
                    className="absolute right-1 top-1 h-2 w-2 rounded-full bg-[var(--editorial-terracotta)] ring-2 ring-white"
                  />
                ) : null}
              </button>
            </li>
          );
        })}
      </ol>
      <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-[11px] font-semibold text-[var(--editorial-muted)]">
        <li className="flex items-center gap-1.5">
          <span aria-hidden="true" className="h-3 w-3 rounded-[4px] bg-[var(--editorial-sage)]" />
          {t.imat.mock.answeredState}
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden="true" className="h-3 w-3 rounded-[4px] border border-[var(--editorial-border)] bg-white" />
          {t.imat.mock.blank}
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden="true" className="h-2 w-2 rounded-full bg-[var(--editorial-terracotta)]" />
          {t.imat.mock.flaggedState}
        </li>
      </ul>
    </nav>
  );
}
