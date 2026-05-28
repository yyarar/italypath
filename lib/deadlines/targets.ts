// Curated list of universities to scrape for non-EU application deadlines.
// Each entry maps a university ID (from app/data.ts) to one or more admission
// pages that publish its deadlines. URLs are visited in order; if a page covers
// both bachelor and master, use cycle: "both".

export interface DeadlineTargetUrl {
  cycle: "bachelor" | "master" | "both";
  url: string;
  appliesToSlugs?: string[]; // if URL only covers a subset of programs
}

export interface DeadlineTarget {
  universityId: number;
  universityName: string;     // for the runbook log; not used in apply step
  admissionUrls: DeadlineTargetUrl[];
}

export const DEADLINE_TARGETS: DeadlineTarget[] = [
  {
    universityId: 1,
    universityName: "Politecnico di Milano",
    admissionUrls: [
      {
        cycle: "bachelor",
        url: "https://www.polimi.it/en/prospective-students/how-to-apply/admission-to-laurea-programmes/students-with-a-foreign-degree",
      },
      {
        cycle: "master",
        url: "https://www.polimi.it/en/prospective-students/how-to-apply/admission-to-laurea-magistrale/foreign-qualification/deadlines",
      },
    ],
  },
  {
    universityId: 2,
    universityName: "Sapienza University of Rome",
    admissionUrls: [
      {
        cycle: "both",
        url: "https://www.uniroma1.it/en/admissions",
      },
    ],
  },
  {
    universityId: 3,
    universityName: "University of Bologna",
    admissionUrls: [
      {
        cycle: "both",
        url: "https://www.unibo.it/en/study/enrolment-fees-and-other-procedures",
      },
    ],
  },
  {
    universityId: 4,
    universityName: "Politecnico di Torino",
    admissionUrls: [
      {
        cycle: "both",
        url: "https://www.polito.it/en/education/admission-and-enrolment",
      },
    ],
  },
  {
    universityId: 7,
    universityName: "Bocconi University",
    admissionUrls: [
      {
        cycle: "bachelor",
        url: "https://www.unibocconi.it/en/applying-bocconi/bachelor-and-law-programs/timeline",
      },
    ],
  },
  {
    universityId: 8,
    universityName: "Università Cattolica del Sacro Cuore",
    admissionUrls: [
      {
        cycle: "both",
        url: "https://www.unicatt.it/ucenrollment-international-enrollment-procedure.html",
      },
    ],
  },
];
