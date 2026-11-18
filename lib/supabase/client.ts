import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function getMissingEnvVars(): string[] {
  const missing: string[] = [];
  if (!supabaseUrl || supabaseUrl.trim() === '') {
    missing.push('NEXT_PUBLIC_SUPABASE_URL');
  }
  if (!supabaseAnonKey || supabaseAnonKey.trim() === '') {
    missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }
  return missing;
}

export const isSupabaseConfigured = getMissingEnvVars().length === 0;

if (!isSupabaseConfigured && typeof window !== 'undefined') {
  const missing = getMissingEnvVars();
  console.error(
    `[Supabase] Supabase ayarları tapılmadı! Çatışmayan mühit dəyişənləri: ${missing.join(', ')}`
  );
}

// Single shared client instance, reused everywhere across the application
let sharedClient: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (sharedClient) {
    return sharedClient;
  }

  const missing = getMissingEnvVars();
  if (missing.length > 0) {
    if (typeof window !== 'undefined') {
      console.error(
        `[Supabase] Supabase ayarları tapılmadı! Çatışmayan dəyişənlər: ${missing.join(', ')}`
      );
    }
    // Return a dummy client proxy that will throw readable error on call if not configured
    return createBrowserClient(
      supabaseUrl || 'https://placeholder-project.supabase.co',
      supabaseAnonKey || 'placeholder-anon-key'
    );
  }

  sharedClient = createBrowserClient(supabaseUrl!, supabaseAnonKey!);
  return sharedClient;
}

export const supabase = getSupabase();

export function createClient(): SupabaseClient {
  return getSupabase();
}
