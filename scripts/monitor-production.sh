#!/bin/bash

# Production Monitoring Script
# Usage: ./scripts/monitor-production.sh

COMPOSE_FILE="docker-compose.prod.yml"
HEALTH_URL="https://localhost:3000/health"

echo "📊 VPN Server Production Status"
echo "================================"

# Check container status
echo "🐳 Container Status:"
docker-compose -f $COMPOSE_FILE ps

echo ""

# Check health endpoint
echo "🏥 Health Check:"
if curl -f -k $HEALTH_URL 2>/dev/null; then
    echo "✅ Web interface is healthy"
else
    echo "❌ Web interface health check failed"
fi

echo ""

# Check VPN process
echo "🔌 VPN Process Status:"
if docker-compose -f $COMPOSE_FILE exec -T vpn-server pgrep openvpn > /dev/null 2>&1; then
    echo "✅ OpenVPN process is running"
else
    echo "❌ OpenVPN process not found"
fi

echo ""

# Check certificate expiration
echo "🔒 SSL Certificate Status:"
if command -v openssl &> /dev/null; then
    CERT_PATH="/etc/letsencrypt/live/$(grep VPN_HOST .env.production | cut -d'=' -f2)/cert.pem"
    if [ -f "$CERT_PATH" ]; then
        EXPIRY=$(openssl x509 -enddate -noout -in "$CERT_PATH" | cut -d= -f2)
        EXPIRY_EPOCH=$(date -d "$EXPIRY" +%s)
        CURRENT_EPOCH=$(date +%s)
        DAYS_LEFT=$(( (EXPIRY_EPOCH - CURRENT_EPOCH) / 86400 ))
        
        if [ $DAYS_LEFT -gt 30 ]; then
            echo "✅ SSL certificate expires in $DAYS_LEFT days"
        elif [ $DAYS_LEFT -gt 7 ]; then
            echo "⚠️  SSL certificate expires in $DAYS_LEFT days (renewal recommended)"
        else
            echo "❌ SSL certificate expires in $DAYS_LEFT days (urgent renewal needed)"
        fi
    else
        echo "⚠️  SSL certificate not found at $CERT_PATH"
    fi
else
    echo "⚠️  OpenSSL not available for certificate check"
fi

echo ""

# Check disk space
echo "💾 Disk Usage:"
df -h | grep -E "(Filesystem|/dev/)" | head -2

echo ""

# Check recent logs for errors
echo "📋 Recent Error Logs (last 10):"
docker-compose -f $COMPOSE_FILE logs --tail=50 2>/dev/null | grep -i error | tail -10 || echo "No recent errors found"

echo ""

# Check active VPN connections
echo "🌐 Active VPN Connections:"
CONNECTION_COUNT=$(docker-compose -f $COMPOSE_FILE exec -T vpn-server cat /var/log/openvpn/status.log 2>/dev/null | grep -c "CLIENT_LIST" || echo "0")
echo "Active connections: $CONNECTION_COUNT"

echo ""
echo "📊 Monitoring completed at $(date)"