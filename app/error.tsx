"use client";

import { useEffect } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';

interface ErrorProps {
    error: Error & { digest?: string };
    reset: () => void;
}

export default function GlobalError({ error, reset }: ErrorProps) {
    const { language } = useLanguage();

    useEffect(() => {
        console.error('[ItalyPath Error]', error);
    }, [error]);

    const tr = {
        title: 'Bir şeyler ters gitti',
        desc: 'Beklenmedik bir hata oluştu. Lütfen tekrar deneyin veya ana sayfaya dönün.',
        retry: 'Tekrar Dene',
        home: 'Ana Sayfa',
    };
    const en = {
        title: 'Something went wrong',
        desc: 'An unexpected error occurred. Please try again or return to the home page.',
        retry: 'Try Again',
        home: 'Home',
    };

    const copy = language === 'tr' ? tr : en;

    return (
        <div className="min-h-screen bg-white font-sans flex items-center justify-center px-4">
            <div className="text-center max-w-md">
                <div className="flex justify-center mb-6">
                    <div className="w-20 h-20 bg-red-50 rounded-2xl flex items-center justify-center">
                        <AlertTriangle className="w-10 h-10 text-red-500" />
                    </div>
                </div>
                <h1 className="text-2xl font-extrabold text-slate-900 mb-3">{copy.title}</h1>
                <p className="text-slate-500 leading-relaxed mb-8">{copy.desc}</p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                        onClick={reset}
                        className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-600/20"
                    >
                        <RefreshCw className="w-4 h-4" />
                        {copy.retry}
                    </button>
                    <Link
                        href="/"
                        className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition"
                    >
                        <Home className="w-4 h-4" />
                        {copy.home}
                    </Link>
                </div>
            </div>
        </div>
    );
}
