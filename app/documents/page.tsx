"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth, useUser } from '@clerk/nextjs';
import { createClerkSupabaseClient } from '@/lib/supabaseClient';
import Link from 'next/link';
import { FileText, Camera, Trash2, Loader2, ExternalLink, Lightbulb, ArrowLeft, UploadCloud } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/context/LanguageContext';
import type { UserDocument } from '@/types';

const CHECKLIST_KEYS = ['emptyStep1', 'emptyStep2', 'emptyStep3', 'emptyStep4'] as const;
const SIGNED_URL_EXPIRES_IN_SECONDS = 60 * 10;

export default function DocumentsPage() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const { t } = useLanguage();
  const [uploading, setUploading] = useState(false);
  const [docs, setDocs] = useState<UserDocument[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const supabase = useMemo(
    () => createClerkSupabaseClient(async () => {
      try { return await getToken({ template: 'supabase' }); }
      catch { return null; }
    }),
    [getToken]
  );

  const fetchDocs = useCallback(async () => {
    if (!user?.id) { setDocs([]); return; }

    const { data, error } = await supabase
      .from('user_documents').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    if (error) throw error;

    const rawDocs = (data ?? []) as UserDocument[];
    if (!rawDocs.length) { setDocs([]); return; }

    const storagePaths = rawDocs.map((doc) => doc.storage_path);
    const { data: signedData, error: signedError } = await supabase.storage
      .from('documents').createSignedUrls(storagePaths, SIGNED_URL_EXPIRES_IN_SECONDS);
    if (signedError) throw signedError;

    const signedUrlByPath = new Map((signedData ?? []).map((item) => [item.path, item.signedUrl ?? undefined]));
    setDocs(rawDocs.map((doc) => ({ ...doc, signed_url: signedUrlByPath.get(doc.storage_path) })));
  }, [supabase, user?.id]);

  useEffect(() => {
    void fetchDocs().catch((error: unknown) => { console.error('Belge yükleme hatası:', error); setDocs([]); });
  }, [fetchDocs]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const MAX_FILE_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) { alert(t.documents.fileSizeError); return; }
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') { alert(t.documents.fileTypeError); return; }

    setUploading(true);
    const fileExt = file.name.split('.').pop();
    const filePath = `${user.id}/${Date.now()}.${fileExt}`;
    let uploadedToStorage = false;
    let documentRowCreated = false;

    try {
      const { error: storageError } = await supabase.storage.from('documents').upload(filePath, file);
      if (storageError) throw storageError;
      uploadedToStorage = true;

      const { error: dbError } = await supabase.from('user_documents').insert({
        user_id: user.id, file_name: file.name, file_url: filePath, storage_path: filePath
      });
      if (dbError) throw dbError;
      documentRowCreated = true;
      await fetchDocs();
    } catch (error: unknown) {
      if (uploadedToStorage && !documentRowCreated) {
        const { error: cleanupError } = await supabase.storage.from('documents').remove([filePath]);
        if (cleanupError) console.error('Yükleme sonrası temizleme hatası:', cleanupError);
      }
      const message = error instanceof Error ? error.message : 'Beklenmeyen bir hata oluştu.';
      alert(`Hata: ${message}`);
    } finally {
      setUploading(false);
    }
  };

  const deleteDoc = async (id: string, storagePath: string) => {
    if (!confirm(t.documents.deleteConfirm)) return;
    try {
      const { error: storageError } = await supabase.storage.from('documents').remove([storagePath]);
      if (storageError) throw storageError;
      const { error: dbError } = await supabase.from('user_documents').delete().eq('id', id);
      if (dbError) throw dbError;
      setDocs(prev => prev.filter(d => d.id !== id));
    } catch (error) {
      console.error('Belge silme hatası:', error);
      alert(t.documents.deleteFail);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-32 font-sans">
      {/* Header */}
      <header className="px-5 pt-5 pb-4 bg-white/85 backdrop-blur-md border-b border-slate-100 sticky top-0 z-30 shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <Link
          href="/"
          className="inline-flex items-center text-slate-400 hover:text-indigo-600 transition font-semibold text-sm gap-1.5 mb-3 px-2 py-1 rounded-full hover:bg-indigo-50"
          aria-label={t.list.backHome}
        >
          <ArrowLeft className="w-4 h-4" />
          {t.list.backHome}
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/25">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">{t.documents.title}</h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{t.documents.subtitle}</p>
          </div>
        </div>
      </header>

      <div className="p-4 max-w-2xl mx-auto space-y-6">

        {/* Upload buttons */}
        <div className="grid grid-cols-2 gap-4">
          {/* Camera button */}
          <motion.div
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="relative overflow-hidden h-36 rounded-3xl shadow-xl shadow-indigo-600/20 flex flex-col items-center justify-center text-white group"
            style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)' }}
          >
            <input
              type="file" accept="image/*" capture="environment"
              onChange={handleUpload}
              className="absolute inset-0 opacity-0 cursor-pointer z-20"
              disabled={uploading}
            />
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-6 -mt-6 blur-xl pointer-events-none" />
            <Camera className="w-8 h-8 mb-2 relative z-10 group-hover:scale-110 transition-transform" />
            <span className="text-sm font-black uppercase tracking-tighter relative z-10">{t.documents.scan}</span>
          </motion.div>

          {/* Gallery button — drag and drop style */}
          <motion.div
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={() => setIsDragging(false)}
            className={`relative overflow-hidden h-36 rounded-3xl flex flex-col items-center justify-center transition-all border-2 border-dashed group ${isDragging
              ? 'border-indigo-400 bg-indigo-50'
              : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/40'
              }`}
          >
            <input
              type="file" accept="image/*,application/pdf"
              onChange={handleUpload}
              className="absolute inset-0 opacity-0 cursor-pointer z-20"
              disabled={uploading}
            />
            <UploadCloud className={`w-8 h-8 mb-2 transition-colors ${isDragging ? 'text-indigo-500' : 'text-slate-300 group-hover:text-indigo-400'}`} />
            <span className={`text-sm font-black uppercase tracking-tighter transition-colors ${isDragging ? 'text-indigo-600' : 'text-slate-400 group-hover:text-indigo-500'}`}>
              {t.documents.upload}
            </span>
            <span className={`text-[10px] font-medium transition-colors mt-1 ${isDragging ? 'text-indigo-400' : 'text-slate-300 group-hover:text-slate-400'}`}>
              PDF / IMG
            </span>
          </motion.div>
        </div>

        <AnimatePresence>
          {uploading && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center justify-center gap-2 text-indigo-600 font-bold text-sm"
            >
              <Loader2 className="animate-spin" size={16} />
              {t.documents.uploading}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Document list */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
              {t.documents.savedDocs} ({docs.length})
            </h2>
          </div>

          <div className="space-y-2.5">
            <AnimatePresence>
              {docs.map((doc) => (
                <motion.div
                  key={doc.id}
                  initial={{ opacity: 0, scale: 0.95, x: 10 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20, scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between group hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-3.5 overflow-hidden">
                    <div className="w-11 h-11 bg-indigo-50 rounded-2xl flex items-center justify-center border border-indigo-100 shrink-0">
                      <FileText className="text-indigo-500 w-5 h-5" />
                    </div>
                    <div className="overflow-hidden">
                      <h3 className="text-sm font-bold text-slate-800 truncate pr-4">{doc.file_name}</h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        {doc.signed_url ? (
                          <a href={doc.signed_url} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1 text-[10px] font-bold text-indigo-500 hover:text-indigo-700 transition-colors">
                            <ExternalLink size={9} />
                            {t.documents.view}
                          </a>
                        ) : (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-slate-300">
                            <ExternalLink size={9} />
                            {t.documents.view}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <motion.button
                    onClick={() => deleteDoc(doc.id, doc.storage_path)}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                    className="p-2.5 text-slate-200 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"
                  >
                    <Trash2 size={16} />
                  </motion.button>
                </motion.div>
              ))}
            </AnimatePresence>

            {docs.length === 0 && !uploading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="py-8"
              >
                <div className="flex justify-center mb-5">
                  <div className="w-20 h-20 bg-gradient-to-br from-indigo-100 via-blue-50 to-sky-100 rounded-full flex items-center justify-center shadow-lg shadow-indigo-200/40">
                    <FileText className="w-9 h-9 text-indigo-400" />
                  </div>
                </div>

                <h2 className="text-lg font-black text-slate-800 text-center mb-1">{t.documents.emptyTitle}</h2>
                <p className="text-sm text-slate-500 text-center mb-7 max-w-xs mx-auto">{t.documents.emptySubtitle}</p>

                <div className="space-y-2.5 max-w-xs mx-auto mb-6">
                  {CHECKLIST_KEYS.map((key, i) => (
                    <motion.div
                      key={key}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.25 + i * 0.1, type: "spring", stiffness: 100, damping: 20 }}
                      className="flex items-center gap-3 bg-white rounded-2xl px-4 py-3 border border-slate-100 shadow-sm"
                    >
                      <div className="w-5 h-5 rounded-full border-2 border-slate-200 shrink-0" />
                      <span className="text-sm text-slate-600 font-medium">{t.documents[key]}</span>
                    </motion.div>
                  ))}
                </div>

                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7, type: "spring", stiffness: 100, damping: 20 }}
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
