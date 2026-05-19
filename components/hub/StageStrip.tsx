"use client";

import { motion, useReducedMotion } from "framer-motion";

import { useLanguage } from "@/context/LanguageContext";
import { STAGE_IDS, getStageState, type HubStageId } from "@/lib/hub/stages";
import { useHubStage } from "@/lib/hub/useHubStage";

export default function StageStrip() {
  const { t } = useLanguage();
  const { stage, setStage } = useHubStage();
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        type: "spring",
        stiffness: 110,
        damping: 22,
        delay: 0.06,
      }}
      aria-labelledby="hub-stage-label"
      className="mt-12 grid grid-cols-[36px_minmax(0,1fr)] gap-7 sm:mt-16"
    >
      <p
        id="hub-stage-label"
        className="pt-2 text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--editorial-terracotta)]"
      >
        {t.hub.stageStripLabel}
      </p>
      <div className="grid grid-cols-5 border-y border-[var(--editorial-border)]">
        {STAGE_IDS.map((id) => {
          const state = getStageState(id, stage);
          const copy = t.hub.stages[id];
          const isActive = state === "active";
          const isDone = state === "done";
          const stateLabel = copy.state[state];

          return (
            <button
              key={id}
              type="button"
              onClick={() => setStage(id as HubStageId)}
              aria-current={isActive ? "step" : undefined}
              aria-label={`${copy.label}, ${stateLabel}`}
              className={`group relative border-r border-[var(--editorial-border)] px-3 py-5 text-left transition-colors duration-200 ease-out last:border-r-0 hover:bg-[rgba(216,222,217,0.25)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--editorial-sage)] active:scale-[0.995] ${
                isActive ? "bg-[var(--editorial-band)]" : ""
              }`}
            >
              {isActive && (
                <motion.span
                  layoutId="hub-stage-marker"
                  className="absolute left-0 right-0 top-0 h-[2px] bg-[var(--editorial-terracotta)]"
                  transition={{ type: "spring", stiffness: 220, damping: 26 }}
                />
              )}
              <div
                className={`font-serif text-base ${
                  isDone
                    ? "text-[var(--editorial-sage)]"
                    : isActive
                      ? "font-medium text-[var(--editorial-terracotta)]"
                      : "text-[var(--editorial-muted)]"
                }`}
              >
                {copy.number}
              </div>
              <div
                className={`mt-2 font-serif text-base leading-tight ${
                  isDone
                    ? "text-[var(--editorial-sage)]"
                    : "text-[var(--editorial-ink)]"
                }`}
              >
                {copy.label}
              </div>
              <div
                className={`mt-3 hidden items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.22em] sm:flex ${
                  isDone
                    ? "text-[var(--editorial-sage)]"
                    : isActive
                      ? "text-[var(--editorial-terracotta)]"
                      : "text-[var(--editorial-muted)]"
                }`}
              >
                <span
                  className={`relative inline-block h-1.5 w-1.5 rounded-full border ${
                    isDone
                      ? "border-[var(--editorial-sage)] bg-[var(--editorial-sage)]"
                      : isActive
                        ? "border-[var(--editorial-terracotta)] bg-[var(--editorial-terracotta)]"
                        : "border-[var(--editorial-border)]"
                  }`}
                >
                  {isActive && !shouldReduceMotion && (
                    <span
                      className="absolute -inset-[6px] rounded-full border border-[var(--editorial-terracotta)] animate-hub-stage-pulse"
                      aria-hidden
                    />
                  )}
                </span>
                {stateLabel}
              </div>
            </button>
          );
        })}
      </div>
    </motion.section>
  );
}
