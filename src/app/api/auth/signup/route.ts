import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { validateMGITEmail } from '@/lib/emailValidation';
import { parseRollNumber } from '@/lib/parseRoll';

/**
 * POST /api/auth/signup
 *
 * Server-side signup for first-time users.
 * Creates the Supabase auth user with the password chosen by the student and returns
 * session tokens so the client can continue the flow.
 *
 * Body: { rollNumber, collegeEmail, password, year, branch, section }
 */

export async function POST(request: NextRequest) {
  try {
    const { rollNumber, collegeEmail, password } = await request.json();

    if (!rollNumber || typeof rollNumber !== 'string') {
      return NextResponse.json(
        { error: 'Roll number is required' },
        { status: 400 }
      );
    }

    const normalizedRoll = rollNumber.trim().toUpperCase();
    const parsedRoll = parseRollNumber(normalizedRoll);
    const email = typeof collegeEmail === 'string' ? collegeEmail.trim().toLowerCase() : '';

    if (!parsedRoll) {
      return NextResponse.json(
        { error: 'Invalid roll number format. Please check your roll number.' },
        { status: 400 }
      );
    }

    if (!validateMGITEmail(email)) {
      return NextResponse.json(
        { error: 'Use your MGIT college email address (for example, name@mgit.ac.in).' },
        { status: 400 }
      );
    }

    if (typeof password !== 'string' || password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long.' },
        { status: 400 }
      );
    }

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

    const { data: existingCollegeEmail } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .ilike('college_email', email)
      .maybeSingle();

    if (existingCollegeEmail) {
      return NextResponse.json(
        { error: 'An account already exists for this college email. Please log in instead.' },
        { status: 409 }
      );
    }

    // Supabase Auth securely hashes this password; it is never saved as
    // plaintext in the application database.
    const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: signUpData, error: signUpError } = await supabaseAnon.auth.signUp({
      email,
      password,
      options: {
        data: {
          roll_number: normalizedRoll,
          is_first_login: false,
          year: parsedRoll.year === 'Alumni' ? null : parsedRoll.year,
          branch: parsedRoll.branch,
          section: parsedRoll.section,
        },
      },
    });

    if (signUpError) {
      return NextResponse.json(
        { error: signUpError.message || 'Failed to create account' },
        { status: 400 }
      );
    }

    if (signUpData.user) {
      const { error: profileUpdateError } = await supabaseAdmin
        .from('profiles')
        .update({ college_email: email })
        .eq('id', signUpData.user.id);

      if (profileUpdateError) {
        console.error('Failed to save college email:', profileUpdateError.message);
        return NextResponse.json(
          { error: 'Account was created but its college email could not be saved. Please contact support.' },
          { status: 500 }
        );
      }
    }

    // If no session was created, sign in to get one
    let session = signUpData.session;
    let userId = signUpData.user?.id ?? null;

    if (!session) {
      const { data: signInData, error: signInError } =
        await supabaseAnon.auth.signInWithPassword({
          email,
          password,
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
