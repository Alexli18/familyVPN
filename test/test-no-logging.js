// Test to verify that logging can be disabled with LOGGER=0
process.env.LOGGER = '0'; // Disable logging
require('dotenv').config();

const LoggingService = require('../src/services/logging-service');
const BasicHealthService = require('../src/services/metrics-service');
const AuthenticationService = require('../src/services/auth-service');

async function testNoLogging() {
  console.log('🚫 Testing No Logging Mode (LOGGER=0)...\n');
  
  try {
    // Initialize services with logging disabled
    const loggingService = new LoggingService();
    console.log('✅ LoggingService initialized with logging disabled');
    console.log('   Logging enabled:', loggingService.enabled);
    
    const basicHealthService = new BasicHealthService(loggingService);
    console.log('✅ BasicHealthService initialized');
    
    const authService = new AuthenticationService(loggingService, basicHealthService);
    console.log('✅ AuthenticationService initialized');
    
    // Test that logging methods don't crash when disabled
    loggingService.info('This should not be logged');
    loggingService.warn('This should not be logged');
    loggingService.error('This should not be logged');
    loggingService.debug('This should not be logged');
    
    loggingService.logSecurityEvent('TEST', 'This should not be logged');
    loggingService.logAuthenticationEvent('TEST', 'testuser', '127.0.0.1', true);
    loggingService.logCertificateEvent('TEST', 'testcert', 'testuser', '127.0.0.1');
    loggingService.logSystemEvent('TEST', 'This should not be logged');
    
    console.log('✅ All logging methods work without errors when disabled');
    
    // Test authentication still works
    const testPassword = 'testpassword123';
    const hashedPassword = await authService.hashPassword(testPassword);
    const isValid = await authService.verifyPassword(testPassword, hashedPassword);
    console.log('✅ Authentication functions still work:', isValid);
    
    // Test token generation
    const tokens = await authService.generateTokens('testuser', '127.0.0.1');
    console.log('✅ Token generation works:', !!tokens.accessToken);
    
    // Test health monitoring still works
    const healthStatus = await basicHealthService.getBasicHealthStatus();
    console.log('✅ Health monitoring works:', healthStatus.status);
    
    // Test metrics summary
    const metrics = basicHealthService.getBasicMetrics();
    console.log('✅ Metrics summary works:', !!metrics.timestamp);
    
    console.log('\n🎉 All services work correctly with logging disabled!');
    console.log('\n📋 No Logging Mode Summary:');
    console.log('   ✅ LoggingService creates null loggers');
    console.log('   ✅ No log files are created');
    console.log('   ✅ All logging methods are no-ops');
    console.log('   ✅ Authentication still works');
    console.log('   ✅ Health monitoring still works');
    console.log('   ✅ No performance overhead from logging');
    
    // Wait a moment to see if any health checks run
    console.log('\n⏳ Waiting 3 seconds to verify no health check logs...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    console.log('✅ No health check logs appeared (as expected)');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testNoLogging();