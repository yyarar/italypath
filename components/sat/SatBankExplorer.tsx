"use client";

import { useEffect, useMemo, useState } from "react";

import BadgesView from "@/components/sat/BadgesView";
import LevelUpCelebration from "@/components/sat/LevelUpCelebration";
import QuestionCard from "@/components/sat/QuestionCard";
import SatDashboardHeader, { type SatFocusRecommendation } from "@/components/sat/SatDashboardHeader";
import SatDomainGroup from "@/components/sat/SatDomainGroup";
import SessionSummary from "@/components/sat/SessionSummary";
import TopicCompleted from "@/components/sat/TopicCompleted";
import TopicRow from "@/components/sat/TopicRow";
import TopicReportCard from "@/components/sat/TopicReportCard";
import { useLanguage } from "@/context/LanguageContext";
import { evaluateBadges } from "@/lib/sat/badges";
import {
  domainLabelKey,
  domainOrderIndex,
  filterQuestionsByDifficulty,
  type SatDifficultyFilter,
} from "@/lib/sat/domains";
import { computeXp, levelProgress as calculateLevelProgress } from "@/lib/sat/levels";
import { accuracyPct, masteryTier, readinessPct as calculateReadinessPct } from "@/lib/sat/mastery";
import type { SatQuestion, SatSection, SatTopic } from "@/lib/sat/types";
import { fetchSatQuestions, useSatTopics } from "@/lib/sat/useSatBank";
import { useSatAttempts } from "@/lib/sat/useSatAttempts";

type View =
  | { mode: "topics" }
  | { mode: "report" }
  | { mode: "badges" }
  | {
      mode: "session";
      topic: SatTopic;
      questions: SatQuestion[];
      difficulty: SatDifficultyFilter;
      index: number;
      correctInSession: number;
    }
  | { mode: "summary"; topic: SatTopic; difficulty: SatDifficultyFilter; total: number; correct: number }
  | { mode: "completed"; topic: SatTopic; difficulty: SatDifficultyFilter; wrongQuestionIds: string[] };

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
  const { topics, loading: topicsLoading, error } = useSatTopics();
  const { attempts, recordAttempt, loading: attemptsLoading, streak, todayCount, longestStreak } = useSatAttempts();
  const [view, setView] = useState<View>({ mode: "topics" });
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [celebrationLevel, setCelebrationLevel] = useState<number | null>(null);
  const [userExpandedDomains, setUserExpandedDomains] = useState<Set<string> | null>(null);
  const [armedTopicKey, setArmedTopicKey] = useState<string | null>(null);
  const loading = topicsLoading || attemptsLoading;

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

  const attemptedProgress = useMemo(
    () => Array.from(topicProgress.values()).filter((progress) => progress.solvedCount > 0),
    [topicProgress]
  );

  const totalWrongCount = useMemo(
    () => mistakeTopics.reduce((total, progress) => total + progress.wrongCount, 0),
    [mistakeTopics]
  );

  const progressTotals = useMemo(
    () =>
      Array.from(topicProgress.values()).reduce(
        (totals, progress) => ({
          totalSolved: totals.totalSolved + progress.solvedCount,
          totalCorrect: totals.totalCorrect + progress.correctCount,
        }),
        { totalSolved: 0, totalCorrect: 0 }
      ),
    [topicProgress]
  );

  const xp = useMemo(
    () => computeXp(progressTotals.totalCorrect, progressTotals.totalSolved),
    [progressTotals.totalCorrect, progressTotals.totalSolved]
  );

  const dashboardLevelProgress = useMemo(() => calculateLevelProgress(xp), [xp]);

  const readiness = useMemo(
    () =>
      calculateReadinessPct(
        topics.map((topic) => ({
          correctCount: topicProgress.get(topicKey(topic))?.correctCount ?? 0,
          questionCount: topic.questionCount,
        }))
      ),
    [topicProgress, topics]
  );

  const badges = useMemo(() => {
    const domainProgress = new Map<string, { gold: number; total: number }>();
    let goldCount = 0;

    for (const topic of topics) {
      const progress = topicProgress.get(topicKey(topic));
      const isGold =
        masteryTier(progress?.solvedCount ?? 0, progress?.correctCount ?? 0, topic.questionCount) === "gold";

      if (isGold) goldCount += 1;

      const domain = domainProgress.get(topic.domain) ?? { gold: 0, total: 0 };
      domain.total += 1;
      if (isGold) domain.gold += 1;
      domainProgress.set(topic.domain, domain);
    }

    const domainFullyGold = Array.from(domainProgress.values()).some(
      (domain) => domain.total >= 1 && domain.gold === domain.total
    );

    return evaluateBadges({
      totalSolved: progressTotals.totalSolved,
      totalCorrect: progressTotals.totalCorrect,
      goldCount,
      domainFullyGold,
      longestStreak,
    });
  }, [longestStreak, progressTotals.totalCorrect, progressTotals.totalSolved, topicProgress, topics]);

  const focusRecommendation = useMemo<SatFocusRecommendation | null>(() => {
    const progressList = topics.map((topic) => {
      const progress = topicProgress.get(topicKey(topic));
      return (
        progress ?? {
          topic,
          solvedCount: 0,
          correctCount: 0,
          wrongQuestionIds: [],
          wrongCount: 0,
        }
      );
    });

    const startedTopics = progressList.filter((progress) => progress.solvedCount > 0);
    const weakestStarted = startedTopics.reduce<TopicProgress | null>((weakest, progress) => {
      if (!weakest) return progress;
      const progressAccuracy = accuracyPct(progress.correctCount, progress.solvedCount);
      const weakestAccuracy = accuracyPct(weakest.correctCount, weakest.solvedCount);
      return progressAccuracy < weakestAccuracy ? progress : weakest;
    }, null);

    if (weakestStarted) {
      const weakestAccuracy = accuracyPct(weakestStarted.correctCount, weakestStarted.solvedCount);
      if (weakestAccuracy < 70) {
        return { topic: weakestStarted.topic, kind: "weak", accuracyPct: weakestAccuracy };
      }
    }

    const notStarted = progressList.find((progress) => progress.solvedCount === 0);
    if (notStarted) {
      return { topic: notStarted.topic, kind: "start", accuracyPct: 0 };
    }

    const incompleteStarted = progressList.find(
      (progress) => progress.solvedCount > 0 && progress.solvedCount < progress.topic.questionCount
    );
    if (incompleteStarted) {
      return {
        topic: incompleteStarted.topic,
        kind: "continue",
        accuracyPct: accuracyPct(incompleteStarted.correctCount, incompleteStarted.solvedCount),
      };
    }

    const firstTopic = progressList[0];
    if (!firstTopic) return null;
    return { topic: firstTopic.topic, kind: "start", accuracyPct: accuracyPct(firstTopic.correctCount, firstTopic.solvedCount) };
  }, [topicProgress, topics]);

  const mathDomainGroups = useMemo(() => {
    const groups = new Map<string, SatTopic[]>();

    for (const topic of topics) {
      if (topic.section !== "math") continue;
      const groupTopics = groups.get(topic.domain) ?? [];
      groupTopics.push(topic);
      groups.set(topic.domain, groupTopics);
    }

    return Array.from(groups.entries())
      .sort(([domainA], [domainB]) => domainOrderIndex(domainA) - domainOrderIndex(domainB))
      .map(([domain, domainTopics]) => ({
        domain,
        topics: domainTopics,
        topicCount: domainTopics.length,
        startedCount: domainTopics.filter((topic) => (topicProgress.get(topicKey(topic))?.solvedCount ?? 0) > 0).length,
        masteryPct: calculateReadinessPct(
          domainTopics.map((topic) => ({
            correctCount: topicProgress.get(topicKey(topic))?.correctCount ?? 0,
            questionCount: topic.questionCount,
          }))
        ),
      }));
  }, [topicProgress, topics]);

  const initialExpandedDomain = focusRecommendation?.topic.domain ?? mathDomainGroups[0]?.domain ?? null;

  // Kullanici bir domain'e dokunana kadar odak domain acik gelir; dokununca
  // kullanicinin secimi gecerli olur. Efekt icinde senkron setState yok.
  const expandedDomains =
    userExpandedDomains ?? new Set(initialExpandedDomain ? [initialExpandedDomain] : []);

  useEffect(() => {
    if (loading) return;
    let celebrationTimer: number | null = null;

    try {
      const storedRaw = window.localStorage.getItem("satCelebratedLevel");
      const storedLevel = storedRaw === null ? Number.NaN : Number(storedRaw);
      const nextLevel = dashboardLevelProgress.level;

      if (!Number.isFinite(storedLevel)) {
        window.localStorage.setItem("satCelebratedLevel", String(nextLevel));
        return;
      }

      if (nextLevel > storedLevel) {
        window.localStorage.setItem("satCelebratedLevel", String(nextLevel));
        celebrationTimer = window.setTimeout(() => setCelebrationLevel(nextLevel), 0);
      }
    } catch {
      // localStorage can fail in private browsing; skip the celebration instead of breaking the dashboard.
    }

    return () => {
      if (celebrationTimer !== null) window.clearTimeout(celebrationTimer);
    };
  }, [dashboardLevelProgress.level, loading]);

  function toggleDomain(domain: string) {
    const next = new Set(expandedDomains);
    if (next.has(domain)) {
      next.delete(domain);
    } else {
      next.add(domain);
    }
    setUserExpandedDomains(next);
  }

  function armTopic(topic: SatTopic) {
    setSessionError(null);
    const key = topicKey(topic);
    setArmedTopicKey((current) => (current === key ? null : key));
  }

  async function openTopic(topic: SatTopic, difficulty: SatDifficultyFilter) {
    setArmedTopicKey(null);
    setSessionError(null);
    try {
      const questions = await fetchSatQuestions(topic.section, topic.skillSlug);
      const pool = filterQuestionsByDifficulty(questions, difficulty);
      if (pool.length === 0) {
        setSessionError(t.sat.noQuestionsAtDifficulty);
        return;
      }

      const unanswered = pool.filter((question) => !attempts.has(question.id));

      if (unanswered.length > 0) {
        setView({ mode: "session", topic, questions: unanswered, difficulty, index: 0, correctInSession: 0 });
        return;
      }

      const poolQuestionIds = new Set(pool.map((question) => question.id));
      setView({
        mode: "completed",
        topic,
        difficulty,
        wrongQuestionIds: (topicProgress.get(topicKey(topic))?.wrongQuestionIds ?? []).filter((questionId) =>
          poolQuestionIds.has(questionId)
        ),
      });
    } catch {
      setSessionError(t.sat.loadError);
    }
  }

  async function restartTopic(topic: SatTopic, difficulty: SatDifficultyFilter) {
    setArmedTopicKey(null);
    setSessionError(null);
    try {
      const questions = await fetchSatQuestions(topic.section, topic.skillSlug);
      const pool = filterQuestionsByDifficulty(questions, difficulty);
      if (pool.length === 0) {
        setSessionError(t.sat.noQuestionsAtDifficulty);
        return;
      }
      setView({ mode: "session", topic, questions: pool, difficulty, index: 0, correctInSession: 0 });
    } catch {
      setSessionError(t.sat.loadError);
    }
  }

  async function openMistakes(topic: SatTopic, wrongQuestionIds: string[]) {
    setArmedTopicKey(null);
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
      setView({ mode: "session", topic, questions, difficulty: "mixed", index: 0, correctInSession: 0 });
    } catch {
      setSessionError(t.sat.loadError);
    }
  }

  const celebration = celebrationLevel ? (
    <LevelUpCelebration level={celebrationLevel} onDismiss={() => setCelebrationLevel(null)} />
  ) : null;

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
                setView({
                  mode: "summary",
                  topic: view.topic,
                  difficulty: view.difficulty,
                  total: view.questions.length,
                  correct: view.correctInSession,
                });
              } else {
                setView({ ...view, index: view.index + 1 });
              }
            }}
          />
        </div>
        {celebration}
      </div>
    );
  }

  if (view.mode === "summary") {
    const overallProgress = topicProgress.get(topicKey(view.topic));

    return (
      <div className="min-h-screen bg-[var(--editorial-paper)] pb-24">
        <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
          <SessionSummary
            total={view.total}
            correct={view.correct}
            overallCorrect={overallProgress?.correctCount}
            overallSolved={overallProgress?.solvedCount}
            onBack={() => setView({ mode: "topics" })}
            onRetry={() => void restartTopic(view.topic, view.difficulty)}
          />
        </div>
        {celebration}
      </div>
    );
  }

  if (view.mode === "completed") {
    return (
      <div className="min-h-screen bg-[var(--editorial-paper)] pb-24">
        <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
          <TopicCompleted
            topic={view.topic}
            wrongQuestionIds={view.wrongQuestionIds}
            onRestart={() => void restartTopic(view.topic, view.difficulty)}
            onOpenMistakes={() => void openMistakes(view.topic, view.wrongQuestionIds)}
            onBack={() => setView({ mode: "topics" })}
          />
        </div>
        {celebration}
      </div>
    );
  }

  if (view.mode === "badges") {
    return (
      <div className="min-h-screen bg-[var(--editorial-paper)] pb-24">
        <BadgesView badges={badges} onBack={() => setView({ mode: "topics" })} />
        {celebration}
      </div>
    );
  }

  if (view.mode === "report") {
    return (
      <div className="min-h-screen bg-[var(--editorial-paper)] pb-24">
        <TopicReportCard
          progress={attemptedProgress}
          onBack={() => setView({ mode: "topics" })}
          onSelectTopic={(topic) => void openTopic(topic, "mixed")}
        />
        {celebration}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--editorial-paper)] pb-24">
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        {!loading && focusRecommendation ? (
          <SatDashboardHeader
            readinessPct={readiness}
            streak={streak}
            todayCount={todayCount}
            levelProgress={dashboardLevelProgress}
            focusRecommendation={focusRecommendation}
            onFocus={() => void openTopic(focusRecommendation.topic, "mixed")}
          />
        ) : (
          <header className="mb-8 border-b border-[var(--editorial-border)] pb-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--editorial-terracotta)]">
              ITALYPATH
            </p>
            <h1 className="mt-3 font-serif text-3xl font-normal leading-tight text-[var(--editorial-ink)] sm:text-4xl">
              {t.sat.title}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--editorial-muted)]">{t.sat.subtitle}</p>
          </header>
        )}

        {!loading ? (
          <div className="mb-6 flex flex-wrap justify-end gap-2">
            {attemptedProgress.length > 0 ? (
              <button
                type="button"
                onClick={() => setView({ mode: "report" })}
                className="w-fit border border-[var(--editorial-sage)] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--editorial-sage)] transition-colors hover:bg-[var(--editorial-sage)] hover:text-white active:translate-y-[1px]"
              >
                {t.sat.reportCardButton}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setView({ mode: "badges" })}
              className="w-fit border border-[#b8872f] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#8d6828] transition-colors hover:bg-[#b8872f] hover:text-white active:translate-y-[1px]"
            >
              {t.sat.badgesButton}
            </button>
          </div>
        ) : null}

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
              {section.key === "math" ? (
                <div className="grid gap-3">
                  {mathDomainGroups.map((group) => {
                    const labelKey = domainLabelKey(group.domain) as keyof typeof t.sat;
                    return (
                      <SatDomainGroup
                        key={group.domain}
                        label={t.sat[labelKey] ?? group.domain}
                        topicCount={group.topicCount}
                        startedCount={group.startedCount}
                        masteryPct={group.masteryPct}
                        expanded={expandedDomains.has(group.domain)}
                        onToggle={() => toggleDomain(group.domain)}
                      >
                        {group.topics.map((topic) => {
                          const progress = topicProgress.get(topicKey(topic));
                          const key = topicKey(topic);
                          return (
                            <TopicRow
                              key={key}
                              topic={topic}
                              solvedCount={progress?.solvedCount ?? 0}
                              correctCount={progress?.correctCount ?? 0}
                              wrongCount={progress?.wrongCount ?? 0}
                              armed={armedTopicKey === key}
                              onSelect={() => armTopic(topic)}
                              onSelectDifficulty={(difficulty) => void openTopic(topic, difficulty)}
                            />
                          );
                        })}
                      </SatDomainGroup>
                    );
                  })}
                </div>
              ) : (
                <div className="grid gap-3">
                  {sectionTopics.map((topic) => {
                    const progress = topicProgress.get(topicKey(topic));
                    const key = topicKey(topic);
                    return (
                      <TopicRow
                        key={key}
                        topic={topic}
                        solvedCount={progress?.solvedCount ?? 0}
                        correctCount={progress?.correctCount ?? 0}
                        wrongCount={progress?.wrongCount ?? 0}
                        armed={armedTopicKey === key}
                        onSelect={() => armTopic(topic)}
                        onSelectDifficulty={(difficulty) => void openTopic(topic, difficulty)}
                      />
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}
      </main>
      {celebration}
    </div>
  );
}
