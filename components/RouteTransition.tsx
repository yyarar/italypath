"use client";

import { AnimatePresence, LayoutGroup, LazyMotion, domAnimation, m, useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";

export default function RouteTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const shouldReduceMotion = useReducedMotion();
  const isSharedLayoutDetailRoute = /^\/universities\/[^/]+(\/departments\/[^/]+)?$/.test(pathname);

  const initial = isSharedLayoutDetailRoute
    ? { opacity: 1, y: 0 }
    : shouldReduceMotion
      ? { opacity: 0 }
      : { opacity: 0, y: 10 };
  const animate = isSharedLayoutDetailRoute
    ? { opacity: 1, y: 0 }
    : shouldReduceMotion
      ? { opacity: 1 }
      : { opacity: 1, y: 0 };
  const exit = isSharedLayoutDetailRoute
    ? { opacity: 1, y: 0 }
    : shouldReduceMotion
      ? { opacity: 0 }
      : { opacity: 0, y: -6 };
  const transition = shouldReduceMotion
    ? { duration: 0.12, ease: "easeOut" as const }
    : {
      duration: 0.24,
      ease: [0.22, 1, 0.36, 1] as const
    };

  // Tum sitede framer-motion'in yalniz domAnimation ozellikleri yuklenir; bilesenler `motion` yerine `m`
  // kullanir (strict: gelistirmede `motion` kullanimi hata verir). layout/layoutId gereken yerler
  // components/motion/LayoutMotion.tsx ile sarilir. AnimatePresence initial={false} KALIR (ilk HTML gorunur).
  return (
    <LazyMotion features={domAnimation} strict>
      <LayoutGroup id="route-shared-elements">
        <AnimatePresence mode="popLayout" initial={false}>
          <m.div
            key={pathname}
            initial={initial}
            animate={animate}
            exit={exit}
            transition={transition}
            className="will-change-transform"
          >
            {children}
          </m.div>
        </AnimatePresence>
      </LayoutGroup>
    </LazyMotion>
  );
}
