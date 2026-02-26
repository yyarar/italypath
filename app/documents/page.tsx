"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import { FileText, Camera, Trash2, Loader2, Image as ImageIcon, ExternalLink, Lightbulb, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/context/LanguageContext';
import type { UserDocument } from '@/types';

const CHECKLIST_KEYS = ['emptyStep1', 'emptyStep2', 'emptyStep3', 'emptyStep4'] as const;

export default function DocumentsPage() {
  const { user } = useUser();
  const { t } = useLanguage();
  const [uploading, setUploading] = useState(false);
  const [docs, setDocs] = useState<UserDocument[]>([]);

  // 1. Belgeleri Veritabanından Çek
  const fetchDocs = useCallback(async () => {
    if (!user?.id) return;

    const { data } = await supabase
      .from('user_documents')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (data) setDocs(data as UserDocument[]);
  }, [user?.id]);

  useEffect(() => {
    void fetchDocs();
  }, [fetchDocs]);

  // 2. Belge Yükleme (Kamera veya Galeri)
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    const fileExt = file.name.split('.').pop();
    const filePath = `${user.id}/${Date.now()}.${fileExt}`;

    try {
      const { error: storageError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (storageError) throw storageError;

      const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(filePath);

      const { error: dbError } = await supabase.from('user_documents').insert({
        user_id: user.id,
        file_name: file.name,
        file_url: publicUrl,
        storage_path: filePath
      });

      if (dbError) throw dbError;

      await fetchDocs();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Beklenmeyen bir hata oluştu.';
      alert(`Hata: ${message}`);
    } finally {
      setUploading(false);
    }
  };

  // 3. Belge Silme
  const deleteDoc = async (id: string, storagePath: string) => {
    if (!confirm(t.documents.deleteConfirm)) return;

    try {
      await supabase.storage.from('documents').remove([storagePath]);
      await supabase.from('user_documents').delete().eq('id', id);
      setDocs(prev => prev.filter(d => d.id !== id));
    } catch {
      alert(t.documents.deleteFail);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFCFB] pb-32 font-sans">
      <header className="p-6 bg-white/80 backdrop-blur-md border-b sticky top-0 z-30">
        <Link
          href="/"
          className="inline-flex items-center text-slate-500 hover:text-blue-600 transition font-medium mb-3"
          aria-label={t.list.backHome}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t.list.backHome}
        </Link>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">{t.documents.title}</h1>
        <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest mt-1">{t.documents.subtitle}</p>
      </header>

      <div className="p-4 max-w-2xl mx-auto space-y-8">

        {/* ACTION BUTTONS (SCAN & UPLOAD) */}
        <div className="grid grid-cols-2 gap-4">
          {/* TARAMA BUTONU (KAMERA) */}
          <div className="relative overflow-hidden bg-blue-600 h-32 rounded-[2rem] shadow-xl shadow-blue-600/20 flex flex-col items-center justify-center text-white group active:scale-95 transition-transform">
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleUpload}
              className="absolute inset-0 opacity-0 cursor-pointer z-20"
              disabled={uploading}
            />
            <Camera className="w-8 h-8 mb-2 group-hover:scale-110 transition-transform" />
            <span className="text-sm font-black uppercase tracking-tighter">{t.documents.scan}</span>
          </div>

          {/* YÜKLEME BUTONU (GALERİ) */}
          <div className="relative overflow-hidden bg-white border-2 border-slate-100 h-32 rounded-[2rem] flex flex-col items-center justify-center text-slate-600 active:scale-95 transition-transform">
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={handleUpload}
              className="absolute inset-0 opacity-0 cursor-pointer z-20"
              disabled={uploading}
            />
            <ImageIcon className="w-8 h-8 mb-2 text-slate-400" />
            <span className="text-sm font-black uppercase tracking-tighter">{t.documents.upload}</span>
          </div>
        </div>

        {uploading && (
          <div className="flex items-center justify-center gap-2 text-blue-600 font-bold animate-pulse text-sm">
            <Loader2 className="animate-spin" size={18} /> {t.documents.uploading}
          </div>
        )}

        {/* BELGE LİSTESİ */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{t.documents.savedDocs} ({docs.length})</h2>
          </div>

          <div className="grid gap-3">
            <AnimatePresence>
              {docs.map((doc) => (
                <motion.div
                  key={doc.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="bg-white p-4 rounded-[1.5rem] border border-slate-100 shadow-sm flex items-center justify-between group"
                >
                  <div className="flex items-center gap-4 overflow-hidden">
                    <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center border shrink-0">
                      <FileText className="text-blue-600 w-6 h-6" />
                    </div>
                    <div className="overflow-hidden">
                      <h3 className="text-sm font-bold text-slate-800 truncate pr-4">{doc.file_name}</h3>
                      <div className="flex items-center gap-3 mt-1">
                        <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[10px] font-black text-blue-600 hover:text-blue-700">
                          <ExternalLink size={10} /> {t.documents.view}
                        </a>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => deleteDoc(doc.id, doc.storage_path)}
                    className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>

            {docs.length === 0 && !uploading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="py-10"
              >
                {/* Animated Icon */}
                <div className="flex justify-center mb-6">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-100 via-indigo-50 to-sky-100 rounded-full flex items-center justify-center shadow-lg shadow-blue-200/40">
                    <FileText className="w-9 h-9 text-blue-400 animate-pulse" />
                  </div>
                </div>

                {/* Title & Subtitle */}
                <h2 className="text-lg font-black text-slate-800 text-center mb-1">{t.documents.emptyTitle}</h2>
                <p className="text-sm text-slate-500 text-center mb-8 max-w-xs mx-auto">{t.documents.emptySubtitle}</p>

                {/* Document Checklist */}
                <div className="space-y-2.5 max-w-xs mx-auto mb-6">
                  {CHECKLIST_KEYS.map((key, i) => (
                    <motion.div
                      key={key}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.25 + i * 0.1, duration: 0.35 }}
                      className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 border border-slate-100 shadow-sm"
                    >
                      <div className="w-6 h-6 rounded-full border-2 border-slate-200 shrink-0" />
                      <span className="text-sm text-slate-600 font-medium">{t.documents[key]}</span>
                    </motion.div>
                  ))}
                </div>

                {/* Hint Box */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7, duration: 0.4 }}
                  className="flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3.5 max-w-xs mx-auto"
                >
                  <Lightbulb className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-800 font-semibold leading-snug">{t.documents.emptyHint}</p>
                </motion.div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
