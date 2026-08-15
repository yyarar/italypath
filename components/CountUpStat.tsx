"use client";

import { useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion } from "framer-motion";

const formatter = new Intl.NumberFormat("tr-TR");

interface CountUpStatProps {
  value: number | null;
  className?: string;
  durationMs?: number;
}

// Sayilar ilk HTML'de gercek hedef degeriyle sunulur; boylece JavaScript
// calismayan istemciler ve arama motorlari yanlislikla "0" gormez. Kart
// gorunur oldugunda istemci tarafinda 0'dan hedefe ease-out-quart ile sayar.
// value null ise (canli veri gelmediyse) sessizce "…" gosterir, animasyon yok.
export default function CountUpStat({ value, className, durationMs = 1200 }: CountUpStatProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  const reduceMotion = useReducedMotion();
  const [display, setDisplay] = useState(() => value ?? 0);

  useEffect(() => {
    if (value === null || !inView || reduceMotion) return;

    let raf = 0;
    let start = 0;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - progress, 4);
      setDisplay(Math.round(value * eased));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(() => {
      setDisplay(0);
      start = performance.now();
      raf = requestAnimationFrame(tick);
    });

    return () => cancelAnimationFrame(raf);
  }, [inView, value, reduceMotion, durationMs]);

  return (
    <span ref={ref} className={className}>
      {value === null ? "…" : formatter.format(reduceMotion ? value : display)}
    </span>
  );
}
