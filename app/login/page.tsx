'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail, Lock, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { isSupabaseConfigured } from '@/lib/supabase/client';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const { signIn, user, adminProfile, loading, error: authError } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam === 'unauthorized') {
      setLocalError('Bu panelə giriş icazəniz yoxdur.');
    } else if (errorParam === 'auth_failed') {
      setLocalError('Doğrulama zamanı xəta baş verdi. Zəhmət olmasa yenidən cəhd edin.');
    }
  }, [searchParams]);

  // If already logged in and has an admin_profiles row, redirect to dashboard
  useEffect(() => {
    if (!loading && user && adminProfile) {
      router.push('/');
    }
  }, [loading, user, adminProfile, router]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!email || !password) {
      setLocalError('Zəhmət olmasa e-poçt və şifrənizi daxil edin.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await signIn(email, password);
      if (res.success) {
        router.push('/');
        router.refresh();
      } else {
        setLocalError(res.error || 'Giriş uğursuz oldu.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayedError = localError || authError;

  // Show clean loading state while checking existing session to avoid flashing
  if (loading) {
    return (
      <div className="w-full max-w-md bg-[#FFFFFF] border border-[rgba(26,19,12,0.12)] rounded-2xl p-10 shadow-2xl text-center">
        <div className="w-8 h-8 border-2 border-[#2F5D46] border-t-[#1F3D2F] rounded-full animate-spin mx-auto mb-4" />
        <div className="text-xs font-medium text-[#5E6B62]">Sessiya yoxlanılır...</div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md bg-[#FFFFFF] border border-[rgba(26,19,12,0.12)] rounded-2xl p-8 sm:p-10 shadow-2xl relative z-10">
      {/* Brand Header */}
      <div className="text-center mb-8">
        <div className="w-20 h-20 rounded-2xl bg-white border border-[rgba(26,19,12,0.10)] mx-auto flex items-center justify-center mb-4 overflow-hidden shadow-sm p-1.5">
          <img
            src="/assets/aistudio/AL_NA_Chess_Club_Logo_a4cf73aa.png"
            alt="ALİNA Chess Club"
            className="w-full h-full object-contain"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>
        <h1 className="text-2xl sm:text-3xl font-serif-heading italic font-normal tracking-tight text-[#1E2A22]">
          ALİNA Chess Club
        </h1>
        <p className="text-[11px] uppercase tracking-wider text-[#5E6B62] mt-1.5 font-medium">
          Admin Panelə Giriş
        </p>
      </div>

      {/* Missing Supabase Config Warning */}
      {!isSupabaseConfigured && (
        <div className="mb-6 p-3.5 rounded-xl bg-[#2F5D46]/10 border border-[#2F5D46]/25 flex items-start gap-3 text-[#2F5D46] text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1 font-medium leading-relaxed">
            Supabase ayarları tapılmadı. Zəhmət olmasa mühit dəyişənlərini təyin edin.
          </div>
        </div>
      )}

      {/* Error Message Banner */}
      {displayedError && isSupabaseConfigured && (
        <div className="mb-6 p-3.5 rounded-xl bg-[#B3261E]/10 border border-[#B3261E]/25 flex items-start gap-3 text-[#B3261E] text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1 font-medium leading-relaxed">{displayedError}</div>
        </div>
      )}

      {/* Email + Password Form */}
      <form onSubmit={handleEmailLogin} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-[#5E6B62] mb-1.5" htmlFor="email">
            E-poçt ünvanı
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-[#5E6B62] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@sahmat.az"
              className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-[rgba(26,19,12,0.15)] rounded-xl text-sm text-[#1E2A22] placeholder-[#5E6B62]/50 focus:border-[#2F5D46] focus:ring-2 focus:ring-[#2F5D46]/40 focus:outline-none transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-[#5E6B62] mb-1.5" htmlFor="password">
            Şifrə
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-[#5E6B62] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-[rgba(26,19,12,0.15)] rounded-xl text-sm text-[#1E2A22] placeholder-[#5E6B62]/50 focus:border-[#2F5D46] focus:ring-2 focus:ring-[#2F5D46]/40 focus:outline-none transition-colors"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting || !isSupabaseConfigured}
          className="w-full mt-3 py-3 px-6 bg-[#2F5D46] hover:bg-[#254B38] active:scale-[0.99] text-[#1E2A22] font-semibold text-sm rounded-full shadow-xs hover:shadow transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {isSubmitting ? (
            <span className="w-4 h-4 border-2 border-[#1E2A22]/30 border-t-[#1E2A22] rounded-full animate-spin" />
          ) : (
            <>
              <span>Daxil ol</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1F3D2F] via-[#2F5D46] to-[#1F3D2F] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative ivory chess piece outline in background */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5">
        <svg className="w-96 h-96 text-[#F7F3EA]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
          <path d="M19 20H5v-2h14v2zm-2-4H7v-2h10v2zm-1-4.5c0-.83-.67-1.5-1.5-1.5h-1c-.28 0-.5-.22-.5-.5V6c0-1.1-.9-2-2-2S9 4.9 9 6v3.5c0 .28-.22.5-.5.5h-1c-.83 0-1.5.67-1.5 1.5V14h10v-2.5z" />
        </svg>
      </div>

      <Suspense fallback={<div className="text-sm text-[#C9D3C4]">Yüklənir...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
