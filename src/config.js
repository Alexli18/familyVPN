module.exports = {
  vpn: {
    subnet: process.env.VPN_SUBNET || '10.8.0.0',
    netmask: process.env.VPN_NETMASK || '255.255.255.0',
    port: 1194,
    protocol: 'udp'
  },
  certificates: {
    dir: process.env.VPN_CERT_DIR || (process.env.NODE_ENV === 'production' ? './certificates' : '/Users/alex/.privatevpn/certificates'),
    serverCertName: 'server',
    validityDays: 3650 // 10 years
  },
  config: {
    path: process.env.VPN_CONFIG_DIR || (process.env.NODE_ENV === 'production' ? './config' : '/Users/alex/.privatevpn/config')
  },
  web: {
    port: parseInt(process.env.WEB_PORT) || 3000,
    httpsOnly: process.env.WEB_HTTPS_ONLY === 'true',
    session: {
      secret: process.env.WEB_SESSION_SECRET,
      timeout: parseInt(process.env.WEB_SESSION_TIMEOUT) || 30 * 60 * 1000, // 30 minutes
      name: 'vpn.session.id'
    },
    rateLimit: {
      general: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100 // requests per window
      },
      login: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 5 // attempts per window
      },
      certificate: {
        windowMs: 60 * 60 * 1000, // 1 hour
        max: 10 // generations per window
      }
    },
    security: {
      helmet: {
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"]
          }
        },
        hsts: {
          maxAge: 31536000, // 1 year
          includeSubDomains: true,
          preload: true
        }
      }
    }
  }
};