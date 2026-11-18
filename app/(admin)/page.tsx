import React from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import {
  BookOpen,
  GraduationCap,
  Bell,
  ArrowRight,
  Mail,
  Phone,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { formatAzDate } from '@/lib/utils';
import { ContactRequest } from '@/lib/types';
import { VisitStatsCard } from '@/components/dashboard/VisitStatsCard';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const supabase = await createClient();

  // Parallel data fetching for stats
  const [
    { count: newContactsCount, error: newContactsErr },
    { count: booksCount, error: booksErr },
    { count: teachersCount, error: teachersErr },
    { data: latestContacts, error: latestContactsErr },
  ] = await Promise.all([
    supabase.from('contact_requests').select('*', { count: 'exact', head: true }).eq('status', 'new'),
    supabase.from('books').select('*', { count: 'exact', head: true }),
    supabase.from('teachers').select('*', { count: 'exact', head: true }),
    supabase.from('contact_requests').select('*').order('created_at', { ascending: false }).limit(5),
  ]);

  const hasAnyError = newContactsErr || booksErr || teachersErr || latestContactsErr;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl sm:text-4xl font-serif-heading font-medium tracking-tight text-[#1E2A22]">
          İdarəetmə Paneli
        </h1>
        <p className="text-sm text-[#5E6B62] mt-1.5">
          Şahmat məktəbinin əsas göstəriciləri və son sorğular
        </p>
      </div>

      {hasAnyError && (
        <div className="p-4 rounded-xl bg-[#2F5D46]/10 border border-[#2F5D46]/25 text-[#2F5D46] text-xs">
          Məlumatların yüklənməsi zamanı xəta baş verdi. Zəhmət olmasa RLS icazələrini və ya bazanı yoxlayın.
        </div>
      )}

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Card 1: New Contacts */}
        <div className="bg-[#FFFFFF] border border-[rgba(26,19,12,0.10)] rounded-2xl p-6 flex flex-col justify-between shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#5E6B62]">
              Yeni Əlaqə Sorğuları
            </span>
            <div className="w-9 h-9 rounded-full bg-[#2F5D46]/15 text-[#2F5D46] border border-[#2F5D46]/25 flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-5">
            <div className="text-3xl sm:text-4xl font-serif-heading font-medium text-[#1E2A22] tracking-tight">
              {newContactsCount ?? 0}
            </div>
            <div className="text-xs text-[#5E6B62] mt-1 font-medium">
              Cavab gözləyən müraciətlər
            </div>
          </div>
        </div>

        {/* Card 2: Səhifəyə giriş sayı (Public website visit stats) */}
        <VisitStatsCard />

        {/* Card 3: Books */}
        <div className="bg-[#FFFFFF] border border-[rgba(26,19,12,0.10)] rounded-2xl p-6 flex flex-col justify-between shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#5E6B62]">
              Kitablar
            </span>
            <div className="w-9 h-9 rounded-full bg-[#5b6f8a]/15 text-[#5b6f8a] border border-[#5b6f8a]/25 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-5">
            <div className="text-3xl sm:text-4xl font-serif-heading font-medium text-[#1E2A22] tracking-tight">
              {booksCount ?? 0}
            </div>
            <div className="text-xs text-[#5E6B62] mt-1 font-medium">
              Kitabxanada aktiv materiallar
            </div>
          </div>
        </div>

        {/* Card 4: Teachers */}
        <div className="bg-[#FFFFFF] border border-[rgba(26,19,12,0.10)] rounded-2xl p-6 flex flex-col justify-between shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#5E6B62]">
              Müəllimlər
            </span>
            <div className="w-9 h-9 rounded-full bg-[#2F5D46]/15 text-[#2F5D46] border border-[#2F5D46]/25 flex items-center justify-center">
              <GraduationCap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-5">
            <div className="text-3xl sm:text-4xl font-serif-heading font-medium text-[#1E2A22] tracking-tight">
              {teachersCount ?? 0}
            </div>
            <div className="text-xs text-[#5E6B62] mt-1 font-medium">
              Heyətdə olan məşqçilər
            </div>
          </div>
        </div>
      </div>

      {/* Latest Contact Requests */}
      <div className="bg-[#FFFFFF] border border-[rgba(26,19,12,0.10)] rounded-2xl shadow-2xs overflow-hidden">
        <div className="p-5 sm:px-6 bg-[#1F3D2F] flex items-center justify-between">
          <div>
            <h2 className="text-base font-serif-heading font-medium !text-[#FFFFFF]">Son Əlaqə Sorğuları</h2>
            <p className="text-xs text-[#C9D3C4] mt-0.5">Son daxil olan 5 müraciət</p>
          </div>
          <Link
            href="/contacts"
            className="flex items-center gap-1.5 text-xs font-semibold !text-[#FFFFFF] hover:!text-[#C9D3C4] transition-colors"
          >
            <span>Hamısına bax</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {(!latestContacts || latestContacts.length === 0) ? (
          <div className="p-8 text-center text-sm text-[#5E6B62]">
            Hələlik heç bir əlaqə sorğusu daxil olmayıb.
          </div>
        ) : (
          <div className="divide-y divide-[rgba(26,19,12,0.08)]">
            {(latestContacts as ContactRequest[]).map((contact) => (
              <div
                key={contact.id}
                className="p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#2F5D46]/15 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-white border border-[rgba(26,19,12,0.10)] flex items-center justify-center text-[#5E6B62] shadow-2xs">
                    {contact.type === 'email' ? (
                      <Mail className="w-4 h-4 text-[#5b6f8a]" />
                    ) : (
                      <Phone className="w-4 h-4 text-[#2F5D46]" />
                    )}
                  </div>
                  <div>
                    {contact.type === 'email' ? (
                      <a
                        href={`mailto:${contact.value}`}
                        className="text-sm font-medium text-[#1E2A22] hover:text-[#2F5D46] transition-colors inline-flex items-center gap-1"
                      >
                        {contact.value}
                        <ExternalLink className="w-3 h-3 text-[#5E6B62]" />
                      </a>
                    ) : (
                      <a
                        href={`tel:${contact.value}`}
                        className="text-sm font-medium text-[#1E2A22] hover:text-[#2F5D46] transition-colors inline-flex items-center gap-1"
                      >
                        {contact.value}
                        <ExternalLink className="w-3 h-3 text-[#5E6B62]" />
                      </a>
                    )}
                    <div className="text-xs text-[#5E6B62] flex items-center gap-2 mt-0.5">
                      <span>{contact.type === 'email' ? 'E-poçt' : 'Telefon'}</span>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatAzDate(contact.created_at)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-start sm:self-center">
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-medium border ${
                      contact.status === 'new'
                        ? 'bg-[#2F5D46]/15 border-[#2F5D46]/30 text-[#2F5D46]'
                        : 'bg-[rgba(26,19,12,0.06)] border-[rgba(26,19,12,0.12)] text-[#5E6B62]'
                    }`}
                  >
                    {contact.status === 'new' ? 'Yeni' : 'Əlaqə saxlanıldı'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
