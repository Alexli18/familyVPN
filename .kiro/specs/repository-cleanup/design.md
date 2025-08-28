# Design Document

## Overview

The repository cleanup design focuses on systematically organizing and removing redundant files while maintaining the functional integrity of the Family VPN Server. The cleanup will be performed in phases to ensure safety and allow for rollback if needed.

## Architecture

### Cleanup Strategy
The cleanup follows a phased approach:
1. **Analysis Phase**: Identify redundant, obsolete, and misplaced files
2. **Backup Phase**: Create a safety backup before major changes
3. **Cleanup Phase**: Remove or reorganize files systematically
4. **Validation Phase**: Verify system functionality after cleanup

### File Classification System
Files will be classified into categories:
- **Active**: Currently used and necessary files
- **Redundant**: Duplicate or superseded files
- **Obsolete**: No longer needed files
- **Misplaced**: Files in wrong locations that need moving

## Components and Interfaces

### Certificate Backup Cleanup Component
**Purpose**: Manage the extensive certificate backup directories

**Analysis Results**:
- Found 14 certificate backup directories from July-August 2025
- Many contain identical or near-identical content
- Consuming significant disk space unnecessarily

**Cleanup Strategy**:
- Retain the 3 most recent backups (latest from each major date)
- Remove intermediate backups that don't add value
- Keep: `backup-2025-08-25T15-40-30-014Z` (most recent), `backup-2025-08-01T12-17-22-020Z` (August milestone), `backup-2025-07-26T11-47-10-575Z` (July milestone)

### Test File Organization Component
**Purpose**: Consolidate and organize test files

**Current Issues**:
- All test files are already in `/test` directory (good)
- Package.json references non-existent test files:
  - `test-web-interface.js` (missing)
  - `test-web-security.js` (missing)
- Some test files may be duplicates or obsolete

**Cleanup Strategy**:
- Remove broken npm script references
- Identify and remove duplicate test files
- Consolidate similar test functionality

### Script Directory Cleanup Component
**Purpose**: Remove obsolete and duplicate scripts

**Analysis**:
- Multiple scripts with similar functionality
- Some scripts may be development artifacts
- Production scripts should be clearly separated

### Configuration File Management Component
**Purpose**: Streamline configuration files

**Current State**:
- Multiple environment files (`.env`, `.env.example`, `.env.production`)
- Docker compose files for different environments
- Various configuration backups in certificate directories

**Strategy**:
- Maintain clear separation between example, development, and production configs
- Remove redundant configuration backups
- Ensure consistent naming conventions

### Documentation Cleanup Component
**Purpose**: Update and consolidate documentation

**Current Files**:
- Multiple README and documentation files
- Security documentation in multiple formats
- API documentation
- Troubleshooting guides

## Data Models

### Cleanup Manifest
```javascript
{
  "backupsToRemove": [
    "certificate-backups/backup-2025-07-26T11-28-10-684Z",
    "certificate-backups/backup-2025-07-26T11-42-46-821Z",
    // ... other old backups
  ],
  "filesToMove": [
    // Files that need relocation
  ],
  "filesToRemove": [
    // Obsolete files to delete
  ],
  "scriptsToUpdate": [
    // Package.json scripts to fix
  ]
}
```

### File Analysis Result
```javascript
{
  "path": "string",
  "category": "active|redundant|obsolete|misplaced",
  "reason": "string",
  "action": "keep|remove|move|update",
  "dependencies": ["array of dependent files"]
}
```

## Error Handling

### Safety Measures
1. **Backup Creation**: Create a complete backup before any destructive operations
2. **Incremental Cleanup**: Process files in small batches to allow for rollback
3. **Dependency Checking**: Verify no active code references files before removal
4. **Validation Testing**: Run test suite after each cleanup phase

### Rollback Strategy
- Maintain a cleanup log with all operations performed
- Provide rollback scripts for each cleanup phase
- Test system functionality after each major cleanup step

### Error Recovery
- If tests fail after cleanup, immediately rollback the last phase
- Provide detailed logging of all file operations
- Maintain checksums for critical files

## Testing Strategy

### Pre-Cleanup Validation
1. Run full test suite to establish baseline
2. Verify all npm scripts execute successfully
3. Test Docker container builds and runs
4. Validate server startup and basic functionality

### Post-Cleanup Validation
1. Re-run full test suite to ensure no regressions
2. Verify all remaining npm scripts work correctly
3. Test Docker builds with cleaned repository
4. Validate server functionality and certificate generation

### Cleanup-Specific Tests
1. Verify removed files are not referenced in code
2. Test that moved files maintain correct import paths
3. Validate configuration files are properly formatted
4. Ensure documentation links are not broken

## Implementation Phases

### Phase 1: Analysis and Backup
- Scan repository for file classifications
- Create safety backup
- Generate cleanup manifest

### Phase 2: Certificate Backup Cleanup
- Remove old certificate backup directories
- Verify remaining backups are functional

### Phase 3: Test and Script Cleanup
- Fix broken npm script references
- Remove duplicate or obsolete test files
- Clean up script directory

### Phase 4: Configuration Cleanup
- Consolidate configuration files
- Remove redundant environment files
- Update documentation

### Phase 5: Final Validation
- Run comprehensive test suite
- Verify all functionality works
- Update documentation to reflect changes

## Security Considerations

### Data Protection
- Never remove active certificates or keys
- Maintain backup of PKI infrastructure
- Preserve security configurations

### Access Control
- Ensure cleanup doesn't modify file permissions
- Maintain proper ownership of sensitive files
- Preserve security-related scripts and configurations

## Performance Impact

### Disk Space Recovery
- Estimated 200-500MB recovery from certificate backup cleanup
- Reduced repository clone time
- Faster file system operations

### Build Performance
- Reduced Docker context size
- Faster npm install (if unused dependencies removed)
- Improved IDE performance with fewer files