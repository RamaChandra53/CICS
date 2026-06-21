import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/auth/signup
 *
 * Server-side signup for first-time users with default credentials.
 * Creates the Supabase auth user with the default password and returns
 * session tokens so the client can continue the flow.
 *
 * Body: { rollNumber, year, branch, section }
 */

const DEFAULT_PASSWORD = 'cics@123';

export async function POST(request: NextRequest) {
  try {
    const { rollNumber, year, branch, section } = await request.json();

    if (!rollNumber || typeof rollNumber !== 'string') {
      return NextResponse.json(
        { error: 'Roll number is required' },
        { status: 400 }
      );
    }

    const normalizedRoll = rollNumber.trim().toUpperCase();
    const email = `${normalizedRoll}@cics.local`;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    if (!supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Check if roll number is already registered
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('roll_number', normalizedRoll)
      .maybeSingle();

    if (existingProfile) {
      return NextResponse.json(
        { error: 'This roll number is already registered. Try logging in instead.' },
        { status: 409 }
      );
    }

    // Create the auth user with default password
    const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: signUpData, error: signUpError } = await supabaseAnon.auth.signUp({
      email,
      password: DEFAULT_PASSWORD,
      options: {
        data: {
          roll_number: normalizedRoll,
          is_first_login: true,
          year: year === 'Alumni' ? null : year,
          branch,
          section,
        },
      },
    });

    if (signUpError) {
      return NextResponse.json(
        { error: signUpError.message || 'Failed to create account' },
        { status: 400 }
      );
    }

    // If no session was created, sign in to get one
    let session = signUpData.session;
    let userId = signUpData.user?.id ?? null;

    if (!session) {
      const { data: signInData, error: signInError } =
        await supabaseAnon.auth.signInWithPassword({
          email,
          password: DEFAULT_PASSWORD,
        });

      if (signInError || !signInData.user) {
        return NextResponse.json(
          { error: 'Account created but unable to start session. Please try logging in.' },
          { status: 500 }
        );
      }

      session = signInData.session;
      userId = signInData.user.id;
    }

    return NextResponse.json({
      userId,
      session: {
        access_token: session?.access_token,
        refresh_token: session?.refresh_token,
      },
    });
  } catch (error) {
    console.error('Signup API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
