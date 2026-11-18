'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Newspaper,
  Plus,
  Search,
  RefreshCw,
  Edit,
  Trash2,
  Upload,
  X,
  Clock,
  Image as ImageIcon,
  Video,
  Globe,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { News, NewsLocale, NewsMedia } from '@/lib/types';
import {
  formatAzDate,
  getFriendlyErrorMessage,
  sanitizeFileName,
  extractStoragePath,
} from '@/lib/utils';
import { useToast } from '@/components/ui/ToastContext';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { useAuth } from '@/contexts/AuthContext';

const LANG_TABS: { key: NewsLocale; label: string }[] = [
  { key: 'az', label: 'Azərbaycan' },
  { key: 'en', label: 'English' },
  { key: 'ru', label: 'Русский' },
];

type LangTexts = Record<NewsLocale, string>;

const emptyTexts = (): LangTexts => ({ az: '', en: '', ru: '' });

const COVER_MAX_SIZE = 5 * 1024 * 1024;
const IMAGE_MAX_SIZE = 10 * 1024 * 1024;
const VIDEO_MAX_SIZE = 50 * 1024 * 1024;

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];

type StatusFilter = 'all' | 'published' | 'draft';

/** Başlıq, ID və ya /updates/<id> linki ilə axtarış üçün sorğunu normalizə edir. */
function normalizeSearchQuery(value: string): string {
  const trimmed = value.trim();
  const idMatch = trimmed.match(
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i
  );
  return (idMatch ? idMatch[0] : trimmed).toLowerCase();
}

export default function NewsPage() {
  const [news, setNews] = useState<News[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingNews, setEditingNews] = useState<News | null>(null);
  const [activeLang, setActiveLang] = useState<NewsLocale>('az');
  const [titles, setTitles] = useState<LangTexts>(emptyTexts());
  const [bodies, setBodies] = useState<LangTexts>(emptyTexts());
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [isPublished, setIsPublished] = useState(false);
  const [existingMedia, setExistingMedia] = useState<NewsMedia[]>([]);
  const [removedMedia, setRemovedMedia] = useState<NewsMedia[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  // Delete
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [newsToDelete, setNewsToDelete] = useState<News | null>(null);
  const [deleting, setDeleting] = useState(false);

  const coverInputRef = useRef<HTMLInputElement>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);

  const { showSuccess, showError } = useToast();
  const { canEdit } = useAuth();

  const fetchNews = useCallback(
    async (isRefresh = false) => {
      try {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);

        const supabase = createClient();
        const { data, error } = await supabase
          .from('news')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          showError(getFriendlyErrorMessage(error));
          return;
        }

        setNews((data as News[]) || []);
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
    fetchNews();
  }, [fetchNews]);

  const fetchMedia = useCallback(
    async (newsId: string) => {
      setMediaLoading(true);
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('news_media')
          .select('*')
          .eq('news_id', newsId)
          .order('sort_order', { ascending: true });

        if (error) throw error;
        setExistingMedia((data as NewsMedia[]) || []);
      } catch (err) {
        showError(getFriendlyErrorMessage(err));
        setExistingMedia([]);
      } finally {
        setMediaLoading(false);
      }
    },
    [showError]
  );

  const filteredNews = useMemo(() => {
    const query = normalizeSearchQuery(searchQuery);
    return news.filter((item) => {
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'published' && item.is_published) ||
        (statusFilter === 'draft' && !item.is_published);
      const matchesSearch =
        query === '' ||
        item.id.toLowerCase().includes(query) ||
        [item.title_az, item.title_en, item.title_ru]
          .filter(Boolean)
          .some((value) => (value as string).toLowerCase().includes(query));
      return matchesStatus && matchesSearch;
    });
  }, [news, statusFilter, searchQuery]);

  const resetForm = () => {
    setEditingNews(null);
    setActiveLang('az');
    setTitles(emptyTexts());
    setBodies(emptyTexts());
    setCoverFile(null);
    setCoverPreview(null);
    setIsPublished(false);
    setExistingMedia([]);
    setRemovedMedia([]);
    setSelectedFiles([]);
    setFormErrors({});
    setUploadProgress(null);
  };

  const openCreateModal = () => {
    resetForm();
    setModalOpen(true);
  };

  const openEditModal = async (item: News) => {
    resetForm();
    setEditingNews(item);
    setTitles({
      az: item.title_az || '',
      en: item.title_en || '',
      ru: item.title_ru || '',
    });
    setBodies({
      az: item.body_az || '',
      en: item.body_en || '',
      ru: item.body_ru || '',
    });
    setCoverPreview(item.cover_url || null);
    setIsPublished(Boolean(item.is_published));
    setModalOpen(true);
    await fetchMedia(item.id);
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > COVER_MAX_SIZE) {
      setFormErrors((prev) => ({ ...prev, cover: 'Cover şəklinin həcmi maksimum 5 MB ola bilər.' }));
      return;
    }
    if (!IMAGE_TYPES.includes(file.type)) {
      setFormErrors((prev) => ({ ...prev, cover: 'Yalnız JPG, PNG və ya WebP formatlı şəkil qəbul edilir.' }));
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

  const handleMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const valid: File[] = [];
    let error = '';

    for (const file of files) {
      const isVideo = VIDEO_TYPES.includes(file.type);
      const isImage = IMAGE_TYPES.includes(file.type);
      if (!isVideo && !isImage) {
        error = 'Yalnız şəkil (JPG/PNG/WebP/GIF) və ya video (MP4/WebM/MOV) faylları qəbul edilir.';
        continue;
      }
      if (isVideo && file.size > VIDEO_MAX_SIZE) {
        error = 'Video faylının həcmi maksimum 50 MB ola bilər.';
        continue;
      }
      if (isImage && file.size > IMAGE_MAX_SIZE) {
        error = 'Şəkil faylının həcmi maksimum 10 MB ola bilər.';
        continue;
      }
      valid.push(file);
    }

    if (error) setFormErrors((prev) => ({ ...prev, media: error }));
    else
      setFormErrors((prev) => {
        const next = { ...prev };
        delete next.media;
        return next;
      });

    if (valid.length > 0) setSelectedFiles((prev) => [...prev, ...valid]);
    e.target.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    if (!titles.az.trim()) errors.titleAz = 'Azərbaycan dilində başlıq mütləqdir.';
    if (!bodies.az.trim()) errors.bodyAz = 'Azərbaycan dilində mətn mütləqdir.';
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      setActiveLang('az');
      return;
    }

    try {
      setSaving(true);
      setUploadProgress(10);
      const supabase = createClient();

      // 1. Cover yüklə
      let coverUrl = editingNews?.cover_url || null;
      if (coverFile) {
        const path = `${Date.now()}-${sanitizeFileName(coverFile.name)}`;
        const { error: uploadError } = await supabase.storage
          .from('news-covers')
          .upload(path, coverFile, { cacheControl: '3600', upsert: false });
        if (uploadError) throw new Error(`Cover yüklənmədi: ${uploadError.message}`);

        const { data: urlData } = supabase.storage.from('news-covers').getPublicUrl(path);
        const oldPath = extractStoragePath(coverUrl, 'news-covers');
        coverUrl = urlData.publicUrl;

        if (oldPath) {
          try {
            await supabase.storage.from('news-covers').remove([oldPath]);
          } catch {
            // ignore
          }
        }
      }

      setUploadProgress(35);

      // 2. Yeniliyi yarat / yenilə
      const payload = {
        title_az: titles.az.trim(),
        title_en: titles.en.trim() || null,
        title_ru: titles.ru.trim() || null,
        body_az: bodies.az.trim(),
        body_en: bodies.en.trim() || null,
        body_ru: bodies.ru.trim() || null,
        cover_url: coverUrl,
        is_published: isPublished,
      };

      let savedNews: News;
      if (editingNews) {
        const { data, error } = await supabase
          .from('news')
          .update(payload)
          .eq('id', editingNews.id)
          .select()
          .single();
        if (error) throw error;
        savedNews = data as News;
      } else {
        const { data, error } = await supabase.from('news').insert([payload]).select().single();
        if (error) throw error;
        savedNews = data as News;
      }

      setUploadProgress(55);

      // 3. Silinmək üçün işarələnmiş media
      for (const item of removedMedia) {
        const { error: dbError } = await supabase.from('news_media').delete().eq('id', item.id);
        if (dbError) throw dbError;
        const path = extractStoragePath(item.url, 'news-media');
        if (path) {
          try {
            await supabase.storage.from('news-media').remove([path]);
          } catch {
            // ignore
          }
        }
      }

      // 4. Yeni media faylları
      const nextOrder = existingMedia.length - removedMedia.length;
      for (let index = 0; index < selectedFiles.length; index++) {
        const file = selectedFiles[index];
        const mediaType = VIDEO_TYPES.includes(file.type) ? 'video' : 'image';
        const path = `${savedNews.id}/${Date.now()}-${index}-${sanitizeFileName(file.name)}`;

        const { error: uploadError } = await supabase.storage
          .from('news-media')
          .upload(path, file, { cacheControl: '3600', upsert: false });
        if (uploadError) throw new Error(`Media yüklənmədi: ${uploadError.message}`);

        const { data: urlData } = supabase.storage.from('news-media').getPublicUrl(path);
        const { error: insertError } = await supabase.from('news_media').insert([
          {
            news_id: savedNews.id,
            media_type: mediaType,
            url: urlData.publicUrl,
            file_name: file.name,
            caption: null,
            sort_order: nextOrder + index,
          },
        ]);
        if (insertError) throw insertError;

        setUploadProgress(55 + Math.round(((index + 1) / selectedFiles.length) * 40));
      }

      if (editingNews) {
        setNews((prev) => prev.map((n) => (n.id === savedNews.id ? savedNews : n)));
        showSuccess('Yenilik uğurla yeniləndi.');
      } else {
        setNews((prev) => [savedNews, ...prev]);
        showSuccess('Yeni yenilik uğurla əlavə edildi.');
      }

      setUploadProgress(100);
      setModalOpen(false);
    } catch (err) {
      showError(getFriendlyErrorMessage(err));
    } finally {
      setSaving(false);
      setUploadProgress(null);
    }
  };

  const togglePublish = async (item: News) => {
    try {
      const supabase = createClient();
      const nextValue = !item.is_published;
      const { data, error } = await supabase
        .from('news')
        .update({ is_published: nextValue })
        .eq('id', item.id)
        .select()
        .single();
      if (error) throw error;

      setNews((prev) => prev.map((n) => (n.id === item.id ? (data as News) : n)));
      showSuccess(nextValue ? 'Yenilik saytda dərc olundu.' : 'Yenilik qaralamaya qaytarıldı.');
    } catch (err) {
      showError(getFriendlyErrorMessage(err));
    }
  };

  const confirmDelete = (item: News) => {
    setNewsToDelete(item);
    setDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!newsToDelete) return;
    try {
      setDeleting(true);
      const supabase = createClient();

      const { data: media } = await supabase
        .from('news_media')
        .select('url')
        .eq('news_id', newsToDelete.id);

      const { error } = await supabase.from('news').delete().eq('id', newsToDelete.id);
      if (error) throw error;

      const paths = ((media as { url: string }[]) || [])
        .map((m) => extractStoragePath(m.url, 'news-media'))
        .filter(Boolean) as string[];
      if (paths.length > 0) {
        try {
          await supabase.storage.from('news-media').remove(paths);
        } catch {
          // ignore
        }
      }

      const coverPath = extractStoragePath(newsToDelete.cover_url, 'news-covers');
      if (coverPath) {
        try {
          await supabase.storage.from('news-covers').remove([coverPath]);
        } catch {
          // ignore
        }
      }

      setNews((prev) => prev.filter((n) => n.id !== newsToDelete.id));
      showSuccess('Yenilik uğurla silindi.');
      setDeleteModalOpen(false);
      setNewsToDelete(null);
    } catch (err) {
      showError(getFriendlyErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  const statusPills: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: 'Hamısı' },
    { key: 'published', label: 'Dərc olunanlar' },
    { key: 'draft', label: 'Qaralamalar' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-serif-heading font-medium tracking-tight text-[#1E2A22]">
            Yeniliklər
          </h1>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchNews(true)}
            disabled={refreshing || loading}
            className="px-4 py-2 rounded-full bg-[#FFFFFF] hover:bg-[#F7F3EA] text-[#1E2A22] font-medium text-xs border border-[rgba(26,19,12,0.15)] transition-colors cursor-pointer inline-flex items-center gap-2 shadow-2xs disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Yenilə
          </button>

          {canEdit && (
            <button
              onClick={openCreateModal}
              className="px-5 py-2.5 rounded-full bg-[#2F5D46] hover:bg-[#254B38] text-[#F7F3EA] font-semibold text-xs tracking-wide transition-all shadow-2xs hover:shadow-xs inline-flex items-center gap-2 cursor-pointer active:scale-98"
            >
              <Plus className="w-4 h-4" />
              Yeni yenilik
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
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
              {pill.key === 'all' ? ` (${news.length})` : ''}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-[#5E6B62] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Başlıq, ID və ya /updates/<id> linki ilə axtar..."
            className="w-full pl-9 pr-3.5 py-2 bg-[#F7F3EA] border border-[rgba(26,19,12,0.15)] rounded-full text-xs text-[#1E2A22] placeholder-[#5E6B62]/60 focus:border-[#2F5D46] focus:bg-[#FFFFFF] focus:outline-none transition-colors"
          />
        </div>
      </div>

      {/* List */}
      <div className="bg-[#FFFFFF] border border-[rgba(26,19,12,0.10)] rounded-2xl shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-sm text-[#5E6B62] flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-2 border-[#2F5D46] border-t-[#1F3D2F] rounded-full animate-spin" />
            <span className="font-medium text-xs">Yeniliklər yüklənir...</span>
          </div>
        ) : filteredNews.length === 0 ? (
          <div className="p-16 text-center">
            <Newspaper className="w-12 h-12 text-[#5E6B62]/40 mx-auto mb-3" />
            <h3 className="text-base font-serif-heading font-medium text-[#1E2A22]">
              Yenilik tapılmadı
            </h3>
            {Boolean(searchQuery || statusFilter !== 'all') && (
              <p className="text-xs text-[#5E6B62] mt-1">
                Axtarış filtrinə uyğun heç bir yenilik tapılmadı.
              </p>
            )}
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="bg-[#1F3D2F] text-[#C9D3C4] uppercase text-[11px] tracking-wider border-b border-[rgba(243,236,225,0.10)]">
                    <th className="py-4 px-6 font-semibold">Yenilik</th>
                    <th className="py-4 px-4 font-semibold">Dillər</th>
                    <th className="py-4 px-4 font-semibold">Status</th>
                    <th className="py-4 px-4 font-semibold">Tarix</th>
                    <th className="py-4 px-6 text-right font-semibold">Əməliyyatlar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[rgba(26,19,12,0.08)]">
                  {filteredNews.map((item) => (
                    <tr key={item.id} className="hover:bg-[#2F5D46]/15 transition-colors">
                      <td className="py-3.5 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-14 h-11 rounded-lg bg-[#F7F3EA] border border-[rgba(26,19,12,0.12)] overflow-hidden shrink-0 flex items-center justify-center shadow-2xs">
                            {item.cover_url ? (
                              <img src={item.cover_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <Newspaper className="w-5 h-5 text-[#5E6B62]/60" />
                            )}
                          </div>
                          <div className="min-w-0 max-w-xs">
                            <div className="font-semibold text-sm text-[#1E2A22] truncate">
                              {item.title_az}
                            </div>
                            <div className="text-xs text-[#5E6B62] line-clamp-1 mt-0.5">
                              {item.body_az}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1">
                          {LANG_TABS.map((lang) => {
                            const filled = Boolean(
                              lang.key === 'az'
                                ? item.title_az && item.body_az
                                : (lang.key === 'en' ? item.title_en && item.body_en : item.title_ru && item.body_ru)
                            );
                            return (
                              <span
                                key={lang.key}
                                title={lang.label}
                                className={`w-6 h-6 rounded-full text-[10px] font-semibold flex items-center justify-center border ${
                                  filled
                                    ? 'bg-[#2F5D46]/15 text-[#2F5D46] border-[#2F5D46]/30'
                                    : 'bg-transparent text-[#5E6B62]/50 border-[rgba(26,19,12,0.15)]'
                                }`}
                              >
                                {lang.key.toUpperCase()}
                              </span>
                            );
                          })}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => canEdit && togglePublish(item)}
                          disabled={!canEdit}
                          title={canEdit ? 'Dərc statusunu dəyiş' : 'Baxış rejimi'}
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${
                            item.is_published
                              ? 'bg-[#2F5D46]/15 text-[#2F5D46] border-[#2F5D46]/30'
                              : 'bg-[#F7F3EA] text-[#5E6B62] border-[rgba(26,19,12,0.15)]'
                          } ${canEdit ? 'cursor-pointer' : 'cursor-default'}`}
                        >
                          {item.is_published ? 'Dərc olunub' : 'Qaralama'}
                        </button>
                      </td>
                      <td className="py-3.5 px-4 text-[#5E6B62] text-xs">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {formatAzDate(item.created_at)}
                        </span>
                      </td>
                      <td className="py-3.5 px-6 text-right">
                        {canEdit ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openEditModal(item)}
                              className="p-1.5 text-[#5E6B62] hover:text-[#1E2A22] hover:bg-[#F7F3EA] rounded-lg transition-colors cursor-pointer"
                              title="Redaktə et"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => confirmDelete(item)}
                              className="p-1.5 text-[#B3261E] hover:bg-[#B3261E]/10 rounded-lg transition-colors cursor-pointer"
                              title="Sil"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-[#5E6B62]/40 select-none">Baxış</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="md:hidden divide-y divide-[rgba(26,19,12,0.08)]">
              {filteredNews.map((item) => (
                <div key={item.id} className="p-4 space-y-3">
                  <div className="flex gap-3">
                    <div className="w-16 h-14 rounded-lg bg-[#F7F3EA] border border-[rgba(26,19,12,0.12)] overflow-hidden shrink-0 flex items-center justify-center">
                      {item.cover_url ? (
                        <img src={item.cover_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Newspaper className="w-6 h-6 text-[#5E6B62]/60" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-[#1E2A22] leading-snug">
                        {item.title_az}
                      </div>
                      <div className="text-[11px] text-[#5E6B62] mt-1">
                        {formatAzDate(item.created_at)}
                      </div>
                      <span
                        className={`inline-block mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                          item.is_published
                            ? 'bg-[#2F5D46]/15 text-[#2F5D46] border-[#2F5D46]/30'
                            : 'bg-[#F7F3EA] text-[#5E6B62] border-[rgba(26,19,12,0.15)]'
                        }`}
                      >
                        {item.is_published ? 'Dərc olunub' : 'Qaralama'}
                      </span>
                    </div>
                  </div>
                  {canEdit && (
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-[rgba(26,19,12,0.08)]">
                      <button
                        onClick={() => openEditModal(item)}
                        className="px-3 py-1 bg-[#F7F3EA] border border-[rgba(26,19,12,0.15)] rounded-full text-[#1E2A22] font-medium flex items-center gap-1 text-xs"
                      >
                        <Edit className="w-3.5 h-3.5" /> Redaktə
                      </button>
                      <button
                        onClick={() => confirmDelete(item)}
                        className="p-1.5 text-[#B3261E] bg-[#B3261E]/10 rounded-full border border-[#B3261E]/20"
                        title="Sil"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto bg-[#1F3D2F]/80 backdrop-blur-xs">
          <div
            className="w-full max-w-3xl bg-[#FFFFFF] border border-[rgba(26,19,12,0.15)] rounded-2xl p-6 sm:p-7 shadow-2xl text-[#1E2A22] my-8"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between border-b border-[rgba(26,19,12,0.10)] pb-4 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#2F5D46]/40 border border-[#2F5D46] flex items-center justify-center shrink-0">
                  <Newspaper className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-serif-heading font-medium">
                    {editingNews ? 'Yeniliyi redaktə et' : 'Yeni yenilik əlavə et'}
                  </h3>
                  <p className="text-xs text-[#5E6B62] mt-0.5">
                    Başlıq və mətn ən azı Azərbaycan dilində doldurulmalıdır
                  </p>
                </div>
              </div>
              <button
                onClick={() => !saving && setModalOpen(false)}
                disabled={saving}
                className="text-[#5E6B62] hover:text-[#1E2A22] p-1.5 rounded-full hover:bg-[rgba(26,19,12,0.06)] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Language tabs */}
              <div>
                <div className="flex items-center gap-1.5 mb-3">
                  <Globe className="w-4 h-4 text-[#5E6B62] mr-1" />
                  {LANG_TABS.map((lang) => (
                    <button
                      key={lang.key}
                      type="button"
                      onClick={() => setActiveLang(lang.key)}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                        activeLang === lang.key
                          ? 'bg-[#1E2A22] text-[#F7F3EA] font-semibold'
                          : 'bg-[#F7F3EA] text-[#5E6B62] hover:text-[#1E2A22] border border-[rgba(26,19,12,0.15)]'
                      }`}
                    >
                      {lang.label}
                      {lang.key === 'az' && <span className="text-[#D9774A]"> *</span>}
                    </button>
                  ))}
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#1E2A22] mb-1.5">
                      Yeniliyin başlığı {activeLang === 'az' && <span className="text-[#B3261E]">*</span>}
                    </label>
                    <input
                      type="text"
                      value={titles[activeLang]}
                      onChange={(e) => setTitles((prev) => ({ ...prev, [activeLang]: e.target.value }))}
                      placeholder={activeLang === 'az' ? 'Məsələn: Yay düşərgəsinə qeydiyyat açıldı' : 'Başlıq'}
                      className={`w-full px-3.5 py-2.5 bg-[#F7F3EA] border rounded-xl text-xs sm:text-sm text-[#1E2A22] placeholder-[#5E6B62]/60 focus:bg-[#FFFFFF] focus:outline-none transition-colors ${
                        formErrors.titleAz && activeLang === 'az'
                          ? 'border-[#B3261E]'
                          : 'border-[rgba(26,19,12,0.15)] focus:border-[#2F5D46]'
                      }`}
                    />
                    {formErrors.titleAz && activeLang === 'az' && (
                      <p className="text-xs text-[#B3261E] mt-1">{formErrors.titleAz}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#1E2A22] mb-1.5">
                      Yeniliyin mətni {activeLang === 'az' && <span className="text-[#B3261E]">*</span>}
                    </label>
                    <textarea
                      rows={7}
                      value={bodies[activeLang]}
                      onChange={(e) => setBodies((prev) => ({ ...prev, [activeLang]: e.target.value }))}
                      placeholder="Yeniliyin tam mətnini daxil edin..."
                      className={`w-full px-3.5 py-2.5 bg-[#F7F3EA] border rounded-xl text-xs sm:text-sm text-[#1E2A22] placeholder-[#5E6B62]/60 focus:bg-[#FFFFFF] focus:outline-none transition-colors resize-y ${
                        formErrors.bodyAz && activeLang === 'az'
                          ? 'border-[#B3261E]'
                          : 'border-[rgba(26,19,12,0.15)] focus:border-[#2F5D46]'
                      }`}
                    />
                    {formErrors.bodyAz && activeLang === 'az' && (
                      <p className="text-xs text-[#B3261E] mt-1">{formErrors.bodyAz}</p>
                    )}
                    {activeLang !== 'az' && (
                      <p className="text-[11px] text-[#5E6B62] mt-1">
                        Boş buraxsanız, saytda Azərbaycan dilindəki mətn göstərilir.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Cover */}
              <div>
                <label className="block text-xs font-semibold text-[#1E2A22] mb-1.5">
                  Cover şəkli <span className="text-[#5E6B62] font-normal">(JPG / PNG / WebP, max 5 MB)</span>
                </label>
                <div className="flex items-center gap-4">
                  {coverPreview && (
                    <div className="w-24 h-16 rounded-xl bg-[#F7F3EA] border border-[rgba(26,19,12,0.15)] overflow-hidden shrink-0 shadow-2xs">
                      <img src={coverPreview} alt="Cover" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <input
                    ref={coverInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleCoverChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => coverInputRef.current?.click()}
                    className="flex-1 py-2.5 px-3 bg-[#F7F3EA] hover:bg-[#2F5D46]/20 border border-dashed border-[rgba(26,19,12,0.20)] hover:border-[#2F5D46] rounded-xl text-xs text-[#5E6B62] hover:text-[#1E2A22] flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <Upload className="w-4 h-4 text-[#2F5D46]" />
                    <span className="truncate">
                      {coverFile ? coverFile.name : 'Şəkil seçin və ya dəyişdirin'}
                    </span>
                  </button>
                </div>
                {formErrors.cover && (
                  <p className="text-xs text-[#B3261E] mt-1">{formErrors.cover}</p>
                )}
              </div>

              {/* Extra media */}
              <div className="border-t border-[rgba(26,19,12,0.10)] pt-5">
                <label className="block text-xs font-semibold text-[#1E2A22] mb-1.5">
                  Əlavə şəkillər və videolar
                  <span className="text-[#5E6B62] font-normal ml-1">
                    (şəkil 10 MB, video 50 MB-a qədər)
                  </span>
                </label>

                <input
                  ref={mediaInputRef}
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
                  onChange={handleMediaChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => mediaInputRef.current?.click()}
                  className="w-full py-3 px-3 bg-[#F7F3EA] hover:bg-[#2F5D46]/20 border border-dashed border-[rgba(26,19,12,0.20)] hover:border-[#2F5D46] rounded-xl text-xs text-[#5E6B62] hover:text-[#1E2A22] flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Upload className="w-4 h-4 text-[#2F5D46]" />
                  Fayl seçin (bir neçə fayl ola bilər)
                </button>
                {formErrors.media && (
                  <p className="text-xs text-[#B3261E] mt-1">{formErrors.media}</p>
                )}

                {mediaLoading && (
                  <p className="text-xs text-[#5E6B62] mt-3">Media yüklənir...</p>
                )}

                {(existingMedia.length > 0 || removedMedia.length > 0 || selectedFiles.length > 0) && (
                  <div className="mt-3 space-y-1.5">
                    {existingMedia.map((file) => {
                      const removed = removedMedia.some((r) => r.id === file.id);
                      return (
                        <div
                          key={file.id}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs ${
                            removed
                              ? 'bg-[#B3261E]/5 border-[#B3261E]/20 text-[#5E6B62] line-through'
                              : 'bg-[#F7F3EA] border-[rgba(26,19,12,0.12)] text-[#1E2A22]'
                          }`}
                        >
                          {file.media_type === 'video' ? (
                            <Video className="w-3.5 h-3.5 shrink-0 text-[#2F5D46]" />
                          ) : (
                            <ImageIcon className="w-3.5 h-3.5 shrink-0 text-[#2F5D46]" />
                          )}
                          <span className="truncate flex-1">{file.file_name || file.url}</span>
                          <button
                            type="button"
                            onClick={() =>
                              removed
                                ? setRemovedMedia((prev) => prev.filter((r) => r.id !== file.id))
                                : setRemovedMedia((prev) => [...prev, file])
                            }
                            className="text-[11px] font-semibold text-[#B3261E] hover:underline cursor-pointer"
                          >
                            {removed ? 'Bərpa et' : 'Sil'}
                          </button>
                        </div>
                      );
                    })}

                    {selectedFiles.map((file, index) => (
                      <div
                        key={`${file.name}-${index}`}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg border text-xs bg-[#2F5D46]/10 border-[#2F5D46]/25 text-[#1E2A22]"
                      >
                        {file.type.startsWith('video/') ? (
                          <Video className="w-3.5 h-3.5 shrink-0 text-[#2F5D46]" />
                        ) : (
                          <ImageIcon className="w-3.5 h-3.5 shrink-0 text-[#2F5D46]" />
                        )}
                        <span className="truncate flex-1">{file.name}</span>
                        <span className="text-[10px] text-[#5E6B62]">yeni</span>
                        <button
                          type="button"
                          onClick={() => setSelectedFiles((prev) => prev.filter((_, i) => i !== index))}
                          className="text-[#B3261E] cursor-pointer"
                          title="Siyahıdan çıxar"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Publish */}
              <label className="flex items-center gap-2.5 text-xs font-semibold text-[#1E2A22] cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPublished}
                  onChange={(e) => setIsPublished(e.target.checked)}
                  className="w-4 h-4 accent-[#2F5D46]"
                />
                Saytda dərc et
                <span className="font-normal text-[#5E6B62]">
                  (işarələnməsə yalnız qaralama kimi saxlanır)
                </span>
              </label>

              {uploadProgress !== null && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-[#5E6B62]">
                    <span>Fayllar yüklənir və qeyd olunur...</span>
                    <span className="font-mono font-medium">{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-[#F7F3EA] rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-[#2F5D46] h-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="pt-4 border-t border-[rgba(26,19,12,0.10)] flex items-center justify-end gap-3">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setModalOpen(false)}
                  className="px-5 py-2.5 text-xs font-semibold text-[#1E2A22] bg-[#F7F3EA] hover:bg-[#2F5D46]/30 border border-[rgba(26,19,12,0.15)] rounded-full transition-colors cursor-pointer"
                >
                  Ləğv et
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 text-xs font-semibold bg-[#2F5D46] hover:bg-[#254B38] text-[#F7F3EA] rounded-full transition-all cursor-pointer flex items-center gap-2 shadow-2xs hover:shadow-xs disabled:opacity-50"
                >
                  {saving && (
                    <span className="w-3.5 h-3.5 border-2 border-[#F7F3EA]/40 border-t-[#F7F3EA] rounded-full animate-spin" />
                  )}
                  {editingNews ? 'Yadda saxla' : 'Əlavə et'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={deleteModalOpen}
        title="Yeniliyi sil"
        description={`"${newsToDelete?.title_az}" yeniliyini və ona aid şəkil/video fayllarını silmək istədiyinizdən əminsiniz? Bu əməliyyat geri qaytarıla bilməz.`}
        confirmText="Sil"
        cancelText="Ləğv et"
        isDestructive={true}
        isLoading={deleting}
        onConfirm={handleDelete}
        onClose={() => {
          setDeleteModalOpen(false);
          setNewsToDelete(null);
        }}
      />
    </div>
  );
}
