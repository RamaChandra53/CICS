// Debug Login Issue
// Check the current state of the user account

async function debugLoginIssue() {
  console.log('🔍 Debugging Login Issue\n');

  try {
    // Test login data
    const rollNumber = '25261A0512';
    const password = 'test123456';
    const internalEmail = `${rollNumber}@cics.local`;

    console.log('📋 Login Test Data:');
    console.log(`   Roll Number: ${rollNumber}`);
    console.log(`   Password: ${password}`);
    console.log(`   Internal Email: ${internalEmail}\n`);

    // Step 1: Test direct Supabase auth with internal email
    console.log('🔐 Step 1: Testing Supabase Auth with Internal Email');
    
    try {
      // Create a temporary Supabase client for testing
      const response = await fetch('http://localhost:3000/api/debug-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: internalEmail,
          password: password
        }),
      });

      if (response.status === 404) {
        console.log('   ℹ️  Debug endpoint not found, creating manual test...');
        
        // Manual test using browser console
        console.log('\n🔧 Manual Debug Steps:');
        console.log('1. Open browser console (F12)');
        console.log('2. Run this code in console:');
        console.log(`
const { createClient } = await import('@supabase/supabase-js');
const supabase = createClient('https://ontgzltoartabbnsrijd.supabase.co', 'your-anon-key');
const result = await supabase.auth.signInWithPassword({
  email: '${internalEmail}',
  password: '${password}'
});
console.log('Auth result:', result);
        `);
      } else {
        const result = await response.json();
        console.log('   📦 Auth result:', result);
      }
    } catch (error) {
      console.log('   ❌ Auth test failed:', error.message);
    }

    // Step 2: Check if there are multiple users
    console.log('\n🔍 Step 2: Checking for Multiple Users');
    console.log('   The issue might be that there are multiple user accounts:');
    console.log('   1. Original account with empty email');
    console.log('   2. New account with internal email');
    console.log('   3. The login might be checking the wrong account');

    // Step 3: Suggest fixes
    console.log('\n🔧 Step 3: Potential Fixes');
    console.log('   Option 1: Update the original user account email');
    console.log('   Option 2: Create a new user with proper email');
    console.log('   Option 3: Check the login logic in the frontend');

    console.log('\n📝 Immediate Action:');
    console.log('   1. Try the forgot password flow again with your actual credentials');
    console.log('   2. Check the server logs for detailed error messages');
    console.log('   3. Verify the internal email format matches what login expects');

  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
}

// Run the debug
debugLoginIssue();
