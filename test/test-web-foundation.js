#!/usr/bin/env node

/**
 * Test Web Interface Foundation
 * Verifies that the basic web interface foundation is properly set up
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Web Interface Foundation...\n');

// Test 1: Verify required dependencies are installed
console.log('1. Testing dependencies...');
try {
    require('express-session');
    require('helmet');
    require('bcrypt');
    require('express-rate-limit');
    console.log('✅ All required dependencies are available');
} catch (error) {
    console.error('❌ Missing dependencies:', error.message);
    process.exit(1);
}

// Test 2: Verify directory structure
console.log('\n2. Testing directory structure...');
const requiredDirs = [
    'src/routes',
    'src/middleware',
    'src/public/css',
    'src/public/js',
    'src/public/images',
    'src/views'
];

for (const dir of requiredDirs) {
    if (fs.existsSync(dir)) {
        console.log(`✅ Directory exists: ${dir}`);
    } else {
        console.error(`❌ Missing directory: ${dir}`);
        process.exit(1);
    }
}

// Test 3: Verify required files exist
console.log('\n3. Testing required files...');
const requiredFiles = [
    'src/middleware/session-middleware.js',
    'src/routes/auth.js',
    'src/routes/certificates.js',
    'src/public/css/styles.css',
    'src/public/js/login.js',
    'src/public/js/certificates.js',
    'src/views/login.html',
    'src/views/certificates.html'
];

for (const file of requiredFiles) {
    if (fs.existsSync(file)) {
        console.log(`✅ File exists: ${file}`);
    } else {
        console.error(`❌ Missing file: ${file}`);
        process.exit(1);
    }
}

// Test 4: Verify session middleware functionality
console.log('\n4. Testing session middleware...');
try {
    const { createSessionMiddleware } = require('../src/middleware/session-middleware.js');
    const middleware = createSessionMiddleware();
    
    if (typeof middleware === 'function') {
        console.log('✅ Session middleware creates function');
    } else {
        console.error('❌ Session middleware does not return function');
        process.exit(1);
    }
} catch (error) {
    console.error('❌ Session middleware error:', error.message);
    process.exit(1);
}

// Test 5: Verify routes can be loaded
console.log('\n5. Testing route modules...');
try {
    const authRoutes = require('../src/routes/auth.js');
    const certRoutes = require('../src/routes/certificates.js');
    
    if (typeof authRoutes === 'function' && typeof certRoutes === 'function') {
        console.log('✅ Route modules load as Express routers');
    } else {
        console.error('❌ Route modules do not load properly');
        process.exit(1);
    }
} catch (error) {
    console.error('❌ Route loading error:', error.message);
    process.exit(1);
}

// Test 6: Verify package.json has web scripts
console.log('\n6. Testing package.json scripts...');
try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const requiredScripts = ['web:dev', 'web:start', 'test:web'];
    
    for (const script of requiredScripts) {
        if (packageJson.scripts[script]) {
            console.log(`✅ Script exists: ${script}`);
        } else {
            console.error(`❌ Missing script: ${script}`);
            process.exit(1);
        }
    }
} catch (error) {
    console.error('❌ Package.json error:', error.message);
    process.exit(1);
}

console.log('\n🎉 All web interface foundation tests passed!');
console.log('📋 Foundation setup complete:');
console.log('   - Dependencies: express-session, helmet, bcrypt, express-rate-limit');
console.log('   - Directory structure: routes, middleware, public assets, views');
console.log('   - Package.json: Updated with web-related scripts');
console.log('   - Ready for next implementation phase');