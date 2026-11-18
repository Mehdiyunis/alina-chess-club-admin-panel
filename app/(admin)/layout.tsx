import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AdminShell } from '@/components/layout/AdminShell';
import { EnvErrorScreen } from '@/components/ui/EnvErrorScreen';
import { UnauthorizedScreen } from '@/components/ui/UnauthorizedScreen';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return <EnvErrorScreen />;
  }

  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return <EnvErrorScreen />;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Verify role in public.admin_profiles (NOT public.profiles)
  const { data: adminProfile, error } = await supabase
    .from('admin_profiles')
    .select('id, email, full_name, role, created_at')
    .eq('id', user.id)
    .maybeSingle();

  if (error) {
    console.error('[Supabase Server] admin_profiles xətası:', error);
    return <UnauthorizedScreen />;
  }

  if (!adminProfile) {
    return <UnauthorizedScreen />;
  }

  return (
    <AdminShell
      adminName={adminProfile.full_name || adminProfile.email || user.email || 'Admin'}
      adminRole={adminProfile.role}
    >
      {children}
    </AdminShell>
  );
}
