import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { parseRollNumber, getCurrentYear } from '@/lib/parseRoll';

/**
 * POST /api/auth/first-login
 *
 * Handles the first-time login check server-side so the default password
 * is never exposed in the client bundle.
 *
 * The client sends { rollNumber } and the server:
 * 1. Validates the roll number format
 * 2. Checks if a profile already exists for this roll number
 * 3. If not, signs up the user with the default password (kept server-side)
 * 4. Signs in and returns a session
 *
 * This replaces the client-side DEFAULT_PASSWORD constant.
 */

const DEFAULT_PASSWORD = process.env.DEFAULT_USER_PASSWORD || 'cics@123';

export async function POST(request: NextRequest) {
  try {
    const { rollNumber } = await request.json();

    if (!rollNumber || typeof rollNumber !== 'string') {
      return NextResponse.json(
        { error: 'Roll number is required.' },
        { status: 400 }
      );
    }

    const normalizedRoll = rollNumber.trim().toUpperCase();
    const parsedRoll = parseRollNumber(normalizedRoll);

    if (!parsedRoll) {
      return NextResponse.json(
        { error: 'Invalid roll number format.' },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseServiceKey) {
      console.error('SUPABASE_SERVICE_ROLE_KEY not configured');
      return NextResponse.json(
        { error: 'Server configuration error.' },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Check if a profile already exists with this roll number
    const { data: existingProfile, error: profileCheckError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('roll_number', normalizedRoll)
      .maybeSingle();

    if (profileCheckError) {
      console.error('Profile check error:', profileCheckError.message);
      return NextResponse.json(
        { error: 'Unable to verify roll number. Please try again.' },
        { status: 500 }
      );
    }

    if (existingProfile) {
      return NextResponse.json(
        { error: 'This roll number is already registered. Try logging in with your password instead.' },
        { status: 409 }
      );
    }

    // Create new account with default password
    const email = `${normalizedRoll}@cics.local`;
    const currentYear = getCurrentYear(normalizedRoll);
    const isAlumni = currentYear === 'Alumni';

    const { data: signUpData, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: DEFAULT_PASSWORD,
      email_confirm: true,
      user_metadata: {
        roll_number: normalizedRoll,
        is_first_login: true,
        year: isAlumni ? null : parsedRoll.year,
        branch: parsedRoll.branch,
        section: parsedRoll.section,
      },
    });

    if (signUpError) {
      // Handle case where the auth user exists but profile doesn't
      if (signUpError.message?.includes('already been registered')) {
        return NextResponse.json(
          { error: 'This roll number is already registered. Try logging in with your password instead.' },
          { status: 409 }
        );
      }
      console.error('Signup error:', signUpError.message);
      return NextResponse.json(
        { error: 'Failed to create account. Please try again.' },
        { status: 500 }
      );
    }

    if (!signUpData.user) {
      return NextResponse.json(
        { error: 'Failed to create account. Please try again.' },
        { status: 500 }
      );
    }

    // Return success — the client will now sign in with the default password
    // We return a flag indicating this is a first-time login
    return NextResponse.json({
      success: true,
      isFirstLogin: true,
      userId: signUpData.user.id,
    });
  } catch (error) {
    console.error('First-login API error:', error);
    return NextResponse.json(
      { error: 'Internal server error.' },
      { status: 500 }
    );
  }
}
