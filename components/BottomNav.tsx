"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, School, Bot, User, BookOpen } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { motion } from 'framer-motion'; // Animasyon için

export default function BottomNav() {
  const pathname = usePathname();
  const { t } = useLanguage();

  const isActive = (path: string) => pathname === path;

  // Navigasyon elemanlarını bir diziye alalım (Daha temiz kod ve animasyon yönetimi için)
  const navItems = [
    { href: '/', icon: Home, label: 'Home' }, // Burayı ileride t('home') yapabilirsin
    { href: '/universities', icon: School, label: 'Unis' },
    { href: '/ai-mentor', icon: Bot, label: 'AI', isCenter: true },
    { href: '/quiz', icon: BookOpen, label: 'Quiz' },
    { href: '/profile', icon: User, label: 'Profile', disabled: true },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 w-full bg-white/80 backdrop-blur-lg border-t border-slate-200 z-50 pb-[env(safe-area-inset-bottom)]">
      <div className="flex justify-around items-end h-16 px-2 relative">
        
        {navItems.map((item) => {
          const ActiveIcon = item.icon;
          const active = isActive(item.href);

          if (item.isCenter) {
            return (
              <Link key={item.href} href={item.href} className="relative -top-6 z-10">
                <motion.div 
                  whileTap={{ scale: 0.9 }}
                  whileHover={{ scale: 1.05 }}
                  className={`w-14 h-14 rounded-full flex items-center justify-center shadow-xl border-4 border-slate-50 transition-colors ${active ? 'bg-blue-600 text-white' : 'bg-slate-900 text-white'}`}
                >
                  <Bot className="w-7 h-7" />
                </motion.div>
                {/* Aktifse altında bir parlama efekti */}
                {active && (
                  <motion.div 
                    layoutId="activeGlow"
                    className="absolute -inset-1 bg-blue-500/30 blur-lg rounded-full -z-10"
                  />
                )}
              </Link>
            );
          }

          return (
            <Link 
              key={item.href} 
              href={item.disabled ? '#' : item.href} 
              className={`flex flex-col items-center justify-center w-full pb-2 transition-all ${item.disabled ? 'opacity-30 cursor-not-allowed' : 'active:scale-90'}`}
            >
              <div className="relative">
                <ActiveIcon className={`w-6 h-6 mb-0.5 transition-colors ${active ? 'text-blue-600' : 'text-slate-400'}`} />
                
                {/* Aktif Sekme Göstergesi (Minik Nokta) */}
                {active && (
                  <motion.div 
                    layoutId="activeTab"
                    className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-blue-600 rounded-full"
                  />
                )}
              </div>
              <span className={`text-[10px] font-semibold transition-colors ${active ? 'text-blue-600' : 'text-slate-500'}`}>
                {item.label}
              </span>
            </Link>
          );
        })}

      </div>
    </nav>
  );
}