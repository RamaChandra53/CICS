import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { parseRollNumber, getCurrentYear } from '@/lib/parseRoll';
import { validateMGITEmail } from '@/lib/emailValidation';

/**
 * POST /api/auth/first-login
 *
 * Creates a new account using the password selected by the student.
 *
 * The client sends { rollNumber, collegeEmail, password } and the server:
 * 1. Validates the roll number format
 * 2. Checks if a profile already exists for this roll number
 * 3. Creates a Supabase Auth account, which securely hashes the password
 * 4. Saves the unique college email in the user's profile
 */

export async function POST(request: NextRequest) {
  try {
    const { rollNumber, collegeEmail, password } = await request.json();

    if (!rollNumber || typeof rollNumber !== 'string') {
      return NextResponse.json(
        { error: 'Roll number is required.' },
        { status: 400 }
      );
    }

    const normalizedRoll = rollNumber.trim().toUpperCase();
    const normalizedCollegeEmail =
      typeof collegeEmail === 'string' ? collegeEmail.trim().toLowerCase() : '';

    if (!validateMGITEmail(normalizedCollegeEmail)) {
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

    // Auth emails are unique in Supabase. Check the profile record as well so
    // existing accounts created before this flow receive a clear response.
    const { data: existingCollegeEmail } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .ilike('college_email', normalizedCollegeEmail)
      .maybeSingle();

    if (existingCollegeEmail) {
      return NextResponse.json(
        { error: 'An account already exists for this college email. Please log in instead.' },
        { status: 409 }
      );
    }

    // Supabase Auth stores a salted password hash; plaintext passwords are
    // never saved in the application's profiles table.
    const currentYear = getCurrentYear(normalizedRoll);
    const isAlumni = currentYear === 'Alumni';

    const { data: signUpData, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
      email: normalizedCollegeEmail,
      password,
      email_confirm: true,
      user_metadata: {
        roll_number: normalizedRoll,
        is_first_login: false,
        year: isAlumni ? null : parsedRoll.year,
        branch: parsedRoll.branch,
        section: parsedRoll.section,
      },
    });

    if (signUpError) {
      // Handle case where the auth user exists but profile doesn't
      if (signUpError.message?.includes('already been registered')) {
        return NextResponse.json(
          { error: 'An account already exists for this roll number or college email. Please log in instead.' },
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

    // Keep the account's college address in the profile too. The unique index
    // from migration 011 protects this field independently of Supabase Auth.
    const { error: profileUpdateError } = await supabaseAdmin
      .from('profiles')
      .update({ college_email: normalizedCollegeEmail })
      .eq('id', signUpData.user.id);

    if (profileUpdateError) {
      console.error('Failed to save college email:', profileUpdateError.message);
      await supabaseAdmin.auth.admin.deleteUser(signUpData.user.id);
      return NextResponse.json(
        { error: 'Failed to create account. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      userId: signUpData.user.id,
      email: normalizedCollegeEmail,
    });
  } catch (error) {
    console.error('First-login API error:', error);
    return NextResponse.json(
      { error: 'Internal server error.' },
      { status: 500 }
    );
  }
}
