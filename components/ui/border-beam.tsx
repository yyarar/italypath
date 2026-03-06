"use client";

import React from "react";
import { motion, type Transition, useReducedMotion } from "framer-motion";

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
  const shouldReduceMotion = useReducedMotion();
  const path = `rect(0 auto auto 0 round ${anchor}px)`;
  const staticOffset = reverse ? `${100 - initialOffset}%` : `${initialOffset}%`;
  const beamStyle: CssVars = {
    width: size,
    offsetPath: path,
    WebkitOffsetPath: path,
    "--color-from": colorFrom,
    "--color-to": colorTo,
    ...style,
  };

  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 rounded-[inherit] border border-transparent [mask-clip:padding-box,border-box] [mask-composite:intersect] [mask-image:linear-gradient(transparent,transparent),linear-gradient(white,white)]",
        className
      )}
      style={{ borderWidth }}
    >
      {shouldReduceMotion ? (
        <div
          className="absolute aspect-square rounded-full bg-gradient-to-l from-[var(--color-from)] via-[var(--color-from)] to-transparent opacity-90 blur-[1px]"
          style={{
            ...beamStyle,
            ["offsetDistance" as string]: staticOffset,
            ["WebkitOffsetDistance" as string]: staticOffset,
          }}
        />
      ) : (
        <motion.div
          className="absolute aspect-square rounded-full bg-gradient-to-l from-[var(--color-from)] via-[var(--color-from)] to-transparent opacity-90 blur-[1px]"
          style={beamStyle}
          initial={{
            offsetDistance: reverse ? `${100 - initialOffset}%` : `${initialOffset}%`,
          }}
          animate={{
            offsetDistance: reverse
              ? [`${100 - initialOffset}%`, `${-initialOffset}%`]
              : [`${initialOffset}%`, `${100 + initialOffset}%`],
          }}
          transition={{
            repeat: Infinity,
            ease: "linear",
            duration,
            delay,
            ...(transition ?? {}),
          }}
        />
      )}
    </div>
  );
}
