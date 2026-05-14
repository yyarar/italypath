import {
  COMMUNITY_LINKS,
  type CommunityChapter,
  type CommunityLink,
} from "@/lib/community-links";

export interface CommunityChapterMeta {
  id: CommunityChapter;
  slug: string;
  order: number;
  titleTr: string;
  titleEn: string;
  introTr: string;
  introEn: string;
  citySummaryTr: string;
  citySummaryEn: string;
}

export const COMMUNITY_CHAPTER_META: CommunityChapterMeta[] = [
  {
    id: "preparation",
    slug: "chapter-prep",
    order: 1,
    titleTr: "Hazırlık",
    titleEn: "Preparation",
    introTr:
      "İtalya yolu evrak ve başvuru telaşıyla başlar. Pre-enrollment dönemini bilenlerle paylaştığın grup, ilk aylarda en pratik kaynaktır. Burs tarafı Emilia-Romagna ağırlıklı — ER.GO süreç gruplarıdır.",
    introEn:
      "Italy begins with paperwork and timing. The pre-enrollment group is your most practical resource in the first months. Scholarships here lean Emilia-Romagna — ER.GO process groups.",
    citySummaryTr: "Pan-İtalya · Emilia-Romagna",
    citySummaryEn: "Pan-Italy · Emilia-Romagna",
  },
  {
    id: "housing",
    slug: "chapter-housing",
    order: 2,
    titleTr: "Konaklama",
    titleEn: "Housing",
    introTr:
      "Ev arayan öğrencinin ilk dört haftası bu gruplarda geçer. Roma'da arz az ve rotasyon yavaş; Bologna'da ilan günü gününe düşer. İki şehir için iki ayrı kanal öneriyoruz; Ravenna küçük ama düzenli.",
    introEn:
      "The first four weeks of housing hunting live inside these groups. Rome runs scarce and slow; Bologna sees fresh listings daily. Two cities, two separate channels — Ravenna small but steady.",
    citySummaryTr: "Roma · Bologna · Ravenna",
    citySummaryEn: "Rome · Bologna · Ravenna",
  },
  {
    id: "university",
    slug: "chapter-uni",
    order: 3,
    titleTr: "Üniversite Aileleri",
    titleEn: "University Cohorts",
    introTr:
      "Cohort grupları, üniversitede sınıf arkadaşlarını bulduğun yerdir. UNIBO ve Sapienza geniştir; Unito'nun yıllık (22/23, 23/24) grupları daha küçük ama düzenli. Sapienza 2026/27 yeni kayıt yıllarına özel — dolduğunda kapanabiliyor.",
    introEn:
      "Cohort groups are where you find your classmates. UNIBO and Sapienza run large; Unito holds quieter yearly cohorts (22/23, 23/24). Sapienza 2026/27 is fresh-intake-specific and may close once full.",
    citySummaryTr: "Bologna · Roma · Torino",
    citySummaryEn: "Bologna · Rome · Turin",
  },
  {
    id: "city-voice",
    slug: "chapter-city",
    order: 4,
    titleTr: "Şehir Sesi",
    titleEn: "City Life",
    introTr:
      "Bir şehirde yaşamayı, ev arkadaşı bulmayı, hafta sonu yürüyüşüne çıkmayı sağlayan gruplar. Padova ve Firenze'nin genel toplulukları yıllardır ayakta; Bologna iki ayrı sosyal çevreye (Erasmus + hiking) bölünüyor. Ravenna küçük ama hareketli.",
    introEn:
      "These are the groups that make a city feel livable — flatmates, weekend hikes, casual meetups. Padova and Firenze run year after year; Bologna splits into two social circles (Erasmus + hiking). Ravenna runs small but lively.",
    citySummaryTr: "Padova · Firenze · Bologna · Ravenna",
    citySummaryEn: "Padua · Florence · Bologna · Ravenna",
  },
  {
    id: "pan-italy",
    slug: "chapter-pan",
    order: 5,
    titleTr: "Pan-İtalya",
    titleEn: "Pan-Italy",
    introTr:
      "İtalya'da yaşayan Türk diasporasının geniş Facebook grupları. Yavaş ama derinden besleyen, soru-cevap odaklı — şehirden bağımsız genel bilgiler için.",
    introEn:
      "Wide Facebook groups for the Turkish diaspora in Italy. Slow but deep — Q&A oriented, useful for city-agnostic questions.",
    citySummaryTr: "Tüm İtalya",
    citySummaryEn: "All of Italy",
  },
];

const STATUS_ORDER: Record<CommunityLink["status"], number> = {
  active: 0,
  limited: 1,
  unverified: 2,
};

export function getCommunitiesByChapter(): Record<CommunityChapter, CommunityLink[]> {
  const grouped: Record<CommunityChapter, CommunityLink[]> = {
    preparation: [],
    housing: [],
    university: [],
    "city-voice": [],
    "pan-italy": [],
  };

  for (const community of COMMUNITY_LINKS) {
    grouped[community.chapter].push(community);
  }

  for (const chapterId of Object.keys(grouped) as CommunityChapter[]) {
    grouped[chapterId].sort((a, b) => {
      const statusDiff = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
      if (statusDiff !== 0) return statusDiff;
      return a.name.localeCompare(b.name);
    });
  }

  return grouped;
}
