import { validateExpertLeadPayload } from "@/lib/mentor/expertLeadValidation";
import { storeExpertLead } from "@/lib/mentor/expertLeads.server";

export const dynamic = "force-dynamic";
// Body parsing plus one bounded insert (EXPERT_LEAD_INSERT_TIMEOUT_MS, 10 s) fit
// inside this; the cap keeps a stalled request from holding the function open
// and stays well under the Vercel Hobby limit.
export const maxDuration = 15;

const MAX_BODY_BYTES = 20_000;
const NO_STORE_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store, max-age=0",
};

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: NO_STORE_HEADERS,
  });
}

// One response for every accepted submission: a stored lead, a retry of an
// already stored lead and a honeypot hit are indistinguishable from outside, so
// a bot cannot learn whether its submission was kept (#47). The form reads only
// `ok`.
function accepted() {
  return json({ ok: true }, 200);
}

// Only the site's own form may post here: a JSON content type forces a CORS
// preflight (which this route never approves) and a present Origin must match
// the host, so other sites cannot relay spam through their visitors' browsers.
function isSameSiteJsonRequest(request: Request): boolean {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("application/json")) return false;

  const origin = request.headers.get("origin");
  if (!origin) return true;
  const siteHosts = [
    request.headers.get("x-forwarded-host"),
    request.headers.get("host"),
  ].filter(Boolean);
  try {
    return siteHosts.includes(new URL(origin).host);
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  if (!isSameSiteJsonRequest(request)) {
    return json({ ok: false, error: "forbidden" }, 403);
  }

  let body: unknown;

  try {
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
      return json({ ok: false, error: "invalid_json" }, 400);
    }
    body = JSON.parse(rawBody);
  } catch {
    return json({ ok: false, error: "invalid_json" }, 400);
  }

  const validation = validateExpertLeadPayload(body);
  if (validation.kind === "honeypot") {
    return accepted();
  }
  if (validation.kind === "invalid") {
    return json({ ok: false, errors: validation.errors }, 400);
  }

  try {
    const result = await storeExpertLead(validation.value);
    if (result.kind === "rate_limited") {
      return json({ ok: false, error: "rate_limited" }, 429);
    }
    if (result.kind === "timed_out") {
      console.error("Expert lead insert timed out");
      return json({ ok: false, error: "timeout" }, 503);
    }
    if (result.kind === "rejected") {
      return json(
        result.field
          ? { ok: false, errors: { [result.field]: "invalid" } }
          : { ok: false, error: "invalid_input" },
        400,
      );
    }
    return accepted();
  } catch (error) {
    console.error("Expert lead submission failed:", error);
    return json({ ok: false, error: "temporarily_unavailable" }, 503);
  }
}
