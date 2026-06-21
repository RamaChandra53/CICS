import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/auth/check-default-password
 *
 * Checks if the user is attempting to log in with the default password.
 * This keeps the default password server-side only.
 *
 * The client sends { rollNumber, password } and the server responds with:
 * - { isDefault: true } if the password matches the default
 * - { isDefault: false } otherwise
 *
 * This is used to detect first-time login attempts without exposing
 * the default password in the client bundle.
 */

const DEFAULT_PASSWORD = process.env.DEFAULT_USER_PASSWORD || 'cics@123';

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();

    if (!password || typeof password !== 'string') {
      return NextResponse.json(
        { error: 'Password is required.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      isDefault: password === DEFAULT_PASSWORD,
    });
  } catch (error) {
    console.error('Check default password API error:', error);
    return NextResponse.json(
      { error: 'Internal server error.' },
      { status: 500 }
    );
  }
}
