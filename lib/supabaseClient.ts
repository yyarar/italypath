import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

type AccessTokenProvider = () => Promise<string | null>;

/**
 * Clerk token'ı ile RLS uyumlu Supabase client üretir.
 * Not: Bunun çalışması için Clerk Dashboard'da "supabase" JWT template'i tanımlı olmalıdır.
 */
export function createClerkSupabaseClient(getAccessToken: AccessTokenProvider) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    accessToken: getAccessToken,
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
