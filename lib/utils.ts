/**
 * Format date in 24-hour dd.MM.yyyy HH:mm format
 */
export function formatAzDate(dateString: string | null | undefined): string {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}.${month}.${year} ${hours}:${minutes}`;
  } catch {
    return dateString;
  }
}

/**
 * Format friendly error message in Azerbaijani
 */
export function getFriendlyErrorMessage(error: any): string {
  if (!error) return 'Bilinməyən xəta baş verdi.';

  const message = typeof error === 'string' ? error : error.message || '';
  const lowerMsg = message.toLowerCase();

  // Wrong email or password
  if (
    lowerMsg.includes('invalid login credentials') ||
    lowerMsg.includes('invalid grant') ||
    lowerMsg.includes('invalid email or password')
  ) {
    return 'E-poçt ünvanı və ya şifrə yanlışdır.';
  }

  // Email not confirmed
  if (lowerMsg.includes('email not confirmed')) {
    return 'E-poçt ünvanı təsdiqlənməyib. Zəhmət olmasa e-poçt qutunuzu yoxlayın.';
  }

  // Network error
  if (
    lowerMsg.includes('failed to fetch') ||
    lowerMsg.includes('networkerror') ||
    lowerMsg.includes('network request failed') ||
    lowerMsg.includes('connection refused')
  ) {
    return 'Şəbəkə xətası: İnternet bağlantınızı və ya Supabase serverini yoxlayın.';
  }

  // RLS / permission errors
  if (
    lowerMsg.includes('row-level security') ||
    lowerMsg.includes('violates row-level security policy') ||
    lowerMsg.includes('permission denied') ||
    error.code === '42501'
  ) {
    return 'Bu əməliyyat üçün icazəniz yoxdur (RLS xətası).';
  }

  // Missing table error
  if (lowerMsg.includes('relation "admin_profiles" does not exist') || error.code === '42P01') {
    return "Cədvəl xətası: 'admin_profiles' cədvəli tapılmadı. Verilənlər bazasını yoxlayın.";
  }

  // Duplicate key
  if (lowerMsg.includes('duplicate key') || lowerMsg.includes('unique constraint')) {
    return 'Bu məlumat artıq mövcuddur.';
  }

  // Payload too large
  if (lowerMsg.includes('payload too large') || lowerMsg.includes('entity too large')) {
    return 'Faylın həcmi icazə verilən həddən böyükdür.';
  }

  // No admin profile row
  if (lowerMsg.includes('admin panelə girişi yoxdur')) {
    return 'Bu hesabın admin panelə girişi yoxdur.';
  }

  return message || 'Əməliyyat zamanı xəta baş verdi.';
}

/**
 * Sanitize filename for safe storage upload
 */
export function sanitizeFileName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9.]/g, '-')
    .replace(/-+/g, '-');
}

/**
 * Extract storage object path from public URL
 * Example: https://xyz.supabase.co/storage/v1/object/public/book-covers/folder/pic.jpg -> folder/pic.jpg
 */
export function extractStoragePath(publicUrl: string | null | undefined, bucket: string): string | null {
  if (!publicUrl) return null;
  const marker = `/object/public/${bucket}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) {
    const altMarker = `/${bucket}/`;
    const altIdx = publicUrl.lastIndexOf(altMarker);
    if (altIdx !== -1) {
      return publicUrl.substring(altIdx + altMarker.length);
    }
    return null;
  }
  return publicUrl.substring(idx + marker.length);
}
