"use client";

import { useMemo, useState } from "react";

import QuestionCard from "@/components/sat/QuestionCard";
import SessionSummary from "@/components/sat/SessionSummary";
import TopicRow from "@/components/sat/TopicRow";
import { useLanguage } from "@/context/LanguageContext";
import type { SatQuestion, SatSection, SatTopic } from "@/lib/sat/types";
import { fetchSatQuestions, useSatTopics } from "@/lib/sat/useSatBank";
import { useSatAttempts } from "@/lib/sat/useSatAttempts";

type View =
  | { mode: "topics" }
  | { mode: "session"; topic: SatTopic; questions: SatQuestion[]; index: number; correctInSession: number }
  | { mode: "summary"; topic: SatTopic; total: number; correct: number };

interface TopicProgress {
  topic: SatTopic;
  solvedCount: number;
  correctCount: number;
  wrongQuestionIds: string[];
  wrongCount: number;
}

function topicKey(topic: SatTopic) {
  return `${topic.section}-${topic.skillSlug}`;
}

export default function SatBankExplorer() {
  const { t } = useLanguage();
  const { topics, loading, error } = useSatTopics();
  const { attempts, recordAttempt } = useSatAttempts();
  const [view, setView] = useState<View>({ mode: "topics" });
  const [sessionError, setSessionError] = useState<string | null>(null);

  const sections: { key: SatSection; label: string }[] = [
    { key: "math", label: t.sat.mathSection },
    { key: "reading-writing", label: t.sat.rwSection },
  ];

  const topicProgress = useMemo(() => {
    const progress = new Map<string, TopicProgress>();

    for (const topic of topics) {
      let solvedCount = 0;
      let correctCount = 0;
      const wrongQuestionIds: string[] = [];

      for (const questionId of topic.questionIds) {
        const attempt = attempts.get(questionId);
        if (!attempt) continue;

        solvedCount += 1;
        if (attempt.isCorrect) {
          correctCount += 1;
        } else {
          wrongQuestionIds.push(questionId);
        }
      }

      progress.set(topicKey(topic), {
        topic,
        solvedCount,
        correctCount,
        wrongQuestionIds,
        wrongCount: wrongQuestionIds.length,
      });
    }

    return progress;
  }, [attempts, topics]);

  const mistakeTopics = useMemo(
    () => Array.from(topicProgress.values()).filter((progress) => progress.wrongCount > 0),
    [topicProgress]
  );

  const totalWrongCount = useMemo(
    () => mistakeTopics.reduce((total, progress) => total + progress.wrongCount, 0),
    [mistakeTopics]
  );

  async function openTopic(topic: SatTopic) {
    setSessionError(null);
    try {
      const questions = await fetchSatQuestions(topic.section, topic.skillSlug);
      setView({ mode: "session", topic, questions, index: 0, correctInSession: 0 });
    } catch {
      setSessionError(t.sat.loadError);
    }
  }

  async function openMistakes(topic: SatTopic, wrongQuestionIds: string[]) {
    setSessionError(null);
    try {
      const wrongIds = new Set(wrongQuestionIds);
      const questions = (await fetchSatQuestions(topic.section, topic.skillSlug)).filter((question) =>
        wrongIds.has(question.id)
      );
      if (questions.length === 0) {
        setSessionError(t.sat.mistakesCleared);
        return;
      }
      setView({ mode: "session", topic, questions, index: 0, correctInSession: 0 });
    } catch {
      setSessionError(t.sat.loadError);
    }
  }

  if (view.mode === "session") {
    const question = view.questions[view.index];
    const isLast = view.index === view.questions.length - 1;
    return (
      <div className="min-h-screen bg-[var(--editorial-paper)] pb-24">
        <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
          <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--editorial-muted)]">
            {view.topic.skill} · {view.index + 1}/{view.questions.length}
          </p>
          <QuestionCard
            key={question.id}
            question={question}
            isLast={isLast}
            onAnswered={(selectedAnswer, isCorrect) => {
              void recordAttempt(question.id, selectedAnswer, isCorrect);
              if (isCorrect) setView({ ...view, correctInSession: view.correctInSession + 1 });
            }}
            onNext={() => {
              if (isLast) {
                setView({ mode: "summary", topic: view.topic, total: view.questions.length, correct: view.correctInSession });
              } else {
                setView({ ...view, index: view.index + 1 });
              }
            }}
          />
        </div>
      </div>
    );
  }

  if (view.mode === "summary") {
    return (
      <div className="min-h-screen bg-[var(--editorial-paper)] pb-24">
        <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
          <SessionSummary
            total={view.total}
            correct={view.correct}
            onBack={() => setView({ mode: "topics" })}
            onRetry={() => void openTopic(view.topic)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--editorial-paper)] pb-24">
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        <header className="mb-8 border-b border-[var(--editorial-border)] pb-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--editorial-terracotta)]">
            ITALYPATH
          </p>
          <h1 className="mt-3 font-serif text-3xl font-normal leading-tight text-[var(--editorial-ink)] sm:text-4xl">
            {t.sat.title}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--editorial-muted)]">{t.sat.subtitle}</p>
        </header>

        {error ? (
          <p className="mb-4 border border-[var(--editorial-border)] bg-[var(--editorial-surface)] p-4 text-sm text-[var(--editorial-muted)]">
            {t.sat.emptyBank}
          </p>
        ) : null}
        {sessionError ? (
          <p className="mb-4 border-l-2 border-[var(--editorial-terracotta)] bg-[var(--editorial-surface)] px-3 py-2 text-[12px] text-[var(--editorial-terracotta)]">
            {sessionError}
          </p>
        ) : null}
        {loading ? (
          <div className="space-y-3">
            <div className="h-16 bg-[var(--editorial-surface)] shimmer" />
            <div className="h-16 bg-[var(--editorial-surface)] shimmer" />
            <p className="text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--editorial-muted)]">
              {t.hub.loading}
            </p>
          </div>
        ) : null}

        {totalWrongCount > 0 ? (
          <section className="mb-8">
            <div className="mb-3 flex items-end justify-between gap-4">
              <h2 className="font-serif text-2xl font-normal text-[var(--editorial-ink)]">
                {t.sat.mistakesTitle}
              </h2>
              <p className="text-[12px] text-[var(--editorial-muted)]">
                {t.sat.mistakesTotalPrefix} {totalWrongCount} {t.sat.wrongLabel}
              </p>
            </div>
            <div className="border border-[var(--editorial-border)] bg-[var(--editorial-surface)]">
              {mistakeTopics.map((progress) => (
                <button
                  key={topicKey(progress.topic)}
                  type="button"
                  onClick={() => void openMistakes(progress.topic, progress.wrongQuestionIds)}
                  className="flex w-full items-center justify-between gap-4 border-b border-[var(--editorial-border)] bg-[var(--editorial-surface)] px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-[rgba(216,222,217,0.25)]"
                >
                  <div>
                    <p className="font-serif text-lg text-[var(--editorial-ink)]">{progress.topic.skill}</p>
                    <p className="mt-1 text-[12px] text-[var(--editorial-muted)]">
                      {progress.wrongCount} {t.sat.wrongLabel}
                    </p>
                  </div>
                  <span className="shrink-0 border-b border-[var(--editorial-sage)] pb-px text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--editorial-sage)]">
                    {t.sat.retryMistakes}
                  </span>
                </button>
              ))}
            </div>
          </section>
        ) : null}

        {sections.map((section) => {
          const sectionTopics = topics.filter((topic) => topic.section === section.key);
          if (sectionTopics.length === 0) return null;
          return (
            <section key={section.key} className="mb-10">
              <h2 className="mb-3 font-serif text-2xl font-normal text-[var(--editorial-ink)]">{section.label}</h2>
              <div className="border border-[var(--editorial-border)] bg-[var(--editorial-surface)]">
                {sectionTopics.map((topic) => {
                  const progress = topicProgress.get(topicKey(topic));
                  return (
                    <TopicRow
                      key={`${topic.section}-${topic.skillSlug}`}
                      topic={topic}
                      solvedCount={progress?.solvedCount ?? 0}
                      correctCount={progress?.correctCount ?? 0}
                      wrongCount={progress?.wrongCount ?? 0}
                      onSelect={() => void openTopic(topic)}
                    />
                  );
                })}
              </div>
            </section>
          );
        })}
      </main>
    </div>
  );
}
