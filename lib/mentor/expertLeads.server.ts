import "server-only";

import { createClient } from "@supabase/supabase-js";

import type { ExpertLeadSubmission } from "@/lib/mentor/expertLeads";

function createServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("expert_leads_server_unconfigured");

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function storeExpertLead(
  value: ExpertLeadSubmission,
): Promise<"created" | "duplicate"> {
  const { error } = await createServiceRoleClient().from("expert_leads").insert({
    submission_id: value.submissionId,
    full_name: value.fullName,
    whatsapp_phone: value.whatsappPhone,
    study_level: value.studyLevel,
    field_of_interest: value.fieldOfInterest,
    target_intake: value.targetIntake,
    help_request: value.helpRequest,
  });

  if (!error) return "created";
  if (
    error.code === "23505" &&
    error.message.includes("expert_leads_submission_id_key")
  ) {
    return "duplicate";
  }

  throw new Error(`expert_lead_insert_failed:${error.code ?? "unknown"}`);
}
