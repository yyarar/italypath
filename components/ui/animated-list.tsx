"use client";

import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

export type AnimatedListItemData = {
  id: string;
  title: string;
  subtitle?: string;
};

type AnimatedListProps = {
  items: AnimatedListItemData[];
  className?: string;
  itemClassName?: string;
  intervalMs?: number;
  visibleCount?: number;
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function getVisibleItems(
  items: AnimatedListItemData[],
  start: number,
  count: number
) {
  const safeCount = Math.max(1, Math.min(count, items.length));
  return Array.from({ length: safeCount }, (_, offset) => {
    return items[(start + offset) % items.length];
  });
}

export default function AnimatedList({
  items,
  className,
  itemClassName,
  intervalMs = 2400,
  visibleCount = 3,
}: AnimatedListProps) {
  const shouldReduceMotion = useReducedMotion();
  const [startIndex, setStartIndex] = useState(0);

  const visibleItems = useMemo(() => {
    if (!items.length) return [];
    return getVisibleItems(items, startIndex, visibleCount);
  }, [items, startIndex, visibleCount]);

  useEffect(() => {
    if (shouldReduceMotion || items.length <= visibleCount) return;

    const intervalId = window.setInterval(() => {
      setStartIndex((prev) => (prev + 1) % items.length);
    }, intervalMs);

    return () => window.clearInterval(intervalId);
  }, [intervalMs, items.length, shouldReduceMotion, visibleCount]);

  if (!items.length) return null;

  const reducedItems = items.slice(0, Math.min(visibleCount, items.length));
  const listToRender = shouldReduceMotion ? reducedItems : visibleItems;

  return (
    <div className={cn("relative flex flex-col gap-2 overflow-hidden", className)} aria-hidden>
      <AnimatePresence initial={false} mode="popLayout">
        {listToRender.map((item) => (
          <motion.div
            key={item.id}
            layout
            initial={shouldReduceMotion ? false : { opacity: 0, y: 16, filter: "blur(4px)" }}
            animate={shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -14, filter: "blur(4px)" }}
            transition={{ type: "spring", stiffness: 200, damping: 24, mass: 0.55 }}
            className={cn(
              "rounded-xl border border-white/70 bg-white/75 px-3 py-2 shadow-[0_4px_16px_rgba(15,23,42,0.04)] backdrop-blur-sm",
              itemClassName
            )}
          >
            <p className="text-[11px] font-semibold text-slate-600">{item.title}</p>
            {item.subtitle ? (
              <p className="mt-0.5 text-[10px] font-medium text-slate-400">{item.subtitle}</p>
            ) : null}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
