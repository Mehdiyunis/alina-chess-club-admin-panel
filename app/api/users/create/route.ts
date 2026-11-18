import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';

export async function POST(req: Request) {
  try {
    // 1. Read signed-in user from normal server Supabase client (cookies)
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Giriş edilməyib' },
        { status: 401 }
      );
    }

    // 2. Verify caller is an administrator via supabase.rpc('is_administrator')
    const { data: isAdmin, error: rpcError } = await supabase.rpc('is_administrator');
    if (rpcError || !isAdmin) {
      return NextResponse.json(
        { error: 'Bu əməliyyat üçün icazəniz yoxdur' },
        { status: 403 }
      );
    }

    // 3. Validate request body
    const body = await req.json().catch(() => ({}));
    const { name, email, password, role } = body;

    const trimmedName = typeof name === 'string' ? name.trim() : '';
    const trimmedEmail = typeof email === 'string' ? email.trim() : '';
    const trimmedPassword = typeof password === 'string' ? password : '';
    const allowedRoles = ['viewer', 'worker', 'administrator', 'none'];

    if (!trimmedName || trimmedName.length < 2 || trimmedName.length > 80) {
      return NextResponse.json(
        { error: 'Ad və soyad 2 ilə 80 simvol arasında olmalıdır' },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
      return NextResponse.json(
        { error: 'Düzgün e-poçt ünvanı daxil edin' },
        { status: 400 }
      );
    }

    if (!trimmedPassword || trimmedPassword.length < 8) {
      return NextResponse.json(
        { error: 'Parol çox qısadır' },
        { status: 400 }
      );
    }

    if (!role || !allowedRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Düzgün rol seçilməyib' },
        { status: 400 }
      );
    }

    // 4. Create account with Supabase admin client
    let adminSupabase;
    try {
      adminSupabase = getAdminClient();
    } catch {
      return NextResponse.json(
        { error: 'Serverdə Supabase admin sazlaması tapılmadı' },
        { status: 500 }
      );
    }

    const { data: createdData, error: createError } =
      await adminSupabase.auth.admin.createUser({
        email: trimmedEmail,
        password: trimmedPassword,
        email_confirm: true,
        user_metadata: { full_name: trimmedName },
      });

    if (createError || !createdData?.user) {
      const msg = (createError?.message || '').toLowerCase();
      if (
        msg.includes('already') ||
        msg.includes('exists') ||
        msg.includes('registered') ||
        createError?.status === 422
      ) {
        return NextResponse.json(
          { error: 'Bu e-poçt artıq qeydiyyatdadır' },
          { status: 400 }
        );
      }
      if (msg.includes('password') || msg.includes('weak') || msg.includes('short')) {
        return NextResponse.json(
          { error: 'Parol çox qısadır' },
          { status: 400 }
        );
      }
      if (msg.includes('email') || msg.includes('invalid')) {
        return NextResponse.json(
          { error: 'Düzgün e-poçt ünvanı daxil edin' },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: 'Xəta baş verdi, yenidən cəhd edin' },
        { status: 400 }
      );
    }

    const newUserId = createdData.user.id;

    // 5. If role is not 'none', call supabase.rpc('add_staff') with caller's session
    if (role !== 'none') {
      const { error: staffError } = await supabase.rpc('add_staff', {
        target_id: newUserId,
        new_role: role,
      });

      if (staffError) {
        // Rollback: delete just-created user so no half-created accounts exist
        await adminSupabase.auth.admin.deleteUser(newUserId);
        return NextResponse.json(
          { error: staffError.message || 'Xəta baş verdi, yenidən cəhd edin' },
          { status: 400 }
        );
      }
    }

    // 6. Return { id } on success. Never log or return password.
    return NextResponse.json({ id: newUserId });
  } catch {
    return NextResponse.json(
      { error: 'Xəta baş verdi, yenidən cəhd edin' },
      { status: 500 }
    );
  }
}
