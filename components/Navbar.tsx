"use client";

import { useState } from "react";
import { SignInButton, SignedIn, SignedOut, UserButton, useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { Globe2 } from "lucide-react";
import { motion, useMotionValueEvent, useScroll } from "framer-motion";

import { useLanguage } from "@/context/LanguageContext";

export default function Navbar() {
  const { t, toggleLanguage, language } = useLanguage();
  const { isSignedIn } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const { scrollY } = useScroll();
  const aiMentorHref = isSignedIn ? "/ai-mentor" : "/sign-in?redirect_url=%2Fai-mentor";
  const desktopItems = [
    { href: "/universities", label: t.navbar.universities },
    { href: "/cities", label: t.navbar.cities },
    { href: "/scholarships", label: language === "tr" ? "Burslar" : "Scholarships" },
    { href: "/communities", label: t.navbar.communities },
    ...(isSignedIn ? [{ href: "/hub", label: t.navbar.hub }] : []),
    { href: aiMentorHref, label: t.navbar.mentor },
  ];

  useMotionValueEvent(scrollY, "change", (latest) => {
    setScrolled(latest > 16);
  });

  return (
    <motion.nav
      aria-label="Ana Navigasyon"
      className="fixed inset-x-0 top-0 z-50 border-b border-[var(--editorial-border)] bg-[rgba(248,247,241,0.92)] transition-shadow duration-300"
      style={{
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        boxShadow: scrolled ? "0 10px 28px rgba(21,32,28,0.06)" : "none",
      }}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
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
                className="px-3 py-2 text-sm font-medium text-[var(--editorial-muted)] transition hover:text-[var(--editorial-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)]"
              >
                {item.label}
              </Link>
            ))}

            <div className="mx-3 h-5 w-px bg-[var(--editorial-border)]" />

            <button
              onClick={toggleLanguage}
              aria-label={language === "tr" ? "Switch to English" : "Türkçeye Geç"}
              className="inline-flex items-center gap-1.5 border border-[var(--editorial-border)] bg-transparent px-3 py-2 text-xs font-semibold text-[var(--editorial-ink)] transition hover:border-[var(--editorial-sage)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)]"
            >
              <Globe2 className="h-3.5 w-3.5" />
              {language === "tr" ? "EN" : "TR"}
            </button>

            <SignedOut>
              <SignInButton mode="modal">
                <motion.span
                  whileHover={{ y: -1 }}
                  whileTap={{ y: 0 }}
                  transition={{ type: "spring", stiffness: 420, damping: 28 }}
                  className="ml-2 inline-flex cursor-pointer items-center border border-[var(--editorial-sage)] bg-[var(--editorial-sage)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#173d36]"
                >
                  {t.navbar.login}
                </motion.span>
              </SignInButton>
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
              className="inline-flex items-center gap-1 border border-[var(--editorial-border)] px-2.5 py-1.5 text-[11px] font-semibold text-[var(--editorial-ink)]"
            >
              <Globe2 className="h-3 w-3" />
              {language === "tr" ? "EN" : "TR"}
            </button>

            <SignedOut>
              <SignInButton mode="modal">
                <span className="inline-flex border border-[var(--editorial-sage)] bg-[var(--editorial-sage)] px-3 py-1.5 text-[11px] font-semibold text-white">
                  {t.navbar.login}
                </span>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <Link
                href="/hub"
                className="border border-[var(--editorial-border)] px-3 py-1.5 text-[11px] font-semibold text-[var(--editorial-ink)]"
              >
                {t.navbar.hub}
              </Link>
              <UserButton afterSignOutUrl="/" />
            </SignedIn>
          </div>
        </div>
      </div>
    </motion.nav>
  );
}
