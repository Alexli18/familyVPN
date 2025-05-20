# Dockerfile
FROM node:18-alpine

# Install OpenVPN and required tools
RUN apk add --no-cache openvpn openssl easy-rsa bash

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application files
COPY . .

# Expose OpenVPN port
EXPOSE 1194/udp

# Start the server
CMD ["npm", "start"]