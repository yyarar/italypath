"use client";

import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";

export default function RouteTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const shouldReduceMotion = useReducedMotion();

  const initial = shouldReduceMotion
    ? { opacity: 0 }
    : { opacity: 0, y: 20, scale: 0.985, filter: "blur(6px)" };
  const animate = shouldReduceMotion
    ? { opacity: 1 }
    : { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" };
  const exit = shouldReduceMotion
    ? { opacity: 0 }
    : { opacity: 0, y: -12, scale: 0.99, filter: "blur(4px)" };
  const transition = shouldReduceMotion
    ? { duration: 0.14, ease: "easeOut" as const }
    : { duration: 0.42, ease: [0.22, 1, 0.36, 1] as const };

  return (
    <LayoutGroup id="route-shared-elements">
      <AnimatePresence mode="sync" initial={false}>
        <motion.div
          key={pathname}
          initial={initial}
          animate={animate}
          exit={exit}
          transition={transition}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </LayoutGroup>
  );
}
