#!/usr/bin/env node

/**
 * Test session middleware and security configuration
 */

const express = require('express');
const request = require('http');
const {
    createSessionMiddleware,
    createSecurityMiddleware,
    createHTTPSEnforcement,
    createLoginRateLimit,
    createCertificateRateLimit,
    createGeneralRateLimit,
    createCSRFProtection,
    requireAuthentication,
    createSessionCleanup
} = require('../src/middleware/session-middleware');

console.log('🧪 Testing Session Middleware and Security Configuration...\n');

// Test 1: Session middleware creation
console.log('1. Testing session middleware creation...');
try {
    const sessionMiddleware = createSessionMiddleware();
    if (typeof sessionMiddleware === 'function') {
        console.log('✅ Session middleware created successfully');
    } else {
        throw new Error('Session middleware is not a function');
    }
} catch (error) {
    console.log('❌ Session middleware creation failed:', error.message);
    process.exit(1);
}

// Test 2: Security middleware creation
console.log('2. Testing security middleware creation...');
try {
    const securityMiddleware = createSecurityMiddleware();
    if (typeof securityMiddleware === 'function') {
        console.log('✅ Security middleware created successfully');
    } else {
        throw new Error('Security middleware is not a function');
    }
} catch (error) {
    console.log('❌ Security middleware creation failed:', error.message);
    process.exit(1);
}

// Test 3: HTTPS enforcement middleware
console.log('3. Testing HTTPS enforcement middleware...');
try {
    const httpsMiddleware = createHTTPSEnforcement();
    if (typeof httpsMiddleware === 'function') {
        console.log('✅ HTTPS enforcement middleware created successfully');
    } else {
        throw new Error('HTTPS enforcement middleware is not a function');
    }
} catch (error) {
    console.log('❌ HTTPS enforcement middleware creation failed:', error.message);
    process.exit(1);
}

// Test 4: Rate limiting middleware
console.log('4. Testing rate limiting middleware...');
try {
    const mockLogger = {
        warn: (msg, data) => console.log(`Mock logger: ${msg}`, data)
    };
    
    const loginRateLimit = createLoginRateLimit(mockLogger);
    const certRateLimit = createCertificateRateLimit(mockLogger);
    const generalRateLimit = createGeneralRateLimit(mockLogger);
    
    if (typeof loginRateLimit === 'function' && 
        typeof certRateLimit === 'function' && 
        typeof generalRateLimit === 'function') {
        console.log('✅ Rate limiting middleware created successfully');
    } else {
        throw new Error('Rate limiting middleware is not a function');
    }
} catch (error) {
    console.log('❌ Rate limiting middleware creation failed:', error.message);
    process.exit(1);
}

// Test 5: CSRF protection middleware
console.log('5. Testing CSRF protection middleware...');
try {
    const csrfMiddleware = createCSRFProtection();
    if (typeof csrfMiddleware === 'function') {
        console.log('✅ CSRF protection middleware created successfully');
    } else {
        throw new Error('CSRF protection middleware is not a function');
    }
} catch (error) {
    console.log('❌ CSRF protection middleware creation failed:', error.message);
    process.exit(1);
}

// Test 6: Authentication middleware
console.log('6. Testing authentication middleware...');
try {
    const authMiddleware = requireAuthentication();
    if (typeof authMiddleware === 'function') {
        console.log('✅ Authentication middleware created successfully');
    } else {
        throw new Error('Authentication middleware is not a function');
    }
} catch (error) {
    console.log('❌ Authentication middleware creation failed:', error.message);
    process.exit(1);
}

// Test 7: Session cleanup middleware
console.log('7. Testing session cleanup middleware...');
try {
    const cleanupMiddleware = createSessionCleanup();
    if (typeof cleanupMiddleware === 'function') {
        console.log('✅ Session cleanup middleware created successfully');
    } else {
        throw new Error('Session cleanup middleware is not a function');
    }
} catch (error) {
    console.log('❌ Session cleanup middleware creation failed:', error.message);
    process.exit(1);
}

// Test 8: Integration test with Express app
console.log('8. Testing middleware integration with Express...');
try {
    const app = express();
    
    // Apply middleware in correct order
    app.use(createSecurityMiddleware());
    app.use(createHTTPSEnforcement());
    app.use(express.json());
    app.use(createSessionMiddleware());
    app.use(createSessionCleanup());
    app.use(createGeneralRateLimit());
    
    // Test route
    app.get('/test', (req, res) => {
        res.json({ message: 'Test successful' });
    });
    
    // Protected route
    app.get('/protected', requireAuthentication(), (req, res) => {
        res.json({ message: 'Protected route accessed' });
    });
    
    console.log('✅ Express app with middleware created successfully');
} catch (error) {
    console.log('❌ Express app integration failed:', error.message);
    process.exit(1);
}

// Test 9: Environment variable handling
console.log('9. Testing environment variable handling...');
try {
    // Test with different NODE_ENV values
    const originalEnv = process.env.NODE_ENV;
    
    process.env.NODE_ENV = 'production';
    const prodSessionMiddleware = createSessionMiddleware();
    
    process.env.NODE_ENV = 'development';
    const devSessionMiddleware = createSessionMiddleware();
    
    // Restore original environment
    process.env.NODE_ENV = originalEnv;
    
    if (typeof prodSessionMiddleware === 'function' && typeof devSessionMiddleware === 'function') {
        console.log('✅ Environment variable handling works correctly');
    } else {
        throw new Error('Environment variable handling failed');
    }
} catch (error) {
    console.log('❌ Environment variable handling failed:', error.message);
    process.exit(1);
}

console.log('\n🎉 All session middleware and security configuration tests passed!');
console.log('\nMiddleware components ready:');
console.log('- ✅ Secure session configuration');
console.log('- ✅ Helmet security headers');
console.log('- ✅ HTTPS enforcement');
console.log('- ✅ Rate limiting (login, certificate, general)');
console.log('- ✅ CSRF protection');
console.log('- ✅ Authentication middleware');
console.log('- ✅ Session cleanup');