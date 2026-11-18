'use client';

import React, { useState } from 'react';
import { Menu, LogOut, ShieldCheck, Shield, Eye } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { AdminRole } from '@/lib/types';

interface TopBarProps {
  adminName: string;
  adminRole?: AdminRole;
  onOpenMobileMenu: () => void;
}

const ROLE_LABELS: Record<AdminRole, string> = {
  administrator: 'Administrator',
  worker: 'İşçi',
  viewer: 'Müşahidəçi',
};

export function TopBar({ adminName, adminRole, onOpenMobileMenu }: TopBarProps) {
  const [loggingOut, setLoggingOut] = useState(false);
  const { signOut, role: contextRole, adminProfile } = useAuth();

  const activeRole: AdminRole = adminRole || contextRole || 'viewer';

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await signOut();
    } finally {
      setLoggingOut(false);
    }
  };

  const displayName = adminProfile?.full_name || adminName || 'Admin';
  const firstName = displayName.trim().split(' ')[0];

  return (
    <header className="sticky top-0 z-30 h-16 bg-[#F7F3EA]/95 backdrop-blur-xs border-b border-[#E3DCCB] px-4 sm:px-8 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="md:hidden text-[#1E2A22] hover:bg-[#1F3D2F]/10 p-2 rounded-full cursor-pointer transition-colors"
          aria-label="Menyunu aç"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        {/* Admin profile indicator */}
        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-white border border-[#E3DCCB] shadow-2xs">
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center font-semibold text-xs border ${
              activeRole === 'administrator'
                ? 'bg-[#2F5D46] text-[#F7F3EA] border-[#2F5D46]'
                : activeRole === 'worker'
                ? 'bg-[#E4EBD9] text-[#1E2A22] border-[#2F5D46]'
                : 'bg-transparent text-[#5E6B62] border-[rgba(26,19,12,0.20)]'
            }`}
          >
            {activeRole === 'administrator' ? (
              <ShieldCheck className="w-3.5 h-3.5" />
            ) : activeRole === 'worker' ? (
              <Shield className="w-3.5 h-3.5" />
            ) : (
              <Eye className="w-3.5 h-3.5" />
            )}
          </div>
          <div className="flex flex-col text-left">
            <span className="text-xs font-semibold text-[#1E2A22] leading-none">{firstName}</span>
            <span className="text-[10px] text-[#5E6B62] leading-none mt-1">
              {ROLE_LABELS[activeRole] || activeRole}
            </span>
          </div>
        </div>

        {/* Logout button */}
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-[#5E6B62] hover:text-[#B3261E] hover:bg-[#B3261E]/10 border border-transparent hover:border-[#B3261E]/20 rounded-full transition-colors cursor-pointer disabled:opacity-50"
          title="Sistemdən çıxış"
        >
          {loggingOut ? (
            <span className="w-3.5 h-3.5 border-2 border-[#B3261E]/30 border-t-[#B3261E] rounded-full animate-spin" />
          ) : (
            <LogOut className="w-4 h-4" />
          )}
          <span className="hidden sm:inline">Çıxış</span>
        </button>
      </div>
    </header>
  );
}
