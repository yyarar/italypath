"use client";

import Link from "next/link";
import { ArrowLeft, Award, CheckCircle2, Flame, Lock, Medal, Star, Target, Trophy, Zap } from "lucide-react";

import { useLanguage } from "@/context/LanguageContext";
import type { Badge, BadgeTrack } from "@/lib/sat/badges";

const GOLD = "#b8872f";

interface BadgesViewProps {
  badges: Badge[];
  onBack: () => void;
}

function badgeIcon(id: string, className: string) {
  if (id === "isinma") return <Zap className={className} strokeWidth={2} />;
  if (id === "maratoncu") return <Target className={className} strokeWidth={2} />;
  if (id === "binSoru") return <Trophy className={className} strokeWidth={2} />;
  if (id === "ilkAltin") return <Medal className={className} strokeWidth={2} />;
  if (id === "altinAvcisi") return <Star className={className} strokeWidth={2} />;
  if (id === "bolumUstasi") return <Award className={className} strokeWidth={2} />;
  return <Flame className={className} strokeWidth={2} />;
}

export default function BadgesView({ badges, onBack }: BadgesViewProps) {
  const { t } = useLanguage();
  const tracks: { key: BadgeTrack; label: string }[] = [
    { key: "effort", label: t.sat.badgeTrackEffort },
    { key: "mastery", label: t.sat.badgeTrackMastery },
    { key: "streak", label: t.sat.badgeTrackStreak },
  ];

  const badgeText: Record<string, { name: string; locked: string }> = {
    isinma: { name: t.sat.badgeIsinmaName, locked: t.sat.badgeIsinmaLocked },
    maratoncu: { name: t.sat.badgeMaratoncuName, locked: t.sat.badgeMaratoncuLocked },
    binSoru: { name: t.sat.badgeBinSoruName, locked: t.sat.badgeBinSoruLocked },
    ilkAltin: { name: t.sat.badgeIlkAltinName, locked: t.sat.badgeIlkAltinLocked },
    altinAvcisi: { name: t.sat.badgeAltinAvcisiName, locked: t.sat.badgeAltinAvcisiLocked },
    bolumUstasi: { name: t.sat.badgeBolumUstasiName, locked: t.sat.badgeBolumUstasiLocked },
    alevlendi: { name: t.sat.badgeAlevlendiName, locked: t.sat.badgeAlevlendiLocked },
    haftalik: { name: t.sat.badgeHaftalikName, locked: t.sat.badgeHaftalikLocked },
    aylik: { name: t.sat.badgeAylikName, locked: t.sat.badgeAylikLocked },
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-8 border-b border-[var(--editorial-border)] pb-6">
        <div className="flex flex-wrap items-center gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--editorial-muted)] transition hover:text-[var(--editorial-sage)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--editorial-sage)]"
          >
            <ArrowLeft className="h-4 w-4" />
            {t.list.backHome}
          </Link>
          <button
            type="button"
            onClick={onBack}
            className="border-b border-[var(--editorial-sage)] pb-px text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--editorial-sage)] transition-colors hover:text-[var(--editorial-ink)]"
          >
            {t.sat.backToTopics}
          </button>
        </div>
        <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--editorial-terracotta)]">
          ITALYPATH
        </p>
        <h1 className="mt-3 font-serif text-3xl font-normal leading-tight text-[var(--editorial-ink)] sm:text-4xl">
          {t.sat.badgesTitle}
        </h1>
      </header>

      <div className="space-y-8">
        {tracks.map((track) => {
          const trackBadges = badges.filter((badge) => badge.track === track.key);

          return (
            <section key={track.key}>
              <h2 className="mb-3 font-serif text-2xl font-normal text-[var(--editorial-ink)]">{track.label}</h2>
              <div className="grid gap-3 sm:grid-cols-3">
                {trackBadges.map((badge) => {
                  const copy = badgeText[badge.id] ?? { name: badge.id, locked: badge.id };
                  const progress = `${badge.current}/${badge.target}`;

                  return (
                    <article
                      key={badge.id}
                      className={`min-h-44 border p-4 ${
                        badge.unlocked
                          ? "border-[var(--editorial-sage)] bg-[var(--editorial-surface)]"
                          : "border-[var(--editorial-border)] bg-[var(--editorial-band)]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div
                          className={`flex h-11 w-11 items-center justify-center border ${
                            badge.unlocked
                              ? "border-[#b8872f] bg-[var(--editorial-surface)]"
                              : "border-[var(--editorial-border)] bg-[var(--editorial-surface)] text-[var(--editorial-muted)]"
                          }`}
                          style={badge.unlocked ? { color: GOLD } : undefined}
                        >
                          {badge.unlocked ? (
                            badgeIcon(badge.id, "h-5 w-5")
                          ) : (
                            <Lock className="h-5 w-5" strokeWidth={2} />
                          )}
                        </div>
                        {badge.unlocked ? (
                          <CheckCircle2 className="h-5 w-5 text-[var(--editorial-sage)]" strokeWidth={2} />
                        ) : null}
                      </div>

                      <h3
                        className={`mt-4 font-serif text-xl font-normal leading-snug ${
                          badge.unlocked ? "text-[var(--editorial-ink)]" : "text-[var(--editorial-muted)]"
                        }`}
                      >
                        {copy.name}
                      </h3>
                      {badge.unlocked ? null : (
                        <>
                          <p className="mt-2 min-h-10 text-sm leading-5 text-[var(--editorial-muted)]">{copy.locked}</p>
                          <div className="mt-4 flex items-center justify-between gap-3">
                            <span className="text-[11px] font-semibold text-[var(--editorial-muted)]">{progress}</span>
                            <div className="h-1.5 w-20 bg-[var(--editorial-border)]">
                              <div
                                className="h-full bg-[var(--editorial-muted)]"
                                style={{ width: `${Math.min(100, Math.round((badge.current / badge.target) * 100))}%` }}
                              />
                            </div>
                          </div>
                        </>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}
