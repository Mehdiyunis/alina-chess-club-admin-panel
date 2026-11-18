'use client';

import React, { useEffect } from 'react';
import { ShieldAlert, LogOut } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export function UnauthorizedScreen() {
  const router = useRouter();

  useEffect(() => {
    // Automatically sign out user when unauthorized
    const signOutUnauthorizedUser = async () => {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.error('Sign out error:', err);
      }
    };
    signOutUnauthorizedUser();
  }, []);

  const handleReturnToLogin = async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // ignore
    }
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1F3D2F] via-[#2F5D46] to-[#1F3D2F] flex items-center justify-center p-6 text-[#1E2A22]">
      <div className="w-full max-w-md bg-[#FFFFFF] border border-[rgba(26,19,12,0.12)] rounded-2xl p-8 text-center shadow-2xl">
        <div className="w-14 h-14 rounded-full bg-[#B3261E]/10 border border-[#B3261E]/25 text-[#B3261E] mx-auto flex items-center justify-center mb-5">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <h1 className="text-xl font-serif-heading font-medium text-[#1E2A22]">Giriş Qadağandır</h1>
        <p className="mt-3 text-sm text-[#5E6B62] leading-relaxed">
          Bu hesabın admin panelə girişi yoxdur. Hesabınız sistemdən çıxarıldı.
        </p>

        <div className="mt-6">
          <button
            onClick={handleReturnToLogin}
            className="w-full py-2.5 px-6 bg-[#2F5D46] hover:bg-[#254B38] text-[#1E2A22] font-semibold text-sm rounded-full transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
          >
            <LogOut className="w-4 h-4" />
            <span>Giriş səhifəsinə qayıt</span>
          </button>
        </div>
      </div>
    </div>
  );
}
