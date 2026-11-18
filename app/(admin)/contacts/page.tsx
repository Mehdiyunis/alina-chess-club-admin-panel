'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  MessageSquare,
  Search,
  RefreshCw,
  Copy,
  Check,
  Trash2,
  Mail,
  Phone,
  ExternalLink,
  Clock,
  CheckCircle2,
  RotateCcw,
  UserCheck,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { ContactRequest, ContactRequestStatus } from '@/lib/types';
import { formatAzDate, getFriendlyErrorMessage } from '@/lib/utils';
import { useToast } from '@/components/ui/ToastContext';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { useAuth } from '@/contexts/AuthContext';

const PAGE_SIZE = 15;

export default function ContactsPage() {
  const [contacts, setContacts] = useState<ContactRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'new' | 'contacted'>('all');
  const [copiedId, setCopiedId] = useState<string | number | null>(null);

  // Pagination / Load more
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [contactToDelete, setContactToDelete] = useState<ContactRequest | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Updating status id
  const [updatingId, setUpdatingId] = useState<string | number | null>(null);

  const { showSuccess, showError } = useToast();
  const { canEdit } = useAuth();

  const fetchContacts = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const supabase = createClient();
      const { data, error } = await supabase
        .from('contact_requests')
        .select('id, value, type, status, created_at, handled_by, handled_by_name, handled_at')
        .order('created_at', { ascending: false });

      if (error) {
        showError(getFriendlyErrorMessage(error));
        return;
      }

      setContacts((data as ContactRequest[]) || []);
    } catch (err) {
      showError(getFriendlyErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [showError]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  // Filter contacts
  const filteredContacts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return contacts.filter((item) => {
      const matchesStatus =
        statusFilter === 'all' ? true : item.status === statusFilter;
      const matchesSearch =
        q === ''
          ? true
          : item.value.toLowerCase().includes(q) ||
            (item.handled_by_name || '').toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [contacts, statusFilter, searchQuery]);

  const displayedContacts = useMemo(() => {
    return filteredContacts.slice(0, visibleCount);
  }, [filteredContacts, visibleCount]);

  // Toggle status and re-read updated row from database
  const handleToggleStatus = async (contact: ContactRequest) => {
    const nextStatus: ContactRequestStatus =
      contact.status === 'new' ? 'contacted' : 'new';
    try {
      setUpdatingId(contact.id);
      const supabase = createClient();

      const { data: updatedRow, error } = await supabase
        .from('contact_requests')
        .update({ status: nextStatus })
        .eq('id', contact.id)
        .select('id, value, type, status, created_at, handled_by, handled_by_name, handled_at')
        .single();

      if (error) {
        showError(getFriendlyErrorMessage(error));
        return;
      }

      if (updatedRow) {
        setContacts((prev) =>
          prev.map((c) => (c.id === contact.id ? (updatedRow as ContactRequest) : c))
        );
      } else {
        setContacts((prev) =>
          prev.map((c) => (c.id === contact.id ? { ...c, status: nextStatus } : c))
        );
      }

      showSuccess(
        nextStatus === 'contacted'
          ? 'Status "Əlaqə saxlanıldı" olaraq dəyişdirildi.'
          : 'Status "Yeni" olaraq dəyişdirildi.'
      );
    } catch (err) {
      showError(getFriendlyErrorMessage(err));
    } finally {
      setUpdatingId(null);
    }
  };

  // Copy to clipboard
  const handleCopy = async (value: string, id: string | number) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedId(id);
      showSuccess(`Kopyalandı: ${value}`);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      showError('Panoya kopyalamaq mümkün olmadı.');
    }
  };

  // Delete contact
  const confirmDelete = (contact: ContactRequest) => {
    setContactToDelete(contact);
    setDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!contactToDelete) return;
    try {
      setDeleting(true);
      const supabase = createClient();
      const { error } = await supabase
        .from('contact_requests')
        .delete()
        .eq('id', contactToDelete.id);

      if (error) {
        showError(getFriendlyErrorMessage(error));
        return;
      }

      setContacts((prev) => prev.filter((c) => c.id !== contactToDelete.id));
      showSuccess('Əlaqə sorğusu silindi.');
      setDeleteModalOpen(false);
      setContactToDelete(null);
    } catch (err) {
      showError(getFriendlyErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-serif-heading font-medium tracking-tight text-[#1E2A22]">
            Əlaqə sorğuları
          </h1>
          <p className="text-sm text-[#5E6B62] mt-1.5">
            Saytdan daxil olan müraciətlər və əlaqə vasitələri
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchContacts(true)}
            disabled={refreshing || loading}
            className="flex items-center gap-2 px-5 py-2 bg-transparent hover:bg-[#2F5D46]/20 text-[#1E2A22] text-xs font-semibold border border-[rgba(26,19,12,0.20)] rounded-full transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Yenilə</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#FFFFFF] border border-[rgba(26,19,12,0.10)] rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#5E6B62] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Nömrə, e-poçt və ya əlaqə saxlayana görə axtarış..."
            className="w-full pl-10 pr-3.5 py-2 bg-white border border-[rgba(26,19,12,0.15)] rounded-xl text-xs sm:text-sm text-[#1E2A22] placeholder-[#5E6B62]/60 focus:border-[#2F5D46] focus:ring-2 focus:ring-[#2F5D46]/40 focus:outline-none transition-colors"
          />
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-[#2F5D46] text-[#F7F3EA] font-semibold shadow-2xs'
                : 'bg-transparent text-[#5E6B62] hover:bg-[rgba(26,19,12,0.05)] border border-[rgba(26,19,12,0.15)]'
            }`}
          >
            Hamısı ({contacts.length})
          </button>
          <button
            onClick={() => setStatusFilter('new')}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
              statusFilter === 'new'
                ? 'bg-[#2F5D46] text-white font-semibold shadow-2xs'
                : 'bg-transparent text-[#5E6B62] hover:bg-[rgba(26,19,12,0.05)] border border-[rgba(26,19,12,0.15)]'
            }`}
          >
            Yeni ({contacts.filter((c) => c.status === 'new').length})
          </button>
          <button
            onClick={() => setStatusFilter('contacted')}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
              statusFilter === 'contacted'
                ? 'bg-[#1E2A22] text-[#F7F3EA] font-semibold shadow-2xs'
                : 'bg-transparent text-[#5E6B62] hover:bg-[rgba(26,19,12,0.05)] border border-[rgba(26,19,12,0.15)]'
            }`}
          >
            Əlaqə saxlanıldı ({contacts.filter((c) => c.status === 'contacted').length})
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-[#FFFFFF] border border-[rgba(26,19,12,0.10)] rounded-2xl shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-sm text-[#5E6B62] flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-2 border-[#2F5D46] border-t-[#1F3D2F] rounded-full animate-spin" />
            <span className="font-medium text-xs">Sorğular yüklənir...</span>
          </div>
        ) : filteredContacts.length === 0 ? (
          <div className="p-16 text-center">
            <MessageSquare className="w-12 h-12 text-[#5E6B62]/40 mx-auto mb-3" />
            <h3 className="text-base font-serif-heading font-medium text-[#1E2A22]">Məlumat tapılmadı</h3>
            <p className="text-xs text-[#5E6B62] mt-1">
              {searchQuery ? 'Axtarışa uyğun sorğu tapılmadı.' : 'Hələlik heç bir əlaqə sorğusu daxil olmayıb.'}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="bg-[#1F3D2F] text-[#C9D3C4] uppercase text-[11px] tracking-wider border-b border-[rgba(243,236,225,0.10)]">
                    <th className="py-4 px-6 font-semibold">Əlaqə vasitəsi</th>
                    <th className="py-4 px-4 font-semibold">Növ</th>
                    <th className="py-4 px-4 font-semibold">Status</th>
                    <th className="py-4 px-4 font-semibold">Tarix</th>
                    <th className="py-4 px-4 font-semibold">Əlaqə saxlayan</th>
                    <th className="py-4 px-6 text-right font-semibold">Əməliyyatlar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[rgba(26,19,12,0.08)]">
                  {displayedContacts.map((contact) => (
                    <tr
                      key={contact.id}
                      className="hover:bg-[#2F5D46]/15 transition-colors h-[54px]"
                    >
                      <td className="py-3.5 px-6 font-medium text-[#1E2A22]">
                        <div className="flex items-center gap-2">
                          {contact.type === 'email' ? (
                            <a
                              href={`mailto:${contact.value}`}
                              className="font-medium text-[#1E2A22] hover:text-[#2F5D46] transition-colors inline-flex items-center gap-1.5"
                            >
                              <span>{contact.value}</span>
                              <ExternalLink className="w-3 h-3 text-[#5E6B62]" />
                            </a>
                          ) : (
                            <a
                              href={`tel:${contact.value}`}
                              className="font-medium text-[#1E2A22] hover:text-[#2F5D46] transition-colors inline-flex items-center gap-1.5"
                            >
                              <span>{contact.value}</span>
                              <ExternalLink className="w-3 h-3 text-[#5E6B62]" />
                            </a>
                          )}
                          <button
                            onClick={() => handleCopy(contact.value, contact.id)}
                            className="text-[#5E6B62] hover:text-[#1E2A22] p-1 rounded-full transition-colors cursor-pointer"
                            title="Kopyala"
                          >
                            {copiedId === contact.id ? (
                              <Check className="w-3.5 h-3.5 text-[#2F5D46]" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1.5 text-xs text-[#5E6B62]">
                          {contact.type === 'email' ? (
                            <>
                              <Mail className="w-3.5 h-3.5 text-[#5b6f8a]" />
                              <span>E-poçt</span>
                            </>
                          ) : (
                            <>
                              <Phone className="w-3.5 h-3.5 text-[#2F5D46]" />
                              <span>Telefon</span>
                            </>
                          )}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-medium border ${
                            contact.status === 'new'
                              ? 'bg-[#2F5D46]/15 border-[#2F5D46]/30 text-[#2F5D46]'
                              : 'bg-[rgba(26,19,12,0.06)] border-[rgba(26,19,12,0.12)] text-[#5E6B62]'
                          }`}
                        >
                          {contact.status === 'new' ? 'Yeni' : 'Əlaqə saxlanıldı'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-[#5E6B62] text-xs">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3 h-3 text-[#5E6B62]" />
                          {formatAzDate(contact.created_at)}
                        </span>
                      </td>
                      {/* Əlaqə saxlayan column */}
                      <td className="py-3.5 px-4">
                        {contact.status === 'contacted' && contact.handled_by_name ? (
                          <div>
                            <div className="font-medium text-xs text-[#1E2A22] flex items-center gap-1">
                              <UserCheck className="w-3.5 h-3.5 text-[#2F5D46]" />
                              <span>{contact.handled_by_name}</span>
                            </div>
                            <div className="text-[11px] text-[#5E6B62] mt-0.5">
                              {formatAzDate(contact.handled_at)}
                            </div>
                          </div>
                        ) : (
                          <span className="text-[#5E6B62] text-xs">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-6 text-right">
                        {canEdit ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleToggleStatus(contact)}
                              disabled={updatingId === contact.id}
                              className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs ${
                                contact.status === 'new'
                                  ? 'bg-[#2F5D46] hover:bg-[#254B38] border-[#2F5D46] text-white'
                                  : 'bg-transparent border-[rgba(26,19,12,0.20)] text-[#1E2A22] hover:bg-[#2F5D46]/25'
                              }`}
                            >
                              {contact.status === 'new' ? (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Əlaqə saxlanıldı</span>
                                </>
                              ) : (
                                <>
                                  <RotateCcw className="w-3.5 h-3.5" />
                                  <span>Yeni et</span>
                                </>
                              )}
                            </button>
                            <button
                              onClick={() => confirmDelete(contact)}
                              className="p-1.5 text-[#5E6B62] hover:text-[#B3261E] hover:bg-[#B3261E]/10 border border-transparent hover:border-[#B3261E]/20 rounded-full transition-colors cursor-pointer"
                              title="Sil"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-[#5E6B62]/60 select-none">Baxış</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Stacked Cards View */}
            <div className="md:hidden divide-y divide-[rgba(26,19,12,0.08)]">
              {displayedContacts.map((contact) => (
                <div key={contact.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {contact.type === 'email' ? (
                          <Mail className="w-4 h-4 text-[#5b6f8a] shrink-0" />
                        ) : (
                          <Phone className="w-4 h-4 text-[#2F5D46] shrink-0" />
                        )}
                        {contact.type === 'email' ? (
                          <a
                            href={`mailto:${contact.value}`}
                            className="text-sm font-semibold text-[#1E2A22] hover:text-[#2F5D46]"
                          >
                            {contact.value}
                          </a>
                        ) : (
                          <a
                            href={`tel:${contact.value}`}
                            className="text-sm font-semibold text-[#1E2A22] hover:text-[#2F5D46]"
                          >
                            {contact.value}
                          </a>
                        )}
                      </div>
                      <div className="text-[11px] text-[#5E6B62] flex items-center gap-2">
                        <span>{contact.type === 'email' ? 'E-poçt' : 'Telefon'}</span>
                        <span>·</span>
                        <span>{formatAzDate(contact.created_at)}</span>
                      </div>
                    </div>

                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${
                        contact.status === 'new'
                          ? 'bg-[#2F5D46]/15 border-[#2F5D46]/30 text-[#2F5D46]'
                          : 'bg-[rgba(26,19,12,0.06)] border-[rgba(26,19,12,0.12)] text-[#5E6B62]'
                      }`}
                    >
                      {contact.status === 'new' ? 'Yeni' : 'Əlaqə saxlanıldı'}
                    </span>
                  </div>

                  {/* Labeled Line on Mobile: Əlaqə saxlayan */}
                  <div className="text-xs text-[#5E6B62] flex items-center justify-between py-1 px-2.5 rounded-xl bg-white/60 border border-[rgba(26,19,12,0.06)]">
                    <span className="font-medium text-[#5E6B62]">Əlaqə saxlayan:</span>
                    <span className="font-medium text-[#1E2A22]">
                      {contact.status === 'contacted' && contact.handled_by_name ? (
                        <span>
                          {contact.handled_by_name}{' '}
                          <span className="text-[#5E6B62] text-[11px]">
                            ({formatAzDate(contact.handled_at)})
                          </span>
                        </span>
                      ) : (
                        '—'
                      )}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-[rgba(26,19,12,0.08)]">
                    <button
                      onClick={() => handleCopy(contact.value, contact.id)}
                      className="text-xs text-[#5E6B62] hover:text-[#1E2A22] flex items-center gap-1.5 py-1 px-2 rounded-full hover:bg-[rgba(26,19,12,0.05)] cursor-pointer"
                    >
                      {copiedId === contact.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-[#2F5D46]" />
                          <span className="text-[#2F5D46] font-medium">Kopyalandı</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Kopyala</span>
                        </>
                      )}
                    </button>

                    {canEdit && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleStatus(contact)}
                          disabled={updatingId === contact.id}
                          className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-colors flex items-center gap-1 cursor-pointer ${
                            contact.status === 'new'
                              ? 'bg-[#2F5D46] text-white border-[#2F5D46]'
                              : 'bg-transparent border-[rgba(26,19,12,0.20)] text-[#1E2A22]'
                          }`}
                        >
                          {contact.status === 'new' ? 'Əlaqə saxlanıldı' : 'Yeni et'}
                        </button>
                        <button
                          onClick={() => confirmDelete(contact)}
                          className="p-1.5 text-[#B3261E] hover:bg-[#B3261E]/10 rounded-full border border-transparent hover:border-[#B3261E]/20 cursor-pointer"
                          title="Sil"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Load More Button */}
            {filteredContacts.length > displayedContacts.length && (
              <div className="p-4 border-t border-[rgba(26,19,12,0.08)] text-center">
                <button
                  onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
                  className="px-6 py-2 bg-white hover:bg-[#2F5D46]/20 text-xs font-semibold text-[#1E2A22] border border-[rgba(26,19,12,0.20)] rounded-full transition-colors cursor-pointer shadow-2xs"
                >
                  Daha çox yüklə ({filteredContacts.length - displayedContacts.length} qalıb)
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        title="Əlaqə sorğusunu sil"
        description={`"${contactToDelete?.value}" əlaqə sorğusunu silmək istədiyinizdən əminsiniz? Bu əməliyyat geri qaytarılmır.`}
        confirmText="Sil"
        cancelText="Ləğv et"
        isDestructive={true}
        isLoading={deleting}
        onConfirm={handleDelete}
        onClose={() => {
          setDeleteModalOpen(false);
          setContactToDelete(null);
        }}
      />
    </div>
  );
}
