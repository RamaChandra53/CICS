// Simple Password Reset Test
// Tests the API endpoint directly

async function testPasswordResetAPI() {
  console.log('🧪 Testing Password Reset API\n');

  try {
    // Test data
    const testData = {
      userId: 'c5e32121-217b-4c74-ac0e-460ea3a989c5',
      newPassword: 'test123456',
      rollNumber: '25261A0512'
    };

    console.log('📋 Test Data:');
    console.log(`   User ID: ${testData.userId}`);
    console.log(`   Roll Number: ${testData.rollNumber}`);
    console.log(`   New Password: ${testData.newPassword}\n`);

    // Call the API endpoint
    console.log('🔧 Calling API endpoint...');
    const response = await fetch('http://localhost:3000/api/reset-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData),
    });

    console.log(`📡 Response Status: ${response.status}`);
    
    const result = await response.json();
    console.log('📦 Response Data:', JSON.stringify(result, null, 2));

    if (response.ok) {
      console.log('\n✅ API call successful!');
      console.log('\n🔐 Manual Test Instructions:');
      console.log('1. Go to http://localhost:3000');
      console.log('2. Enter roll number: 25261A0512');
      console.log('3. Enter password: test123456');
      console.log('4. Should login successfully');
    } else {
      console.log('\n❌ API call failed!');
      console.log('Error:', result.error);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testPasswordResetAPI();
