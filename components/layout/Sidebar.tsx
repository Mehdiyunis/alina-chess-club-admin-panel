'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  MessageSquare,
  BookOpen,
  GraduationCap,
  Newspaper,
  Trophy,
  Users,
  X,
  LogOut,
  ShieldCheck,
  Shield,
  Eye,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { AdminRole } from '@/lib/types';

interface SidebarProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

const navItems = [
  {
    name: 'Panel',
    href: '/',
    icon: LayoutDashboard,
  },
  {
    name: 'Əlaqə sorğuları',
    href: '/contacts',
    icon: MessageSquare,
  },
  {
    name: 'Kitablar',
    href: '/books',
    icon: BookOpen,
  },
  {
    name: 'Müəllimlər',
    href: '/teachers',
    icon: GraduationCap,
  },
  {
    name: 'Yeniliklər',
    href: '/updates',
    icon: Newspaper,
  },
  {
    name: 'Turnirlər',
    href: '/tournaments',
    icon: Trophy,
  },
  {
    name: 'İstifadəçilər',
    href: '/users',
    icon: Users,
  },
];

const ROLE_LABELS: Record<AdminRole, string> = {
  administrator: 'Administrator',
  worker: 'İşçi',
  viewer: 'Müşahidəçi',
};

export function Sidebar({ mobileOpen, onCloseMobile }: SidebarProps) {
  const pathname = usePathname();
  const { adminProfile, role, signOut } = useAuth();

  const isLinkActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  const activeRole: AdminRole = role || 'viewer';
  const displayName = adminProfile?.full_name || adminProfile?.email || 'Admin';
  const firstName = displayName.trim().split(' ')[0];

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden"
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-[#1F3D2F] border-r border-white/10 flex flex-col transition-transform duration-200 ease-in-out md:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-18 px-5 flex items-center justify-between border-b border-white/10">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-[rgba(243,236,225,0.15)] flex items-center justify-center overflow-hidden shrink-0 shadow-sm p-0.5">
              <img
                src="/assets/aistudio/AL_NA_Chess_Club_Logo_a4cf73aa.png"
                alt="ALİNA Chess Club"
                className="w-full h-full object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
            <div>
              <div className="font-serif-heading italic text-base font-normal tracking-tight text-[#F7F3EA]">
                ALİNA Chess Club
              </div>
              <div className="text-[10px] uppercase tracking-wider font-medium text-[#C9D3C4]">
                İdarəetmə Paneli
              </div>
            </div>
          </Link>
          <button
            onClick={onCloseMobile}
            className="md:hidden text-[#C9D3C4] hover:text-[#F7F3EA] p-1.5 rounded-full hover:bg-white/10 cursor-pointer"
            aria-label="Menyunu bağla"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-6 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isLinkActive(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onCloseMobile}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-150 ${
                  active
                    ? 'bg-[#F6E7B4] text-[#1E2A22] shadow-xs font-semibold'
                    : 'text-[#C9D3C4] hover:text-[#F7F3EA] hover:bg-white/10'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-[#1E2A22]' : 'text-[#C9D3C4]'}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Block at bottom */}
        <div className="p-4 border-t border-[rgba(243,236,225,0.10)] bg-[#1F3D2F] space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-white/10 border border-[rgba(243,236,225,0.15)] flex items-center justify-center text-[#C9D3C4] shrink-0 font-medium text-xs">
                {activeRole === 'administrator' ? (
                  <ShieldCheck className="w-4 h-4" />
                ) : activeRole === 'worker' ? (
                  <Shield className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-[#F7F3EA] truncate">{firstName}</div>
                {/* Role badge */}
                <div className="mt-0.5">
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                      activeRole === 'administrator'
                        ? 'bg-[#F6E7B4] text-[#1E2A22] border-[#2F5D46]'
                        : activeRole === 'worker'
                        ? 'bg-transparent text-[#C9D3C4] border-[#2F5D46]'
                        : 'bg-transparent text-[#C9D3C4] border-white/25'
                    }`}
                  >
                    {ROLE_LABELS[activeRole] || activeRole}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => signOut()}
              className="p-1.5 text-[#C9D3C4] hover:text-[#B3261E] hover:bg-[#B3261E]/10 rounded-full transition-colors cursor-pointer"
              title="Çıxış"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center justify-between text-[11px] text-[#C9D3C4]/70 pt-2 border-t border-[rgba(243,236,225,0.06)]">
            <span>Sistem statusu</span>
            <span className="flex items-center gap-1.5 text-[#2F5D46]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2F5D46] animate-pulse" />
              Aktiv
            </span>
          </div>
        </div>
      </aside>
    </>
  );
}
