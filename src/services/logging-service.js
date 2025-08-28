const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');
const fs = require('fs');

class LoggingService {
  constructor() {
    this.enabled = process.env.LOGGER !== '0';
    this.logDir = process.env.LOG_DIR || './logs';
    
    if (this.enabled) {
      this.ensureLogDirectory();
      this.logger = this.createLogger();
    } else {
      this.logger = this.createNullLogger();
    }
  }

  ensureLogDirectory() {
    if (this.enabled && !fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  createLogger() {
    // Simplified format for structured logging
    const structuredFormat = winston.format.combine(
      winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss.SSS'
      }),
      winston.format.errors({ stack: true }),
      winston.format.json(),
      winston.format.printf(({ timestamp, level, message, ...meta }) => {
        const logEntry = {
          timestamp,
          level,
          message,
          ...meta
        };
        return JSON.stringify(logEntry);
      })
    );

    // Daily rotate file transport for general logs
    const generalLogTransport = new DailyRotateFile({
      filename: path.join(this.logDir, 'application-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '30d', // Keep logs for 30 days
      format: structuredFormat
    });

    // Daily rotate file transport for error logs
    const errorLogTransport = new DailyRotateFile({
      filename: path.join(this.logDir, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '30d',
      level: 'error',
      format: structuredFormat
    });

    // Daily rotate file transport for security logs (merged into main logger)
    const securityLogTransport = new DailyRotateFile({
      filename: path.join(this.logDir, 'security-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '30d',
      format: structuredFormat
    });

    // Console transport for development
    const consoleTransport = new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({
          format: 'HH:mm:ss'
        }),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
          return `${timestamp} ${level}: ${message} ${metaStr}`;
        })
      )
    });

    return winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      transports: [
        generalLogTransport,
        errorLogTransport,
        securityLogTransport,
        consoleTransport
      ],
      exitOnError: false
    });
  }



  createNullLogger() {
    // Create a null logger that does nothing when logging is disabled
    return {
      info: () => {},
      warn: () => {},
      error: () => {},
      debug: () => {},
      transports: []
    };
  }

  // Simplified logging methods without correlation ID support
  info(message, meta = {}) {
    this.logger.info(message, meta);
  }

  warn(message, meta = {}) {
    this.logger.warn(message, meta);
  }

  error(message, meta = {}) {
    this.logger.error(message, meta);
  }

  debug(message, meta = {}) {
    this.logger.debug(message, meta);
  }

  // Simplified security event logging methods
  logSecurityEvent(eventType, message, meta = {}) {
    const securityMeta = {
      ...meta,
      eventType,
      severity: this.determineSeverity(eventType),
      timestamp: new Date().toISOString()
    };

    // Log security events to main logger with SECURITY prefix
    this.logger.warn(`SECURITY: ${message}`, securityMeta);
  }

  logAuthenticationEvent(eventType, username, clientIP, success, meta = {}) {
    this.logSecurityEvent('AUTHENTICATION', `Authentication ${eventType}`, {
      ...meta,
      username,
      clientIP,
      success,
      authEventType: eventType
    });
  }

  logCertificateEvent(eventType, clientName, username, clientIP, meta = {}) {
    this.logSecurityEvent('CERTIFICATE', `Certificate ${eventType}`, {
      ...meta,
      clientName,
      username,
      clientIP,
      certEventType: eventType
    });
  }

  logSystemEvent(eventType, message, meta = {}) {
    this.logSecurityEvent('SYSTEM', message, {
      ...meta,
      systemEventType: eventType
    });
  }

  determineSeverity(eventType) {
    const severityMap = {
      'AUTHENTICATION': 'medium',
      'CERTIFICATE': 'medium',
      'SYSTEM': 'low',
      'INTRUSION': 'high',
      'FAILURE': 'high',
      'BREACH': 'critical'
    };
    return severityMap[eventType] || 'low';
  }

  // Log rotation event handlers
  setupLogRotationHandlers() {
    if (!this.enabled) return;
    
    this.logger.transports.forEach(transport => {
      if (transport instanceof DailyRotateFile) {
        transport.on('rotate', (oldFilename, newFilename) => {
          this.info('Log file rotated', {
            oldFilename,
            newFilename,
            eventType: 'LOG_ROTATION'
          });
        });

        transport.on('archive', (zipFilename) => {
          this.info('Log file archived', {
            zipFilename,
            eventType: 'LOG_ARCHIVE'
          });
        });
      }
    });
  }

  // Generate alert method for test compatibility
  generateAlert(severity, message, context = {}) {
    const alertMeta = {
      ...context,
      severity,
      alertType: 'SYSTEM_ALERT',
      timestamp: new Date().toISOString()
    };

    // Log alerts as security events with ALERT prefix
    this.logger.warn(`ALERT: ${message}`, alertMeta);
  }

  // Get logger instance for backward compatibility
  getLogger() {
    return this.logger;
  }
}

module.exports = LoggingService;