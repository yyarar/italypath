"use client";

import { useState } from "react";
import { UserButton, useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { Globe2 } from "lucide-react";
import { useMotionValueEvent, useScroll } from "framer-motion";

import { useLanguage } from "@/context/LanguageContext";
import { CONSULT_PAGE_PATH } from "@/lib/consultation";

interface NavbarProps {
  homeFloating?: boolean;
}

export default function Navbar({ homeFloating = false }: NavbarProps) {
  const { t, toggleLanguage, language } = useLanguage();
  // SignedIn/SignedOut yerine acik kontrol (denetim O3#3): Clerk yuklenirken isSignedIn undefined'dir ve
  // iki dugme de gizli kalir (giris dugmesi yanip sonmez); SignedIn/SignedOut eski Pages Router kodunu da
  // ana sayfa paketine cekiyordu.
  const { isSignedIn } = useAuth();
  const showSignedOut = isSignedIn === false;
  const showSignedIn = isSignedIn === true;
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
    { href: CONSULT_PAGE_PATH, label: t.navbar.consultation },
    { href: aiMentorHref, label: t.navbar.mentor },
  ];

  useMotionValueEvent(scrollY, "change", (latest) => {
    setScrolled(latest > 16);
  });

  return (
    <nav
      aria-label={language === "tr" ? "Ana navigasyon" : "Main navigation"}
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
            className="font-serif text-2xl font-semibold tracking-[-0.02em] text-[var(--editorial-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--editorial-sage)]"
          >
            ItalyPath
          </Link>

          <div className="hidden items-center gap-1 md:flex">
            {desktopItems.map((item) => (
              <Link
                key={`${item.href}-${item.label}`}
                href={item.href}
                className="home-pressable inline-flex min-h-10 items-center rounded-full px-3 py-2 text-sm font-medium text-[var(--editorial-muted)] hover:bg-white/55 hover:text-[var(--editorial-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)]"
              >
                {item.label}
              </Link>
            ))}

            <div className="mx-3 h-5 w-px bg-[var(--editorial-border)]" />

            <button
              onClick={toggleLanguage}
              aria-label={language === "tr" ? "Switch to English" : "Türkçeye Geç"}
              className="home-pressable inline-flex min-h-10 items-center gap-1.5 rounded-full border border-[var(--editorial-border)] bg-white/45 px-3 py-2 text-xs font-semibold text-[var(--editorial-ink)] hover:border-[var(--editorial-sage)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)]"
            >
              <Globe2 className="h-3.5 w-3.5" />
              {language === "tr" ? "EN" : "TR"}
            </button>

            {showSignedOut && (
              <Link href="/giris">
                <span
                  className="home-pressable ml-2 inline-flex min-h-10 cursor-pointer items-center rounded-full border border-[var(--editorial-sage)] bg-[var(--editorial-sage)] px-4 py-2 text-sm font-semibold text-white shadow-[0_5px_16px_rgba(31,79,70,0.2)] hover:bg-[#173d36]"
                >
                  {t.navbar.login}
                </span>
              </Link>
            )}

            {showSignedIn && (
              <div className="ml-2 flex items-center gap-3">
                <span className="text-sm font-medium text-[var(--editorial-muted)]">{t.navbar.profile}</span>
                <UserButton afterSignOutUrl="/" />
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 md:hidden">
            <button
              onClick={toggleLanguage}
              aria-label={language === "tr" ? "Switch to English" : "Türkçeye Geç"}
              className="home-pressable inline-flex min-h-10 items-center gap-1 rounded-full border border-[var(--editorial-border)] bg-white/45 px-3 py-1.5 text-xs font-semibold text-[var(--editorial-ink)]"
            >
              <Globe2 className="h-3 w-3" />
              {language === "tr" ? "EN" : "TR"}
            </button>

            {showSignedOut && (
              <Link
                href="/giris"
                className="home-pressable inline-flex min-h-10 items-center rounded-full border border-[var(--editorial-sage)] bg-[var(--editorial-sage)] px-3 py-1.5 text-xs font-semibold text-white"
              >
                {t.navbar.login}
              </Link>
            )}
            {showSignedIn && (
              <>
                <Link
                  href="/hub"
                  className="home-pressable inline-flex min-h-10 items-center rounded-full border border-[var(--editorial-border)] px-3 py-1.5 text-xs font-semibold text-[var(--editorial-ink)]"
                >
                  {t.navbar.hub}
                </Link>
                <Link
                  href="/sat"
                  className="home-pressable inline-flex min-h-10 items-center rounded-full border border-[var(--editorial-border)] px-3 py-1.5 text-xs font-semibold text-[var(--editorial-ink)]"
                >
                  {t.navbar.sat}
                </Link>
                <UserButton afterSignOutUrl="/" />
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
