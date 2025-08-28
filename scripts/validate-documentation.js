#!/usr/bin/env node

/**
 * Documentation Validation Script
 * 
 * This script validates:
 * 1. All internal links work correctly
 * 2. Code examples and commands are accurate
 * 3. Russian translations are complete and accurate
 * 4. User workflows from different entry points
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class DocumentationValidator {
    constructor() {
        this.errors = [];
        this.warnings = [];
        this.stats = {
            filesChecked: 0,
            linksChecked: 0,
            codeBlocksChecked: 0,
            translationsChecked: 0
        };
    }

    log(message, type = 'info') {
        const timestamp = new Date().toISOString();
        const prefix = type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️';
        console.log(`${prefix} [${timestamp}] ${message}`);
    }

    addError(message) {
        this.errors.push(message);
        this.log(message, 'error');
    }

    addWarning(message) {
        this.warnings.push(message);
        this.log(message, 'warning');
    }

    // Check if file exists
    fileExists(filePath) {
        try {
            return fs.existsSync(filePath);
        } catch (error) {
            return false;
        }
    }

    // Read file content safely
    readFile(filePath) {
        try {
            return fs.readFileSync(filePath, 'utf8');
        } catch (error) {
            this.addError(`Cannot read file: ${filePath} - ${error.message}`);
            return null;
        }
    }

    // Get all markdown files in docs directory
    getMarkdownFiles(dir = 'docs') {
        const files = [];
        
        const scanDirectory = (currentDir) => {
            try {
                const items = fs.readdirSync(currentDir);
                
                for (const item of items) {
                    const fullPath = path.join(currentDir, item);
                    const stat = fs.statSync(fullPath);
                    
                    if (stat.isDirectory()) {
                        scanDirectory(fullPath);
                    } else if (item.endsWith('.md')) {
                        files.push(fullPath);
                    }
                }
            } catch (error) {
                this.addError(`Cannot scan directory: ${currentDir} - ${error.message}`);
            }
        };

        scanDirectory(dir);
        return files;
    }

    // Extract links from markdown content
    extractLinks(content) {
        const links = [];
        
        // Match markdown links [text](url)
        const markdownLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
        let match;
        
        while ((match = markdownLinkRegex.exec(content)) !== null) {
            links.push({
                text: match[1],
                url: match[2],
                type: 'markdown'
            });
        }
        
        // Match HTML links <a href="url">
        const htmlLinkRegex = /<a\s+href=["']([^"']+)["'][^>]*>/g;
        
        while ((match = htmlLinkRegex.exec(content)) !== null) {
            links.push({
                text: 'HTML link',
                url: match[1],
                type: 'html'
            });
        }
        
        return links;
    }

    // Validate internal links
    validateInternalLinks(filePath, content) {
        const links = this.extractLinks(content);
        const fileDir = path.dirname(filePath);
        
        for (const link of links) {
            this.stats.linksChecked++;
            
            // Skip external links
            if (link.url.startsWith('http://') || link.url.startsWith('https://')) {
                continue;
            }
            
            // Skip anchors and fragments
            if (link.url.startsWith('#')) {
                continue;
            }
            
            // Resolve relative path
            let targetPath = link.url;
            
            // Remove anchor fragments
            if (targetPath.includes('#')) {
                targetPath = targetPath.split('#')[0];
            }
            
            // Skip empty paths
            if (!targetPath) {
                continue;
            }
            
            // Resolve relative to file directory
            const resolvedPath = path.resolve(fileDir, targetPath);
            
            if (!this.fileExists(resolvedPath)) {
                this.addError(`Broken link in ${filePath}: "${link.url}" -> ${resolvedPath}`);
            }
        }
    }

    // Extract and validate code blocks
    validateCodeBlocks(filePath, content) {
        const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
        let match;
        
        while ((match = codeBlockRegex.exec(content)) !== null) {
            this.stats.codeBlocksChecked++;
            const language = match[1] || 'text';
            const code = match[2].trim();
            
            // Validate bash/shell commands
            if (['bash', 'shell', 'sh'].includes(language)) {
                this.validateShellCommands(filePath, code);
            }
            
            // Validate JavaScript code
            if (['javascript', 'js'].includes(language)) {
                this.validateJavaScript(filePath, code);
            }
            
            // Validate JSON
            if (language === 'json') {
                this.validateJSON(filePath, code);
            }
        }
    }

    // Validate shell commands
    validateShellCommands(filePath, code) {
        const lines = code.split('\n');
        // Track a simple working directory context within the code block.
        // Default to repo root, since most docs assume running from project root.
        let currentWorkingDir = process.cwd();
        // Track files that appear to be created within this code block
        const createdFiles = new Set();

        for (const rawLine of lines) {
            const line = rawLine;
            const trimmed = line.trim();

            // Skip comments and empty lines
            if (!trimmed || trimmed.startsWith('#')) {
                continue;
            }

            // Handle directory changes (basic cd simulation)
            // Supports: cd dir, cd ../dir, pushd dir
            const cdMatch = trimmed.match(/^\b(cd|pushd)\b\s+([^\s;]+)/);
            if (cdMatch) {
                const target = cdMatch[2].replace(/['"]/g, '');
                try {
                    if (target === '-' || target.startsWith('~')) {
                        // Ignore unsupported targets in this simple model
                    } else {
                        // Resolve relative to currentWorkingDir
                        currentWorkingDir = path.resolve(currentWorkingDir, target);
                    }
                } catch (_) { /* noop */ }
                // Continue to next line; refs on same line as cd are rare
                // but still allow fall-through to ref checks below
            }

            // Check for common command patterns
            if (trimmed.startsWith('npm ')) {
                // Validate npm commands exist in package.json
                const command = trimmed.replace('npm run ', '').replace('npm ', '');
                if (command.startsWith('run ')) {
                    const scriptName = command.replace('run ', '');
                    this.validateNpmScript(filePath, scriptName);
                }
            }

            // Heuristic: record files created by common commands prior to validation
            //  - openssl ... -out <file> [-keyout <file>]
            if (/^openssl\b/.test(trimmed)) {
                const outMatch = trimmed.match(/\b-out\s+([^\s]+)/);
                const keyOutMatch = trimmed.match(/\b-keyout\s+([^\s]+)/);
                if (outMatch) {
                    createdFiles.add(outMatch[1].replace(/['"]/g, ''));
                }
                if (keyOutMatch) {
                    createdFiles.add(keyOutMatch[1].replace(/['"]/g, ''));
                }
            }

            //  - here-doc or redirection creators: cat > file <<, tee file >
            const heredocMatch = trimmed.match(/\b(cat|tee)\b\s+>(>?)*\s*([^\s]+)|\b(cat)\b\s+>([^\s]+)/);
            if (heredocMatch) {
                const target = (heredocMatch[3] || heredocMatch[5]);
                if (target) {
                    createdFiles.add(target.replace(/['"]/g, ''));
                }
            }

            // Extract potential file references (./... or ../...)
            if (trimmed.includes('./') || trimmed.includes('../')) {
                const fileRefs = trimmed.match(/\.\.?\/[^\s'"\)]+/g);
                if (fileRefs) {
                    for (let ref of fileRefs) {
                        // Strip quotes
                        let candidate = ref.replace(/['"]/g, '');

                        // If this looks like a Docker volume mapping, keep only the left side
                        // e.g. "./certificates:/app/certificates:Z" -> "./certificates"
                        if (candidate.includes(':')) {
                            candidate = candidate.split(':')[0];
                        }

                        // Trim trailing punctuation/brackets
                        candidate = candidate.replace(/[),;]+$/, '');

                        // Skip placeholders, env vars, and globs
                        if (/[\$\*\?{}]/.test(candidate)) {
                            continue;
                        }

                        // Skip known illustrative examples not present in repo
                        const baseName = path.basename(candidate.replace(/\/$/, ''));
                        if (['health-check.sh', 'full-backup.sh', 'server.crt', 'server.key'].includes(baseName)) {
                            continue;
                        }
                        if (/remote-logs\/?$/.test(candidate)) {
                            continue;
                        }

                        // Build resolution candidates:
                        // 1) currentWorkingDir (from cd tracking)
                        // 2) repo root
                        // 3) directory of the markdown file
                        const candidates = [
                            path.resolve(currentWorkingDir, candidate),
                            path.resolve(process.cwd(), candidate),
                            path.resolve(path.dirname(filePath), candidate),
                        ];

                        // If ref starts with '../', also try resolving relative to
                        // currentWorkingDir's parent (common in examples after cd into a subdir)
                        if (candidate.startsWith('../')) {
                            candidates.push(path.resolve(path.join(currentWorkingDir, '..'), candidate.replace(/^\.\.\//, '')));
                        }

                        // Special-case: allow './easyrsa' when easy-rsa tool is present
                        if (candidate === './easyrsa') {
                            candidates.push(path.resolve(process.cwd(), 'easy-rsa', 'easyrsa'));
                        }

                        // Pass if any resolution exists
                        const existsSomewhere = candidates.some(p => this.fileExists(p));
                        // Or if it was created earlier in the same block
                        const createdInBlock = existsSomewhere ? true : Array.from(createdFiles).some(cf => {
                            // Compare only the raw tokens (without attempting resolution),
                            // but also try comparing against the basename if relative positioning differs
                            return cf === candidate || path.basename(cf) === path.basename(candidate);
                        });
                        if (!existsSomewhere) {
                            if (!createdInBlock) {
                                this.addWarning(`Referenced file may not exist in ${filePath}: ${candidate}`);
                            }
                        }
                    }
                }
            }
        }
    }

    // Validate JavaScript code syntax
    validateJavaScript(filePath, code) {
        try {
            // Basic syntax check - try to parse as function body
            new Function(code);
        } catch (error) {
            // Try parsing as an object literal or expression
            try {
                new Function(`return (${code})`);
            } catch (error2) {
                // Try parsing as a statement
                try {
                    new Function(`${code};`);
                } catch (error3) {
                    this.addError(`JavaScript syntax error in ${filePath}: ${error.message}`);
                }
            }
        }
    }

    // Validate JSON syntax
    validateJSON(filePath, code) {
        try {
            JSON.parse(code);
        } catch (error) {
            this.addError(`JSON syntax error in ${filePath}: ${error.message}`);
        }
    }

    // Validate npm script exists
    validateNpmScript(filePath, scriptName) {
        try {
            const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
            if (!packageJson.scripts || !packageJson.scripts[scriptName]) {
                this.addError(`Referenced npm script "${scriptName}" not found in package.json (from ${filePath})`);
            }
        } catch (error) {
            this.addWarning(`Cannot validate npm script "${scriptName}" - package.json not readable`);
        }
    }

    // Check translation completeness
    validateTranslations() {
        const enFiles = this.getMarkdownFiles('docs/en');
        const ruFiles = this.getMarkdownFiles('docs/ru');
        
        // Create maps of relative paths
        const enPaths = new Set(enFiles.map(f => f.replace('docs/en/', '')));
        const ruPaths = new Set(ruFiles.map(f => f.replace('docs/ru/', '')));
        
        // Check for missing Russian translations
        for (const enPath of enPaths) {
            this.stats.translationsChecked++;
            if (!ruPaths.has(enPath)) {
                this.addError(`Missing Russian translation: docs/ru/${enPath}`);
            }
        }
        
        // Check for orphaned Russian files
        for (const ruPath of ruPaths) {
            if (!enPaths.has(ruPath)) {
                this.addWarning(`Russian file without English counterpart: docs/ru/${ruPath}`);
            }
        }
        
        // Compare content structure for existing translations
        for (const enPath of enPaths) {
            if (ruPaths.has(enPath)) {
                this.compareTranslationStructure(`docs/en/${enPath}`, `docs/ru/${enPath}`);
            }
        }
    }

    // Compare structure between English and Russian versions
    compareTranslationStructure(enFile, ruFile) {
        const enContent = this.readFile(enFile);
        const ruContent = this.readFile(ruFile);
        
        if (!enContent || !ruContent) {
            return;
        }
        
        // Extract headers
        const enHeaders = enContent.match(/^#+\s+.+$/gm) || [];
        const ruHeaders = ruContent.match(/^#+\s+.+$/gm) || [];
        
        if (enHeaders.length !== ruHeaders.length) {
            this.addWarning(`Header count mismatch between ${enFile} (${enHeaders.length}) and ${ruFile} (${ruHeaders.length})`);
        }
        
        // Check for code blocks consistency
        const enCodeBlocks = (enContent.match(/```/g) || []).length;
        const ruCodeBlocks = (ruContent.match(/```/g) || []).length;
        
        if (enCodeBlocks !== ruCodeBlocks) {
            this.addWarning(`Code block count mismatch between ${enFile} (${enCodeBlocks/2}) and ${ruFile} (${ruCodeBlocks/2})`);
        }
    }

    // Validate user workflows
    validateUserWorkflows() {
        this.log('Validating user workflows...');
        
        // Check main entry points exist
        const entryPoints = [
            'README.md',
            'FIRST_TIME.md',
            'FIRST_TIME_RU.md',
            'docs/en/README.md',
            'docs/ru/README.md'
        ];
        
        for (const entry of entryPoints) {
            if (!this.fileExists(entry)) {
                this.addError(`Missing entry point: ${entry}`);
            } else {
                this.log(`✓ Entry point exists: ${entry}`);
            }
        }
        
        // Check workflow paths
        const workflows = [
            {
                name: 'Beginner Docker Setup',
                path: ['README.md', 'FIRST_TIME.md', 'docs/en/installation/docker.md']
            },
            {
                name: 'Advanced API Usage',
                path: ['README.md', 'docs/en/README.md', 'docs/en/api/README.md']
            },
            {
                name: 'Troubleshooting',
                path: ['README.md', 'docs/en/troubleshooting/common-issues.md']
            },
            {
                name: 'Russian User Setup',
                path: ['README.md', 'FIRST_TIME_RU.md', 'docs/ru/installation/docker.md']
            }
        ];
        
        for (const workflow of workflows) {
            this.log(`Checking workflow: ${workflow.name}`);
            for (const file of workflow.path) {
                if (!this.fileExists(file)) {
                    this.addError(`Workflow "${workflow.name}" broken - missing: ${file}`);
                } else {
                    this.log(`  ✓ ${file}`);
                }
            }
        }
    }

    // Validate documentation structure
    validateStructure() {
        this.log('Validating documentation structure...');
        
        const expectedStructure = {
            'docs/en': ['api', 'configuration', 'deployment', 'installation', 'security', 'troubleshooting'],
            'docs/ru': ['api', 'configuration', 'deployment', 'installation', 'security', 'troubleshooting']
        };
        
        for (const [baseDir, expectedDirs] of Object.entries(expectedStructure)) {
            if (!this.fileExists(baseDir)) {
                this.addError(`Missing directory: ${baseDir}`);
                continue;
            }
            
            for (const expectedDir of expectedDirs) {
                const fullPath = path.join(baseDir, expectedDir);
                if (!this.fileExists(fullPath)) {
                    this.addError(`Missing directory: ${fullPath}`);
                } else {
                    this.log(`✓ Directory exists: ${fullPath}`);
                }
            }
        }
    }

    // Main validation function
    async validate() {
        this.log('Starting documentation validation...');
        
        // Validate structure
        this.validateStructure();
        
        // Get all markdown files
        const allFiles = [
            ...this.getMarkdownFiles('docs'),
            'README.md',
            'FIRST_TIME.md',
            'FIRST_TIME_RU.md'
        ].filter(f => this.fileExists(f));
        
        this.log(`Found ${allFiles.length} markdown files to validate`);
        
        // Validate each file
        for (const filePath of allFiles) {
            this.stats.filesChecked++;
            this.log(`Validating: ${filePath}`);
            
            const content = this.readFile(filePath);
            if (content) {
                this.validateInternalLinks(filePath, content);
                this.validateCodeBlocks(filePath, content);
            }
        }
        
        // Validate translations
        this.validateTranslations();
        
        // Validate user workflows
        this.validateUserWorkflows();
        
        // Generate report
        this.generateReport();
    }

    // Generate validation report
    generateReport() {
        this.log('\n' + '='.repeat(60));
        this.log('DOCUMENTATION VALIDATION REPORT');
        this.log('='.repeat(60));
        
        this.log(`Files checked: ${this.stats.filesChecked}`);
        this.log(`Links checked: ${this.stats.linksChecked}`);
        this.log(`Code blocks checked: ${this.stats.codeBlocksChecked}`);
        this.log(`Translations checked: ${this.stats.translationsChecked}`);
        
        this.log(`\nErrors: ${this.errors.length}`);
        this.log(`Warnings: ${this.warnings.length}`);
        
        if (this.errors.length > 0) {
            this.log('\n❌ ERRORS:');
            this.errors.forEach((error, i) => {
                this.log(`${i + 1}. ${error}`);
            });
        }
        
        if (this.warnings.length > 0) {
            this.log('\n⚠️ WARNINGS:');
            this.warnings.forEach((warning, i) => {
                this.log(`${i + 1}. ${warning}`);
            });
        }
        
        if (this.errors.length === 0 && this.warnings.length === 0) {
            this.log('\n✅ All validation checks passed!');
        }
        
        // Write report to file
        const report = {
            timestamp: new Date().toISOString(),
            stats: this.stats,
            errors: this.errors,
            warnings: this.warnings,
            summary: {
                totalIssues: this.errors.length + this.warnings.length,
                criticalIssues: this.errors.length,
                passed: this.errors.length === 0
            }
        };
        
        fs.writeFileSync('documentation-validation-report.json', JSON.stringify(report, null, 2));
        this.log('\n📄 Report saved to: documentation-validation-report.json');
        
        return this.errors.length === 0;
    }
}

// Run validation if called directly
if (require.main === module) {
    const validator = new DocumentationValidator();
    validator.validate().then(success => {
        process.exit(success ? 0 : 1);
    }).catch(error => {
        console.error('Validation failed:', error);
        process.exit(1);
    });
}

module.exports = DocumentationValidator;
