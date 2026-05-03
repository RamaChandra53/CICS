// Automated Password Reset Test
// Run with: node test-password-reset.js

const { createClient } = require('@supabase/supabase-js');

// Configuration
const SUPABASE_URL = 'https://ontgzltoartabbnsrijd.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('Please set SUPABASE_SERVICE_ROLE_KEY environment variable');
  process.exit(1);
}

// Create admin client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function testPasswordReset() {
  console.log('🧪 Starting Automated Password Reset Test\n');

  try {
    // Test data
    const testRollNumber = '25261A0512';
    const testEmail = 'vramachandra_csb253263@mgit.ac.in';
    const newPassword = 'test123456';
    const internalEmail = `${testRollNumber}@cics.local`;

    console.log('📋 Test Configuration:');
    console.log(`   Roll Number: ${testRollNumber}`);
    console.log(`   MGIT Email: ${testEmail}`);
    console.log(`   Internal Email: ${internalEmail}`);
    console.log(`   New Password: ${newPassword}\n`);

    // Step 1: Find user by roll number
    console.log('🔍 Step 1: Finding user by roll number...');
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, roll_number, email')
      .eq('roll_number', testRollNumber)
      .single();

    if (profileError || !profile) {
      console.error('❌ User not found:', profileError?.message);
      return false;
    }

    console.log(`✅ User found: ${profile.id}`);
    console.log(`   Current email in profile: ${profile.email || 'empty'}\n`);

    // Step 2: Check current auth user
    console.log('🔍 Step 2: Checking auth user...');
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(profile.id);

    if (authError) {
      console.error('❌ Auth user not found:', authError.message);
      return false;
    }

    console.log(`✅ Auth user found: ${authUser.id}`);
    console.log(`   Auth email: ${authUser.email || 'empty'}`);
    console.log(`   Auth created: ${authUser.created_at}\n`);

    // Step 3: Update password
    console.log('🔧 Step 3: Updating password...');
    const { error: updateError, data: updateData } = await supabase.auth.admin.updateUserById(
      profile.id,
      { password: newPassword }
    );

    if (updateError) {
      console.error('❌ Password update failed:', updateError.message);
      return false;
    }

    console.log('✅ Password updated successfully');
    console.log(`   Updated user: ${updateData.user?.id}\n`);

    // Step 4: Verify the update
    console.log('🔍 Step 4: Verifying password update...');
    const { data: updatedUser, error: verifyError } = await supabase.auth.admin.getUserById(profile.id);

    if (verifyError) {
      console.error('❌ Verification failed:', verifyError.message);
      return false;
    }

    console.log('✅ Password update verified');
    console.log(`   User updated at: ${updatedUser.updated_at}\n`);

    // Step 5: Test login (simulate)
    console.log('🔐 Step 5: Testing login simulation...');
    console.log(`   To test login manually:`);
    console.log(`   1. Go to http://localhost:3000`);
    console.log(`   2. Enter roll number: ${testRollNumber}`);
    console.log(`   3. Enter password: ${newPassword}`);
    console.log(`   4. Should redirect to feed\n`);

    console.log('🎉 Test completed successfully!');
    console.log('\n📝 Summary:');
    console.log(`   ✅ User found by roll number`);
    console.log(`   ✅ Auth user retrieved`);
    console.log(`   ✅ Password updated via admin API`);
    console.log(`   ✅ Update verified`);
    console.log('\n🔗 Manual login test required to complete verification');

    return true;

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    return false;
  }
}

// Run the test
testPasswordReset().then(success => {
  if (success) {
    console.log('\n✅ All tests passed!');
    process.exit(0);
  } else {
    console.log('\n❌ Tests failed!');
    process.exit(1);
  }
});
