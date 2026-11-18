'use client';

import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { ToastProvider } from '@/components/ui/ToastContext';
import { AdminRole } from '@/lib/types';

interface AdminShellProps {
  adminName: string;
  adminRole?: AdminRole;
  children: React.ReactNode;
}

export function AdminShell({ adminName, adminRole, children }: AdminShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <ToastProvider>
      <div className="min-h-screen bg-[#F7F3EA] text-[#1E2A22] flex">
        {/* Sidebar */}
        <Sidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />

        {/* Main Content Area */}
        <div className="flex-1 md:pl-64 flex flex-col min-w-0 bg-[#F7F3EA]">
          <TopBar
            adminName={adminName}
            adminRole={adminRole}
            onOpenMobileMenu={() => setMobileOpen(true)}
          />
          <main className="flex-1 p-4 sm:p-8 max-w-[1200px] w-full mx-auto">
            {children}
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
