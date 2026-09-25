"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useUser } from "@clerk/nextjs";

import type { ExpertLeadStatus } from "@/lib/mentor/expertLeads";
import {
  DEFAULT_EXPERT_LEAD_FILTER,
  EXPERT_LEAD_PAGE_SIZE,
  appendExpertLeads,
  expertLeadCursorFilter,
  removeExpertLead,
  replaceExpertLead,
  resolveExpertLeadSelection,
  splitExpertLeadPage,
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
  | "load_more_failed"
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
  suspectedCount: number;
  hasMore: boolean;
  loading: boolean;
  loadingMore: boolean;
  savingStatus: boolean;
  savingNote: boolean;
  deleting: boolean;
  error: ExpertLeadInboxError;
  setFilter: (filter: ExpertLeadFilter) => void;
  selectLead: (id: string | null) => void;
  reload: () => Promise<void>;
  loadMore: () => Promise<void>;
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
  const filterRef = useRef<ExpertLeadFilter>(DEFAULT_EXPERT_LEAD_FILTER);
  const listRequestRef = useRef(0);

  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [stateOwnerId, setStateOwnerId] = useState<string | null>(null);
  const [leads, setLeads] = useState<ExpertLeadRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilterState] = useState<ExpertLeadFilter>(
    DEFAULT_EXPERT_LEAD_FILTER,
  );
  const [newCount, setNewCount] = useState(0);
  const [suspectedCount, setSuspectedCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<ExpertLeadInboxError>(null);

  const purgeExpertLeadState = useCallback(() => {
    listRequestRef.current += 1;
    leadsRef.current = [];
    selectedIdRef.current = null;
    setLeads([]);
    setSelectedId(null);
    setNewCount(0);
    setSuspectedCount(0);
    setHasMore(false);
    setLoadingMore(false);
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

  // Loads the first page for `listFilter` and the badge counts. A newer list
  // request (filter change, reload, identity change) makes this one stale.
  const loadFirstPage = useCallback(
    async (scope: ExpertLeadRequestScope, listFilter: ExpertLeadFilter) => {
      const requestId = ++listRequestRef.current;
      setLoadingMore(false);
      const [pageResult, newResult, suspectedResult] = await Promise.all([
        fetchLeadPage(supabase, listFilter, null),
        countLeads(supabase, "new"),
        countLeads(supabase, "suspected"),
      ]);
      if (!isScopeCurrent(scope) || requestId !== listRequestRef.current) return;

      if (pageResult.error || newResult.error || suspectedResult.error) {
        purgeExpertLeadState();
        setError("load_failed");
        setLoading(false);
        return;
      }

      const page = splitExpertLeadPage(pageResult.data ?? []);
      setHasMore(page.hasMore);
      setNewCount(newResult.count ?? 0);
      setSuspectedCount(suspectedResult.count ?? 0);
      commitRows(page.rows);
      setLoading(false);
    },
    [commitRows, isScopeCurrent, purgeExpertLeadState, supabase],
  );

  const refreshCounts = useCallback(
    async (scope: ExpertLeadRequestScope) => {
      const [newResult, suspectedResult] = await Promise.all([
        countLeads(supabase, "new"),
        countLeads(supabase, "suspected"),
      ]);
      if (!isScopeCurrent(scope)) return;
      if (!newResult.error) setNewCount(newResult.count ?? 0);
      if (!suspectedResult.error) setSuspectedCount(suspectedResult.count ?? 0);
    },
    [isScopeCurrent, supabase],
  );

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
    await loadFirstPage(scope, filterRef.current);
  }, [
    captureScope,
    isScopeCurrent,
    loadFirstPage,
    purgeExpertLeadState,
    resolvedUserId,
    supabase,
  ]);

  const setFilter = useCallback(
    (nextFilter: ExpertLeadFilter) => {
      filterRef.current = nextFilter;
      setFilterState(nextFilter);
      const scope = captureScope();
      if (!scope || identityRef.current.authorized !== true) return;
      commitRows([]);
      setHasMore(false);
      setLoadingMore(false);
      setLoading(true);
      setError(null);
      void loadFirstPage(scope, nextFilter);
    },
    [captureScope, commitRows, loadFirstPage],
  );

  const loadMore = useCallback(async () => {
    const scope = captureScope();
    const requestId = listRequestRef.current;
    const filterAtRequest = filterRef.current;
    const last = leadsRef.current.at(-1) ?? null;
    if (!scope || !last || identityRef.current.authorized !== true) return;

    setLoadingMore(true);
    setError(null);
    const { data, error: loadError } = await fetchLeadPage(
      supabase,
      filterAtRequest,
      last,
    );
    if (!isScopeCurrent(scope) || requestId !== listRequestRef.current) return;

    setLoadingMore(false);
    if (loadError) {
      setError("load_more_failed");
      return;
    }
    const page = splitExpertLeadPage(data ?? []);
    setHasMore(page.hasMore);
    commitRows(appendExpertLeads(leadsRef.current, page.rows));
  }, [captureScope, commitRows, isScopeCurrent, supabase]);

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
      void refreshCounts(scope);
    },
    [
      accessReady,
      captureScope,
      commitRows,
      isScopeCurrent,
      refreshCounts,
      selectedLead,
      supabase,
    ],
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
    void refreshCounts(scope);
  }, [
    accessReady,
    captureScope,
    commitRows,
    isScopeCurrent,
    refreshCounts,
    selectedLead,
    supabase,
  ]);

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
    newCount: accessReady ? newCount : 0,
    suspectedCount: accessReady ? suspectedCount : 0,
    hasMore: accessReady && hasMore,
    loading,
    loadingMore,
    savingStatus,
    savingNote,
    deleting,
    error,
    setFilter,
    selectLead,
    reload,
    loadMore,
    updateStatus,
    saveNote,
    deleteLead,
  };
}

type MentorSupabaseClient = ReturnType<typeof useMentorSupabaseClient>;

// One page of the operator list, newest first, fetched with one extra row so
// the caller knows whether a "show more" page exists.
function fetchLeadPage(
  supabase: MentorSupabaseClient,
  filter: ExpertLeadFilter,
  after: ExpertLeadRow | null,
) {
  let query = supabase.from("expert_leads").select(EXPERT_LEAD_COLUMNS);
  query =
    filter === "all" ? query.neq("status", "suspected") : query.eq("status", filter);
  if (after) query = query.or(expertLeadCursorFilter(after));
  return query
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(EXPERT_LEAD_PAGE_SIZE + 1)
    .returns<ExpertLeadRow[]>();
}

function countLeads(supabase: MentorSupabaseClient, status: ExpertLeadStatus) {
  return supabase
    .from("expert_leads")
    .select("id", { count: "exact", head: true })
    .eq("status", status);
}
