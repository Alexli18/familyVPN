const path = require('path');
const fs = require('fs').promises;

async function testEnhancedCertificateManager() {
    console.log('🧪 Testing Simplified Certificate Manager...\n');
    
    // Set up test environment with local directories
    const testDir = path.join(process.cwd(), 'test-certificates');
    process.env.VPN_CERT_DIR = testDir;
    process.env.VPN_CONFIG_DIR = testDir;
    
    // Clear require cache to reload config with new environment variables
    delete require.cache[require.resolve('../src/config')];
    delete require.cache[require.resolve('../src/utils/enhanced-certificate-manager')];
    delete require.cache[require.resolve('../src/services/logging-service')];
    
    // Now require the modules after setting environment variables
    const SimplifiedCertificateManager = require('../src/utils/enhanced-certificate-manager');
    const LoggingService = require('../src/services/logging-service');
    
    try {
        // Initialize logging service
        const loggingService = new LoggingService();
        const logger = loggingService.getLogger();
        
        // Initialize simplified certificate manager
        const certManager = new SimplifiedCertificateManager(logger, loggingService);
        
        console.log('✅ Simplified Certificate Manager initialized successfully');
        
        // Test 1: PKI Initialization
        console.log('\n📋 Test 1: PKI Initialization');
        try {
            await certManager.initializePKI();
            console.log('✅ PKI initialization completed');
        } catch (error) {
            console.log(`❌ PKI initialization failed: ${error.message}`);
        }
        
        // Test 2: Certificate Validation
        console.log('\n📋 Test 2: Certificate Validation');
        try {
            const caPath = path.join(process.cwd(), 'easy-rsa', 'pki', 'ca.crt');
            const isValid = await certManager.validateCertificate(caPath);
            console.log(`✅ CA certificate validation: ${isValid ? 'VALID' : 'INVALID'}`);
        } catch (error) {
            console.log(`❌ Certificate validation failed: ${error.message}`);
        }
        
        // Test 3: CRL Generation
        console.log('\n📋 Test 3: CRL Generation');
        try {
            const crlPath = await certManager.generateCRL();
            console.log(`✅ CRL generated successfully: ${crlPath}`);
        } catch (error) {
            console.log(`❌ CRL generation failed: ${error.message}`);
        }
        
        // Test 4: TLS Auth Key Generation
        console.log('\n📋 Test 4: TLS Auth Key Generation');
        try {
            const taKeyPath = await certManager.generateTLSAuthKey();
            console.log(`✅ TLS auth key generated successfully: ${taKeyPath}`);
        } catch (error) {
            console.log(`❌ TLS auth key generation failed: ${error.message}`);
        }
        
        // Test 5: Client Certificate Generation
        console.log('\n📋 Test 5: Client Certificate Generation');
        try {
            await certManager.generateClientCertificate('test-client');
            console.log('✅ Client certificate generated successfully');
        } catch (error) {
            console.log(`❌ Client certificate generation failed: ${error.message}`);
        }
        
        console.log('\n🎉 Simplified Certificate Manager tests completed!');
        
    } catch (error) {
        console.error(`❌ Test suite failed: ${error.message}`);
        process.exit(1);
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    testEnhancedCertificateManager().catch(error => {
        console.error('Test execution failed:', error);
        process.exit(1);
    });
}

module.exports = testEnhancedCertificateManager;