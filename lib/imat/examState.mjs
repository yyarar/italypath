// IMAT deneme sinavi istemci durumu (saf reducer). Ayni modulu site kancasi ve betik testi ice aktarir
// (tipler examState.d.mts). Durum: { sessionId, questionIds, index, answers, flags }.
import { CHOICE_KEYS, normalizeAnswers } from "./scoring.mjs";

export function createExamState({ sessionId, questionIds }) {
  return { sessionId, questionIds: [...questionIds], index: 0, answers: {}, flags: {} };
}

function clampIndex(state, index) {
  const last = Math.max(0, state.questionIds.length - 1);
  return Math.min(Math.max(index, 0), last);
}

function without(record, key) {
  const next = { ...record };
  delete next[key];
  return next;
}

// Saf: degisiklikte yeni nesne dondurur; gecersiz aksiyon durumu aynen dondurur.
export function examReducer(state, action) {
  switch (action.type) {
    case "answer": {
      if (!state.questionIds.includes(action.questionId) || !CHOICE_KEYS.includes(action.letter)) return state;
      return { ...state, answers: { ...state.answers, [action.questionId]: action.letter } };
    }
    case "clear":
      return { ...state, answers: without(state.answers, action.questionId) };
    case "toggleFlag": {
      if (!state.questionIds.includes(action.questionId)) return state;
      const flags = state.flags[action.questionId] ? without(state.flags, action.questionId) : { ...state.flags, [action.questionId]: true };
      return { ...state, flags };
    }
    case "goto": {
      if (!Number.isFinite(action.index)) return state;
      return { ...state, index: clampIndex(state, Math.trunc(action.index)) };
    }
    case "next":
      return { ...state, index: clampIndex(state, state.index + 1) };
    case "prev":
      return { ...state, index: clampIndex(state, state.index - 1) };
    case "hydrate": {
      const flags = {};
      for (const id of state.questionIds) {
        if (action.flags && Object.hasOwn(action.flags, id) && action.flags[id] === true) flags[id] = true;
      }
      return { ...state, answers: normalizeAnswers(action.answers, state.questionIds), flags };
    }
    default:
      return state;
  }
}

// Yerel ve sunucu taslagi: savedAt buyuk olan kazanir, esitse yerel. Eksik taraf yoksayilir.
export function mergeDrafts(local, server) {
  const winner = !server ? local : !local ? server : server.savedAt > local.savedAt ? server : local;
  return { answers: { ...(winner?.answers ?? {}) }, savedAt: winner?.savedAt ?? 0 };
}

export function unansweredCount(questionIds, answers) {
  const valid = normalizeAnswers(answers, questionIds);
  return questionIds.filter((id) => !Object.hasOwn(valid, id)).length;
}

export function localStorageKey(sessionId) {
  return `imatExam:${sessionId}`;
}
