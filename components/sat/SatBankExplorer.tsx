"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, Award, BarChart3, BookOpen, SquareRadical, XCircle } from "lucide-react";

import BadgesView from "@/components/sat/BadgesView";
import LevelUpCelebration from "@/components/sat/LevelUpCelebration";
import MistakesView from "@/components/sat/MistakesView";
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
  | { mode: "mistakes" }
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

function BackHomeLink({ label, className = "" }: { label: string; className?: string }) {
  return (
    <Link
      href="/"
      className={`inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-[var(--editorial-muted)] outline-none transition-colors hover:bg-white/70 hover:text-[var(--editorial-sage)] focus-visible:ring-2 focus-visible:ring-[var(--editorial-sage)] ${className}`}
    >
      <ArrowLeft className="h-4 w-4" strokeWidth={1.9} />
      {label}
    </Link>
  );
}

export default function SatBankExplorer() {
  const { t } = useLanguage();
  const reduceMotion = useReducedMotion();
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

  const viewPositionKey = view.mode === "session" ? `${view.mode}-${view.index}` : view.mode;

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  }, [reduceMotion, viewPositionKey]);

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
          <BackHomeLink label={t.list.backHome} className="mb-5" />
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
          <BackHomeLink label={t.list.backHome} className="mb-5" />
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
          <BackHomeLink label={t.list.backHome} className="mb-5" />
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

  if (view.mode === "mistakes") {
    return (
      <div className="min-h-screen bg-[var(--editorial-paper)] pb-24">
        <MistakesView
          mistakeTopics={mistakeTopics}
          onSelect={(topic, ids) => void openMistakes(topic, ids)}
          onBack={() => setView({ mode: "topics" })}
        />
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
      <main className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
        <nav
          aria-label={t.sat.title}
          className="sticky top-3 z-30 mb-12 flex min-h-14 items-center justify-between gap-3 rounded-2xl border border-white/80 bg-[rgba(255,254,250,0.78)] px-2.5 py-2 shadow-[0_12px_38px_rgba(21,32,28,0.07)] backdrop-blur-xl backdrop-saturate-150 sm:px-3"
        >
          <BackHomeLink label={t.list.backHome} />
          <span className="hidden font-serif text-lg tracking-[-0.025em] text-[var(--editorial-sage)] lg:block">ItalyPath</span>
          {!loading ? (
            <div className="flex min-w-0 items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {totalWrongCount > 0 ? (
                <motion.button
                  type="button"
                  aria-label={`${t.sat.mistakesTitle} · ${totalWrongCount}`}
                  onClick={() => setView({ mode: "mistakes" })}
                  whileTap={reduceMotion ? undefined : { scale: 0.96 }}
                  className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl px-3 text-xs font-semibold text-[var(--editorial-terracotta)] outline-none transition-colors hover:bg-[rgba(183,91,56,0.08)] focus-visible:ring-2 focus-visible:ring-[var(--editorial-terracotta)]"
                >
                  <XCircle className="h-4 w-4" strokeWidth={1.8} />
                  <span className="hidden sm:inline">{t.sat.mistakesTitle}</span> · {totalWrongCount}
                </motion.button>
              ) : null}
              {attemptedProgress.length > 0 ? (
                <motion.button
                  type="button"
                  aria-label={t.sat.reportCardButton}
                  onClick={() => setView({ mode: "report" })}
                  whileTap={reduceMotion ? undefined : { scale: 0.96 }}
                  className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl px-3 text-xs font-semibold text-[var(--editorial-sage)] outline-none transition-colors hover:bg-[var(--editorial-sage-soft)] focus-visible:ring-2 focus-visible:ring-[var(--editorial-sage)]"
                >
                  <BarChart3 className="h-4 w-4" strokeWidth={1.8} />
                  <span className="hidden sm:inline">{t.sat.reportCardButton}</span>
                </motion.button>
              ) : null}
              <motion.button
                type="button"
                aria-label={t.sat.badgesButton}
                onClick={() => setView({ mode: "badges" })}
                whileTap={reduceMotion ? undefined : { scale: 0.96 }}
                className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl px-3 text-xs font-semibold text-[#8d6828] outline-none transition-colors hover:bg-[rgba(184,135,47,0.1)] focus-visible:ring-2 focus-visible:ring-[#b8872f]"
              >
                <Award className="h-4 w-4" strokeWidth={1.8} />
                <span className="hidden sm:inline">{t.sat.badgesButton}</span>
              </motion.button>
            </div>
          ) : null}
        </nav>

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
          <header className="mb-10 max-w-3xl">
            <h1 className="font-serif text-[clamp(2.75rem,7vw,5.25rem)] font-normal leading-[0.96] tracking-[-0.045em] text-[var(--editorial-ink)]">
              {t.sat.title}
            </h1>
            <p className="mt-5 max-w-2xl text-[15px] leading-7 text-[var(--editorial-muted)] sm:text-base">{t.sat.subtitle}</p>
          </header>
        )}

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
          <div className="space-y-4">
            <div className="h-44 rounded-[1.4rem] bg-[var(--editorial-surface)] shimmer" />
            <div className="h-20 rounded-2xl bg-[var(--editorial-surface)] shimmer" />
            <p className="text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--editorial-muted)]">
              {t.hub.loading}
            </p>
          </div>
        ) : null}

        {sections.map((section) => {
          const sectionTopics = topics.filter((topic) => topic.section === section.key);
          if (sectionTopics.length === 0) return null;
          return (
            <section key={section.key} className="mb-14">
              <div className="mb-4 flex items-center gap-3 border-b border-[var(--editorial-border)] pb-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--editorial-sage-soft)] text-[var(--editorial-sage)]">
                  {section.key === "math" ? <SquareRadical className="h-6 w-6" strokeWidth={1.7} /> : <BookOpen className="h-6 w-6" strokeWidth={1.7} />}
                </span>
                <h2 className="font-serif text-3xl font-normal tracking-[-0.03em] text-[var(--editorial-ink)] sm:text-4xl">{section.label}</h2>
              </div>
              {section.key === "math" ? (
                <div className="grid gap-3.5">
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
                <div className="overflow-hidden rounded-2xl border border-[rgba(31,79,70,0.16)] bg-[rgba(255,254,250,0.82)] shadow-[0_10px_35px_rgba(21,32,28,0.035)]">
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
