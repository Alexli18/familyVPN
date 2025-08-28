# Multi-stage Docker build for minimal attack surface
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production && npm cache clean --force

# Runtime stage
FROM alpine:3.18

# Install runtime dependencies
RUN apk add --no-cache \
    nodejs \
    npm \
    openvpn \
    openssl \
    easy-rsa \
    bash \
    curl \
    iptables \
    && rm -rf /var/cache/apk/*

# Create directories first
RUN mkdir -p /app /app/certificates /app/config /app/logs /etc/openvpn /var/log/openvpn

# Set environment variables for Docker
ENV NODE_ENV=production
ENV VPN_CERT_DIR=./certificates
ENV VPN_CONFIG_DIR=./config
ENV PORT=3000

WORKDIR /app

# Copy dependencies and application files
COPY --from=builder /app/node_modules ./node_modules
COPY src/ ./src/
COPY scripts/ ./scripts/
COPY package*.json ./
COPY .env ./
COPY easy-rsa/ ./easy-rsa/
COPY certificates/ ./certificates/

# Create non-root user and set permissions
RUN addgroup -g 1001 -S vpnuser && \
    adduser -S -D -H -u 1001 -s /sbin/nologin -G vpnuser vpnuser && \
    chmod +x ./easy-rsa/easyrsa && \
    mkdir -p ./logs && \
    chown -R vpnuser:vpnuser /app /var/log/openvpn /etc/openvpn && \
    chmod -R 755 /app && \
    chmod 777 ./logs

# Switch to non-root user
USER vpnuser:vpnuser

# Expose ports
EXPOSE 1194/udp 3000/tcp

# Simple health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Start the server
CMD ["npm", "start"]