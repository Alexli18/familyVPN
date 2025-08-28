class BasicHealthService {
  constructor(loggingService) {
    this.loggingService = loggingService;
    this.basicStats = {
      auth: { attempts: 0, failures: 0, successes: 0 },
      certificates: { generated: 0, failures: 0 },
      system: { startTime: Date.now(), errors: 0 },
      http: { requests: 0, errors: 0 }
    };
  }

  // Get basic health status for /health endpoint
  async getBasicHealthStatus() {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      stats: this.basicStats
    };
  }

  // Simple tracking methods (lightweight and useful)
  recordAuthAttempt(status, username, clientIP) {
    this.basicStats.auth.attempts++;
    
    if (status === 'success') {
      this.basicStats.auth.successes++;
    } else {
      this.basicStats.auth.failures++;
    }

    this.loggingService.debug('Auth attempt recorded', {
      status,
      username,
      clientIP,
      totalAttempts: this.basicStats.auth.attempts
    });
  }

  recordCertificateOperation(operation, status, username) {
    if (operation === 'generate') {
      if (status === 'success') {
        this.basicStats.certificates.generated++;
      } else {
        this.basicStats.certificates.failures++;
      }
    }

    this.loggingService.debug('Certificate operation recorded', {
      operation,
      status,
      username,
      totalGenerated: this.basicStats.certificates.generated
    });
  }

  recordHttpRequest(method, route, statusCode) {
    this.basicStats.http.requests++;

    if (statusCode >= 400) {
      this.basicStats.http.errors++;
    }
  }

  recordSystemError(errorType) {
    this.basicStats.system.errors++;
  }

  // Get basic metrics summary
  getBasicMetrics() {
    return {
      timestamp: new Date().toISOString(),
      auth: {
        totalAttempts: this.basicStats.auth.attempts,
        successRate: this.basicStats.auth.attempts > 0 
          ? (this.basicStats.auth.successes / this.basicStats.auth.attempts * 100).toFixed(2) + '%'
          : '0%'
      },
      certificates: {
        totalGenerated: this.basicStats.certificates.generated,
        failures: this.basicStats.certificates.failures
      },
      system: {
        uptime: process.uptime(),
        errors: this.basicStats.system.errors
      },
      http: {
        totalRequests: this.basicStats.http.requests,
        errors: this.basicStats.http.errors
      }
    };
  }

  // Alias for getBasicMetrics to match test expectations
  getMetrics() {
    return this.getBasicMetrics();
  }

  // Record metric method for test compatibility
  recordMetric(name, value, labels = {}) {
    this.loggingService.debug('Metric recorded', {
      name,
      value,
      labels,
      timestamp: new Date().toISOString()
    });
  }


}

module.exports = BasicHealthService;