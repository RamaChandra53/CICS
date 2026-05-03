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
    console.log(`Generated internal email: ${internalEmail}`);

    // Create admin client with service role key
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    console.log(`Supabase URL: ${supabaseUrl}`);
    console.log(`Service key exists: ${!!supabaseServiceKey}`);
    console.log(`Service key length: ${supabaseServiceKey?.length}`);

    if (!supabaseServiceKey) {
      console.error('Service key not configured');
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

    // Update user password using admin API with internal email
    console.log(`Attempting to update password for user: ${userId}`);
    console.log(`Using internal email: ${internalEmail}`);
    console.log(`New password length: ${newPassword.length}`);
    
    // First update password
    const { error: updateError, data: updateData } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    );

    console.log(`Password update result:`, { updateError, updateData });

    if (updateError) {
      console.error('Password update error:', updateError);
      return NextResponse.json(
        { error: `Failed to update password: ${updateError.message}` },
        { status: 500 }
      );
    }

    // Then update email separately
    console.log(`Updating email to: ${internalEmail}`);
    const { error: emailError, data: emailData } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { email: internalEmail }
    );

    console.log(`Email update result:`, { emailError, emailData });

    if (emailError) {
      console.error('Email update error:', emailError);
      // Don't fail the request if email update fails, password is already updated
      console.log('Password updated but email update failed');
    } else {
      console.log(`Email successfully updated to: ${internalEmail}`);
    }

    console.log(`Password successfully updated for user: ${userId}`);

    // Update email in profiles table if needed (keep MGIT email if provided)
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ 
        roll_number: rollNumber.trim().toUpperCase()
      })
      .eq('id', userId);

    if (profileError) {
      console.error('Profile update error:', profileError);
      // Don't fail the request if profile update fails
    }

    return NextResponse.json(
      { message: 'Password reset successful' },
      { status: 200 }
    );

  } catch (error) {
    console.error('Reset password API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
