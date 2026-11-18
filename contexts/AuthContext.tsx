'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { AdminProfile, AdminRole } from '@/lib/types';
import { getFriendlyErrorMessage } from '@/lib/utils';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  adminProfile: AdminProfile | null;
  role: AdminRole | null;
  loading: boolean;
  isAdministrator: boolean;
  isWorker: boolean;
  isViewer: boolean;
  canEdit: boolean; // administrator or worker can create/edit/delete content
  canManageRoles: boolean; // only administrator can delete accounts or change roles
  error: string | null;
  setError: (err: string | null) => void;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Load role from admin_profiles
  const loadAdminProfile = useCallback(async (userId: string): Promise<AdminProfile | null> => {
    try {
      const { data, error: profileError } = await supabase
        .from('admin_profiles')
        .select('id, email, full_name, role, created_at')
        .eq('id', userId)
        .maybeSingle();

      if (profileError) {
        console.error('[Supabase] admin_profiles sorğusu xətası:', profileError);
        const friendly = getFriendlyErrorMessage(profileError);
        setError(friendly);
        return null;
      }

      if (!data) {
        console.warn('[Supabase] İstifadəçi üçün admin_profiles qeydi tapılmadı:', userId);
        return null;
      }

      return data as AdminProfile;
    } catch (err) {
      console.error('[Supabase] Gözlənilməz profil yükləmə xətası:', err);
      setError(getFriendlyErrorMessage(err));
      return null;
    }
  }, []);

  // Initial session & role loading
  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      if (!isSupabaseConfigured) {
        if (isMounted) setLoading(false);
        return;
      }

      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('[Supabase] Sessiya xətası:', sessionError);
        }

        const sessionUser = sessionData?.session?.user ?? null;

        if (sessionUser) {
          const profile = await loadAdminProfile(sessionUser.id);
          if (isMounted) {
            if (profile) {
              setUser(sessionUser);
              setAdminProfile(profile);
            } else {
              // No row exists in admin_profiles -> sign out immediately
              await supabase.auth.signOut();
              setUser(null);
              setAdminProfile(null);
            }
          }
        } else {
          if (isMounted) {
            setUser(null);
            setAdminProfile(null);
          }
        }
      } catch (err) {
        console.error('[Supabase] Auth inisializasiya xətası:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    initAuth();

    // Listen to auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      const sessionUser = session?.user ?? null;

      if (!sessionUser || event === 'SIGNED_OUT') {
        if (isMounted) {
          setUser(null);
          setAdminProfile(null);
          setLoading(false);
        }
        return;
      }

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        const profile = await loadAdminProfile(sessionUser.id);
        if (isMounted) {
          if (profile) {
            setUser(sessionUser);
            setAdminProfile(profile);
          } else {
            // User signed in but has no admin_profiles row
            await supabase.auth.signOut();
            setUser(null);
            setAdminProfile(null);
            setError('Bu hesabın admin panelə girişi yoxdur.');
          }
          setLoading(false);
        }
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [loadAdminProfile]);

  // Sign in flow
  const signIn = useCallback(
    async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
      setError(null);

      if (!isSupabaseConfigured) {
        const msg = 'Supabase ayarları tapılmadı. Mühit dəyişənlərini yoxlayın.';
        setError(msg);
        return { success: false, error: msg };
      }

      try {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (authError) {
          console.error('[Supabase Auth Error]:', authError);
          const friendlyMsg = getFriendlyErrorMessage(authError);
          setError(friendlyMsg);
          return { success: false, error: friendlyMsg };
        }

        if (!authData.user) {
          const msg = 'İstifadəçi tapılmadı.';
          setError(msg);
          return { success: false, error: msg };
        }

        // Load role from admin_profiles
        const { data: profile, error: profileError } = await supabase
          .from('admin_profiles')
          .select('id, email, full_name, role, created_at')
          .eq('id', authData.user.id)
          .maybeSingle();

        if (profileError) {
          console.error('[Supabase admin_profiles error]:', profileError);
          // Sign out immediately on role loading failure
          await supabase.auth.signOut();
          const friendlyMsg = getFriendlyErrorMessage(profileError);
          setError(friendlyMsg);
          return { success: false, error: friendlyMsg };
        }

        if (!profile) {
          // No row in admin_profiles
          console.warn('[Supabase] admin_profiles qeydi yoxdur, çıxış edilir:', authData.user.id);
          await supabase.auth.signOut();
          const noAccessMsg = 'Bu hesabın admin panelə girişi yoxdur.';
          setError(noAccessMsg);
          return { success: false, error: noAccessMsg };
        }

        // Store user and role in global auth context
        setUser(authData.user);
        setAdminProfile(profile as AdminProfile);
        return { success: true };
      } catch (err) {
        console.error('[Supabase Unexpected Login Error]:', err);
        const friendlyMsg = getFriendlyErrorMessage(err);
        setError(friendlyMsg);
        return { success: false, error: friendlyMsg };
      }
    },
    []
  );

  // Sign out flow
  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('[Supabase] Çıxış zamanı xəta:', err);
    } finally {
      setUser(null);
      setAdminProfile(null);
      setError(null);
      router.push('/login');
    }
  }, [router]);

  // Refresh profile
  const refreshProfile = useCallback(async () => {
    if (!user) return;
    const profile = await loadAdminProfile(user.id);
    if (profile) {
      setAdminProfile(profile);
    }
  }, [user, loadAdminProfile]);

  const role = adminProfile?.role ?? null;
  const isAdministrator = role === 'administrator';
  const isWorker = role === 'worker';
  const isViewer = role === 'viewer';

  // administrator: everything
  // worker: everything except deleting accounts and changing roles
  // viewer: only navigation and viewing, no create/edit/delete buttons
  const canEdit = isAdministrator || isWorker;
  const canManageRoles = isAdministrator;

  const value = useMemo(
    () => ({
      user,
      adminProfile,
      role,
      loading,
      isAdministrator,
      isWorker,
      isViewer,
      canEdit,
      canManageRoles,
      error,
      setError,
      signIn,
      signOut,
      refreshProfile,
    }),
    [
      user,
      adminProfile,
      role,
      loading,
      isAdministrator,
      isWorker,
      isViewer,
      canEdit,
      canManageRoles,
      error,
      signIn,
      signOut,
      refreshProfile,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
