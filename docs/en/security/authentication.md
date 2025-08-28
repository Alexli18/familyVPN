# Authentication System

## Overview

The VPN server implements a robust authentication system that replaces hardcoded credentials with industry-standard security practices. The system uses JWT tokens for API access and session-based authentication for the web interface.

## Authentication Architecture

### Dual Authentication Systems

The server supports two independent authentication mechanisms:

1. **JWT Token Authentication**: For API access and programmatic interactions
2. **Session-based Authentication**: For web interface access

Both systems share the same credential store but operate independently for maximum flexibility.

## JWT Token Authentication

### Token Types

#### Access Tokens
- **Lifetime**: 15 minutes (configurable)
- **Purpose**: API access authorization
- **Storage**: HTTP-only cookies or Authorization header
- **Algorithm**: HMAC-SHA256

#### Refresh Tokens
- **Lifetime**: 7 days (configurable)
- **Purpose**: Access token renewal
- **Storage**: Secure HTTP-only cookies
- **Rotation**: New refresh token issued on each use

### Token Structure

```json
{
  "header": {
    "alg": "HS256",
    "typ": "JWT"
  },
  "payload": {
    "sub": "admin",
    "iat": 1640995200,
    "exp": 1640996100,
    "iss": "family-vpn-server",
    "aud": "vpn-api"
  }
}
```

### Token Security Features

- **Secure Signing**: HMAC-SHA256 with cryptographically strong secrets
- **Expiration Validation**: Strict expiration time checking
- **Issuer Validation**: Validates token issuer and audience
- **Secure Storage**: HTTP-only, secure, SameSite cookies

## Password Security

### bcrypt Hashing

All passwords are hashed using bcrypt with the following parameters:

- **Algorithm**: bcrypt
- **Salt Rounds**: 12 (configurable)
- **Unique Salts**: Each password gets a unique salt
- **Timing Attack Protection**: Constant-time comparison

### Password Requirements

- **Minimum Length**: 8 characters (recommended: 12+)
- **Complexity**: Mix of uppercase, lowercase, numbers, and symbols
- **No Common Passwords**: Avoid dictionary words and common patterns
- **Regular Rotation**: Change passwords periodically

## Brute Force Protection

### Rate Limiting

The system implements comprehensive rate limiting:

#### Authentication Endpoints
- **Login Attempts**: Maximum 5 attempts per 15 minutes per IP
- **Progressive Delays**: Increasing delays after failed attempts
- **Account Lockout**: Temporary lockout after 5 failed attempts
- **IP Tracking**: Failed attempts tracked per username/IP combination

#### API Endpoints
- **General API**: 100 requests per 15 minutes per IP
- **Certificate Operations**: 10 requests per 15 minutes per IP
- **System Operations**: 20 requests per 15 minutes per IP

### Lockout Mechanism

```javascript
// Lockout configuration
{
  maxFailedAttempts: 5,
  lockoutDuration: 900000, // 15 minutes
  progressiveDelay: true,
  trackByIP: true,
  trackByUsername: true
}
```

### Protection Features

- **Account Lockout**: Temporary account suspension
- **IP-based Blocking**: Block suspicious IP addresses
- **Progressive Delays**: Increasing delays between attempts
- **Audit Logging**: Complete logging of all authentication events

## Session Management

### Web Interface Sessions

#### Session Configuration
- **Session Store**: Memory-based (configurable to Redis)
- **Session Lifetime**: 24 hours (configurable)
- **Session Secret**: Cryptographically strong random secret
- **Cookie Security**: HTTP-only, secure, SameSite attributes

#### Session Security Features
- **Automatic Cleanup**: Expired session removal
- **Session Regeneration**: New session ID on login
- **Secure Cookies**: Protection against XSS and CSRF
- **Session Validation**: Regular session integrity checks

### Cookie Security

```javascript
// Cookie configuration
{
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  signed: true
}
```

## Security Headers

### HTTP Security Headers

The system automatically applies security headers:

- **X-Content-Type-Options**: `nosniff`
- **X-Frame-Options**: `DENY`
- **X-XSS-Protection**: `1; mode=block`
- **Strict-Transport-Security**: `max-age=31536000; includeSubDomains`
- **Content-Security-Policy**: Restrictive CSP policy
- **Referrer-Policy**: `strict-origin-when-cross-origin`

### CORS Configuration

```javascript
// CORS settings
{
  origin: process.env.ALLOWED_ORIGINS?.split(',') || false,
  credentials: true,
  optionsSuccessStatus: 200
}
```

## Authentication Setup

### Initial Configuration

1. **Run Authentication Setup**:
   ```bash
   npm run setup-auth
   ```

2. **Configure Environment Variables**:
   ```env
   # Admin Credentials
   VPN_USERNAME=admin
   VPN_PASSWORD_HASH=bcrypt_hash_here
   
   # JWT Configuration
   JWT_SECRET=secure_random_secret
   JWT_REFRESH_SECRET=secure_refresh_secret
   JWT_EXPIRY=15m
   JWT_REFRESH_EXPIRY=7d
   
   # Security Settings
   MAX_FAILED_ATTEMPTS=5
   LOCKOUT_DURATION=900000
   ENFORCE_IP_VALIDATION=false
   ```

### Manual Password Hash Generation

```bash
# Generate bcrypt hash
node -e "
const bcrypt = require('bcrypt');
const password = 'your_secure_password';
const hash = bcrypt.hashSync(password, 12);
console.log('Password hash:', hash);
"
```

## API Authentication

### Authentication Flow

1. **Login Request**:
   ```bash
   curl -X POST http://localhost:3000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"username": "admin", "password": "your_password"}'
   ```

2. **Response**:
   ```json
   {
     "success": true,
     "message": "Authentication successful",
     "user": {
       "username": "admin"
     }
   }
   ```

3. **Token Usage**:
   ```bash
   curl -X GET http://localhost:3000/api/certificates \
     -H "Authorization: Bearer your_access_token"
   ```

### Token Refresh

```bash
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Content-Type: application/json" \
  --cookie "refreshToken=your_refresh_token"
```

## Security Monitoring

### Authentication Events

All authentication events are logged with structured data:

```json
{
  "timestamp": "2025-01-15T10:30:00.000Z",
  "level": "info",
  "message": "Authentication successful",
  "username": "admin",
  "clientIP": "192.168.1.100",
  "userAgent": "Mozilla/5.0...",
  "correlationId": "abc123-def456-ghi789"
}
```

### Failed Authentication Logging

```json
{
  "timestamp": "2025-01-15T10:30:00.000Z",
  "level": "warn",
  "message": "Authentication failed",
  "username": "admin",
  "clientIP": "192.168.1.100",
  "error": "Invalid credentials",
  "attemptCount": 3,
  "correlationId": "abc123-def456-ghi789"
}
```

### Monitoring Metrics

The system tracks:
- **Successful Authentications**: Count and rate
- **Failed Authentication Attempts**: Count, rate, and patterns
- **Account Lockouts**: Frequency and duration
- **Token Generation**: Access and refresh token creation
- **Token Validation**: Success and failure rates
- **Session Activity**: Creation, validation, and cleanup

## Security Testing

### Authentication Tests

```bash
# Test authentication service
npm run test:auth

# Test security features
npm run test:security

# Test rate limiting
npm run test:rate-limiting
```

### Manual Security Testing

1. **Test Brute Force Protection**:
   ```bash
   # Multiple failed login attempts
   for i in {1..10}; do
     curl -X POST http://localhost:3000/api/auth/login \
       -H "Content-Type: application/json" \
       -d '{"username": "admin", "password": "wrong_password"}'
   done
   ```

2. **Test Token Expiration**:
   ```bash
   # Wait for token to expire and test access
   sleep 900  # Wait 15 minutes
   curl -X GET http://localhost:3000/api/certificates \
     -H "Authorization: Bearer expired_token"
   ```

## Troubleshooting

### Common Authentication Issues

#### Invalid Credentials
- **Symptom**: "Authentication failed" error
- **Causes**: Wrong username/password, account locked
- **Solutions**: Verify credentials, check lockout status, reset password

#### Token Validation Errors
- **Symptom**: "Invalid token" or "Token expired" errors
- **Causes**: Expired tokens, invalid signatures, clock skew
- **Solutions**: Refresh tokens, check JWT secrets, synchronize clocks

#### Session Issues
- **Symptom**: Frequent logouts, session not persisting
- **Causes**: Cookie configuration, session store issues
- **Solutions**: Check cookie settings, verify session configuration

### Debugging Authentication

1. **Check Environment Variables**:
   ```bash
   echo $VPN_USERNAME
   echo $JWT_SECRET
   ```

2. **Verify Password Hash**:
   ```bash
   node -e "
   const bcrypt = require('bcrypt');
   const hash = process.env.VPN_PASSWORD_HASH;
   const password = 'test_password';
   console.log('Valid:', bcrypt.compareSync(password, hash));
   "
   ```

3. **Check Authentication Logs**:
   ```bash
   tail -f logs/security-$(date +%Y-%m-%d).log | grep -i auth
   ```

## Best Practices

### Operational Security

1. **Regular Password Updates**: Change passwords every 90 days
2. **JWT Secret Rotation**: Rotate JWT secrets monthly
3. **Monitor Authentication Logs**: Review logs weekly for anomalies
4. **Account Management**: Regular audit of user accounts
5. **Session Cleanup**: Regular cleanup of expired sessions

### Development Security

1. **Secure Defaults**: Use secure configuration by default
2. **Input Validation**: Validate all authentication inputs
3. **Error Handling**: Generic error messages for security
4. **Testing**: Comprehensive security testing
5. **Code Review**: Security-focused code reviews

### Production Security

1. **HTTPS Only**: Force HTTPS in production
2. **Secure Headers**: Enable all security headers
3. **Rate Limiting**: Implement aggressive rate limiting
4. **Monitoring**: Real-time authentication monitoring
5. **Backup**: Secure backup of authentication configuration

## Related Documentation

- [Security Overview](overview.md) - Complete security architecture
- [Encryption and Cryptography](encryption.md) - Cryptographic security
- [Security Monitoring](monitoring.md) - Monitoring and alerting
- [API Documentation](../api/authentication.md) - API authentication details
- [Best Practices](best-practices.md) - Security best practices