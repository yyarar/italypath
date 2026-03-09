'use client';

import Link from 'next/link';
import { ArrowRight, Compass, Landmark } from 'lucide-react';
import { motion } from 'framer-motion';

import { useLanguage } from '@/context/LanguageContext';

export default function ScholarshipsSection() {
  const { t } = useLanguage();

  return (
    <section className="bg-white pb-20 pt-0 lg:pb-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ type: 'spring', stiffness: 100, damping: 20 }}
          className="relative overflow-hidden rounded-[2.5rem] border border-slate-200/70 bg-white p-8 shadow-xl shadow-slate-200/50 sm:p-10 lg:p-12"
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(59,130,246,0.13),transparent_45%),radial-gradient(circle_at_85%_10%,rgba(14,165,233,0.14),transparent_48%),radial-gradient(circle_at_60%_85%,rgba(16,185,129,0.12),transparent_45%)]" />
          <div className="pointer-events-none absolute -left-10 top-1/2 h-28 w-28 -translate-y-1/2 rounded-full bg-sky-200/40 blur-2xl" />
          <div className="pointer-events-none absolute -right-6 bottom-0 h-24 w-24 rounded-full bg-emerald-200/30 blur-xl" />

          <div className="relative z-10 flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <p className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-white">
                <Compass className="h-3.5 w-3.5" />
                {t.homeScholarshipsCta.badge}
              </p>

              <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
                {t.homeScholarshipsCta.title}
              </h2>

              <p className="mt-4 text-sm leading-relaxed text-slate-600 sm:text-base">
                {t.homeScholarshipsCta.description}
              </p>

              <p className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-amber-100 px-3 py-2 text-xs font-semibold text-amber-900">
                <Landmark className="h-3.5 w-3.5" />
                {t.homeScholarshipsCta.note}
              </p>
            </div>

            <Link
              href="/scholarships"
              className="group inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-7 py-4 text-center text-sm font-black text-white transition hover:bg-slate-800 sm:w-auto"
            >
              {t.homeScholarshipsCta.button}
              <motion.span
                initial={{ x: 0 }}
                whileHover={{ x: 3 }}
                transition={{ type: 'spring', stiffness: 350, damping: 24 }}
              >
                <ArrowRight className="h-4 w-4" />
              </motion.span>
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
