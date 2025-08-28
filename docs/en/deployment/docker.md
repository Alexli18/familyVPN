# Docker Deployment Guide

Docker deployment is the recommended method for running the Family VPN Server as it provides isolation, easy management, and consistent environments across different systems.

## Prerequisites

- Docker Engine 20.10 or higher
- Docker Compose 1.29 or higher
- Administrative privileges for network configuration
- 20GB available disk space

## Quick Start

### 1. Clone and Setup

```bash
# Clone repository
git clone <repository-url>
cd family-vpn-server

# Copy environment configuration
cp .env.example .env

# Run interactive setup
npm run setup
```

### 2. Configure Environment

Edit `.env` file with your settings:

```env
# Network Configuration
VPN_HOST=your-server-ip-or-domain
VPN_SUBNET=10.8.0.0
VPN_NETMASK=255.255.255.0

# Ports
VPN_PORT=1194
API_PORT=3000

# Security
WEB_ADMIN_USERNAME=admin
WEB_ADMIN_PASSWORD_HASH=your-bcrypt-hash
```

### 3. Deploy with Docker Compose

```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Check status
docker-compose ps
```

## Docker Compose Configuration

### Development Configuration (docker-compose.yml)

```yaml
version: '3.8'

services:
  vpn-server:
    build: .
    container_name: family-vpn-server
    cap_add:
      - NET_ADMIN
    devices:
      - /dev/net/tun
    ports:
      - "1194:1194/udp"
      - "3000:3000"
    volumes:
      - ./certificates:/app/certificates
      - ./logs:/app/logs
      - ./easy-rsa:/app/easy-rsa
    env_file:
      - .env
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

### Production Configuration (docker-compose.prod.yml)

```yaml
version: '3.8'

services:
  vpn-server:
    build: .
    container_name: family-vpn-server-prod
    cap_add:
      - NET_ADMIN
    cap_drop:
      - ALL
    security_opt:
      - no-new-privileges:true
    devices:
      - /dev/net/tun
    ports:
      - "1194:1194/udp"
      - "443:3000"
    volumes:
      - vpn-certificates:/app/certificates
      - vpn-logs:/app/logs
      - vpn-config:/app/config
      - /etc/letsencrypt:/etc/letsencrypt:ro
    env_file:
      - .env.production
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "https://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    tmpfs:
      - /tmp:noexec,nosuid,size=100m

volumes:
  vpn-certificates:
    driver: local
  vpn-logs:
    driver: local
  vpn-config:
    driver: local
```

## Container Management

### Basic Operations

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# Restart services
docker-compose restart

# View logs
docker-compose logs -f vpn-server

# Execute commands in container
docker-compose exec vpn-server bash
```

### Health Monitoring

```bash
# Check container health
docker-compose ps

# View health check logs
docker inspect family-vpn-server --format='{{json .State.Health}}'

# Manual health check
curl -f http://localhost:3000/health
```

### Resource Monitoring

```bash
# View resource usage
docker stats family-vpn-server

# View container processes
docker-compose top

# Inspect container configuration
docker-compose config
```

## Volume Management

### Development Volumes (Bind Mounts)

```bash
# Certificate storage
./certificates:/app/certificates

# Log storage
./logs:/app/logs

# Easy-RSA PKI
./easy-rsa:/app/easy-rsa
```

### Production Volumes (Named Volumes)

```bash
# List volumes
docker volume ls

# Inspect volume
docker volume inspect vpn-certificates

# Backup volume
docker run --rm -v vpn-certificates:/data -v $(pwd):/backup alpine tar czf /backup/certificates-backup.tar.gz -C /data .

# Restore volume
docker run --rm -v vpn-certificates:/data -v $(pwd):/backup alpine tar xzf /backup/certificates-backup.tar.gz -C /data
```

## Network Configuration

### Container Networking

The container requires special network privileges:

```yaml
cap_add:
  - NET_ADMIN    # Required for VPN tunnel management
devices:
  - /dev/net/tun # Required for TUN interface
```

### Port Mapping

```yaml
ports:
  - "1194:1194/udp"  # VPN traffic
  - "3000:3000"      # Web interface (development)
  - "443:3000"       # Web interface (production HTTPS)
```

### Firewall Configuration

```bash
# Allow VPN traffic
sudo ufw allow 1194/udp

# Allow web interface
sudo ufw allow 3000/tcp  # Development
sudo ufw allow 443/tcp   # Production

# Allow SSH (if needed)
sudo ufw allow 22/tcp
```

## SSL/TLS Configuration

### Let's Encrypt Integration

```bash
# Install certbot
sudo apt install certbot

# Generate certificates
sudo certbot certonly --standalone -d your-domain.com

# Mount certificates in production
volumes:
  - /etc/letsencrypt:/etc/letsencrypt:ro
```

### Environment Configuration

```env
# Production SSL settings
WEB_HTTPS_ONLY=true
SSL_CERT=/etc/letsencrypt/live/your-domain.com/fullchain.pem
SSL_KEY=/etc/letsencrypt/live/your-domain.com/privkey.pem
```

## Troubleshooting

### Common Issues

#### Container Won't Start

```bash
# Check logs
docker-compose logs vpn-server

# Check system resources
df -h
free -h

# Verify configuration
docker-compose config
```

#### Permission Issues

```bash
# Fix certificate permissions
sudo chown -R 1000:1000 ./certificates
sudo chmod -R 755 ./certificates

# Fix log permissions
sudo chown -R 1000:1000 ./logs
```

#### Network Issues

```bash
# Check TUN device
ls -la /dev/net/tun

# Create TUN device if missing
sudo mkdir -p /dev/net
sudo mknod /dev/net/tun c 10 200
sudo chmod 666 /dev/net/tun
```

#### Health Check Failures

```bash
# Test health endpoint manually
curl -f http://localhost:3000/health

# Check container logs
docker-compose logs vpn-server

# Restart unhealthy container
docker-compose restart vpn-server
```

### Debug Mode

```bash
# Run with debug logging
docker-compose -f docker-compose.yml -f docker-compose.debug.yml up

# Access container shell
docker-compose exec vpn-server bash

# View OpenVPN logs
docker-compose exec vpn-server tail -f /var/log/openvpn/openvpn.log
```

## Performance Optimization

### Resource Limits

```yaml
services:
  vpn-server:
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 2G
        reservations:
          cpus: '0.5'
          memory: 512M
```

### Logging Configuration

```yaml
services:
  vpn-server:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

## Security Considerations

### Container Security

```yaml
# Drop all capabilities except required
cap_drop:
  - ALL
cap_add:
  - NET_ADMIN

# Prevent privilege escalation
security_opt:
  - no-new-privileges:true

# Use tmpfs for temporary files
tmpfs:
  - /tmp:noexec,nosuid,size=100m
```

### Network Security

```bash
# Use custom network
docker network create --driver bridge vpn-network

# Isolate container
networks:
  vpn-network:
    external: true
```

## Backup and Recovery

### Automated Backup Script

```bash
#!/bin/bash
# backup-docker-vpn.sh

BACKUP_DIR="/backup/vpn"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup volumes
docker run --rm -v vpn-certificates:/data -v $BACKUP_DIR:/backup alpine \
  tar czf /backup/certificates-$DATE.tar.gz -C /data .

docker run --rm -v vpn-logs:/data -v $BACKUP_DIR:/backup alpine \
  tar czf /backup/logs-$DATE.tar.gz -C /data .

# Backup configuration
cp .env.production $BACKUP_DIR/env-$DATE
cp docker-compose.prod.yml $BACKUP_DIR/compose-$DATE.yml

echo "Backup completed: $BACKUP_DIR"
```

### Recovery Process

```bash
# Stop services
docker-compose down

# Restore volumes
docker run --rm -v vpn-certificates:/data -v /backup/vpn:/backup alpine \
  tar xzf /backup/certificates-YYYYMMDD_HHMMSS.tar.gz -C /data

# Restore configuration
cp /backup/vpn/env-YYYYMMDD_HHMMSS .env.production

# Start services
docker-compose -f docker-compose.prod.yml up -d
```

## Related Documentation

- [Production Best Practices](production.md) - Security and monitoring for production
- [Local Deployment](local.md) - Alternative deployment method
- [Configuration Guide](../configuration/README.md) - Environment configuration
- [Troubleshooting](../troubleshooting/README.md) - Common issues and solutions