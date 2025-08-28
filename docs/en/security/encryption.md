# Encryption and Cryptographic Security

## Overview

The Family VPN Server implements enterprise-grade cryptographic security using modern encryption standards and best practices. This document covers all cryptographic aspects including VPN encryption, certificate management, and secure key handling.

## OpenVPN Encryption Configuration

### Cipher Configuration

#### Primary Cipher: AES-256-GCM
```
cipher AES-256-GCM
```

**Features**:
- **Algorithm**: Advanced Encryption Standard (AES)
- **Key Size**: 256-bit keys for maximum security
- **Mode**: Galois/Counter Mode (GCM) for authenticated encryption
- **Performance**: Hardware-accelerated on modern processors
- **Security**: Provides both confidentiality and authenticity

#### Fallback Cipher: AES-256-CBC
```
cipher AES-256-CBC
auth SHA256
```

**Features**:
- **Compatibility**: Broader client support
- **Authentication**: SHA-256 HMAC for message authentication
- **Security**: Strong encryption with separate authentication

### Authentication Algorithms

#### Message Authentication
```
auth SHA256
```

**Properties**:
- **Algorithm**: SHA-256 (Secure Hash Algorithm)
- **Output Size**: 256-bit hash
- **Security**: Cryptographically secure hash function
- **Performance**: Optimized implementations available

#### TLS Authentication
```
tls-auth ta.key 0
# or
tls-crypt ta.key
```

**TLS-Crypt Advantages**:
- **Additional Encryption**: Control channel encryption
- **Replay Protection**: Built-in replay attack protection
- **DDoS Mitigation**: Filters invalid packets early
- **Perfect Forward Secrecy**: Enhanced key security

### Key Exchange and Perfect Forward Secrecy

#### Diffie-Hellman Parameters
```
dh dh2048.pem
```

**Configuration**:
- **Key Size**: 2048-bit minimum (4096-bit recommended)
- **Generation**: Cryptographically secure random generation
- **Purpose**: Secure key exchange for session keys

#### Elliptic Curve Cryptography
```
ecdh-curve prime256v1
```

**Benefits**:
- **Performance**: Faster than traditional DH
- **Security**: Equivalent security with smaller keys
- **Modern Standard**: NIST P-256 curve

### TLS Configuration

#### TLS Version Requirements
```
tls-version-min 1.2
tls-version-max 1.3
```

**Security Features**:
- **Minimum TLS 1.2**: Eliminates weak protocols
- **TLS 1.3 Support**: Latest security enhancements
- **Protocol Security**: Strong cipher suite selection

#### Certificate Verification
```
remote-cert-tls client
verify-client-cert require
```

**Verification Process**:
- **Certificate Chain**: Full chain validation
- **Certificate Purpose**: Client certificate validation
- **Revocation Checking**: CRL verification
- **Common Name**: CN validation (optional)

## Certificate Management Encryption

### PKI Infrastructure

#### Certificate Authority (CA)
- **Key Algorithm**: RSA or ECDSA
- **Key Size**: 4096-bit RSA or P-384 ECDSA
- **Signature Algorithm**: SHA-256
- **Validity Period**: 10 years (configurable)

#### Server Certificates
- **Key Algorithm**: RSA 2048-bit minimum
- **Signature Algorithm**: SHA-256 with RSA
- **Key Usage**: Digital Signature, Key Encipherment
- **Extended Key Usage**: TLS Web Server Authentication

#### Client Certificates
- **Key Algorithm**: RSA 2048-bit minimum
- **Signature Algorithm**: SHA-256 with RSA
- **Key Usage**: Digital Signature
- **Extended Key Usage**: TLS Web Client Authentication

### Certificate Security Features

#### Strong Key Generation
```bash
# RSA key generation
openssl genrsa -out private.key 2048

# ECDSA key generation (alternative)
openssl ecparam -genkey -name prime256v1 -out private.key
```

#### Secure Certificate Signing
```bash
# Certificate signing with SHA-256
openssl ca -config openssl.cnf \
  -extensions client_cert \
  -days 365 \
  -notext \
  -md sha256 \
  -in client.csr \
  -out client.crt
```

#### Certificate Validation
- **Chain Validation**: Complete certificate chain verification
- **Expiration Checking**: Automatic expiration monitoring
- **Revocation Checking**: CRL-based revocation verification
- **Key Usage Validation**: Proper key usage enforcement

### Certificate Revocation

#### Certificate Revocation List (CRL)
```
crl-verify crl.pem
```

**Features**:
- **Automatic Updates**: Regular CRL regeneration
- **Revocation Reasons**: Detailed revocation tracking
- **Distribution**: Secure CRL distribution
- **Validation**: Real-time revocation checking

#### OCSP Support (Future Enhancement)
- **Real-time Validation**: Online certificate status checking
- **Performance**: Faster than CRL for large deployments
- **Privacy**: Enhanced privacy protection

## Password and Token Encryption

### bcrypt Password Hashing

#### Configuration
```javascript
const saltRounds = 12;
const hash = bcrypt.hashSync(password, saltRounds);
```

**Security Properties**:
- **Algorithm**: bcrypt (Blowfish-based)
- **Salt Rounds**: 12 (configurable, minimum 10)
- **Unique Salts**: Each password gets unique salt
- **Timing Attack Resistance**: Constant-time comparison

#### Security Features
- **Adaptive Hashing**: Configurable work factor
- **Salt Generation**: Cryptographically secure random salts
- **Hash Verification**: Secure comparison functions
- **Future-Proof**: Adjustable difficulty over time

### JWT Token Security

#### Token Signing
```javascript
const token = jwt.sign(payload, secret, {
  algorithm: 'HS256',
  expiresIn: '15m',
  issuer: 'family-vpn-server',
  audience: 'vpn-api'
});
```

**Cryptographic Properties**:
- **Algorithm**: HMAC-SHA256
- **Secret Management**: Cryptographically strong secrets
- **Token Structure**: Standard JWT format
- **Signature Verification**: Strict signature validation

#### Secret Management
- **Secret Generation**: Cryptographically secure random generation
- **Secret Storage**: Environment variable protection
- **Secret Rotation**: Regular secret rotation capability
- **Multiple Secrets**: Separate secrets for access and refresh tokens

## Random Number Generation

### Entropy Sources

#### System Entropy
- **Linux**: `/dev/urandom` for cryptographic randomness
- **Windows**: CryptGenRandom API
- **macOS**: SecRandomCopyBytes framework

#### Node.js Crypto Module
```javascript
const crypto = require('crypto');

// Generate cryptographically secure random bytes
const randomBytes = crypto.randomBytes(32);

// Generate random UUID
const uuid = crypto.randomUUID();
```

### Key Generation

#### Symmetric Keys
```javascript
// Generate AES-256 key
const aesKey = crypto.randomBytes(32); // 256 bits

// Generate HMAC key
const hmacKey = crypto.randomBytes(64); // 512 bits
```

#### Asymmetric Key Pairs
```javascript
// Generate RSA key pair
const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
});
```

## Cryptographic Best Practices

### Key Management

#### Key Storage
- **Private Keys**: Restricted file permissions (600)
- **CA Private Key**: Offline storage when possible
- **Symmetric Keys**: Environment variable protection
- **Key Backup**: Secure encrypted backups

#### Key Rotation
- **JWT Secrets**: Monthly rotation recommended
- **TLS Certificates**: Annual renewal
- **CA Certificate**: 10-year validity with monitoring
- **DH Parameters**: Regenerate annually

### Algorithm Selection

#### Approved Algorithms
- **Symmetric Encryption**: AES-256-GCM, AES-256-CBC
- **Asymmetric Encryption**: RSA-2048+, ECDSA P-256+
- **Hash Functions**: SHA-256, SHA-384, SHA-512
- **Key Exchange**: ECDH P-256+, DH 2048+
- **Message Authentication**: HMAC-SHA256+

#### Deprecated Algorithms
- ❌ **DES/3DES**: Weak encryption
- ❌ **RC4**: Stream cipher vulnerabilities
- ❌ **MD5**: Hash collision vulnerabilities
- ❌ **SHA-1**: Collision vulnerabilities
- ❌ **RSA-1024**: Insufficient key length

### Implementation Security

#### Secure Coding Practices
- **Constant-Time Operations**: Prevent timing attacks
- **Secure Memory**: Clear sensitive data from memory
- **Input Validation**: Validate all cryptographic inputs
- **Error Handling**: Secure error messages
- **Side-Channel Protection**: Mitigate side-channel attacks

#### Library Selection
- **OpenSSL**: Industry-standard cryptographic library
- **Node.js Crypto**: Built-in cryptographic functions
- **bcrypt**: Proven password hashing library
- **jsonwebtoken**: Secure JWT implementation

## Encryption Configuration

### OpenVPN Server Configuration

```
# Strong encryption configuration
cipher AES-256-GCM
auth SHA256
tls-crypt ta.key
tls-version-min 1.2
ecdh-curve prime256v1
dh dh2048.pem

# Certificate verification
remote-cert-tls client
verify-client-cert require
crl-verify crl.pem

# Additional security
topology subnet
compress lz4-v2
```

### Client Configuration

```
# Client-side encryption settings
cipher AES-256-GCM
auth SHA256
tls-client
remote-cert-tls server
verify-x509-name server_name name

# Security enhancements
auth-nocache
compress lz4-v2
```

## Cryptographic Testing

### Encryption Tests

```bash
# Test OpenVPN encryption
npm run test:encryption

# Test certificate validation
npm run test:certificates

# Test password hashing
npm run test:password-security
```

### Manual Cryptographic Verification

#### Test Certificate Chain
```bash
# Verify certificate chain
openssl verify -CAfile ca.crt -untrusted intermediate.crt client.crt

# Check certificate details
openssl x509 -in client.crt -text -noout
```

#### Test Encryption Strength
```bash
# Test cipher strength
openssl ciphers -v 'AES256-GCM-SHA384'

# Test key strength
openssl rsa -in private.key -text -noout | grep "Private-Key"
```

## Performance Considerations

### Hardware Acceleration

#### AES-NI Support
- **Intel/AMD**: Hardware AES acceleration
- **ARM**: Cryptographic extensions
- **Performance**: 5-10x improvement over software
- **Verification**: Check CPU flags for AES support

#### Optimization Settings
```bash
# Check AES-NI support
grep -m1 -o aes /proc/cpuinfo

# OpenVPN performance tuning
fast-io
sndbuf 0
rcvbuf 0
```

### Cipher Performance

| Cipher | Security | Performance | Recommendation |
|--------|----------|-------------|----------------|
| AES-256-GCM | Excellent | Very Good | Primary choice |
| AES-256-CBC | Excellent | Good | Fallback option |
| ChaCha20-Poly1305 | Excellent | Good | Mobile devices |

## Compliance and Standards

### Cryptographic Standards

#### NIST Guidelines
- **FIPS 140-2**: Cryptographic module standards
- **SP 800-57**: Key management recommendations
- **SP 800-131A**: Cryptographic algorithm transitions

#### Industry Standards
- **RFC 5246**: TLS 1.2 specification
- **RFC 8446**: TLS 1.3 specification
- **RFC 7539**: ChaCha20-Poly1305 specification
- **RFC 3526**: DH group specifications

### Security Certifications

#### Common Criteria
- **Protection Profiles**: VPN gateway protection profiles
- **Evaluation Assurance**: Security evaluation standards
- **Certification**: Third-party security validation

## Troubleshooting Encryption Issues

### Common Problems

#### Cipher Mismatch
- **Symptom**: Connection fails with cipher errors
- **Cause**: Client/server cipher mismatch
- **Solution**: Verify cipher configuration on both ends

#### Certificate Validation Errors
- **Symptom**: Certificate verification failures
- **Cause**: Invalid certificates, expired CRL, clock skew
- **Solution**: Check certificate validity, update CRL, sync time

#### Performance Issues
- **Symptom**: Slow VPN performance
- **Cause**: Software encryption, weak hardware
- **Solution**: Enable hardware acceleration, optimize settings

### Debugging Tools

```bash
# OpenVPN debugging
openvpn --config client.ovpn --verb 4

# Certificate debugging
openssl verify -verbose -CAfile ca.crt client.crt

# Cipher testing
openssl speed aes-256-gcm
```

## Related Documentation

- [Security Overview](overview.md) - Complete security architecture
- [Authentication System](authentication.md) - Authentication and session security
- [Security Monitoring](monitoring.md) - Cryptographic event monitoring
- [Best Practices](best-practices.md) - Cryptographic best practices
- [Certificate Management](../configuration/certificates.md) - Certificate configuration