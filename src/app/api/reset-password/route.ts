import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { userId, newPassword, rollNumber } = await request.json();

    if (!userId || !newPassword || !rollNumber) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Generate internal email format used by the login system
    const internalEmail = `${rollNumber.trim().toUpperCase()}@cics.local`;

    // Create admin client with service role key
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseServiceKey) {
      console.error('SUPABASE_SERVICE_ROLE_KEY not configured');
      return NextResponse.json(
        { error: 'Service key not configured' },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // First update password
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    );

    if (updateError) {
      console.error('Password update failed');
      return NextResponse.json(
        { error: `Failed to update password: ${updateError.message}` },
        { status: 500 }
      );
    }

    // Then update email separately
    const { error: emailError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { email: internalEmail }
    );

    if (emailError) {
      // Don't fail the request if email update fails, password is already updated
      console.error('Email update failed (password was updated successfully)');
    }

    // Update roll_number in profiles table if needed
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ 
        roll_number: rollNumber.trim().toUpperCase()
      })
      .eq('id', userId);

    if (profileError) {
      console.error('Profile update failed (password was updated successfully)');
    }

    return NextResponse.json(
      { message: 'Password reset successful' },
      { status: 200 }
    );

  } catch (error) {
    console.error('Reset password API error');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
