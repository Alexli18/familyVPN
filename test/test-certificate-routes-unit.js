const fs = require('fs').promises;
const path = require('path');
const CertificateRoutes = require('../src/routes/certificates');

/**
 * Unit tests for certificate routes functionality
 * Tests individual methods without Express setup
 */
class CertificateRoutesUnitTest {
    constructor() {
        this.testResults = [];
        this.testDir = path.join(process.cwd(), 'test-certificates-unit');
        
        this.mockConfig = {
            certificates: {
                dir: this.testDir,
                serverCertName: 'server'
            }
        };
        
        this.mockLogger = {
            info: () => {},
            warn: () => {},
            error: () => {},
            debug: () => {}
        };
        
        this.mockLoggingService = {
            logCertificateEvent: () => {}
        };
        
        this.mockHealthService = {
            recordHttpRequest: () => {},
            recordCertificateOperation: () => {}
        };
    }

    /**
     * Set up test environment
     */
    async setupTestEnvironment() {
        try {
            await fs.mkdir(this.testDir, { recursive: true });
            
            // Create mock certificate files
            const mockOvpn = `client
dev tun
proto udp
remote test.example.com 1194
<ca>
-----BEGIN CERTIFICATE-----
Mock CA Certificate
-----END CERTIFICATE-----
</ca>`;
            
            await fs.writeFile(path.join(this.testDir, 'test-client.ovpn'), mockOvpn);
            await fs.writeFile(path.join(this.testDir, 'another-client.ovpn'), mockOvpn);
            
            console.log('✅ Unit test environment set up successfully');
            return true;
        } catch (error) {
            console.error('❌ Failed to set up unit test environment:', error.message);
            throw error;
        }
    }

    /**
     * Run all unit tests
     */
    async runAllTests() {
        console.log('🧪 Starting Certificate Routes Unit Test Suite\n');
        
        try {
            await this.setupTestEnvironment();
            
            const certificateRoutes = new CertificateRoutes(
                this.mockLogger,
                this.mockLoggingService,
                this.mockHealthService,
                this.mockConfig
            );
            
            // Test client name validation
            await this.testClientNameValidation(certificateRoutes);
            
            // Test client name sanitization
            await this.testClientNameSanitization(certificateRoutes);
            
            // Test certificate listing
            await this.testCertificateListing(certificateRoutes);
            
            // Test request ID generation
            await this.testRequestIdGeneration(certificateRoutes);
            
            // Print test results
            this.printTestResults();
            
        } catch (error) {
            console.error('❌ Unit test suite failed:', error.message);
            throw error;
        } finally {
            await this.cleanup();
        }
    }

    /**
     * Test client name validation
     */
    async testClientNameValidation(certificateRoutes) {
        const testName = 'Client Name Validation';
        console.log(`🧪 Testing: ${testName}`);
        
        try {
            // Valid names
            const validNames = [
                'test-client',
                'client_123',
                'MyClient',
                'client-with-hyphens',
                'client_with_underscores',
                'abc', // minimum length
                'a'.repeat(50) // maximum length
            ];
            
            for (const name of validNames) {
                if (!certificateRoutes.isValidClientName(name)) {
                    throw new Error(`Valid name rejected: ${name}`);
                }
            }
            
            // Invalid names
            const invalidNames = [
                '', // empty
                'ab', // too short
                'a'.repeat(51), // too long
                'test client', // space
                'test.client', // dot
                'test@client', // special character
                'test/client', // slash
                'test\\client', // backslash
                null, // null
                undefined, // undefined
                123, // number
                {}, // object
            ];
            
            for (const name of invalidNames) {
                if (certificateRoutes.isValidClientName(name)) {
                    throw new Error(`Invalid name accepted: ${name}`);
                }
            }
            
            this.addTestResult(testName, true, 'Client name validation works correctly');
            console.log('  ✅ Client name validation successful');
            
        } catch (error) {
            this.addTestResult(testName, false, error.message);
            console.log(`  ❌ Client name validation failed: ${error.message}`);
        }
    }

    /**
     * Test client name sanitization
     */
    async testClientNameSanitization(certificateRoutes) {
        const testName = 'Client Name Sanitization';
        console.log(`🧪 Testing: ${testName}`);
        
        try {
            const testCases = [
                { input: 'test@client!', expected: 'testclient' },
                { input: 'test client', expected: 'testclient' },
                { input: 'test.client', expected: 'testclient' },
                { input: 'test/client\\name', expected: 'testclientname' },
                { input: 'a'.repeat(60), expected: 'a'.repeat(50) }, // truncation
                { input: '', expected: '' },
                { input: null, expected: '' },
                { input: undefined, expected: '' },
                { input: 123, expected: '' }
            ];
            
            for (const testCase of testCases) {
                const result = certificateRoutes.sanitizeClientName(testCase.input);
                if (result !== testCase.expected) {
                    throw new Error(`Sanitization failed for "${testCase.input}": expected "${testCase.expected}", got "${result}"`);
                }
            }
            
            this.addTestResult(testName, true, 'Client name sanitization works correctly');
            console.log('  ✅ Client name sanitization successful');
            
        } catch (error) {
            this.addTestResult(testName, false, error.message);
            console.log(`  ❌ Client name sanitization failed: ${error.message}`);
        }
    }

    /**
     * Test certificate listing
     */
    async testCertificateListing(certificateRoutes) {
        const testName = 'Certificate Listing';
        console.log(`🧪 Testing: ${testName}`);
        
        try {
            const certificates = await certificateRoutes.listCertificates();
            
            if (!Array.isArray(certificates)) {
                throw new Error('Certificate listing should return an array');
            }
            
            if (certificates.length < 2) {
                throw new Error('Should find at least 2 test certificates');
            }
            
            // Check certificate properties
            const cert = certificates[0];
            const requiredProps = ['name', 'createdAt', 'status', 'fileSize'];
            
            for (const prop of requiredProps) {
                if (!(prop in cert)) {
                    throw new Error(`Certificate missing required property: ${prop}`);
                }
            }
            
            // Should not include server certificates
            const serverCert = certificates.find(c => c.name === 'server');
            if (serverCert) {
                throw new Error('Server certificates should be filtered out');
            }
            
            this.addTestResult(testName, true, 'Certificate listing works correctly');
            console.log('  ✅ Certificate listing successful');
            
        } catch (error) {
            this.addTestResult(testName, false, error.message);
            console.log(`  ❌ Certificate listing failed: ${error.message}`);
        }
    }

    /**
     * Test request ID generation
     */
    async testRequestIdGeneration(certificateRoutes) {
        const testName = 'Request ID Generation';
        console.log(`🧪 Testing: ${testName}`);
        
        try {
            const id1 = certificateRoutes.generateRequestId();
            const id2 = certificateRoutes.generateRequestId();
            
            if (!id1 || !id2) {
                throw new Error('Request IDs should not be empty');
            }
            
            if (id1 === id2) {
                throw new Error('Request IDs should be unique');
            }
            
            if (!id1.startsWith('req_')) {
                throw new Error('Request IDs should start with "req_"');
            }
            
            this.addTestResult(testName, true, 'Request ID generation works correctly');
            console.log('  ✅ Request ID generation successful');
            
        } catch (error) {
            this.addTestResult(testName, false, error.message);
            console.log(`  ❌ Request ID generation failed: ${error.message}`);
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
        console.log('\n📊 Unit Test Results Summary');
        console.log('=============================');
        
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
            console.log('\n🎉 All unit tests passed!');
        } else {
            console.log(`\n⚠️  ${total - passed} unit test(s) failed`);
        }
    }

    /**
     * Clean up test environment
     */
    async cleanup() {
        try {
            await fs.rm(this.testDir, { recursive: true, force: true });
            console.log('\n🧹 Unit test cleanup completed');
        } catch (error) {
            console.warn('⚠️  Unit test cleanup failed:', error.message);
        }
    }
}

/**
 * Run unit tests if this file is executed directly
 */
async function runCertificateRoutesUnitTests() {
    const tester = new CertificateRoutesUnitTest();
    await tester.runAllTests();
}

if (require.main === module) {
    runCertificateRoutesUnitTests().catch(error => {
        console.error('❌ Certificate routes unit test execution failed:', error);
        process.exit(1);
    });
}

module.exports = CertificateRoutesUnitTest;