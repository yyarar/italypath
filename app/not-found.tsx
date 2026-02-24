"use client";

import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import { MapPinOff } from "lucide-react";
import { motion } from "framer-motion";

export default function NotFound() {
    const { t } = useLanguage();

    return (
        <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 text-center">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="flex flex-col items-center max-w-md"
            >
                <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mb-6">
                    <MapPinOff className="w-12 h-12 text-red-500" strokeWidth={1.5} />
                </div>

                <h1 className="text-3xl font-bold text-slate-900 mb-4 tracking-tight">
                    {t.notFound.title}
                </h1>

                <p className="text-slate-500 mb-8 text-lg leading-relaxed">
                    {t.notFound.desc}
                </p>

                <Link
                    href="/"
                    className="inline-flex items-center justify-center px-8 py-3.5 text-base font-semibold text-white bg-slate-900 rounded-xl hover:bg-slate-800 transition-colors shadow-sm active:scale-95 duration-200"
                >
                    {t.notFound.btn}
                </Link>
            </motion.div>
        </div>
    );
}
