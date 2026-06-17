"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot, Home, School, UserRound } from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import { motion, useReducedMotion } from "framer-motion";

import { useLanguage } from "@/context/LanguageContext";

export default function BottomNav() {
  const pathname = usePathname();
  const { isSignedIn } = useAuth();
  const { t } = useLanguage();
  const shouldReduceMotion = useReducedMotion();
  const aiMentorHref = isSignedIn ? "/ai-mentor" : "/giris?redirect_url=%2Fai-mentor";
  const hubHref = isSignedIn ? "/hub" : "/giris?redirect_url=%2Fhub";

  const navItems = [
    { href: "/", match: "/", icon: Home, label: t.bottomNav.home },
    { href: "/universities", match: "/universities", icon: School, label: t.bottomNav.unis },
    { href: aiMentorHref, match: "/ai-mentor", icon: Bot, label: t.bottomNav.ai },
    { href: hubHref, match: "/hub", icon: UserRound, label: t.bottomNav.profile },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--editorial-border)] bg-[rgba(248,247,241,0.96)] pb-[env(safe-area-inset-bottom)] md:hidden">
      <div className="grid h-16 grid-cols-4">
        {navItems.map((item) => {
          const NavIcon = item.icon;
          const active = item.match === "/" ? pathname === "/" : pathname.startsWith(item.match);

          return (
            <Link
              key={`${item.href}-${item.label}`}
              href={item.href}
              className="relative flex min-w-0 flex-col items-center justify-center gap-1 px-1 text-[var(--editorial-muted)] transition hover:text-[var(--editorial-ink)]"
              aria-current={active ? "page" : undefined}
            >
              {active && (
                <motion.span
                  layoutId="bottomNavActive"
                  className="absolute top-0 h-0.5 w-9 bg-[var(--editorial-sage)]"
                  transition={shouldReduceMotion ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 34 }}
                />
              )}
              <NavIcon className={`h-5 w-5 ${active ? "text-[var(--editorial-sage)]" : ""}`} />
              <span className={`truncate text-[10px] font-semibold ${active ? "text-[var(--editorial-sage)]" : ""}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
