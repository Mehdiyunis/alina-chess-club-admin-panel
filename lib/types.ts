export type ContactRequestType = 'email' | 'phone';
export type ContactRequestStatus = 'new' | 'contacted';

export interface ContactRequest {
  id: string | number;
  value: string;
  type: ContactRequestType;
  status: ContactRequestStatus;
  created_at: string;
  handled_by?: string | null;
  handled_by_name?: string | null;
  handled_at?: string | null;
}

export type BookLevel = 'beginner' | 'intermediate' | 'advanced';

export interface Book {
  id: string | number;
  title: string;
  author: string | null;
  description: string | null;
  level: BookLevel;
  cover_url: string | null;
  file_url: string | null;
  file_name: string | null;
  created_at: string;
}

export type NewsLocale = 'az' | 'en' | 'ru';

export interface News {
  id: string;
  title_az: string;
  title_en: string | null;
  title_ru: string | null;
  body_az: string;
  body_en: string | null;
  body_ru: string | null;
  cover_url: string | null;
  is_published: boolean;
  created_at: string;
  updated_at?: string;
}

export type NewsMediaType = 'image' | 'video';

export interface NewsMedia {
  id: string;
  news_id: string;
  media_type: NewsMediaType;
  url: string;
  file_name: string | null;
  caption: string | null;
  sort_order: number;
  created_at?: string;
}

export type TournamentStatus = 'registration' | 'upcoming' | 'started' | 'finished';
export type TournamentAgeCategory = 'U8' | 'U10' | 'U12' | 'U14' | 'U16' | 'U18' | 'ADULT';
export type TournamentGrade = 'I' | 'II' | 'III' | 'IV' | 'V' | 'UNRATED';
export type TournamentResult = 'white' | 'black' | 'draw';

export interface Tournament {
  id: string;
  title_az: string;
  title_en: string | null;
  title_ru: string | null;
  description_az: string | null;
  description_en: string | null;
  description_ru: string | null;
  cover_url: string | null;
  starts_at: string;
  ends_at: string;
  round_count: number;
  status: TournamentStatus;
  is_published: boolean;
  created_at: string;
  updated_at?: string;
}

export interface TournamentDay {
  id: string;
  tournament_id: string;
  starts_at: string;
  ends_at: string;
  note_az: string | null;
  note_en: string | null;
  note_ru: string | null;
  sort_order: number;
}

export interface TournamentPlayer {
  id: string;
  tournament_id: string;
  profile_id: string | null;
  full_name: string;
  age_category: TournamentAgeCategory;
  grade: TournamentGrade;
  created_at?: string;
}

export interface TournamentRound {
  id: string;
  tournament_id: string;
  round_number: number;
  is_manual: boolean;
  generated_at?: string;
}

export interface TournamentMatch {
  id: string;
  tournament_id: string;
  round_id: string;
  round_number: number;
  board_number: number;
  age_category: TournamentAgeCategory;
  grade: TournamentGrade;
  white_player_id: string | null;
  black_player_id: string | null;
  result: TournamentResult | null;
  is_bye: boolean;
  updated_at?: string;
}

export interface SiteProfile {
  id: string;
  full_name: string | null;
}

export interface Teacher {
  id: string | number;
  first_name: string;
  last_name: string;
  role_title: string | null;
  description: string | null;
  photo_url: string | null;
  sort_order: number;
  created_at: string;
}

export type AdminRole = 'administrator' | 'worker' | 'viewer';

export interface AdminProfile {
  id: string; // uuid, same as auth.users.id
  email: string | null;
  full_name: string | null;
  role: AdminRole;
  created_at: string;
}

// Deprecated alias for backwards compatibility
export type Profile = AdminProfile;
export type ProfileRole = AdminRole;
