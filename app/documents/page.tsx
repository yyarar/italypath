"use client";

import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { supabase } from '@/lib/supabaseClient';
import { Upload, FileText, Camera, Trash2, Loader2, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function DocumentsPage() {
  const { user } = useUser();
  const [uploading, setUploading] = useState(false);
  const [docs, setDocs] = useState<any[]>([]);

  // 1. Kayıtlı belgeleri çek
  const fetchDocs = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('user_documents')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (data) setDocs(data);
  };

  useEffect(() => { fetchDocs(); }, [user]);

  // 2. Dosya Yükle (Scan & Save)
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${Math.random()}.${fileExt}`;

    // A. Storage'a Yükle
    const { data: storageData, error: storageError } = await supabase.storage
      .from('documents')
      .upload(fileName, file);

      if (storageError) {
        console.error("Supabase Storage Hatası:", storageError);
        alert(`Hata: ${storageError.message}`); // Örn: "New row violates row-level security policy"
        setUploading(false);
        return;
      }

    // B. Public URL Al
    const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(fileName);

    // C. Veritabanına Kaydet
    await supabase.from('user_documents').insert({
      user_id: user.id,
      file_name: file.name,
      file_url: publicUrl
    });

    fetchDocs();
    setUploading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24 font-sans">
      <header className="p-6 bg-white border-b sticky top-0 z-10">
        <h1 className="text-2xl font-black text-slate-900">Belgelerim</h1>
        <p className="text-xs text-slate-500 font-medium">İtalya evraklarını güvenle sakla.</p>
      </header>

      <div className="p-4 max-w-2xl mx-auto space-y-6">
        {/* SCAN / UPLOAD BUTTON */}
        <div className="relative overflow-hidden bg-blue-600 rounded-[2rem] p-8 text-white shadow-xl shadow-blue-600/20">
          <input 
            type="file" 
            accept="image/*,application/pdf"
            capture="environment" 
            onChange={handleUpload}
            className="absolute inset-0 opacity-0 cursor-pointer z-20"
            disabled={uploading}
          />
          <div className="flex flex-col items-center justify-center text-center">
            {uploading ? (
              <Loader2 className="w-12 h-12 animate-spin mb-2" />
            ) : (
              <Camera className="w-12 h-12 mb-2" />
            )}
            <span className="text-lg font-bold">Yeni Belge Tara</span>
            <p className="text-blue-100 text-xs opacity-80">Kamerayı açar ve dosyayı kaydeder</p>
          </div>
        </div>

        {/* BELGE LİSTESİ */}
        <div className="space-y-3">
          <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Kayıtlı Evraklar</h2>
          <AnimatePresence>
            {docs.map((doc) => (
              <motion.div 
                key={doc.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center border">
                    <FileText className="text-blue-600 w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 line-clamp-1">{doc.file_name}</h3>
                    <a href={doc.file_url} target="_blank" className="text-[10px] text-blue-500 font-bold hover:underline">GÖRÜNTÜLE</a>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}