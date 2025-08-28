# Web Interface Configuration

📍 **Navigation**: [Home](../../../README.md) > [Documentation](../../README.md) > [English](../README.md) > [Configuration](README.md) > Web Interface

🌐 **Language**: [English](../../en/configuration/web-interface.md) | [Русский](../../ru/configuration/web-interface.md)

## 📚 Section Navigation
- [🏠 Configuration Overview](README.md)
- [🌍 Environment Configuration](environment.md)
- [🛡️ Security Configuration](security.md)
- [🌐 Network Configuration](networking.md)
- [📜 Certificate Configuration](certificates.md)
- [💻 Web Interface Configuration](web-interface.md) ← You are here

The Family VPN Server includes a web-based management interface for easy certificate management and server administration.

## Overview

The web interface provides:
- User-friendly certificate generation and management
- Secure authentication with session management
- Certificate download and revocation capabilities
- Server status monitoring

## Prerequisites

Before configuring the web interface:
- VPN server must be installed and running
- Environment variables must be configured
- SSL certificates recommended for production use

## Basic Configuration

### Environment Variables

The web interface requires specific environment variables to be configured:

#### Required Variables
```bash
# Session security
WEB_SESSION_SECRET=your-secret-key-here

# Authentication credentials
WEB_ADMIN_USERNAME=admin
WEB_ADMIN_PASSWORD_HASH=$2b$10$...  # bcrypt hash of your password

# Server configuration
PORT=3000                        # Web interface port
```

#### Optional Variables
```bash
# Environment settings
NODE_ENV=development              # Disables HTTPS enforcement
WEB_HTTPS_ONLY=true              # Force HTTPS even in development
WEB_SESSION_TIMEOUT=1800000      # Session timeout in milliseconds (30 min default)

# Server settings
VPN_HOST=your-server-ip          # VPN server address
API_PORT=3000                    # API server port
```

### Generating Admin Credentials

To set up admin authentication:

1. **Generate password hash**:
   ```bash
   npm run setup-web-admin
   ```

2. **Or manually create hash**:
   ```bash
   node -e "console.log(require('bcrypt').hashSync('your-password', 10))"
   ```

3. **Add to environment**:
   ```bash
   echo "WEB_ADMIN_PASSWORD_HASH=\$2b\$10\$..." >> .env
   ```

## Running the Web Interface

### Development Mode (Recommended for testing)

For local development and testing:

```bash
npm run dev
# or
npm run web:dev
```

**Development mode features**:
- HTTPS enforcement is **disabled**
- Access at: http://localhost:3000
- Session store uses memory (not persistent)
- Detailed logging enabled
- Hot reload for development

### Production Mode

For production deployment:

```bash
npm start
# or 
npm run web:start
```

**Production mode features**:
- HTTPS enforcement is **enabled**
- Redirects HTTP to HTTPS automatically
- Access at: https://localhost:3000 (requires SSL certificate)
- Persistent session storage
- Enhanced security configuration

## Accessing the Web Interface

1. **Start the server**:
   ```bash
   npm run dev  # for development
   # or
   npm start    # for production
   ```

2. **Open your browser**:
   ```
   # Development
   http://localhost:3000
   
   # Production
   https://your-server-address:3000
   ```

3. **Login**:
   - You'll be redirected to `/login`
   - Enter your admin credentials
   - Access the certificate management interface

## Security Configuration

### Authentication System

The web interface uses session-based authentication:

- **Session Management**: Secure session cookies with configurable timeout
- **Password Security**: bcrypt hashed passwords with salt rounds
- **Rate Limiting**: Protection against brute force attacks
- **CSRF Protection**: Cross-site request forgery protection

### HTTPS Configuration

#### Development HTTPS (Optional)

For development with HTTPS:

```bash
# Generate self-signed certificates
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes

# Set environment variable
export WEB_HTTPS_ONLY=true

# Start with HTTPS
npm run dev
```

#### Production HTTPS (Recommended)

For production, use proper SSL certificates:

1. **Obtain SSL certificate** (Let's Encrypt, commercial CA, etc.)
2. **Configure certificate paths**:
   ```bash
   export SSL_CERT_PATH=/path/to/certificate.crt
   export SSL_KEY_PATH=/path/to/private.key
   ```
3. **Enable HTTPS enforcement**:
   ```bash
   export NODE_ENV=production
   export WEB_HTTPS_ONLY=true
   ```

### Security Headers

The web interface automatically applies security headers:

- **Content Security Policy (CSP)**
- **X-Frame-Options**: Prevents clickjacking
- **X-Content-Type-Options**: Prevents MIME sniffing
- **Strict-Transport-Security**: HTTPS enforcement
- **X-XSS-Protection**: XSS attack prevention

## Features and Usage

### Certificate Management

The web interface provides:

1. **Generate New Certificates**:
   - Enter unique client name
   - Automatic certificate generation
   - Immediate download of `.ovpn` file

2. **View Existing Certificates**:
   - List all generated certificates
   - Certificate status and expiration dates
   - Download existing configurations

3. **Revoke Certificates**:
   - Revoke compromised or unused certificates
   - Update Certificate Revocation List (CRL)
   - Immediate effect on VPN access

### Server Monitoring

Access server information:
- **Server Status**: VPN server health and uptime
- **Connected Clients**: Currently connected users
- **Certificate Statistics**: Total certificates and status
- **System Resources**: Basic system information

## API Integration

The web interface runs alongside the existing API:

- **Web Interface**: `http://localhost:3000/`
- **API Endpoints**: `http://localhost:3000/api/*`
- **Health Check**: `http://localhost:3000/health`
- **Metrics**: `http://localhost:3000/metrics`

### Authentication Compatibility

Both authentication systems work independently:
- **Web Interface**: Session-based authentication with cookies
- **API**: JWT token-based authentication with headers

## Troubleshooting

### Common Issues

#### SSL/HTTPS Errors

**Problem**: "This site can't provide a secure connection" or SSL errors

**Solutions**:
1. **Use development mode**:
   ```bash
   npm run dev
   ```
2. **Check for HTTPS enforcement disabled**:
   ```
   HTTPS enforcement disabled for development
   ```
3. **Use HTTP in development**:
   ```
   http://localhost:3000  ✅ Correct
   https://localhost:3000 ❌ Will cause SSL errors in dev mode
   ```

#### Authentication Issues

**Problem**: Cannot login or authentication fails

**Solutions**:
1. **Verify environment variables**:
   ```bash
   echo $WEB_ADMIN_USERNAME
   echo $WEB_ADMIN_PASSWORD_HASH
   ```
2. **Regenerate password hash**:
   ```bash
   npm run setup-web-admin
   ```
3. **Check session configuration**:
   ```bash
   echo $WEB_SESSION_SECRET
   ```

#### Port Conflicts

**Problem**: Port 3000 already in use

**Solutions**:
1. **Use different port**:
   ```bash
   PORT=3001 npm run dev
   ```
2. **Find and stop conflicting process**:
   ```bash
   lsof -ti:3000 | xargs kill -9
   ```

#### Session Issues

**Problem**: Frequent logouts or session timeouts

**Solutions**:
1. **Increase session timeout**:
   ```bash
   export WEB_SESSION_TIMEOUT=3600000  # 1 hour
   ```
2. **Check session secret**:
   ```bash
   # Ensure WEB_SESSION_SECRET is set and consistent
   echo $WEB_SESSION_SECRET
   ```

### Debug Configuration

Enable debug logging:

```bash
# Debug web interface
DEBUG=web:* npm start

# Debug sessions
DEBUG=express-session npm start

# Debug all
DEBUG=* npm start
```

## Advanced Configuration

### Custom Styling

Customize the web interface appearance:

1. **Modify CSS**:
   ```bash
   # Edit styles
   vim src/public/css/styles.css
   ```

2. **Add custom logo**:
   ```bash
   # Replace logo file
   cp your-logo.png src/public/images/logo.png
   ```

### Reverse Proxy Setup

For production deployment behind a reverse proxy:

#### Nginx Configuration
```nginx
server {
    listen 443 ssl;
    server_name your-domain.com;
    
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

#### Apache Configuration
```apache
<VirtualHost *:443>
    ServerName your-domain.com
    
    SSLEngine on
    SSLCertificateFile /path/to/certificate.crt
    SSLCertificateKeyFile /path/to/private.key
    
    ProxyPreserveHost On
    ProxyPass / http://localhost:3000/
    ProxyPassReverse / http://localhost:3000/
    
    ProxyPassReverse / http://localhost:3000/
    ProxyPassReverseMatch ^(/.*) http://localhost:3000$1
</VirtualHost>
```

### Environment-Specific Configuration

#### Development Environment
```bash
# .env.development
NODE_ENV=development
WEB_HTTPS_ONLY=false
LOG_LEVEL=debug
WEB_SESSION_TIMEOUT=86400000  # 24 hours for development
```

#### Production Environment
```bash
# .env.production
NODE_ENV=production
WEB_HTTPS_ONLY=true
LOG_LEVEL=info
WEB_SESSION_TIMEOUT=1800000   # 30 minutes for security
```

## Security Best Practices

### Production Security Checklist

- [ ] **Use HTTPS**: Always enable HTTPS in production
- [ ] **Strong passwords**: Use complex admin passwords
- [ ] **Session security**: Configure appropriate session timeouts
- [ ] **Regular updates**: Keep dependencies updated
- [ ] **Access control**: Limit access to management interface
- [ ] **Monitoring**: Enable logging and monitoring
- [ ] **Backup**: Regular backup of configuration and certificates

### Network Security

1. **Firewall Configuration**:
   ```bash
   # Allow only necessary ports
   sudo ufw allow 1194/udp  # VPN
   sudo ufw allow 3000/tcp  # Web interface (or use reverse proxy)
   ```

2. **Access Restriction**:
   ```bash
   # Restrict web interface to specific IPs
   sudo ufw allow from 192.168.1.0/24 to any port 3000
   ```

## Next Steps

After configuring the web interface:

1. **Test functionality**: Generate and download a test certificate
2. **Configure SSL**: Set up proper SSL certificates for production
3. **Set up monitoring**: Configure logging and monitoring
4. **User training**: Train users on certificate management
5. **Security review**: Review and harden security settings

## 🔗 Related Documentation
- [🛡️ Authentication Configuration](security.md#authentication-setup) - Security configuration
- [📜 Certificate Management](certificates.md) - Certificate configuration
- [✅ Security Best Practices](../security/best-practices.md) - Security recommendations
- [❓ Web Interface Troubleshooting](../troubleshooting/common-issues.md#web-interface-issues) - Problem resolution
- [🔌 API Documentation](../api/README.md) - API integration with web interface

## ⚡ Quick Links
- [🏠 Home](../../../README.md)
- [📚 Documentation](../../README.md)
- [⚙️ Configuration Overview](README.md)
- [🛡️ Security Configuration](security.md)

---
**Previous**: [Certificate Configuration](certificates.md) | **Next**: [Configuration Overview](README.md) | **Up**: [Configuration Guides](README.md)