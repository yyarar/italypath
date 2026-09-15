"use client";

import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";

import { useLanguage } from "@/context/LanguageContext";
import { CONSULT_ANCHOR } from "@/lib/consultation";

// Yalnızca mobil: hero geçilince görünür, ön görüşme bölümü ekrandayken gizlenir.
export default function MobileConsultBar() {
  const { t } = useLanguage();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const pastHero = window.scrollY > window.innerHeight * 0.8;
      const section = document.getElementById(CONSULT_ANCHOR)?.getBoundingClientRect();
      const consultOnScreen = section ? section.top < window.innerHeight && section.bottom > 0 : false;
      setVisible(pastHero && !consultOnScreen);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div
      aria-hidden={!visible}
      className={`fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] transition-[opacity,transform] duration-300 md:hidden ${
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"
      }`}
    >
      <a
        href={`#${CONSULT_ANCHOR}`}
        tabIndex={visible ? 0 : -1}
        className="flex min-h-12 items-center justify-center gap-2 rounded-full bg-[var(--editorial-terracotta)] text-sm font-semibold text-white shadow-[0_14px_36px_rgba(21,32,28,0.28)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-terracotta)]"
      >
        <MessageCircle className="h-4 w-4" aria-hidden="true" />
        {t.consultation.barCta}
      </a>
    </div>
  );
}
