import { localStorageKey } from "@/lib/imat/examState.mjs";
import { CHOICE_KEYS } from "@/lib/imat/scoring.mjs";
import type { ImatChoiceKey } from "@/lib/imat/types";

// Deneme taslaginin tarayici hafizasindaki kopyasi: yalniz kolaylik (spec 2026-10-08). Anahtar oturum
// kimligi; kayit Clerk kullanici kimligini de tasir. Ayni tarayicida baska bir hesap acilirsa o hesabin
// kayitlari yok sayilir (silinmez: baskasinin yarim kalmis denemesidir). Kullanici kimligi olmayan kayit
// yabanci sayilir. Her erisim try/catch icinde (gizli pencere, engelli hafiza, dolu kota).

export interface LocalExamRecord {
  userId: string;
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
    const { userId, sessionId, year, startedAt, deadlineAt, savedAt } = value;
    if (
      typeof userId !== "string" ||
      userId === "" ||
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
    return { userId, sessionId, year, startedAt, deadlineAt, answers, flags, savedAt };
  } catch {
    return null;
  }
}

/** Bu kullanicinin bu oturuma ait kaydi; baska hesabin veya bozuk kayit icin null. */
export function readLocalExam(sessionId: string, userId: string | null): LocalExamRecord | null {
  if (!userId || typeof window === "undefined") return null;
  try {
    const record = parseLocalExam(window.localStorage.getItem(localStorageKey(sessionId)));
    return record && record.userId === userId && record.sessionId === sessionId ? record : null;
  } catch {
    return null;
  }
}

/** Bu kullanicinin teslim edilmemis yerel kayitlari, en yeni baslayan once. Sunucuda veya kimliksiz bos. */
export function readLocalExams(userId: string | null): LocalExamRecord[] {
  if (!userId || typeof window === "undefined") return [];
  try {
    const records: LocalExamRecord[] = [];
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (!key || !key.startsWith(LOCAL_PREFIX)) continue;
      const record = parseLocalExam(window.localStorage.getItem(key));
      if (record && record.userId === userId && localStorageKey(record.sessionId) === key) records.push(record);
    }
    return records.sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt));
  } catch {
    return [];
  }
}

export function writeLocalExam(record: LocalExamRecord) {
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
