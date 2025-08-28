# Authentication API

📍 **Navigation**: [Home](../../../README.md) > [Documentation](../../README.md) > [English](../README.md) > [API](README.md) > Authentication

🌐 **Language**: [English](../../en/api/authentication.md) | [Русский](../../ru/api/authentication.md)

## 📚 Section Navigation
- [🏠 API Overview](README.md)
- [🔐 Authentication](authentication.md) ← You are here
- [📜 Certificates](certificates.md)
- [🖥️ System](system.md)
- [💻 Examples](examples.md)

This document describes the authentication endpoints for the Family VPN Server API.

## Overview

The API uses JWT (JSON Web Token) based authentication. Most endpoints require a valid access token.

### Authentication Flow

1. **Login** to get access and refresh tokens
2. **Use access token** in Authorization header for API calls
3. **Refresh token** when access token expires
4. **Logout** to invalidate tokens

## Endpoints

### POST /auth/login

Authenticate user and receive JWT tokens.

**Request:**
```http
POST /auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "your_password"
}
```

**Response (Success):**
```http
HTTP/1.1 200 OK
Set-Cookie: accessToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...; HttpOnly; Secure
Set-Cookie: refreshToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...; HttpOnly; Secure

{
  "success": true,
  "message": "Authentication successful",
  "expiresIn": "15m"
}
```

**Response (Error):**
```http
HTTP/1.1 401 Unauthorized

{
  "success": false,
  "error": "Invalid credentials"
}
```

**Rate Limiting:**
- Maximum 5 attempts per 15 minutes per IP address
- Account lockout after 5 failed attempts

### POST /auth/refresh

Refresh access token using refresh token.

**Request:**
```http
POST /auth/refresh
Cookie: refreshToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response (Success):**
```http
HTTP/1.1 200 OK
Set-Cookie: accessToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...; HttpOnly; Secure

{
  "success": true,
  "message": "Token refreshed successfully",
  "expiresIn": "15m"
}
```

**Response (Error):**
```http
HTTP/1.1 401 Unauthorized

{
  "success": false,
  "error": "Invalid refresh token"
}
```

### POST /auth/logout

Logout user and clear tokens.

**Request:**
```http
POST /auth/logout
Cookie: accessToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response:**
```http
HTTP/1.1 200 OK
Set-Cookie: accessToken=; HttpOnly; Secure; Expires=Thu, 01 Jan 1970 00:00:00 GMT
Set-Cookie: refreshToken=; HttpOnly; Secure; Expires=Thu, 01 Jan 1970 00:00:00 GMT

{
  "success": true,
  "message": "Logged out successfully"
}
```

## Security Considerations

- All authentication endpoints use HTTPS only
- Tokens are stored in HttpOnly, Secure cookies
- Rate limiting prevents brute force attacks
- Failed login attempts are logged for security monitoring

## 🔗 Related Documentation
- [📜 Certificate Management API](certificates.md) - Manage VPN certificates
- [🖥️ System API](system.md) - System status and monitoring
- [💻 API Examples](examples.md) - Code examples and integration
- [🛡️ Security Documentation](../security/authentication.md) - Authentication system details
- [⚙️ Security Configuration](../configuration/security.md) - Authentication configuration

## ⚡ Quick Links
- [🏠 Home](../../../README.md)
- [📚 Documentation](../../README.md)
- [🔌 API Overview](README.md)
- [🛡️ Security](../security/README.md)

---
**Previous**: [API Overview](README.md) | **Next**: [Certificate Management API](certificates.md) | **Up**: [API Documentation](README.md)