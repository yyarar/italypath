"use client";

import { useCallback, useEffect, useId, useState } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { ArrowLeft } from "lucide-react";

import ExamHistory from "@/components/imat/mock/ExamHistory";
import MockExamIntro from "@/components/imat/mock/MockExamIntro";
import MockExamList from "@/components/imat/mock/MockExamList";
import MockExamResult from "@/components/imat/mock/MockExamResult";
import MockExamReview from "@/components/imat/mock/MockExamReview";
import MockExamRunner, { type MockExamRunnerSession, type MockExamSubmitted } from "@/components/imat/mock/MockExamRunner";
import { readLocalExams, removeLocalExam } from "@/components/imat/mock/localExam";
import { useLanguage } from "@/context/LanguageContext";
import type { ImatExamSession, ImatQuestion } from "@/lib/imat/types";
import { fetchImatMockQuestions, useImatCatalog } from "@/lib/imat/useImatBank";
import { isImatRpcError, useImatExam } from "@/lib/imat/useImatExam";

type Tab = "mock" | "practice";

type MockView =
  | { mode: "list" }
  | { mode: "intro"; year: number }
  // expiredLocal: bu cihazdaki suresi dolmus kayit teslim ediliyor (sunucu bulamazsa kurallar ekranina donulur).
  | { mode: "running"; session: MockExamRunnerSession; questions: ImatQuestion[]; expiredLocal?: boolean }
  | { mode: "result"; session: ImatExamSession; questions?: ImatQuestion[]; autoSubmitted?: boolean }
  | { mode: "review"; sessionId: string }
  | { mode: "history" };

type StartErrorKey = "startError" | "rateLimited" | "notAvailable";

interface SessionsState {
  status: "loading" | "ready" | "error";
  sessions: ImatExamSession[];
}

function startErrorKey(error: unknown): StartErrorKey {
  if (isImatRpcError(error)) {
    if (error.code === "imat_exam_rate_limited") return "rateLimited";
    if (error.code === "imat_exam_not_available") return "notAvailable";
  }
  // imat_exam_not_found (oturum cozulemedi, ornegin girisin suresi doldu) ve ag hatalari.
  return "startError";
}

function BackHomeLink({ label }: { label: string }) {
  return (
    <Link
      href="/"
      className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-[var(--editorial-muted)] outline-none transition-colors hover:bg-white/70 hover:text-[var(--editorial-sage)] focus-visible:ring-2 focus-visible:ring-[var(--editorial-sage)]"
    >
      <ArrowLeft className="h-4 w-4" strokeWidth={1.9} aria-hidden="true" />
      {label}
    </Link>
  );
}

export default function ImatExplorer() {
  const { t } = useLanguage();
  const tabsId = useId();
  // Yerel deneme kayitlari Clerk kullanicisina baglidir; ayni tarayicidaki baska hesabin kaydi gorunmez.
  const { user } = useUser();
  const userId = user?.id ?? null;
  const { mocks, loading: catalogLoading, error: catalogError } = useImatCatalog();
  const { startExam, listSessions } = useImatExam();

  const [tab, setTab] = useState<Tab>("mock");
  const [view, setView] = useState<MockView>({ mode: "list" });
  const [startingYear, setStartingYear] = useState<number | null>(null);
  const [startError, setStartError] = useState<StartErrorKey | null>(null);
  const [sessionsState, setSessionsState] = useState<SessionsState>({ status: "loading", sessions: [] });
  const [sessionsVersion, setSessionsVersion] = useState(0);

  // Teslim edilmis denemeler: kartlardaki "son sonuc" ve gecmis listesi.
  useEffect(() => {
    let active = true;
    listSessions()
      .then((sessions) => {
        if (active) setSessionsState({ status: "ready", sessions });
      })
      .catch(() => {
        if (active) setSessionsState((previous) => ({ status: "error", sessions: previous.sessions }));
      });
    return () => {
      active = false;
    };
  }, [listSessions, sessionsVersion]);

  const reloadSessions = useCallback(() => {
    setSessionsState((previous) => ({ status: "loading", sessions: previous.sessions }));
    setSessionsVersion((version) => version + 1);
  }, []);

  const viewKey = view.mode === "intro" ? `intro-${view.year}` : view.mode;
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [viewKey, tab]);

  // Baslat veya devam et. Bu cihazda suresi dolmus, teslim edilmemis bir kayit varsa (sayfa kapanmis,
  // sure bitmis) yeni oturum acilmaz: o oturum calistiriciya verilir ve eldeki taslak hemen teslim edilir.
  async function beginExam(year: number) {
    if (startingYear !== null) return;
    setStartingYear(year);
    setStartError(null);
    try {
      const local = readLocalExams(userId).find((record) => record.year === year) ?? null;
      const questions = await fetchImatMockQuestions(year);
      if (local && !(Date.parse(local.deadlineAt) > Date.now())) {
        setView({
          mode: "running",
          session: {
            id: local.sessionId,
            year,
            startedAt: local.startedAt,
            deadlineAt: local.deadlineAt,
            draftAnswers: {},
          },
          questions,
          expiredLocal: true,
        });
        return;
      }
      const started = await startExam(year);
      if (local && local.sessionId !== started.id) removeLocalExam(local.sessionId);
      setView({
        mode: "running",
        session: {
          id: started.id,
          year,
          startedAt: started.startedAt,
          deadlineAt: started.deadlineAt,
          draftAnswers: started.draftAnswers,
        },
        questions,
      });
    } catch (error) {
      setStartError(startErrorKey(error));
    } finally {
      setStartingYear(null);
    }
  }

  function handleSubmitted(session: MockExamRunnerSession, result: MockExamSubmitted) {
    setView({
      mode: "result",
      session: {
        id: session.id,
        year: session.year,
        startedAt: session.startedAt,
        deadlineAt: session.deadlineAt,
        submittedAt: result.submittedAt,
        draftAnswers: {},
        answers: result.answers,
        correctCount: result.correctCount,
        wrongCount: result.wrongCount,
        blankCount: result.blankCount,
        score: result.score,
        sectionBreakdown: result.sectionBreakdown,
      },
      autoSubmitted: result.autoSubmitted,
    });
    reloadSessions();
  }

  function openList() {
    setStartError(null);
    setView({ mode: "list" });
  }

  if (tab === "mock" && view.mode === "running") {
    const runningSession = view.session;
    return (
      <MockExamRunner
        key={runningSession.id}
        session={runningSession}
        questions={view.questions}
        userId={userId}
        onSubmitted={(result) => handleSubmitted(runningSession, result)}
        onAlreadySubmitted={() => {
          reloadSessions();
          setView({ mode: "history" });
        }}
        onSessionNotFound={
          view.expiredLocal
            ? () => {
                // Kayit calistiricida silindi; yeni deneme kurallar ekranindan baslar (dongu yok).
                setStartError(null);
                setView({ mode: "intro", year: runningSession.year });
              }
            : undefined
        }
        onExit={openList}
      />
    );
  }

  const showOverview = tab === "practice" || view.mode === "list";
  const startErrorText = startError ? t.imat.mock[startError] : null;

  return (
    <div className="min-h-screen bg-[var(--editorial-paper)] pb-24">
      <main className="mx-auto max-w-4xl px-4 py-5 sm:px-6 sm:py-8">
        <nav
          aria-label={t.imat.title}
          className="sticky top-3 z-30 mb-10 flex min-h-14 items-center gap-3 rounded-2xl border border-white/80 bg-[rgba(255,254,250,0.78)] px-2.5 py-2 shadow-[0_12px_38px_rgba(21,32,28,0.07)] backdrop-blur-xl backdrop-saturate-150 sm:px-3"
        >
          <BackHomeLink label={t.imat.backHome} />
        </nav>

        {showOverview ? (
          <>
            <header className="mb-8 max-w-3xl">
              <h1 className="font-serif text-[clamp(2.4rem,7vw,4.5rem)] font-normal leading-[0.98] tracking-[-0.045em] text-[var(--editorial-ink)]">
                {t.imat.title}
              </h1>
              <p className="mt-5 max-w-2xl text-[15px] leading-7 text-[var(--editorial-muted)] sm:text-base">{t.imat.subtitle}</p>
            </header>

            <div
              role="tablist"
              aria-label={t.imat.title}
              className="mb-8 grid grid-cols-2 gap-1 rounded-2xl border border-[var(--editorial-border)] bg-[var(--editorial-surface)] p-1 sm:inline-grid"
            >
              {(
                [
                  { key: "mock", label: t.imat.tabMock },
                  { key: "practice", label: t.imat.tabPractice },
                ] as const
              ).map((item) => {
                const selected = tab === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    role="tab"
                    id={`${tabsId}-${item.key}-tab`}
                    aria-selected={selected}
                    aria-controls={`${tabsId}-${item.key}-panel`}
                    onClick={() => setTab(item.key)}
                    className={`min-h-11 rounded-xl px-4 text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--editorial-sage)] ${
                      selected
                        ? "bg-[var(--editorial-paper)] text-[var(--editorial-ink)] shadow-[0_4px_14px_rgba(21,32,28,0.08)]"
                        : "text-[var(--editorial-muted)] hover:text-[var(--editorial-sage)]"
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </>
        ) : null}

        <div
          role={showOverview ? "tabpanel" : undefined}
          id={showOverview ? `${tabsId}-${tab}-panel` : undefined}
          aria-labelledby={showOverview ? `${tabsId}-${tab}-tab` : undefined}
        >
          {tab === "practice" ? (
            <p className="rounded-[1.4rem] border border-[var(--editorial-border)] bg-[var(--editorial-surface)] p-5 text-[15px] leading-7 text-[var(--editorial-muted)]">
              {t.imat.practice.comingSoon}
            </p>
          ) : null}

          {tab === "mock" && view.mode === "list" ? (
            <MockExamList
              mocks={mocks}
              loading={catalogLoading}
              catalogError={Boolean(catalogError)}
              sessions={sessionsState.sessions}
              userId={userId}
              startingYear={startingYear}
              error={startErrorText}
              onStart={(year) => {
                setStartError(null);
                setView({ mode: "intro", year });
              }}
              onResume={(year) => void beginExam(year)}
              onOpenHistory={() => setView({ mode: "history" })}
            />
          ) : null}

          {tab === "mock" && view.mode === "intro" ? (
            <MockExamIntro
              year={view.year}
              starting={startingYear === view.year}
              error={startErrorText}
              onBegin={() => void beginExam(view.year)}
              onBack={openList}
            />
          ) : null}

          {tab === "mock" && view.mode === "result" ? (
            <MockExamResult
              session={view.session}
              autoSubmitted={view.autoSubmitted}
              onReview={() => setView({ mode: "review", sessionId: view.session.id })}
              onRetake={() => {
                setStartError(null);
                setView({ mode: "intro", year: view.session.year });
              }}
              onBack={openList}
            />
          ) : null}

          {tab === "mock" && view.mode === "review" ? (
            <MockExamReview key={view.sessionId} sessionId={view.sessionId} onBack={openList} />
          ) : null}

          {tab === "mock" && view.mode === "history" ? (
            <ExamHistory
              sessions={sessionsState.sessions}
              status={sessionsState.status}
              onRetry={reloadSessions}
              onOpen={(sessionId) => setView({ mode: "review", sessionId })}
              onBack={openList}
            />
          ) : null}
        </div>
      </main>
    </div>
  );
}
