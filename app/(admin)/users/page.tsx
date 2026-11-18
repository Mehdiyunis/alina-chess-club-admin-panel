'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Users,
  Search,
  RefreshCw,
  ShieldCheck,
  Shield,
  Eye,
  EyeOff,
  Clock,
  Trash2,
  UserCog,
  Mail,
  X,
  Plus,
  Key,
  Copy,
  Check,
  Sparkles,
  UserPlus,
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { AdminProfile, AdminRole } from '@/lib/types';
import { formatAzDate, getFriendlyErrorMessage } from '@/lib/utils';
import { useToast } from '@/components/ui/ToastContext';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { useAuth } from '@/contexts/AuthContext';

const ROLE_LABELS: Record<AdminRole, string> = {
  administrator: 'Administrator',
  worker: 'İşçi',
  viewer: 'Müşahidəçi',
};

const ROLE_BADGES: Record<AdminRole, { bg: string; text: string; border: string }> = {
  administrator: {
    bg: 'bg-[#2F5D46]/40',
    text: 'text-[#1E2A22]',
    border: 'border-[#2F5D46]',
  },
  worker: {
    bg: 'bg-[#5b6f8a]/15',
    text: 'text-[#5b6f8a]',
    border: 'border-[#5b6f8a]/30',
  },
  viewer: {
    bg: 'bg-[#5E6B62]/15',
    text: 'text-[#5E6B62]',
    border: 'border-[#5E6B62]/30',
  },
};

type CreateUserRole = 'viewer' | 'worker' | 'administrator' | 'none';

function generateRandomPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*';
  let result = '';
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export default function UsersPage() {
  const [profiles, setProfiles] = useState<AdminProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Create User Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<CreateUserRole>('viewer');
  const [showPassword, setShowPassword] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [createErrors, setCreateErrors] = useState<Record<string, string>>({});
  const [creatingUser, setCreatingUser] = useState(false);

  // Role Change State
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [profileToChange, setProfileToChange] = useState<AdminProfile | null>(null);
  const [selectedRole, setSelectedRole] = useState<AdminRole>('viewer');
  const [updatingRole, setUpdatingRole] = useState(false);

  // Delete User State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [profileToDelete, setProfileToDelete] = useState<AdminProfile | null>(null);
  const [deletingUser, setDeletingUser] = useState(false);

  const { user: currentUser, isAdministrator, canManageRoles } = useAuth();
  const { showSuccess, showError } = useToast();

  const fetchAdminProfiles = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      // Fetch from public.admin_profiles (NOT public.profiles)
      const { data, error } = await supabase
        .from('admin_profiles')
        .select('id, email, full_name, role, created_at')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[Supabase] admin_profiles sorğusu xətası:', error);
        showError(getFriendlyErrorMessage(error));
        return;
      }

      setProfiles((data as AdminProfile[]) || []);
    } catch (err) {
      console.error('[Supabase] Gözlənilməz xəta:', err);
      showError(getFriendlyErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [showError]);

  useEffect(() => {
    fetchAdminProfiles();
  }, [fetchAdminProfiles]);

  const filteredProfiles = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return profiles;
    return profiles.filter((p) => {
      const name = (p.full_name || '').toLowerCase();
      const email = (p.email || '').toLowerCase();
      return name.includes(query) || email.includes(query);
    });
  }, [profiles, searchQuery]);

  // Open Create User Modal
  const openCreateUserModal = () => {
    setNewName('');
    setNewEmail('');
    setNewPassword(generateRandomPassword());
    setNewRole('viewer');
    setShowPassword(false);
    setCopiedPassword(false);
    setCreateErrors({});
    setCreateModalOpen(true);
  };

  const handleGeneratePassword = () => {
    const pwd = generateRandomPassword();
    setNewPassword(pwd);
    setCopiedPassword(false);
    setCreateErrors((prev) => {
      const copy = { ...prev };
      delete copy.password;
      return copy;
    });
  };

  const handleCopyPassword = async () => {
    if (!newPassword) return;
    try {
      await navigator.clipboard.writeText(newPassword);
      setCopiedPassword(true);
      setTimeout(() => setCopiedPassword(false), 2000);
    } catch {
      // fallback
    }
  };

  // Submit Create User
  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    const trimmedName = newName.trim();
    const trimmedEmail = newEmail.trim();

    if (!trimmedName || trimmedName.length < 2 || trimmedName.length > 80) {
      errors.name = 'Ad və soyad 2 ilə 80 simvol arasında olmalıdır.';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
      errors.email = 'Düzgün e-poçt ünvanı daxil edin.';
    }

    if (!newPassword || newPassword.length < 8) {
      errors.password = 'Parol ən azı 8 simvoldan ibarət olmalıdır.';
    }

    if (Object.keys(errors).length > 0) {
      setCreateErrors(errors);
      return;
    }

    try {
      setCreatingUser(true);
      setCreateErrors({});

      const response = await fetch('/api/users/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmedName,
          email: trimmedEmail,
          password: newPassword,
          role: newRole,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const errorMsg = data?.error || 'Xəta baş verdi, yenidən cəhd edin';
        showError(errorMsg);
        setCreateErrors({ form: errorMsg });
        return;
      }

      showSuccess('Yeni istifadəçi əlavə olundu');
      setCreateModalOpen(false);
      fetchAdminProfiles(true);
    } catch (err: any) {
      const errorMsg = err?.message || 'Xəta baş verdi, yenidən cəhd edin';
      showError(errorMsg);
      setCreateErrors({ form: errorMsg });
    } finally {
      setCreatingUser(false);
    }
  };

  // Request Role Change Modal
  const requestRoleChange = (profile: AdminProfile) => {
    if (!isAdministrator) {
      showError('Yalnız administrator rolları dəyişə bilər.');
      return;
    }
    if (profile.id === currentUser?.id) {
      showError('Öz rolunuzu dəyişə bilməzsiniz.');
      return;
    }
    if (profile.role === 'administrator') {
      showError('Başqa bir administratorun rolunu dəyişə bilməzsiniz.');
      return;
    }
    setProfileToChange(profile);
    setSelectedRole(profile.role);
    setRoleModalOpen(true);
  };

  // Confirm Role Change using set_user_role RPC
  const handleConfirmRoleChange = async () => {
    if (!profileToChange) return;

    try {
      setUpdatingRole(true);

      // RPC: set_user_role(target uuid, new_role app_role)
      const { error: rpcError } = await supabase.rpc('set_user_role', {
        target: profileToChange.id,
        new_role: selectedRole,
      });

      if (rpcError) {
        console.error('[Supabase RPC set_user_role Error]:', rpcError);
        showError(getFriendlyErrorMessage(rpcError));
        return;
      }

      setProfiles((prev) =>
        prev.map((p) => (p.id === profileToChange.id ? { ...p, role: selectedRole } : p))
      );

      showSuccess(`"${profileToChange.full_name || profileToChange.email || 'İstifadəçi'}" rolu "${ROLE_LABELS[selectedRole]}" olaraq təyin edildi.`);
      setRoleModalOpen(false);
      setProfileToChange(null);
    } catch (err) {
      console.error('[Supabase] Rol dəyişmə xətası:', err);
      showError(getFriendlyErrorMessage(err));
    } finally {
      setUpdatingRole(false);
    }
  };

  // Request Delete User Modal
  const requestDeleteUser = (profile: AdminProfile) => {
    if (!isAdministrator) {
      showError('Yalnız administrator hesabı silə bilər.');
      return;
    }
    if (profile.id === currentUser?.id) {
      showError('Öz hesabınızı silə bilməzsiniz.');
      return;
    }
    if (profile.role === 'administrator') {
      showError('Başqa bir administrator hesabını silə bilməzsiniz.');
      return;
    }
    setProfileToDelete(profile);
    setDeleteModalOpen(true);
  };

  // Confirm Delete User using delete_user RPC
  const handleConfirmDeleteUser = async () => {
    if (!profileToDelete) return;

    try {
      setDeletingUser(true);

      // RPC: delete_user(target uuid)
      const { error: rpcError } = await supabase.rpc('delete_user', {
        target: profileToDelete.id,
      });

      if (rpcError) {
        console.error('[Supabase RPC delete_user Error]:', rpcError);
        showError(getFriendlyErrorMessage(rpcError));
        return;
      }

      setProfiles((prev) => prev.filter((p) => p.id !== profileToDelete.id));
      showSuccess(`"${profileToDelete.full_name || profileToDelete.email}" hesabı uğurla silindi.`);
      setDeleteModalOpen(false);
      setProfileToDelete(null);
    } catch (err) {
      console.error('[Supabase] İstifadəçi silmə xətası:', err);
      showError(getFriendlyErrorMessage(err));
    } finally {
      setDeletingUser(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-serif-heading font-medium tracking-tight text-[#1E2A22]">
            Admin İstifadəçiləri
          </h1>
          <p className="text-xs sm:text-sm text-[#5E6B62] mt-1">
            İdarəetmə panelinə çıxışı olan heyət və onların səlahiyyət dərəcələri
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchAdminProfiles(true)}
            disabled={refreshing || loading}
            className="px-4 py-2 rounded-full bg-[#FFFFFF] hover:bg-[#F7F3EA] text-[#1E2A22] font-medium text-xs border border-[rgba(26,19,12,0.15)] transition-colors cursor-pointer inline-flex items-center gap-2 shadow-2xs disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Yenilə</span>
          </button>

          {/* "Əlavə et" button - ONLY for administrators */}
          {isAdministrator && (
            <button
              onClick={openCreateUserModal}
              className="px-5 py-2.5 rounded-full bg-[#2F5D46] hover:bg-[#254B38] text-[#F7F3EA] font-semibold text-xs tracking-wide transition-all shadow-2xs hover:shadow-xs inline-flex items-center gap-2 cursor-pointer active:scale-98"
            >
              <Plus className="w-4 h-4" />
              <span>Əlavə et</span>
            </button>
          )}
        </div>
      </div>

      {/* Search Input */}
      <div className="bg-[#FFFFFF] border border-[rgba(26,19,12,0.10)] rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
        <div className="relative w-full max-w-sm">
          <Search className="w-4 h-4 text-[#5E6B62] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Ad və ya e-poçta görə axtarış..."
            className="w-full pl-9 pr-3.5 py-2 bg-[#F7F3EA] border border-[rgba(26,19,12,0.15)] rounded-full text-xs text-[#1E2A22] placeholder-[#5E6B62]/60 focus:border-[#2F5D46] focus:bg-[#FFFFFF] focus:outline-none transition-colors"
          />
        </div>
        <div className="text-xs text-[#5E6B62]">
          Cəmi: <strong className="text-[#1E2A22] font-semibold">{filteredProfiles.length}</strong> admin hesabı
        </div>
      </div>

      {/* Profiles Table */}
      <div className="bg-[#FFFFFF] border border-[rgba(26,19,12,0.10)] rounded-2xl shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-sm text-[#5E6B62] flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-2 border-[#2F5D46] border-t-[#1F3D2F] rounded-full animate-spin" />
            <span className="font-medium text-xs">Admin profilləri yüklənir...</span>
          </div>
        ) : filteredProfiles.length === 0 ? (
          <div className="p-16 text-center">
            <Users className="w-12 h-12 text-[#5E6B62]/40 mx-auto mb-3" />
            <h3 className="text-base font-serif-heading font-medium text-[#1E2A22]">Admin profili tapılmadı</h3>
            <p className="text-xs text-[#5E6B62] mt-1">
              Axtarışa uyğun admin hesabı tapılmadı.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="bg-[#1F3D2F] text-[#C9D3C4] uppercase text-[11px] tracking-wider border-b border-[rgba(243,236,225,0.10)]">
                    <th className="py-4 px-6 font-semibold">İstifadəçi</th>
                    <th className="py-4 px-4 font-semibold">E-poçt</th>
                    <th className="py-4 px-4 font-semibold">Səlahiyyət (Rol)</th>
                    <th className="py-4 px-4 font-semibold">Qeydiyyat tarixi</th>
                    <th className="py-4 px-6 text-right font-semibold">Əməliyyatlar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[rgba(26,19,12,0.08)]">
                  {filteredProfiles.map((profile) => {
                    const isSelf = profile.id === currentUser?.id;
                    const isTargetAdmin = profile.role === 'administrator';
                    const badge = ROLE_BADGES[profile.role] || ROLE_BADGES.viewer;

                    return (
                      <tr key={profile.id} className="hover:bg-[#2F5D46]/15 transition-colors">
                        <td className="py-3.5 px-6">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 border shadow-2xs ${badge.bg} ${badge.text} ${badge.border}`}
                            >
                              {profile.role === 'administrator' ? (
                                <ShieldCheck className="w-4 h-4" />
                              ) : profile.role === 'worker' ? (
                                <Shield className="w-4 h-4" />
                              ) : (
                                <Eye className="w-4 h-4" />
                              )}
                            </div>
                            <div>
                              <div className="font-semibold text-sm text-[#1E2A22] flex items-center gap-2">
                                <span>{profile.full_name || 'Ad qeyd edilməyib'}</span>
                                {isSelf && (
                                  <span className="text-[10px] bg-[#2F5D46] text-[#F7F3EA] font-semibold px-2 py-0.5 rounded-full border border-[#2F5D46]/20">
                                    Siz
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-[#5E6B62] font-mono mt-0.5">
                                ID: {profile.id.substring(0, 8)}...
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-[#1E2A22] font-medium text-xs">
                          <div className="flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5 text-[#5E6B62]" />
                            <span>{profile.email || '-'}</span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${badge.bg} ${badge.text} ${badge.border}`}
                          >
                            {ROLE_LABELS[profile.role] || profile.role}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-[#5E6B62] text-xs">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-[#5E6B62]" />
                            {formatAzDate(profile.created_at)}
                          </span>
                        </td>

                        <td className="py-3.5 px-6 text-right">
                          {isSelf ? (
                            <span className="text-xs text-[#5E6B62]/60 italic select-none">
                              Öz hesabınız
                            </span>
                          ) : isTargetAdmin ? (
                            <span
                              className="text-xs text-[#5E6B62]/60 italic select-none"
                              title="Administrator hesabları digər administratorlar tərəfindən dəyişdirilə bilməz"
                            >
                              Qorunan hesab
                            </span>
                          ) : canManageRoles ? (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => requestRoleChange(profile)}
                                className="px-3 py-1 text-xs font-semibold rounded-full border border-[rgba(26,19,12,0.15)] bg-[#F7F3EA] text-[#1E2A22] hover:bg-[#2F5D46]/40 transition-colors cursor-pointer inline-flex items-center gap-1.5 shadow-2xs"
                                title="Rolu dəyişdir"
                              >
                                <UserCog className="w-3.5 h-3.5 text-[#2F5D46]" />
                                <span>Rolu dəyiş</span>
                              </button>
                              <button
                                onClick={() => requestDeleteUser(profile)}
                                className="p-1.5 text-[#B3261E] hover:bg-[#B3261E]/10 rounded-full transition-colors cursor-pointer"
                                title="Hesabı sil"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-[#5E6B62]/40 select-none">
                              Baxış rejimi
                            </span>
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
              {filteredProfiles.map((profile) => {
                const isSelf = profile.id === currentUser?.id;
                const isTargetAdmin = profile.role === 'administrator';
                const badge = ROLE_BADGES[profile.role] || ROLE_BADGES.viewer;

                return (
                  <div key={profile.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 border shadow-2xs ${badge.bg} ${badge.text} ${badge.border}`}
                        >
                          {profile.role === 'administrator' ? (
                            <ShieldCheck className="w-4 h-4" />
                          ) : profile.role === 'worker' ? (
                            <Shield className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <div className="font-semibold text-sm text-[#1E2A22] flex items-center gap-1.5">
                            <span>{profile.full_name || 'Ad qeyd edilməyib'}</span>
                            {isSelf && (
                              <span className="text-[10px] bg-[#2F5D46] text-[#F7F3EA] font-semibold px-2 py-0.5 rounded-full">
                                Siz
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-[#5E6B62] mt-0.5">
                            {profile.email || '-'}
                          </div>
                        </div>
                      </div>

                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${badge.bg} ${badge.text} ${badge.border}`}
                      >
                        {ROLE_LABELS[profile.role] || profile.role}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-[rgba(26,19,12,0.08)] text-xs">
                      <span className="text-[11px] text-[#5E6B62]">
                        {formatAzDate(profile.created_at)}
                      </span>

                      {isSelf ? (
                        <span className="text-xs text-[#5E6B62]/60 italic">
                          Öz hesabınız
                        </span>
                      ) : isTargetAdmin ? (
                        <span className="text-xs text-[#5E6B62]/60 italic">
                          Qorunan hesab
                        </span>
                      ) : canManageRoles ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => requestRoleChange(profile)}
                            className="px-3 py-1 text-xs font-semibold rounded-full border border-[rgba(26,19,12,0.15)] bg-[#F7F3EA] text-[#1E2A22]"
                          >
                            Rolu dəyiş
                          </button>
                          <button
                            onClick={() => requestDeleteUser(profile)}
                            className="p-1.5 text-[#B3261E] bg-[#B3261E]/10 rounded-full border border-[#B3261E]/20"
                            title="Sil"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* CREATE NEW USER MODAL */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1F3D2F]/80 backdrop-blur-xs overflow-y-auto">
          <div
            className="w-full max-w-lg bg-[#FFFFFF] border border-[rgba(26,19,12,0.15)] rounded-2xl p-6 sm:p-7 shadow-2xl text-[#1E2A22] my-8 animate-in fade-in zoom-in-95 duration-150"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between border-b border-[rgba(26,19,12,0.10)] pb-4 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#2F5D46]/40 border border-[#2F5D46] text-[#1E2A22] flex items-center justify-center shrink-0">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-serif-heading font-medium text-[#1E2A22]">
                    Yeni istifadəçi əlavə et
                  </h3>
                  <p className="text-xs text-[#5E6B62] mt-0.5">
                    İstifadəçi məlumatlarını və səlahiyyət dərəcəsini qeyd edin
                  </p>
                </div>
              </div>
              <button
                onClick={() => !creatingUser && setCreateModalOpen(false)}
                disabled={creatingUser}
                className="text-[#5E6B62] hover:text-[#1E2A22] p-1.5 rounded-full hover:bg-[rgba(26,19,12,0.06)] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {createErrors.form && (
              <div className="mb-4 p-3 rounded-xl bg-[#B3261E]/10 border border-[#B3261E]/25 text-[#B3261E] text-xs font-medium">
                {createErrors.form}
              </div>
            )}

            <form onSubmit={handleCreateUserSubmit} className="space-y-4">
              {/* Ad və soyad */}
              <div>
                <label className="block text-xs font-semibold text-[#1E2A22] mb-1.5">
                  Ad və soyad <span className="text-[#B3261E]">*</span>
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Məsələn: Əli Məmmədov"
                  className={`w-full px-3.5 py-2.5 bg-[#F7F3EA] border rounded-xl text-xs sm:text-sm text-[#1E2A22] placeholder-[#5E6B62]/60 focus:bg-[#FFFFFF] focus:outline-none transition-colors ${
                    createErrors.name ? 'border-[#B3261E]' : 'border-[rgba(26,19,12,0.15)] focus:border-[#2F5D46]'
                  }`}
                />
                {createErrors.name && (
                  <p className="text-xs text-[#B3261E] mt-1">{createErrors.name}</p>
                )}
              </div>

              {/* E-poçt */}
              <div>
                <label className="block text-xs font-semibold text-[#1E2A22] mb-1.5">
                  E-poçt <span className="text-[#B3261E]">*</span>
                </label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="Məsələn: admin@alinachess.az"
                  className={`w-full px-3.5 py-2.5 bg-[#F7F3EA] border rounded-xl text-xs sm:text-sm text-[#1E2A22] placeholder-[#5E6B62]/60 focus:bg-[#FFFFFF] focus:outline-none transition-colors ${
                    createErrors.email ? 'border-[#B3261E]' : 'border-[rgba(26,19,12,0.15)] focus:border-[#2F5D46]'
                  }`}
                />
                {createErrors.email && (
                  <p className="text-xs text-[#B3261E] mt-1">{createErrors.email}</p>
                )}
              </div>

              {/* Parol */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-[#1E2A22]">
                    Parol <span className="text-[#B3261E]">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleGeneratePassword}
                    className="text-[11px] font-semibold text-[#2F5D46] hover:text-[#1E2A22] flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Təsadüfi parol yarat</span>
                  </button>
                </div>
                <div className="relative flex items-center">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Ən azı 8 simvol"
                    className={`w-full pl-3.5 pr-20 py-2.5 bg-[#F7F3EA] border rounded-xl text-xs sm:text-sm font-mono text-[#1E2A22] placeholder-[#5E6B62]/60 focus:bg-[#FFFFFF] focus:outline-none transition-colors ${
                      createErrors.password ? 'border-[#B3261E]' : 'border-[rgba(26,19,12,0.15)] focus:border-[#2F5D46]'
                    }`}
                  />
                  <div className="absolute right-2 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={handleCopyPassword}
                      className="p-1.5 text-[#5E6B62] hover:text-[#1E2A22] rounded-md transition-colors cursor-pointer"
                      title={copiedPassword ? 'Kopyalandı' : 'Parolu kopyala'}
                    >
                      {copiedPassword ? (
                        <Check className="w-4 h-4 text-[#2F5D46]" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="p-1.5 text-[#5E6B62] hover:text-[#1E2A22] rounded-md transition-colors cursor-pointer"
                      title={showPassword ? 'Gizlət' : 'Göstər'}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
                {createErrors.password && (
                  <p className="text-xs text-[#B3261E] mt-1">{createErrors.password}</p>
                )}
              </div>

              {/* Rol */}
              <div>
                <label className="block text-xs font-semibold text-[#1E2A22] mb-1.5">
                  Rol <span className="text-[#B3261E]">*</span>
                </label>
                <div className="relative">
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as CreateUserRole)}
                    className="w-full px-3.5 py-2.5 bg-[#F7F3EA] border border-[rgba(26,19,12,0.15)] focus:border-[#2F5D46] focus:bg-[#FFFFFF] rounded-xl text-xs sm:text-sm text-[#1E2A22] focus:outline-none transition-colors appearance-none cursor-pointer"
                  >
                    <option value="viewer">İzləyici</option>
                    <option value="worker">İşçi</option>
                    <option value="administrator">Administrator</option>
                    <option value="none">Yalnız sayt hesabı (panelə giriş yoxdur)</option>
                  </select>
                  <Shield className="w-4 h-4 text-[#5E6B62] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Parol Qeydi */}
              <div className="p-3 bg-[#F7F3EA] rounded-xl border border-[rgba(26,19,12,0.10)] text-xs text-[#5E6B62] flex items-center gap-2">
                <Key className="w-4 h-4 text-[#2F5D46] shrink-0" />
                <span>Parolu istifadəçiyə özünüz ötürməlisiniz.</span>
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-[rgba(26,19,12,0.10)] flex items-center justify-end gap-3">
                <button
                  type="button"
                  disabled={creatingUser}
                  onClick={() => setCreateModalOpen(false)}
                  className="px-5 py-2.5 text-xs font-semibold text-[#1E2A22] bg-[#F7F3EA] hover:bg-[#2F5D46]/30 border border-[rgba(26,19,12,0.15)] rounded-full transition-colors cursor-pointer"
                >
                  Ləğv et
                </button>
                <button
                  type="submit"
                  disabled={creatingUser}
                  className="px-6 py-2.5 text-xs font-semibold bg-[#2F5D46] hover:bg-[#254B38] text-[#F7F3EA] rounded-full transition-all cursor-pointer flex items-center gap-2 shadow-2xs hover:shadow-xs disabled:opacity-50"
                >
                  {creatingUser && (
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  )}
                  <span>Əlavə et</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Role Change Modal */}
      {roleModalOpen && profileToChange && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1F3D2F]/80 backdrop-blur-xs">
          <div className="w-full max-w-md bg-[#FFFFFF] border border-[rgba(26,19,12,0.15)] rounded-2xl p-6 sm:p-7 shadow-2xl text-[#1E2A22] animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[rgba(26,19,12,0.10)] pb-4 mb-4">
              <h3 className="text-xl font-serif-heading font-medium text-[#1E2A22]">
                İstifadəçi rolunu dəyişdir
              </h3>
              <button
                onClick={() => {
                  setRoleModalOpen(false);
                  setProfileToChange(null);
                }}
                disabled={updatingRole}
                className="text-[#5E6B62] hover:text-[#1E2A22] p-1.5 rounded-full hover:bg-[rgba(26,19,12,0.06)] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-[#5E6B62]">
              <strong className="text-[#1E2A22] font-semibold">{profileToChange.full_name || profileToChange.email}</strong> üçün yeni səlahiyyət dərəcəsi seçin:
            </p>

            <div className="mt-4 space-y-2.5">
              <label
                onClick={() => setSelectedRole('worker')}
                className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-colors ${
                  selectedRole === 'worker'
                    ? 'border-[#2F5D46] bg-[#2F5D46]/25'
                    : 'border-[rgba(26,19,12,0.12)] bg-[#F7F3EA] hover:bg-[#2F5D46]/15'
                }`}
              >
                <div>
                  <div className="text-xs font-bold text-[#1E2A22]">İşçi (worker)</div>
                  <div className="text-[11px] text-[#5E6B62] mt-0.5">Kitab, müəllim və əlaqə sorğularını idarə edə bilər</div>
                </div>
                <input
                  type="radio"
                  name="roleSelect"
                  checked={selectedRole === 'worker'}
                  onChange={() => setSelectedRole('worker')}
                  className="accent-[#2F5D46]"
                />
              </label>

              <label
                onClick={() => setSelectedRole('viewer')}
                className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-colors ${
                  selectedRole === 'viewer'
                    ? 'border-[#2F5D46] bg-[#2F5D46]/25'
                    : 'border-[rgba(26,19,12,0.12)] bg-[#F7F3EA] hover:bg-[#2F5D46]/15'
                }`}
              >
                <div>
                  <div className="text-xs font-bold text-[#1E2A22]">Müşahidəçi (viewer)</div>
                  <div className="text-[11px] text-[#5E6B62] mt-0.5">Yalnız məlumatlara baxa bilər, redaktə edə bilməz</div>
                </div>
                <input
                  type="radio"
                  name="roleSelect"
                  checked={selectedRole === 'viewer'}
                  onChange={() => setSelectedRole('viewer')}
                  className="accent-[#2F5D46]"
                />
              </label>

              <label
                onClick={() => setSelectedRole('administrator')}
                className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-colors ${
                  selectedRole === 'administrator'
                    ? 'border-[#2F5D46] bg-[#2F5D46]/25'
                    : 'border-[rgba(26,19,12,0.12)] bg-[#F7F3EA] hover:bg-[#2F5D46]/15'
                }`}
              >
                <div>
                  <div className="text-xs font-bold text-[#1E2A22]">Administrator (administrator)</div>
                  <div className="text-[11px] text-[#5E6B62] mt-0.5">Bütün sistemə və rolların təyininə tam nəzarət</div>
                </div>
                <input
                  type="radio"
                  name="roleSelect"
                  checked={selectedRole === 'administrator'}
                  onChange={() => setSelectedRole('administrator')}
                  className="accent-[#2F5D46]"
                />
              </label>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-[rgba(26,19,12,0.10)]">
              <button
                type="button"
                disabled={updatingRole}
                onClick={() => {
                  setRoleModalOpen(false);
                  setProfileToChange(null);
                }}
                className="px-5 py-2.5 text-xs font-semibold text-[#1E2A22] bg-[#F7F3EA] hover:bg-[#2F5D46]/30 border border-[rgba(26,19,12,0.15)] rounded-full transition-colors cursor-pointer"
              >
                Ləğv et
              </button>
              <button
                type="button"
                disabled={updatingRole}
                onClick={handleConfirmRoleChange}
                className="px-6 py-2.5 text-xs font-semibold bg-[#2F5D46] hover:bg-[#254B38] text-[#1E2A22] rounded-full transition-all cursor-pointer flex items-center gap-2 shadow-2xs hover:shadow-xs disabled:opacity-50"
              >
                {updatingRole && (
                  <span className="w-3.5 h-3.5 border-2 border-[#1E2A22]/30 border-t-[#1E2A22] rounded-full animate-spin" />
                )}
                <span>Yadda saxla</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete User Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        title="Admin hesabını sil"
        description={`"${profileToDelete?.full_name || profileToDelete?.email}" adlı admin hesabını silmək istədiyinizdən əminsiniz? Bu istifadəçinin sistemə girişi dərhal ləğv ediləcək.`}
        confirmText="Hesabı sil"
        cancelText="Ləğv et"
        isDestructive={true}
        isLoading={deletingUser}
        onConfirm={handleConfirmDeleteUser}
        onClose={() => {
          setDeleteModalOpen(false);
          setProfileToDelete(null);
        }}
      />
    </div>
  );
}
