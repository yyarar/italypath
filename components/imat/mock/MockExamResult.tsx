"use client";

import { m, useReducedMotion } from "framer-motion";
import { AlarmClock } from "lucide-react";

import { fillTemplate, formatScore } from "@/components/imat/mock/format";
import { useLanguage } from "@/context/LanguageContext";
import { MAX_SCORE, isLate } from "@/lib/imat/scoring.mjs";
import { SECTIONS } from "@/lib/imat/taxonomy.mjs";
import type { ImatExamSession } from "@/lib/imat/types";

const AUTO_SUBMIT_GRACE_MS = 60 * 1000;

interface MockExamResultProps {
  // Teslim edilmis oturumun ozeti (submittedAt ve sayimlar dolu).
  session: ImatExamSession;
  autoSubmitted?: boolean;
  onReview: () => void;
  onRetake: () => void;
  onBack: () => void;
}

export default function MockExamResult({ session, autoSubmitted = false, onReview, onRetake, onBack }: MockExamResultProps) {
  const { t, language } = useLanguage();
  const reduceMotion = useReducedMotion();
  // Sayac sifirda otomatik teslim eder; sunucu teslim saatini son tarihten milisaniyeler sonra yazar.
  // Bu yuzden otomatik teslim yalniz 60 sn'den fazla gecikmisse (ornegin saatler sonra acilan oturum)
  // "gec" sayilir; elle teslim her gecikmede.
  const late =
    session.submittedAt !== null &&
    isLate(session.submittedAt, session.deadlineAt) &&
    (!autoSubmitted || Date.parse(session.submittedAt) - Date.parse(session.deadlineAt) > AUTO_SUBMIT_GRACE_MS);
  const scoreText = fillTemplate(t.imat.mock.scoreOf, {
    score: formatScore(session.score ?? 0, language),
    max: MAX_SCORE,
  });
  const counts = [
    { key: "correct", label: t.imat.mock.correct, value: session.correctCount ?? 0, tone: "text-[var(--editorial-sage)]" },
    { key: "wrong", label: t.imat.mock.wrong, value: session.wrongCount ?? 0, tone: "text-[var(--editorial-terracotta-ink)]" },
    { key: "blank", label: t.imat.mock.blank, value: session.blankCount ?? 0, tone: "text-[var(--editorial-muted)]" },
  ];

  return (
    <m.section
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduceMotion ? { duration: 0 } : { duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-[1.4rem] border border-[rgba(31,79,70,0.16)] bg-[rgba(255,254,250,0.88)] p-5 shadow-[0_18px_50px_rgba(21,32,28,0.06)] backdrop-blur-xl sm:p-8"
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--editorial-muted)]">
        {t.imat.tabMock} · {session.year}
      </p>
      <h2 className="mt-2 font-serif text-3xl font-normal tracking-[-0.03em] text-[var(--editorial-ink)] sm:text-4xl">
        {t.imat.mock.resultTitle}
      </h2>
      <p className="mt-4 font-serif text-[clamp(2.4rem,9vw,3.5rem)] font-normal leading-none tracking-[-0.04em] text-[var(--editorial-sage)] tabular-nums">
        {scoreText}
      </p>

      {autoSubmitted || late ? (
        <div className="mt-5 space-y-1.5 border-l-2 border-[var(--editorial-terracotta)] bg-[var(--editorial-surface)] px-3 py-2 text-[13px] leading-6 text-[var(--editorial-terracotta-ink)]">
          {autoSubmitted ? (
            <p className="flex items-start gap-2">
              <AlarmClock className="mt-1 h-4 w-4 shrink-0" strokeWidth={1.9} aria-hidden="true" />
              {t.imat.mock.autoSubmitted}
            </p>
          ) : null}
          {late ? <p>{t.imat.mock.late}</p> : null}
        </div>
      ) : null}

      <dl className="mt-6 grid grid-cols-3 gap-2.5">
        {counts.map((item) => (
          <div key={item.key} className="rounded-xl border border-[var(--editorial-border)] bg-[var(--editorial-paper)] px-3 py-3 text-center">
            <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--editorial-muted)]">{item.label}</dt>
            <dd className={`mt-1 font-serif text-2xl tabular-nums ${item.tone}`}>{item.value}</dd>
          </div>
        ))}
      </dl>

      {session.sectionBreakdown ? (
        <div className="mt-7 overflow-x-auto">
          <table className="w-full min-w-[18rem] border-collapse text-left text-[13px]">
            <caption className="mb-3 text-left font-serif text-xl font-normal tracking-[-0.02em] text-[var(--editorial-ink)]">
              {t.imat.mock.sectionTable}
            </caption>
            <thead>
              <tr className="border-b border-[var(--editorial-border)] text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--editorial-muted)]">
                <td className="py-2 pr-2" />
                <th scope="col" className="px-1.5 py-2 text-right font-semibold">{t.imat.mock.correct}</th>
                <th scope="col" className="px-1.5 py-2 text-right font-semibold">{t.imat.mock.wrong}</th>
                <th scope="col" className="py-2 pl-1.5 text-right font-semibold">{t.imat.mock.blank}</th>
              </tr>
            </thead>
            <tbody>
              {SECTIONS.map((section) => {
                const row = session.sectionBreakdown?.[section] ?? { correct: 0, wrong: 0, blank: 0 };
                return (
                  <tr key={section} className="border-b border-[var(--editorial-border)] last:border-b-0">
                    <th scope="row" className="py-2.5 pr-2 font-semibold text-[var(--editorial-ink)]">
                      {t.imat.sections[section]}
                    </th>
                    <td className="px-1.5 py-2.5 text-right tabular-nums text-[var(--editorial-sage)]">{row.correct}</td>
                    <td className="px-1.5 py-2.5 text-right tabular-nums text-[var(--editorial-terracotta-ink)]">{row.wrong}</td>
                    <td className="py-2.5 pl-1.5 text-right tabular-nums text-[var(--editorial-muted)]">{row.blank}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      <div className="mt-8 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap">
        <m.button
          type="button"
          onClick={onReview}
          whileTap={reduceMotion ? undefined : { scale: 0.97 }}
          className="min-h-11 rounded-xl bg-[var(--editorial-sage)] px-5 py-2.5 text-xs font-bold text-white shadow-[0_7px_18px_rgba(31,79,70,0.14)] outline-none transition-colors hover:bg-[#173d36] focus-visible:ring-2 focus-visible:ring-[var(--editorial-sage)] focus-visible:ring-offset-2"
        >
          {t.imat.mock.review}
        </m.button>
        <m.button
          type="button"
          onClick={onRetake}
          whileTap={reduceMotion ? undefined : { scale: 0.97 }}
          className="min-h-11 rounded-xl border border-[var(--editorial-border)] px-5 py-2.5 text-xs font-bold text-[var(--editorial-sage)] outline-none transition-colors hover:bg-[rgba(216,222,217,0.25)] focus-visible:ring-2 focus-visible:ring-[var(--editorial-sage)]"
        >
          {t.imat.mock.retake}
        </m.button>
        <m.button
          type="button"
          onClick={onBack}
          whileTap={reduceMotion ? undefined : { scale: 0.97 }}
          className="min-h-11 rounded-xl px-5 py-2.5 text-xs font-bold text-[var(--editorial-muted)] outline-none transition-colors hover:bg-white/70 hover:text-[var(--editorial-sage)] focus-visible:ring-2 focus-visible:ring-[var(--editorial-sage)]"
        >
          {t.imat.mock.backToList}
        </m.button>
      </div>
    </m.section>
  );
}
