# Family VPN Server API Documentation

📍 **Navigation**: [Home](../../../README.md) > [Documentation](../../README.md) > [English](../README.md) > API Reference

🌐 **Language**: [English](../../en/api/README.md) | [Русский](../../ru/api/README.md)

## 📚 Section Navigation
- [🏠 API Overview](README.md) ← You are here
- [🔐 Authentication](authentication.md)
- [📜 Certificates](certificates.md)
- [🖥️ System](system.md)
- [💻 Examples](examples.md)

Welcome to the Family VPN Server API documentation. This API provides programmatic access to VPN management functions.

## Base URL

```
https://your-server-address:3000
```

## Quick Start

1. [Authenticate](authentication.md#post-authlogin) to get access tokens
2. [Generate certificates](certificates.md#post-apigenerate-cert) for VPN clients
3. [Monitor system status](system.md#get-apistatus) and health

## API Reference

### [Authentication API](authentication.md)
- **POST /auth/login** - User authentication and token generation
- **POST /auth/refresh** - Refresh access tokens
- **POST /auth/logout** - Logout and clear tokens

### [Certificate Management API](certificates.md)
- **POST /api/generate-cert** - Generate new client certificates
- **GET /api/certificates** - List all certificates
- **GET /api/certificates/:id** - Get certificate details
- **DELETE /api/certificates/:id** - Revoke certificates

### [System API](system.md)
- **GET /health** - Health check (no authentication required)
- **GET /api/status** - System status and statistics
- **GET /api/logs** - Access system logs

## Code Examples

See [API Examples](examples.md) for complete code examples in:
- JavaScript/Node.js
- Python
- cURL
- Browser JavaScript

## Security

All API endpoints implement:
- JWT-based authentication
- Rate limiting
- HTTPS encryption
- Security headers
- Request validation

## Error Handling

All endpoints return consistent JSON error responses with appropriate HTTP status codes. See individual endpoint documentation for specific error scenarios.

## Rate Limits

- **Authentication**: 5 requests per 15 minutes per IP
- **Certificate generation**: 10 requests per hour per user
- **General API**: 100 requests per hour per user

## Support

For issues or questions:
1. Check the [examples](examples.md) for common use cases
2. Review individual endpoint documentation
3. Check system logs via the [logs endpoint](system.md#get-apilogs)

## 🔗 Related Documentation
- [🔐 Security Documentation](../security/README.md) - Security features and authentication
- [⚙️ Configuration Guides](../configuration/README.md) - API configuration settings
- [🚀 Deployment Guides](../deployment/README.md) - API deployment considerations
- [❓ Troubleshooting](../troubleshooting/README.md) - API troubleshooting guides

## ⚡ Quick Links
- [🏠 Home](../../../README.md)
- [📚 Documentation](../../README.md)
- [🔧 Installation](../installation/README.md)
- [🛡️ Security](../security/README.md)

---
**Previous**: [Documentation Home](../../README.md) | **Next**: [Authentication API](authentication.md) | **Up**: [English Documentation](../README.md)