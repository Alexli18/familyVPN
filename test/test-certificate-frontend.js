/**
 * Comprehensive Frontend Test Suite
 * Tests both login and certificate management frontend components
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Frontend Components (Login + Certificates)\n');

/**
 * Test HTML structure
 */
function testHTMLStructure() {
    console.log('📋 Test 1: HTML Structure Validation');
    
    try {
        const htmlPath = path.join(__dirname, '../src/views/certificates.html');
        const htmlContent = fs.readFileSync(htmlPath, 'utf8');
        
        // Check for required elements (by ID)
        const requiredElementIds = [
            'certificateForm',
            'clientName',
            'generateBtn',
            'certificateTable',
            'notificationContainer',
            'modalOverlay'
        ];
        
        // Check for required elements (by class)
        const requiredElementClasses = [
            'certificates-container'
        ];
        
        let missingElements = [];
        
        requiredElementIds.forEach(elementId => {
            if (!htmlContent.includes(`id="${elementId}"`)) {
                missingElements.push(`id="${elementId}"`);
            }
        });
        
        requiredElementClasses.forEach(elementClass => {
            if (!htmlContent.includes(`class="${elementClass}"`) && 
                !htmlContent.includes(`class=".*${elementClass}.*"`)) {
                // Check if class exists in any form
                if (!htmlContent.includes(elementClass)) {
                    missingElements.push(`class="${elementClass}"`);
                }
            }
        });
        
        if (missingElements.length > 0) {
            throw new Error(`Missing required elements: ${missingElements.join(', ')}`);
        }
        
        // Check for required CSS classes
        const requiredClasses = [
            'certificates-page',
            'certificate-form',
            'cert-status',
            'cert-actions',
            'notification'
        ];
        
        let missingClasses = [];
        
        requiredClasses.forEach(className => {
            if (!htmlContent.includes(`class="${className}"`) && 
                !htmlContent.includes(`class=".*${className}.*"`)) {
                // Check if class exists in any form
                if (!htmlContent.includes(className)) {
                    missingClasses.push(className);
                }
            }
        });
        
        if (missingClasses.length > 0) {
            console.log(`   ⚠️  Some CSS classes may be missing: ${missingClasses.join(', ')}`);
        }
        
        // Check for JavaScript inclusion
        if (!htmlContent.includes('/js/certificates.js')) {
            throw new Error('JavaScript file not included');
        }
        
        // Check for CSS inclusion
        if (!htmlContent.includes('/css/styles.css')) {
            throw new Error('CSS file not included');
        }
        
        console.log('  ✅ HTML structure validation successful');
        return true;
        
    } catch (error) {
        console.log(`  ❌ HTML structure validation failed: ${error.message}`);
        return false;
    }
}

/**
 * Test CSS file exists and has required styles
 */
function testCSSStructure() {
    console.log('📋 Test 2: CSS Structure Validation');
    
    try {
        const cssPath = path.join(__dirname, '../src/public/css/styles.css');
        const cssContent = fs.readFileSync(cssPath, 'utf8');
        
        // Check for certificate-specific styles
        const requiredStyles = [
            '.certificates-page',
            '.certificate-form',
            '.certificate-table',
            '.cert-status',
            '.cert-actions',
            '.notification',
            '.modal-overlay',
            '.loading-spinner'
        ];
        
        let missingStyles = [];
        
        requiredStyles.forEach(style => {
            if (!cssContent.includes(style)) {
                missingStyles.push(style);
            }
        });
        
        if (missingStyles.length > 0) {
            throw new Error(`Missing required CSS styles: ${missingStyles.join(', ')}`);
        }
        
        // Check for responsive design
        if (!cssContent.includes('@media')) {
            console.log('   ⚠️  No responsive design media queries found');
        }
        
        console.log('  ✅ CSS structure validation successful');
        return true;
        
    } catch (error) {
        console.log(`  ❌ CSS structure validation failed: ${error.message}`);
        return false;
    }
}

/**
 * Test JavaScript file structure
 */
function testJavaScriptStructure() {
    console.log('📋 Test 3: JavaScript Structure Validation');
    
    try {
        const jsPath = path.join(__dirname, '../src/public/js/certificates.js');
        const jsContent = fs.readFileSync(jsPath, 'utf8');
        
        // Check for required classes and functions
        const requiredComponents = [
            'class CertificateManager',
            'validateClientName',
            'handleCertificateGeneration',
            'loadCertificates',
            'renderCertificateList',
            'showNotification',
            'escapeHtml'
        ];
        
        let missingComponents = [];
        
        requiredComponents.forEach(component => {
            if (!jsContent.includes(component)) {
                missingComponents.push(component);
            }
        });
        
        if (missingComponents.length > 0) {
            throw new Error(`Missing required JavaScript components: ${missingComponents.join(', ')}`);
        }
        
        // Check for security measures
        if (!jsContent.includes('escapeHtml')) {
            console.log('   ⚠️  XSS protection (escapeHtml) not found');
        }
        
        // Check for error handling
        if (!jsContent.includes('try') || !jsContent.includes('catch')) {
            console.log('   ⚠️  Error handling (try/catch) not found');
        }
        
        console.log('  ✅ JavaScript structure validation successful');
        return true;
        
    } catch (error) {
        console.log(`  ❌ JavaScript structure validation failed: ${error.message}`);
        return false;
    }
}

/**
 * Test form validation logic
 */
function testFormValidation() {
    console.log('📋 Test 4: Form Validation Logic');
    
    try {
        const jsPath = path.join(__dirname, '../src/public/js/certificates.js');
        const jsContent = fs.readFileSync(jsPath, 'utf8');
        
        // Check for client name validation regex
        if (!jsContent.includes('/^[a-zA-Z0-9_-]{3,50}$/')) {
            throw new Error('Client name validation regex not found');
        }
        
        // Check for real-time validation
        if (!jsContent.includes('addEventListener(\'input\'')) {
            throw new Error('Real-time input validation not found');
        }
        
        // Check for form submission handling
        if (!jsContent.includes('addEventListener(\'submit\'')) {
            throw new Error('Form submission handling not found');
        }
        
        console.log('  ✅ Form validation logic successful');
        return true;
        
    } catch (error) {
        console.log(`  ❌ Form validation logic failed: ${error.message}`);
        return false;
    }
}

/**
 * Test API integration
 */
function testAPIIntegration() {
    console.log('📋 Test 5: API Integration');
    
    try {
        const jsPath = path.join(__dirname, '../src/public/js/certificates.js');
        const jsContent = fs.readFileSync(jsPath, 'utf8');
        
        // Check for required API endpoints
        const requiredEndpoints = [
            '/certificates/generate',
            '/certificates/list',
            '/certificates/download/',
            '/certificates/revoke/',
            '/logout'
        ];
        
        let missingEndpoints = [];
        
        requiredEndpoints.forEach(endpoint => {
            if (!jsContent.includes(endpoint)) {
                missingEndpoints.push(endpoint);
            }
        });
        
        if (missingEndpoints.length > 0) {
            throw new Error(`Missing API endpoints: ${missingEndpoints.join(', ')}`);
        }
        
        // Check for fetch usage
        if (!jsContent.includes('fetch(')) {
            throw new Error('Fetch API usage not found');
        }
        
        // Check for proper HTTP methods
        if (!jsContent.includes('method: \'POST\'')) {
            throw new Error('POST method usage not found');
        }
        
        console.log('  ✅ API integration successful');
        return true;
        
    } catch (error) {
        console.log(`  ❌ API integration failed: ${error.message}`);
        return false;
    }
}

/**
 * Test accessibility features
 */
function testAccessibility() {
    console.log('📋 Test 6: Accessibility Features');
    
    try {
        const htmlPath = path.join(__dirname, '../src/views/certificates.html');
        const htmlContent = fs.readFileSync(htmlPath, 'utf8');
        
        // Check for ARIA attributes
        const ariaAttributes = [
            'aria-describedby',
            'role="alert"',
            'aria-label'
        ];
        
        let foundAria = 0;
        ariaAttributes.forEach(attr => {
            if (htmlContent.includes(attr)) {
                foundAria++;
            }
        });
        
        if (foundAria === 0) {
            console.log('   ⚠️  No ARIA attributes found for accessibility');
        }
        
        // Check for semantic HTML
        const semanticElements = ['<main>', '<section>', '<header>'];
        let foundSemantic = 0;
        
        semanticElements.forEach(element => {
            if (htmlContent.includes(element)) {
                foundSemantic++;
            }
        });
        
        if (foundSemantic === 0) {
            console.log('   ⚠️  No semantic HTML elements found');
        }
        
        // Check for form labels
        if (!htmlContent.includes('<label')) {
            throw new Error('Form labels not found');
        }
        
        console.log('  ✅ Accessibility features validation successful');
        return true;
        
    } catch (error) {
        console.log(`  ❌ Accessibility validation failed: ${error.message}`);
        return false;
    }
}

/**
 * Test login page structure
 */
function testLoginPageStructure() {
    console.log('📋 Test 7: Login Page Structure');
    
    try {
        const htmlPath = path.join(__dirname, '../src/views/login.html');
        const htmlContent = fs.readFileSync(htmlPath, 'utf8');
        
        // Check for required login elements
        const requiredElements = [
            '<form id="loginForm"',
            'id="username"',
            'id="password"',
            'type="submit"',
            'class="login-container"',
            'autocomplete="username"',
            'autocomplete="current-password"'
        ];
        
        let missingElements = [];
        
        requiredElements.forEach(element => {
            if (!htmlContent.includes(element)) {
                missingElements.push(element);
            }
        });
        
        if (missingElements.length > 0) {
            throw new Error(`Missing login elements: ${missingElements.join(', ')}`);
        }
        
        console.log('  ✅ Login page structure validation successful');
        return true;
        
    } catch (error) {
        console.log(`  ❌ Login page structure validation failed: ${error.message}`);
        return false;
    }
}

/**
 * Test login JavaScript functionality
 */
function testLoginJavaScript() {
    console.log('📋 Test 8: Login JavaScript Functionality');
    
    try {
        const jsPath = path.join(__dirname, '../src/public/js/login.js');
        const jsContent = fs.readFileSync(jsPath, 'utf8');
        
        // Check for required login JS features
        const jsFeatures = [
            'class LoginForm',
            'validateUsername',
            'validatePassword',
            'handleSubmit',
            'setLoadingState',
            'showFormMessage'
        ];
        
        let missingFeatures = [];
        
        jsFeatures.forEach(feature => {
            if (!jsContent.includes(feature)) {
                missingFeatures.push(feature);
            }
        });
        
        if (missingFeatures.length > 0) {
            throw new Error(`Missing login JS features: ${missingFeatures.join(', ')}`);
        }
        
        console.log('  ✅ Login JavaScript validation successful');
        return true;
        
    } catch (error) {
        console.log(`  ❌ Login JavaScript validation failed: ${error.message}`);
        return false;
    }
}

/**
 * Run all tests
 */
function runTests() {
    const tests = [
        testHTMLStructure,
        testCSSStructure,
        testJavaScriptStructure,
        testFormValidation,
        testAPIIntegration,
        testAccessibility,
        testLoginPageStructure,
        testLoginJavaScript
    ];
    
    let passed = 0;
    let failed = 0;
    
    tests.forEach(test => {
        try {
            if (test()) {
                passed++;
            } else {
                failed++;
            }
        } catch (error) {
            console.log(`  ❌ Test failed with error: ${error.message}`);
            failed++;
        }
        console.log('');
    });
    
    console.log('📊 Frontend Test Results Summary');
    console.log('=================================');
    console.log(`Total Tests: ${tests.length}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Success Rate: ${((passed / tests.length) * 100).toFixed(1)}%`);
    console.log('');
    
    if (failed === 0) {
        console.log('🎉 All frontend tests passed!');
        return true;
    } else {
        console.log('⚠️  Some frontend tests failed. Review the results above.');
        return false;
    }
}

// Run the tests
const success = runTests();
process.exit(success ? 0 : 1);