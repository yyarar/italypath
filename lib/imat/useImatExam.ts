"use client";

import { useCallback, useMemo } from "react";

import { CHOICE_KEYS } from "@/lib/imat/scoring.mjs";
import type {
  ImatChoiceKey,
  ImatExamSession,
  ImatSection,
  ImatSectionBreakdown,
} from "@/lib/imat/types";
import { useUserSupabaseClient } from "@/lib/useUserSupabaseClient";
import type { ImatExamSessionRow } from "@/types";

// Veritabani islevlerinin firlattigi bilinen hata kodlari (supabase/imat_bank.sql).
export const IMAT_RPC_ERROR_CODES = [
  "imat_attempt_rate_limited",
  "imat_exam_rate_limited",
  "imat_exam_not_available",
  "imat_exam_not_found",
  "imat_exam_already_submitted",
] as const;

export type ImatRpcErrorCode = (typeof IMAT_RPC_ERROR_CODES)[number];

// message ve code ayni; arayuz code'a bakip kendi metnini secer.
export class ImatRpcError extends Error {
  readonly code: ImatRpcErrorCode;

  constructor(code: ImatRpcErrorCode) {
    super(code);
    this.name = "ImatRpcError";
    this.code = code;
  }
}

export function isImatRpcError(error: unknown): error is ImatRpcError {
  return error instanceof ImatRpcError;
}

export interface ImatStartedExam {
  id: string;
  startedAt: string;
  deadlineAt: string;
  draftAnswers: Record<string, ImatChoiceKey>;
  resumed: boolean;
}

export interface ImatSubmitResult {
  correctCount: number;
  wrongCount: number;
  blankCount: number;
  score: number;
  sectionBreakdown: Record<ImatSection, ImatSectionBreakdown>;
  submittedAt: string;
}

interface StartExamRow {
  id: string;
  started_at: string;
  deadline_at: string;
  draft_answers: Record<string, string> | null;
  resumed: boolean;
}

interface SubmitExamRow {
  correct_count: number;
  wrong_count: number;
  blank_count: number;
  score: number | string;
  section_breakdown: Record<string, ImatSectionBreakdown>;
  submitted_at: string;
}

const SESSION_COLUMNS =
  "id,year,started_at,deadline_at,draft_answers,submitted_at,answers,correct_count,wrong_count,blank_count,score,section_breakdown";
const SESSION_LIST_LIMIT = 50;

// Bilinen kod mesajda geciyorsa ImatRpcError, degilse hata oldugu gibi.
function toRpcError(error: unknown): unknown {
  const message =
    error && typeof error === "object" && "message" in error && typeof error.message === "string"
      ? error.message
      : "";
  const code = IMAT_RPC_ERROR_CODES.find((candidate) => message.includes(candidate));
  return code ? new ImatRpcError(code) : error;
}

// Set donduren islevler dizi doner; tek satir beklenir.
function firstRow<T>(data: unknown): T | null {
  const row = Array.isArray(data) ? data[0] : data;
  return row && typeof row === "object" ? (row as T) : null;
}

// Yalniz A-E harfli yanitlar kalir.
function readAnswers(value: Record<string, string> | null): Record<string, ImatChoiceKey> {
  const answers: Record<string, ImatChoiceKey> = {};
  for (const [questionId, letter] of Object.entries(value ?? {})) {
    if ((CHOICE_KEYS as readonly string[]).includes(letter)) answers[questionId] = letter as ImatChoiceKey;
  }
  return answers;
}

function toSession(row: Omit<ImatExamSessionRow, "user_id">): ImatExamSession {
  return {
    id: row.id,
    year: row.year,
    startedAt: row.started_at,
    deadlineAt: row.deadline_at,
    submittedAt: row.submitted_at,
    draftAnswers: readAnswers(row.draft_answers),
    answers: row.answers ? readAnswers(row.answers) : null,
    correctCount: row.correct_count,
    wrongCount: row.wrong_count,
    blankCount: row.blank_count,
    // Postgres numeric metin olarak gelebilir.
    score: row.score === null ? null : Number(row.score),
    sectionBreakdown: row.section_breakdown as Record<ImatSection, ImatSectionBreakdown> | null,
  };
}

// Deneme oturumu islemleri: baslat/devam et, taslak kaydet, teslim et, gecmis.
// Donen islevlerin kimligi sabit (calistirici effect bagimliliklarinda kullanir).
export function useImatExam() {
  const getClient = useUserSupabaseClient();

  const startExam = useCallback(
    async (year: number): Promise<ImatStartedExam> => {
      const supabase = await getClient();
      const { data, error } = await supabase.rpc("imat_start_exam", { p_year: year });
      if (error) throw toRpcError(error);
      const row = firstRow<StartExamRow>(data);
      if (!row) throw new Error("imat_start_exam bos yanit dondu");
      return {
        id: row.id,
        startedAt: row.started_at,
        deadlineAt: row.deadline_at,
        draftAnswers: readAnswers(row.draft_answers),
        resumed: row.resumed,
      };
    },
    [getClient],
  );

  const saveDraft = useCallback(
    async (sessionId: string, answers: Record<string, ImatChoiceKey>): Promise<void> => {
      const supabase = await getClient();
      const { error } = await supabase.rpc("imat_save_exam_draft", {
        p_session_id: sessionId,
        p_answers: answers,
      });
      if (error) throw toRpcError(error);
    },
    [getClient],
  );

  const submitExam = useCallback(
    async (sessionId: string, answers: Record<string, ImatChoiceKey>): Promise<ImatSubmitResult> => {
      const supabase = await getClient();
      const { data, error } = await supabase.rpc("imat_submit_exam", {
        p_session_id: sessionId,
        p_answers: answers,
      });
      if (error) throw toRpcError(error);
      const row = firstRow<SubmitExamRow>(data);
      if (!row) throw new Error("imat_submit_exam bos yanit dondu");
      return {
        correctCount: row.correct_count,
        wrongCount: row.wrong_count,
        blankCount: row.blank_count,
        score: Number(row.score),
        sectionBreakdown: row.section_breakdown as Record<ImatSection, ImatSectionBreakdown>,
        submittedAt: row.submitted_at,
      };
    },
    [getClient],
  );

  // Kendi teslim edilmis oturumlari, en yeni once (RLS yalniz kendi satirlarini gosterir).
  const listSessions = useCallback(async (): Promise<ImatExamSession[]> => {
    const supabase = await getClient();
    const { data, error } = await supabase
      .from("imat_exam_sessions")
      .select(SESSION_COLUMNS)
      .not("submitted_at", "is", null)
      .order("submitted_at", { ascending: false })
      .limit(SESSION_LIST_LIMIT)
      .returns<Omit<ImatExamSessionRow, "user_id">[]>();
    if (error) throw error;
    return (data ?? []).map(toSession);
  }, [getClient]);

  return useMemo(
    () => ({ startExam, saveDraft, submitExam, listSessions }),
    [startExam, saveDraft, submitExam, listSessions],
  );
}
