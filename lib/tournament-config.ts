import type {
  TournamentAgeCategory,
  TournamentGrade,
  TournamentResult,
  TournamentStatus,
} from '@/lib/types';

export const TOURNAMENT_STATUSES: TournamentStatus[] = [
  'registration',
  'upcoming',
  'started',
  'finished',
];

export const STATUS_LABELS: Record<TournamentStatus, string> = {
  registration: 'Qəbul açıqdır',
  upcoming: 'Gözlənilir',
  started: 'Başlayıb',
  finished: 'Bitib',
};

export const STATUS_CLASSES: Record<TournamentStatus, string> = {
  registration: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30',
  upcoming: 'bg-amber-500/10 text-amber-700 border-amber-500/30',
  started: 'bg-blue-500/10 text-blue-700 border-blue-500/30',
  finished: 'bg-[#E4EBD9] text-[#5E6B62] border-[#DCE6D0]',
};

export const AGE_CATEGORIES: TournamentAgeCategory[] = [
  'U8',
  'U10',
  'U12',
  'U14',
  'U16',
  'U18',
  'ADULT',
];

export const AGE_LABELS: Record<TournamentAgeCategory, string> = {
  U8: 'U8',
  U10: 'U10',
  U12: 'U12',
  U14: 'U14',
  U16: 'U16',
  U18: 'U18',
  ADULT: 'Yetkin',
};

export const GRADES: TournamentGrade[] = ['I', 'II', 'III', 'IV', 'V', 'UNRATED'];

export const GRADE_LABELS: Record<TournamentGrade, string> = {
  I: 'I dərəcə',
  II: 'II dərəcə',
  III: 'III dərəcə',
  IV: 'IV dərəcə',
  V: 'V dərəcə',
  UNRATED: 'Dərəcəsiz',
};

export const RESULT_OPTIONS: { value: TournamentResult; label: string }[] = [
  { value: 'white', label: '1–0' },
  { value: 'black', label: '0–1' },
  { value: 'draw', label: '½–½' },
];

/** Supabase timestamptz -> datetime-local input dəyəri (lokal vaxt) */
export function toDateTimeLocal(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  if (isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** datetime-local dəyəri -> ISO (UTC) */
export function fromDateTimeLocal(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (isNaN(date.getTime())) return null;
  return date.toISOString();
}

export function formatAzDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (isNaN(date.getTime())) return value;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(date.getMonth() + 1)}.${pad(date.getDate())}.${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
