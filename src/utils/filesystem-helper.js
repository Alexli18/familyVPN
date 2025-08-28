const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const mkdirp = require('mkdirp');

/**
 * Filesystem helper utilities for handling read-only environments
 */
class FilesystemHelper {
    constructor(logger) {
        this.logger = logger || console;
    }

    /**
     * Check if a directory is writable
     */
    async isDirectoryWritable(dirPath) {
        try {
            const testFile = path.join(dirPath, '.write-test-' + Date.now());
            await fs.writeFile(testFile, 'test');
            await fs.unlink(testFile);
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Find a writable directory for certificates and config
     */
    async findWritableDirectory(preferredPath) {
        const candidatePaths = [
            preferredPath,
            path.join(process.cwd(), 'certificates'),
            path.join(process.cwd(), 'data', 'certificates'),
            path.join(os.tmpdir(), 'vpn-certificates'),
            path.join(os.homedir(), '.vpn-certificates')
        ];

        for (const candidatePath of candidatePaths) {
            try {
                // Try to create the directory
                await mkdirp(candidatePath);
                
                // Test if it's writable
                if (await this.isDirectoryWritable(candidatePath)) {
                    this.logger.info(`Found writable directory: ${candidatePath}`);
                    return candidatePath;
                }
            } catch (error) {
                this.logger.debug(`Cannot use directory ${candidatePath}: ${error.message}`);
            }
        }

        throw new Error('No writable directory found for certificates');
    }

    /**
     * Setup directories with fallback handling
     */
    async setupDirectories(config) {
        const results = {
            certificates: null,
            config: null,
            easyrsa: null
        };

        try {
            // Setup certificates directory
            results.certificates = await this.findWritableDirectory(config.certificates.dir);
            config.certificates.dir = results.certificates;

            // Setup config directory
            results.config = await this.findWritableDirectory(config.config.path);
            config.config.path = results.config;

            // Setup easy-rsa directory
            const easyrsaPath = path.join(process.cwd(), 'easy-rsa');
            results.easyrsa = await this.findWritableDirectory(easyrsaPath);

            this.logger.info('Directory setup complete:', results);
            return results;

        } catch (error) {
            this.logger.error(`Failed to setup directories: ${error.message}`);
            throw error;
        }
    }

    /**
     * Create a safe temporary directory for operations
     */
    async createTempDirectory(prefix = 'vpn-temp') {
        const tempDir = path.join(os.tmpdir(), `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
        
        try {
            await mkdirp(tempDir);
            
            if (await this.isDirectoryWritable(tempDir)) {
                this.logger.info(`Created temporary directory: ${tempDir}`);
                return tempDir;
            } else {
                throw new Error('Temporary directory is not writable');
            }
        } catch (error) {
            this.logger.error(`Failed to create temporary directory: ${error.message}`);
            throw error;
        }
    }

    /**
     * Check filesystem permissions and provide recommendations
     */
    async checkFilesystemStatus() {
        const status = {
            currentDir: process.cwd(),
            currentDirWritable: false,
            homeDir: os.homedir(),
            homeDirWritable: false,
            tmpDir: os.tmpdir(),
            tmpDirWritable: false,
            recommendations: []
        };

        // Check current directory
        status.currentDirWritable = await this.isDirectoryWritable(status.currentDir);
        
        // Check home directory
        try {
            status.homeDirWritable = await this.isDirectoryWritable(status.homeDir);
        } catch (error) {
            status.homeDirWritable = false;
        }

        // Check temp directory
        status.tmpDirWritable = await this.isDirectoryWritable(status.tmpDir);

        // Generate recommendations
        if (!status.currentDirWritable) {
            status.recommendations.push('Current directory is read-only. Consider using volume mounts in Docker.');
        }

        if (!status.homeDirWritable && !status.tmpDirWritable) {
            status.recommendations.push('No writable directories found. VPN server may not function properly.');
        }

        if (status.tmpDirWritable) {
            status.recommendations.push('Using temporary directory for certificates. Data will not persist across restarts.');
        }

        return status;
    }

    /**
     * Copy files safely with error handling
     */
    async safeCopyFile(src, dest) {
        try {
            // Ensure destination directory exists
            const destDir = path.dirname(dest);
            await mkdirp(destDir);

            // Copy the file
            await fs.copyFile(src, dest);
            this.logger.debug(`Copied file: ${src} -> ${dest}`);
            return true;
        } catch (error) {
            this.logger.error(`Failed to copy file ${src} to ${dest}: ${error.message}`);
            return false;
        }
    }

    /**
     * Clean up temporary directories
     */
    async cleanup(tempDirs = []) {
        for (const tempDir of tempDirs) {
            try {
                await fs.rm(tempDir, { recursive: true, force: true });
                this.logger.info(`Cleaned up temporary directory: ${tempDir}`);
            } catch (error) {
                this.logger.warn(`Failed to clean up ${tempDir}: ${error.message}`);
            }
        }
    }
}

module.exports = FilesystemHelper;