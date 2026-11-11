import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/**
 * Checks whether the server-only SUPABASE_SECRET_KEY environment variable is configured.
 * Never expose this key with NEXT_PUBLIC_ prefix.
 */
export function hasAdminKey(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SECRET_KEY
  );
}

/**
 * Returns a privileged Supabase client using the server-only Secret Key.
 * Only call this in server-side code after verifying caller authorization.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!url || !secretKey) {
    console.error('[admin-client] Missing server Supabase configuration.');
    throw new Error(
      'Layanan administrasi server belum siap. Silakan hubungi administrator sistem.'
    );
  }

  return createSupabaseClient(url, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
