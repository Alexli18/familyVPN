#!/usr/bin/env node

/**
 * Fix Documentation Links Script
 * 
 * This script fixes common broken link patterns in the documentation
 */

const fs = require('fs');
const path = require('path');

class LinkFixer {
    constructor() {
        this.fixCount = 0;
        this.errors = [];
    }

    log(message, type = 'info') {
        const timestamp = new Date().toISOString();
        const prefix = type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️';
        console.log(`${prefix} [${timestamp}] ${message}`);
    }

    // Get all markdown files
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
                this.errors.push(`Cannot scan directory: ${currentDir} - ${error.message}`);
            }
        };

        scanDirectory(dir);
        return files;
    }

    // Fix common broken link patterns
    fixLinks(filePath, content) {
        let fixedContent = content;
        let fileFixCount = 0;

        // Fix pattern: ../en/path -> ../../en/path (from docs/en/ to docs/en/)
        const pattern1 = /\]\(\.\.\/en\//g;
        if (pattern1.test(fixedContent)) {
            fixedContent = fixedContent.replace(pattern1, '](../../en/');
            fileFixCount++;
            this.log(`Fixed ../en/ pattern in ${filePath}`);
        }

        // Fix pattern: ../ru/path -> ../../ru/path (from docs/en/ to docs/ru/)
        const pattern2 = /\]\(\.\.\/ru\//g;
        if (pattern2.test(fixedContent)) {
            fixedContent = fixedContent.replace(pattern2, '](../../ru/');
            fileFixCount++;
            this.log(`Fixed ../ru/ pattern in ${filePath}`);
        }

        // Fix pattern: ../en/path -> ../en/path (from docs/ru/ to docs/en/)
        // This should be correct, but let's check if we're in ru directory
        if (filePath.includes('/docs/ru/')) {
            // These should be correct as-is for ru -> en navigation
        }

        // Fix pattern: ../ru/path -> ../ru/path (from docs/en/ to docs/ru/)
        // This should be correct, but let's check if we're in en directory
        if (filePath.includes('/docs/en/')) {
            // These should be correct as-is for en -> ru navigation
        }

        this.fixCount += fileFixCount;
        return fixedContent;
    }

    // Fix JavaScript syntax errors in code blocks
    fixJavaScriptSyntax(content) {
        // Fix object literal syntax in code blocks
        const jsCodeBlockRegex = /```(?:javascript|js)\n([\s\S]*?)```/g;
        
        return content.replace(jsCodeBlockRegex, (match, code) => {
            // Fix common syntax issues
            let fixedCode = code;
            
            // Fix object literals with unquoted keys that contain special characters
            fixedCode = fixedCode.replace(/(\w+):\s*([^,}\n]+)/g, (match, key, value) => {
                // If key contains special characters, quote it
                if (/[^a-zA-Z0-9_$]/.test(key)) {
                    return `"${key}": ${value}`;
                }
                return match;
            });
            
            return `\`\`\`javascript\n${fixedCode}\`\`\``;
        });
    }

    // Main fix function
    async fix() {
        this.log('Starting documentation link fixes...');
        
        // Get all markdown files
        const allFiles = [
            ...this.getMarkdownFiles('docs'),
            'README.md',
            'FIRST_TIME.md',
            'FIRST_TIME_RU.md'
        ].filter(f => fs.existsSync(f));
        
        this.log(`Found ${allFiles.length} markdown files to fix`);
        
        // Fix each file
        for (const filePath of allFiles) {
            try {
                const content = fs.readFileSync(filePath, 'utf8');
                let fixedContent = this.fixLinks(filePath, content);
                fixedContent = this.fixJavaScriptSyntax(fixedContent);
                
                // Only write if content changed
                if (fixedContent !== content) {
                    fs.writeFileSync(filePath, fixedContent, 'utf8');
                    this.log(`Updated: ${filePath}`);
                }
            } catch (error) {
                this.errors.push(`Error processing ${filePath}: ${error.message}`);
            }
        }
        
        // Generate report
        this.generateReport();
    }

    // Generate fix report
    generateReport() {
        this.log('\n' + '='.repeat(60));
        this.log('DOCUMENTATION LINK FIX REPORT');
        this.log('='.repeat(60));
        
        this.log(`Total fixes applied: ${this.fixCount}`);
        this.log(`Errors encountered: ${this.errors.length}`);
        
        if (this.errors.length > 0) {
            this.log('\n❌ ERRORS:');
            this.errors.forEach((error, i) => {
                this.log(`${i + 1}. ${error}`);
            });
        }
        
        if (this.fixCount > 0) {
            this.log('\n✅ Link fixes completed successfully!');
        } else {
            this.log('\n✅ No link fixes needed.');
        }
    }
}

// Run fix if called directly
if (require.main === module) {
    const fixer = new LinkFixer();
    fixer.fix().catch(error => {
        console.error('Fix failed:', error);
        process.exit(1);
    });
}

module.exports = LinkFixer;