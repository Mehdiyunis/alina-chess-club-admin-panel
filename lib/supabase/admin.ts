import 'server-only';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let adminClientInstance: SupabaseClient | null = null;

export function getAdminClient(): SupabaseClient {
  if (adminClientInstance) {
    return adminClientInstance;
  }

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY və ya NEXT_PUBLIC_SUPABASE_URL mühit dəyişəni təyin edilməyib.'
    );
  }

  adminClientInstance = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return adminClientInstance;
}
