const assert = require('assert');
const path = require('path');
const fs = require('fs').promises;

// Import modules to test
const WebAuthRoutes = require('../src/routes/auth');
const PasswordUtils = require('../src/utils/password-utils');
const UserConfigManager = require('../src/utils/user-config');
const { createSessionMiddleware } = require('../src/middleware/session-middleware');

// Mock logger
const mockLogger = {
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {}
};

// Mock logging service
const mockLoggingService = {
    logAuthenticationEvent: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {}
};

// Mock health service
const mockHealthService = {
    recordAuthAttempt: () => {},
    recordHttpRequest: () => {}
};

/**
 * Test suite for web authentication system
 */
async function runWebAuthTests() {
    console.log('🧪 Running Web Authentication Tests...\n');

    let testsPassed = 0;
    let testsFailed = 0;
    let testResults = [];

    // Helper function to run individual tests
    async function runTest(testName, testFunction) {
        try {
            console.log(`  ▶️  ${testName}`);
            await testFunction();
            console.log(`  ✅ ${testName} - PASSED`);
            testsPassed++;
            testResults.push({ name: testName, status: 'PASSED' });
        } catch (error) {
            console.log(`  ❌ ${testName} - FAILED: ${error.message}`);
            testsFailed++;
            testResults.push({ name: testName, status: 'FAILED', error: error.message });
        }
    }

    // Test 1: Password Utils - Hash and Verify
    await runTest('Password Utils - Hash and Verify', async () => {
        const passwordUtils = new PasswordUtils();
        const password = 'TestPassword123!';
        
        // Test hashing
        const hash = await passwordUtils.hashPassword(password);
        assert(hash, 'Password hash should be generated');
        assert(hash !== password, 'Hash should be different from original password');
        
        // Test verification
        const isValid = await passwordUtils.verifyPassword(password, hash);
        assert(isValid === true, 'Password verification should succeed');
        
        const isInvalid = await passwordUtils.verifyPassword('WrongPassword', hash);
        assert(isInvalid === false, 'Wrong password verification should fail');
    });

    // Test 2: Password Utils - Strength Validation
    await runTest('Password Utils - Strength Validation', async () => {
        const passwordUtils = new PasswordUtils();
        
        // Test weak password
        const weakResult = passwordUtils.validatePasswordStrength('123');
        assert(weakResult.isValid === false, 'Weak password should be invalid');
        assert(weakResult.feedback.length > 0, 'Weak password should have feedback');
        
        // Test strong password
        const strongResult = passwordUtils.validatePasswordStrength('StrongPassword123!');
        assert(strongResult.isValid === true, 'Strong password should be valid');
        assert(strongResult.score >= 3, 'Strong password should have good score');
    });

    // Test 3: Password Utils - Generate Secure Password
    await runTest('Password Utils - Generate Secure Password', async () => {
        const passwordUtils = new PasswordUtils();
        
        const password = passwordUtils.generateSecurePassword(16);
        assert(password.length === 16, 'Generated password should have correct length');
        
        const validation = passwordUtils.validatePasswordStrength(password);
        assert(validation.isValid === true, 'Generated password should be valid');
    });

    // Test 4: User Config Manager - Initialization
    await runTest('User Config Manager - Initialization', async () => {
        const tempDir = path.join(__dirname, 'temp-config');
        const userConfig = new UserConfigManager(mockLogger, tempDir);
        
        await userConfig.initialize();
        
        // Check if config file was created
        const configFile = path.join(tempDir, 'web-users.json');
        const stats = await fs.stat(configFile);
        assert(stats.isFile(), 'Config file should be created');
        
        // Cleanup
        await fs.rm(tempDir, { recursive: true, force: true });
    });

    // Test 5: User Config Manager - Create Admin User
    await runTest('User Config Manager - Create Admin User', async () => {
        const tempDir = path.join(__dirname, 'temp-config-admin');
        const userConfig = new UserConfigManager(mockLogger, tempDir);
        
        await userConfig.initialize();
        
        const result = await userConfig.createAdminUser('testadmin', 'TestPassword123!');
        assert(result.success === true, 'Admin user creation should succeed');
        assert(result.username === 'testadmin', 'Username should match');
        
        // Test duplicate user creation
        try {
            await userConfig.createAdminUser('testadmin', 'AnotherPassword123!');
            assert(false, 'Duplicate user creation should fail');
        } catch (error) {
            assert(error.message.includes('already exists'), 'Should get duplicate user error');
        }
        
        // Cleanup
        await fs.rm(tempDir, { recursive: true, force: true });
    });

    // Test 6: User Config Manager - Authentication
    await runTest('User Config Manager - Authentication', async () => {
        const tempDir = path.join(__dirname, 'temp-config-auth');
        const userConfig = new UserConfigManager(mockLogger, tempDir);
        
        await userConfig.initialize();
        await userConfig.createAdminUser('testuser', 'TestPassword123!');
        
        // Test successful authentication
        const authResult = await userConfig.authenticateUser('testuser', 'TestPassword123!');
        assert(authResult.success === true, 'Authentication should succeed');
        assert(authResult.user.username === 'testuser', 'Username should match');
        
        // Test failed authentication
        try {
            await userConfig.authenticateUser('testuser', 'WrongPassword');
            assert(false, 'Wrong password authentication should fail');
        } catch (error) {
            assert(error.message.includes('Invalid credentials'), 'Should get invalid credentials error');
        }
        
        // Cleanup
        await fs.rm(tempDir, { recursive: true, force: true });
    });

    // Test 7: Web Auth Routes - Setup
    await runTest('Web Auth Routes - Setup', async () => {
        const authRoutes = new WebAuthRoutes(mockLogger, mockLoggingService, mockHealthService);
        const router = authRoutes.getRouter();
        
        assert(router, 'Router should be created');
        assert(typeof router === 'function', 'Router should be a function');
    });

    // Test 8: Web Auth Routes - Failed Attempt Tracking
    await runTest('Web Auth Routes - Failed Attempt Tracking', async () => {
        const authRoutes = new WebAuthRoutes(mockLogger, mockLoggingService, mockHealthService);
        
        const username = 'testuser';
        const clientIP = '127.0.0.1';
        
        // Initially not locked
        assert(authRoutes.isAccountLocked(username, clientIP) === false, 'Account should not be locked initially');
        
        // Record failed attempts
        for (let i = 0; i < 5; i++) {
            authRoutes.recordFailedAttempt(username, clientIP);
        }
        
        // Should be locked now
        assert(authRoutes.isAccountLocked(username, clientIP) === true, 'Account should be locked after max attempts');
        
        // Clear attempts
        authRoutes.clearFailedAttempts(username, clientIP);
        assert(authRoutes.isAccountLocked(username, clientIP) === false, 'Account should not be locked after clearing attempts');
    });

    // Test 9: Environment Variable Authentication
    await runTest('Environment Variable Authentication', async () => {
        // Set up test environment variables
        const originalUsername = process.env.WEB_ADMIN_USERNAME;
        const originalPasswordHash = process.env.WEB_ADMIN_PASSWORD_HASH;
        
        process.env.WEB_ADMIN_USERNAME = 'testadmin';
        process.env.WEB_ADMIN_PASSWORD_HASH = await PasswordUtils.createHash('TestPassword123!');
        
        const authRoutes = new WebAuthRoutes(mockLogger, mockLoggingService, mockHealthService);
        
        // Test password verification with environment variables
        const isValid = await authRoutes.verifyPassword('TestPassword123!', process.env.WEB_ADMIN_PASSWORD_HASH);
        assert(isValid === true, 'Password verification should succeed with environment hash');
        
        const isInvalid = await authRoutes.verifyPassword('WrongPassword', process.env.WEB_ADMIN_PASSWORD_HASH);
        assert(isInvalid === false, 'Wrong password verification should fail');
        
        // Restore original environment variables
        if (originalUsername) {
            process.env.WEB_ADMIN_USERNAME = originalUsername;
        } else {
            delete process.env.WEB_ADMIN_USERNAME;
        }
        
        if (originalPasswordHash) {
            process.env.WEB_ADMIN_PASSWORD_HASH = originalPasswordHash;
        } else {
            delete process.env.WEB_ADMIN_PASSWORD_HASH;
        }
    });

    // Test 10: Password Utils - Edge Cases
    await runTest('Password Utils - Edge Cases', async () => {
        const passwordUtils = new PasswordUtils();
        
        // Test empty password
        try {
            await passwordUtils.hashPassword('');
            assert(false, 'Empty password should throw error');
        } catch (error) {
            assert(error.message.includes('non-empty string'), 'Should get non-empty string error');
        }
        
        // Test null password
        try {
            await passwordUtils.hashPassword(null);
            assert(false, 'Null password should throw error');
        } catch (error) {
            assert(error.message.includes('non-empty string'), 'Should get non-empty string error');
        }
        
        // Test short password
        try {
            await passwordUtils.hashPassword('123');
            assert(false, 'Short password should throw error');
        } catch (error) {
            assert(error.message.includes('at least'), 'Should get minimum length error');
        }
        
        // Test verify with invalid inputs
        const result1 = await passwordUtils.verifyPassword(null, 'hash');
        assert(result1 === false, 'Null password verification should return false');
        
        const result2 = await passwordUtils.verifyPassword('password', null);
        assert(result2 === false, 'Null hash verification should return false');
    });

    // Print test summary
    console.log('\n📊 Test Summary:');
    console.log(`✅ Passed: ${testsPassed}`);
    console.log(`❌ Failed: ${testsFailed}`);
    console.log(`📈 Success Rate: ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1)}%`);

    if (testsFailed > 0) {
        console.log('\n❌ Failed Tests:');
        testResults
            .filter(result => result.status === 'FAILED')
            .forEach(result => {
                console.log(`  - ${result.name}: ${result.error}`);
            });
    }

    console.log('\n🏁 Web Authentication Tests Complete!\n');

    return {
        passed: testsPassed,
        failed: testsFailed,
        total: testsPassed + testsFailed,
        results: testResults
    };
}

// Run tests if this file is executed directly
if (require.main === module) {
    runWebAuthTests().catch(error => {
        console.error('Test execution failed:', error);
        process.exit(1);
    });
}

module.exports = runWebAuthTests;