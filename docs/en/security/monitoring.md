# Security Monitoring and Logging

## Overview

The Family VPN Server implements comprehensive security monitoring and logging to detect, track, and respond to security events. This system provides real-time visibility into authentication attempts, system access, and potential security threats.

## Logging Architecture

### Structured Logging

The system uses Winston for structured, JSON-formatted logging with multiple transport layers:

```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/security.log', level: 'warn' }),
    new winston.transports.File({ filename: 'logs/application.log' })
  ]
});
```

### Log Categories

#### Security Logs (`logs/security-YYYY-MM-DD.log`)
- Authentication events (success/failure)
- Authorization attempts
- Account lockouts and unlocks
- Certificate operations
- Firewall events
- Suspicious activities

#### Application Logs (`logs/application-YYYY-MM-DD.log`)
- System startup and shutdown
- Configuration changes
- API requests and responses
- Performance metrics
- General application events

#### Error Logs (`logs/error-YYYY-MM-DD.log`)
- System errors and exceptions
- Security-related errors
- Certificate validation failures
- Network connectivity issues
- Configuration errors

## Security Event Logging

### Authentication Events

#### Successful Authentication
```json
{
  "timestamp": "2025-01-15T10:30:00.000Z",
  "level": "info",
  "message": "Authentication successful",
  "category": "security",
  "event": "auth_success",
  "username": "admin",
  "clientIP": "192.168.1.100",
  "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  "sessionId": "sess_abc123def456",
  "correlationId": "req_789ghi012jkl",
  "duration": 245
}
```

#### Failed Authentication
```json
{
  "timestamp": "2025-01-15T10:30:00.000Z",
  "level": "warn",
  "message": "Authentication failed",
  "category": "security",
  "event": "auth_failure",
  "username": "admin",
  "clientIP": "192.168.1.100",
  "error": "Invalid credentials",
  "attemptCount": 3,
  "remainingAttempts": 2,
  "correlationId": "req_789ghi012jkl"
}
```

#### Account Lockout
```json
{
  "timestamp": "2025-01-15T10:30:00.000Z",
  "level": "error",
  "message": "Account locked due to excessive failed attempts",
  "category": "security",
  "event": "account_lockout",
  "username": "admin",
  "clientIP": "192.168.1.100",
  "failedAttempts": 5,
  "lockoutDuration": 900000,
  "correlationId": "req_789ghi012jkl"
}
```

### Certificate Operations

#### Certificate Generation
```json
{
  "timestamp": "2025-01-15T10:30:00.000Z",
  "level": "info",
  "message": "Client certificate generated",
  "category": "security",
  "event": "cert_generated",
  "clientName": "family-device-01",
  "certificateSerial": "1A2B3C4D5E6F",
  "validFrom": "2025-01-15T10:30:00.000Z",
  "validTo": "2026-01-15T10:30:00.000Z",
  "requestedBy": "admin",
  "clientIP": "192.168.1.100"
}
```

#### Certificate Revocation
```json
{
  "timestamp": "2025-01-15T10:30:00.000Z",
  "level": "warn",
  "message": "Client certificate revoked",
  "category": "security",
  "event": "cert_revoked",
  "clientName": "family-device-01",
  "certificateSerial": "1A2B3C4D5E6F",
  "revocationReason": "key_compromise",
  "revokedBy": "admin",
  "clientIP": "192.168.1.100"
}
```

### VPN Connection Events

#### Client Connection
```json
{
  "timestamp": "2025-01-15T10:30:00.000Z",
  "level": "info",
  "message": "VPN client connected",
  "category": "security",
  "event": "vpn_connect",
  "clientName": "family-device-01",
  "clientIP": "10.8.0.2",
  "realIP": "203.0.113.45",
  "bytesReceived": 0,
  "bytesSent": 0,
  "connectionId": "conn_abc123"
}
```

#### Client Disconnection
```json
{
  "timestamp": "2025-01-15T10:30:00.000Z",
  "level": "info",
  "message": "VPN client disconnected",
  "category": "security",
  "event": "vpn_disconnect",
  "clientName": "family-device-01",
  "clientIP": "10.8.0.2",
  "sessionDuration": 3600,
  "bytesReceived": 1048576,
  "bytesSent": 2097152,
  "connectionId": "conn_abc123"
}
```

### System Security Events

#### Firewall Rule Changes
```json
{
  "timestamp": "2025-01-15T10:30:00.000Z",
  "level": "info",
  "message": "Firewall rules updated",
  "category": "security",
  "event": "firewall_update",
  "action": "rules_applied",
  "rulesCount": 15,
  "modifiedBy": "system",
  "configHash": "sha256:abc123def456"
}
```

#### Configuration Changes
```json
{
  "timestamp": "2025-01-15T10:30:00.000Z",
  "level": "info",
  "message": "Security configuration updated",
  "category": "security",
  "event": "config_change",
  "component": "authentication",
  "changes": ["jwt_expiry", "max_failed_attempts"],
  "modifiedBy": "admin",
  "clientIP": "192.168.1.100"
}
```

## Monitoring Metrics

### Authentication Metrics

#### Success Rate Tracking
```javascript
const authMetrics = {
  totalAttempts: 1000,
  successfulAttempts: 950,
  failedAttempts: 50,
  successRate: 0.95,
  averageResponseTime: 245,
  uniqueUsers: 5,
  uniqueIPs: 8
};
```

#### Failed Attempt Analysis
```javascript
const failureAnalysis = {
  byReason: {
    'invalid_credentials': 35,
    'account_locked': 10,
    'rate_limited': 5
  },
  byIP: {
    '192.168.1.100': 20,
    '203.0.113.45': 15,
    '198.51.100.10': 15
  },
  byTimeOfDay: {
    '00-06': 2,
    '06-12': 15,
    '12-18': 25,
    '18-24': 8
  }
};
```

### System Performance Metrics

#### Resource Utilization
```javascript
const systemMetrics = {
  cpu: {
    usage: 15.5,
    loadAverage: [0.8, 0.9, 1.1]
  },
  memory: {
    used: 512000000,
    total: 2048000000,
    percentage: 25.0
  },
  disk: {
    used: 5368709120,
    total: 21474836480,
    percentage: 25.0
  },
  network: {
    bytesIn: 1073741824,
    bytesOut: 2147483648,
    packetsIn: 1000000,
    packetsOut: 1500000
  }
};
```

#### VPN Connection Metrics
```javascript
const vpnMetrics = {
  activeConnections: 5,
  totalConnections: 25,
  averageSessionDuration: 7200,
  totalBytesTransferred: 10737418240,
  connectionsByClient: {
    'family-device-01': 8,
    'family-device-02': 6,
    'family-device-03': 11
  }
};
```

## Threat Detection

### Anomaly Detection

#### Brute Force Detection
```javascript
const bruteForceDetection = {
  threshold: 5,
  timeWindow: 900000, // 15 minutes
  detection: {
    multipleFailures: true,
    rapidAttempts: true,
    distributedAttack: false
  },
  response: {
    accountLockout: true,
    ipBlocking: true,
    alertGeneration: true
  }
};
```

#### Suspicious Activity Patterns
- Multiple failed logins from different IPs
- Login attempts outside normal hours
- Rapid certificate generation requests
- Unusual VPN connection patterns
- High-frequency API requests

### Alert Generation

#### Critical Security Alerts
```json
{
  "timestamp": "2025-01-15T10:30:00.000Z",
  "level": "critical",
  "message": "Potential brute force attack detected",
  "category": "security_alert",
  "event": "brute_force_detected",
  "details": {
    "targetAccount": "admin",
    "sourceIPs": ["203.0.113.45", "198.51.100.10"],
    "attemptCount": 15,
    "timeWindow": "5 minutes",
    "actionTaken": "account_locked"
  },
  "severity": "high",
  "requiresAction": true
}
```

#### System Health Alerts
```json
{
  "timestamp": "2025-01-15T10:30:00.000Z",
  "level": "warn",
  "message": "High CPU usage detected",
  "category": "system_alert",
  "event": "resource_threshold_exceeded",
  "details": {
    "resource": "cpu",
    "currentUsage": 85.5,
    "threshold": 80.0,
    "duration": "10 minutes"
  },
  "severity": "medium",
  "requiresAction": false
}
```

## Log Management

### Log Rotation

#### Automatic Rotation Configuration
```javascript
const DailyRotateFile = require('winston-daily-rotate-file');

const rotatingTransport = new DailyRotateFile({
  filename: 'logs/application-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '30d'
});
```

#### Manual Log Management
```bash
# Compress old logs
gzip logs/application-2025-01-14.log

# Archive logs older than 30 days
find logs/ -name "*.log" -mtime +30 -exec gzip {} \;

# Clean up very old logs
find logs/ -name "*.gz" -mtime +90 -delete
```

### Log Analysis

#### Security Event Analysis
```bash
# Count authentication failures by IP
grep "auth_failure" logs/security-*.log | \
  jq -r '.clientIP' | sort | uniq -c | sort -nr

# Find suspicious login patterns
grep "auth_failure" logs/security-*.log | \
  jq -r 'select(.attemptCount >= 3) | .clientIP' | \
  sort | uniq -c | sort -nr

# Analyze certificate operations
grep "cert_" logs/security-*.log | \
  jq -r '.event' | sort | uniq -c
```

#### Performance Analysis
```bash
# Average response times
grep "auth_success" logs/application-*.log | \
  jq -r '.duration' | \
  awk '{sum+=$1; count++} END {print "Average:", sum/count "ms"}'

# Connection duration analysis
grep "vpn_disconnect" logs/security-*.log | \
  jq -r '.sessionDuration' | \
  awk '{sum+=$1; count++} END {print "Average session:", sum/count "seconds"}'
```

## Monitoring Tools and Scripts

### Security Monitoring Script

```bash
#!/bin/bash
# security-monitor.sh

LOG_DIR="logs"
ALERT_THRESHOLD=5
TIME_WINDOW=900 # 15 minutes

# Check for brute force attempts
check_brute_force() {
    local recent_failures=$(grep "auth_failure" "$LOG_DIR/security-$(date +%Y-%m-%d).log" | \
        jq -r --arg threshold "$(date -d '15 minutes ago' -Iseconds)" \
        'select(.timestamp > $threshold) | .clientIP' | \
        sort | uniq -c | awk -v thresh="$ALERT_THRESHOLD" '$1 >= thresh')
    
    if [ -n "$recent_failures" ]; then
        echo "ALERT: Potential brute force attack detected"
        echo "$recent_failures"
        # Send alert notification
        send_alert "brute_force" "$recent_failures"
    fi
}

# Check system health
check_system_health() {
    local cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)
    local memory_usage=$(free | grep Mem | awk '{printf "%.1f", $3/$2 * 100.0}')
    
    if (( $(echo "$cpu_usage > 80" | bc -l) )); then
        echo "ALERT: High CPU usage: $cpu_usage%"
        send_alert "high_cpu" "$cpu_usage"
    fi
    
    if (( $(echo "$memory_usage > 90" | bc -l) )); then
        echo "ALERT: High memory usage: $memory_usage%"
        send_alert "high_memory" "$memory_usage"
    fi
}

# Send alert notification
send_alert() {
    local alert_type="$1"
    local details="$2"
    
    # Log alert
    echo "{\"timestamp\":\"$(date -Iseconds)\",\"level\":\"critical\",\"message\":\"Security alert: $alert_type\",\"details\":\"$details\"}" >> "$LOG_DIR/alerts.log"
    
    # Additional notification methods (email, webhook, etc.)
    # curl -X POST "$WEBHOOK_URL" -d "{\"alert\":\"$alert_type\",\"details\":\"$details\"}"
}

# Main monitoring loop
main() {
    while true; do
        check_brute_force
        check_system_health
        sleep 300 # Check every 5 minutes
    done
}

main "$@"
```

### Log Analysis Dashboard

```javascript
// log-dashboard.js
const fs = require('fs');
const path = require('path');

class SecurityDashboard {
    constructor(logDir = 'logs') {
        this.logDir = logDir;
    }
    
    async generateReport() {
        const today = new Date().toISOString().split('T')[0];
        const securityLog = path.join(this.logDir, `security-${today}.log`);
        
        if (!fs.existsSync(securityLog)) {
            console.log('No security logs found for today');
            return;
        }
        
        const logs = fs.readFileSync(securityLog, 'utf8')
            .split('\n')
            .filter(line => line.trim())
            .map(line => {
                try {
                    return JSON.parse(line);
                } catch (e) {
                    return null;
                }
            })
            .filter(log => log !== null);
        
        const report = {
            totalEvents: logs.length,
            authSuccesses: logs.filter(log => log.event === 'auth_success').length,
            authFailures: logs.filter(log => log.event === 'auth_failure').length,
            vpnConnections: logs.filter(log => log.event === 'vpn_connect').length,
            certificateOperations: logs.filter(log => log.event?.startsWith('cert_')).length,
            uniqueIPs: [...new Set(logs.map(log => log.clientIP).filter(ip => ip))].length,
            topFailureIPs: this.getTopFailureIPs(logs),
            hourlyActivity: this.getHourlyActivity(logs)
        };
        
        console.log('Security Report for', today);
        console.log('================================');
        console.log(`Total Events: ${report.totalEvents}`);
        console.log(`Authentication Successes: ${report.authSuccesses}`);
        console.log(`Authentication Failures: ${report.authFailures}`);
        console.log(`VPN Connections: ${report.vpnConnections}`);
        console.log(`Certificate Operations: ${report.certificateOperations}`);
        console.log(`Unique IP Addresses: ${report.uniqueIPs}`);
        
        if (report.topFailureIPs.length > 0) {
            console.log('\nTop Failure IPs:');
            report.topFailureIPs.forEach(([ip, count]) => {
                console.log(`  ${ip}: ${count} failures`);
            });
        }
        
        return report;
    }
    
    getTopFailureIPs(logs) {
        const failures = logs.filter(log => log.event === 'auth_failure');
        const ipCounts = {};
        
        failures.forEach(log => {
            if (log.clientIP) {
                ipCounts[log.clientIP] = (ipCounts[log.clientIP] || 0) + 1;
            }
        });
        
        return Object.entries(ipCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5);
    }
    
    getHourlyActivity(logs) {
        const hourly = new Array(24).fill(0);
        
        logs.forEach(log => {
            const hour = new Date(log.timestamp).getHours();
            hourly[hour]++;
        });
        
        return hourly;
    }
}

// Usage
const dashboard = new SecurityDashboard();
dashboard.generateReport();
```

## Integration with External Systems

### SIEM Integration

#### Syslog Export
```javascript
const syslog = require('syslog-client');

const syslogClient = syslog.createClient('siem-server.example.com', {
    port: 514,
    transport: syslog.Transport.Udp
});

function sendToSIEM(logEntry) {
    const message = JSON.stringify(logEntry);
    syslogClient.log(message, syslog.Severity.Informational);
}
```

#### Webhook Notifications
```javascript
const axios = require('axios');

async function sendWebhookAlert(alert) {
    try {
        await axios.post(process.env.WEBHOOK_URL, {
            timestamp: new Date().toISOString(),
            service: 'family-vpn-server',
            alert: alert,
            severity: alert.level
        });
    } catch (error) {
        console.error('Failed to send webhook alert:', error.message);
    }
}
```

## Compliance and Retention

### Log Retention Policy

#### Retention Periods
- **Security Logs**: 1 year minimum
- **Application Logs**: 90 days
- **Error Logs**: 6 months
- **Audit Logs**: 7 years (if required by compliance)

#### Compliance Requirements
- **Data Protection**: Anonymize or pseudonymize personal data
- **Access Control**: Restrict log access to authorized personnel
- **Integrity**: Ensure log integrity with checksums or signatures
- **Backup**: Regular backup of critical security logs

### Privacy Considerations

#### Data Minimization
- Log only necessary security information
- Avoid logging sensitive personal data
- Use correlation IDs instead of personal identifiers
- Regular review of logged data types

#### Data Anonymization
```javascript
function anonymizeIP(ip) {
    const parts = ip.split('.');
    if (parts.length === 4) {
        // Anonymize last octet for IPv4
        return `${parts[0]}.${parts[1]}.${parts[2]}.xxx`;
    }
    return 'anonymized';
}
```

## Troubleshooting Monitoring Issues

### Common Problems

#### Missing Logs
- **Cause**: Insufficient disk space, permission issues
- **Solution**: Check disk space, verify file permissions
- **Prevention**: Implement log rotation, monitor disk usage

#### Performance Impact
- **Cause**: Excessive logging, synchronous I/O
- **Solution**: Optimize log levels, use async logging
- **Prevention**: Regular performance monitoring

#### Log Corruption
- **Cause**: System crashes, disk errors
- **Solution**: Restore from backups, implement checksums
- **Prevention**: Regular integrity checks, redundant storage

### Monitoring Health Checks

```bash
# Check log file permissions
ls -la logs/

# Verify log rotation is working
ls -la logs/ | grep -E '\.(gz|zip)$'

# Check disk space for logs
df -h logs/

# Verify logging service is running
systemctl status winston-logger || ps aux | grep node
```

## Related Documentation

- [Security Overview](overview.md) - Complete security architecture
- [Authentication System](authentication.md) - Authentication event details
- [Best Practices](best-practices.md) - Security monitoring best practices
- [Troubleshooting](../troubleshooting/common-issues.md) - Security troubleshooting
- [Configuration](../configuration/environment.md) - Logging configuration