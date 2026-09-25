// Okul adresindeki id parcasinin tek kanonik bicimi: basinda sifir olmayan, en fazla 9 haneli
// pozitif tam sayi (ör. "/universities/3"). Her okulun tek adresi olur; "003" veya yuzde kodlu
// "%33" gibi esdeger bicimler proxy.ts'te sayfa uretiminden ve onbellekten ONCE kanonik adrese
// 308 ile yonlendirilir, sayi olmayan id 404 alir (guvenlik denetimi S9#2, 2026-09-25).
// Saf modul: proxy, sunucu veri katmani ve guard ayni kurali kullanir.

const CANONICAL_UNIVERSITY_ID = /^[1-9]\d{0,8}$/;
const UNIVERSITY_PATH = /^\/universities\/([^/]+)(\/.*)?$/;

export function parseCanonicalUniversityId(segment: string): number | null {
  return CANONICAL_UNIVERSITY_ID.test(segment) ? Number(segment) : null;
}

export type UniversityPathDecision =
  | { kind: "pass" }
  | { kind: "redirect"; pathname: string }
  | { kind: "notFound" };

// pathname: istegin ham (yuzde kodlu olabilir) yolu, ör. request.nextUrl.pathname.
export function resolveUniversityPath(pathname: string): UniversityPathDecision {
  const match = UNIVERSITY_PATH.exec(pathname);
  if (!match) return { kind: "pass" };

  const [, segment, rest = ""] = match;
  if (CANONICAL_UNIVERSITY_ID.test(segment)) return { kind: "pass" };

  let decoded: string;
  try {
    decoded = decodeURIComponent(segment);
  } catch {
    return { kind: "notFound" };
  }

  if (/^\d+$/.test(decoded)) {
    const canonical = decoded.replace(/^0+/, "");
    if (CANONICAL_UNIVERSITY_ID.test(canonical)) {
      return { kind: "redirect", pathname: `/universities/${canonical}${rest}` };
    }
  }

  return { kind: "notFound" };
}
