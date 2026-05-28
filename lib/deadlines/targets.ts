// Curated list of universities to scrape for non-EU application deadlines.
// Each entry maps a university ID (from app/data.ts) to one or more admission
// pages that publish its deadlines. URLs are visited in order; if a page covers
// both bachelor and master, use cycle: "both".

export interface DeadlineTargetUrl {
  cycle: "bachelor" | "master" | "both";
  url: string;
  appliesToSlugs?: string[]; // department slugs this URL is scoped to; leave absent for all programs at the uni
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
    universityId: 5,
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
  {
    universityId: 10,
    universityName: "University of Milan (Statale)",
    admissionUrls: [
      {
        cycle: "both",
        url: "https://www.unimi.it/en/international/coming-abroad/enrol-programme/international-enrolment-degree-programmes",
      },
    ],
  },
  {
    universityId: 4,
    universityName: "University of Padua",
    admissionUrls: [
      {
        cycle: "both",
        url: "https://www.unipd.it/en/study-english-how-apply",
      },
    ],
  },
  {
    universityId: 19,
    universityName: "University of Pisa",
    admissionUrls: [
      {
        cycle: "both",
        url: "https://www.unipi.it/en/education/registration/enrolment-and-registration/enrolment-for-international-students/bachelors-and-single-cycle-masters-degree-courses-no-eu-citizenship/",
      },
    ],
  },
  {
    universityId: 63,
    universityName: "Università degli Studi di Firenze",
    admissionUrls: [
      {
        cycle: "both",
        url: "https://www.unifi.it/en/study-us/access-and-enrolment/international-students/enrolment-non-eu-students-residing-abroad",
      },
    ],
  },
  // TODO: deadlines may be on a different page — verify during pilot scrape (program-specific calls, no central deadline hub)
  {
    universityId: 18,
    universityName: "University of Trento",
    admissionUrls: [
      {
        cycle: "both",
        url: "https://corsi.unitn.it/en/computer-science/enrollment/admission-non-european-citizens",
      },
    ],
  },
  {
    universityId: 15,
    universityName: "University of Pavia",
    admissionUrls: [
      {
        cycle: "both",
        url: "https://en.unipv.it/en/education/bachelors-and-masters-degree-programs/how-apply/how-apply-bachelors-or-single-cycle-masters-degree-programs",
      },
    ],
  },
  // TODO: deadlines may be on a different page — verify during pilot scrape (program-specific calls, central admissions page confirmed)
  {
    universityId: 13,
    universityName: "University of Rome Tor Vergata",
    admissionUrls: [
      {
        cycle: "both",
        url: "https://web.uniroma2.it/en/percorso/admissions",
      },
    ],
  },
  {
    universityId: 11,
    universityName: "University of Turin",
    admissionUrls: [
      {
        cycle: "both",
        url: "https://en.unito.it/studying-unito/international-degree-seeking-students/application-international-students",
      },
    ],
  },
  {
    universityId: 28,
    universityName: "University of Verona",
    admissionUrls: [
      {
        cycle: "both",
        url: "https://www.univr.it/en/our-services/international-degree-seeking-students",
      },
    ],
  },
];
