# Implementation Plan

- [x] 1. Remove alerting system completely
  - Delete `src/services/alerting-service.js` file entirely
  - Remove alerting service initialization from `src/server.js`
  - Remove all alerting method calls from `src/services/auth-service.js`
  - Remove `/api/test-alert` endpoint from `src/server.js`
  - Remove nodemailer dependency from `package.json`
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 2. Simplify logging service implementation
  - Remove correlation ID parameter from all logging methods in `src/services/logging-service.js`
  - Remove `generateIntegrityHash()` method and tamper-evident logging features
  - Merge security logger into main logger (single winston instance)
  - Simplify log format by removing correlation ID from printf formatter
  - Keep daily rotation functionality as it's useful for families
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 3. Update all logging calls throughout codebase
  - Remove correlation ID parameters from logging calls in `src/server.js`
  - Remove correlation ID parameters from logging calls in `src/services/auth-service.js`
  - Remove correlation ID parameters from logging calls in `src/utils/certificate-manager.js`
  - Update any other files that use logging with correlation IDs
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 4. Simplify health monitoring service
  - Remove complex system monitoring methods (`checkSystemHealth`, `checkOpenVPNHealth`, `checkDiskHealth`) from `src/services/metrics-service.js`
  - Remove periodic health check intervals and `performHealthCheck` method
  - Remove OpenVPN process monitoring functionality
  - Keep basic `/health` endpoint with simple status response
  - Keep basic HTTP request counting as it's lightweight and useful
  - Rename class from `HealthMonitoringService` to `BasicHealthService`
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 5. Update server.js to remove complex service integrations
  - Remove alerting service initialization and imports from `src/server.js`
  - Simplify logging calls by removing correlation ID parameters
  - Remove complex health monitoring integration while keeping basic `/health` endpoint
  - Remove `/api/test-alert` endpoint completely
  - Keep essential security middleware and authentication
  - Update error handling to use simplified logging calls
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 6. Simplify certificate management (if enhanced version exists)
  - Check if `src/utils/enhanced-certificate-manager.js` exists and remove automated renewal features
  - Remove complex certificate validation and integrity checking methods
  - Remove certificate integrity hashing functionality
  - Keep basic certificate generation with proper file permissions
  - Keep CRL generation as it's simple and useful for families
  - Update certificate-related logging to use simplified logging calls
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 7. Clean up dependencies and configuration
  - Remove `nodemailer` dependency from `package.json`
  - Update npm test scripts to work with simplified services
  - Remove any alerting-related environment variables from documentation
  - Verify Docker configuration doesn't reference removed alerting dependencies
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 8. Update authentication service integration
  - Remove alerting service dependency from `src/services/auth-service.js` constructor
  - Remove alerting method calls from authentication failure handling
  - Simplify logging calls by removing correlation ID parameters
  - Keep all essential security features (JWT, bcrypt, rate limiting)
  - Update error handling to use simplified logging
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 9. Test and validate simplified system
  - Run existing authentication tests to ensure functionality is preserved
  - Test certificate generation endpoint works correctly
  - Test basic health endpoint returns simple status
  - Verify Docker build and deployment still work
  - Test VPN server startup and basic connectivity
  - Verify all essential security features still function
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 10. Clean up test files and move to proper directory
  - Move any test files from root directory to `test/` directory
  - Update import paths in moved test files
  - Update package.json scripts to reference tests in correct location
  - Remove any temporary or debug files created during development
  - Verify all tests pass after cleanup
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_