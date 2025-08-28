#!/bin/bash

# Setup script to prepare certificates for Docker container

echo "🐳 Setting up certificates for Docker container..."

# Create certificates directory if it doesn't exist
mkdir -p ./certificates

# Copy certificates from local setup to container-ready location
if [ -d "/Users/alex/.privatevpn/certificates" ]; then
    echo "📋 Copying certificates from local setup..."
    cp -r /Users/alex/.privatevpn/certificates/* ./certificates/
    echo "✅ Certificates copied successfully"
else
    echo "⚠️  Local certificates not found. Running container setup..."
fi

# Ensure proper permissions
chmod -R 755 ./certificates

echo "🎉 Docker certificate setup complete!"