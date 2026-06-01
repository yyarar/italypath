"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { createClerkSupabaseClient } from "@/lib/supabaseClient";
import { advanceStageIfBefore } from "@/lib/hub/useHubStage";
import {
  DOCUMENT_CATEGORY_ORDER,
  resolveCategoryKey,
  type DocumentCategoryKey,
} from "@/lib/documents/categories";
import type { UserDocument } from "@/types";

const SIGNED_URL_EXPIRES_IN_SECONDS = 60 * 10;

export interface DocumentGroup {
  key: DocumentCategoryKey;
  docs: UserDocument[];
}

export interface UseUserDocuments {
  groups: DocumentGroup[];
  flatDocs: UserDocument[];
  loading: boolean;
  uploading: boolean;
  upload: (file: File, category: DocumentCategoryKey) => Promise<void>;
  remove: (id: string, storagePath: string) => Promise<void>;
  reload: () => Promise<void>;
}

export function useUserDocuments(): UseUserDocuments {
  const { user } = useUser();
  const { getToken } = useAuth();
  const [flatDocs, setFlatDocs] = useState<UserDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const supabase = useMemo(
    () =>
      createClerkSupabaseClient(async () => {
        try {
          return await getToken({ template: "supabase" });
        } catch {
          return null;
        }
      }),
    [getToken],
  );

  const fetchDocs = useCallback(async () => {
    if (!user?.id) {
      setFlatDocs([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("user_documents")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("Belge listeleme hatası:", error);
      setFlatDocs([]);
      setLoading(false);
      return;
    }
    const rows = (data ?? []) as UserDocument[];
    if (!rows.length) {
      setFlatDocs([]);
      setLoading(false);
      return;
    }
    const paths = rows.map((d) => d.storage_path);
    const { data: signed, error: signedError } = await supabase.storage
      .from("documents")
      .createSignedUrls(paths, SIGNED_URL_EXPIRES_IN_SECONDS);
    if (signedError) console.error("İmzalı URL hatası:", signedError);
    const byPath = new Map((signed ?? []).map((s) => [s.path, s.signedUrl ?? undefined]));
    setFlatDocs(rows.map((d) => ({ ...d, signed_url: byPath.get(d.storage_path) })));
    setLoading(false);
  }, [supabase, user?.id]);

  useEffect(() => {
    void fetchDocs();
  }, [fetchDocs]);

  const upload = useCallback(
    async (file: File, category: DocumentCategoryKey) => {
      if (!user?.id) return;
      setUploading(true);
      const ext = file.name.split(".").pop();
      const filePath = `${user.id}/${Date.now()}.${ext}`;
      let inStorage = false;
      let rowCreated = false;
      try {
        const { error: storageError } = await supabase.storage
          .from("documents")
          .upload(filePath, file);
        if (storageError) throw storageError;
        inStorage = true;
        const { error: dbError } = await supabase.from("user_documents").insert({
          user_id: user.id,
          file_name: file.name,
          file_url: filePath,
          storage_path: filePath,
          category,
        });
        if (dbError) throw dbError;
        rowCreated = true;
        advanceStageIfBefore("documents");
        await fetchDocs();
      } catch (err) {
        if (inStorage && !rowCreated) {
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
    [supabase, user?.id, fetchDocs],
  );

  const remove = useCallback(
    async (id: string, storagePath: string) => {
      const { error: storageError } = await supabase.storage
        .from("documents")
        .remove([storagePath]);
      if (storageError) throw storageError;
      const { error: dbError } = await supabase.from("user_documents").delete().eq("id", id);
      if (dbError) throw dbError;
      setFlatDocs((prev) => prev.filter((d) => d.id !== id));
    },
    [supabase],
  );

  const groups = useMemo<DocumentGroup[]>(
    () =>
      DOCUMENT_CATEGORY_ORDER.map((key) => ({
        key,
        docs: flatDocs.filter((d) => resolveCategoryKey(d.category) === key),
      })).filter((g) => g.docs.length > 0),
    [flatDocs],
  );

  return { groups, flatDocs, loading, uploading, upload, remove, reload: fetchDocs };
}
