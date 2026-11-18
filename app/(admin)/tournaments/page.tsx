'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import {
  CalendarDays,
  Edit,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  Trash2,
  Trophy,
  Upload,
  X,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  Tournament,
  TournamentDay,
  TournamentStatus,
} from '@/lib/types';
import {
  STATUS_CLASSES,
  STATUS_LABELS,
  TOURNAMENT_STATUSES,
  formatAzDateTime,
  fromDateTimeLocal,
  toDateTimeLocal,
} from '@/lib/tournament-config';
import {
  extractStoragePath,
  getFriendlyErrorMessage,
  sanitizeFileName,
} from '@/lib/utils';
import { useToast } from '@/components/ui/ToastContext';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { useAuth } from '@/contexts/AuthContext';

type Lang = 'az' | 'en' | 'ru';
type LangTexts = Record<Lang, string>;

interface DayDraft {
  starts_at: string;
  ends_at: string;
  note_az: string;
  note_en: string;
  note_ru: string;
}

const LANG_TABS: { key: Lang; label: string }[] = [
  { key: 'az', label: 'Azərbaycan' },
  { key: 'en', label: 'English' },
  { key: 'ru', label: 'Русский' },
];

const emptyTexts = (): LangTexts => ({ az: '', en: '', ru: '' });
const emptyDay = (): DayDraft => ({ starts_at: '', ends_at: '', note_az: '', note_en: '', note_ru: '' });

const COVER_MAX_SIZE = 5 * 1024 * 1024;
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const BUCKET = 'tournament-covers';

type StatusFilter = 'all' | TournamentStatus;

function normalizeSearchQuery(value: string): string {
  const trimmed = value.trim();
  const idMatch = trimmed.match(
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i
  );
  return (idMatch ? idMatch[0] : trimmed).toLowerCase();
}

export default function TournamentsPage() {
  const [items, setItems] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Tournament | null>(null);
  const [activeLang, setActiveLang] = useState<Lang>('az');
  const [titles, setTitles] = useState<LangTexts>(emptyTexts());
  const [descriptions, setDescriptions] = useState<LangTexts>(emptyTexts());
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [roundCount, setRoundCount] = useState('3');
  const [days, setDays] = useState<DayDraft[]>([]);
  const [isPublished, setIsPublished] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [toDelete, setToDelete] = useState<Tournament | null>(null);
  const [deleting, setDeleting] = useState(false);

  const coverInputRef = useRef<HTMLInputElement>(null);
  const { showSuccess, showError } = useToast();
  const { canEdit } = useAuth();

  const fetchItems = useCallback(
    async (isRefresh = false) => {
      try {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        const supabase = createClient();
        const { data, error } = await supabase
          .from('tournaments')
          .select('*')
          .order('starts_at', { ascending: false });
        if (error) throw error;
        setItems((data as Tournament[]) || []);
      } catch (err) {
        showError(getFriendlyErrorMessage(err));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [showError]
  );

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const filtered = useMemo(() => {
    const query = normalizeSearchQuery(searchQuery);
    return items.filter((item) => {
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
      const matchesSearch =
        query === '' ||
        item.id.toLowerCase().includes(query) ||
        [item.title_az, item.title_en, item.title_ru]
          .filter(Boolean)
          .some((value) => (value as string).toLowerCase().includes(query));
      return matchesStatus && matchesSearch;
    });
  }, [items, statusFilter, searchQuery]);

  const resetForm = () => {
    setEditing(null);
    setActiveLang('az');
    setTitles(emptyTexts());
    setDescriptions(emptyTexts());
    setCoverFile(null);
    setCoverPreview(null);
    setStartsAt('');
    setEndsAt('');
    setRoundCount('3');
    setDays([]);
    setIsPublished(false);
    setFormErrors({});
  };

  const openCreate = () => {
    resetForm();
    setModalOpen(true);
  };

  const openEdit = async (item: Tournament) => {
    resetForm();
    setEditing(item);
    setTitles({ az: item.title_az || '', en: item.title_en || '', ru: item.title_ru || '' });
    setDescriptions({
      az: item.description_az || '',
      en: item.description_en || '',
      ru: item.description_ru || '',
    });
    setCoverPreview(item.cover_url || null);
    setStartsAt(toDateTimeLocal(item.starts_at));
    setEndsAt(toDateTimeLocal(item.ends_at));
    setRoundCount(String(item.round_count));
    setIsPublished(Boolean(item.is_published));
    setModalOpen(true);

    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('tournament_days')
        .select('*')
        .eq('tournament_id', item.id)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      setDays(
        ((data as TournamentDay[]) || []).map((day) => ({
          starts_at: toDateTimeLocal(day.starts_at),
          ends_at: toDateTimeLocal(day.ends_at),
          note_az: day.note_az || '',
          note_en: day.note_en || '',
          note_ru: day.note_ru || '',
        }))
      );
    } catch (err) {
      showError(getFriendlyErrorMessage(err));
    }
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > COVER_MAX_SIZE) {
      setFormErrors((prev) => ({ ...prev, cover: 'Cover şəklinin həcmi maksimum 5 MB ola bilər.' }));
      return;
    }
    if (!IMAGE_TYPES.includes(file.type)) {
      setFormErrors((prev) => ({ ...prev, cover: 'Yalnız JPG, PNG və ya WebP şəkli qəbul edilir.' }));
      return;
    }
    setFormErrors((prev) => {
      const next = { ...prev };
      delete next.cover;
      return next;
    });
    setCoverFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setCoverPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const updateDay = (index: number, patch: Partial<DayDraft>) => {
    setDays((prev) => prev.map((day, i) => (i === index ? { ...day, ...patch } : day)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    if (!titles.az.trim()) errors.titleAz = 'Azərbaycan dilində ad mütləqdir.';
    const startIso = fromDateTimeLocal(startsAt);
    const endIso = fromDateTimeLocal(endsAt);
    if (!startIso) errors.startsAt = 'Başlama tarixi mütləqdir.';
    if (!endIso) errors.endsAt = 'Bitmə tarixi mütləqdir.';
    if (startIso && endIso && new Date(endIso) < new Date(startIso))
      errors.endsAt = 'Bitmə tarixi başlama tarixindən əvvəl ola bilməz.';
    const roundNumber = Number(roundCount);
    if (!Number.isInteger(roundNumber) || roundNumber < 1 || roundNumber > 20)
      errors.roundCount = 'Tur sayı 1–20 arasında olmalıdır.';
    const preparedDays = days
      .map((day) => ({
        starts_at: fromDateTimeLocal(day.starts_at),
        ends_at: fromDateTimeLocal(day.ends_at),
        note_az: day.note_az.trim() || null,
        note_en: day.note_en.trim() || null,
        note_ru: day.note_ru.trim() || null,
      }))
      .filter((day) => day.starts_at && day.ends_at);
    if (preparedDays.some((day) => !day.starts_at || !day.ends_at))
      errors.days = 'Günlərin həm başlama, həm də bitmə vaxtı doldurulmalıdır.';
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      setActiveLang('az');
      return;
    }

    try {
      setSaving(true);
      const supabase = createClient();

      let coverUrl = editing?.cover_url || null;
      if (coverFile) {
        const path = `${Date.now()}-${sanitizeFileName(coverFile.name)}`;
        const { error: uploadError } = await supabase.storage
          .from(BUCKET)
          .upload(path, coverFile, { cacheControl: '3600', upsert: false });
        if (uploadError) throw new Error(`Cover yüklənmədi: ${uploadError.message}`);
        const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
        coverUrl = urlData.publicUrl;
        const oldPath = extractStoragePath(editing?.cover_url || null, BUCKET);
        if (oldPath) {
          try {
            await supabase.storage.from(BUCKET).remove([oldPath]);
          } catch {
            // ignore
          }
        }
      }

      const payload = {
        title_az: titles.az.trim(),
        title_en: titles.en.trim() || null,
        title_ru: titles.ru.trim() || null,
        description_az: descriptions.az.trim() || null,
        description_en: descriptions.en.trim() || null,
        description_ru: descriptions.ru.trim() || null,
        cover_url: coverUrl,
        starts_at: startIso,
        ends_at: endIso,
        round_count: roundNumber,
        is_published: isPublished,
      };

      let saved: Tournament;
      if (editing) {
        const { data, error } = await supabase
          .from('tournaments')
          .update(payload)
          .eq('id', editing.id)
          .select()
          .single();
        if (error) throw error;
        saved = data as Tournament;
      } else {
        const { data, error } = await supabase
          .from('tournaments')
          .insert([payload])
          .select()
          .single();
        if (error) throw error;
        saved = data as Tournament;
      }

      const { error: daysError } = await supabase
        .from('tournament_days')
        .delete()
        .eq('tournament_id', saved.id);
      if (daysError) throw daysError;
      if (preparedDays.length > 0) {
        const { error: insertDaysError } = await supabase.from('tournament_days').insert(
          preparedDays.map((day, index) => ({ ...day, tournament_id: saved.id, sort_order: index }))
        );
        if (insertDaysError) throw insertDaysError;
      }

      if (editing) {
        setItems((prev) => prev.map((item) => (item.id === saved.id ? saved : item)));
        showSuccess('Turnir uğurla yeniləndi.');
      } else {
        setItems((prev) => [saved, ...prev]);
        showSuccess('Yeni turnir uğurla əlavə edildi.');
      }
      setModalOpen(false);
    } catch (err) {
      showError(getFriendlyErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const togglePublish = async (item: Tournament) => {
    try {
      const supabase = createClient();
      const nextValue = !item.is_published;
      const { data, error } = await supabase
        .from('tournaments')
        .update({ is_published: nextValue })
        .eq('id', item.id)
        .select()
        .single();
      if (error) throw error;
      setItems((prev) => prev.map((t) => (t.id === item.id ? (data as Tournament) : t)));
      showSuccess(nextValue ? 'Turnir saytda dərc olundu.' : 'Turnir qaralamaya qaytarıldı.');
    } catch (err) {
      showError(getFriendlyErrorMessage(err));
    }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    try {
      setDeleting(true);
      const supabase = createClient();
      const { error } = await supabase.from('tournaments').delete().eq('id', toDelete.id);
      if (error) throw error;
      const coverPath = extractStoragePath(toDelete.cover_url, BUCKET);
      if (coverPath) {
        try {
          await supabase.storage.from(BUCKET).remove([coverPath]);
        } catch {
          // ignore
        }
      }
      setItems((prev) => prev.filter((item) => item.id !== toDelete.id));
      showSuccess('Turnir uğurla silindi.');
      setDeleteModalOpen(false);
      setToDelete(null);
    } catch (err) {
      showError(getFriendlyErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  const statusPills: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: 'Hamısı' },
    ...TOURNAMENT_STATUSES.map((status) => ({
      key: status as StatusFilter,
      label: STATUS_LABELS[status],
    })),
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-serif-heading font-medium tracking-tight text-[#1E2A22]">
            Turnirlər
          </h1>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchItems(true)}
            disabled={refreshing || loading}
            className="px-4 py-2 rounded-full bg-[#FFFFFF] hover:bg-[#F7F3EA] text-[#1E2A22] font-medium text-xs border border-[rgba(26,19,12,0.15)] transition-colors cursor-pointer inline-flex items-center gap-2 shadow-2xs disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Yenilə
          </button>
          <button
            onClick={openCreate}
            className="px-4 py-2 rounded-full bg-[#2F5D46] hover:bg-[#1F3D2F] text-white font-medium text-xs transition-colors cursor-pointer inline-flex items-center gap-2 shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            Yeni turnir
          </button>
        </div>
      </div>

      <div className="bg-[#FFFFFF] border border-[rgba(26,19,12,0.10)] rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs">
        <div className="flex flex-wrap items-center gap-1.5">
          {statusPills.map((pill) => (
            <button
              key={pill.key}
              onClick={() => setStatusFilter(pill.key)}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                statusFilter === pill.key
                  ? 'bg-[#1E2A22] text-[#F7F3EA] font-semibold shadow-2xs'
                  : 'bg-transparent text-[#5E6B62] hover:bg-[rgba(26,19,12,0.05)] border border-[rgba(26,19,12,0.15)]'
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-[#5E6B62] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Ad, ID və ya /tournaments/<id> linki ilə axtar..."
            className="w-full pl-9 pr-3.5 py-2 bg-[#F7F3EA] border border-[rgba(26,19,12,0.15)] rounded-full text-xs text-[#1E2A22] placeholder-[#5E6B62]/60 focus:border-[#2F5D46] focus:bg-[#FFFFFF] focus:outline-none transition-colors"
          />
        </div>
      </div>

      <div className="bg-[#FFFFFF] border border-[rgba(26,19,12,0.10)] rounded-2xl shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-sm text-[#5E6B62] flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-2 border-[#2F5D46] border-t-[#1F3D2F] rounded-full animate-spin" />
            <span className="font-medium text-xs">Turnirlər yüklənir...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center">
            <Trophy className="w-12 h-12 text-[#5E6B62]/40 mx-auto mb-3" />
            <h3 className="text-base font-serif-heading font-medium text-[#1E2A22]">
              Turnir tapılmadı
            </h3>
          </div>
        ) : (
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="bg-[#1F3D2F] text-[#C9D3C4] uppercase text-[11px] tracking-wider border-b border-[rgba(243,236,225,0.10)]">
                  <th className="py-4 px-6 font-semibold">Turnir</th>
                  <th className="py-4 px-4 font-semibold">Status</th>
                  <th className="py-4 px-4 font-semibold">Tarix</th>
                  <th className="py-4 px-4 font-semibold">Turlar</th>
                  <th className="py-4 px-6 text-right font-semibold">Əməliyyatlar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(26,19,12,0.08)]">
                {filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-[#2F5D46]/15 transition-colors">
                    <td className="py-3.5 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-14 h-11 rounded-lg bg-[#F7F3EA] border border-[rgba(26,19,12,0.12)] overflow-hidden shrink-0 flex items-center justify-center shadow-2xs">
                          {item.cover_url ? (
                            <img src={item.cover_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <Trophy className="w-5 h-5 text-[#5E6B62]/60" />
                          )}
                        </div>
                        <div className="min-w-0 max-w-xs">
                          <div className="font-semibold text-sm text-[#1E2A22] truncate">
                            {item.title_az}
                          </div>
                          <div className="text-xs text-[#5E6B62] line-clamp-1 mt-0.5">
                            {formatAzDateTime(item.starts_at)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${STATUS_CLASSES[item.status]}`}
                      >
                        {STATUS_LABELS[item.status]}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-[#5E6B62]">{formatAzDateTime(item.ends_at)}</td>
                    <td className="py-3.5 px-4 text-[#5E6B62]">{item.round_count}</td>
                    <td className="py-3.5 px-6">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => canEdit && togglePublish(item)}
                          disabled={!canEdit}
                          title={canEdit ? 'Dərc statusunu dəyiş' : 'Baxış rejimi'}
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${
                            item.is_published
                              ? 'bg-[#2F5D46]/15 text-[#2F5D46] border-[#2F5D46]/30'
                              : 'bg-[#F7F3EA] text-[#5E6B62] border-[rgba(26,19,12,0.15)]'
                          } ${canEdit ? 'cursor-pointer' : 'cursor-default'}`}
                        >
                          {item.is_published ? 'Dərc olunub' : 'Qaralama'}
                        </button>
                        <Link
                          href={`/tournaments/${item.id}`}
                          title="İştirakçılar və turlar"
                          className="p-2 rounded-lg text-[#2F5D46] hover:bg-[#2F5D46]/10 transition-colors"
                        >
                          <Settings2 className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => openEdit(item)}
                          disabled={!canEdit}
                          title="Redaktə et"
                          className="p-2 rounded-lg text-[#5E6B62] hover:bg-[rgba(26,19,12,0.06)] transition-colors disabled:opacity-40"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setToDelete(item);
                            setDeleteModalOpen(true);
                          }}
                          disabled={!canEdit}
                          title="Sil"
                          className="p-2 rounded-lg text-[#B3261E] hover:bg-rose-500/10 transition-colors disabled:opacity-40"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 backdrop-blur-xs p-4 sm:p-8"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !saving) setModalOpen(false);
          }}
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-3xl bg-[#FDFBF7] rounded-2xl border border-[rgba(26,19,12,0.12)] shadow-xl my-auto">
            <div className="flex items-center justify-between border-b border-[rgba(26,19,12,0.10)] pb-4 mb-5 px-6 pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#2F5D46]/40 border border-[#2F5D46] flex items-center justify-center shrink-0">
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-serif-heading font-medium">
                    {editing ? 'Turniri redaktə et' : 'Yeni turnir əlavə et'}
                  </h3>
                  <p className="text-xs text-[#5E6B62] mt-0.5">
                    Turnirin adı ən azı Azərbaycan dilində doldurulmalıdır
                  </p>
                </div>
              </div>
              <button
                onClick={() => !saving && setModalOpen(false)}
                disabled={saving}
                className="text-[#5E6B62] hover:text-[#1E2A22] p-1.5 rounded-full hover:bg-[rgba(26,19,12,0.06)] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-5">
              <div>
                <div className="flex items-center gap-1 border-b border-[rgba(26,19,12,0.12)] mb-4">
                  {LANG_TABS.map((lang) => (
                    <button
                      key={lang.key}
                      type="button"
                      onClick={() => setActiveLang(lang.key)}
                      className={`px-4 py-2 text-xs font-medium border-b-2 -mb-px transition-colors cursor-pointer ${
                        activeLang === lang.key
                          ? 'border-[#2F5D46] text-[#2F5D46]'
                          : 'border-transparent text-[#5E6B62] hover:text-[#1E2A22]'
                      }`}
                    >
                      {lang.label}
                    </button>
                  ))}
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-[#1E2A22] mb-1.5">
                      Turnirin adı {activeLang === 'az' && <span className="text-[#B3261E]">*</span>}
                    </label>
                    <input
                      type="text"
                      value={titles[activeLang]}
                      onChange={(e) => setTitles((prev) => ({ ...prev, [activeLang]: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFFFFF] border border-[rgba(26,19,12,0.15)] text-sm focus:border-[#2F5D46] focus:outline-none"
                      placeholder="Məs: U12 Turniri"
                    />
                    {formErrors.titleAz && activeLang === 'az' && (
                      <p className="text-[11px] text-[#B3261E] mt-1">{formErrors.titleAz}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#1E2A22] mb-1.5">
                      Təşkilatçı qeydləri
                    </label>
                    <textarea
                      value={descriptions[activeLang]}
                      onChange={(e) =>
                        setDescriptions((prev) => ({ ...prev, [activeLang]: e.target.value }))
                      }
                      rows={3}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFFFFF] border border-[rgba(26,19,12,0.15)] text-sm focus:border-[#2F5D46] focus:outline-none resize-y"
                      placeholder="Turnir haqqında əlavə məlumat..."
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#1E2A22] mb-1.5">
                    Başlama <span className="text-[#B3261E]">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={startsAt}
                    onChange={(e) => setStartsAt(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#FFFFFF] border border-[rgba(26,19,12,0.15)] text-xs focus:border-[#2F5D46] focus:outline-none"
                  />
                  {formErrors.startsAt && (
                    <p className="text-[11px] text-[#B3261E] mt-1">{formErrors.startsAt}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#1E2A22] mb-1.5">
                    Bitmə <span className="text-[#B3261E]">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={endsAt}
                    onChange={(e) => setEndsAt(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#FFFFFF] border border-[rgba(26,19,12,0.15)] text-xs focus:border-[#2F5D46] focus:outline-none"
                  />
                  {formErrors.endsAt && (
                    <p className="text-[11px] text-[#B3261E] mt-1">{formErrors.endsAt}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#1E2A22] mb-1.5">
                    Tur sayı <span className="text-[#B3261E]">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={roundCount}
                    onChange={(e) => setRoundCount(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#FFFFFF] border border-[rgba(26,19,12,0.15)] text-xs focus:border-[#2F5D46] focus:outline-none"
                  />
                  {formErrors.roundCount && (
                    <p className="text-[11px] text-[#B3261E] mt-1">{formErrors.roundCount}</p>
                  )}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-[#1E2A22] flex items-center gap-1.5">
                    <CalendarDays className="w-3.5 h-3.5" />
                    Keçirilmə günləri (fasilələr daxil olmaqla)
                  </label>
                  <button
                    type="button"
                    onClick={() => setDays((prev) => [...prev, emptyDay()])}
                    className="text-[11px] font-semibold text-[#2F5D46] hover:underline cursor-pointer"
                  >
                    + Gün əlavə et
                  </button>
                </div>
                {days.length === 0 ? (
                  <p className="text-[11px] text-[#5E6B62]">
                    Boş buraxılsa, yalnız ümumi başlama/bitmə tarixi göstərilir.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {days.map((day, index) => (
                      <div
                        key={index}
                        className="rounded-xl border border-[rgba(26,19,12,0.12)] bg-[#FFFFFF] p-3 grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2"
                      >
                        <input
                          type="datetime-local"
                          value={day.starts_at}
                          onChange={(e) => updateDay(index, { starts_at: e.target.value })}
                          className="px-2.5 py-2 rounded-lg border border-[rgba(26,19,12,0.15)] text-xs focus:border-[#2F5D46] focus:outline-none"
                        />
                        <input
                          type="datetime-local"
                          value={day.ends_at}
                          onChange={(e) => updateDay(index, { ends_at: e.target.value })}
                          className="px-2.5 py-2 rounded-lg border border-[rgba(26,19,12,0.15)] text-xs focus:border-[#2F5D46] focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setDays((prev) => prev.filter((_, i) => i !== index))}
                          className="p-2 rounded-lg text-[#B3261E] hover:bg-rose-500/10 cursor-pointer"
                          title="Günü sil"
                        >
                          <X className="w-4 h-4" />
                        </button>
                        <input
                          type="text"
                          value={day.note_az}
                          onChange={(e) => updateDay(index, { note_az: e.target.value })}
                          placeholder="Qeyd (AZ)"
                          className="sm:col-span-3 px-2.5 py-2 rounded-lg border border-[rgba(26,19,12,0.15)] text-xs focus:border-[#2F5D46] focus:outline-none"
                        />
                        <input
                          type="text"
                          value={day.note_en}
                          onChange={(e) => updateDay(index, { note_en: e.target.value })}
                          placeholder="Qeyd (EN)"
                          className="sm:col-span-3 px-2.5 py-2 rounded-lg border border-[rgba(26,19,12,0.15)] text-xs focus:border-[#2F5D46] focus:outline-none"
                        />
                        <input
                          type="text"
                          value={day.note_ru}
                          onChange={(e) => updateDay(index, { note_ru: e.target.value })}
                          placeholder="Qeyd (RU)"
                          className="sm:col-span-3 px-2.5 py-2 rounded-lg border border-[rgba(26,19,12,0.15)] text-xs focus:border-[#2F5D46] focus:outline-none"
                        />
                      </div>
                    ))}
                  </div>
                )}
                {formErrors.days && (
                  <p className="text-[11px] text-[#B3261E] mt-1">{formErrors.days}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-[#1E2A22] mb-1.5">Cover şəkli</label>
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleCoverChange}
                  className="hidden"
                />
                <div className="flex items-center gap-4">
                  <div className="w-24 h-20 rounded-xl bg-[#F7F3EA] border border-[rgba(26,19,12,0.12)] overflow-hidden flex items-center justify-center shrink-0">
                    {coverPreview ? (
                      <img src={coverPreview} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Upload className="w-5 h-5 text-[#5E6B62]/60" />
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => coverInputRef.current?.click()}
                    className="px-4 py-2 rounded-full bg-[#FFFFFF] border border-[rgba(26,19,12,0.15)] text-xs font-medium text-[#1E2A22] hover:bg-[#F7F3EA] cursor-pointer"
                  >
                    Şəkil seç
                  </button>
                </div>
                {formErrors.cover && (
                  <p className="text-[11px] text-[#B3261E] mt-1">{formErrors.cover}</p>
                )}
              </div>

              <label className="flex items-center gap-2.5 text-xs text-[#1E2A22] cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPublished}
                  onChange={(e) => setIsPublished(e.target.checked)}
                  className="w-4 h-4 accent-[#2F5D46]"
                />
                Turniri saytda dərc et
              </label>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-[rgba(26,19,12,0.10)]">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  disabled={saving}
                  className="px-5 py-2 rounded-full text-xs font-medium text-[#5E6B62] hover:bg-[rgba(26,19,12,0.06)] cursor-pointer disabled:opacity-50"
                >
                  Ləğv et
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-full bg-[#2F5D46] hover:bg-[#1F3D2F] text-white text-xs font-medium cursor-pointer disabled:opacity-50"
                >
                  {saving ? 'Saxlanılır...' : editing ? 'Yadda saxla' : 'Turniri yarat'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setToDelete(null);
        }}
        onConfirm={handleDelete}
        isLoading={deleting}
        title="Turniri sil"
        description={`"${toDelete?.title_az}" turnirini, iştirakçılarını və bütün turlarını silmək istədiyinizdən əminsiniz? Bu əməliyyat geri qaytarıla bilməz.`}
        confirmText="Sil"
        cancelText="Ləğv et"
      />
    </div>
  );
}
