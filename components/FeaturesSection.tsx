"use client";

import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { ArrowUpRight, FileText, GraduationCap, MessageCircle } from "lucide-react";

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
      surface: "bg-[#e7efe9]",
      iconSurface: "bg-[var(--editorial-sage)] text-white",
    },
    {
      icon: MessageCircle,
      title: t.features.card2Title,
      description: t.features.card2Desc,
      href: aiMentorHref,
      meta: language === "tr" ? "AI · Gönüllü ekip · Uzman" : "AI · Volunteer team · Expert",
      surface: "bg-[#f2e8e0]",
      iconSurface: "bg-[var(--editorial-terracotta)] text-white",
    },
    {
      icon: FileText,
      title: t.features.card3Title,
      description: t.features.card3Desc,
      href: documentsHref,
      meta: language === "tr" ? "Başvuru evrakları" : "Application documents",
      surface: "bg-[#eceee5]",
      iconSurface: "bg-[var(--editorial-ink)] text-white",
    },
  ];

  return (
    <section className="bg-[var(--editorial-paper)] py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--editorial-terracotta)]">
              {t.homeApple.featuresEyebrow}
            </p>
            <h2 className="mt-4 max-w-2xl font-serif text-4xl font-normal leading-[1.02] tracking-[-0.035em] text-[var(--editorial-ink)] sm:text-5xl lg:text-6xl">
              {t.features.title}
            </h2>
          </div>
          <p className="max-w-md text-base leading-7 text-[var(--editorial-muted)]">{t.features.subtitle}</p>
        </Reveal>

        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {features.map((feature, index) => {
            const Icon = feature.icon;

            return (
              <Reveal key={feature.title} delay={index * 0.07}>
                <Link
                  href={feature.href}
                  className="home-feature-card home-pressable group block rounded-[2rem] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--editorial-sage)]"
                >
                  <article className={`flex min-h-[22rem] flex-col rounded-[2rem] border border-white/70 p-6 shadow-[0_14px_45px_rgba(21,32,28,0.06)] sm:p-7 ${feature.surface}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className={`flex h-12 w-12 items-center justify-center rounded-2xl shadow-[0_6px_18px_rgba(21,32,28,0.12)] ${feature.iconSurface}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="home-hover-rotate flex h-10 w-10 items-center justify-center rounded-full bg-white/55 text-[var(--editorial-ink)]">
                        <ArrowUpRight className="h-4 w-4" />
                      </span>
                    </div>

                    <div className="mt-auto pt-12">
                      <p className="text-xs font-semibold text-[var(--editorial-terracotta)]">{feature.meta}</p>
                      <h3 className="mt-3 text-2xl font-semibold tracking-[-0.035em] text-[var(--editorial-ink)]">{feature.title}</h3>
                      <p className="mt-3 text-sm leading-6 text-[var(--editorial-muted)]">{feature.description}</p>
                    </div>
                  </article>
                </Link>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
