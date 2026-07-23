"use client";

import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { ArrowRight, FileText, GraduationCap, MessageCircle } from "lucide-react";

import { useLanguage } from "@/context/LanguageContext";
import Reveal from "@/components/ui/Reveal";
import { formatStatValue, type UniversityStats } from "@/lib/universityStats";

interface FeaturesSectionProps {
  stats: UniversityStats;
}

export default function FeaturesSection({ stats }: FeaturesSectionProps) {
  const { t, language } = useLanguage();
  const { isSignedIn } = useAuth();
  const aiMentorHref = isSignedIn ? "/ai-mentor" : "/giris?redirect_url=%2Fai-mentor";
  const documentsHref = isSignedIn ? "/documents" : "/giris?redirect_url=%2Fdocuments";
  const ctaText = language === "tr" ? "İncele" : "Open";
  const universitiesMeta =
    stats.universitiesCount === null || stats.programsCount === null
      ? language === "tr"
        ? "Canlı üniversite verisi"
        : "Live university data"
      : language === "tr"
        ? `${formatStatValue(stats.universitiesCount)} üniversite · ${formatStatValue(stats.programsCount)} program`
        : `${formatStatValue(stats.universitiesCount)} universities · ${formatStatValue(stats.programsCount)} programs`;

  const features = [
    {
      icon: GraduationCap,
      title: t.features.card1Title,
      description: t.features.card1Desc,
      href: "/universities",
      meta: universitiesMeta,
    },
    {
      icon: FileText,
      title: t.features.card3Title,
      description: t.features.card3Desc,
      href: documentsHref,
      meta: language === "tr" ? "Başvuru evrakları" : "Application documents",
    },
    {
      icon: MessageCircle,
      title: t.features.card2Title,
      description: t.features.card2Desc,
      href: aiMentorHref,
      meta: language === "tr" ? "AI · Gönüllü ekip · Uzman" : "AI · Volunteer team · Expert",
    },
  ];

  return (
    <section className="bg-[var(--editorial-paper)] py-16 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-8 border-t border-[var(--editorial-border)] pt-10 lg:grid-cols-[0.8fr_1.2fr]">
          <Reveal>
            <p className="flex items-center gap-3 text-sm font-medium text-[var(--editorial-muted)]">
              <span className="h-px w-7 bg-[var(--editorial-terracotta)]" aria-hidden="true" />
              {language === "tr" ? "Rehber akışı" : "Guide flow"}
            </p>
            <h2 className="mt-4 max-w-md font-serif text-4xl font-normal leading-tight tracking-[-0.02em] text-[var(--editorial-ink)] sm:text-5xl">
              {t.features.title}
            </h2>
            <p className="mt-5 max-w-md text-base leading-7 text-[var(--editorial-muted)]">{t.features.subtitle}</p>
          </Reveal>

          <Reveal delay={0.12} className="divide-y divide-[var(--editorial-border)] border-y border-[var(--editorial-border)]">
            {features.map((feature) => {
              const Icon = feature.icon;

              return (
                <Link
                  key={feature.title}
                  href={feature.href}
                  className="group grid gap-5 py-6 transition-colors duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-[var(--editorial-band)] sm:grid-cols-[3rem_1fr_auto]"
                >
                  <div className="flex h-12 w-12 items-center justify-center border border-[var(--editorial-border)] bg-[var(--editorial-surface)] text-[var(--editorial-sage)] transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:border-[var(--editorial-sage)] group-hover:-translate-y-0.5">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-1">
                    <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <h3 className="text-xl font-semibold tracking-[-0.015em] text-[var(--editorial-ink)] transition-colors duration-500 group-hover:text-[var(--editorial-sage)]">
                        {feature.title}
                      </h3>
                      <span className="text-xs text-[var(--editorial-terracotta)]">{feature.meta}</span>
                    </div>
                    <p className="max-w-2xl text-sm leading-6 text-[var(--editorial-muted)]">{feature.description}</p>
                  </div>
                  <span className="inline-flex items-center self-center text-sm font-semibold text-[var(--editorial-sage)]">
                    {ctaText}
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-1" />
                  </span>
                </Link>
              );
            })}
          </Reveal>
        </div>
      </div>
    </section>
  );
}
