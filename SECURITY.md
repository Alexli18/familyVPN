# VPN Server Security Features

## Authentication System

The VPN server now implements a secure authentication system that replaces the previous hardcoded credentials with industry-standard security practices.

### Key Security Features

#### 1. Secure Credential Management
- **No hardcoded credentials**: All credentials are stored in environment variables
- **bcrypt password hashing**: Passwords are hashed using bcrypt with 12 salt rounds
- **Environment variable configuration**: Sensitive data is loaded from `.env` file

#### 2. JWT Token Authentication
- **Access tokens**: Short-lived tokens (15 minutes) for API access
- **Refresh tokens**: Long-lived tokens (7 days) for token renewal
- **Secure token storage**: Tokens stored in HTTP-only cookies
- **Token validation**: Includes issuer, audience, and expiration validation

#### 3. Rate Limiting and Brute Force Protection
- **Authentication rate limiting**: Maximum 5 attempts per 15 minutes per IP
- **Progressive delays**: Increasing delays after failed attempts
- **Account lockout**: Temporary lockout after 5 failed attempts
- **IP-based tracking**: Failed attempts tracked per username/IP combination

#### 4. Security Headers and Middleware
- **Security headers**: X-Content-Type-Options, X-Frame-Options, X-XSS-Protection
- **Request logging**: Structured logging with correlation IDs
- **Error handling**: Generic error messages to prevent information disclosure

#### 5. Session Management
- **Secure cookies**: HTTP-only, secure, and SameSite attributes
- **Automatic token refresh**: Seamless token renewal for valid sessions
- **Session cleanup**: Proper logout and token revocation

## Setup Instructions

### 1. Initial Authentication Setup

Run the authentication setup script to create your admin credentials:

```bash
npm run setup-auth
```

This will:
- Prompt for admin username and password
- Generate secure bcrypt password hash
- Create JWT secrets
- Save configuration to `.env` file

### 2. Environment Configuration

The `.env` file contains all authentication configuration:

```env
# Admin Credentials
VPN_USERNAME=your_username
VPN_PASSWORD_HASH=bcrypt_hash_here

# JWT Configuration
JWT_SECRET=secure_random_secret
JWT_REFRESH_SECRET=secure_refresh_secret
JWT_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Security Settings
ENFORCE_IP_VALIDATION=false
MAX_FAILED_ATTEMPTS=5
LOCKOUT_DURATION=900000
```

### 3. Security Best Practices

- **Keep `.env` file secure**: Never commit to version control
- **Use strong passwords**: Minimum 8 characters with complexity
- **Regular token rotation**: JWT secrets should be rotated periodically
- **Monitor logs**: Review authentication logs for suspicious activity
- **Enable HTTPS**: Use HTTPS in production environments

## API Endpoints

### Authentication Endpoints

#### POST /auth/login
Authenticate user and receive tokens.

**Request:**
```json
{
  "username": "admin",
  "password": "your_password"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Authentication successful",
  "expiresIn": "15m"
}
```

#### POST /auth/refresh
Refresh access token using refresh token.

**Response:**
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "expiresIn": "15m"
}
```

#### POST /auth/logout
Logout and clear tokens.

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### Protected Endpoints

#### POST /api/generate-cert
Generate VPN client certificate (requires authentication).

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
- Downloads `.ovpn` configuration file

## Security Monitoring

### Logging

All security events are logged with structured data:

```json
{
  "timestamp": "2025-07-25T13:50:35.376Z",
  "level": "warn",
  "message": "Authentication failed",
  "username": "admin",
  "clientIP": "192.168.1.100",
  "error": "Invalid credentials",
  "correlationId": "abc123..."
}
```

### Metrics

The system tracks:
- Failed authentication attempts
- Account lockouts
- Token generation and validation
- API endpoint access

### Alerts

Monitor for:
- Multiple failed authentication attempts
- Account lockout events
- Unusual access patterns
- Token validation failures

## Testing

Run security tests to verify all features:

```bash
# Test authentication service
node test-auth-simple.js

# Test all security features
node test-security-features.js
```

## Compliance

This implementation follows security best practices:
- **OWASP Authentication Guidelines**
- **JWT Security Best Practices**
- **Password Storage Guidelines**
- **Rate Limiting Standards**
- **Secure Session Management**