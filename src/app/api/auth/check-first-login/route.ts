import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/auth/check-first-login
 *
 * Server-side check for first-time login with default credentials.
 * This keeps the default password out of the client bundle.
 *
 * Body: { rollNumber }
 * Response: { isFirstTime: boolean, userId?: string }
 */

const DEFAULT_PASSWORD = 'cics@123';

export async function POST(request: NextRequest) {
  try {
    const { rollNumber } = await request.json();

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

    const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Try signing in with the default password
    const { data: signInData, error: signInError } =
      await supabaseAnon.auth.signInWithPassword({
        email,
        password: DEFAULT_PASSWORD,
      });

    if (!signInError && signInData.user) {
      // Successfully signed in with default password — this IS a first-time user
      // Sign them out from this temporary session
      await supabaseAnon.auth.signOut();

      return NextResponse.json({
        isFirstTime: true,
        exists: true,
      });
    }

    // Check if the roll number exists as a profile (for the "already registered" check)
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('roll_number', normalizedRoll)
      .maybeSingle();

    return NextResponse.json({
      isFirstTime: false,
      exists: !!existingProfile,
    });
  } catch (error) {
    console.error('Check first login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
