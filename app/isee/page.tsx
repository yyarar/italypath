"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/context/LanguageContext'; // Dil context'ini ekledik
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function ISEEPage() {
  const { t } = useLanguage(); // t nesnesini aldık
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
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto mb-6">
        <Link href="/" className="inline-flex items-center text-slate-500 hover:text-blue-600 transition font-medium">
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t.list.backHome}
        </Link>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md mx-auto bg-white rounded-3xl shadow-xl overflow-hidden p-8 border border-slate-100"
      >
        <h1 className="text-2xl font-bold text-slate-900 mb-2 text-center">{t.isee.title}</h1>
        <p className="text-slate-500 text-sm text-center mb-8">{t.isee.subtitle}</p>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t.isee.incomeLabel}</label>
            <input
              type="number"
              onChange={(e) => setIncome(Number(e.target.value))}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t.isee.assetsLabel}</label>
            <input
              type="number"
              onChange={(e) => setAssets(Number(e.target.value))}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t.isee.familyLabel}</label>
            <select
              value={familyMembers}
              onChange={(e) => setFamilyMembers(Number(e.target.value))}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition bg-white"
            >
              {[1, 2, 3, 4, 5, 6].map((num) => (
                <option key={num} value={num}>{num} {t.isee.person}</option>
              ))}
            </select>
          </div>

          <button
            onClick={calculateISEE}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition duration-200 shadow-lg shadow-blue-200"
          >
            {t.isee.calculateBtn}
          </button>

          {result !== null && (
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="mt-8 p-6 bg-blue-50 rounded-2xl border border-blue-100 text-center">
              <span className="text-blue-600 text-sm font-semibold uppercase tracking-wider">{t.isee.resultTitle}</span>
              <div className="text-4xl font-black text-blue-900 mt-1">€{result.toLocaleString('tr-TR')}</div>
              <p className="text-xs text-blue-400 mt-4 leading-relaxed">{t.isee.disclaimer}</p>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}