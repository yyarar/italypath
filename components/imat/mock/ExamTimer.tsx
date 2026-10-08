"use client";

import { useEffect, useRef, useState } from "react";
import { Clock } from "lucide-react";

import { useLanguage } from "@/context/LanguageContext";

// Son 10 dakika vurgulanir (spec 2026-10-08).
const LAST_MINUTES_MS = 10 * 60 * 1000;

function formatRemaining(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

interface ExamTimerProps {
  // Sunucunun verdigi son teslim zamani (ISO); sayfa yenilense de sure buradan hesaplanir.
  deadlineAt: string;
  // Sure sifira inince bir kez cagrilir (otomatik teslim).
  onExpire: () => void;
}

export default function ExamTimer({ deadlineAt, onExpire }: ExamTimerProps) {
  const { t } = useLanguage();
  const deadline = Date.parse(deadlineAt);
  const [now, setNow] = useState(() => Date.now());
  const onExpireRef = useRef(onExpire);
  const firedRef = useRef(false);

  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    function tick() {
      const current = Date.now();
      setNow(current);
      if (!firedRef.current && Number.isFinite(deadline) && current >= deadline) {
        firedRef.current = true;
        onExpireRef.current();
      }
    }
    // Ilk kontrol hemen (sure zaten dolmussa beklemeden teslim), sonra her saniye.
    const first = window.setTimeout(tick, 0);
    const interval = window.setInterval(tick, 1000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(interval);
    };
  }, [deadline]);

  const remaining = Number.isFinite(deadline) ? Math.max(0, deadline - now) : 0;
  const urgent = remaining <= LAST_MINUTES_MS;

  return (
    <div
      role="timer"
      aria-label={t.imat.mock.timeLeft}
      className={`flex min-w-0 items-center gap-2 ${urgent ? "text-[var(--editorial-terracotta-ink)]" : "text-[var(--editorial-ink)]"}`}
    >
      <Clock className="h-4 w-4 shrink-0" strokeWidth={1.9} aria-hidden="true" />
      <div className="flex min-w-0 flex-col leading-tight">
        <span className="truncate text-[10px] font-semibold uppercase tracking-[0.16em] text-current opacity-80">
          {urgent ? t.imat.mock.lastMinutes : t.imat.mock.timeLeft}
        </span>
        <span className="font-mono text-lg font-semibold tabular-nums">{formatRemaining(remaining)}</span>
      </div>
    </div>
  );
}
