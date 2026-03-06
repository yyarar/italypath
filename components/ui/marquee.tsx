"use client";

import React from "react";
import { useReducedMotion } from "framer-motion";

type MarqueeProps = {
  children: React.ReactNode;
  className?: string;
  reverse?: boolean;
  pauseOnHover?: boolean;
  vertical?: boolean;
  repeat?: number;
  duration?: number;
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function Marquee({
  children,
  className,
  reverse = false,
  pauseOnHover = false,
  vertical = false,
  repeat = 2,
  duration = 30,
}: MarqueeProps) {
  const shouldReduceMotion = useReducedMotion();
  const copies = Math.max(2, repeat);
  const baseStyle = {
    ["--duration" as string]: `${duration}s`,
    ["--gap" as string]: "0.75rem",
  } as React.CSSProperties;

  if (shouldReduceMotion) {
    return (
      <div
        className={cn(
          "relative flex overflow-hidden",
          vertical ? "flex-col gap-2" : "flex-row gap-2",
          className
        )}
      >
        {children}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group relative flex overflow-hidden",
        vertical ? "flex-col" : "flex-row",
        className
      )}
      style={baseStyle}
      aria-hidden
    >
      {Array.from({ length: copies }).map((_, index) => (
        <div
          key={index}
          className={cn(
            "flex shrink-0 gap-[var(--gap)] [min-width:max-content] will-change-transform",
            vertical
              ? "animate-marquee-y flex-col [min-height:max-content]"
              : "animate-marquee-x flex-row",
            pauseOnHover && "group-hover:[animation-play-state:paused]"
          )}
          style={
            reverse
              ? ({ animationDirection: "reverse" } as React.CSSProperties)
              : undefined
          }
        >
          {children}
        </div>
      ))}
    </div>
  );
}
