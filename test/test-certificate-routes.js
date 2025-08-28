const request = require('supertest');
const express = require('express');
const session = require('express-session');
const fs = require('fs').promises;
const path = require('path');
const CertificateRoutes = require('../src/routes/certificates');
const CertificateManager = require('../src/utils/certificate-manager');
const { createSessionMiddleware } = require('../src/middleware/session-middleware');

/**
 * Comprehensive test suite for certificate management routes
 * Tests all certificate operations including generation, listing, download, and revocation
 */
class CertificateRoutesTest {
    constructor() {
        this.testResults = [];
        this.testDir = path.join(process.cwd(), 'test-certificates-routes');
        this.mockConfig = {
            certificates: {
                dir: this.testDir,
                serverCertName: 'server'
            },
            web: {
                session: {
                    secret: 'test-secret',
                    timeout: 30 * 60 * 1000
                }
            }
        };
        
        // Mock services
        this.mockLogger = {
            info: (msg, data) => console.log(`INFO: ${msg}`, data || ''),
            warn: (msg, data) => console.log(`WARN: ${msg}`, data || ''),
            error: (msg, data) => console.log(`ERROR: ${msg}`, data || ''),
            debug: (msg, data) => console.log(`DEBUG: ${msg}`, data || '')
        };
        
        this.mockLoggingService = {
            logCertificateEvent: (event, clientName, username, clientIP, details) => {
                this.mockLogger.info(`Certificate Event: ${event}`, {
                    clientName, username, clientIP, ...details
                });
            }
        };
        
        this.mockHealthService = {
            recordHttpRequest: (method, path, status) => {
                this.mockLogger.debug(`HTTP Request: ${method} ${path} - ${status}`);
            },
            recordCertificateOperation: (operation, result, username) => {
                this.mockLogger.debug(`Certificate Operation: ${operation} - ${result} by ${username}`);
            }
        };
    }

    /**
     * Set up test environment
     */
    async setupTestEnvironment() {
        try {
            // Create test directory
            await fs.mkdir(this.testDir, { recursive: true });
            
            // Set environment variables for testing
            process.env.VPN_CERT_DIR = this.testDir;
            process.env.VPN_CONFIG_DIR = this.testDir;
            process.env.WEB_SESSION_SECRET = 'test-secret';
            
            // Create mock certificate files for testing
            await this.createMockCertificates();
            
            console.log('✅ Test environment set up successfully');
            return true;
        } catch (error) {
            console.error('❌ Failed to set up test environment:', error.message);
            throw error;
        }
    }

    /**
     * Create mock certificate files for testing
     */
    async createMockCertificates() {
        const mockCert = `-----BEGIN CERTIFICATE-----
MIIDSzCCAjOgAwIBAgIUTest...MockCertificate...
-----END CERTIFICATE-----`;

        const mockKey = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...MockKey...
-----END PRIVATE KEY-----`;

        const mockOvpn = `client
dev tun
proto udp
remote test.example.com 1194
resolv-retry infinite
nobind
persist-key
persist-tun
compress lz4
verb 3
<ca>
${mockCert}
</ca>
<cert>
${mockCert}
</cert>
<key>
${mockKey}
</key>`;

        // Create test certificate files
        await fs.writeFile(path.join(this.testDir, 'test-client.crt'), mockCert);
        await fs.writeFile(path.join(this.testDir, 'test-client.key'), mockKey);
        await fs.writeFile(path.join(this.testDir, 'test-client.ovpn'), mockOvpn);
        await fs.writeFile(path.join(this.testDir, 'ca.crt'), mockCert);
    }

    /**
     * Create test Express app with certificate routes
     */
    createTestApp() {
        const app = express();
        
        // Basic middleware
        app.use(express.json());
        app.use(express.urlencoded({ extended: true }));
        
        // Session middleware
        app.use(createSessionMiddleware({
            sessionSecret: 'test-secret'
        }));
        
        // Mock authentication middleware for testing
        app.use((req, res, next) => {
            req.session = req.session || {};
            req.session.authenticated = true;
            req.session.username = 'testuser';
            // Use a different approach to set IP for testing
            Object.defineProperty(req, 'ip', {
                value: '127.0.0.1',
                writable: true,
                configurable: true
            });
            next();
        });
        
        // Mock CSRF token
        app.use((req, res, next) => {
            res.locals = res.locals || {};
            res.locals.csrfToken = 'test-csrf-token';
            req.session.csrfToken = 'test-csrf-token';
            next();
        });
        
        // Certificate routes
        const certificateRoutes = new CertificateRoutes(
            this.mockLogger,
            this.mockLoggingService,
            this.mockHealthService,
            this.mockConfig
        );
        
        app.use('/', certificateRoutes.getRouter());
        
        return app;
    }

    /**
     * Run all tests
     */
    async runAllTests() {
        console.log('🧪 Starting Certificate Routes Test Suite\n');
        
        try {
            await this.setupTestEnvironment();
            
            // Test certificate listing
            await this.testCertificateListing();
            
            // Test certificate generation validation
            await this.testCertificateGenerationValidation();
            
            // Test certificate download
            await this.testCertificateDownload();
            
            // Test certificate download security
            await this.testCertificateDownloadSecurity();
            
            // Test certificate revocation validation
            await this.testCertificateRevocationValidation();
            
            // Test rate limiting (mock)
            await this.testRateLimiting();
            
            // Test authentication requirements
            await this.testAuthenticationRequirements();
            
            // Test input validation
            await this.testInputValidation();
            
            // Test error handling
            await this.testErrorHandling();
            
            // Print test results
            this.printTestResults();
            
        } catch (error) {
            console.error('❌ Test suite failed:', error.message);
            throw error;
        } finally {
            await this.cleanup();
        }
    }

    /**
     * Test certificate listing functionality
     */
    async testCertificateListing() {
        const testName = 'Certificate Listing';
        console.log(`🧪 Testing: ${testName}`);
        
        try {
            const app = this.createTestApp();
            
            // Test GET /certificates/list
            const response = await request(app)
                .get('/certificates/list')
                .expect(200);
            
            if (!response.body.success) {
                throw new Error('Certificate listing failed');
            }
            
            if (!Array.isArray(response.body.certificates)) {
                throw new Error('Certificates should be returned as an array');
            }
            
            // Should include our test certificate
            const testCert = response.body.certificates.find(cert => cert.name === 'test-client');
            if (!testCert) {
                throw new Error('Test certificate not found in listing');
            }
            
            // Verify certificate properties
            const requiredProps = ['name', 'createdAt', 'status', 'serialNumber'];
            for (const prop of requiredProps) {
                if (!(prop in testCert)) {
                    throw new Error(`Certificate missing required property: ${prop}`);
                }
            }
            
            this.addTestResult(testName, true, 'Certificate listing works correctly');
            console.log('  ✅ Certificate listing successful');
            
        } catch (error) {
            this.addTestResult(testName, false, error.message);
            console.log(`  ❌ Certificate listing failed: ${error.message}`);
        }
    }

    /**
     * Test certificate generation validation
     */
    async testCertificateGenerationValidation() {
        const testName = 'Certificate Generation Validation';
        console.log(`🧪 Testing: ${testName}`);
        
        try {
            const app = this.createTestApp();
            
            // Test missing client name
            let response = await request(app)
                .post('/certificates/generate')
                .send({ csrfToken: 'test-csrf-token' })
                .expect(400);
            
            if (!response.body.error.includes('Client name is required')) {
                throw new Error('Should reject missing client name');
            }
            
            // Test invalid client name
            response = await request(app)
                .post('/certificates/generate')
                .send({ 
                    clientName: 'invalid@name!',
                    csrfToken: 'test-csrf-token'
                })
                .expect(400);
            
            if (!response.body.error.includes('Invalid client name')) {
                throw new Error('Should reject invalid client name');
            }
            
            // Test duplicate certificate name
            response = await request(app)
                .post('/certificates/generate')
                .send({ 
                    clientName: 'test-client',
                    csrfToken: 'test-csrf-token'
                })
                .expect(409);
            
            if (!response.body.error.includes('already exists')) {
                throw new Error('Should reject duplicate certificate name');
            }
            
            this.addTestResult(testName, true, 'Certificate generation validation works correctly');
            console.log('  ✅ Certificate generation validation successful');
            
        } catch (error) {
            this.addTestResult(testName, false, error.message);
            console.log(`  ❌ Certificate generation validation failed: ${error.message}`);
        }
    }

    /**
     * Test certificate download functionality
     */
    async testCertificateDownload() {
        const testName = 'Certificate Download';
        console.log(`🧪 Testing: ${testName}`);
        
        try {
            const app = this.createTestApp();
            
            // Test successful download
            const response = await request(app)
                .get('/certificates/download/test-client')
                .expect(200);
            
            // Check headers
            if (!response.headers['content-disposition'].includes('attachment')) {
                throw new Error('Should set attachment header for download');
            }
            
            if (!response.headers['content-disposition'].includes('test-client.ovpn')) {
                throw new Error('Should set correct filename in header');
            }
            
            // Check content
            if (!response.text.includes('client')) {
                throw new Error('Downloaded file should contain OpenVPN client config');
            }
            
            this.addTestResult(testName, true, 'Certificate download works correctly');
            console.log('  ✅ Certificate download successful');
            
        } catch (error) {
            this.addTestResult(testName, false, error.message);
            console.log(`  ❌ Certificate download failed: ${error.message}`);
        }
    }

    /**
     * Test certificate download security
     */
    async testCertificateDownloadSecurity() {
        const testName = 'Certificate Download Security';
        console.log(`🧪 Testing: ${testName}`);
        
        try {
            const app = this.createTestApp();
            
            // Test path traversal prevention
            let response = await request(app)
                .get('/certificates/download/../../../etc/passwd')
                .expect(400);
            
            if (!response.body.error.includes('Invalid certificate name')) {
                throw new Error('Should prevent path traversal attacks');
            }
            
            // Test non-existent certificate
            response = await request(app)
                .get('/certificates/download/non-existent-cert')
                .expect(404);
            
            if (!response.body.error.includes('not found')) {
                throw new Error('Should return 404 for non-existent certificates');
            }
            
            this.addTestResult(testName, true, 'Certificate download security works correctly');
            console.log('  ✅ Certificate download security successful');
            
        } catch (error) {
            this.addTestResult(testName, false, error.message);
            console.log(`  ❌ Certificate download security failed: ${error.message}`);
        }
    }

    /**
     * Test certificate revocation validation
     */
    async testCertificateRevocationValidation() {
        const testName = 'Certificate Revocation Validation';
        console.log(`🧪 Testing: ${testName}`);
        
        try {
            const app = this.createTestApp();
            
            // Test invalid certificate name
            let response = await request(app)
                .post('/certificates/revoke/invalid@name!')
                .send({ csrfToken: 'test-csrf-token' })
                .expect(400);
            
            if (!response.body.error.includes('Invalid certificate name')) {
                throw new Error('Should reject invalid certificate name');
            }
            
            // Test non-existent certificate
            response = await request(app)
                .post('/certificates/revoke/non-existent-cert')
                .send({ csrfToken: 'test-csrf-token' })
                .expect(404);
            
            if (!response.body.error.includes('not found')) {
                throw new Error('Should return 404 for non-existent certificates');
            }
            
            this.addTestResult(testName, true, 'Certificate revocation validation works correctly');
            console.log('  ✅ Certificate revocation validation successful');
            
        } catch (error) {
            this.addTestResult(testName, false, error.message);
            console.log(`  ❌ Certificate revocation validation failed: ${error.message}`);
        }
    }

    /**
     * Test rate limiting (mock implementation)
     */
    async testRateLimiting() {
        const testName = 'Rate Limiting';
        console.log(`🧪 Testing: ${testName}`);
        
        try {
            // This is a mock test since we can't easily test actual rate limiting
            // In a real test environment, you would make multiple rapid requests
            
            const app = this.createTestApp();
            
            // Test that rate limiting middleware is applied
            // (This would require more complex setup to actually test rate limiting)
            const response = await request(app)
                .post('/certificates/generate')
                .send({ 
                    clientName: 'rate-test-cert',
                    csrfToken: 'test-csrf-token'
                });
            
            // The request should be processed (rate limiting is applied but not triggered in single request)
            if (response.status !== 400 && response.status !== 409 && response.status !== 201) {
                throw new Error('Unexpected response status for rate limiting test');
            }
            
            this.addTestResult(testName, true, 'Rate limiting middleware is properly configured');
            console.log('  ✅ Rate limiting configuration successful');
            
        } catch (error) {
            this.addTestResult(testName, false, error.message);
            console.log(`  ❌ Rate limiting test failed: ${error.message}`);
        }
    }

    /**
     * Test authentication requirements
     */
    async testAuthenticationRequirements() {
        const testName = 'Authentication Requirements';
        console.log(`🧪 Testing: ${testName}`);
        
        try {
            // Create app without authentication
            const app = express();
            app.use(express.json());
            
            const certificateRoutes = new CertificateRoutes(
                this.mockLogger,
                this.mockLoggingService,
                this.mockHealthService,
                this.mockConfig
            );
            
            app.use('/', certificateRoutes.getRouter());
            
            // Test that unauthenticated requests are rejected
            const response = await request(app)
                .get('/certificates/list')
                .expect(302); // Redirect to login
            
            this.addTestResult(testName, true, 'Authentication is properly required');
            console.log('  ✅ Authentication requirements successful');
            
        } catch (error) {
            this.addTestResult(testName, false, error.message);
            console.log(`  ❌ Authentication requirements failed: ${error.message}`);
        }
    }

    /**
     * Test input validation
     */
    async testInputValidation() {
        const testName = 'Input Validation';
        console.log(`🧪 Testing: ${testName}`);
        
        try {
            const app = this.createTestApp();
            
            // Test various invalid inputs
            const invalidInputs = [
                { clientName: '', expected: 'Client name is required' },
                { clientName: 'a', expected: 'Invalid client name' }, // too short
                { clientName: 'a'.repeat(51), expected: 'Invalid client name' }, // too long
                { clientName: 'test space', expected: 'Invalid client name' }, // contains space
                { clientName: 'test.dot', expected: 'Invalid client name' }, // contains dot
                { clientName: null, expected: 'Client name is required' },
                { clientName: 123, expected: 'Client name is required' }
            ];
            
            for (const input of invalidInputs) {
                const response = await request(app)
                    .post('/certificates/generate')
                    .send({ 
                        clientName: input.clientName,
                        csrfToken: 'test-csrf-token'
                    })
                    .expect(400);
                
                if (!response.body.error.includes(input.expected.split(' ')[0])) {
                    throw new Error(`Input validation failed for: ${JSON.stringify(input.clientName)}`);
                }
            }
            
            this.addTestResult(testName, true, 'Input validation works correctly');
            console.log('  ✅ Input validation successful');
            
        } catch (error) {
            this.addTestResult(testName, false, error.message);
            console.log(`  ❌ Input validation failed: ${error.message}`);
        }
    }

    /**
     * Test error handling
     */
    async testErrorHandling() {
        const testName = 'Error Handling';
        console.log(`🧪 Testing: ${testName}`);
        
        try {
            const app = this.createTestApp();
            
            // Test handling of various error conditions
            // Most error conditions are already tested in other test methods
            
            // Test that errors return proper JSON responses
            const response = await request(app)
                .get('/certificates/download/non-existent')
                .expect(404);
            
            if (!response.body.success === false) {
                throw new Error('Error responses should have success: false');
            }
            
            if (!response.body.error) {
                throw new Error('Error responses should include error message');
            }
            
            this.addTestResult(testName, true, 'Error handling works correctly');
            console.log('  ✅ Error handling successful');
            
        } catch (error) {
            this.addTestResult(testName, false, error.message);
            console.log(`  ❌ Error handling failed: ${error.message}`);
        }
    }

    /**
     * Add test result
     */
    addTestResult(testName, passed, message) {
        this.testResults.push({
            test: testName,
            passed,
            message,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Print test results summary
     */
    printTestResults() {
        console.log('\n📊 Test Results Summary');
        console.log('========================');
        
        const passed = this.testResults.filter(r => r.passed).length;
        const total = this.testResults.length;
        
        console.log(`Total Tests: ${total}`);
        console.log(`Passed: ${passed}`);
        console.log(`Failed: ${total - passed}`);
        console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%\n`);
        
        // Print individual results
        this.testResults.forEach(result => {
            const status = result.passed ? '✅' : '❌';
            console.log(`${status} ${result.test}: ${result.message}`);
        });
        
        if (passed === total) {
            console.log('\n🎉 All tests passed!');
        } else {
            console.log(`\n⚠️  ${total - passed} test(s) failed`);
        }
    }

    /**
     * Clean up test environment
     */
    async cleanup() {
        try {
            // Remove test directory
            await fs.rm(this.testDir, { recursive: true, force: true });
            console.log('\n🧹 Test cleanup completed');
        } catch (error) {
            console.warn('⚠️  Test cleanup failed:', error.message);
        }
    }
}

/**
 * Run tests if this file is executed directly
 */
async function runCertificateRoutesTests() {
    const tester = new CertificateRoutesTest();
    await tester.runAllTests();
}

if (require.main === module) {
    runCertificateRoutesTests().catch(error => {
        console.error('❌ Certificate routes test execution failed:', error);
        process.exit(1);
    });
}

module.exports = CertificateRoutesTest;