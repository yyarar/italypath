import { verifyWebhook, type WebhookEvent } from "@clerk/nextjs/webhooks";
import type { NextRequest } from "next/server";

import { deleteClerkUserData } from "@/lib/account/deleteUserData.server";
import { isClerkUserId } from "@/lib/account/userDataDeletion";

export const dynamic = "force-dynamic";

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

// Clerk hesap olaylari. Adres herkese aciktir (proxy.ts allowlist); istek yalniz Clerk
// panelindeki uc noktanin imza sirriyla (CLERK_WEBHOOK_SIGNING_SECRET) dogrulanirsa islenir.
// 2xx disindaki cevaplari Clerk yeniden dener; silme adimlari tekrar calismaya dayaniklidir.
export async function POST(request: NextRequest) {
  if (!process.env.CLERK_WEBHOOK_SIGNING_SECRET) {
    console.error("Clerk webhook: signing secret is not configured");
    return json({ ok: false, error: "unconfigured" }, 503);
  }

  let event: WebhookEvent;
  try {
    event = await verifyWebhook(request);
  } catch {
    return json({ ok: false, error: "invalid_signature" }, 400);
  }

  if (event.type !== "user.deleted") {
    return json({ ok: true }, 200);
  }

  const userId = event.data.id;
  if (!isClerkUserId(userId)) {
    console.error("Clerk webhook: user.deleted event without a valid user id");
    return json({ ok: false, error: "invalid_user_id" }, 400);
  }

  try {
    const result = await deleteClerkUserData(userId);
    // Yalniz sayilar yazilir; kimlik gunlukte tutulmaz (olay Clerk panelinde gorunur).
    console.info("Clerk webhook: account data deleted", result);
    return json({ ok: true }, 200);
  } catch (error) {
    console.error(
      "Clerk webhook: account data deletion failed",
      error instanceof Error ? error.message : "unknown",
    );
    return json({ ok: false, error: "deletion_failed" }, 500);
  }
}
