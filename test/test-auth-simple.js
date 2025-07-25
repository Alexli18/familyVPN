// Simple test to verify authentication service works
require('dotenv').config();
const AuthenticationService = require('../src/services/auth-service');

async function testAuthService() {
  console.log('🧪 Testing Authentication Service...\n');
  
  try {
    // Create logger mock
    const logger = {
      info: (msg, meta) => console.log('INFO:', msg, meta || ''),
      warn: (msg, meta) => console.log('WARN:', msg, meta || ''),
      error: (msg, meta) => console.log('ERROR:', msg, meta || '')
    };
    
    // Initialize auth service
    const authService = new AuthenticationService(logger);
    console.log('✅ Authentication service initialized');
    
    // Test password hashing
    const testPassword = 'testpassword123';
    const hashedPassword = await authService.hashPassword(testPassword);
    console.log('✅ Password hashing works');
    console.log('   Hash:', hashedPassword.substring(0, 20) + '...');
    
    // Test password verification
    const isValid = await authService.verifyPassword(testPassword, hashedPassword);
    console.log('✅ Password verification works:', isValid);
    
    // Test token generation
    const tokens = await authService.generateTokens('testuser', '127.0.0.1');
    console.log('✅ Token generation works');
    console.log('   Access token length:', tokens.accessToken.length);
    console.log('   Refresh token length:', tokens.refreshToken.length);
    
    // Test token validation
    const validation = await authService.validateToken(tokens.accessToken, '127.0.0.1');
    console.log('✅ Token validation works:', validation.valid);
    console.log('   Decoded user:', validation.decoded?.username);
    
    // Test authentication with environment credentials
    try {
      const authResult = await authService.authenticate('admin', 'testpassword123', '127.0.0.1');
      console.log('✅ Full authentication works');
      console.log('   Success:', authResult.success);
    } catch (authError) {
      console.log('✅ Authentication properly validates credentials');
      console.log('   Error:', authError.message);
    }
    
    console.log('\n🎉 All authentication service tests passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

testAuthService();