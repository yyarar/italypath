"use client";

import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";

export default function RouteTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const shouldReduceMotion = useReducedMotion();

  const initial = shouldReduceMotion
    ? { opacity: 0 }
    : { opacity: 0, y: 10 };
  const animate = shouldReduceMotion
    ? { opacity: 1 }
    : { opacity: 1, y: 0 };
  const exit = shouldReduceMotion
    ? { opacity: 0 }
    : { opacity: 0, y: -6 };
  const transition = shouldReduceMotion
    ? { duration: 0.12, ease: "easeOut" as const }
    : {
      duration: 0.24,
      ease: [0.22, 1, 0.36, 1] as const
    };

  return (
    <LayoutGroup id="route-shared-elements">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={pathname}
          initial={initial}
          animate={animate}
          exit={exit}
          transition={transition}
          className="will-change-transform"
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </LayoutGroup>
  );
}
