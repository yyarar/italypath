import "server-only";

import { createClient } from "@supabase/supabase-js";

import {
  deleteUserData,
  type UserDataClient,
  type UserDataDeletionResult,
} from "@/lib/account/userDataDeletion";

// Hesap silme RLS'i asmak zorunda: kullanici artik yok, kendi jetonuyla silemez.
function createServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("account_deletion_server_unconfigured");

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function deleteClerkUserData(userId: string): Promise<UserDataDeletionResult> {
  const client: UserDataClient = createServiceRoleClient();
  return deleteUserData(client, userId);
}
