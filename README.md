# ALİNA Chess Club — İdarəetmə Paneli (Admin Panel)

ALİNA Chess Club üçün müstəqil, təhlükəsiz və müasir idarəetmə paneli. Mövcud Supabase layihəsinin məlumatlarını (əlaqə müraciətləri, kitablar, müəllimlər və inzibatçı heyəti) idarə edir.

Bütün interfeys **Azərbaycan dilindədir**.

---

## Quraşdırma

Layihəni istənilən əməliyyat sistemində (Windows, macOS, Linux) işə salmaq üçün aşağıdakı addımları yerinə yetirin:

1. Asılılıqları quraşdırın:
   ```bash
   npm install
   ```

2. `.env.example` faylının surətini çıxararaq `.env.local` adı ilə saxlayın və Supabase dəyərlərini daxil edin:
   ```bash
   cp .env.example .env.local
   ```

3. İnkişaf serverini işə salın:
   ```bash
   npm run dev
   ```

### Problemlərin Həlli (Troubleshooting)

Əgər Windows və ya digər platformada `Cannot find module ... lightningcss ...` xətası ilə qarşılaşsanız:
1. `node_modules` qovluğunu və `package-lock.json` faylını silin.
2. Yenidən `npm install` əmrini icra edin.

Bu addım sisteminizə uyğun binar modulların düzgün yüklənməsini təmin edəcəkdir.

---

## Texnoloji Yığın (Tech Stack)

- **Framework**: Next.js 15 (App Router, TypeScript)
- **Stil**: Tailwind CSS v4 (`@tailwindcss/postcss`)
- **İkonlar**: Lucide React
- **Verilənlər Bazası və Autentifikasiya**: Supabase (`@supabase/supabase-js`, `@supabase/ssr`)
- **Təhlükəsizlik**: Supabase Row Level Security (RLS) və server-tərəfli yoxlamalar
- **SEO & Axtarış Qadağası**: Bütün panel üçün `<meta name="robots" content="noindex, nofollow">` və `robots.txt`

---

## Mühit Dəyişənləri (Environment Variables)

Layihənin kök qovluğunda `.env.local` faylı yaradın və aşağıdakı dəyişənləri qeyd edin:

```env
# İctimai açarlar (müştəri və server üçün)
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"

# Gizli server açarı (YALNIZ SERVER-TƏRƏFLİ İSTİFADƏÇİ YARATMAQ ÜÇÜN)
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
```

> **MÜHÜM TƏHLÜKƏSİZLİK XƏBƏRDARLIĞI:** `SUPABASE_SERVICE_ROLE_KEY` dəyişəni tam hüquqlu gizli açardır (secret service role key). Bu açarı **heç vaxt GitHub / Git repozitoriyasına commit etməyin**, brauzer tərəfə göndərməyin və heç bir Client Component-də idxal etməyin. Bu açar yalnız `lib/supabase/admin.ts` daxilində və `POST /api/users/create` server marşrutunda yeni istifadəçi hesabı yaratmaq üçün istifadə olunur.

---

## Giriş Nəzarəti və Səlahiyyətlər (Access Control)

1. **Açıq Qeydiyyat Yoxdur**: Paneldə açıq qeydiyyat forması yoxdur. Giriş yalnız `/login` səhifəsi vasitəsilə inzibatçı e-poçtu və şifrəsi ilə həyata keçirilir.
2. **Rol Yoxlaması (`public.admin_profiles`)**: Giriş etdikdən sonra istifadəçinin `public.admin_profiles` cədvəlindəki rolu yoxlanılır. Əgər istifadəçinin bu cədvəldə qeydi yoxdursa:
   - İstifadəçi dərhal sistemdən çıxarılır (`supabase.auth.signOut()`).
   - "Bu hesabın admin panelə girişi yoxdur." xətası göstərilir.
3. **Səlahiyyət Dərəcələri (Roles)**:
   - **administrator**: Bütün funksiyalara, o cümlədən hesabların silinməsinə və rolların dəyişdirilməsinə tam çıxış. Digər administratorların hesabı üçün düymələr qorunur (gizlədilir).
   - **worker**: Məzmunu idarə edə bilər (kitablar, müəllimlər, əlaqə sorğuları). Hesabları silə və ya rolları dəyişə bilməz.
   - **viewer**: Yalnız məlumatlara baxış rejimi (naviqasiya, axtarış, filtr). Yaradılma, redaktə və silinmə düymələri göstərilmir.
4. **RPC Funksiyaları**:
   - `set_user_role(target uuid, new_role app_role)`
   - `delete_user(target uuid)`
5. **Server-Tərəfli Mühafizə**: Həm Next.js `middleware.ts` səviyyəsində, həm də `(admin)/layout.tsx` Server Component səviyyəsində sessiya və admin rolu yoxlanılır. Giriş etməyən istifadəçilər avtomatik `/login` səhifəsinə yönləndirilir.

---

## İlk Admin İstifadəçisinin Təyin Edilməsi

Yeni Supabase layihəsində ilk inzibatçını təyin etmək üçün Supabase Dashboard-da **SQL Editor** bölməsinə daxil olub aşağıdakı sorğunu icra edin:

```sql
INSERT INTO public.admin_profiles (id, email, full_name, role)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'sizin-admin-emailiniz@domain.com'),
  'sizin-admin-emailiniz@domain.com',
  'Baş Administrator',
  'administrator'
)
ON CONFLICT (id) DO UPDATE SET role = 'administrator';
```

---

## Vercel-də Yerləşdirmə (Deploy on Vercel)

Bu admin panel müstəqil layihə kimi Vercel-də asanlıqla yerləşdirilə bilər:

1. Kodu GitHub / GitLab repositoriyasına göndərin.
2. [Vercel Dashboard](https://vercel.com) üzərindən **"Add New Project"** seçin və repozitoriyanı idxal edin.
3. **Environment Variables** bölməsində:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   dəyişənlərini daxil edin.
4. **Deploy** düyməsini sıxın.
5. Supabase Dashboard-da **Authentication -> URL Configuration** bölməsində **Site URL** olaraq Vercel domeninizi (məsələn: `https://admin-sahmat.vercel.app`) qeyd edin.

---

## Verilənlər Bazası Strukturu

Panel mövcud verilənlər bazası strukturu ilə tam uyğundur:

- **`public.contact_requests`**: `id`, `value`, `type` ('email' | 'phone'), `status` ('new' | 'contacted'), `created_at`
- **`public.books`**: `id`, `title`, `author`, `description`, `level` ('beginner' | 'intermediate' | 'advanced'), `cover_url`, `file_url`, `file_name`, `created_at`
- **`public.teachers`**: `id`, `first_name`, `last_name`, `role_title`, `description`, `photo_url`, `sort_order`, `created_at`
- **`public.admin_profiles`**: `id`, `email`, `full_name`, `role` ('administrator' | 'worker' | 'viewer'), `created_at`

### Storage Bucket-ləri:
- `book-covers`: Kitabların üz qabığı şəkilləri (JPG/PNG/WebP, max 2 MB)
- `book-files`: Kitabların PDF sənədləri (PDF, max 25 MB)
- `teacher-photos`: Müəllimlərin fotoşəkilləri (JPG/PNG/WebP, max 2 MB)

Kitab və ya müəllim silindikdə, yaxud fayl yeniləndikdə köhnə fayl avtomatik Storage-dən təmizlənir.
