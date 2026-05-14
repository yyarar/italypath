"use client";

import Link from "next/link";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { ArrowLeft, ExternalLink, Globe } from "lucide-react";

import { useLanguage } from "@/context/LanguageContext";
import {
  COMMUNITY_LINKS,
  type CommunityChapter,
  type CommunityLink,
  type CommunityPlatform,
} from "@/lib/community-links";
import {
  COMMUNITY_CHAPTER_META,
  getCommunitiesByChapter,
  type CommunityChapterMeta,
} from "@/lib/communities/chapters";
import type { Language } from "@/types";

const SUGGESTION_MAIL = "contact@italypath.com";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 110, damping: 22 },
  },
};

function formatDate(value: string, language: Language) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(language === "tr" ? "tr-TR" : "en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function platformMonogramColor(platform: CommunityPlatform) {
  if (platform === "whatsapp") return "text-[var(--editorial-sage)]";
  if (platform === "telegram") return "text-[var(--editorial-terracotta)]";
  return "text-[var(--editorial-ink)]";
}

function pickChapterCopy(
  meta: CommunityChapterMeta,
  language: Language,
): { title: string; intro: string; citySummary: string } {
  return language === "tr"
    ? { title: meta.titleTr, intro: meta.introTr, citySummary: meta.citySummaryTr }
    : { title: meta.titleEn, intro: meta.introEn, citySummary: meta.citySummaryEn };
}

function AtlasTopBar() {
  const { t, language, toggleLanguage } = useLanguage();

  return (
    <header className="flex items-center justify-between gap-4 border-b border-[var(--editorial-border)] pb-4">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--editorial-muted)] transition hover:text-[var(--editorial-sage)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--editorial-sage)]"
      >
        <ArrowLeft className="h-4 w-4" />
        {t.communities.backHome}
      </Link>

      <div className="hidden text-sm font-semibold text-[var(--editorial-ink)] sm:block">
        {t.communities.pageIdentity}
      </div>

      <button
        onClick={toggleLanguage}
        aria-label={language === "tr" ? "Switch to English" : "Türkçeye geç"}
        className="inline-flex items-center gap-2 rounded-md border border-[var(--editorial-border)] bg-[var(--editorial-surface)] px-3 py-2 text-xs font-bold text-[var(--editorial-ink)] transition hover:border-[var(--editorial-sage)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)]"
      >
        <Globe className="h-3.5 w-3.5" />
        {language === "tr" ? "EN" : "TR"}
      </button>
    </header>
  );
}

function AtlasHero({ totalLastChecked }: { totalLastChecked: string }) {
  const { t, language } = useLanguage();

  return (
    <motion.section
      variants={itemVariants}
      className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(240px,0.35fr)] lg:items-end"
    >
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--editorial-muted)]">
          {t.communities.issueLabel}
        </p>
        <h1 className="mt-5 font-serif text-5xl font-normal leading-[0.95] tracking-[-0.025em] text-[var(--editorial-ink)] sm:text-6xl lg:text-7xl">
          {t.communities.heroTitleLines.map((line, index) => (
            <span key={index} className="block">
              {line}
            </span>
          ))}
        </h1>
        <p className="mt-6 max-w-2xl text-base leading-8 text-[var(--editorial-muted)] sm:text-lg">
          {t.communities.heroIntro}
        </p>
      </div>

      <div className="border-l-2 border-[var(--editorial-terracotta)] pl-4 text-sm leading-6 text-[var(--editorial-muted)]">
        <p className="font-serif italic">
          {t.communities.curationNoteLeading}{" "}
          <strong className="font-sans font-semibold not-italic text-[var(--editorial-ink)]">
            {formatDate(totalLastChecked, language)}
          </strong>
          . {t.communities.curationNoteBody}
        </p>
      </div>
    </motion.section>
  );
}

function AtlasTableOfContents({
  chapters,
  counts,
}: {
  chapters: CommunityChapterMeta[];
  counts: Record<CommunityChapter, number>;
}) {
  const { t, language } = useLanguage();

  return (
    <motion.nav
      variants={itemVariants}
      aria-label={t.communities.tocLabel}
      className="mt-10 border-y border-[var(--editorial-border)] py-6"
    >
      <p className="mb-4 font-serif text-base italic text-[var(--editorial-muted)]">
        {t.communities.tocLabel}
      </p>

      <ul className="mask-fade-horizontal -mx-4 flex snap-x snap-mandatory overflow-x-auto px-4 sm:mx-0 sm:px-0 lg:grid lg:grid-cols-5 lg:gap-0 lg:overflow-visible">
        {chapters.map((chapter, index) => {
          const { title } = pickChapterCopy(chapter, language);
          const count = counts[chapter.id];
          return (
            <li
              key={chapter.id}
              className="min-w-[160px] shrink-0 snap-start border-l border-[var(--editorial-border)] last:border-r lg:min-w-0 lg:shrink"
            >
              <a
                href={`#${chapter.slug}`}
                className="block px-4 py-2 transition hover:bg-[#f6f0e7] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)]"
              >
                <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--editorial-terracotta)]">
                  {String(index + 1).padStart(2, "0")}
                </div>
                <div className="mt-1 text-sm font-semibold leading-tight text-[var(--editorial-ink)]">
                  {title}
                </div>
                <div className="mt-1 text-[11px] text-[var(--editorial-muted)]">
                  {count} {t.communities.communityCountSuffix}
                </div>
              </a>
            </li>
          );
        })}
      </ul>
    </motion.nav>
  );
}

function EntryRow({ community }: { community: CommunityLink }) {
  const { t, language } = useLanguage();
  const platformLongName = t.communities.platformLongNames[community.platform];
  const monogram = t.communities.platformMonograms[community.platform];
  const regionLabel = community.region ?? community.city ?? t.communities.regionUnknown;
  const ariaLabel = `${community.name} — ${platformLongName} — ${t.communities.openAriaSuffix}`;

  return (
    <a
      href={community.url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={ariaLabel}
      className="grid grid-cols-[28px_minmax(0,1fr)_auto] items-start gap-4 border-b border-[var(--editorial-border)]/60 px-1 py-5 transition-colors duration-200 ease-out last:border-b-0 hover:bg-[#f6f0e7] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)] active:scale-[0.995] sm:grid-cols-[32px_minmax(0,1fr)_auto] sm:gap-5"
    >
      <span
        className={`mt-[3px] text-[11px] font-bold uppercase tracking-[0.08em] ${platformMonogramColor(community.platform)}`}
        aria-hidden="true"
      >
        {monogram}
      </span>

      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <span className="text-base font-semibold tracking-[-0.005em] text-[var(--editorial-ink)] sm:text-lg">
            {community.name}
          </span>
          <span className="whitespace-nowrap text-[10px] tracking-wide text-[var(--editorial-muted)]">
            {regionLabel} · {formatDate(community.lastCheckedAt, language)}
          </span>
        </div>
        {community.editorialNote ? (
          <p className="mt-1.5 max-w-2xl font-serif text-sm italic leading-relaxed text-[var(--editorial-muted)]">
            {community.editorialNote}
          </p>
        ) : null}
      </div>

      <span className="inline-flex items-center gap-1 self-start whitespace-nowrap pt-[3px] text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--editorial-terracotta)]">
        {t.communities.openAction}
        <ExternalLink className="h-3 w-3" aria-hidden="true" />
      </span>
    </a>
  );
}

function ChapterBlock({
  chapter,
  communities,
  numberLabel,
}: {
  chapter: CommunityChapterMeta;
  communities: CommunityLink[];
  numberLabel: string;
}) {
  const { t, language } = useLanguage();
  const { title, intro, citySummary } = pickChapterCopy(chapter, language);
  const titleId = `${chapter.slug}-title`;

  return (
    <motion.section
      id={chapter.slug}
      aria-labelledby={titleId}
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="mt-16 first:mt-12 scroll-mt-24"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <div className="flex items-baseline gap-3 sm:gap-4">
          <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--editorial-terracotta)]">
            {numberLabel}
          </span>
          <h2
            id={titleId}
            className="font-serif text-3xl font-normal leading-tight tracking-[-0.02em] text-[var(--editorial-ink)] sm:text-4xl"
          >
            {title}
          </h2>
        </div>
        <span className="text-[11px] tracking-wide text-[var(--editorial-muted)]">
          {communities.length} {t.communities.communityCountSuffix} · {citySummary}
        </span>
      </div>

      <p className="mt-5 max-w-2xl font-serif text-base italic leading-relaxed text-[var(--editorial-muted)] sm:text-lg">
        {intro}
      </p>

      <div className="mt-8 border-t border-[var(--editorial-border)]">
        {communities.map((community) => (
          <EntryRow key={community.id} community={community} />
        ))}
      </div>
    </motion.section>
  );
}

function AtlasFooterPrompt() {
  const { t } = useLanguage();
  const mailHref = `mailto:${SUGGESTION_MAIL}?subject=${encodeURIComponent(
    t.communities.footerMailSubject,
  )}`;

  return (
    <motion.aside
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="mt-20 grid items-center gap-6 border-t border-[var(--editorial-border)] pb-16 pt-10 sm:grid-cols-[1fr_auto]"
    >
      <div>
        <h3 className="font-serif text-xl font-normal leading-tight tracking-[-0.015em] text-[var(--editorial-ink)] sm:text-2xl">
          {t.communities.footerTitle}
        </h3>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--editorial-muted)]">
          {t.communities.footerBody}
        </p>
      </div>

      <a
        href={mailHref}
        className="inline-flex items-center gap-2 self-start whitespace-nowrap border border-[var(--editorial-terracotta)] px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--editorial-terracotta)] transition hover:bg-[var(--editorial-terracotta)] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-terracotta)] sm:self-center"
      >
        {t.communities.footerCta}
        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
      </a>
    </motion.aside>
  );
}

function pickGlobalLastChecked(): string {
  return COMMUNITY_LINKS.reduce<string>((latest, community) => {
    return community.lastCheckedAt > latest ? community.lastCheckedAt : latest;
  }, "");
}

export default function CommunityAtlas() {
  const shouldReduceMotion = useReducedMotion();
  const grouped = getCommunitiesByChapter();
  const counts: Record<CommunityChapter, number> = {
    preparation: grouped.preparation.length,
    housing: grouped.housing.length,
    university: grouped.university.length,
    "city-voice": grouped["city-voice"].length,
    "pan-italy": grouped["pan-italy"].length,
  };
  const totalLastChecked = pickGlobalLastChecked();

  const heroAnimation = shouldReduceMotion ? undefined : "show";

  return (
    <main className="min-h-[100dvh] bg-[var(--editorial-paper)]">
      <div className="mx-auto max-w-7xl px-4 pb-10 pt-6 sm:px-6 lg:px-8">
        <AtlasTopBar />

        <motion.div
          variants={containerVariants}
          initial={shouldReduceMotion ? false : "hidden"}
          animate={heroAnimation}
        >
          <AtlasHero totalLastChecked={totalLastChecked} />
          <AtlasTableOfContents chapters={COMMUNITY_CHAPTER_META} counts={counts} />
        </motion.div>

        {COMMUNITY_CHAPTER_META.map((chapter, index) => (
          <ChapterBlock
            key={chapter.id}
            chapter={chapter}
            communities={grouped[chapter.id]}
            numberLabel={String(index + 1).padStart(2, "0")}
          />
        ))}

        <AtlasFooterPrompt />
      </div>
    </main>
  );
}
