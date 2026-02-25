"use client";

import { useState, useEffect } from "react";
import { motion, useScroll, useSpring } from "framer-motion";

/**
 * Sayfanın üstünde ince bir scroll ilerleme çubuğu gösterir.
 * Kullanıcı sayfada aşağı kaydırdıkça çubuk dolar.
 */
export default function ScrollProgress() {
    const { scrollYProgress } = useScroll();
    const scaleX = useSpring(scrollYProgress, { stiffness: 200, damping: 30, restDelta: 0.001 });
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const unsubscribe = scrollYProgress.on("change", (v) => {
            setVisible(v > 0.02);
        });
        return () => unsubscribe();
    }, [scrollYProgress]);

    if (!visible) return null;

    return (
        <motion.div
            style={{ scaleX, transformOrigin: "left" }}
            className="fixed top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-indigo-500 via-blue-500 to-sky-400 z-50"
        />
    );
}
