'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  GraduationCap,
  Plus,
  RefreshCw,
  Edit,
  Trash2,
  Upload,
  X,
  ArrowUp,
  ArrowDown,
  User,
  Clock,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Teacher } from '@/lib/types';
import {
  formatAzDate,
  getFriendlyErrorMessage,
  sanitizeFileName,
  extractStoragePath,
} from '@/lib/utils';
import { useToast } from '@/components/ui/ToastContext';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { useAuth } from '@/contexts/AuthContext';

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);

  // Form Fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [roleTitle, setRoleTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sortOrder, setSortOrder] = useState<number>(0);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Reordering state
  const [swapping, setSwapping] = useState<string | number | null>(null);

  // Delete State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [teacherToDelete, setTeacherToDelete] = useState<Teacher | null>(null);
  const [deleting, setDeleting] = useState(false);

  const photoInputRef = useRef<HTMLInputElement>(null);
  const { showSuccess, showError } = useToast();
  const { canEdit } = useAuth();

  const fetchTeachers = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const supabase = createClient();
      const { data, error } = await supabase
        .from('teachers')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) {
        showError(getFriendlyErrorMessage(error));
        return;
      }

      setTeachers((data as Teacher[]) || []);
    } catch (err) {
      showError(getFriendlyErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [showError]);

  useEffect(() => {
    fetchTeachers();
  }, [fetchTeachers]);

  // Open Create Modal
  const openCreateModal = () => {
    setEditingTeacher(null);
    setFirstName('');
    setLastName('');
    setRoleTitle('');
    setDescription('');
    // Default sort_order to next available number
    const maxOrder = teachers.reduce((max, t) => Math.max(max, t.sort_order ?? 0), 0);
    setSortOrder(maxOrder + 1);
    setPhotoFile(null);
    setPhotoPreview(null);
    setFormErrors({});
    setModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (teacher: Teacher) => {
    setEditingTeacher(teacher);
    setFirstName(teacher.first_name);
    setLastName(teacher.last_name);
    setRoleTitle(teacher.role_title || '');
    setDescription(teacher.description || '');
    setSortOrder(teacher.sort_order ?? 0);
    setPhotoFile(null);
    setPhotoPreview(teacher.photo_url || null);
    setFormErrors({});
    setModalOpen(true);
  };

  // Handle Photo Selection
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setFormErrors((prev) => ({
        ...prev,
        photo: 'Şəklin həcmi maksimum 2 MB ola bilər.',
      }));
      return;
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setFormErrors((prev) => ({
        ...prev,
        photo: 'Yalnız JPG, PNG və ya WebP formatlı şəkillər qəbul edilir.',
      }));
      return;
    }

    setFormErrors((prev) => {
      const rest = { ...prev };
      delete rest.photo;
      return rest;
    });

    setPhotoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Save Teacher
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    if (!firstName.trim()) {
      errors.firstName = 'Ad mütləq daxil edilməlidir.';
    }
    if (!lastName.trim()) {
      errors.lastName = 'Soyad mütləq daxil edilməlidir.';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      setSaving(true);
      const supabase = createClient();

      let currentPhotoUrl = editingTeacher ? editingTeacher.photo_url : null;

      // Upload Photo if new file provided
      if (photoFile) {
        const uniquePhotoName = `${Date.now()}-${sanitizeFileName(photoFile.name)}`;
        const { error: photoUploadError } = await supabase.storage
          .from('teacher-photos')
          .upload(uniquePhotoName, photoFile, {
            cacheControl: '3600',
            upsert: false,
          });

        if (photoUploadError) {
          throw new Error(`Şəkil yüklənmədi: ${photoUploadError.message}`);
        }

        const { data: photoUrlData } = supabase.storage
          .from('teacher-photos')
          .getPublicUrl(uniquePhotoName);

        // Remove old photo if exists
        if (editingTeacher && editingTeacher.photo_url) {
          const oldPhotoPath = extractStoragePath(editingTeacher.photo_url, 'teacher-photos');
          if (oldPhotoPath) {
            try {
              await supabase.storage.from('teacher-photos').remove([oldPhotoPath]);
            } catch {
              // ignore
            }
          }
        }

        currentPhotoUrl = photoUrlData.publicUrl;
      }

      const teacherPayload = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        role_title: roleTitle.trim() || null,
        description: description.trim() || null,
        sort_order: Number(sortOrder) || 0,
        photo_url: currentPhotoUrl,
      };

      if (editingTeacher) {
        const { data: updatedData, error: updateError } = await supabase
          .from('teachers')
          .update(teacherPayload)
          .eq('id', editingTeacher.id)
          .select()
          .single();

        if (updateError) throw updateError;

        setTeachers((prev) =>
          prev
            .map((t) => (t.id === editingTeacher.id ? (updatedData as Teacher) : t))
            .sort((a, b) => a.sort_order - b.sort_order)
        );
        showSuccess('Müəllim məlumatları uğurla yeniləndi.');
      } else {
        const { data: insertedData, error: insertError } = await supabase
          .from('teachers')
          .insert([teacherPayload])
          .select()
          .single();

        if (insertError) throw insertError;

        setTeachers((prev) =>
          [...prev, insertedData as Teacher].sort((a, b) => a.sort_order - b.sort_order)
        );
        showSuccess('Yeni müəllim uğurla əlavə edildi.');
      }

      setModalOpen(false);
    } catch (err) {
      showError(getFriendlyErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  // Reorder Swap (yuxarı / aşağı)
  const handleSwapOrder = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= teachers.length) return;

    const currentTeacher = teachers[index];
    const targetTeacher = teachers[targetIndex];

    try {
      setSwapping(currentTeacher.id);
      const supabase = createClient();

      const orderA = currentTeacher.sort_order;
      const orderB = targetTeacher.sort_order;

      // Even if both have the same sort_order, resolve gracefully
      const newOrderForCurrent = orderB !== orderA ? orderB : direction === 'up' ? orderA - 1 : orderA + 1;
      const newOrderForTarget = orderA;

      const [res1, res2] = await Promise.all([
        supabase
          .from('teachers')
          .update({ sort_order: newOrderForCurrent })
          .eq('id', currentTeacher.id),
        supabase
          .from('teachers')
          .update({ sort_order: newOrderForTarget })
          .eq('id', targetTeacher.id),
      ]);

      if (res1.error || res2.error) {
        throw res1.error || res2.error;
      }

      setTeachers((prev) => {
        const updated = prev.map((t) => {
          if (t.id === currentTeacher.id) return { ...t, sort_order: newOrderForCurrent };
          if (t.id === targetTeacher.id) return { ...t, sort_order: newOrderForTarget };
          return t;
        });
        return updated.sort((a, b) => a.sort_order - b.sort_order);
      });

      showSuccess('Müəllimlərin sıralaması dəyişdirildi.');
    } catch (err) {
      showError(getFriendlyErrorMessage(err));
    } finally {
      setSwapping(null);
    }
  };

  // Delete Teacher
  const confirmDelete = (teacher: Teacher) => {
    setTeacherToDelete(teacher);
    setDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!teacherToDelete) return;

    try {
      setDeleting(true);
      const supabase = createClient();

      const { error: dbError } = await supabase
        .from('teachers')
        .delete()
        .eq('id', teacherToDelete.id);

      if (dbError) throw dbError;

      // Remove photo from storage if exists
      if (teacherToDelete.photo_url) {
        const photoPath = extractStoragePath(teacherToDelete.photo_url, 'teacher-photos');
        if (photoPath) {
          try {
            await supabase.storage.from('teacher-photos').remove([photoPath]);
          } catch {
            // ignore
          }
        }
      }

      setTeachers((prev) => prev.filter((t) => t.id !== teacherToDelete.id));
      showSuccess('Müəllim uğurla silindi.');
      setDeleteModalOpen(false);
      setTeacherToDelete(null);
    } catch (err) {
      showError(getFriendlyErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  // Generate Initials
  const getInitials = (first: string, last: string) => {
    const f = first ? first.trim()[0] : '';
    const l = last ? last.trim()[0] : '';
    return (f + l).toUpperCase() || 'M';
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-serif-heading font-medium tracking-tight text-[#1E2A22]">
            Müəllimlər
          </h1>
          <p className="text-xs sm:text-sm text-[#5E6B62] mt-1">
            Şahmat məktəbinin pedaqoji heyəti, məşqçilər və onların sıralaması
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchTeachers(true)}
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
              <span>Yeni müəllim</span>
            </button>
          )}
        </div>
      </div>

      {/* Teachers List / Table */}
      <div className="bg-[#FFFFFF] border border-[rgba(26,19,12,0.10)] rounded-2xl shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-sm text-[#5E6B62] flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-2 border-[#2F5D46] border-t-[#1F3D2F] rounded-full animate-spin" />
            <span className="font-medium text-xs">Müəllimlər yüklənir...</span>
          </div>
        ) : teachers.length === 0 ? (
          <div className="p-16 text-center">
            <GraduationCap className="w-12 h-12 text-[#5E6B62]/40 mx-auto mb-3" />
            <h3 className="text-base font-serif-heading font-medium text-[#1E2A22]">Müəllim tapılmadı</h3>
            <p className="text-xs text-[#5E6B62] mt-1">
              Hələlik heç bir müəllim əlavə edilməyib. "Yeni müəllim" düyməsi ilə əlavə edin.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="bg-[#1F3D2F] text-[#C9D3C4] uppercase text-[11px] tracking-wider border-b border-[rgba(243,236,225,0.10)]">
                    <th className="py-4 px-6 font-semibold w-24">Sıra</th>
                    <th className="py-4 px-4 font-semibold">Müəllim</th>
                    <th className="py-4 px-4 font-semibold">Vəzifə / Titul</th>
                    <th className="py-4 px-4 font-semibold">Haqqında</th>
                    <th className="py-4 px-4 font-semibold">Tarix</th>
                    <th className="py-4 px-6 text-right font-semibold">Əməliyyatlar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[rgba(26,19,12,0.08)]">
                  {teachers.map((teacher, index) => (
                    <tr key={teacher.id} className="hover:bg-[#2F5D46]/15 transition-colors">
                      {/* Sort Controls & Order */}
                      <td className="py-3.5 px-6 w-24">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-semibold text-[#1E2A22] w-5 text-center bg-[#F7F3EA] px-1 py-0.5 rounded border border-[rgba(26,19,12,0.10)]">
                            {teacher.sort_order}
                          </span>
                          {canEdit && (
                            <div className="flex flex-col gap-0.5">
                              <button
                                onClick={() => handleSwapOrder(index, 'up')}
                                disabled={index === 0 || swapping === teacher.id}
                                className="p-1 text-[#5E6B62] hover:text-[#1E2A22] hover:bg-[#F7F3EA] rounded disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed transition-colors"
                                title="Yuxarı qaldır"
                              >
                                <ArrowUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleSwapOrder(index, 'down')}
                                disabled={index === teachers.length - 1 || swapping === teacher.id}
                                className="p-1 text-[#5E6B62] hover:text-[#1E2A22] hover:bg-[#F7F3EA] rounded disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed transition-colors"
                                title="Aşağı sal"
                              >
                                <ArrowDown className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Photo and Full Name */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#2F5D46]/40 border border-[#2F5D46] overflow-hidden shrink-0 flex items-center justify-center font-bold text-xs text-[#1E2A22] shadow-2xs">
                            {teacher.photo_url ? (
                              <img
                                src={teacher.photo_url}
                                alt={`${teacher.first_name} ${teacher.last_name}`}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span>{getInitials(teacher.first_name, teacher.last_name)}</span>
                            )}
                          </div>
                          <div>
                            <div className="font-semibold text-sm text-[#1E2A22]">
                              {teacher.first_name} {teacher.last_name}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role Title */}
                      <td className="py-3.5 px-4 text-[#1E2A22] font-medium text-xs">
                        {teacher.role_title || <span className="text-[#5E6B62]">-</span>}
                      </td>

                      {/* Description */}
                      <td className="py-3.5 px-4 text-[#5E6B62] max-w-xs text-xs">
                        <p className="line-clamp-2">
                          {teacher.description || '-'}
                        </p>
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-4 text-[#5E6B62] text-xs">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-[#5E6B62]" />
                          {formatAzDate(teacher.created_at)}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-6 text-right">
                        {canEdit ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openEditModal(teacher)}
                              className="p-1.5 text-[#5E6B62] hover:text-[#1E2A22] hover:bg-[#F7F3EA] rounded-lg transition-colors cursor-pointer"
                              title="Redaktə et"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => confirmDelete(teacher)}
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

            {/* Mobile Stacked Cards */}
            <div className="md:hidden divide-y divide-[rgba(26,19,12,0.08)]">
              {teachers.map((teacher, index) => (
                <div key={teacher.id} className="p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-full bg-[#2F5D46]/40 border border-[#2F5D46] overflow-hidden shrink-0 flex items-center justify-center font-bold text-sm text-[#1E2A22] shadow-2xs">
                      {teacher.photo_url ? (
                        <img
                          src={teacher.photo_url}
                          alt={`${teacher.first_name} ${teacher.last_name}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span>{getInitials(teacher.first_name, teacher.last_name)}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-[#1E2A22]">
                        {teacher.first_name} {teacher.last_name}
                      </div>
                      <div className="text-xs text-[#2F5D46] font-medium mt-0.5">
                        {teacher.role_title || 'Məşqçi'}
                      </div>
                      {teacher.description && (
                        <p className="text-xs text-[#5E6B62] line-clamp-2 mt-1">
                          {teacher.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-[rgba(26,19,12,0.08)] text-xs">
                    {/* Reorder buttons */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-mono text-[#5E6B62] mr-1 bg-[#F7F3EA] px-1.5 py-0.5 rounded border border-[rgba(26,19,12,0.10)]">
                        №{teacher.sort_order}
                      </span>
                      {canEdit && (
                        <>
                          <button
                            onClick={() => handleSwapOrder(index, 'up')}
                            disabled={index === 0 || swapping === teacher.id}
                            className="p-1.5 bg-[#F7F3EA] border border-[rgba(26,19,12,0.15)] rounded-full text-[#5E6B62] hover:text-[#1E2A22] disabled:opacity-20 cursor-pointer"
                            title="Yuxarı"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleSwapOrder(index, 'down')}
                            disabled={index === teachers.length - 1 || swapping === teacher.id}
                            className="p-1.5 bg-[#F7F3EA] border border-[rgba(26,19,12,0.15)] rounded-full text-[#5E6B62] hover:text-[#1E2A22] disabled:opacity-20 cursor-pointer"
                            title="Aşağı"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>

                    {canEdit && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEditModal(teacher)}
                          className="px-3 py-1 bg-[#F7F3EA] border border-[rgba(26,19,12,0.15)] rounded-full text-[#1E2A22] font-medium flex items-center gap-1 text-xs"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          <span>Redaktə</span>
                        </button>
                        <button
                          onClick={() => confirmDelete(teacher)}
                          className="p-1.5 text-[#B3261E] bg-[#B3261E]/10 rounded-full border border-[#B3261E]/20"
                          title="Sil"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1F3D2F]/80 backdrop-blur-xs overflow-y-auto">
          <div
            className="w-full max-w-lg bg-[#FFFFFF] border border-[rgba(26,19,12,0.15)] rounded-2xl p-6 sm:p-7 shadow-2xl text-[#1E2A22] my-8 animate-in fade-in zoom-in-95 duration-150"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between border-b border-[rgba(26,19,12,0.10)] pb-4 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#2F5D46]/40 border border-[#2F5D46] text-[#1E2A22] flex items-center justify-center shrink-0">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-serif-heading font-medium text-[#1E2A22]">
                    {editingTeacher ? 'Müəllimi redaktə et' : 'Yeni müəllim əlavə et'}
                  </h3>
                  <p className="text-xs text-[#5E6B62] mt-0.5">
                    Pedaqoq və ya məşqçi haqqında məlumatları daxil edin
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
              {/* First Name & Last Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#1E2A22] mb-1.5">
                    Ad <span className="text-[#B3261E]">*</span>
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Məsələn: Teymur"
                    className={`w-full px-3.5 py-2.5 bg-[#F7F3EA] border rounded-xl text-xs sm:text-sm text-[#1E2A22] placeholder-[#5E6B62]/60 focus:bg-[#FFFFFF] focus:outline-none transition-colors ${
                      formErrors.firstName ? 'border-[#B3261E]' : 'border-[rgba(26,19,12,0.15)] focus:border-[#2F5D46]'
                    }`}
                  />
                  {formErrors.firstName && (
                    <p className="text-xs text-[#B3261E] mt-1">{formErrors.firstName}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1E2A22] mb-1.5">
                    Soyad <span className="text-[#B3261E]">*</span>
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Məsələn: Rəcəbov"
                    className={`w-full px-3.5 py-2.5 bg-[#F7F3EA] border rounded-xl text-xs sm:text-sm text-[#1E2A22] placeholder-[#5E6B62]/60 focus:bg-[#FFFFFF] focus:outline-none transition-colors ${
                      formErrors.lastName ? 'border-[#B3261E]' : 'border-[rgba(26,19,12,0.15)] focus:border-[#2F5D46]'
                    }`}
                  />
                  {formErrors.lastName && (
                    <p className="text-xs text-[#B3261E] mt-1">{formErrors.lastName}</p>
                  )}
                </div>
              </div>

              {/* Role Title & Sort Order */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#1E2A22] mb-1.5">
                    Vəzifə / Titul
                  </label>
                  <input
                    type="text"
                    value={roleTitle}
                    onChange={(e) => setRoleTitle(e.target.value)}
                    placeholder="Məsələn: Beynəlxalq Qrossmeyster, Baş Məşqçi"
                    className="w-full px-3.5 py-2.5 bg-[#F7F3EA] border border-[rgba(26,19,12,0.15)] focus:border-[#2F5D46] focus:bg-[#FFFFFF] rounded-xl text-xs sm:text-sm text-[#1E2A22] placeholder-[#5E6B62]/60 focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1E2A22] mb-1.5">
                    Sıra nömrəsi (sort_order)
                  </label>
                  <input
                    type="number"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(parseInt(e.target.value, 10) || 0)}
                    placeholder="1"
                    className="w-full px-3.5 py-2.5 bg-[#F7F3EA] border border-[rgba(26,19,12,0.15)] focus:border-[#2F5D46] focus:bg-[#FFFFFF] rounded-xl text-xs sm:text-sm text-[#1E2A22] focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-[#1E2A22] mb-1.5">
                  Təsvir / Bioqrafiya
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Müəllimin nailiyyətləri, təcrübəsi və tədris metodu..."
                  className="w-full px-3.5 py-2.5 bg-[#F7F3EA] border border-[rgba(26,19,12,0.15)] focus:border-[#2F5D46] focus:bg-[#FFFFFF] rounded-xl text-xs sm:text-sm text-[#1E2A22] placeholder-[#5E6B62]/60 focus:outline-none transition-colors"
                />
              </div>

              {/* Photo Upload (Optional, max 2MB) */}
              <div>
                <label className="block text-xs font-semibold text-[#1E2A22] mb-1.5">
                  Fotoşəkil (İstəyə görə, JPG / PNG / WebP, max 2 MB)
                </label>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-[#F7F3EA] border border-[rgba(26,19,12,0.15)] overflow-hidden shrink-0 flex items-center justify-center font-bold text-sm text-[#1E2A22] shadow-2xs">
                    {photoPreview ? (
                      <img
                        src={photoPreview}
                        alt="Müəllim"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-6 h-6 text-[#5E6B62]/50" />
                    )}
                  </div>
                  <div className="flex-1">
                    <input
                      ref={photoInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handlePhotoChange}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      className="w-full py-2.5 px-3 bg-[#F7F3EA] hover:bg-[#2F5D46]/20 border border-dashed border-[rgba(26,19,12,0.20)] hover:border-[#2F5D46] rounded-xl text-xs text-[#5E6B62] hover:text-[#1E2A22] flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      <Upload className="w-4 h-4 text-[#2F5D46]" />
                      <span>{photoFile ? photoFile.name : 'Şəkil seçin və ya dəyişdirin'}</span>
                    </button>
                    {formErrors.photo && (
                      <p className="text-xs text-[#B3261E] mt-1">{formErrors.photo}</p>
                    )}
                  </div>
                </div>
              </div>

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
                  <span>{editingTeacher ? 'Yadda saxla' : 'Əlavə et'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        title="Müəllimi sil"
        description={`"${teacherToDelete?.first_name} ${teacherToDelete?.last_name}" müəllimini silmək istədiyinizdən əminsiniz? Bu əməliyyat geri qaytarıla bilməz.`}
        confirmText="Sil"
        cancelText="Ləğv et"
        isDestructive={true}
        isLoading={deleting}
        onConfirm={handleDelete}
        onClose={() => {
          setDeleteModalOpen(false);
          setTeacherToDelete(null);
        }}
      />
    </div>
  );
}
