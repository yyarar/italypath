"use client";

import { useAuth } from "@clerk/nextjs";
import { FileText, GraduationCap, MessageCircle } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

import { useLanguage } from "@/context/LanguageContext";
import AnimatedList, { type AnimatedListItemData } from "@/components/ui/animated-list";
import BorderBeam from "@/components/ui/border-beam";
import { BentoCard, BentoGrid } from "@/components/ui/bento-grid";
import Marquee from "@/components/ui/marquee";

function UniversitiesCardBackground({
  items,
  reduceMotion,
}: {
  items: string[];
  reduceMotion: boolean;
}) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-100/45 via-white/0 to-blue-100/35" />

      <Marquee
        pauseOnHover
        duration={reduceMotion ? 60 : 34}
        className="absolute top-10 [mask-image:linear-gradient(to_top,transparent_35%,#000_100%)]"
      >
        {items.map((label, index) => (
          <figure
            key={`marquee-top-${index}`}
            className="relative w-32 cursor-pointer overflow-hidden rounded-xl border border-indigo-200/60 bg-white/70 p-3 shadow-sm transition-all duration-300 ease-out hover:blur-none"
          >
            <figcaption className="text-xs font-semibold text-indigo-600">{label}</figcaption>
          </figure>
        ))}
      </Marquee>
    </div>
  );
}

function DocumentsCardBackground({ items }: { items: AnimatedListItemData[] }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-100/45 via-white/0 to-teal-100/35" />
      <AnimatedList
        items={items}
        intervalMs={2400}
        visibleCount={3}
        className="absolute top-4 right-2 h-[300px] w-full scale-75 [mask-image:linear-gradient(to_top,transparent_10%,#000_100%)] transition-all duration-300 ease-out group-hover:scale-90"
        itemClassName="border-emerald-100/70 bg-white/80"
      />
    </div>
  );
}

function MentorCardBackground() {
  return (
    <>
      <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-100/45 via-white/0 to-orange-100/35" />
        <div className="absolute -left-8 top-3 h-20 w-32 rounded-full bg-orange-200/40 blur-2xl" />
        <div className="absolute -right-8 bottom-4 h-20 w-36 rounded-full bg-amber-200/35 blur-2xl" />
        <div className="absolute inset-y-0 left-6 w-px bg-gradient-to-b from-transparent via-orange-300/35 to-transparent animate-soft-fade-up [--duration:7s]" />
        <div className="absolute inset-y-0 right-9 w-px bg-gradient-to-b from-transparent via-amber-300/30 to-transparent animate-soft-fade-up [--duration:8.2s] [animation-delay:1.1s]" />
      </div>
      <BorderBeam
        className="z-[3]"
        duration={8}
        size={100}
        anchor={24}
        borderWidth={1.5}
        colorFrom="#fb923c"
        colorTo="#f97316"
      />
    </>
  );
}

export default function FeaturesSection() {
  const { t, language } = useLanguage();
  const { isSignedIn } = useAuth();
  const shouldReduceMotion = useReducedMotion() ?? false;
  const aiMentorHref = isSignedIn
    ? "/ai-mentor"
    : "/sign-in?redirect_url=%2Fai-mentor";
  const documentsHref = isSignedIn
    ? "/documents"
    : "/sign-in?redirect_url=%2Fdocuments";
  const ctaText = language === "tr" ? "Keşfet" : "Learn more";

  const docListItems: AnimatedListItemData[] = t.featureAnimations.docList.map(
    (item, index) => ({
      id: `doc-${index}`,
      title: item.title,
      subtitle: item.subtitle,
    })
  );

  const features = [
    {
      Icon: GraduationCap,
      name: t.features.card1Title,
      description: t.features.card1Desc,
      href: "/universities",
      cta: ctaText,
      className: "col-span-3 lg:col-span-2",
      background: (
        <UniversitiesCardBackground
          items={t.featureAnimations.marquee}
          reduceMotion={shouldReduceMotion}
        />
      ),
    },
    {
      Icon: MessageCircle,
      name: t.features.card2Title,
      description: t.features.card2Desc,
      href: aiMentorHref,
      cta: ctaText,
      className: "col-span-3 lg:col-span-1",
      background: <MentorCardBackground />,
    },
    {
      Icon: FileText,
      name: t.features.card3Title,
      description: t.features.card3Desc,
      href: documentsHref,
      cta: ctaText,
      className: "col-span-3 lg:col-span-3",
      background: <DocumentsCardBackground items={docListItems} />,
    },
  ];

  return (
    <section className="bg-white py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ type: "spring", stiffness: 100, damping: 20 }}
          className="mb-14 text-center"
        >
          <p className="mb-4 text-xs font-black uppercase tracking-[0.25em] text-indigo-400">
            {language === "tr" ? "Özellikler" : "Features"}
          </p>
          <h2 className="mb-4 text-4xl font-extrabold tracking-tighter text-slate-900 sm:text-5xl">
            {t.features.title}
          </h2>
          <p className="mx-auto max-w-xl text-lg leading-relaxed text-slate-500">
            {t.features.subtitle}
          </p>
        </motion.div>

        <BentoGrid>
          {features.map((feature) => (
            <BentoCard key={feature.name} {...feature} />
          ))}
        </BentoGrid>
      </div>
    </section>
  );
}
