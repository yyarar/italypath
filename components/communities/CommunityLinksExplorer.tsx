"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ExternalLink,
  Globe,
  Layers,
  MessagesSquare,
  Search,
  ShieldCheck,
} from "lucide-react";

import { useLanguage } from "@/context/LanguageContext";
import {
  COMMUNITY_LINKS,
  type CommunityCategory,
  type CommunityLink,
  type CommunityPlatform,
} from "@/lib/community-links";

const STATUS_ORDER: Record<CommunityLink["status"], number> = {
  active: 0,
  limited: 1,
  unverified: 2,
};

type CommunityStatusFilter = CommunityLink["status"] | "all";

function statusClassName(status: CommunityLink["status"]) {
  if (status === "active") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (status === "limited") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  return "border-slate-200 bg-slate-100 text-slate-600";
}

function platformClassName(platform: CommunityPlatform) {
  if (platform === "whatsapp") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (platform === "telegram") {
    return "border-sky-200 bg-sky-50 text-sky-700";
  }
  return "border-blue-200 bg-blue-50 text-blue-700";
}

function formatDate(value: string, language: "tr" | "en") {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat(language === "tr" ? "tr-TR" : "en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export default function CommunityLinksExplorer() {
  const { t, language, toggleLanguage } = useLanguage();

  const [searchTerm, setSearchTerm] = useState("");
  const [platformFilter, setPlatformFilter] = useState<CommunityPlatform | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<CommunityCategory | "all">("all");
  const [statusFilter, setStatusFilter] = useState<CommunityStatusFilter>("all");

  const filteredCommunities = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return COMMUNITY_LINKS.filter((item) => {
      const matchesPlatform = platformFilter === "all" ? true : item.platform === platformFilter;
      const matchesCategory = categoryFilter === "all" ? true : item.category === categoryFilter;
      const matchesStatus = statusFilter === "all" ? true : item.status === statusFilter;

      const matchesSearch =
        normalizedSearch.length === 0 ||
        item.name.toLowerCase().includes(normalizedSearch) ||
        item.description.toLowerCase().includes(normalizedSearch) ||
        item.audience.toLowerCase().includes(normalizedSearch) ||
        item.city?.toLowerCase().includes(normalizedSearch) ||
        item.region?.toLowerCase().includes(normalizedSearch);

      return matchesPlatform && matchesCategory && matchesStatus && matchesSearch;
    }).sort((a, b) => {
      const statusDiff = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
      if (statusDiff !== 0) return statusDiff;
      return a.name.localeCompare(b.name);
    });
  }, [categoryFilter, platformFilter, searchTerm, statusFilter]);

  const hasActiveFilters =
    searchTerm.trim().length > 0 ||
    platformFilter !== "all" ||
    categoryFilter !== "all" ||
    statusFilter !== "all";

  const clearFilters = () => {
    setSearchTerm("");
    setPlatformFilter("all");
    setCategoryFilter("all");
    setStatusFilter("all");
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-10">
      <div className="sticky top-0 z-30 border-b border-slate-100/80 bg-white/85 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="mb-4 flex items-center justify-between gap-3">
            <Link
              href="/"
              className="inline-flex items-center rounded-full px-3 py-1.5 text-sm font-semibold text-slate-500 transition hover:bg-indigo-50 hover:text-indigo-600"
            >
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              {t.communities.backHome}
            </Link>
            <button
              onClick={toggleLanguage}
              aria-label={language === "tr" ? "Switch to English" : "Türkçeye Geç"}
              className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-200"
            >
              <Globe className="h-3.5 w-3.5" />
              {language === "tr" ? "EN" : "TR"}
            </button>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <p className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-white">
              <MessagesSquare className="h-3.5 w-3.5" />
              {t.communities.badge}
            </p>
            <h1 className="mt-3 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
              {t.communities.title}
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-600 sm:text-base">
              {t.communities.subtitle}
            </p>

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <p className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
                <AlertTriangle className="h-3.5 w-3.5" />
                {t.communities.notOfficial}
              </p>
              <p className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-900">
                <ShieldCheck className="h-3.5 w-3.5" />
                {t.communities.curationPolicy}
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="grid gap-3 md:grid-cols-4">
              <label className="relative md:col-span-2">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder={t.communities.searchPlaceholder}
                  aria-label={t.communities.searchPlaceholder}
                  className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
                />
              </label>

              <select
                value={platformFilter}
                onChange={(event) =>
                  setPlatformFilter(event.target.value as CommunityPlatform | "all")
                }
                className="rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
                aria-label={t.communities.platformLabel}
              >
                <option value="all">{t.communities.allPlatforms}</option>
                <option value="whatsapp">{t.communities.platformNames.whatsapp}</option>
                <option value="telegram">{t.communities.platformNames.telegram}</option>
                <option value="facebook">{t.communities.platformNames.facebook}</option>
              </select>

              <select
                value={categoryFilter}
                onChange={(event) =>
                  setCategoryFilter(event.target.value as CommunityCategory | "all")
                }
                className="rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
                aria-label={t.communities.categoryLabel}
              >
                <option value="all">{t.communities.allCategories}</option>
                <option value="university">{t.communities.categoryNames.university}</option>
                <option value="housing">{t.communities.categoryNames.housing}</option>
                <option value="scholarship">{t.communities.categoryNames.scholarship}</option>
                <option value="admissions">{t.communities.categoryNames.admissions}</option>
                <option value="social">{t.communities.categoryNames.social}</option>
                <option value="general">{t.communities.categoryNames.general}</option>
              </select>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Layers className="hidden h-3.5 w-3.5 text-slate-300 sm:block" />
              <button
                type="button"
                onClick={() => setStatusFilter("all")}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  statusFilter === "all"
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                }`}
              >
                {t.communities.allStatuses}
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("active")}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  statusFilter === "active"
                    ? "border-emerald-600 bg-emerald-600 text-white"
                    : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                }`}
              >
                {t.communities.statusNames.active}
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("limited")}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  statusFilter === "limited"
                    ? "border-amber-600 bg-amber-600 text-white"
                    : "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                }`}
              >
                {t.communities.statusNames.limited}
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("unverified")}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  statusFilter === "unverified"
                    ? "border-slate-700 bg-slate-700 text-white"
                    : "border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {t.communities.statusNames.unverified}
              </button>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="ml-auto rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-100"
                >
                  {t.communities.clearFilters}
                </button>
              )}
            </div>

            <p className="mt-3 text-xs font-semibold text-slate-500">
              {filteredCommunities.length} {t.communities.resultsLabel}
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
        {filteredCommunities.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white px-6 py-14 text-center shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">{t.communities.emptyTitle}</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
              {t.communities.emptyDescription}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {filteredCommunities.map((community) => (
              <article
                key={community.id}
                className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow-md"
              >
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${platformClassName(
                      community.platform
                    )}`}
                  >
                    {t.communities.platformNames[community.platform]}
                  </span>
                  <span
                    className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${statusClassName(
                      community.status
                    )}`}
                  >
                    {t.communities.statusNames[community.status]}
                  </span>
                  <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                    {t.communities.categoryNames[community.category]}
                  </span>
                </div>

                <h2 className="text-lg font-bold text-slate-900">{community.name}</h2>
                <p className="mt-1 text-xs font-medium text-slate-500">
                  {community.city ?? t.communities.cityUnknown}
                  {" · "}
                  {community.region ?? t.communities.regionUnknown}
                </p>

                <p className="mt-3 text-sm leading-relaxed text-slate-600">{community.description}</p>

                <div className="mt-4 grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
                  <p>
                    <span className="font-semibold text-slate-700">{t.communities.audienceLabel}: </span>
                    {community.audience}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-700">{t.communities.verificationLabel}: </span>
                    {t.communities.verificationNames[community.verificationSource]}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-700">{t.communities.lastCheckedLabel}: </span>
                    {formatDate(community.lastCheckedAt, language)}
                  </p>
                  {community.sizeHint && (
                    <p>
                      <span className="font-semibold text-slate-700">{t.communities.sizeHintLabel}: </span>
                      {t.communities.sizeHintNames[community.sizeHint]}
                    </p>
                  )}
                </div>

                {community.editorialNote && (
                  <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium leading-relaxed text-amber-900">
                    <span className="font-bold">{t.communities.editorialNoteLabel}: </span>
                    {community.editorialNote}
                  </p>
                )}

                <div className="mt-4 border-t border-slate-100 pt-4">
                  <a
                    href={community.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-slate-800"
                  >
                    {t.communities.openCommunity}
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
