# Design Document

## Overview

The web interface for the Family VPN Server will be built as a secure, responsive web application using Express.js, providing authentication and certificate management capabilities. The interface will consist of two main pages: a login page for user authentication and a certificate management page for generating and managing client certificates.

## Architecture

### Technology Stack
- **Backend**: Express.js with session-based authentication
- **Frontend**: Vanilla HTML, CSS, and JavaScript (no framework dependencies)
- **Session Management**: express-session with secure configuration
- **Authentication**: Simple username/password with bcrypt hashing
- **File Serving**: Express static middleware for assets
- **Certificate Integration**: Existing certificate-manager.js utilities

### Application Structure
```
src/
├── server.js (existing - enhanced with web routes)
├── routes/
│   ├── auth.js (authentication routes)
│   └── certificates.js (certificate management routes)
├── middleware/
│   ├── auth-middleware.js (existing - enhanced)
│   └── session-middleware.js (new)
├── public/
│   ├── css/
│   │   └── styles.css
│   ├── js/
│   │   ├── login.js
│   │   └── certificates.js
│   └── images/
└── views/
    ├── login.html
    └── certificates.html
```

## Components and Interfaces

### 1. Authentication System

#### Session Configuration
- Use express-session with secure settings
- HTTP-only cookies to prevent XSS
- Secure cookies in production (HTTPS)
- Session timeout of 30 minutes
- Session regeneration on login/logout

#### Password Security
- Store hashed passwords using bcrypt
- Minimum password requirements
- Rate limiting on login attempts
- CSRF protection for forms

#### Authentication Middleware
```javascript
function requireAuth(req, res, next) {
  if (req.session && req.session.authenticated) {
    return next();
  }
  res.redirect('/login');
}
```

### 2. Web Routes

#### Authentication Routes
- `GET /login` - Display login form
- `POST /login` - Process login credentials
- `POST /logout` - Destroy session and redirect
- `GET /` - Redirect to login or certificates based on auth status

#### Certificate Management Routes
- `GET /certificates` - Display certificate management page
- `POST /certificates/generate` - Generate new client certificate
- `GET /certificates/download/:name` - Download .ovpn file
- `POST /certificates/revoke/:name` - Revoke certificate
- `GET /certificates/list` - API endpoint for certificate list

### 3. Frontend Components

#### Login Page
- Clean, centered login form
- Username and password fields
- Error message display
- Loading state during submission
- Responsive design for mobile/desktop

#### Certificate Management Page
- Header with logout button
- Certificate generation form
- List of existing certificates
- Download/revoke actions
- Success/error notifications
- Real-time form validation

### 4. Security Features

#### Input Validation
- Server-side validation for all inputs
- Client name format validation (alphanumeric, hyphens, underscores)
- Path traversal prevention for file downloads
- XSS protection with proper escaping

#### Rate Limiting
- Login attempt rate limiting (5 attempts per 15 minutes)
- Certificate generation rate limiting (10 per hour)
- Global request rate limiting

#### HTTPS Enforcement
- Redirect HTTP to HTTPS in production
- Secure headers (HSTS, X-Frame-Options, etc.)
- Content Security Policy

## Data Models

### Session Data
```javascript
{
  authenticated: boolean,
  username: string,
  loginTime: Date,
  lastActivity: Date
}
```

### Certificate Data
```javascript
{
  name: string,
  createdAt: Date,
  status: 'active' | 'revoked',
  serialNumber: string,
  expiresAt: Date
}
```

### User Configuration
```javascript
{
  username: string,
  passwordHash: string,
  createdAt: Date,
  lastLogin: Date
}
```

## Error Handling

### Client-Side Error Handling
- Form validation with immediate feedback
- Network error handling with retry options
- User-friendly error messages
- Loading states and progress indicators

### Server-Side Error Handling
- Comprehensive error logging
- Graceful error responses
- Security-focused error messages (no sensitive info leakage)
- Proper HTTP status codes

### Certificate Generation Errors
- PKI initialization failures
- Duplicate certificate name handling
- File system permission errors
- Easy-RSA command failures

## Testing Strategy

### Unit Tests
- Authentication middleware testing
- Route handler testing
- Certificate generation logic testing
- Input validation testing

### Integration Tests
- End-to-end login flow
- Certificate generation and download flow
- Session management testing
- Security header verification

### Security Tests
- Authentication bypass attempts
- Session fixation testing
- CSRF protection verification
- Path traversal prevention testing

### Frontend Tests
- Form validation testing
- AJAX request handling
- Responsive design testing
- Cross-browser compatibility

## Configuration

### Environment Variables
```bash
# Web Interface Configuration
WEB_PORT=3000
WEB_SESSION_SECRET=your-secret-key-here
WEB_ADMIN_USERNAME=admin
WEB_ADMIN_PASSWORD_HASH=bcrypt-hash-here

# Security Configuration
WEB_HTTPS_ONLY=true
WEB_RATE_LIMIT_ENABLED=true
WEB_SESSION_TIMEOUT=1800000  # 30 minutes

# Certificate Integration
CERT_MANAGER_PATH=/path/to/certificates
PKI_PATH=/path/to/pki
```

### Default User Setup
- Initial admin user creation during setup
- Password change requirement on first login
- User management through configuration files

## Integration with Existing System

### Certificate Manager Integration
- Utilize existing `certificate-manager.js` utilities
- Extend with web-specific certificate listing
- Add certificate status tracking
- Integrate with existing PKI structure

### Logging Integration
- Use existing Winston logging configuration
- Add web-specific log categories
- Security event logging (login attempts, certificate operations)
- Audit trail for certificate management

### Configuration Integration
- Extend existing config.js with web interface settings
- Maintain compatibility with existing environment variables
- Add web-specific configuration validation