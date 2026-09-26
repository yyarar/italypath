// Ogrenciye "resmî" diye gosterilen linklerin tek izin listesi ve URL kurallari
// (2026-09-26, guvenlik denetimi G3#1, G3#2, G3#4, G2#5).
//
// Ayni dosya uc yerde kullanilir, bu yuzden bagimliligi yoktur ve duz .mjs'dir:
// - program sayfasi (tipler: officialLinkHosts.d.mts): link yalnizca gecerli http(s) ise
//   gosterilir, yaninda hedef alan adi ve gerekirse "ortak program sitesi" etiketi yazar;
// - scripts/lib/program-details-import.mjs: import-*-program-details betikleri listede
//   olmayan host gorunce --apply'i durdurur;
// - scripts/check-program-details.mjs: canli verideki tum linkleri denetler.
//
// Eslesme nokta sinirlidir: host === alan adi veya host "." + alan adi ile biter.
// "unibz.it" -> "www.unibz.it" ve "guide.unibz.it" gecer, "evilunibz.it" gecmez.
//
// Yeni okul veya yeni ortak program sitesi eklemek bilincli bir karardir: once kaynagi
// kontrol et, sonra bu listeye ekle (Kerem onayi). Liste 2026-09-26 canli verisinden
// (941 kabul dosyasi, 4 link turu) cikarildi.

/** Okulun kendi alan adlari (universities.id -> alan adlari). */
export const SCHOOL_DOMAINS = Object.freeze({
  1: ["polimi.it"],
  2: ["uniroma1.it"],
  3: ["unibo.it"],
  4: ["unipd.it"],
  5: ["polito.it"],
  // records-unibz.siavcloud.com: unibz'in resmi yonetmelik ve ilan sistemi (dis saglayicida).
  6: ["unibz.it", "records-unibz.siavcloud.com"],
  7: ["unibocconi.it", "unibocconi.eu"],
  8: ["unicatt.it", "unicatt.eu"],
  9: ["unive.it"],
  10: ["unimi.it"],
  11: ["unito.it"],
  12: ["luiss.it"],
  13: ["uniroma2.it"],
  14: ["unina.it"],
  15: ["unipv.it", "unipv.eu"],
  16: ["unisi.it"],
  17: ["unime.it"],
  18: ["unitn.it"],
  19: ["unipi.it"],
  20: ["unige.it"],
  21: ["units.it"],
  22: ["univpm.it"],
  23: ["unipr.it"],
  24: ["unicampania.it"],
  25: ["unipa.it"],
  26: ["unibg.it"],
  27: ["unibs.it"],
  28: ["univr.it"],
  29: ["unimib.it"],
  30: ["unicam.it"],
  31: ["unicas.it"],
  32: ["unitus.it"],
  33: ["unipg.it"],
  35: ["uniparthenope.it"],
  37: ["uniud.it"],
  38: ["unimc.it"],
  40: ["uniss.it"],
  41: ["unicamillus.org"],
  // linkinternational.eu: "Link International | Link Campus University of Rome" (2026-09-26 kontrolu).
  42: ["unilink.it", "linkinternational.eu"],
  // unier.it -> uer.it yonlendiriyor (2026-09-26 kontrolu).
  43: ["uer.it", "unier.it", "universitaeuropeadiroma.it"],
  44: ["iulm.it"],
  46: ["poliba.it"],
  47: ["unicampus.it"],
  48: ["unite.it"],
  50: ["uninettunouniversity.net"],
  51: ["uniba.it"],
  52: ["unimarconi.it", "unimarconi.com"],
  53: ["unica.it"],
  54: ["liuc.it"],
  55: ["lum.it"],
  56: ["unich.it"],
  57: ["unict.it"],
  59: ["unirc.it"],
  61: ["hunimed.eu"],
  63: ["unifi.it"],
  64: ["unisr.it"],
});

/**
 * Bolum bazinda onayli ortak program siteleri (university_departments.id -> alan adlari):
 * ortak diploma ortagi okul, Erasmus Mundus / konsorsiyum sitesi veya programin kendi sitesi.
 * Yalnizca o bolumun linklerinde gecerlidir.
 */
export const PARTNER_DOMAINS_BY_DEPARTMENT = Object.freeze({
  415: ["unibg.it"],
  432: ["sea-eu.org", "uca.es"],
  688: ["digitalsociety4innovation.eu"],
  755: ["epc-masterdegree.it"],
  776: ["master-mass.eu"],
  780: ["uniroma1.it"],
  781: ["master-cne.eu"],
  794: ["unina.it"],
  881: ["viticolturasostenibile.com"],
  897: ["unibo.it"],
  967: ["unimi.it"],
  1003: ["unimib.it"],
  1010: ["unimi.it"],
  1018: ["unibg.it"],
  1025: ["polimi.it"],
  1027: ["unimi.it"],
  1028: ["usi.ch"],
  1058: ["unibz.it"],
  1067: ["embs.eu"],
  1074: ["securityintelligence-erasmusmundus.eu"],
  1238: ["iphpisa.it"],
  1247: ["transcrime.it"],
  1253: ["master-misei.com"],
  1254: ["susfoods.eu"],
  1281: ["epog.eu"],
  1289: ["mfs-apply.eitfood.eu"],
  1293: ["polito.it"],
  1299: ["posig.info", "posig.uet.edu.al"],
  1300: ["mib.edu"],
  1301: ["mib.edu"],
  1335: ["emtccm.org"],
});

/** Italyan kamu portallari (Universitaly, Bakanlik, CIMEA, Disisleri, Cineca): her okulda gecerli. */
export const PUBLIC_PORTAL_DOMAINS = Object.freeze([
  "universitaly.it",
  "mur.gov.it",
  "cimea.it",
  "esteri.it",
  "cineca.it",
]);

/** Kisaltici ve arsiv adresleri hedefi gizler; hicbir link alanina girmez (G3#4). */
export const BLOCKED_LINK_DOMAINS = Object.freeze([
  "forms.gle",
  "bit.ly",
  "tinyurl.com",
  "goo.gl",
  "t.co",
  "ow.ly",
  "buff.ly",
  "rebrand.ly",
  "is.gd",
  "cutt.ly",
  "shorturl.at",
  "lnkd.in",
  "tiny.cc",
  "archive.org",
  "archive.ph",
  "archive.today",
  "archive.is",
  "archive.li",
  "webcache.googleusercontent.com",
]);

export const MAX_LINK_LENGTH = 2048;

/** Gecerli, bosluksuz, kullanici adi/parola tasimayan http(s) adresi ise URL nesnesi, degilse null. */
export function parseHttpUrl(value) {
  if (typeof value !== "string" || value.length === 0 || value.length > MAX_LINK_LENGTH) return null;
  if (/\s/.test(value)) return null;
  let url;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  if (!url.hostname || url.username || url.password) return null;
  return url;
}

export function normalizeHost(host) {
  return String(host ?? "").trim().toLowerCase().replace(/\.+$/, "");
}

/** Nokta sinirli eslesme: host alan adinin kendisi veya bir alt alan adi mi? */
export function hostMatchesDomain(host, domain) {
  const h = normalizeHost(host);
  const d = normalizeHost(domain);
  if (!h || !d) return false;
  return h === d || h.endsWith(`.${d}`);
}

function matchesAny(host, domains) {
  return (domains ?? []).some((domain) => hostMatchesDomain(host, domain));
}

/** Ekranda gosterilecek kisa alan adi ("www." atilir). */
export function displayLinkHost(host) {
  return normalizeHost(host).replace(/^www\./, "");
}

/**
 * Bir linki okul/bolum baglamina gore siniflar.
 * status: "invalid" (http(s) degil veya bosluklu), "blocked" (kisaltici/arsiv),
 * "school" (okulun kendi alan adi), "partner" (bolum icin onayli ortak site),
 * "public" (kamu portali), "unlisted" (izin listesinde yok).
 */
export function classifyOfficialLink(value, { universityId, departmentId } = {}) {
  const url = parseHttpUrl(value);
  if (!url) return { status: "invalid", url: null, host: null, displayHost: null };
  const host = normalizeHost(url.hostname);
  const base = { url: url.href, host, displayHost: displayLinkHost(host) };
  if (matchesAny(host, BLOCKED_LINK_DOMAINS)) return { status: "blocked", ...base };
  if (matchesAny(host, SCHOOL_DOMAINS[universityId])) return { status: "school", ...base };
  if (departmentId != null && matchesAny(host, PARTNER_DOMAINS_BY_DEPARTMENT[departmentId])) {
    return { status: "partner", ...base };
  }
  if (matchesAny(host, PUBLIC_PORTAL_DOMAINS)) return { status: "public", ...base };
  return { status: "unlisted", ...base };
}

/** Arayuz ve import icin: link ogrenciye tiklanabilir olarak gosterilebilir mi? */
export function isShowableOfficialLinkStatus(status) {
  return status !== "invalid" && status !== "blocked";
}

/** Import icin: link --apply'dan gecer mi? */
export function isAllowedOfficialLinkStatus(status) {
  return status === "school" || status === "partner" || status === "public";
}
