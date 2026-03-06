"use client";

import React from "react";
import { type Transition, useReducedMotion } from "framer-motion";

export type BorderBeamProps = {
  size?: number;
  duration?: number;
  anchor?: number;
  borderWidth?: number;
  colorFrom?: string;
  colorTo?: string;
  delay?: number;
  className?: string;
  style?: React.CSSProperties;
  reverse?: boolean;
  initialOffset?: number;
  transition?: Transition;
};

type CssVars = React.CSSProperties & {
  "--color-from"?: string;
  "--color-to"?: string;
  WebkitOffsetPath?: string;
  WebkitOffsetDistance?: string;
  WebkitMaskImage?: string;
  WebkitMaskClip?: string;
  WebkitMaskComposite?: string;
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function BorderBeam({
  size = 100,
  duration = 8,
  anchor = 24,
  colorFrom = "#fb923c",
  colorTo = "#f97316",
  className,
  borderWidth = 1,
  style,
  delay = 0,
  reverse = false,
  initialOffset = 0,
  transition,
}: BorderBeamProps) {
  const shouldReduceMotion = useReducedMotion() ?? false;
  const normalizedOffset = Math.max(0, Math.min(100, initialOffset));
  const resolvedDuration =
    typeof transition?.duration === "number" ? transition.duration : duration;
  const resolvedDelay =
    typeof transition?.delay === "number" ? transition.delay : delay;
  const phase = reverse ? 100 - normalizedOffset : normalizedOffset;
  const offsetPosition = `${phase}%`;
  const phaseShiftDelay = resolvedDelay - (resolvedDuration * phase) / 100;
  const path = `rect(0 auto auto 0 round ${anchor}px)`;
  const maskImage =
    "linear-gradient(transparent,transparent),linear-gradient(white,white)";

  const beamStyle: CssVars = {
    width: size,
    offsetPath: path,
    WebkitOffsetPath: path,
    animationDuration: `${resolvedDuration}s`,
    animationDelay: `${phaseShiftDelay}s`,
    animationDirection: reverse ? "reverse" : "normal",
    "--color-from": colorFrom,
    "--color-to": colorTo,
    ...style,
  };

  const reducedBeamStyle: CssVars = {
    ...beamStyle,
    animation: "none",
    offsetDistance: offsetPosition,
    WebkitOffsetDistance: offsetPosition,
  };

  const animatedBeamStyle: CssVars = {
    ...beamStyle,
    offsetDistance: "0%",
    WebkitOffsetDistance: "0%",
  };

  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 rounded-[inherit] border border-transparent",
        className
      )}
      style={{
        borderWidth,
        maskImage,
        maskClip: "padding-box,border-box",
        maskComposite: "intersect",
        WebkitMaskImage: maskImage,
        WebkitMaskClip: "padding-box,border-box",
        WebkitMaskComposite: "source-in",
      }}
    >
      {shouldReduceMotion ? (
        <div
          className="absolute aspect-square rounded-full bg-gradient-to-l from-[var(--color-from)] via-[var(--color-from)] to-transparent opacity-90 blur-[1px]"
          style={reducedBeamStyle}
        />
      ) : (
        <div
          className={cn(
            "absolute aspect-square rounded-full bg-gradient-to-l from-[var(--color-from)] via-[var(--color-from)] to-transparent opacity-90 blur-[1px] animate-border-beam"
          )}
          style={animatedBeamStyle}
        />
      )}
    </div>
  );
}
