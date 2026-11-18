'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  BookOpen,
  Plus,
  Search,
  RefreshCw,
  Edit,
  Trash2,
  FileText,
  Upload,
  X,
  ExternalLink,
  Clock,
  Layers,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Book, BookLevel } from '@/lib/types';
import {
  formatAzDate,
  getFriendlyErrorMessage,
  sanitizeFileName,
  extractStoragePath,
} from '@/lib/utils';
import { useToast } from '@/components/ui/ToastContext';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { useAuth } from '@/contexts/AuthContext';

const LEVEL_LABELS: Record<BookLevel, string> = {
  beginner: 'Başlayan',
  intermediate: 'Orta',
  advanced: 'İrəli',
};

const LEVEL_COLORS: Record<BookLevel, { bg: string; text: string; border: string }> = {
  beginner: { bg: 'bg-[#2F5D46]/15', text: 'text-[#2F5D46]', border: 'border-[#2F5D46]/30' },
  intermediate: { bg: 'bg-[#2F5D46]/15', text: 'text-[#2F5D46]', border: 'border-[#2F5D46]/30' },
  advanced: { bg: 'bg-[#5b6f8a]/15', text: 'text-[#5b6f8a]', border: 'border-[#5b6f8a]/30' },
};

export default function BooksPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState<'all' | BookLevel>('all');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);

  // Form Fields
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [description, setDescription] = useState('');
  const [level, setLevel] = useState<BookLevel>('beginner');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  // Delete State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [bookToDelete, setBookToDelete] = useState<Book | null>(null);
  const [deleting, setDeleting] = useState(false);

  const coverInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const { showSuccess, showError } = useToast();
  const { canEdit } = useAuth();

  const fetchBooks = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const supabase = createClient();
      const { data, error } = await supabase
        .from('books')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        showError(getFriendlyErrorMessage(error));
        return;
      }

      setBooks((data as Book[]) || []);
    } catch (err) {
      showError(getFriendlyErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [showError]);

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  const filteredBooks = useMemo(() => {
    return books.filter((item) => {
      const matchesLevel = levelFilter === 'all' ? true : item.level === levelFilter;
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        query === ''
          ? true
          : item.title.toLowerCase().includes(query) ||
            (item.author && item.author.toLowerCase().includes(query)) ||
            (item.description && item.description.toLowerCase().includes(query));
      return matchesLevel && matchesSearch;
    });
  }, [books, levelFilter, searchQuery]);

  // Open Create Modal
  const openCreateModal = () => {
    setEditingBook(null);
    setTitle('');
    setAuthor('');
    setDescription('');
    setLevel('beginner');
    setCoverFile(null);
    setCoverPreview(null);
    setPdfFile(null);
    setFormErrors({});
    setUploadProgress(null);
    setModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (book: Book) => {
    setEditingBook(book);
    setTitle(book.title);
    setAuthor(book.author || '');
    setDescription(book.description || '');
    setLevel(book.level || 'beginner');
    setCoverFile(null);
    setCoverPreview(book.cover_url || null);
    setPdfFile(null);
    setFormErrors({});
    setUploadProgress(null);
    setModalOpen(true);
  };

  // Handle Cover File Selection
  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setFormErrors((prev) => ({
        ...prev,
        cover: 'Üz qabığı şəklinin həcmi maksimum 2 MB ola bilər.',
      }));
      return;
    }

    // Validate type (JPG, PNG, WebP)
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setFormErrors((prev) => ({
        ...prev,
        cover: 'Yalnız JPG, PNG və ya WebP formatlı şəkillər qəbul edilir.',
      }));
      return;
    }

    setFormErrors((prev) => {
      const rest = { ...prev };
      delete rest.cover;
      return rest;
    });

    setCoverFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setCoverPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Handle PDF File Selection
  const handlePdfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (max 25MB)
    if (file.size > 25 * 1024 * 1024) {
      setFormErrors((prev) => ({
        ...prev,
        pdf: 'PDF sənədinin həcmi maksimum 25 MB ola bilər.',
      }));
      return;
    }

    // Validate type (PDF only)
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setFormErrors((prev) => ({
        ...prev,
        pdf: 'Yalnız PDF formatlı fayllar qəbul edilir.',
      }));
      return;
    }

    setFormErrors((prev) => {
      const rest = { ...prev };
      delete rest.pdf;
      return rest;
    });

    setPdfFile(file);
  };

  // Save Book (Create / Update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    if (!title.trim()) {
      errors.title = 'Kitabın başlığı mütləq qeyd edilməlidir.';
    }

    if (!editingBook && !pdfFile) {
      errors.pdf = 'Yeni kitab əlavə edərkən PDF faylı yüklənməlidir.';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      setSaving(true);
      setUploadProgress(15);
      const supabase = createClient();

      let currentCoverUrl = editingBook ? editingBook.cover_url : null;
      let currentFileUrl = editingBook ? editingBook.file_url : null;
      let currentFileName = editingBook ? editingBook.file_name : null;

      // 1. Upload Cover Image if selected
      if (coverFile) {
        setUploadProgress(35);
        const uniqueCoverName = `${Date.now()}-${sanitizeFileName(coverFile.name)}`;
        const { error: coverUploadError } = await supabase.storage
          .from('book-covers')
          .upload(uniqueCoverName, coverFile, {
            cacheControl: '3600',
            upsert: false,
          });

        if (coverUploadError) {
          throw new Error(`Üz qabığı yüklənmədi: ${coverUploadError.message}`);
        }

        const { data: coverUrlData } = supabase.storage
          .from('book-covers')
          .getPublicUrl(uniqueCoverName);

        // If updating and had previous cover, delete old cover
        if (editingBook && editingBook.cover_url) {
          const oldPath = extractStoragePath(editingBook.cover_url, 'book-covers');
          if (oldPath) {
            try {
              await supabase.storage.from('book-covers').remove([oldPath]);
            } catch {
              // ignore
            }
          }
        }

        currentCoverUrl = coverUrlData.publicUrl;
      }

      // 2. Upload PDF if selected
      if (pdfFile) {
        setUploadProgress(65);
        const uniquePdfName = `${Date.now()}-${sanitizeFileName(pdfFile.name)}`;
        const { error: pdfUploadError } = await supabase.storage
          .from('book-files')
          .upload(uniquePdfName, pdfFile, {
            cacheControl: '3600',
            upsert: false,
          });

        if (pdfUploadError) {
          throw new Error(`PDF faylı yüklənmədi: ${pdfUploadError.message}`);
        }

        const { data: pdfUrlData } = supabase.storage
          .from('book-files')
          .getPublicUrl(uniquePdfName);

        // If updating and had previous PDF, delete old PDF
        if (editingBook && editingBook.file_url) {
          const oldPdfPath = extractStoragePath(editingBook.file_url, 'book-files');
          if (oldPdfPath) {
            try {
              await supabase.storage.from('book-files').remove([oldPdfPath]);
            } catch {
              // ignore
            }
          }
        }

        currentFileUrl = pdfUrlData.publicUrl;
        currentFileName = pdfFile.name;
      }

      setUploadProgress(90);

      // 3. Database Operation
      const bookPayload = {
        title: title.trim(),
        author: author.trim() || null,
        description: description.trim() || null,
        level,
        cover_url: currentCoverUrl,
        file_url: currentFileUrl,
        file_name: currentFileName,
      };

      if (editingBook) {
        const { data: updatedData, error: updateError } = await supabase
          .from('books')
          .update(bookPayload)
          .eq('id', editingBook.id)
          .select()
          .single();

        if (updateError) throw updateError;

        setBooks((prev) =>
          prev.map((b) => (b.id === editingBook.id ? (updatedData as Book) : b))
        );
        showSuccess('Kitab məlumatları uğurla yeniləndi.');
      } else {
        const { data: insertedData, error: insertError } = await supabase
          .from('books')
          .insert([bookPayload])
          .select()
          .single();

        if (insertError) throw insertError;

        setBooks((prev) => [insertedData as Book, ...prev]);
        showSuccess('Yeni kitab uğurla əlavə edildi.');
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

  // Delete Book
  const confirmDelete = (book: Book) => {
    setBookToDelete(book);
    setDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!bookToDelete) return;

    try {
      setDeleting(true);
      const supabase = createClient();

      // 1. Delete from database
      const { error: dbError } = await supabase
        .from('books')
        .delete()
        .eq('id', bookToDelete.id);

      if (dbError) throw dbError;

      // 2. Remove files from storage if present
      if (bookToDelete.cover_url) {
        const coverPath = extractStoragePath(bookToDelete.cover_url, 'book-covers');
        if (coverPath) {
          try {
            await supabase.storage.from('book-covers').remove([coverPath]);
          } catch {
            // ignore
          }
        }
      }

      if (bookToDelete.file_url) {
        const filePath = extractStoragePath(bookToDelete.file_url, 'book-files');
        if (filePath) {
          try {
            await supabase.storage.from('book-files').remove([filePath]);
          } catch {
            // ignore
          }
        }
      }

      setBooks((prev) => prev.filter((b) => b.id !== bookToDelete.id));
      showSuccess('Kitab uğurla silindi.');
      setDeleteModalOpen(false);
      setBookToDelete(null);
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
            Kitablar
          </h1>
          <p className="text-xs sm:text-sm text-[#5E6B62] mt-1">
            Şahmat dərs vəsaitləri, məşq materialları və elektron kitablar
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchBooks(true)}
            disabled={refreshing || loading}
            className="px-4 py-2 rounded-full bg-[#FFFFFF] hover:bg-[#F7F3EA] text-[#1E2A22] font-medium text-xs border border-[rgba(26,19,12,0.15)] transition-colors cursor-pointer inline-flex items-center gap-2 shadow-2xs disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Yenilə</span>
          </button>

          {canEdit && (
            <button
              onClick={openCreateModal}
              className="px-5 py-2.5 rounded-full bg-[#2F5D46] hover:bg-[#254B38] text-[#F7F3EA] font-semibold text-xs tracking-wide transition-all shadow-2xs hover:shadow-xs inline-flex items-center gap-2 cursor-pointer active:scale-98"
            >
              <Plus className="w-4 h-4" />
              <span>Yeni kitab</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#FFFFFF] border border-[rgba(26,19,12,0.10)] rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setLevelFilter('all')}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
              levelFilter === 'all'
                ? 'bg-[#1E2A22] text-[#F7F3EA] font-semibold shadow-2xs'
                : 'bg-transparent text-[#5E6B62] hover:bg-[rgba(26,19,12,0.05)] border border-[rgba(26,19,12,0.15)]'
            }`}
          >
            Hamısı ({books.length})
          </button>
          <button
            onClick={() => setLevelFilter('beginner')}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
              levelFilter === 'beginner'
                ? 'bg-[#1E2A22] text-[#F7F3EA] font-semibold shadow-2xs'
                : 'bg-transparent text-[#5E6B62] hover:bg-[rgba(26,19,12,0.05)] border border-[rgba(26,19,12,0.15)]'
            }`}
          >
            Başlayan
          </button>
          <button
            onClick={() => setLevelFilter('intermediate')}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
              levelFilter === 'intermediate'
                ? 'bg-[#1E2A22] text-[#F7F3EA] font-semibold shadow-2xs'
                : 'bg-transparent text-[#5E6B62] hover:bg-[rgba(26,19,12,0.05)] border border-[rgba(26,19,12,0.15)]'
            }`}
          >
            Orta
          </button>
          <button
            onClick={() => setLevelFilter('advanced')}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
              levelFilter === 'advanced'
                ? 'bg-[#1E2A22] text-[#F7F3EA] font-semibold shadow-2xs'
                : 'bg-transparent text-[#5E6B62] hover:bg-[rgba(26,19,12,0.05)] border border-[rgba(26,19,12,0.15)]'
            }`}
          >
            İrəli
          </button>
        </div>

        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-[#5E6B62] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Başlıq və ya müəllifə görə axtar..."
            className="w-full pl-9 pr-3.5 py-2 bg-[#F7F3EA] border border-[rgba(26,19,12,0.15)] rounded-full text-xs text-[#1E2A22] placeholder-[#5E6B62]/60 focus:border-[#2F5D46] focus:bg-[#FFFFFF] focus:outline-none transition-colors"
          />
        </div>
      </div>

      {/* Books Content */}
      <div className="bg-[#FFFFFF] border border-[rgba(26,19,12,0.10)] rounded-2xl shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-sm text-[#5E6B62] flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-2 border-[#2F5D46] border-t-[#1F3D2F] rounded-full animate-spin" />
            <span className="font-medium text-xs">Kitablar yüklənir...</span>
          </div>
        ) : filteredBooks.length === 0 ? (
          <div className="p-16 text-center">
            <BookOpen className="w-12 h-12 text-[#5E6B62]/40 mx-auto mb-3" />
            <h3 className="text-base font-serif-heading font-medium text-[#1E2A22]">Kitab tapılmadı</h3>
            <p className="text-xs text-[#5E6B62] mt-1">
              {searchQuery || levelFilter !== 'all'
                ? 'Axtarış filtrinə uyğun heç bir kitab tapılmadı.'
                : 'Hələlik heç bir kitab əlavə edilməyib. "Yeni kitab" düyməsinə klikləyərək əlavə edin.'}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="bg-[#1F3D2F] text-[#C9D3C4] uppercase text-[11px] tracking-wider border-b border-[rgba(243,236,225,0.10)]">
                    <th className="py-4 px-6 font-semibold">Kitab</th>
                    <th className="py-4 px-4 font-semibold">Müəllif</th>
                    <th className="py-4 px-4 font-semibold">Səviyyə</th>
                    <th className="py-4 px-4 font-semibold">Fayl</th>
                    <th className="py-4 px-4 font-semibold">Tarix</th>
                    <th className="py-4 px-6 text-right font-semibold">Əməliyyatlar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[rgba(26,19,12,0.08)]">
                  {filteredBooks.map((book) => {
                    const levelStyle = LEVEL_COLORS[book.level] || LEVEL_COLORS.beginner;
                    return (
                      <tr key={book.id} className="hover:bg-[#2F5D46]/15 transition-colors">
                        <td className="py-3.5 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-14 rounded-lg bg-[#F7F3EA] border border-[rgba(26,19,12,0.12)] overflow-hidden shrink-0 flex items-center justify-center shadow-2xs">
                              {book.cover_url ? (
                                <img
                                  src={book.cover_url}
                                  alt={book.title}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <BookOpen className="w-5 h-5 text-[#5E6B62]/60" />
                              )}
                            </div>
                            <div className="min-w-0 max-w-xs">
                              <div className="font-semibold text-sm text-[#1E2A22] truncate">
                                {book.title}
                              </div>
                              {book.description && (
                                <div className="text-xs text-[#5E6B62] line-clamp-1 mt-0.5">
                                  {book.description}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-[#1E2A22] font-medium text-xs">
                          {book.author || <span className="text-[#5E6B62]">-</span>}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${levelStyle.bg} ${levelStyle.text} ${levelStyle.border}`}
                          >
                            {LEVEL_LABELS[book.level] || book.level}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          {book.file_url ? (
                            <a
                              href={book.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-[#1E2A22] hover:text-[#2F5D46] font-medium inline-flex items-center gap-1.5 transition-colors"
                            >
                              <FileText className="w-3.5 h-3.5 text-[#2F5D46]" />
                              <span className="truncate max-w-[130px]">
                                {book.file_name || 'PDF sənəd'}
                              </span>
                              <ExternalLink className="w-3 h-3 text-[#5E6B62]" />
                            </a>
                          ) : (
                            <span className="text-xs text-[#5E6B62]">Yoxdur</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-[#5E6B62] text-xs">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-[#5E6B62]" />
                            {formatAzDate(book.created_at)}
                          </span>
                        </td>
                        <td className="py-3.5 px-6 text-right">
                          {canEdit ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => openEditModal(book)}
                                className="p-1.5 text-[#5E6B62] hover:text-[#1E2A22] hover:bg-[#F7F3EA] rounded-lg transition-colors cursor-pointer"
                                title="Redaktə et"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => confirmDelete(book)}
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
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Stacked Cards */}
            <div className="md:hidden divide-y divide-[rgba(26,19,12,0.08)]">
              {filteredBooks.map((book) => {
                const levelStyle = LEVEL_COLORS[book.level] || LEVEL_COLORS.beginner;
                return (
                  <div key={book.id} className="p-4 space-y-3">
                    <div className="flex gap-3">
                      <div className="w-14 h-18 rounded-lg bg-[#F7F3EA] border border-[rgba(26,19,12,0.12)] overflow-hidden shrink-0 flex items-center justify-center shadow-2xs">
                        {book.cover_url ? (
                          <img
                            src={book.cover_url}
                            alt={book.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <BookOpen className="w-6 h-6 text-[#5E6B62]/60" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm text-[#1E2A22] leading-snug">
                          {book.title}
                        </div>
                        <div className="text-xs text-[#5E6B62] mt-1">
                          {book.author ? `Müəllif: ${book.author}` : 'Müəllif qeyd edilməyib'}
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${levelStyle.bg} ${levelStyle.text} ${levelStyle.border}`}
                          >
                            {LEVEL_LABELS[book.level] || book.level}
                          </span>
                          {book.file_url && (
                            <a
                              href={book.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-[#1E2A22] hover:text-[#2F5D46] font-medium flex items-center gap-1"
                            >
                              <FileText className="w-3.5 h-3.5 text-[#2F5D46]" />
                              <span>PDF</span>
                            </a>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-[rgba(26,19,12,0.08)] text-xs">
                      <span className="text-[11px] text-[#5E6B62]">
                        {formatAzDate(book.created_at)}
                      </span>
                      {canEdit && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEditModal(book)}
                            className="px-3 py-1 bg-[#F7F3EA] border border-[rgba(26,19,12,0.15)] rounded-full text-[#1E2A22] font-medium flex items-center gap-1 text-xs"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            <span>Redaktə</span>
                          </button>
                          <button
                            onClick={() => confirmDelete(book)}
                            className="p-1.5 text-[#B3261E] bg-[#B3261E]/10 rounded-full border border-[#B3261E]/20"
                            title="Sil"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1F3D2F]/80 backdrop-blur-xs overflow-y-auto">
          <div
            className="w-full max-w-xl bg-[#FFFFFF] border border-[rgba(26,19,12,0.15)] rounded-2xl p-6 sm:p-7 shadow-2xl text-[#1E2A22] my-8 animate-in fade-in zoom-in-95 duration-150"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between border-b border-[rgba(26,19,12,0.10)] pb-4 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#2F5D46]/40 border border-[#2F5D46] text-[#1E2A22] flex items-center justify-center shrink-0">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-serif-heading font-medium text-[#1E2A22]">
                    {editingBook ? 'Kitabı redaktə et' : 'Yeni kitab əlavə et'}
                  </h3>
                  <p className="text-xs text-[#5E6B62] mt-0.5">
                    Kitab haqqında məlumatları və faylları daxil edin
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

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-[#1E2A22] mb-1.5">
                  Kitabın adı <span className="text-[#B3261E]">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Məsələn: Şahmatda Taktika və Kombinasiyalar"
                  className={`w-full px-3.5 py-2.5 bg-[#F7F3EA] border rounded-xl text-xs sm:text-sm text-[#1E2A22] placeholder-[#5E6B62]/60 focus:bg-[#FFFFFF] focus:outline-none transition-colors ${
                    formErrors.title ? 'border-[#B3261E]' : 'border-[rgba(26,19,12,0.15)] focus:border-[#2F5D46]'
                  }`}
                />
                {formErrors.title && (
                  <p className="text-xs text-[#B3261E] mt-1">{formErrors.title}</p>
                )}
              </div>

              {/* Author and Level */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#1E2A22] mb-1.5">
                    Müəllif
                  </label>
                  <input
                    type="text"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    placeholder="Məsələn: Qari Kasparov"
                    className="w-full px-3.5 py-2.5 bg-[#F7F3EA] border border-[rgba(26,19,12,0.15)] focus:border-[#2F5D46] focus:bg-[#FFFFFF] rounded-xl text-xs sm:text-sm text-[#1E2A22] placeholder-[#5E6B62]/60 focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1E2A22] mb-1.5">
                    Səviyyə
                  </label>
                  <div className="relative">
                    <select
                      value={level}
                      onChange={(e) => setLevel(e.target.value as BookLevel)}
                      className="w-full px-3.5 py-2.5 bg-[#F7F3EA] border border-[rgba(26,19,12,0.15)] focus:border-[#2F5D46] focus:bg-[#FFFFFF] rounded-xl text-xs sm:text-sm text-[#1E2A22] focus:outline-none transition-colors appearance-none cursor-pointer"
                    >
                      <option value="beginner">Başlayan</option>
                      <option value="intermediate">Orta</option>
                      <option value="advanced">İrəli</option>
                    </select>
                    <Layers className="w-4 h-4 text-[#5E6B62] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-[#1E2A22] mb-1.5">
                  Təsvir
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Kitab haqqında qısa xülasə və ya məzmun..."
                  className="w-full px-3.5 py-2.5 bg-[#F7F3EA] border border-[rgba(26,19,12,0.15)] focus:border-[#2F5D46] focus:bg-[#FFFFFF] rounded-xl text-xs sm:text-sm text-[#1E2A22] placeholder-[#5E6B62]/60 focus:outline-none transition-colors"
                />
              </div>

              {/* Cover Image Upload (Optional, max 2MB) */}
              <div>
                <label className="block text-xs font-semibold text-[#1E2A22] mb-1.5">
                  Üz qabığı şəkli (İstəyə görə, JPG / PNG / WebP, max 2 MB)
                </label>
                <div className="flex items-center gap-4">
                  {coverPreview && (
                    <div className="w-16 h-20 rounded-xl bg-[#F7F3EA] border border-[rgba(26,19,12,0.15)] overflow-hidden shrink-0 shadow-2xs">
                      <img
                        src={coverPreview}
                        alt="Üz qabığı"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="flex-1">
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
                      className="w-full py-2.5 px-3 bg-[#F7F3EA] hover:bg-[#2F5D46]/20 border border-dashed border-[rgba(26,19,12,0.20)] hover:border-[#2F5D46] rounded-xl text-xs text-[#5E6B62] hover:text-[#1E2A22] flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      <Upload className="w-4 h-4 text-[#2F5D46]" />
                      <span>{coverFile ? coverFile.name : 'Şəkil seçin və ya dəyişdirin'}</span>
                    </button>
                    {formErrors.cover && (
                      <p className="text-xs text-[#B3261E] mt-1">{formErrors.cover}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* PDF Document Upload (Required on create, max 25MB) */}
              <div>
                <label className="block text-xs font-semibold text-[#1E2A22] mb-1.5">
                  PDF Faylı {editingBook ? '(Əvəz etmək istəyirsinizsə seçin)' : <span className="text-[#B3261E]">*</span>}
                  <span className="text-[#5E6B62] font-normal ml-1">(max 25 MB)</span>
                </label>
                <input
                  ref={pdfInputRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={handlePdfChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => pdfInputRef.current?.click()}
                  className={`w-full py-3 px-3 bg-[#F7F3EA] hover:bg-[#2F5D46]/20 border border-dashed rounded-xl text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                    formErrors.pdf
                      ? 'border-[#B3261E] text-[#B3261E]'
                      : 'border-[rgba(26,19,12,0.20)] hover:border-[#2F5D46] text-[#5E6B62] hover:text-[#1E2A22]'
                  }`}
                >
                  <FileText className="w-4 h-4 text-[#B3261E]" />
                  <span className="font-medium">
                    {pdfFile
                      ? pdfFile.name
                      : editingBook?.file_name
                      ? `Mövcud fayl: ${editingBook.file_name} (Dəyişmək üçün klikləyin)`
                      : 'PDF sənədini seçin'}
                  </span>
                </button>
                {formErrors.pdf && (
                  <p className="text-xs text-[#B3261E] mt-1">{formErrors.pdf}</p>
                )}
              </div>

              {/* Upload progress bar */}
              {uploadProgress !== null && (
                <div className="space-y-1.5 pt-1">
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
                  className="px-6 py-2.5 text-xs font-semibold bg-[#2F5D46] hover:bg-[#254B38] text-[#1E2A22] rounded-full transition-all cursor-pointer flex items-center gap-2 shadow-2xs hover:shadow-xs disabled:opacity-50"
                >
                  {saving && (
                    <span className="w-3.5 h-3.5 border-2 border-[#1E2A22]/30 border-t-[#1E2A22] rounded-full animate-spin" />
                  )}
                  <span>{editingBook ? 'Yadda saxla' : 'Əlavə et'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        title="Kitabı sil"
        description={`"${bookToDelete?.title}" kitabını və ona aid faylları silmək istədiyinizdən əminsiniz? Bu əməliyyat geri qaytarıla bilməz.`}
        confirmText="Sil"
        cancelText="Ləğv et"
        isDestructive={true}
        isLoading={deleting}
        onConfirm={handleDelete}
        onClose={() => {
          setDeleteModalOpen(false);
          setBookToDelete(null);
        }}
      />
    </div>
  );
}
