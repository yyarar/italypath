"use client";

import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { supabase } from '@/lib/supabaseClient';
import { FileText, Camera, Trash2, Loader2, Plus, Image as ImageIcon, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function DocumentsPage() {
  const { user } = useUser();
  const [uploading, setUploading] = useState(false);
  const [docs, setDocs] = useState<any[]>([]);

  // 1. Belgeleri Veritabanından Çek
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

  // 2. Belge Yükleme (Kamera veya Galeri)
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    const fileExt = file.name.split('.').pop();
    // Dosya ismini benzersiz yapalım (User ID + Zaman damgası)
    const filePath = `${user.id}/${Date.now()}.${fileExt}`;

    try {
      // A. Storage'a Yükle
      const { error: storageError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (storageError) throw storageError;

      // B. Linki Al
      const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(filePath);

      // C. Veritabanına Yaz
      const { error: dbError } = await supabase.from('user_documents').insert({
        user_id: user.id,
        file_name: file.name,
        file_url: publicUrl,
        // İleride silmek için storage yolunu da kaydedelim
        storage_path: filePath 
      });

      if (dbError) throw dbError;

      fetchDocs();
    } catch (error: any) {
      alert(`Hata: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  // 3. Belge Silme
  const deleteDoc = async (id: string, storagePath: string) => {
    if (!confirm("Bu belgeyi silmek istediğine emin misin?")) return;

    try {
      // A. Storage'dan Sil
      await supabase.storage.from('documents').remove([storagePath]);
      
      // B. Veritabanından Sil
      await supabase.from('user_documents').delete().eq('id', id);

      setDocs(prev => prev.filter(d => d.id !== id));
    } catch (error) {
      alert("Silme işlemi başarısız oldu.");
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFCFB] pb-32 font-sans">
      <header className="p-6 bg-white/80 backdrop-blur-md border-b sticky top-0 z-30">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Belge Cüzdanı</h1>
        <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest mt-1">İtalya Yolculuğu Evrakları</p>
      </header>

      <div className="p-4 max-w-2xl mx-auto space-y-8">
        
        {/* ACTION BUTTONS (SCAN & UPLOAD) */}
        <div className="grid grid-cols-2 gap-4">
          {/* TARAMA BUTONU (KAMERA) */}
          <div className="relative overflow-hidden bg-blue-600 h-32 rounded-[2rem] shadow-xl shadow-blue-600/20 flex flex-col items-center justify-center text-white group active:scale-95 transition-transform">
            <input 
              type="file" 
              accept="image/*"
              capture="environment" // BU ÖZELLİK DİREKT KAMERAYI AÇAR 📸
              onChange={handleUpload}
              className="absolute inset-0 opacity-0 cursor-pointer z-20"
              disabled={uploading}
            />
            <Camera className="w-8 h-8 mb-2 group-hover:scale-110 transition-transform" />
            <span className="text-sm font-black uppercase tracking-tighter">Belge Tara</span>
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
            <span className="text-sm font-black uppercase tracking-tighter">Dosya Seç</span>
          </div>
        </div>

        {uploading && (
          <div className="flex items-center justify-center gap-2 text-blue-600 font-bold animate-pulse text-sm">
            <Loader2 className="animate-spin" size={18} /> BELGE ŞİFRELENİYOR VE YÜKLENİYOR...
          </div>
        )}

        {/* BELGE LİSTESİ */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Kayıtlı Belgeler ({docs.length})</h2>
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
                         <a href={doc.file_url} target="_blank" className="flex items-center gap-1 text-[10px] font-black text-blue-600 hover:text-blue-700">
                           <ExternalLink size={10} /> GÖRÜNTÜLE
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
              <div className="text-center py-20 bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-100">
                <p className="text-slate-400 text-sm font-medium">Henüz belge taranmamış.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}