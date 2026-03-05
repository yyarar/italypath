"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/context/LanguageContext';
import { ArrowLeft, Calculator, Sparkles } from 'lucide-react';
import Link from 'next/link';

export default function ISEEPage() {
  const { t } = useLanguage();
  const [income, setIncome] = useState<number>(0);
  const [assets, setAssets] = useState<number>(0);
  const [familyMembers, setFamilyMembers] = useState<number>(1);
  const [result, setResult] = useState<number | null>(null);

  const calculateISEE = () => {
    const scaleFactors: { [key: number]: number } = { 1: 1.00, 2: 1.57, 3: 2.04, 4: 2.46, 5: 2.85 };
    const factor = scaleFactors[familyMembers] || (2.85 + (familyMembers - 5) * 0.35);
    const iseeValue = (income + (assets * 0.20)) / factor;
    setResult(Math.round(iseeValue));
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-lg mx-auto mb-6">
        <Link href="/" className="inline-flex items-center text-slate-400 hover:text-indigo-600 transition font-semibold text-sm gap-1.5 px-3 py-1.5 rounded-full hover:bg-indigo-50">
          <ArrowLeft className="w-4 h-4" />
          {t.list.backHome}
        </Link>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 100, damping: 20 }}
        className="max-w-lg mx-auto"
      >
        {/* Header card */}
        <div className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-3xl p-8 mb-5 shadow-2xl shadow-indigo-600/25 relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-40 h-40 rounded-full bg-white/10 blur-2xl pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-11 h-11 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <Calculator className="w-5 h-5 text-white" />
              </div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                <span className="text-white/70 text-xs font-bold uppercase tracking-widest">ISEE Hesaplayıcı</span>
              </div>
            </div>
            <h1 className="text-2xl font-extrabold tracking-tighter text-white mb-1">{t.isee.title}</h1>
            <p className="text-blue-200 text-sm leading-relaxed">{t.isee.subtitle}</p>
          </div>
        </div>

        {/* Form card */}
        <div className="glass rounded-3xl p-7 border border-white/50 shadow-xl shadow-slate-200/40">
          <div className="space-y-5">

            {/* Floating label — Income */}
            <div className="float-field">
              <input
                type="number"
                id="income"
                placeholder=" "
                onChange={(e) => setIncome(Number(e.target.value))}
                className="w-full px-4 py-5 rounded-2xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-400 transition-all text-slate-900 text-base sm:text-sm"
              />
              <label htmlFor="income">{t.isee.incomeLabel}</label>
            </div>

            {/* Floating label — Assets */}
            <div className="float-field">
              <input
                type="number"
                id="assets"
                placeholder=" "
                onChange={(e) => setAssets(Number(e.target.value))}
                className="w-full px-4 py-5 rounded-2xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-400 transition-all text-slate-900 text-base sm:text-sm"
              />
              <label htmlFor="assets">{t.isee.assetsLabel}</label>
            </div>

            {/* Family members */}
            <div className="float-field">
              <select
                id="family"
                value={familyMembers}
                onChange={(e) => setFamilyMembers(Number(e.target.value))}
                className="w-full px-4 py-5 rounded-2xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-400 transition-all text-slate-900 text-base sm:text-sm appearance-none"
              >
                {[1, 2, 3, 4, 5, 6].map((num) => (
                  <option key={num} value={num}>{num} {t.isee.person}</option>
                ))}
              </select>
              <label htmlFor="family">{t.isee.familyLabel}</label>
            </div>

            {/* Calculate button */}
            <motion.button
              onClick={calculateISEE}
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl transition-all shadow-xl shadow-indigo-600/25"
            >
              {t.isee.calculateBtn}
            </motion.button>

            {/* Result */}
            <AnimatePresence>
              {result !== null && (
                <motion.div
                  initial={{ scale: 0.92, opacity: 0, y: 12 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 200, damping: 22 }}
                  className="relative overflow-hidden bg-gradient-to-br from-indigo-50 to-blue-50 rounded-3xl border border-indigo-100 p-7 text-center"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-100/40 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none" />
                  <p className="text-indigo-500 text-xs font-bold uppercase tracking-widest mb-2">{t.isee.resultTitle}</p>
                  <motion.div
                    initial={{ scale: 0.5 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.1 }}
                    className="text-5xl font-black text-indigo-900 my-2"
                  >
                    €{result.toLocaleString('tr-TR')}
                  </motion.div>
                  <p className="text-xs text-indigo-400 mt-4 leading-relaxed max-w-xs mx-auto">{t.isee.disclaimer}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
