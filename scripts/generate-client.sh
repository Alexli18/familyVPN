#!/bin/bash

if [ -z "$1" ]; then
    echo "Usage: $0 <client_name>"
    exit 1
fi

CLIENT_NAME=$1
# Generate client certificates
cd /app
node -e "
const CertificateManager = require('./src/utils/certificate-manager');
const certManager = new CertificateManager();
certManager.generateClientCertificate('${CLIENT_NAME}')
  .then(() => console.log('Client certificate generated successfully'))
  .catch(console.error)
"