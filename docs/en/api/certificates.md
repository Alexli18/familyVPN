# Certificate Management API

📍 **Navigation**: [Home](../../../README.md) > [Documentation](../../README.md) > [English](../README.md) > [API](README.md) > Certificates

🌐 **Language**: [English](../../en/api/certificates.md) | [Русский](../../ru/api/certificates.md)

## 📚 Section Navigation
- [🏠 API Overview](README.md)
- [🔐 Authentication](authentication.md)
- [📜 Certificates](certificates.md) ← You are here
- [🖥️ System](system.md)
- [💻 Examples](examples.md)

This document describes the certificate management endpoints for the Family VPN Server API.

## Overview

The certificate management API allows you to create, list, view, and revoke client certificates for VPN access. All endpoints require authentication.

## Endpoints

### POST /api/generate-cert

Generate a new client certificate and configuration.

**Authentication:** Required

**Request:**
```http
POST /api/generate-cert
Cookie: accessToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "clientName": "john-laptop",
  "email": "john@example.com" // optional
}
```

**Response (Success):**
```http
HTTP/1.1 200 OK
Content-Type: application/x-openvpn-profile
Content-Disposition: attachment; filename="john-laptop.ovpn"

client
dev tun
proto udp
remote your-server-ip 1194
resolv-retry infinite
nobind
persist-key
persist-tun
...
<ca>
-----BEGIN CERTIFICATE-----
...
-----END CERTIFICATE-----
</ca>
<cert>
-----BEGIN CERTIFICATE-----
...
-----END CERTIFICATE-----
</cert>
<key>
-----BEGIN PRIVATE KEY-----
...
-----END PRIVATE KEY-----
</key>
```

**Response (Error):**
```http
HTTP/1.1 400 Bad Request

{
  "success": false,
  "error": "Client name already exists"
}
```

**Validation Rules:**
- `clientName`: Required, 3-50 characters, alphanumeric and hyphens only
- `email`: Optional, valid email format

### GET /api/certificates

List all client certificates.

**Authentication:** Required

**Request:**
```http
GET /api/certificates
Cookie: accessToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response:**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "certificates": [
    {
      "id": "1",
      "clientName": "john-laptop",
      "email": "john@example.com",
      "createdAt": "2025-01-15T10:30:00Z",
      "expiresAt": "2026-01-15T10:30:00Z",
      "status": "active",
      "serialNumber": "01"
    },
    {
      "id": "2",
      "clientName": "mary-phone",
      "email": "mary@example.com",
      "createdAt": "2025-01-16T14:20:00Z",
      "expiresAt": "2026-01-16T14:20:00Z",
      "status": "active",
      "serialNumber": "02"
    }
  ]
}
```

### GET /api/certificates/:id

Get details of a specific certificate.

**Authentication:** Required

**Request:**
```http
GET /api/certificates/1
Cookie: accessToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response:**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "certificate": {
    "id": "1",
    "clientName": "john-laptop",
    "email": "john@example.com",
    "createdAt": "2025-01-15T10:30:00Z",
    "expiresAt": "2026-01-15T10:30:00Z",
    "status": "active",
    "serialNumber": "01",
    "subject": "CN=john-laptop",
    "issuer": "CN=Family VPN CA",
    "fingerprint": "SHA256:1234567890abcdef..."
  }
}
```

### DELETE /api/certificates/:id

Revoke a client certificate.

**Authentication:** Required

**Request:**
```http
DELETE /api/certificates/1
Cookie: accessToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response:**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "message": "Certificate revoked successfully"
}
```

## Certificate Lifecycle

1. **Generation**: Create new certificate with unique client name
2. **Active**: Certificate is valid and can be used for VPN connections
3. **Expiring**: Certificate is approaching expiration date
4. **Revoked**: Certificate has been manually revoked and cannot be used
5. **Expired**: Certificate has passed its expiration date

## Rate Limiting

Certificate generation is rate limited to prevent abuse:
- **Certificate generation**: 10 requests per hour per authenticated user

## Security Considerations

- Client names must be unique across the system
- Private keys are never returned in list or detail endpoints
- Revoked certificates are immediately added to the Certificate Revocation List (CRL)
- All certificate operations are logged for audit purposes

## Related Documents

- [Authentication API](authentication.md)
- [System API](system.md)
- [API Examples](examples.md)