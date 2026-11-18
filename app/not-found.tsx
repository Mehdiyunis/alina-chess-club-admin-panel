import React from 'react';
import Link from 'next/link';
import { FileQuestion, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0d0b17] flex items-center justify-center p-6 text-[#1E2A22]">
      <div className="w-full max-w-md bg-[#FFFFFF] border border-[#E3DCCB] rounded-xl p-8 text-center shadow-2xl">
        <div className="w-12 h-12 rounded-xl bg-[#2F5D46]/15 border border-[#2F5D46]/30 text-[#2F5D46] mx-auto flex items-center justify-center mb-4">
          <FileQuestion className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-bold text-[#1E2A22]">Səhifə Tapılmadı</h1>
        <p className="mt-2 text-xs text-[#5E6B62]">
          Axtardığınız səhifə mövcud deyil və ya ünvan yanlış daxil edilib.
        </p>

        <div className="mt-6">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#2F5D46] hover:bg-[#254B38] text-white text-xs font-medium rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Ana səhifəyə qayıt</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
