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

export async function POST(request: Request) {
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
    return json({ ok: true }, result === "created" ? 201 : 200);
  } catch (error) {
    console.error("Expert lead submission failed:", error);
    return json({ ok: false, error: "temporarily_unavailable" }, 503);
  }
}
