---
inclusion: always
---

# Repository Cleanliness Rules

## 🧹 Keep Repository Clean and Organized

### File Organization Rules

1. **Test Files Location**
   - All test files MUST be placed in the `test/` directory
   - Test files should follow naming convention: `test-*.js` or `*.test.js`
   - Never leave test files in the root directory

2. **Temporary Files Cleanup**
   - Remove any temporary files created during development
   - Clean up debug files, logs, and scratch files
   - Use `.gitignore` to prevent accidental commits of temporary files

3. **Script Organization**
   - Utility scripts belong in `scripts/` directory
   - Setup and configuration scripts should be properly documented
   - Remove unused or obsolete scripts

4. **Documentation Structure**
   - Keep README files updated and relevant
   - Security documentation in `SECURITY.md`
   - API documentation should be comprehensive
   - Remove outdated documentation

### Package.json Maintenance

1. **Scripts Section**
   - Add proper test scripts that can be run with `npm test`
   - Include individual test scripts for specific test suites
   - Remove unused or broken scripts

2. **Dependencies**
   - Keep dependencies up to date
   - Remove unused dependencies
   - Separate dev dependencies from production dependencies

### Code Quality Rules

1. **After Every Code Change**
   - Run relevant tests to verify functionality
   - Check for syntax errors and runtime issues
   - Verify imports and module paths are correct
   - Test the application startup process

2. **Before Task Completion**
   - Move all test files to appropriate directories
   - Update package.json scripts if new tests were added
   - Clean up any temporary files or debug code
   - Verify all functionality still works after cleanup

### Example Cleanup Checklist

- [ ] All test files moved to `test/` directory
- [ ] Import paths updated for moved files
- [ ] Package.json scripts updated with test commands
- [ ] Temporary files removed
- [ ] All tests pass after cleanup
- [ ] Server starts successfully after changes
- [ ] Documentation updated if needed

### Verification Commands

After cleanup, always run:
```bash
npm test                    # Run all tests
npm start                   # Verify server starts
node test/test-*.js        # Run individual tests
```

This ensures the repository remains clean, organized, and fully functional.