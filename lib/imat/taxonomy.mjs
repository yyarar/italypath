// IMAT bolum ve alt konu taksonomisi: tek kaynak (spec 2026-10-08 "Konu taksonomisi").
// Ayni modulu hem site (lib/imat/*, bilesenler) hem betikler (scripts/imat/*) dogrudan ice aktarir;
// bu yuzden JS olarak yazildi (tipler taxonomy.d.mts). types.ts'i ice aktarmaz.
//
// Sozlesme:
// - Her bolumun bir `<bolum>-general` kutusu vardir; siniflandirici emin degilse buraya koyar.
// - `field` (physics | math) yalniz physics-math alt konularinda bulunur; `physics-math-general` alansizdir.
// - Etiketler (`label`) Ingilizcedir; TR/EN gorunen metin lib/translations altindaki `imat` ad alanindan gelir.

// Kagit sirasi (2023-2025 denemesinin bolum sirasi).
export const SECTIONS = Object.freeze(["reading-general", "logic", "biology", "chemistry", "physics-math"]);

// Alt konulari `field` tasiyan bolumler ve gecerli alan degerleri.
export const SECTION_FIELD = Object.freeze({ "physics-math": Object.freeze(["physics", "math"]) });

function topic(section, slug, label, field) {
  return Object.freeze(field ? { section, slug, label, field } : { section, slug, label });
}

export const TOPICS = Object.freeze([
  topic("reading-general", "text-comprehension", "Text comprehension"),
  topic("reading-general", "vocabulary-in-context", "Vocabulary in context"),
  topic("reading-general", "history-culture", "History and culture"),
  topic("reading-general", "institutions-law-economics", "Institutions, law and economics"),
  topic("reading-general", "reading-general-general", "General"),

  topic("logic", "critical-thinking", "Critical thinking"),
  topic("logic", "numeric-problem-solving", "Numeric problem solving"),
  topic("logic", "data-spatial-problem-solving", "Data and spatial problem solving"),
  topic("logic", "logic-general", "General"),

  topic("biology", "chemistry-of-life", "The chemistry of life"),
  topic("biology", "cell-and-viruses", "The cell and viruses"),
  topic("biology", "membrane-and-organelles", "Cell membrane and organelles"),
  topic("biology", "cell-division", "Cell cycle and division"),
  topic("biology", "bioenergetics", "Bioenergetics"),
  topic("biology", "reproduction-life-cycles", "Reproduction and life cycles"),
  topic("biology", "mendelian-classical-genetics", "Mendelian and classical genetics"),
  topic("biology", "molecular-genetics", "Molecular genetics"),
  topic("biology", "human-genetics", "Human genetics"),
  topic("biology", "evolution", "Mutations, selection and evolution"),
  topic("biology", "biotechnology", "Biotechnology"),
  topic("biology", "tissues-anatomy-physiology", "Tissues, anatomy and physiology"),
  topic("biology", "biology-general", "General"),

  topic("chemistry", "matter-and-gases", "Matter and gases"),
  topic("chemistry", "atomic-structure", "Atomic structure"),
  topic("chemistry", "periodic-table", "Periodic table"),
  topic("chemistry", "chemical-bonding", "Chemical bonding"),
  topic("chemistry", "inorganic-nomenclature", "Inorganic compounds and nomenclature"),
  topic("chemistry", "stoichiometry", "Stoichiometry and reactions"),
  topic("chemistry", "solutions", "Solutions"),
  topic("chemistry", "equilibrium-kinetics", "Equilibrium and kinetics"),
  topic("chemistry", "redox", "Oxidation and reduction"),
  topic("chemistry", "acids-bases", "Acids and bases"),
  topic("chemistry", "organic-chemistry", "Organic chemistry"),
  topic("chemistry", "chemistry-general", "General"),

  topic("physics-math", "measurement-units", "Measurement and units", "physics"),
  topic("physics-math", "kinematics", "Kinematics", "physics"),
  topic("physics-math", "dynamics", "Dynamics", "physics"),
  topic("physics-math", "fluids", "Fluid mechanics", "physics"),
  topic("physics-math", "thermodynamics", "Thermodynamics", "physics"),
  topic("physics-math", "electricity-magnetism", "Electricity and magnetism", "physics"),
  topic("physics-math", "algebra-numbers", "Algebra and number sets", "math"),
  topic("physics-math", "functions", "Functions", "math"),
  topic("physics-math", "geometry-trigonometry", "Geometry and trigonometry", "math"),
  topic("physics-math", "probability-statistics", "Probability and statistics", "math"),
  topic("physics-math", "physics-math-general", "General"),
]);

const TOPICS_BY_SLUG = new Map(TOPICS.map((entry) => [entry.slug, entry]));

export function topicsForSection(section) {
  return TOPICS.filter((entry) => entry.section === section);
}

// Bilinmeyen slug icin undefined doner.
export function findTopic(slug) {
  return TOPICS_BY_SLUG.get(slug);
}

export function generalSlug(section) {
  if (!SECTIONS.includes(section)) throw new Error(`Bilinmeyen bolum: ${section}`);
  return `${section}-general`;
}

// Deneme sinavi (mock) kagitlari: yalniz 2023-2025.
export const MOCK_YEARS = Object.freeze([2023, 2024, 2025]);

// Bir deneme kagidinin bolum basina soru sayisi (toplam 60). Sira MOCK_SECTION_ORDER ile ayni.
export const MOCK_SECTION_COUNTS = Object.freeze({
  "reading-general": 4,
  logic: 5,
  biology: 23,
  chemistry: 15,
  "physics-math": 13,
});

export const MOCK_SECTION_ORDER = SECTIONS;
