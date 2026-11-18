'use client';

import React from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="az">
      <body className="bg-[#0d0b17] text-[#1E2A22] min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-[#FFFFFF] border border-[#E3DCCB] rounded-xl p-8 text-center">
          <h2 className="text-xl font-bold mb-2">Kritik Xəta</h2>
          <p className="text-xs text-[#5E6B62] mb-6">
            {error.message || 'Sistemdə kritik xəta baş verdi.'}
          </p>
          <button
            onClick={() => reset()}
            className="px-4 py-2 bg-[#2F5D46] text-white text-xs font-medium rounded-lg cursor-pointer"
          >
            Yenidən yüklə
          </button>
        </div>
      </body>
    </html>
  );
}
