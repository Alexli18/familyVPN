# System API

📍 **Navigation**: [Home](../../../README.md) > [Documentation](../../README.md) > [English](../README.md) > [API](README.md) > System

🌐 **Language**: [English](../../en/api/system.md) | [Русский](../../ru/api/system.md)

## 📚 Section Navigation
- [🏠 API Overview](README.md)
- [🔐 Authentication](authentication.md)
- [📜 Certificates](certificates.md)
- [🖥️ System](system.md) ← You are here
- [💻 Examples](examples.md)

This document describes the system monitoring and status endpoints for the Family VPN Server API.

## Overview

The system API provides endpoints for health checks, system status monitoring, and log access. The health endpoint is public, while status and logs require authentication.

## Endpoints

### GET /health

Health check endpoint (no authentication required).

**Request:**
```http
GET /health
```

**Response:**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "status": "healthy",
  "timestamp": "2025-01-15T10:30:00Z",
  "uptime": 3600,
  "version": "1.0.0"
}
```

### GET /api/status

Get system status and statistics.

**Authentication:** Required

**Request:**
```http
GET /api/status
Cookie: accessToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response:**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "status": {
    "server": {
      "status": "running",
      "uptime": 3600,
      "version": "1.0.0",
      "nodeVersion": "18.17.0"
    },
    "openvpn": {
      "status": "running",
      "connectedClients": 3,
      "totalConnections": 15,
      "bytesReceived": 1048576,
      "bytesSent": 2097152
    },
    "certificates": {
      "total": 5,
      "active": 4,
      "revoked": 1,
      "expiringSoon": 0
    },
    "system": {
      "cpuUsage": 15.2,
      "memoryUsage": 45.8,
      "diskUsage": 23.1
    }
  }
}
```

### GET /api/logs

Get recent log entries.

**Authentication:** Required

**Query Parameters:**
- `level`: Filter by log level (error, warn, info, debug)
- `limit`: Number of entries to return (default: 100, max: 1000)
- `since`: ISO timestamp to get logs since

**Request:**
```http
GET /api/logs?level=error&limit=50&since=2025-01-15T00:00:00Z
Cookie: accessToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response:**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "logs": [
    {
      "timestamp": "2025-01-15T10:30:00Z",
      "level": "error",
      "message": "Authentication failed",
      "clientIP": "192.168.1.100",
      "username": "admin",
      "correlationId": "abc123"
    }
  ]
}
```

## Status Information

### Server Status
- **status**: Current server state (running, stopped, error)
- **uptime**: Server uptime in seconds
- **version**: Application version
- **nodeVersion**: Node.js runtime version

### OpenVPN Status
- **status**: OpenVPN daemon state (running, stopped, error)
- **connectedClients**: Number of currently connected clients
- **totalConnections**: Total connections since server start
- **bytesReceived**: Total bytes received from clients
- **bytesSent**: Total bytes sent to clients

### Certificate Statistics
- **total**: Total number of certificates issued
- **active**: Number of active (non-revoked, non-expired) certificates
- **revoked**: Number of revoked certificates
- **expiringSoon**: Number of certificates expiring within 30 days

### System Metrics
- **cpuUsage**: Current CPU usage percentage
- **memoryUsage**: Current memory usage percentage
- **diskUsage**: Current disk usage percentage

## Log Levels

- **error**: Error conditions that need immediate attention
- **warn**: Warning conditions that should be monitored
- **info**: Informational messages about normal operations
- **debug**: Detailed information for debugging purposes

## Rate Limiting

System endpoints have the following rate limits:
- **General API**: 100 requests per hour per authenticated user
- **Health endpoint**: No rate limiting (public endpoint)

## Error Handling

All system endpoints return consistent error responses:

```http
HTTP/1.1 500 Internal Server Error
Content-Type: application/json

{
  "success": false,
  "error": "System monitoring unavailable",
  "details": {
    "component": "openvpn",
    "message": "Unable to connect to OpenVPN management interface"
  }
}
```

## Security Headers

All API responses include security headers:
```http
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

## Related Documents

- [Authentication API](authentication.md)
- [Certificate Management API](certificates.md)
- [API Examples](examples.md)