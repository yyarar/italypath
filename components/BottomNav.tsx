"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, School, Bot, User } from 'lucide-react';
import { useAuth } from '@clerk/nextjs';
import { useLanguage } from '@/context/LanguageContext';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

export default function BottomNav() {
  const pathname = usePathname();
  const { isSignedIn } = useAuth();
  const { t } = useLanguage();
  const shouldReduceMotion = useReducedMotion();
  const aiMentorHref = isSignedIn
    ? '/ai-mentor'
    : '/sign-in?redirect_url=%2Fai-mentor';

  const isActive = (path: string) => pathname === path;

  const navItems = [
    { href: '/', icon: Home, label: t.bottomNav.home },
    { href: '/universities', icon: School, label: t.bottomNav.unis },
    { href: aiMentorHref, icon: Bot, label: t.bottomNav.ai, isCenter: true },
    { href: '/profile', icon: User, label: t.bottomNav.profile, disabled: true },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 w-full z-50 pb-[env(safe-area-inset-bottom)]">
      {/* Frosted glass bar */}
      <div
        className="mx-3 mb-3 rounded-3xl flex justify-around items-end h-16 px-2 relative"
        style={{
          background: 'rgba(255,255,255,0.88)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          boxShadow: '0 -1px 0 rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.08)',
          border: '1px solid rgba(255,255,255,0.6)',
        }}
      >
        {navItems.map((item) => {
          const NavIcon = item.icon;
          const active = isActive(item.href);

          if (item.isCenter) {
            return (
              <Link key={item.href} href={item.href} className="relative -top-7 z-10">
                <motion.div
                  whileTap={shouldReduceMotion ? undefined : { scale: 0.88 }}
                  whileHover={shouldReduceMotion ? undefined : { scale: 1.05 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  className="relative flex items-center justify-center"
                >
                  {/* Outer glow ring (always subtle, stronger when active) */}
                  <div
                    className="absolute inset-0 rounded-full blur-md"
                    style={{
                      background: active
                        ? 'rgba(99,102,241,0.35)'
                        : 'rgba(99,102,241,0.15)',
                      transform: 'scale(1.2)',
                    }}
                  />
                  {/* Pulse ring */}
                  <AnimatePresence>
                    {active && (
                      shouldReduceMotion ? (
                        <div className="absolute inset-0 rounded-full border-2 border-indigo-400/60 opacity-70" />
                      ) : (
                        <motion.div
                          key="pulse"
                          className="absolute inset-0 rounded-full border-2 border-indigo-400/60"
                          initial={{ scale: 1, opacity: 0.7 }}
                          animate={{ scale: 1.5, opacity: 0 }}
                          transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
                        />
                      )
                    )}
                  </AnimatePresence>
                  {/* Main button */}
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center border-4 border-white relative"
                    style={{
                      background: active
                        ? 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)'
                        : 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
                      boxShadow: active
                        ? '0 8px 24px rgba(99,102,241,0.45)'
                        : '0 6px 16px rgba(0,0,0,0.25)',
                    }}
                  >
                    <Bot className="w-6 h-6 text-white" />
                  </div>
                </motion.div>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.disabled ? '#' : item.href}
              className={`flex flex-col items-center justify-center flex-1 pb-2 h-full transition-all ${item.disabled ? 'opacity-25 cursor-not-allowed' : ''}`}
            >
              <motion.div
                whileTap={shouldReduceMotion ? undefined : { scale: 0.85 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className="relative flex flex-col items-center"
              >
                {/* Active pill indicator */}
                <AnimatePresence>
                  {active && (
                    <motion.div
                      layoutId="activeNavPill"
                      className="absolute -top-2 left-1/2 -translate-x-1/2 w-5 h-1 rounded-full bg-indigo-600"
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 20 }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                </AnimatePresence>
                <NavIcon className={`w-6 h-6 mb-1 transition-colors ${active ? 'text-indigo-600' : 'text-slate-400'}`} />
                <span className={`text-[10px] font-bold transition-colors ${active ? 'text-indigo-600' : 'text-slate-400'}`}>
                  {item.label}
                </span>
              </motion.div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
