#!/bin/bash

# Production Deployment Script for Family VPN Server
# Usage: ./scripts/deploy-production.sh [domain] [server-ip]

set -e

DOMAIN=${1:-"your-domain.com"}
SERVER_IP=${2:-"your-server-ip"}

echo "🚀 Starting production deployment for $DOMAIN ($SERVER_IP)"

# Check if running as root for SSL certificate setup
if [[ $EUID -eq 0 ]]; then
   echo "⚠️  Running as root - SSL certificate setup enabled"
   SSL_SETUP=true
else
   echo "ℹ️  Running as non-root - SSL certificate setup skipped"
   SSL_SETUP=false
fi

# 1. Update production environment file
echo "📝 Updating production environment configuration..."
sed -i.bak "s/VPN_HOST=.*/VPN_HOST=$SERVER_IP/" .env.production
sed -i.bak "s/your-server-ip-here/$SERVER_IP/" .env.production

# 2. Set up SSL certificates (if running as root)
if [ "$SSL_SETUP" = true ]; then
    echo "🔒 Setting up SSL certificates with Let's Encrypt..."
    
    # Install certbot if not present
    if ! command -v certbot &> /dev/null; then
        echo "Installing certbot..."
        apt update && apt install -y certbot
    fi
    
    # Stop any existing web server on port 80
    echo "Stopping existing services on port 80..."
    systemctl stop apache2 2>/dev/null || true
    systemctl stop nginx 2>/dev/null || true
    
    # Generate SSL certificate
    echo "Generating SSL certificate for $DOMAIN..."
    certbot certonly --standalone -d $DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN
    
    # Update docker-compose to use the correct certificate path
    sed -i.bak "s|/etc/letsencrypt|/etc/letsencrypt|g" docker-compose.prod.yml
else
    echo "⚠️  Skipping SSL setup - run as root to enable automatic SSL certificate generation"
fi

# 3. Build and start production containers
echo "🐳 Building and starting production containers..."
docker-compose -f docker-compose.prod.yml down 2>/dev/null || true
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d

# 4. Wait for services to start
echo "⏳ Waiting for services to start..."
sleep 10

# 5. Check service status
echo "🔍 Checking service status..."
docker-compose -f docker-compose.prod.yml ps

# 6. Test health endpoint
echo "🏥 Testing health endpoint..."
if curl -f -k https://localhost:3000/health 2>/dev/null; then
    echo "✅ Health check passed"
else
    echo "❌ Health check failed - checking logs..."
    docker-compose -f docker-compose.prod.yml logs --tail=20
fi

# 7. Display connection information
echo ""
echo "🎉 Production deployment complete!"
echo ""
echo "📋 Connection Information:"
echo "  Web Interface: https://$DOMAIN"
echo "  VPN Server: $DOMAIN:1194 (UDP)"
echo "  Admin Login: admin / [your-password]"
echo ""
echo "📊 Useful Commands:"
echo "  View logs: docker-compose -f docker-compose.prod.yml logs -f"
echo "  Restart: docker-compose -f docker-compose.prod.yml restart"
echo "  Stop: docker-compose -f docker-compose.prod.yml down"
echo ""

if [ "$SSL_SETUP" = false ]; then
    echo "⚠️  SSL Certificate Setup Required:"
    echo "  Run as root to automatically set up SSL certificates, or manually configure:"
    echo "  sudo certbot certonly --standalone -d $DOMAIN"
    echo ""
fi

echo "🔐 Security Reminders:"
echo "  - Change default admin password immediately"
echo "  - Configure firewall to allow only ports 443 and 1194"
echo "  - Set up automatic SSL certificate renewal"
echo "  - Monitor logs regularly for security events"