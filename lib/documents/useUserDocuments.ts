"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useUser } from "@clerk/nextjs";
import {
  DOCUMENT_CATEGORY_ORDER,
  resolveCategoryKey,
  type DocumentCategoryKey,
} from "@/lib/documents/categories";
import { documentExtensionFor, documentRecordName } from "@/lib/documents/limits";
import {
  useUserSupabaseClient,
  withUserDataTimeout,
  type UserSupabaseClient,
} from "@/lib/useUserSupabaseClient";
import type { UserDocument } from "@/types";

// Imzali link yalniz "Goruntule"ye basilinca ve kisa omurlu uretilir: paylasilan
// bilgisayarda tarayici gecmisinde kalan link bir iki dakikada gecersizlesir.
export const SIGNED_URL_EXPIRES_IN_SECONDS = 90;

export interface DocumentGroup {
  key: DocumentCategoryKey;
  docs: UserDocument[];
}

export interface UseUserDocuments {
  groups: DocumentGroup[];
  flatDocs: UserDocument[];
  loading: boolean;
  /** Liste yuklenemedi (bos cuzdan degil); reload ile tekrar denenir. */
  loadError: boolean;
  uploading: boolean;
  upload: (file: File, category: DocumentCategoryKey) => Promise<void>;
  remove: (id: string, storagePath: string) => Promise<void>;
  reload: () => Promise<void>;
  /** Belge icin kisa omurlu imzali link uretir. */
  createViewUrl: (storagePath: string) => Promise<string>;
}

export function useUserDocuments(): UseUserDocuments {
  const { user, isLoaded } = useUser();
  const userId = user?.id;
  const getClient = useUserSupabaseClient();
  const [flatDocs, setFlatDocs] = useState<UserDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fetchSequence = useRef(0);

  const fetchDocs = useCallback(async () => {
    if (!isLoaded) return;
    const sequence = ++fetchSequence.current;
    const isCurrent = () => sequence === fetchSequence.current;
    if (!userId) {
      setFlatDocs([]);
      setLoadError(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(false);
    try {
      const supabase = await getClient();
      const { data, error } = await supabase
        .from("user_documents")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      if (isCurrent()) setFlatDocs((data ?? []) as UserDocument[]);
    } catch (err) {
      console.error("Belge listeleme hatası:", err);
      if (isCurrent()) {
        setFlatDocs([]);
        setLoadError(true);
      }
    } finally {
      if (isCurrent()) setLoading(false);
    }
  }, [getClient, isLoaded, userId]);

  useEffect(() => {
    void fetchDocs();
    return () => {
      // Kullanici degisirse veya sayfa kapanirsa eski cevap yazilmasin.
      fetchSequence.current += 1;
    };
  }, [fetchDocs]);

  const createViewUrl = useCallback(
    async (storagePath: string) => {
      const supabase = await getClient();
      const { data, error } = await withUserDataTimeout(
        supabase.storage.from("documents").createSignedUrl(storagePath, SIGNED_URL_EXPIRES_IN_SECONDS),
      );
      if (error) throw error;
      if (!data?.signedUrl) throw new Error("signed_url_missing");
      return data.signedUrl;
    },
    [getClient],
  );

  const upload = useCallback(
    async (file: File, category: DocumentCategoryKey) => {
      if (!userId) return;
      const ext = documentExtensionFor(file.type);
      if (!ext) throw new Error("unsupported_document_type");
      setUploading(true);
      const filePath = `${userId}/${Date.now()}.${ext}`;
      let inStorage = false;
      let rowCreated = false;
      let supabase: UserSupabaseClient | null = null;
      try {
        supabase = await getClient();
        // cacheControl "0": tarayici veya ara onbellek belge icerigini saklamasin.
        const { error: storageError } = await supabase.storage
          .from("documents")
          .upload(filePath, file, { cacheControl: "0" });
        if (storageError) throw storageError;
        inStorage = true;
        const { error: dbError } = await supabase.from("user_documents").insert({
          user_id: userId,
          file_name: documentRecordName(file.name),
          file_url: filePath,
          storage_path: filePath,
          category,
        });
        if (dbError) throw dbError;
        rowCreated = true;
        await fetchDocs();
      } catch (err) {
        if (supabase && inStorage && !rowCreated) {
          const { error: cleanupError } = await supabase.storage
            .from("documents")
            .remove([filePath]);
          if (cleanupError) console.error("Yükleme sonrası temizleme hatası:", cleanupError);
        }
        throw err;
      } finally {
        setUploading(false);
      }
    },
    [getClient, userId, fetchDocs],
  );

  const remove = useCallback(
    async (id: string, storagePath: string) => {
      const supabase = await getClient();
      const { error: storageError } = await withUserDataTimeout(
        supabase.storage.from("documents").remove([storagePath]),
      );
      if (storageError) throw storageError;
      const { error: dbError } = await supabase.from("user_documents").delete().eq("id", id);
      if (dbError) throw dbError;
      setFlatDocs((prev) => prev.filter((d) => d.id !== id));
    },
    [getClient],
  );

  const groups = useMemo<DocumentGroup[]>(
    () =>
      DOCUMENT_CATEGORY_ORDER.map((key) => ({
        key,
        docs: flatDocs.filter((d) => resolveCategoryKey(d.category) === key),
      })).filter((g) => g.docs.length > 0),
    [flatDocs],
  );

  return {
    groups,
    flatDocs,
    loading,
    loadError,
    uploading,
    upload,
    remove,
    reload: fetchDocs,
    createViewUrl,
  };
}
