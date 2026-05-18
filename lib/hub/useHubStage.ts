"use client";

import { useCallback, useSyncExternalStore } from "react";
import { DEFAULT_STAGE, isValidStage, type HubStageId } from "./stages";

const STORAGE_KEY = "italyPathStage";
const CHANGE_EVENT = "italypath-hub-stage-change";

function readStage(): HubStageId {
  if (typeof window === "undefined") return DEFAULT_STAGE;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  return isValidStage(raw) ? raw : DEFAULT_STAGE;
}

function subscribe(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", callback);
  window.addEventListener(CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(CHANGE_EVENT, callback);
  };
}

export function useHubStage(): {
  stage: HubStageId;
  setStage: (next: HubStageId) => void;
} {
  const stage = useSyncExternalStore(subscribe, readStage, () => DEFAULT_STAGE);

  const setStage = useCallback((next: HubStageId) => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, next);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return { stage, setStage };
}
