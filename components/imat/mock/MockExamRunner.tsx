"use client";

import { useCallback, useEffect, useId, useMemo, useReducer, useRef, useState } from "react";
import { m, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, Eraser, Flag } from "lucide-react";

import ImatQuestionCard from "@/components/imat/ImatQuestionCard";
import ExamNavigator from "@/components/imat/mock/ExamNavigator";
import ExamTimer from "@/components/imat/mock/ExamTimer";
import { fillTemplate } from "@/components/imat/mock/MockExamResult";
import { useLanguage } from "@/context/LanguageContext";
import {
  createExamState,
  examReducer,
  localStorageKey,
  mergeDrafts,
  unansweredCount,
} from "@/lib/imat/examState.mjs";
import { CHOICE_KEYS } from "@/lib/imat/scoring.mjs";
import type { ImatChoiceKey, ImatQuestion } from "@/lib/imat/types";
import { isImatRpcError, useImatExam, type ImatSubmitResult } from "@/lib/imat/useImatExam";

// Sunucuya ara kayit en cok bu aralikla (degisiklik varsa); sayfa gizlenince hemen.
const DRAFT_SAVE_INTERVAL_MS = 60 * 1000;

// ---------------------------------------------------------------------------
// Tarayici hafizasi: yalniz kolaylik (spec 2026-10-08). Kayit oturum kimligiyle tutulur;
// liste "Devam Et" icin yil ve son teslim zamanini buradan okur. Her erisim try/catch icinde.

export interface LocalExamRecord {
  sessionId: string;
  year: number;
  startedAt: string;
  deadlineAt: string;
  answers: Record<string, ImatChoiceKey>;
  flags: Record<string, boolean>;
  savedAt: number;
}

const LOCAL_PREFIX = localStorageKey("");

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parseLocalExam(raw: string | null): LocalExamRecord | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!isPlainObject(value)) return null;
    const { sessionId, year, startedAt, deadlineAt, savedAt } = value;
    if (
      typeof sessionId !== "string" ||
      typeof year !== "number" ||
      typeof startedAt !== "string" ||
      typeof deadlineAt !== "string" ||
      typeof savedAt !== "number"
    ) {
      return null;
    }
    const answers: Record<string, ImatChoiceKey> = {};
    if (isPlainObject(value.answers)) {
      for (const [questionId, letter] of Object.entries(value.answers)) {
        if ((CHOICE_KEYS as readonly unknown[]).includes(letter)) answers[questionId] = letter as ImatChoiceKey;
      }
    }
    const flags: Record<string, boolean> = {};
    if (isPlainObject(value.flags)) {
      for (const [questionId, flagged] of Object.entries(value.flags)) {
        if (flagged === true) flags[questionId] = true;
      }
    }
    return { sessionId, year, startedAt, deadlineAt, answers, flags, savedAt };
  } catch {
    return null;
  }
}

export function readLocalExam(sessionId: string): LocalExamRecord | null {
  try {
    return parseLocalExam(window.localStorage.getItem(localStorageKey(sessionId)));
  } catch {
    return null;
  }
}

// Teslim edilmemis yerel kayitlar, en yeni baslayan once. Sunucu tarafinda (window yok) bos.
export function readLocalExams(): LocalExamRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const records: LocalExamRecord[] = [];
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (!key || !key.startsWith(LOCAL_PREFIX)) continue;
      const record = parseLocalExam(window.localStorage.getItem(key));
      if (record && localStorageKey(record.sessionId) === key) records.push(record);
    }
    return records.sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt));
  } catch {
    return [];
  }
}

function writeLocalExam(record: LocalExamRecord) {
  try {
    window.localStorage.setItem(localStorageKey(record.sessionId), JSON.stringify(record));
  } catch {
    // Gizli pencere veya dolu kota: sunucu taslagi yine 60 sn'de bir yazilir.
  }
}

export function removeLocalExam(sessionId: string) {
  try {
    window.localStorage.removeItem(localStorageKey(sessionId));
  } catch {
    // Hafiza erisilemiyorsa silinecek kayit da yoktur.
  }
}

// ---------------------------------------------------------------------------

export interface MockExamRunnerSession {
  id: string;
  year: number;
  startedAt: string;
  deadlineAt: string;
  draftAnswers: Record<string, ImatChoiceKey>;
}

export interface MockExamSubmitted extends ImatSubmitResult {
  answers: Record<string, ImatChoiceKey>;
  autoSubmitted: boolean;
}

interface MockExamRunnerProps {
  session: MockExamRunnerSession;
  // Kagit sirasiyla 60 soru; deneme yaniti cevap anahtari tasimaz.
  questions: ImatQuestion[];
  onSubmitted: (result: MockExamSubmitted) => void;
  // Oturum baska bir yerden zaten teslim edilmis: gecmisten acilir.
  onAlreadySubmitted: () => void;
  // Teslim hatasinda listeye donus (cevaplar bu cihazda kalir).
  onExit: () => void;
}

type Phase = "answering" | "confirm" | "submitting" | "error";
type SubmitErrorKey = "submitError" | "notAvailable";

// Iki cevap kumesini karsilastirmak icin sabit sirali imza (soru sirasiyla harf ya da "-").
function answerSignature(questionIds: readonly string[], answers: Readonly<Record<string, ImatChoiceKey>>) {
  return questionIds.map((id) => answers[id] ?? "-").join("");
}

export default function MockExamRunner({
  session,
  questions,
  onSubmitted,
  onAlreadySubmitted,
  onExit,
}: MockExamRunnerProps) {
  const { t } = useLanguage();
  const reduceMotion = useReducedMotion();
  const { saveDraft, submitExam } = useImatExam();
  const confirmTitleId = useId();
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  const orderedQuestions = useMemo(() => [...questions].sort((a, b) => a.number - b.number), [questions]);
  const questionIds = useMemo(() => orderedQuestions.map((question) => question.id), [orderedQuestions]);

  // Acilista yerel taslak ile sunucu taslagi birlesir: yerel kayit varsa o (sunucu taslaginin
  // kaydetme zamani bilinmiyor, 0 sayilir), yoksa sunucudaki taslak.
  const [state, dispatch] = useReducer(examReducer, null, () => {
    const initial = createExamState({ sessionId: session.id, questionIds });
    const local = readLocalExam(session.id);
    const merged = mergeDrafts(
      local ? { answers: local.answers, savedAt: local.savedAt } : null,
      { answers: session.draftAnswers, savedAt: 0 },
    );
    return examReducer(initial, { type: "hydrate", answers: merged.answers, flags: local?.flags ?? {} });
  });

  const [phase, setPhase] = useState<Phase>("answering");
  const [submitErrorKey, setSubmitErrorKey] = useState<SubmitErrorKey | null>(null);
  const [timeUp, setTimeUp] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);

  const latestRef = useRef(state);
  const finishedRef = useRef(false);
  const submittingRef = useRef(false);
  const autoSubmittedRef = useRef(false);
  const savingRef = useRef(false);
  const savedSignatureRef = useRef(answerSignature(questionIds, session.draftAnswers));

  useEffect(() => {
    latestRef.current = state;
  }, [state]);

  // Her degisiklikte tarayici hafizasina yaz (acilista da: liste "Devam Et"i buradan bilir).
  useEffect(() => {
    if (finishedRef.current) return;
    writeLocalExam({
      sessionId: session.id,
      year: session.year,
      startedAt: session.startedAt,
      deadlineAt: session.deadlineAt,
      answers: state.answers,
      flags: state.flags,
      savedAt: Date.now(),
    });
  }, [session.id, session.year, session.startedAt, session.deadlineAt, state.answers, state.flags]);

  const flushDraft = useCallback(async () => {
    if (finishedRef.current || savingRef.current || submittingRef.current) return;
    const answers = latestRef.current.answers;
    const signature = answerSignature(questionIds, answers);
    if (signature === savedSignatureRef.current) return;
    savingRef.current = true;
    try {
      await saveDraft(session.id, answers);
      savedSignatureRef.current = signature;
      setSaveFailed(false);
    } catch {
      // Sessiz yeniden deneme: bir sonraki aralikta veya sayfa gizlenince tekrar.
      setSaveFailed(true);
    } finally {
      savingRef.current = false;
    }
  }, [questionIds, saveDraft, session.id]);

  useEffect(() => {
    const interval = window.setInterval(() => void flushDraft(), DRAFT_SAVE_INTERVAL_MS);
    function handleVisibility() {
      if (document.visibilityState === "hidden") void flushDraft();
    }
    function handlePageHide() {
      void flushDraft();
    }
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("pagehide", handlePageHide);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("pagehide", handlePageHide);
      // Uygulama ici gezinmede sayfa gizlenmez; ayrilirken bekleyen degisiklik gonderilir.
      void flushDraft();
    };
  }, [flushDraft]);

  const submit = useCallback(
    async (auto: boolean) => {
      if (finishedRef.current || submittingRef.current) return;
      submittingRef.current = true;
      if (auto) autoSubmittedRef.current = true;
      setPhase("submitting");
      setSubmitErrorKey(null);
      const answers = latestRef.current.answers;
      try {
        const result = await submitExam(session.id, answers);
        finishedRef.current = true;
        removeLocalExam(session.id);
        onSubmitted({ ...result, answers, autoSubmitted: autoSubmittedRef.current });
      } catch (error) {
        if (isImatRpcError(error) && error.code === "imat_exam_already_submitted") {
          finishedRef.current = true;
          removeLocalExam(session.id);
          onAlreadySubmitted();
          return;
        }
        // Cevaplar tarayici hafizasinda kalir; "Tekrar dene" ayni taslagi yeniden gonderir.
        setSubmitErrorKey(isImatRpcError(error) && error.code === "imat_exam_not_available" ? "notAvailable" : "submitError");
        setPhase("error");
      } finally {
        submittingRef.current = false;
      }
    },
    [onAlreadySubmitted, onSubmitted, session.id, submitExam],
  );

  const handleExpire = useCallback(() => {
    setTimeUp(true);
    void submit(true);
  }, [submit]);

  useEffect(() => {
    if (phase === "confirm") confirmButtonRef.current?.focus();
  }, [phase]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  }, [reduceMotion, state.index]);

  const currentId = questionIds[state.index];
  const currentQuestion = orderedQuestions[state.index];
  const selected = currentId ? state.answers[currentId] ?? null : null;
  const flagged = currentId ? state.flags[currentId] === true : false;
  const locked = timeUp || phase === "submitting";
  const blankCount = unansweredCount(questionIds, state.answers);
  const isFirst = state.index === 0;
  const isLast = state.index >= questionIds.length - 1;

  const buttonShape =
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-bold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--editorial-sage)] disabled:cursor-default disabled:opacity-45";
  const secondaryTone = "border-[var(--editorial-border)] bg-[rgba(255,254,250,0.82)] text-[var(--editorial-sage)] hover:bg-white";
  const flaggedTone = "border-[var(--editorial-terracotta)] bg-[rgba(191,95,74,0.08)] text-[var(--editorial-terracotta-ink)]";
  const secondaryButton = `${buttonShape} ${secondaryTone}`;
  const primaryButton =
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--editorial-sage)] px-5 py-2.5 text-xs font-bold text-white shadow-[0_7px_18px_rgba(31,79,70,0.14)] outline-none transition-colors hover:bg-[#173d36] focus-visible:ring-2 focus-visible:ring-[var(--editorial-sage)] focus-visible:ring-offset-2 disabled:cursor-default disabled:opacity-60";

  return (
    <div className="min-h-screen bg-[var(--editorial-paper)] pb-24">
      <div className="mx-auto max-w-5xl px-4 py-5 sm:px-6 sm:py-8">
        <div className="sticky top-3 z-30 mb-6 rounded-2xl border border-white/80 bg-[rgba(255,254,250,0.92)] px-3 py-2 shadow-[0_12px_38px_rgba(21,32,28,0.07)] backdrop-blur-xl backdrop-saturate-150">
          <div className="flex min-h-12 items-center justify-between gap-3">
            <ExamTimer deadlineAt={session.deadlineAt} onExpire={handleExpire} />
            <span className="shrink-0 text-[13px] font-semibold tabular-nums text-[var(--editorial-muted)]">
              {state.index + 1} / {questionIds.length}
            </span>
            <m.button
              type="button"
              onClick={() => setPhase("confirm")}
              disabled={locked || phase === "confirm"}
              whileTap={reduceMotion ? undefined : { scale: 0.97 }}
              className={primaryButton}
            >
              {t.imat.mock.submit}
            </m.button>
          </div>

          {phase === "confirm" ? (
            <div
              role="dialog"
              aria-labelledby={confirmTitleId}
              className="mt-2 border-t border-[var(--editorial-border)] pb-1 pt-3"
            >
              <p id={confirmTitleId} className="text-[14px] leading-6 text-[var(--editorial-ink)]">
                {fillTemplate(t.imat.mock.submitConfirm, { n: blankCount })}
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:justify-end">
                <button type="button" onClick={() => setPhase("answering")} className={secondaryButton}>
                  {t.imat.mock.keepWorking}
                </button>
                <button ref={confirmButtonRef} type="button" onClick={() => void submit(false)} className={primaryButton}>
                  {t.imat.mock.submit}
                </button>
              </div>
            </div>
          ) : null}

          {phase === "submitting" ? (
            <p role="status" className="mt-2 border-t border-[var(--editorial-border)] pb-1 pt-3 text-[13px] font-semibold text-[var(--editorial-sage)]">
              {t.imat.mock.submitting}
            </p>
          ) : null}

          {phase === "error" && submitErrorKey ? (
            <div className="mt-2 border-t border-[var(--editorial-border)] pb-1 pt-3">
              <p role="alert" className="text-[13px] leading-6 text-[var(--editorial-terracotta-ink)]">
                {t.imat.mock[submitErrorKey]}
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:justify-end">
                <button type="button" onClick={onExit} className={secondaryButton}>
                  {t.imat.mock.backToList}
                </button>
                <button type="button" onClick={() => void submit(timeUp)} className={primaryButton}>
                  {t.imat.retry}
                </button>
              </div>
            </div>
          ) : null}
        </div>

        {saveFailed ? (
          <p role="status" className="mb-4 border-l-2 border-[var(--editorial-terracotta)] bg-[var(--editorial-surface)] px-3 py-2 text-[12px] leading-5 text-[var(--editorial-terracotta-ink)]">
            {t.imat.mock.saveError}
          </p>
        ) : null}

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_17rem] lg:items-start">
          <fieldset disabled={locked} className="m-0 min-w-0 border-0 p-0">
            {currentQuestion ? (
              <ImatQuestionCard
                key={currentQuestion.id}
                question={currentQuestion}
                mode="exam"
                selected={selected}
                revealed={false}
                onSelect={(letter) => {
                  if (currentId) dispatch({ type: "answer", questionId: currentId, letter });
                }}
              />
            ) : null}

            <div className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:justify-between">
              <div className="col-span-2 grid grid-cols-2 gap-2 sm:flex">
                <button
                  type="button"
                  aria-pressed={flagged}
                  onClick={() => currentId && dispatch({ type: "toggleFlag", questionId: currentId })}
                  className={`${buttonShape} ${flagged ? flaggedTone : secondaryTone}`}
                >
                  <Flag className="h-4 w-4" strokeWidth={1.9} aria-hidden="true" />
                  {flagged ? t.imat.mock.unflag : t.imat.mock.flag}
                </button>
                <button
                  type="button"
                  disabled={!selected}
                  onClick={() => currentId && dispatch({ type: "clear", questionId: currentId })}
                  className={secondaryButton}
                >
                  <Eraser className="h-4 w-4" strokeWidth={1.9} aria-hidden="true" />
                  {t.imat.mock.clear}
                </button>
              </div>
              <div className="col-span-2 grid grid-cols-2 gap-2 sm:flex">
                <button type="button" disabled={isFirst} onClick={() => dispatch({ type: "prev" })} className={secondaryButton}>
                  <ArrowLeft className="h-4 w-4" strokeWidth={1.9} aria-hidden="true" />
                  {t.imat.mock.prev}
                </button>
                <button type="button" disabled={isLast} onClick={() => dispatch({ type: "next" })} className={secondaryButton}>
                  {t.imat.mock.next}
                  <ArrowRight className="h-4 w-4" strokeWidth={1.9} aria-hidden="true" />
                </button>
              </div>
            </div>
          </fieldset>

          <aside className="rounded-[1.4rem] border border-[var(--editorial-border)] bg-[rgba(255,254,250,0.7)] p-4 lg:sticky lg:top-28">
            <ExamNavigator
              questionIds={questionIds}
              answers={state.answers}
              flags={state.flags}
              currentIndex={state.index}
              onGoto={(index) => dispatch({ type: "goto", index })}
            />
          </aside>
        </div>
      </div>
    </div>
  );
}
