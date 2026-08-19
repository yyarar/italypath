"use client";

import { useState } from "react";
import { SignedIn, SignedOut, UserButton, useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { Globe2 } from "lucide-react";
import { motion, useMotionValueEvent, useScroll } from "framer-motion";

import { useLanguage } from "@/context/LanguageContext";

interface NavbarProps {
  homeFloating?: boolean;
}

export default function Navbar({ homeFloating = false }: NavbarProps) {
  const { t, toggleLanguage, language } = useLanguage();
  const { isSignedIn } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const { scrollY } = useScroll();
  const aiMentorHref = isSignedIn ? "/ai-mentor" : "/giris?redirect_url=%2Fai-mentor";
  const desktopItems = [
    { href: "/universities", label: t.navbar.universities },
    { href: "/cities", label: t.navbar.cities },
    { href: "/scholarships", label: language === "tr" ? "Burslar" : "Scholarships" },
    { href: "/communities", label: t.navbar.communities },
    ...(isSignedIn ? [{ href: "/hub", label: t.navbar.hub }] : []),
    ...(isSignedIn ? [{ href: "/sat", label: t.navbar.sat }] : []),
    { href: aiMentorHref, label: t.navbar.mentor },
  ];

  useMotionValueEvent(scrollY, "change", (latest) => {
    setScrolled(latest > 16);
  });

  return (
    <motion.nav
      aria-label="Ana Navigasyon"
      className={`fixed inset-x-0 top-0 z-50 transition-shadow duration-300 ${
        homeFloating
          ? "px-2 pt-2 sm:px-4 sm:pt-3"
          : "border-b border-[var(--editorial-border)] bg-[rgba(248,247,241,0.92)]"
      }`}
      style={{
        backdropFilter: homeFloating ? undefined : "blur(12px)",
        WebkitBackdropFilter: homeFloating ? undefined : "blur(12px)",
        boxShadow: !homeFloating && scrolled ? "0 10px 28px rgba(21,32,28,0.06)" : "none",
      }}
    >
      <div
        className={`mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 ${
          homeFloating
            ? `home-material rounded-[1.35rem] transition-shadow duration-300 ${
                scrolled ? "shadow-[0_14px_42px_rgba(21,32,28,0.12)]" : "shadow-[0_8px_30px_rgba(21,32,28,0.07)]"
              }`
            : ""
        }`}
      >
        <div className="flex h-16 items-center justify-between">
          <Link
            href="/"
            className="font-serif text-2xl font-medium tracking-[-0.02em] text-[var(--editorial-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--editorial-sage)]"
          >
            ItalyPath
          </Link>

          <div className="hidden items-center gap-1 md:flex">
            {desktopItems.map((item) => (
              <Link
                key={`${item.href}-${item.label}`}
                href={item.href}
                className="home-pressable rounded-full px-3 py-2 text-sm font-medium text-[var(--editorial-muted)] transition hover:bg-white/55 hover:text-[var(--editorial-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)]"
              >
                {item.label}
              </Link>
            ))}

            <div className="mx-3 h-5 w-px bg-[var(--editorial-border)]" />

            <button
              onClick={toggleLanguage}
              aria-label={language === "tr" ? "Switch to English" : "Türkçeye Geç"}
              className="home-pressable inline-flex items-center gap-1.5 rounded-full border border-[var(--editorial-border)] bg-white/45 px-3 py-2 text-xs font-semibold text-[var(--editorial-ink)] transition hover:border-[var(--editorial-sage)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)]"
            >
              <Globe2 className="h-3.5 w-3.5" />
              {language === "tr" ? "EN" : "TR"}
            </button>

            <SignedOut>
              <Link href="/giris">
                <motion.span
                  whileHover={{ y: -1 }}
                  whileTap={{ y: 0 }}
                  transition={{ type: "spring", stiffness: 420, damping: 28 }}
                  className="ml-2 inline-flex cursor-pointer items-center rounded-full border border-[var(--editorial-sage)] bg-[var(--editorial-sage)] px-4 py-2 text-sm font-semibold text-white shadow-[0_5px_16px_rgba(31,79,70,0.2)] transition hover:bg-[#173d36]"
                >
                  {t.navbar.login}
                </motion.span>
              </Link>
            </SignedOut>

            <SignedIn>
              <div className="ml-2 flex items-center gap-3">
                <span className="text-sm font-medium text-[var(--editorial-muted)]">{t.navbar.profile}</span>
                <UserButton afterSignOutUrl="/" />
              </div>
            </SignedIn>
          </div>

          <div className="flex items-center gap-2 md:hidden">
            <button
              onClick={toggleLanguage}
              aria-label={language === "tr" ? "Switch to English" : "Türkçeye Geç"}
              className="home-pressable inline-flex items-center gap-1 rounded-full border border-[var(--editorial-border)] bg-white/45 px-2.5 py-1.5 text-[11px] font-semibold text-[var(--editorial-ink)]"
            >
              <Globe2 className="h-3 w-3" />
              {language === "tr" ? "EN" : "TR"}
            </button>

            <SignedOut>
              <Link
                href="/giris"
                className="home-pressable inline-flex rounded-full border border-[var(--editorial-sage)] bg-[var(--editorial-sage)] px-3 py-1.5 text-[11px] font-semibold text-white"
              >
                {t.navbar.login}
              </Link>
            </SignedOut>
            <SignedIn>
              <Link
                href="/hub"
                className="border border-[var(--editorial-border)] px-3 py-1.5 text-[11px] font-semibold text-[var(--editorial-ink)]"
              >
                {t.navbar.hub}
              </Link>
              <Link
                href="/sat"
                className="border border-[var(--editorial-border)] px-3 py-1.5 text-[11px] font-semibold text-[var(--editorial-ink)]"
              >
                {t.navbar.sat}
              </Link>
              <UserButton afterSignOutUrl="/" />
            </SignedIn>
          </div>
        </div>
      </div>
    </motion.nav>
  );
}
