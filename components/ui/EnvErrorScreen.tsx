'use client';

import React, { useEffect } from 'react';
import { AlertCircle, Key, Server } from 'lucide-react';
import { getMissingEnvVars } from '@/lib/supabase/client';

export function EnvErrorScreen() {
  const missing = getMissingEnvVars();

  useEffect(() => {
    if (missing.length > 0) {
      console.error(
        `[Supabase] Supabase ayarları tapılmadı! Çatışmayan dəyişənlər: ${missing.join(', ')}`
      );
    }
  }, [missing]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1F3D2F] via-[#2F5D46] to-[#1F3D2F] flex items-center justify-center p-6 text-[#1E2A22]">
      <div className="w-full max-w-xl bg-[#FFFFFF] border border-[rgba(26,19,12,0.12)] rounded-2xl p-8 shadow-2xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-full bg-[#2F5D46]/10 border border-[#2F5D46]/20 text-[#2F5D46]">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-serif-heading font-medium text-[#1E2A22]">Supabase ayarları tapılmadı</h1>
            <p className="text-xs text-[#5E6B62] mt-0.5">Mühit dəyişənləri (environment variables) təyin edilməyib</p>
          </div>
        </div>

        <div className="text-sm text-[#1E2A22]/90 space-y-4">
          <p className="text-xs text-[#5E6B62]">
            Admin panelinin mövcud Supabase layihəsinə qoşulması üçün aşağıdakı mühit dəyişənlərinin təyin edilməsi tələb olunur:
          </p>

          <div className="bg-[#1F3D2F] border border-[rgba(243,236,225,0.15)] rounded-xl p-4 font-mono text-xs text-[#C9D3C4] space-y-2">
            <div className="flex items-center gap-2 text-[#2F5D46]">
              <Server className="w-4 h-4" />
              <span>NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co</span>
            </div>
            <div className="flex items-center gap-2 text-[#2F5D46]">
              <Key className="w-4 h-4" />
              <span>NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJh...</span>
            </div>
          </div>

          {missing.length > 0 && (
            <div className="p-3 rounded-xl bg-[#B3261E]/10 border border-[#B3261E]/20 text-xs text-[#B3261E]">
              <strong>Çatışmayan dəyişənlər:</strong> {missing.join(', ')}
            </div>
          )}

          <div className="p-4 rounded-xl bg-[rgba(26,19,12,0.05)] border border-[rgba(26,19,12,0.08)] text-xs text-[#5E6B62] leading-relaxed">
            <strong className="text-[#1E2A22] block mb-1">Qeyd:</strong>
            Heç vaxt Service Role (gizli) açarını istifadə etməyin. Bütün təhlükəsizlik və icazələr Supabase-in RLS (Row Level Security) qaydaları ilə tənzimlənir.
          </div>
        </div>
      </div>
    </div>
  );
}
