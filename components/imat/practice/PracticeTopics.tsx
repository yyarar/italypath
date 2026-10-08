"use client";

import { useMemo } from "react";
import { m, useReducedMotion } from "framer-motion";
import { CircleX } from "lucide-react";

import ImatSectionGroup from "@/components/imat/practice/ImatSectionGroup";
import ImatTopicRow from "@/components/imat/practice/ImatTopicRow";
import { buildTopicProgress, topicKey } from "@/components/imat/practice/progress";
import LayoutMotion from "@/components/motion/LayoutMotion";
import { useLanguage } from "@/context/LanguageContext";
import { SECTIONS } from "@/lib/imat/taxonomy.mjs";
import type { ImatSection, ImatTopic } from "@/lib/imat/types";
import type { ImatAttemptState } from "@/lib/imat/useImatAttempts";

interface PracticeTopicsProps {
  topics: ImatTopic[];
  attempts: Map<string, ImatAttemptState>;
  // Hangi bolum gruplarinin acik oldugu ust bilesende tutulur (oturumdan donunce korunur).
  expandedSections: ReadonlySet<ImatSection>;
  onToggleSection: (section: ImatSection) => void;
  onOpenTopic: (topic: ImatTopic, questionIds?: string[]) => void;
  onOpenMistakes: () => void;
}

// Konu pratigi ana gorunumu: bolum gruplari, alt konu satirlari ve "Yanlislarim" girisi.
export default function PracticeTopics({
  topics,
  attempts,
  expandedSections,
  onToggleSection,
  onOpenTopic,
  onOpenMistakes,
}: PracticeTopicsProps) {
  const { t } = useLanguage();
  const reduceMotion = useReducedMotion();

  const { groups, totalWrongCount } = useMemo(() => {
    const progress = buildTopicProgress(topics, attempts);
    return {
      groups: SECTIONS.map((section) => {
        const items = progress.filter((item) => item.topic.section === section);
        return { section, items, solvedCount: items.filter((item) => item.solvedCount > 0).length };
      }).filter((group) => group.items.length > 0),
      totalWrongCount: progress.reduce((total, item) => total + item.wrongCount, 0),
    };
  }, [topics, attempts]);

  if (topics.length === 0) {
    return (
      <p className="rounded-[1.4rem] border border-[var(--editorial-border)] bg-[var(--editorial-surface)] p-5 text-[15px] leading-7 text-[var(--editorial-muted)]">
        {t.imat.practice.comingSoon}
      </p>
    );
  }

  return (
    <section>
      {totalWrongCount > 0 ? (
        <div className="mb-4 flex justify-end">
          <m.button
            type="button"
            onClick={onOpenMistakes}
            whileTap={reduceMotion ? undefined : { scale: 0.96 }}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-xs font-semibold text-[var(--editorial-terracotta-ink)] outline-none transition-colors hover:bg-[rgba(183,91,56,0.08)] focus-visible:ring-2 focus-visible:ring-[var(--editorial-terracotta)]"
          >
            <CircleX className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
            {t.imat.practice.mistakesTitle} · {totalWrongCount}
          </m.button>
        </div>
      ) : null}

      {/* Gruplar layout="position" ile kayar; yerlesim ozellikleri ayri pakette. */}
      <LayoutMotion>
        <div className="grid gap-3.5">
          {groups.map((group) => (
            <ImatSectionGroup
              key={group.section}
              section={group.section}
              label={t.imat.sections[group.section]}
              topicCount={group.items.length}
              solvedCount={group.solvedCount}
              expanded={expandedSections.has(group.section)}
              onToggle={() => onToggleSection(group.section)}
            >
              {group.items.map((item) => (
                <ImatTopicRow
                  key={topicKey(item.topic)}
                  topic={item.topic}
                  solvedCount={item.solvedCount}
                  correctCount={item.correctCount}
                  wrongCount={item.wrongCount}
                  onSelect={() => onOpenTopic(item.topic)}
                />
              ))}
            </ImatSectionGroup>
          ))}
        </div>
      </LayoutMotion>
    </section>
  );
}
