#!/bin/bash

# Create necessary directories
mkdir -p /etc/openvpn/certificates
mkdir -p /etc/openvpn/client-configs

# Set proper permissions
chmod -R 700 /etc/openvpn/certificates
chmod -R 700 /etc/openvpn/client-configs

# Initialize PKI and generate server certificates
cd /app
node -e "
const CertificateManager = require('./src/utils/certificate-manager');
const certManager = new CertificateManager();
Promise.all([
  certManager.initializePKI(),
  certManager.generateServerCertificates()
])
  .then(() => console.log('Server setup completed successfully'))
  .catch(console.error)
"