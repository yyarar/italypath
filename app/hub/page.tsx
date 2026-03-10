"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth, useClerk, useUser, SignOutButton } from "@clerk/nextjs";
import {
  ArrowRight,
  Bot,
  FileText,
  Globe,
  Heart,
  Languages,
  LayoutGrid,
  List,
  LogOut,
  Map,
  Settings,
  Sparkles,
  UserCog,
  Users,
} from "lucide-react";
import { motion } from "framer-motion";
import { useLanguage } from "@/context/LanguageContext";
import { useFavorites } from "@/lib/useFavorites";
import { createClerkSupabaseClient } from "@/lib/supabaseClient";

type UniversityViewMode = "grid" | "compact";

const UNIVERSITIES_VIEW_MODE_STORAGE_KEY = "italyPathUniversitiesViewMode";
const UNIVERSITIES_VIEW_MODE_EVENT = "italypath-universities-view-mode-change";

function getInitials(name: string) {
  const parts = name
    .split(" ")
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 2);
  return parts.length ? parts.map((part) => part[0]?.toUpperCase() ?? "").join("") : "IP";
}

function readViewMode(): UniversityViewMode {
  if (typeof window === "undefined") return "grid";
  const stored = window.localStorage.getItem(UNIVERSITIES_VIEW_MODE_STORAGE_KEY);
  return stored === "compact" ? "compact" : "grid";
}

export default function HubPage() {
  const { user, isLoaded: userLoaded } = useUser();
  const { getToken, isSignedIn } = useAuth();
  const { openUserProfile } = useClerk();
  const { t, language, toggleLanguage } = useLanguage();
  const { favorites, loading: favoritesLoading } = useFavorites();

  const [documentsCount, setDocumentsCount] = useState(0);
  const [documentsCountLoading, setDocumentsCountLoading] = useState(true);
  const [documentsCountUnavailable, setDocumentsCountUnavailable] = useState(false);
  const [viewMode, setViewMode] = useState<UniversityViewMode>(() => readViewMode());

  const supabase = useMemo(
    () =>
      createClerkSupabaseClient(async () => {
        try {
          return await getToken({ template: "supabase" });
        } catch {
          return null;
        }
      }),
    [getToken]
  );

  useEffect(() => {
    const syncViewMode = () => setViewMode(readViewMode());
    window.addEventListener("storage", syncViewMode);
    window.addEventListener(UNIVERSITIES_VIEW_MODE_EVENT, syncViewMode);
    return () => {
      window.removeEventListener("storage", syncViewMode);
      window.removeEventListener(UNIVERSITIES_VIEW_MODE_EVENT, syncViewMode);
    };
  }, []);

  useEffect(() => {
    let isActive = true;

    async function loadDocumentsCount() {
      if (!user?.id) {
        if (!isActive) return;
        setDocumentsCount(0);
        setDocumentsCountLoading(false);
        setDocumentsCountUnavailable(false);
        return;
      }

      if (isActive) {
        setDocumentsCountLoading(true);
        setDocumentsCountUnavailable(false);
      }

      const { count, error } = await supabase
        .from("user_documents")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);

      if (!isActive) return;

      if (error) {
        console.error("Hub belge sayısı alınamadı:", error);
        setDocumentsCount(0);
        setDocumentsCountUnavailable(true);
      } else {
        setDocumentsCount(count ?? 0);
      }

      setDocumentsCountLoading(false);
    }

    void loadDocumentsCount();

    return () => {
      isActive = false;
    };
  }, [supabase, user?.id]);

  const primaryEmail = user?.primaryEmailAddress?.emailAddress ?? "";
  const emailLocalPart = primaryEmail.split("@")[0] ?? "";
  const displayName =
    user?.fullName?.trim() ||
    user?.username?.trim() ||
    user?.firstName?.trim() ||
    emailLocalPart ||
    t.hub.genericName;
  const profileImage = user?.imageUrl ?? "";
  const profileInitials = getInitials(displayName);

  const favoritesCount = favorites.length;
  const languageLabel = language === "tr" ? "Türkçe" : "English";
  const viewModeLabel = viewMode === "compact" ? t.hub.viewModeCompact : t.hub.viewModeGrid;

  const statusText =
    favoritesCount === 0 && documentsCount === 0
      ? t.hub.statusGettingStarted
      : favoritesCount > 0 && documentsCount === 0
        ? t.hub.statusFavoritesOnly
        : favoritesCount === 0 && documentsCount > 0
          ? t.hub.statusDocumentsOnly
          : t.hub.statusAllSet;

  const loading = !userLoaded || favoritesLoading || documentsCountLoading;

  const quickActions = [
    { href: "/favorites", label: t.hub.actionFavorites, icon: Heart },
    { href: "/documents", label: t.hub.actionDocuments, icon: FileText },
    { href: "/universities", label: t.hub.actionUniversities, icon: LayoutGrid },
    { href: "/communities", label: t.hub.actionCommunities, icon: Users },
    { href: "/scholarships", label: t.hub.actionScholarships, icon: Map },
    { href: "/ai-mentor", label: t.hub.actionAiMentor, icon: Bot },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 pb-24">
        <div className="mx-auto max-w-3xl space-y-4 px-4 py-6">
          <div className="h-36 animate-pulse rounded-3xl bg-white shadow-sm" />
          <div className="grid grid-cols-2 gap-3">
            {[0, 1, 2, 3].map((item) => (
              <div key={item} className="h-28 animate-pulse rounded-2xl bg-white shadow-sm" />
            ))}
          </div>
          <div className="h-44 animate-pulse rounded-3xl bg-white shadow-sm" />
          <p className="text-center text-sm font-medium text-slate-400">{t.hub.loading}</p>
        </div>
      </div>
    );
  }

  if (userLoaded && !isSignedIn) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-8">
        <div className="mx-auto max-w-md rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <h1 className="text-xl font-extrabold text-slate-900">{t.hub.signedOutTitle}</h1>
          <p className="mt-2 text-sm text-slate-500">{t.hub.signedOutDesc}</p>
          <Link
            href="/sign-in?redirect_url=%2Fhub"
            className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 transition hover:bg-indigo-700"
          >
            {t.hub.signInCta}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <div className="mx-auto max-w-3xl space-y-5 px-4 py-5">
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 280, damping: 26 }}
          className="relative overflow-hidden rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-600 via-indigo-500 to-blue-500 p-5 text-white shadow-xl shadow-indigo-500/20"
        >
          <div className="absolute -right-10 -top-12 h-40 w-40 rounded-full bg-white/15 blur-2xl" />
          <div className="absolute -bottom-16 -left-10 h-36 w-36 rounded-full bg-blue-300/20 blur-2xl" />
          <div className="relative z-10 flex items-start gap-4">
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-white/40 bg-white/20">
              {profileImage ? (
                <div
                  role="img"
                  aria-label={`${displayName} avatar`}
                  className="h-full w-full bg-cover bg-center"
                  style={{ backgroundImage: `url(${profileImage})` }}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-lg font-black tracking-wide">
                  {profileInitials}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.2em]">
                <Sparkles className="h-3 w-3" />
                {t.hub.profileBadge}
              </span>
              <h1 className="mt-2 truncate text-2xl font-black tracking-tight">{displayName}</h1>
              <p className="truncate text-sm text-indigo-100">{primaryEmail}</p>
              <p className="mt-2 max-w-xl text-sm font-medium text-indigo-50">{statusText}</p>
            </div>
          </div>
        </motion.section>

        <section aria-label={t.hub.summaryTitle}>
          <h2 className="mb-2 px-1 text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
            {t.hub.summaryTitle}
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-500">
                <Heart className="h-5 w-5" />
              </div>
              <p className="text-2xl font-black text-slate-900">{favoritesCount}</p>
              <p className="text-xs font-bold text-slate-600">{t.hub.favoritesTitle}</p>
              <p className="mt-1 text-[11px] text-slate-400">
                {favoritesCount > 0 ? t.hub.favoritesHintSome : t.hub.favoritesHintZero}
              </p>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-500">
                <FileText className="h-5 w-5" />
              </div>
              <p className="text-2xl font-black text-slate-900">{documentsCount}</p>
              <p className="text-xs font-bold text-slate-600">{t.hub.documentsTitle}</p>
              <p className="mt-1 text-[11px] text-slate-400">
                {documentsCountUnavailable
                  ? t.hub.docsUnavailable
                  : documentsCount > 0
                    ? t.hub.documentsHintSome
                    : t.hub.documentsHintZero}
              </p>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <Languages className="h-5 w-5" />
              </div>
              <p className="text-2xl font-black text-slate-900">{languageLabel}</p>
              <p className="text-xs font-bold text-slate-600">{t.hub.languageTitle}</p>
              <p className="mt-1 text-[11px] text-slate-400">{t.hub.languageHint}</p>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                {viewMode === "compact" ? <List className="h-5 w-5" /> : <LayoutGrid className="h-5 w-5" />}
              </div>
              <p className="text-2xl font-black text-slate-900">{viewModeLabel}</p>
              <p className="text-xs font-bold text-slate-600">{t.hub.viewModeTitle}</p>
              <p className="mt-1 text-[11px] text-slate-400">{t.hub.viewModeHint}</p>
            </article>
          </div>
        </section>

        <section>
          <h2 className="mb-2 px-1 text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
            {t.hub.quickActionsTitle}
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {quickActions.map((action, index) => {
              const ActionIcon = action.icon;
              return (
                <motion.div
                  key={action.href}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04, type: "spring", stiffness: 280, damping: 24 }}
                >
                  <Link
                    href={action.href}
                    className="group flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-indigo-200 hover:shadow-md"
                  >
                    <span className="flex items-center gap-2 text-sm font-bold text-slate-700">
                      <ActionIcon className="h-4 w-4 text-indigo-500" />
                      {action.label}
                    </span>
                    <ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-indigo-400" />
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2">
          <article className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-extrabold text-slate-800">
              <Globe className="h-4 w-4 text-emerald-600" />
              {t.hub.preferencesTitle}
            </h2>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
              <p className="text-xs font-semibold text-slate-500">{t.hub.languageTitle}</p>
              <p className="text-sm font-bold text-slate-900">{languageLabel}</p>
            </div>
            <button
              type="button"
              onClick={toggleLanguage}
              className="mt-3 inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-emerald-300 hover:bg-emerald-50"
            >
              <Languages className="h-4 w-4" />
              {t.hub.languageToggle}
            </button>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-extrabold text-slate-800">
              <Settings className="h-4 w-4 text-indigo-600" />
              {t.hub.accountTitle}
            </h2>
            <div className="grid gap-2">
              <button
                type="button"
                onClick={() => openUserProfile()}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 transition hover:bg-indigo-700"
              >
                <UserCog className="h-4 w-4" />
                {t.hub.manageAccount}
              </button>
              <SignOutButton redirectUrl="/">
                <button
                  type="button"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                >
                  <LogOut className="h-4 w-4" />
                  {t.hub.signOut}
                </button>
              </SignOutButton>
            </div>
          </article>
        </section>
      </div>
    </div>
  );
}
