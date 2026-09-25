import { validateExpertLeadPayload } from "@/lib/mentor/expertLeadValidation";
import { storeExpertLead } from "@/lib/mentor/expertLeads.server";

export const dynamic = "force-dynamic";

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
    return json({ ok: true }, 200);
  }
  if (validation.kind === "invalid") {
    return json({ ok: false, errors: validation.errors }, 400);
  }

  try {
    const result = await storeExpertLead(validation.value);
    if (result === "rate_limited") {
      return json({ ok: false, error: "rate_limited" }, 429);
    }
    return json({ ok: true }, result === "created" ? 201 : 200);
  } catch (error) {
    console.error("Expert lead submission failed:", error);
    return json({ ok: false, error: "temporarily_unavailable" }, 503);
  }
}
