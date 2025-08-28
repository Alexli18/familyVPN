# Performance Optimization Guide

This guide covers optimizing the Family VPN Server for production workloads, including system tuning, network optimization, and monitoring performance metrics.

## System Requirements

### Minimum Requirements
- **CPU**: 1 core, 2.0 GHz
- **RAM**: 1GB
- **Disk**: 10GB available space
- **Network**: 10 Mbps upload bandwidth

### Recommended Requirements
- **CPU**: 2+ cores, 2.4 GHz
- **RAM**: 2GB+
- **Disk**: 20GB+ SSD storage
- **Network**: 100+ Mbps upload bandwidth

### High-Performance Requirements
- **CPU**: 4+ cores, 3.0 GHz
- **RAM**: 4GB+
- **Disk**: 50GB+ NVMe SSD
- **Network**: 1 Gbps+ upload bandwidth

## System-Level Optimizations

### Kernel Parameters

```bash
# Optimize network parameters for VPN performance
sudo tee -a /etc/sysctl.conf > /dev/null <<EOF
# Network buffer sizes
net.core.rmem_default = 262144
net.core.rmem_max = 16777216
net.core.wmem_default = 262144
net.core.wmem_max = 16777216

# TCP optimizations
net.ipv4.tcp_window_scaling = 1
net.ipv4.tcp_timestamps = 1
net.ipv4.tcp_sack = 1
net.ipv4.tcp_congestion_control = bbr
net.ipv4.tcp_slow_start_after_idle = 0

# Network device optimizations
net.core.netdev_max_backlog = 5000
net.core.netdev_budget = 600

# IP forwarding (required for VPN)
net.ipv4.ip_forward = 1
net.ipv6.conf.all.forwarding = 1

# Connection tracking optimizations
net.netfilter.nf_conntrack_max = 1048576
net.netfilter.nf_conntrack_tcp_timeout_established = 7200

# Memory management
vm.swappiness = 10
vm.dirty_ratio = 15
vm.dirty_background_ratio = 5
EOF

# Apply changes
sudo sysctl -p
```

### CPU Optimization

```bash
# Set CPU governor to performance
echo 'performance' | sudo tee /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor

# Make permanent
sudo tee /etc/systemd/system/cpu-performance.service > /dev/null <<EOF
[Unit]
Description=Set CPU governor to performance
After=multi-user.target

[Service]
Type=oneshot
ExecStart=/bin/bash -c 'echo performance | tee /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor'
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl enable cpu-performance
sudo systemctl start cpu-performance
```

### I/O Optimization

```bash
# Optimize I/O scheduler for SSDs
echo 'noop' | sudo tee /sys/block/*/queue/scheduler

# For HDDs, use deadline scheduler
# echo 'deadline' | sudo tee /sys/block/*/queue/scheduler

# Increase I/O queue depth
echo 32 | sudo tee /sys/block/*/queue/nr_requests

# Make I/O optimizations permanent
sudo tee /etc/udev/rules.d/60-io-scheduler.rules > /dev/null <<EOF
# Set I/O scheduler for SSDs
ACTION=="add|change", KERNEL=="sd[a-z]", ATTR{queue/rotational}=="0", ATTR{queue/scheduler}="noop"
# Set I/O scheduler for HDDs
ACTION=="add|change", KERNEL=="sd[a-z]", ATTR{queue/rotational}=="1", ATTR{queue/scheduler}="deadline"
EOF
```

## OpenVPN Optimizations

### Server Configuration

```bash
# Add performance settings to OpenVPN server config
sudo tee -a /etc/openvpn/server.conf > /dev/null <<EOF
# Performance optimizations
sndbuf 0
rcvbuf 0
fast-io

# Compression (use with caution - may reduce security)
comp-lzo adaptive
push "comp-lzo adaptive"

# Multi-threading (if supported)
management-client-user nobody
management-client-group nogroup

# Optimize cipher and authentication
cipher AES-256-GCM
auth SHA256
tls-version-min 1.2

# Reduce verbosity in production
verb 3
mute 20

# Connection optimizations
keepalive 10 120
ping-timer-rem
persist-tun
persist-key

# Client-specific optimizations to push
push "sndbuf 0"
push "rcvbuf 0"
push "fast-io"
EOF
```

### Client Configuration Optimizations

```bash
# Add to client .ovpn files
cat >> client-template.ovpn <<EOF
# Client performance optimizations
sndbuf 0
rcvbuf 0
fast-io

# Connection reliability
keepalive 10 120
ping-timer-rem
persist-tun
persist-key

# Reduce reconnection time
connect-retry-max 3
connect-retry 5

# Optimize for mobile devices
float
nobind
EOF
```

## Docker Optimizations

### Container Resource Limits

```yaml
# docker-compose.prod.yml optimizations
version: '3.8'

services:
  vpn-server:
    build: .
    container_name: family-vpn-server-prod
    cap_add:
      - NET_ADMIN
    cap_drop:
      - ALL
    devices:
      - /dev/net/tun
    ports:
      - "443:3000"
      - "1194:1194/udp"
    volumes:
      - vpn-certificates:/app/certificates
      - vpn-logs:/app/logs
      - vpn-config:/app/config
    env_file:
      - .env.production
    restart: unless-stopped
    
    # Resource limits
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 2G
        reservations:
          cpus: '0.5'
          memory: 512M
    
    # Performance optimizations
    tmpfs:
      - /tmp:noexec,nosuid,size=100m
    
    # Logging optimization
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
    
    # Network optimization
    sysctls:
      - net.core.rmem_max=16777216
      - net.core.wmem_max=16777216
      - net.ipv4.ip_forward=1
    
    # Security and performance
    security_opt:
      - no-new-privileges:true
    ulimits:
      nofile:
        soft: 65536
        hard: 65536
```

### Docker Daemon Optimization

```bash
# Optimize Docker daemon configuration
sudo tee /etc/docker/daemon.json > /dev/null <<EOF
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "storage-driver": "overlay2",
  "storage-opts": [
    "overlay2.override_kernel_check=true"
  ],
  "default-ulimits": {
    "nofile": {
      "Name": "nofile",
      "Hard": 65536,
      "Soft": 65536
    }
  },
  "max-concurrent-downloads": 10,
  "max-concurrent-uploads": 5,
  "default-shm-size": "128M"
}
EOF

sudo systemctl restart docker
```

## Application-Level Optimizations

### Node.js Performance

```bash
# Environment variables for Node.js optimization
cat >> .env.production <<EOF
# Node.js performance settings
NODE_OPTIONS="--max-old-space-size=1024 --optimize-for-size"
UV_THREADPOOL_SIZE=16

# Application performance
WEB_WORKER_PROCESSES=2
WEB_KEEP_ALIVE_TIMEOUT=65000
WEB_HEADERS_TIMEOUT=66000

# Logging optimization
LOG_LEVEL=info
LOG_MAX_SIZE=10m
LOG_MAX_FILES=5
LOG_COMPRESS=true
EOF
```

### Express.js Optimizations

```javascript
// Add to src/server.js for production optimizations
const express = require('express');
const compression = require('compression');
const helmet = require('helmet');

const app = express();

// Enable compression
app.use(compression({
  level: 6,
  threshold: 1024,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
}));

// Security headers with performance considerations
app.use(helmet({
  contentSecurityPolicy: false, // Disable if causing performance issues
  crossOriginEmbedderPolicy: false
}));

// Optimize static file serving
app.use(express.static('public', {
  maxAge: '1d',
  etag: true,
  lastModified: true
}));

// Connection keep-alive
app.use((req, res, next) => {
  res.set('Connection', 'keep-alive');
  res.set('Keep-Alive', 'timeout=65');
  next();
});
```

## Network Optimizations

### Firewall Performance

```bash
# Optimize iptables for performance
sudo tee /etc/iptables/rules.v4 > /dev/null <<EOF
*filter
:INPUT DROP [0:0]
:FORWARD ACCEPT [0:0]
:OUTPUT ACCEPT [0:0]

# Optimize with connection tracking
-A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT

# Allow loopback (high performance)
-A INPUT -i lo -j ACCEPT

# Rate limiting with performance considerations
-A INPUT -p tcp --dport 22 -m state --state NEW -m recent --set --name SSH
-A INPUT -p tcp --dport 22 -m state --state NEW -m recent --update --seconds 60 --hitcount 4 --name SSH -j DROP

# VPN traffic (no rate limiting for performance)
-A INPUT -p udp --dport 1194 -j ACCEPT

# HTTPS with moderate rate limiting
-A INPUT -p tcp --dport 443 -m state --state NEW -m recent --set --name HTTPS
-A INPUT -p tcp --dport 443 -m state --state NEW -m recent --update --seconds 60 --hitcount 50 --name HTTPS -j DROP
-A INPUT -p tcp --dport 443 -j ACCEPT

# SSH access
-A INPUT -p tcp --dport 22 -j ACCEPT

# HTTP for Let's Encrypt
-A INPUT -p tcp --dport 80 -j ACCEPT

COMMIT
EOF

# Apply optimized rules
sudo iptables-restore < /etc/iptables/rules.v4
```

### Network Interface Optimization

```bash
# Optimize network interface settings
sudo tee /etc/systemd/system/network-optimization.service > /dev/null <<EOF
[Unit]
Description=Network Performance Optimization
After=network.target

[Service]
Type=oneshot
ExecStart=/bin/bash -c '
  # Get primary network interface
  IFACE=\$(ip route | grep default | awk "{print \$5}" | head -n1)
  
  # Optimize network interface
  ethtool -G \$IFACE rx 4096 tx 4096 2>/dev/null || true
  ethtool -K \$IFACE gso on gro on tso on 2>/dev/null || true
  ethtool -C \$IFACE rx-usecs 50 tx-usecs 50 2>/dev/null || true
'
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl enable network-optimization
sudo systemctl start network-optimization
```

## Monitoring and Metrics

### Performance Monitoring Setup

```bash
# Install performance monitoring tools
sudo apt install -y htop iotop nethogs vnstat iperf3 sysstat

# Create performance monitoring script
cat > /usr/local/bin/performance-monitor.sh <<EOF
#!/bin/bash
LOG_FILE="/var/log/performance-monitor.log"
DATE=\$(date)

echo "=== Performance Monitor \$DATE ===" >> \$LOG_FILE

# CPU Usage
echo "CPU Usage:" >> \$LOG_FILE
top -bn1 | grep "Cpu(s)" >> \$LOG_FILE

# Memory Usage
echo "Memory Usage:" >> \$LOG_FILE
free -h >> \$LOG_FILE

# Disk I/O
echo "Disk I/O:" >> \$LOG_FILE
iostat -x 1 1 | tail -n +4 >> \$LOG_FILE

# Network Statistics
echo "Network Statistics:" >> \$LOG_FILE
cat /proc/net/dev | grep -E "(eth0|ens|enp)" >> \$LOG_FILE

# VPN Connections
echo "VPN Connections:" >> \$LOG_FILE
VPN_CONNECTIONS=\$(netstat -an | grep :1194 | grep ESTABLISHED | wc -l)
echo "Active connections: \$VPN_CONNECTIONS" >> \$LOG_FILE

# Container Resources (if using Docker)
if command -v docker &> /dev/null; then
    echo "Container Resources:" >> \$LOG_FILE
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}" >> \$LOG_FILE
fi

echo "=========================" >> \$LOG_FILE
EOF

chmod +x /usr/local/bin/performance-monitor.sh

# Schedule performance monitoring
echo "*/5 * * * * /usr/local/bin/performance-monitor.sh" | sudo crontab -
```

### Real-time Performance Dashboard

```bash
# Create simple performance dashboard script
cat > /usr/local/bin/performance-dashboard.sh <<EOF
#!/bin/bash

while true; do
    clear
    echo "=== Family VPN Server Performance Dashboard ==="
    echo "Time: \$(date)"
    echo
    
    # System Load
    echo "System Load:"
    uptime
    echo
    
    # CPU Usage
    echo "CPU Usage:"
    top -bn1 | grep "Cpu(s)"
    echo
    
    # Memory Usage
    echo "Memory Usage:"
    free -h
    echo
    
    # Disk Usage
    echo "Disk Usage:"
    df -h / | tail -1
    echo
    
    # Network Connections
    echo "VPN Connections:"
    VPN_CONN=\$(netstat -an | grep :1194 | grep ESTABLISHED | wc -l)
    echo "Active VPN connections: \$VPN_CONN"
    
    WEB_CONN=\$(netstat -an | grep :3000 | grep ESTABLISHED | wc -l)
    echo "Active web connections: \$WEB_CONN"
    echo
    
    # Container Status (if using Docker)
    if command -v docker &> /dev/null; then
        echo "Container Status:"
        docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}"
        echo
    fi
    
    echo "Press Ctrl+C to exit"
    sleep 5
done
EOF

chmod +x /usr/local/bin/performance-dashboard.sh
```

## Performance Testing

### Network Performance Testing

```bash
# Create network performance test script
cat > /usr/local/bin/test-network-performance.sh <<EOF
#!/bin/bash

echo "=== Network Performance Test ==="
echo "Date: \$(date)"
echo

# Test internet connectivity and speed
echo "Testing internet connectivity..."
ping -c 4 8.8.8.8

echo
echo "Testing DNS resolution..."
nslookup google.com

# If iperf3 is available, test bandwidth
if command -v iperf3 &> /dev/null; then
    echo
    echo "Starting iperf3 server for bandwidth testing..."
    echo "Run 'iperf3 -c your-server-ip' from a client to test bandwidth"
    iperf3 -s -D
fi

# Test VPN port connectivity
echo
echo "Testing VPN port accessibility..."
nc -u -l 1194 &
NC_PID=\$!
sleep 2
echo "test" | nc -u localhost 1194
kill \$NC_PID 2>/dev/null

echo
echo "Network performance test completed"
EOF

chmod +x /usr/local/bin/test-network-performance.sh
```

### VPN Performance Testing

```bash
# Create VPN-specific performance test
cat > /usr/local/bin/test-vpn-performance.sh <<EOF
#!/bin/bash

echo "=== VPN Performance Test ==="
echo "Date: \$(date)"
echo

# Test OpenVPN process
echo "Checking OpenVPN process..."
if pgrep -f openvpn > /dev/null; then
    echo "✓ OpenVPN is running"
    
    # Get process details
    ps aux | grep openvpn | grep -v grep
else
    echo "✗ OpenVPN is not running"
fi

echo

# Test web interface response time
echo "Testing web interface response time..."
if command -v curl &> /dev/null; then
    RESPONSE_TIME=\$(curl -o /dev/null -s -w "%{time_total}" http://localhost:3000/health)
    echo "Health endpoint response time: \${RESPONSE_TIME}s"
else
    echo "curl not available for response time testing"
fi

echo

# Check certificate validity
echo "Checking certificate validity..."
if [ -f "/etc/letsencrypt/live/\$(hostname)/cert.pem" ]; then
    EXPIRY=\$(openssl x509 -in /etc/letsencrypt/live/\$(hostname)/cert.pem -noout -enddate | cut -d= -f2)
    echo "Certificate expires: \$EXPIRY"
else
    echo "No SSL certificate found"
fi

echo

# Memory usage analysis
echo "Memory usage analysis..."
ps aux --sort=-%mem | head -10

echo
echo "VPN performance test completed"
EOF

chmod +x /usr/local/bin/test-vpn-performance.sh
```

## Troubleshooting Performance Issues

### Common Performance Problems

#### High CPU Usage

```bash
# Identify CPU-intensive processes
top -o %CPU

# Check for runaway processes
ps aux --sort=-%cpu | head -10

# Monitor CPU usage over time
sar -u 1 60  # Monitor for 60 seconds

# Solutions:
# 1. Reduce OpenVPN compression if enabled
# 2. Optimize cipher selection (AES-GCM is hardware accelerated)
# 3. Increase CPU resources
# 4. Distribute load across multiple instances
```

#### High Memory Usage

```bash
# Check memory usage
free -h
ps aux --sort=-%mem | head -10

# Check for memory leaks
valgrind --tool=memcheck --leak-check=full node src/server.js

# Solutions:
# 1. Increase available RAM
# 2. Optimize Node.js memory settings
# 3. Implement log rotation
# 4. Clear temporary files regularly
```

#### Network Bottlenecks

```bash
# Monitor network usage
nethogs
iftop
vnstat -l

# Check network errors
cat /proc/net/dev

# Test bandwidth
iperf3 -c speedtest.server.com

# Solutions:
# 1. Upgrade network bandwidth
# 2. Optimize network buffers
# 3. Use traffic shaping
# 4. Implement connection limits
```

#### Disk I/O Issues

```bash
# Monitor disk I/O
iotop
iostat -x 1

# Check disk usage
df -h
du -sh /*

# Test disk performance
dd if=/dev/zero of=/tmp/test bs=1M count=1000 oflag=direct

# Solutions:
# 1. Upgrade to SSD storage
# 2. Implement log rotation
# 3. Move logs to separate disk
# 4. Optimize I/O scheduler
```

### Performance Tuning Checklist

#### System Level
- [ ] Kernel parameters optimized
- [ ] CPU governor set to performance
- [ ] I/O scheduler optimized for storage type
- [ ] Network buffers increased
- [ ] Connection tracking optimized
- [ ] Swap usage minimized

#### Application Level
- [ ] Node.js memory limits configured
- [ ] Express.js compression enabled
- [ ] Static file caching configured
- [ ] Connection keep-alive enabled
- [ ] Log levels optimized for production
- [ ] Unnecessary features disabled

#### OpenVPN Level
- [ ] Buffer sizes optimized (sndbuf/rcvbuf)
- [ ] Fast I/O enabled
- [ ] Appropriate cipher selected
- [ ] Compression configured appropriately
- [ ] Connection parameters tuned
- [ ] Logging verbosity reduced

#### Docker Level
- [ ] Resource limits configured
- [ ] Logging driver optimized
- [ ] Storage driver optimized
- [ ] Network mode optimized
- [ ] Security settings balanced with performance
- [ ] Health checks configured

## Performance Benchmarks

### Expected Performance Metrics

#### Small Deployment (1-10 users)
- **CPU Usage**: < 20% average
- **Memory Usage**: < 512MB
- **Disk I/O**: < 10 MB/s
- **Network Throughput**: Up to 100 Mbps per connection
- **Connection Establishment**: < 5 seconds
- **Web Interface Response**: < 500ms

#### Medium Deployment (10-50 users)
- **CPU Usage**: < 50% average
- **Memory Usage**: < 1GB
- **Disk I/O**: < 50 MB/s
- **Network Throughput**: Up to 500 Mbps aggregate
- **Connection Establishment**: < 10 seconds
- **Web Interface Response**: < 1 second

#### Large Deployment (50+ users)
- **CPU Usage**: < 80% average
- **Memory Usage**: < 2GB
- **Disk I/O**: < 100 MB/s
- **Network Throughput**: Up to 1 Gbps aggregate
- **Connection Establishment**: < 15 seconds
- **Web Interface Response**: < 2 seconds

### Benchmark Testing

```bash
# Create comprehensive benchmark script
cat > /usr/local/bin/benchmark-vpn.sh <<EOF
#!/bin/bash

echo "=== VPN Server Benchmark ==="
echo "Date: \$(date)"
echo "Hostname: \$(hostname)"
echo

# System Information
echo "System Information:"
echo "CPU: \$(lscpu | grep 'Model name' | cut -d: -f2 | xargs)"
echo "Memory: \$(free -h | grep Mem | awk '{print \$2}')"
echo "Disk: \$(df -h / | tail -1 | awk '{print \$2}')"
echo

# CPU Benchmark
echo "CPU Benchmark:"
time echo "scale=5000; 4*a(1)" | bc -l > /dev/null

# Memory Benchmark
echo "Memory Benchmark:"
time dd if=/dev/zero of=/dev/null bs=1M count=1000 2>&1 | grep copied

# Disk Benchmark
echo "Disk Benchmark:"
time dd if=/dev/zero of=/tmp/benchmark bs=1M count=100 oflag=direct 2>&1 | grep copied
rm -f /tmp/benchmark

# Network Benchmark (if iperf3 available)
if command -v iperf3 &> /dev/null; then
    echo "Network Benchmark:"
    iperf3 -c speedtest.net -t 10 2>/dev/null || echo "Network benchmark unavailable"
fi

echo
echo "Benchmark completed"
EOF

chmod +x /usr/local/bin/benchmark-vpn.sh
```

## Related Documentation

- [Production Best Practices](production.md) - Security and monitoring
- [Docker Deployment](docker.md) - Containerized deployment
- [Configuration Guide](../configuration/README.md) - Environment configuration
- [Troubleshooting](../troubleshooting/README.md) - Common issues and solutions