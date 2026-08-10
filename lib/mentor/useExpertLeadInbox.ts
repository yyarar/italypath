"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useUser } from "@clerk/nextjs";

import type { ExpertLeadStatus } from "@/lib/mentor/expertLeads";
import {
  removeExpertLead,
  replaceExpertLead,
  resolveExpertLeadSelection,
  transitionExpertLeadIdentity,
  type ExpertLeadFilter,
  type ExpertLeadIdentityState,
} from "@/lib/mentor/expertLeadInboxState";
import { useMentorSupabaseClient } from "@/lib/mentor/useMentorSupabaseClient";
import type { ExpertLeadRow } from "@/types";

const EXPERT_LEAD_COLUMNS =
  "id,submission_id,full_name,whatsapp_phone,study_level,field_of_interest,target_intake,help_request,status,internal_note,created_at,updated_at";

type ExpertLeadInboxError =
  | "access_check_failed"
  | "load_failed"
  | "status_failed"
  | "note_failed"
  | "delete_failed"
  | null;

export interface UseExpertLeadInboxResult {
  authorized: boolean | null;
  leads: ExpertLeadRow[];
  selectedLead: ExpertLeadRow | null;
  filter: ExpertLeadFilter;
  newCount: number;
  loading: boolean;
  savingStatus: boolean;
  savingNote: boolean;
  deleting: boolean;
  error: ExpertLeadInboxError;
  setFilter: (filter: ExpertLeadFilter) => void;
  selectLead: (id: string | null) => void;
  reload: () => Promise<void>;
  updateStatus: (status: ExpertLeadStatus) => Promise<void>;
  saveNote: (note: string) => Promise<void>;
  deleteLead: () => Promise<void>;
}

interface ExpertLeadRequestScope {
  ownerId: string;
  generation: number;
}

export function useExpertLeadInbox(): UseExpertLeadInboxResult {
  const { user, isLoaded } = useUser();
  const resolvedUserId = isLoaded ? user?.id ?? null : undefined;
  const supabase = useMentorSupabaseClient();

  const mountedRef = useRef(false);
  const identityRef = useRef<ExpertLeadIdentityState>({
    ownerId: null,
    generation: 0,
    authorized: null,
  });
  const leadsRef = useRef<ExpertLeadRow[]>([]);
  const selectedIdRef = useRef<string | null>(null);
  const filterRef = useRef<ExpertLeadFilter>("all");

  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [stateOwnerId, setStateOwnerId] = useState<string | null>(null);
  const [leads, setLeads] = useState<ExpertLeadRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilterState] = useState<ExpertLeadFilter>("all");
  const [loading, setLoading] = useState(true);
  const [savingStatus, setSavingStatus] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<ExpertLeadInboxError>(null);

  const purgeExpertLeadState = useCallback(() => {
    leadsRef.current = [];
    selectedIdRef.current = null;
    setLeads([]);
    setSelectedId(null);
    setSavingStatus(false);
    setSavingNote(false);
    setDeleting(false);
  }, []);

  const captureScope = useCallback((): ExpertLeadRequestScope | null => {
    const { ownerId, generation } = identityRef.current;
    return ownerId ? { ownerId, generation } : null;
  }, []);

  const isScopeCurrent = useCallback((scope: ExpertLeadRequestScope) => {
    const identity = identityRef.current;
    return (
      mountedRef.current &&
      identity.ownerId === scope.ownerId &&
      identity.generation === scope.generation
    );
  }, []);

  const commitRows = useCallback((rows: ExpertLeadRow[]) => {
    leadsRef.current = rows;
    setLeads(rows);
    const nextSelectedId = resolveExpertLeadSelection(
      rows,
      selectedIdRef.current,
      filterRef.current,
    );
    selectedIdRef.current = nextSelectedId;
    setSelectedId(nextSelectedId);
  }, []);

  const reload = useCallback(async () => {
    const scope = captureScope();
    if (!scope) {
      if (resolvedUserId === null) {
        identityRef.current = {
          ...identityRef.current,
          authorized: false,
        };
        setAuthorized(false);
        purgeExpertLeadState();
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    setError(null);
    const { data: staffAccess, error: accessError } = await supabase.rpc(
      "is_active_mentor_staff",
    );
    if (!isScopeCurrent(scope)) return;

    if (accessError) {
      identityRef.current = { ...identityRef.current, authorized: null };
      setAuthorized(null);
      purgeExpertLeadState();
      setError("access_check_failed");
      setLoading(false);
      return;
    }

    if (staffAccess !== true) {
      identityRef.current = { ...identityRef.current, authorized: false };
      setAuthorized(false);
      purgeExpertLeadState();
      setLoading(false);
      return;
    }

    identityRef.current = { ...identityRef.current, authorized: true };
    setAuthorized(true);
    const { data, error: loadError } = await supabase
      .from("expert_leads")
      .select(EXPERT_LEAD_COLUMNS)
      .order("created_at", { ascending: false })
      .returns<ExpertLeadRow[]>();
    if (!isScopeCurrent(scope)) return;

    if (loadError) {
      purgeExpertLeadState();
      setError("load_failed");
      setLoading(false);
      return;
    }

    commitRows(data ?? []);
    setLoading(false);
  }, [
    captureScope,
    commitRows,
    isScopeCurrent,
    purgeExpertLeadState,
    resolvedUserId,
    supabase,
  ]);

  const setFilter = useCallback((nextFilter: ExpertLeadFilter) => {
    filterRef.current = nextFilter;
    setFilterState(nextFilter);
    const nextSelectedId = resolveExpertLeadSelection(
      leadsRef.current,
      selectedIdRef.current,
      nextFilter,
    );
    selectedIdRef.current = nextSelectedId;
    setSelectedId(nextSelectedId);
  }, []);

  const selectLead = useCallback((id: string | null) => {
    const allowed = id
      ? resolveExpertLeadSelection(leadsRef.current, id, filterRef.current)
      : null;
    selectedIdRef.current = allowed;
    setSelectedId(allowed);
  }, []);

  const accessReady =
    resolvedUserId !== undefined &&
    resolvedUserId !== null &&
    stateOwnerId === resolvedUserId &&
    authorized === true;
  const visibleLeads = accessReady ? leads : [];
  const selectedLead = accessReady
    ? visibleLeads.find((lead) => lead.id === selectedId) ?? null
    : null;

  const updateStatus = useCallback(
    async (status: ExpertLeadStatus) => {
      const scope = captureScope();
      const lead = selectedLead;
      if (!scope || !lead || !accessReady) return;

      setSavingStatus(true);
      setError(null);
      const { data, error: updateError } = await supabase
        .from("expert_leads")
        .update({ status })
        .eq("id", lead.id)
        .select(EXPERT_LEAD_COLUMNS)
        .single<ExpertLeadRow>();
      if (!isScopeCurrent(scope)) return;

      if (updateError || !data) {
        setError("status_failed");
        setSavingStatus(false);
        return;
      }

      commitRows(replaceExpertLead(leadsRef.current, data));
      setSavingStatus(false);
    },
    [accessReady, captureScope, commitRows, isScopeCurrent, selectedLead, supabase],
  );

  const saveNote = useCallback(
    async (note: string) => {
      const scope = captureScope();
      const lead = selectedLead;
      const trimmedNote = note.trim();
      if (!scope || !lead || !accessReady) return;
      if (trimmedNote.length > 4000) {
        setError("note_failed");
        return;
      }

      setSavingNote(true);
      setError(null);
      const { data, error: updateError } = await supabase
        .from("expert_leads")
        .update({ internal_note: trimmedNote })
        .eq("id", lead.id)
        .select(EXPERT_LEAD_COLUMNS)
        .single<ExpertLeadRow>();
      if (!isScopeCurrent(scope)) return;

      if (updateError || !data) {
        setError("note_failed");
        setSavingNote(false);
        return;
      }

      commitRows(replaceExpertLead(leadsRef.current, data));
      setSavingNote(false);
    },
    [accessReady, captureScope, commitRows, isScopeCurrent, selectedLead, supabase],
  );

  const deleteLead = useCallback(async () => {
    const scope = captureScope();
    const lead = selectedLead;
    if (!scope || !lead || !accessReady) return;

    setDeleting(true);
    setError(null);
    const { error: deleteError } = await supabase
      .from("expert_leads")
      .delete()
      .eq("id", lead.id);
    if (!isScopeCurrent(scope)) return;

    if (deleteError) {
      setError("delete_failed");
      setDeleting(false);
      return;
    }

    commitRows(removeExpertLead(leadsRef.current, lead.id));
    setDeleting(false);
  }, [accessReady, captureScope, commitRows, isScopeCurrent, selectedLead, supabase]);

  useLayoutEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      identityRef.current = {
        ...identityRef.current,
        generation: identityRef.current.generation + 1,
      };
    };
  }, []);

  useLayoutEffect(() => {
    const nextIdentity = transitionExpertLeadIdentity(
      identityRef.current,
      resolvedUserId,
    );
    if (!nextIdentity.changed) return;

    identityRef.current = {
      ownerId: nextIdentity.ownerId,
      generation: nextIdentity.generation,
      authorized: nextIdentity.authorized,
    };
    setAuthorized(nextIdentity.authorized);
    setStateOwnerId(nextIdentity.ready ? nextIdentity.ownerId : null);
    purgeExpertLeadState();
    setError(null);
    setLoading(nextIdentity.ready && nextIdentity.ownerId !== null);
  }, [purgeExpertLeadState, resolvedUserId]);

  useEffect(() => {
    if (!resolvedUserId) return;
    const identity = identityRef.current;
    if (identity.ownerId !== resolvedUserId || identity.authorized !== null) return;
    const timeout = window.setTimeout(() => {
      void reload();
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [reload, resolvedUserId]);

  return {
    authorized,
    leads: visibleLeads,
    selectedLead,
    filter,
    newCount: visibleLeads.filter((lead) => lead.status === "new").length,
    loading,
    savingStatus,
    savingNote,
    deleting,
    error,
    setFilter,
    selectLead,
    reload,
    updateStatus,
    saveNote,
    deleteLead,
  };
}
