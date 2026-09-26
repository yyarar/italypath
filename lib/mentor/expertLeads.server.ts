import "server-only";

import { createClient } from "@supabase/supabase-js";

import {
  EXPERT_LEAD_INSERT_TIMEOUT_MS,
  type ExpertLeadSubmission,
} from "@/lib/mentor/expertLeads";
import type { ExpertLeadField } from "@/lib/mentor/expertLeadValidation";

export type ExpertLeadStoreResult =
  | { kind: "created" }
  | { kind: "duplicate" }
  | { kind: "rate_limited" }
  | { kind: "timed_out" }
  | { kind: "rejected"; field: ExpertLeadField | null };

// Check constraints in supabase/expert_leads.sql, keyed to the form field they guard.
const CONSTRAINT_FIELDS: Record<string, ExpertLeadField> = {
  expert_leads_full_name_check: "fullName",
  expert_leads_phone_check: "whatsappPhone",
  expert_leads_study_level_check: "studyLevel",
  expert_leads_field_check: "fieldOfInterest",
  expert_leads_target_intake_check: "targetIntake",
  expert_leads_help_request_check: "helpRequest",
};

function rejectedField(message: string): ExpertLeadField | null {
  const constraint = Object.keys(CONSTRAINT_FIELDS).find((name) =>
    message.includes(name),
  );
  return constraint ? CONSTRAINT_FIELDS[constraint] : null;
}

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
): Promise<ExpertLeadStoreResult> {
  // A stalled database call ends here, not at the platform's function limit,
  // so the route can answer with a JSON 503 the form knows how to explain.
  const timeout = AbortSignal.timeout(EXPERT_LEAD_INSERT_TIMEOUT_MS);
  const { error } = await createServiceRoleClient()
    .from("expert_leads")
    .insert({
      submission_id: value.submissionId,
      full_name: value.fullName,
      whatsapp_phone: value.whatsappPhone,
      study_level: value.studyLevel,
      field_of_interest: value.fieldOfInterest,
      target_intake: value.targetIntake,
      help_request: value.helpRequest,
    })
    .abortSignal(timeout);

  if (!error) return { kind: "created" };
  if (timeout.aborted) return { kind: "timed_out" };
  if (
    error.code === "23505" &&
    error.message.includes("expert_leads_submission_id_key")
  ) {
    return { kind: "duplicate" };
  }
  // Raised by the hourly cap trigger in supabase/expert_leads.sql.
  if (error.message.includes("expert_lead_rate_limited")) {
    return { kind: "rate_limited" };
  }
  // Input the validator let through but Postgres refuses (a check constraint,
  // or a character the database encoding cannot store) is the sender's input,
  // not an outage.
  if (error.code === "23514" || error.code === "22P05") {
    return { kind: "rejected", field: rejectedField(error.message) };
  }

  throw new Error(`expert_lead_insert_failed:${error.code ?? "unknown"}`);
}
