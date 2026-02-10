"use client";

import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";

export default function Template({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -20, opacity: 0 }}
        transition={{ 
          ease: "easeInOut", 
          duration: 0.4,
          type: "spring",
          stiffness: 260,
          damping: 20 
        }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}