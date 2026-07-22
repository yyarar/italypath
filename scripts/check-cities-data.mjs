import { readFileSync } from "node:fs";

const cityDataPath = new URL("../lib/cities/data.ts", import.meta.url);
const cityExplorerPath = new URL(
  "../components/cities/CityGuidesExplorer.tsx",
  import.meta.url
);
const translationsPath = new URL("../lib/translations.ts", import.meta.url);

const source = readFileSync(cityDataPath, "utf8");
const cityExplorerSource = readFileSync(cityExplorerPath, "utf8");
const translationsSource = readFileSync(translationsPath, "utf8");

function assertIncludes(haystack, needle, message) {
  if (!haystack.includes(needle)) {
    throw new Error(message);
  }
}

function assertNotIncludes(haystack, needle, message) {
  if (haystack.includes(needle)) {
    throw new Error(message);
  }
}

function extractCityBlock(slug) {
  const marker = `slug: "${slug}"`;
  const start = source.indexOf(marker);
  if (start === -1) {
    throw new Error(`Missing curated city block for slug "${slug}"`);
  }

  const commaEnd = source.indexOf("\n  },", start);
  const finalEnd = source.indexOf("\n  }\n];", start);
  const end =
    commaEnd === -1 ? finalEnd : finalEnd === -1 ? commaEnd : Math.min(commaEnd, finalEnd);

  if (end === -1) {
    throw new Error(`Could not parse city block for slug "${slug}"`);
  }

  return source.slice(start, end);
}

for (const staleSlug of ['slug: "firenze"', 'slug: "venezia"', 'slug: "venice"', 'slug: "genova"']) {
  assertNotIncludes(
    source,
    staleSlug,
    `Do not use source-page city slug ${staleSlug}; use the app city key instead.`
  );
}

const milano = extractCityBlock("milano");
const roma = extractCityBlock("roma");
const bologna = extractCityBlock("bologna");
const torino = extractCityBlock("torino");
const floransa = extractCityBlock("floransa");
const venedik = extractCityBlock("venedik");
const verona = extractCityBlock("verona");
const padova = extractCityBlock("padova");
const parma = extractCityBlock("parma");
const pisa = extractCityBlock("pisa");
const siena = extractCityBlock("siena");
const pavia = extractCityBlock("pavia");
const trieste = extractCityBlock("trieste");
const ancona = extractCityBlock("ancona");
const bari = extractCityBlock("bari");
const napoli = extractCityBlock("napoli");

assertIncludes(milano, 'costSourceName: "Numbeo"', "Milano must keep its Numbeo source metadata.");
assertIncludes(
  milano,
  'costSourceUrl: "https://www.numbeo.com/cost-of-living/in/Milan"',
  "Milano must keep the source URL used for the cost fields."
);
assertIncludes(milano, 'costSourceLastUpdated: "2026-05-23"', "Milano must keep Numbeo last update date.");
assertIncludes(milano, "Ucuz restoran: ~20€", "Milano livingExpenses must include inexpensive meal data.");
assertIncludes(milano, "Cappuccino: ~1,91€", "Milano livingExpenses must include cappuccino data.");
assertIncludes(milano, "85 m² temel faturalar: ~220,21€", "Milano livingExpenses must include utilities data.");
assertIncludes(milano, "Tek yön şehir içi bilet: ~2,20€", "Milano transportCost must include one-way ticket data.");
assertIncludes(milano, "1 odalı daire: merkezde ~1.468,75€", "Milano rentAverage must include centre 1BR rent.");
assertIncludes(milano, "merkez dışında ~1.045,17€", "Milano rentAverage must include outside-centre 1BR rent.");

assertIncludes(roma, 'costSourceName: "Numbeo"', "Roma must keep its Numbeo source metadata.");
assertIncludes(
  roma,
  'costSourceUrl: "https://www.numbeo.com/cost-of-living/in/Rome"',
  "Roma must keep the source URL used for the cost fields."
);
assertIncludes(roma, 'costSourceLastUpdated: "2026-05-21"', "Roma must keep Numbeo last update date.");
assertIncludes(roma, "Ucuz restoran: ~15€", "Roma livingExpenses must include inexpensive meal data.");
assertIncludes(roma, "Cappuccino: ~1,94€", "Roma livingExpenses must include cappuccino data.");
assertIncludes(roma, "85 m² temel faturalar: ~183,63€", "Roma livingExpenses must include utilities data.");
assertIncludes(roma, "Tek yön şehir içi bilet: ~1,50€", "Roma transportCost must include one-way ticket data.");
assertIncludes(roma, "1 odalı daire: merkezde ~1.076,92€", "Roma rentAverage must include centre 1BR rent.");
assertIncludes(roma, "merkez dışında ~778,57€", "Roma rentAverage must include outside-centre 1BR rent.");

assertIncludes(bologna, 'name: "Bologna"', "Bologna must use the app city key.");
assertIncludes(bologna, 'costSourceName: "Numbeo"', "Bologna must keep its Numbeo source metadata.");
assertIncludes(
  bologna,
  'costSourceUrl: "https://www.numbeo.com/cost-of-living/in/Bologna"',
  "Bologna must keep the source URL used for the cost fields."
);
assertIncludes(bologna, 'costSourceLastUpdated: "2026-05-11"', "Bologna must keep Numbeo last update date.");
assertIncludes(bologna, "Ucuz restoran: ~20€", "Bologna livingExpenses must include inexpensive meal data.");
assertIncludes(bologna, "Cappuccino: ~1,92€", "Bologna livingExpenses must include cappuccino data.");
assertIncludes(bologna, "85 m² temel faturalar: ~217,50€", "Bologna livingExpenses must include utilities data.");
assertIncludes(bologna, "Tek yön şehir içi bilet: ~2,30€", "Bologna transportCost must include one-way ticket data.");
assertIncludes(bologna, "1 odalı daire: merkezde ~966,33€", "Bologna rentAverage must include centre 1BR rent.");
assertIncludes(bologna, "merkez dışında ~775,54€", "Bologna rentAverage must include outside-centre 1BR rent.");

assertIncludes(torino, 'name: "Torino"', "Torino must use the app city key.");
assertIncludes(torino, 'nameEn: "Turin"', "Torino must keep the English city name.");
assertIncludes(torino, 'costSourceName: "Numbeo"', "Torino must keep its Numbeo source metadata.");
assertIncludes(
  torino,
  'costSourceUrl: "https://www.numbeo.com/cost-of-living/in/Turin"',
  "Torino must keep the source URL used for the cost fields."
);
assertIncludes(torino, 'costSourceLastUpdated: "2026-05-17"', "Torino must keep Numbeo last update date.");
assertIncludes(torino, "Ucuz restoran: ~18€", "Torino livingExpenses must include inexpensive meal data.");
assertIncludes(torino, "Cappuccino: ~1,72€", "Torino livingExpenses must include cappuccino data.");
assertIncludes(torino, "85 m² temel faturalar: ~204,72€", "Torino livingExpenses must include utilities data.");
assertIncludes(torino, "Tek yön şehir içi bilet: ~1,90€", "Torino transportCost must include one-way ticket data.");
assertIncludes(torino, "1 odalı daire: merkezde ~738,89€", "Torino rentAverage must include centre 1BR rent.");
assertIncludes(torino, "merkez dışında ~546,85€", "Torino rentAverage must include outside-centre 1BR rent.");

assertIncludes(floransa, 'name: "Floransa"', "Floransa must use the app city key.");
assertIncludes(floransa, 'nameEn: "Florence"', "Floransa must keep the English city name.");
assertIncludes(floransa, 'costSourceName: "Numbeo"', "Floransa must keep its Numbeo source metadata.");
assertIncludes(
  floransa,
  'costSourceUrl: "https://www.numbeo.com/cost-of-living/in/Florence"',
  "Floransa must keep the source URL used for the cost fields."
);
assertIncludes(floransa, 'costSourceLastUpdated: "2026-05-21"', "Floransa must keep Numbeo last update date.");
assertIncludes(floransa, "Ucuz restoran: ~22€", "Floransa livingExpenses must include inexpensive meal data.");
assertIncludes(floransa, "Cappuccino: ~1,99€", "Floransa livingExpenses must include cappuccino data.");
assertIncludes(floransa, "85 m² temel faturalar: ~199,84€", "Floransa livingExpenses must include utilities data.");
assertIncludes(floransa, "Tek yön şehir içi bilet: ~1,70€", "Floransa transportCost must include one-way ticket data.");
assertIncludes(floransa, "1 odalı daire: merkezde ~1.230€", "Floransa rentAverage must include centre 1BR rent.");
assertIncludes(floransa, "merkez dışında ~844,77€", "Floransa rentAverage must include outside-centre 1BR rent.");

assertIncludes(venedik, 'name: "Venedik"', "Venedik must use the app city key.");
assertIncludes(venedik, 'nameEn: "Venice"', "Venedik must keep the English city name.");
assertIncludes(venedik, 'costSourceName: "Numbeo"', "Venedik must keep its Numbeo source metadata.");
assertIncludes(
  venedik,
  'costSourceUrl: "https://www.numbeo.com/cost-of-living/in/Venice"',
  "Venedik must keep the source URL used for the cost fields."
);
assertIncludes(venedik, 'costSourceLastUpdated: "2026-05-04"', "Venedik must keep Numbeo last update date.");
assertIncludes(venedik, "Ucuz restoran: ~20€", "Venedik livingExpenses must include inexpensive meal data.");
assertIncludes(venedik, "Cappuccino: ~1,97€", "Venedik livingExpenses must include cappuccino data.");
assertIncludes(venedik, "85 m² temel faturalar: ~242€", "Venedik livingExpenses must include utilities data.");
assertIncludes(venedik, "Tek yön şehir içi bilet: ~1,50€", "Venedik transportCost must include one-way ticket data.");
assertIncludes(venedik, "1 odalı daire: merkezde ~1.126€", "Venedik rentAverage must include centre 1BR rent.");
assertIncludes(venedik, "merkez dışında ~637,50€", "Venedik rentAverage must include outside-centre 1BR rent.");

assertIncludes(verona, 'name: "Verona"', "Verona must use the app city key.");
assertIncludes(verona, 'costSourceName: "Numbeo"', "Verona must keep its Numbeo source metadata.");
assertIncludes(
  verona,
  'costSourceUrl: "https://www.numbeo.com/cost-of-living/in/Verona"',
  "Verona must keep the source URL used for the cost fields."
);
assertIncludes(verona, 'costSourceLastUpdated: "2026-05-18"', "Verona must keep Numbeo last update date.");
assertIncludes(verona, "Ucuz restoran: ~18€", "Verona livingExpenses must include inexpensive meal data.");
assertIncludes(verona, "Cappuccino: ~1,83€", "Verona livingExpenses must include cappuccino data.");
assertIncludes(verona, "85 m² temel faturalar: ~172,39€", "Verona livingExpenses must include utilities data.");
assertIncludes(verona, "Tek yön şehir içi bilet: ~1,80€", "Verona transportCost must include one-way ticket data.");
assertIncludes(verona, "1 odalı daire: merkezde ~868,33€", "Verona rentAverage must include centre 1BR rent.");
assertIncludes(verona, "merkez dışında ~606,67€", "Verona rentAverage must include outside-centre 1BR rent.");

assertIncludes(padova, 'name: "Padova"', "Padova must use the app city key.");
assertIncludes(padova, 'nameEn: "Padua"', "Padova must keep the English city name.");
assertIncludes(padova, 'costSourceName: "Numbeo"', "Padova must keep its Numbeo source metadata.");
assertIncludes(
  padova,
  'costSourceUrl: "https://www.numbeo.com/cost-of-living/in/Padova"',
  "Padova must keep the source URL used for the cost fields."
);
assertIncludes(padova, 'costSourceLastUpdated: "2026-05-11"', "Padova must keep Numbeo last update date.");
assertIncludes(padova, "Ucuz restoran: ~20€", "Padova livingExpenses must include inexpensive meal data.");
assertIncludes(padova, "Cappuccino: ~1,79€", "Padova livingExpenses must include cappuccino data.");
assertIncludes(padova, "85 m² temel faturalar: ~226,13€", "Padova livingExpenses must include utilities data.");
assertIncludes(padova, "Tek yön şehir içi bilet: ~1,70€", "Padova transportCost must include one-way ticket data.");
assertIncludes(padova, "1 odalı daire: merkezde ~956,44€", "Padova rentAverage must include centre 1BR rent.");
assertIncludes(padova, "merkez dışında ~732,89€", "Padova rentAverage must include outside-centre 1BR rent.");

assertIncludes(parma, 'name: "Parma"', "Parma must use the app city key.");
assertIncludes(parma, 'costSourceName: "Numbeo"', "Parma must keep its Numbeo source metadata.");
assertIncludes(
  parma,
  'costSourceUrl: "https://www.numbeo.com/cost-of-living/in/Parma"',
  "Parma must keep the source URL used for the cost fields."
);
assertIncludes(parma, 'costSourceLastUpdated: "2026-05-04"', "Parma must keep Numbeo last update date.");
assertIncludes(parma, "Ucuz restoran: ~18€", "Parma livingExpenses must include inexpensive meal data.");
assertIncludes(parma, "Cappuccino: ~2,20€", "Parma livingExpenses must include cappuccino data.");
assertIncludes(parma, "85 m² temel faturalar: ~209,85€", "Parma livingExpenses must include utilities data.");
assertIncludes(parma, "Tek yön şehir içi bilet: ~1,70€", "Parma transportCost must include one-way ticket data.");
assertIncludes(parma, "1 odalı daire: merkezde ~790€", "Parma rentAverage must include centre 1BR rent.");
assertIncludes(parma, "merkez dışında ~578€", "Parma rentAverage must include outside-centre 1BR rent.");

assertIncludes(pisa, 'name: "Pisa"', "Pisa must use the app city key.");
assertIncludes(pisa, 'costSourceName: "Numbeo"', "Pisa must keep its Numbeo source metadata.");
assertIncludes(
  pisa,
  'costSourceUrl: "https://www.numbeo.com/cost-of-living/in/Pisa"',
  "Pisa must keep the source URL used for the cost fields."
);
assertIncludes(pisa, 'costSourceLastUpdated: "2026-05-10"', "Pisa must keep Numbeo last update date.");
assertIncludes(pisa, "Ucuz restoran: ~17€", "Pisa livingExpenses must include inexpensive meal data.");
assertIncludes(pisa, "Cappuccino: ~1,79€", "Pisa livingExpenses must include cappuccino data.");
assertIncludes(pisa, "85 m² temel faturalar: ~320€", "Pisa livingExpenses must include utilities data.");
assertIncludes(pisa, "Tek yön şehir içi bilet: ~2€", "Pisa transportCost must include one-way ticket data.");
assertIncludes(pisa, "1 odalı daire: merkezde ~903,54€", "Pisa rentAverage must include centre 1BR rent.");
assertIncludes(pisa, "merkez dışında ~706,76€", "Pisa rentAverage must include outside-centre 1BR rent.");

assertIncludes(siena, 'name: "Siena"', "Siena must use the app city key.");
assertIncludes(siena, 'costSourceName: "Numbeo"', "Siena must keep its Numbeo source metadata.");
assertIncludes(
  siena,
  'costSourceUrl: "https://www.numbeo.com/cost-of-living/in/Siena"',
  "Siena must keep the source URL used for the cost fields."
);
assertIncludes(siena, 'costSourceLastUpdated: "2026-05-04"', "Siena must keep Numbeo last update date.");
assertIncludes(siena, "Ucuz restoran: ~14€", "Siena livingExpenses must include inexpensive meal data.");
assertIncludes(siena, "Cappuccino: ~1,68€", "Siena livingExpenses must include cappuccino data.");
assertIncludes(siena, "85 m² temel faturalar: ~157,60€", "Siena livingExpenses must include utilities data.");
assertIncludes(siena, "Tek yön şehir içi bilet: ~1,70€", "Siena transportCost must include one-way ticket data.");
assertIncludes(siena, "1 odalı daire: merkezde ~1.016,67€", "Siena rentAverage must include centre 1BR rent.");
assertIncludes(siena, "merkez dışında ~662,50€", "Siena rentAverage must include outside-centre 1BR rent.");

assertIncludes(pavia, 'name: "Pavia"', "Pavia must use the app city key.");
assertIncludes(pavia, 'costSourceName: "Numbeo"', "Pavia must keep its Numbeo source metadata.");
assertIncludes(
  pavia,
  'costSourceUrl: "https://www.numbeo.com/cost-of-living/in/Pavia"',
  "Pavia must keep the source URL used for the cost fields."
);
assertIncludes(pavia, 'costSourceLastUpdated: "2026-05-04"', "Pavia must keep Numbeo last update date.");
assertIncludes(pavia, "Ucuz restoran: ~15€", "Pavia livingExpenses must include inexpensive meal data.");
assertIncludes(pavia, "Cappuccino: ~1,53€", "Pavia livingExpenses must include cappuccino data.");
assertIncludes(pavia, "85 m² temel faturalar: ~179,35€", "Pavia livingExpenses must include utilities data.");
assertIncludes(pavia, "Tek yön şehir içi bilet: ~1,60€", "Pavia transportCost must include one-way ticket data.");
assertIncludes(pavia, "1 odalı daire: merkezde ~578,50€", "Pavia rentAverage must include centre 1BR rent.");
assertIncludes(pavia, "merkez dışında ~452,25€", "Pavia rentAverage must include outside-centre 1BR rent.");

assertIncludes(trieste, 'name: "Trieste"', "Trieste must use the app city key.");
assertIncludes(trieste, 'costSourceName: "Numbeo"', "Trieste must keep its Numbeo source metadata.");
assertIncludes(
  trieste,
  'costSourceUrl: "https://www.numbeo.com/cost-of-living/in/Trieste"',
  "Trieste must keep the source URL used for the cost fields."
);
assertIncludes(trieste, 'costSourceLastUpdated: "2026-05-13"', "Trieste must keep Numbeo last update date.");
assertIncludes(trieste, "Ucuz restoran: ~18€", "Trieste livingExpenses must include inexpensive meal data.");
assertIncludes(trieste, "Cappuccino: ~1,92€", "Trieste livingExpenses must include cappuccino data.");
assertIncludes(trieste, "85 m² temel faturalar: ~194,47€", "Trieste livingExpenses must include utilities data.");
assertIncludes(trieste, "Tek yön şehir içi bilet: ~1,45€", "Trieste transportCost must include one-way ticket data.");
assertIncludes(trieste, "1 odalı daire: merkezde ~727,50€", "Trieste rentAverage must include centre 1BR rent.");
assertIncludes(trieste, "merkez dışında ~588,33€", "Trieste rentAverage must include outside-centre 1BR rent.");

assertIncludes(ancona, 'name: "Ancona"', "Ancona must use the app city key.");
assertIncludes(ancona, 'costSourceName: "Numbeo"', "Ancona must keep its Numbeo source metadata.");
assertIncludes(
  ancona,
  'costSourceUrl: "https://www.numbeo.com/cost-of-living/in/Ancona"',
  "Ancona must keep the source URL used for the cost fields."
);
assertIncludes(ancona, 'costSourceLastUpdated: "2026-05-04"', "Ancona must keep Numbeo last update date.");
assertIncludes(ancona, "Ucuz restoran: ~15€", "Ancona livingExpenses must include inexpensive meal data.");
assertIncludes(ancona, "Cappuccino: ~1,77€", "Ancona livingExpenses must include cappuccino data.");
assertIncludes(ancona, "85 m² temel faturalar: ~247€", "Ancona livingExpenses must include utilities data.");
assertIncludes(ancona, "Tek yön şehir içi bilet: ~1,50€", "Ancona transportCost must include one-way ticket data.");
assertIncludes(ancona, "1 odalı daire: merkezde ~530€", "Ancona rentAverage must include centre 1BR rent.");
assertIncludes(ancona, "merkez dışında ~424€", "Ancona rentAverage must include outside-centre 1BR rent.");

assertIncludes(bari, 'name: "Bari"', "Bari must use the app city key.");
assertIncludes(bari, 'costSourceName: "Numbeo"', "Bari must keep its Numbeo source metadata.");
assertIncludes(
  bari,
  'costSourceUrl: "https://www.numbeo.com/cost-of-living/in/Bari"',
  "Bari must keep the source URL used for the cost fields."
);
assertIncludes(bari, 'costSourceLastUpdated: "2026-05-04"', "Bari must keep Numbeo last update date.");
assertIncludes(bari, "Ucuz restoran: ~15€", "Bari livingExpenses must include inexpensive meal data.");
assertIncludes(bari, "Cappuccino: ~1,74€", "Bari livingExpenses must include cappuccino data.");
assertIncludes(bari, "85 m² temel faturalar: ~214,76€", "Bari livingExpenses must include utilities data.");
assertIncludes(bari, "Tek yön şehir içi bilet: ~1€", "Bari transportCost must include one-way ticket data.");
assertIncludes(bari, "1 odalı daire: merkezde ~800€", "Bari rentAverage must include centre 1BR rent.");
assertIncludes(bari, "merkez dışında ~597,75€", "Bari rentAverage must include outside-centre 1BR rent.");

assertIncludes(napoli, 'name: "Napoli"', "Napoli must use the app city key.");
assertIncludes(napoli, 'nameEn: "Naples"', "Napoli must keep the English city name.");
assertIncludes(napoli, 'costSourceName: "Numbeo"', "Napoli must keep its Numbeo source metadata.");
assertIncludes(
  napoli,
  'costSourceUrl: "https://www.numbeo.com/cost-of-living/in/Naples"',
  "Napoli must keep the source URL used for the cost fields."
);
assertIncludes(napoli, 'costSourceLastUpdated: "2026-05-14"', "Napoli must keep Numbeo last update date.");
assertIncludes(napoli, "Ucuz restoran: ~15,50€", "Napoli livingExpenses must include inexpensive meal data.");
assertIncludes(napoli, "Cappuccino: ~1,94€", "Napoli livingExpenses must include cappuccino data.");
assertIncludes(napoli, "85 m² temel faturalar: ~188,48€", "Napoli livingExpenses must include utilities data.");
assertIncludes(napoli, "Tek yön şehir içi bilet: ~1,50€", "Napoli transportCost must include one-way ticket data.");
assertIncludes(napoli, "1 odalı daire: merkezde ~966€", "Napoli rentAverage must include centre 1BR rent.");
assertIncludes(napoli, "merkez dışında ~612,20€", "Napoli rentAverage must include outside-centre 1BR rent.");

assertIncludes(
  cityExplorerSource,
  'htmlFor="mobile-city-selector"',
  "Mobile city selector must have a programmatically associated label."
);
assertIncludes(
  cityExplorerSource,
  'id="mobile-city-selector"',
  "Mobile city selector must expose a stable control id."
);
assertIncludes(
  cityExplorerSource,
  "value={activeCitySlug}",
  "Mobile city selector must reflect the active city slug."
);
assertIncludes(
  cityExplorerSource,
  "handleSelectCity(event.target.value)",
  "Mobile city selector must reuse the existing city selection flow."
);
assertIncludes(
  cityExplorerSource,
  "lg:hidden",
  "Mobile city selector must be hidden at the desktop breakpoint."
);
assertIncludes(
  cityExplorerSource,
  "hidden min-w-0 lg:block",
  "The long city directory must be hidden below the desktop breakpoint."
);
assertIncludes(
  translationsSource,
  'citySelectorLabel: "Şehir seç"',
  "Turkish mobile city selector copy is required."
);
assertIncludes(
  translationsSource,
  'citySelectorLabel: "Choose a city"',
  "English mobile city selector copy is required."
);

const universityCountExpression = 'copy.universityCount[city.count === 1 ? "one" : "other"]';
const universityCountLabelUses = cityExplorerSource.split(universityCountExpression).length - 1;

if (universityCountLabelUses !== 2) {
  throw new Error(
    "City cards and the mobile selector must label city counts as universities."
  );
}

assertIncludes(
  translationsSource,
  'universityCount: { one: "üniversite", other: "üniversite" }',
  "Turkish city university count copy is required."
);
assertIncludes(
  translationsSource,
  'universityCount: { one: "university", other: "universities" }',
  "English city university count copy must support singular and plural labels."
);

console.log("[OK] City data source checks passed.");
