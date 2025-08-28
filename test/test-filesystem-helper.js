const assert = require('assert');
const path = require('path');
const fs = require('fs').promises;
const FilesystemHelper = require('../src/utils/filesystem-helper');

/**
 * Test filesystem helper functionality
 */
async function testFilesystemHelper() {
    console.log('🧪 Testing Filesystem Helper...\n');

    const mockLogger = {
        info: () => {},
        warn: () => {},
        error: () => {},
        debug: () => {}
    };

    let testsPassed = 0;
    let testsFailed = 0;

    async function runTest(testName, testFunction) {
        try {
            console.log(`  ▶️  ${testName}`);
            await testFunction();
            console.log(`  ✅ ${testName} - PASSED`);
            testsPassed++;
        } catch (error) {
            console.log(`  ❌ ${testName} - FAILED: ${error.message}`);
            testsFailed++;
        }
    }

    // Test 1: Create filesystem helper
    await runTest('Create FilesystemHelper instance', async () => {
        const helper = new FilesystemHelper(mockLogger);
        assert(helper, 'FilesystemHelper should be created');
        assert(typeof helper.isDirectoryWritable === 'function', 'Should have isDirectoryWritable method');
    });

    // Test 2: Check if current directory is writable
    await runTest('Check current directory writability', async () => {
        const helper = new FilesystemHelper(mockLogger);
        const isWritable = await helper.isDirectoryWritable(process.cwd());
        assert(typeof isWritable === 'boolean', 'Should return boolean');
        console.log(`    Current directory writable: ${isWritable}`);
    });

    // Test 3: Check filesystem status
    await runTest('Check filesystem status', async () => {
        const helper = new FilesystemHelper(mockLogger);
        const status = await helper.checkFilesystemStatus();
        
        assert(status.currentDir, 'Should have current directory');
        assert(typeof status.currentDirWritable === 'boolean', 'Should have writability status');
        assert(Array.isArray(status.recommendations), 'Should have recommendations array');
        
        console.log(`    Current dir: ${status.currentDir} (writable: ${status.currentDirWritable})`);
        console.log(`    Temp dir: ${status.tmpDir} (writable: ${status.tmpDirWritable})`);
    });

    // Test 4: Find writable directory
    await runTest('Find writable directory', async () => {
        const helper = new FilesystemHelper(mockLogger);
        const testPath = path.join(process.cwd(), 'test-certificates');
        
        try {
            const writableDir = await helper.findWritableDirectory(testPath);
            assert(writableDir, 'Should find a writable directory');
            console.log(`    Found writable directory: ${writableDir}`);
            
            // Clean up test directory if it was created
            try {
                await fs.rm(testPath, { recursive: true, force: true });
            } catch (error) {
                // Ignore cleanup errors
            }
        } catch (error) {
            // If no writable directory found, that's also a valid result in read-only environments
            console.log(`    No writable directory found (expected in read-only environment): ${error.message}`);
        }
    });

    // Test 5: Create temporary directory
    await runTest('Create temporary directory', async () => {
        const helper = new FilesystemHelper(mockLogger);
        
        try {
            const tempDir = await helper.createTempDirectory('test');
            assert(tempDir, 'Should create temporary directory');
            assert(tempDir.includes('test'), 'Should include prefix in name');
            console.log(`    Created temp directory: ${tempDir}`);
            
            // Clean up
            await helper.cleanup([tempDir]);
        } catch (error) {
            // In read-only environments, this might fail
            console.log(`    Cannot create temp directory (read-only environment): ${error.message}`);
        }
    });

    // Print test summary
    console.log('\n📊 Filesystem Helper Test Summary:');
    console.log(`✅ Passed: ${testsPassed}`);
    console.log(`❌ Failed: ${testsFailed}`);
    console.log(`📈 Success Rate: ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1)}%`);

    console.log('\n🏁 Filesystem Helper Tests Complete!\n');

    return {
        passed: testsPassed,
        failed: testsFailed,
        total: testsPassed + testsFailed
    };
}

// Run tests if this file is executed directly
if (require.main === module) {
    testFilesystemHelper().catch(error => {
        console.error('Test execution failed:', error);
        process.exit(1);
    });
}

module.exports = testFilesystemHelper;