'use client';

import React from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-[#0d0b17] flex items-center justify-center p-6 text-[#1E2A22]">
      <div className="w-full max-w-md bg-[#FFFFFF] border border-[#E3DCCB] rounded-xl p-8 text-center shadow-2xl">
        <div className="w-12 h-12 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 mx-auto flex items-center justify-center mb-4">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-bold text-[#1E2A22]">Sistem Xətası Baş Verdi</h1>
        <p className="mt-2 text-xs text-[#5E6B62] leading-relaxed">
          {error.message || 'Gözlənilməz xəta baş verdi. Zəhmət olmasa yenidən cəhd edin.'}
        </p>

        <div className="mt-6">
          <button
            onClick={() => reset()}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#2F5D46] hover:bg-[#254B38] text-white text-xs font-medium rounded-lg transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Yenidən cəhd et</span>
          </button>
        </div>
      </div>
    </div>
  );
}
