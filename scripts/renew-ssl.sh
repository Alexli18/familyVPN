#!/bin/bash

# SSL Certificate Renewal Script
# Add to crontab: 0 3 * * * /path/to/scripts/renew-ssl.sh

set -e

DOMAIN=${1:-$(grep VPN_HOST .env.production | cut -d'=' -f2)}
COMPOSE_FILE="docker-compose.prod.yml"

echo "🔄 Starting SSL certificate renewal for $DOMAIN"

# Renew certificate
echo "🔒 Renewing SSL certificate..."
certbot renew --quiet

# Check if certificate was renewed (certbot exit code 0 means renewed or not due for renewal)
if [ $? -eq 0 ]; then
    echo "✅ Certificate renewal check completed"
    
    # Restart container to pick up new certificate
    echo "🔄 Restarting VPN server to apply new certificate..."
    docker-compose -f $COMPOSE_FILE restart vpn-server
    
    echo "✅ SSL certificate renewal completed successfully"
else
    echo "❌ Certificate renewal failed"
    exit 1
fi

# Log renewal attempt
echo "$(date): SSL certificate renewal completed for $DOMAIN" >> /var/log/vpn-ssl-renewal.log