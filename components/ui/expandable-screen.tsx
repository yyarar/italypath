"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

type ExpandableScreenContextValue = {
  isExpanded: boolean;
  expand: () => void;
  collapse: () => void;
  layoutId: string;
  triggerRadius: string;
  contentRadius: string;
  animationDuration: number;
};

type ExpandableScreenProps = {
  children: React.ReactNode;
  layoutId?: string;
  triggerRadius?: string;
  contentRadius?: string;
  animationDuration?: number;
  defaultExpanded?: boolean;
  onExpandChange?: (expanded: boolean) => void;
  lockScroll?: boolean;
};

type ExpandableScreenTriggerProps = {
  children: React.ReactNode;
  className?: string;
};

type ExpandableScreenContentProps = {
  children: React.ReactNode;
  className?: string;
  showCloseButton?: boolean;
  closeButtonClassName?: string;
};

type ExpandableScreenBackgroundProps = {
  trigger?: React.ReactNode;
  content?: React.ReactNode;
  className?: string;
};

const ExpandableScreenContext = createContext<ExpandableScreenContextValue | null>(null);

export function useExpandableScreen() {
  const context = useContext(ExpandableScreenContext);
  if (!context) {
    throw new Error("useExpandableScreen must be used within ExpandableScreen");
  }
  return context;
}

export function ExpandableScreen({
  children,
  layoutId = "expandable-card",
  triggerRadius = "100px",
  contentRadius = "24px",
  animationDuration = 0.3,
  defaultExpanded = false,
  onExpandChange,
  lockScroll = true,
}: ExpandableScreenProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  useEffect(() => {
    setIsExpanded(defaultExpanded);
  }, [defaultExpanded]);

  useEffect(() => {
    onExpandChange?.(isExpanded);
  }, [isExpanded, onExpandChange]);

  useEffect(() => {
    if (!lockScroll || !isExpanded) return;

    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
    };
  }, [isExpanded, lockScroll]);

  useEffect(() => {
    if (!isExpanded) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsExpanded(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isExpanded]);

  const expand = useCallback(() => setIsExpanded(true), []);
  const collapse = useCallback(() => setIsExpanded(false), []);

  const contextValue = useMemo<ExpandableScreenContextValue>(
    () => ({
      isExpanded,
      expand,
      collapse,
      layoutId,
      triggerRadius,
      contentRadius,
      animationDuration,
    }),
    [isExpanded, expand, collapse, layoutId, triggerRadius, contentRadius, animationDuration]
  );

  return (
    <ExpandableScreenContext.Provider value={contextValue}>
      {children}
    </ExpandableScreenContext.Provider>
  );
}

export function ExpandableScreenTrigger({ children, className }: ExpandableScreenTriggerProps) {
  const { isExpanded, expand, layoutId, triggerRadius, animationDuration } = useExpandableScreen();

  return (
    <AnimatePresence initial={false}>
      {!isExpanded && (
        <motion.div
          layoutId={layoutId}
          style={{ borderRadius: triggerRadius }}
          initial={{ opacity: 0, scale: 0.985 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.99 }}
          transition={{ duration: animationDuration, ease: [0.22, 1, 0.36, 1] }}
          className={cn("transform-gpu will-change-transform", className)}
          onClick={expand}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function ExpandableScreenContent({
  children,
  className,
  showCloseButton = true,
  closeButtonClassName,
}: ExpandableScreenContentProps) {
  const { isExpanded, collapse, layoutId, contentRadius, animationDuration } = useExpandableScreen();

  return (
    <AnimatePresence initial={false}>
      {isExpanded && (
        <motion.div
          layoutId={layoutId}
          style={{ borderRadius: contentRadius }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: animationDuration, ease: [0.22, 1, 0.36, 1] }}
          className={cn("relative transform-gpu will-change-transform", className)}
        >
          {showCloseButton && (
            <button
              type="button"
              aria-label="Close expanded screen"
              onClick={collapse}
              className={cn(
                "absolute right-4 top-4 z-40 inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/35 text-white transition hover:bg-black/50",
                closeButtonClassName
              )}
            >
              <span aria-hidden>×</span>
            </button>
          )}
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function ExpandableScreenBackground({
  trigger,
  content,
  className,
}: ExpandableScreenBackgroundProps) {
  const { isExpanded } = useExpandableScreen();

  return <div className={className}>{isExpanded ? content : trigger}</div>;
}
