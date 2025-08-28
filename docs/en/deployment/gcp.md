# Google Cloud Platform Deployment Guide

This guide covers deploying the Family VPN Server on Google Cloud Platform using Compute Engine with proper networking, security, and best practices.

## Prerequisites

- Google Cloud Platform account with billing enabled
- Google Cloud SDK (gcloud) installed and configured
- Basic understanding of GCP networking concepts
- SSH key pair for instance access

## Quick Start

### 1. Setup GCP Environment

```bash
# Install Google Cloud SDK (if not installed)
curl https://sdk.cloud.google.com | bash
exec -l $SHELL

# Initialize gcloud
gcloud init

# Set default project and region
gcloud config set project your-project-id
gcloud config set compute/region us-central1
gcloud config set compute/zone us-central1-a

# Enable required APIs
gcloud services enable compute.googleapis.com
gcloud services enable logging.googleapis.com
gcloud services enable monitoring.googleapis.com
```

### 2. Create VM Instance

#### Using gcloud CLI

```bash
# Create VM instance
gcloud compute instances create family-vpn-server \
  --zone=us-central1-a \
  --machine-type=e2-small \
  --subnet=default \
  --network-tier=PREMIUM \
  --maintenance-policy=MIGRATE \
  --image-family=ubuntu-2004-lts \
  --image-project=ubuntu-os-cloud \
  --boot-disk-size=20GB \
  --boot-disk-type=pd-standard \
  --boot-disk-device-name=family-vpn-server \
  --tags=vpn-server,http-server,https-server \
  --metadata=startup-script='#!/bin/bash
    apt-get update
    apt-get install -y curl git
  '
```

#### Using Console

1. **Navigate to Compute Engine**
   - Go to GCP Console → Compute Engine → VM instances
   - Click "Create Instance"

2. **Configure Instance**
   - **Name**: family-vpn-server
   - **Region**: us-central1 (or your preferred region)
   - **Zone**: us-central1-a
   - **Machine Type**: e2-small (2 vCPU, 2GB RAM)
   - **Boot Disk**: Ubuntu 20.04 LTS, 20GB Standard persistent disk

3. **Networking**
   - **Network Tags**: vpn-server, http-server, https-server
   - **IP Forwarding**: Enable (required for VPN)

### 3. Configure Firewall Rules

```bash
# Allow VPN traffic
gcloud compute firewall-rules create allow-openvpn \
  --allow udp:1194 \
  --source-ranges 0.0.0.0/0 \
  --target-tags vpn-server \
  --description "Allow OpenVPN traffic"

# Allow HTTPS for web interface
gcloud compute firewall-rules create allow-vpn-https \
  --allow tcp:443 \
  --source-ranges YOUR_ADMIN_IP/32 \
  --target-tags vpn-server \
  --description "Allow HTTPS access to VPN management interface"

# Allow SSH (if not already allowed)
gcloud compute firewall-rules create allow-ssh \
  --allow tcp:22 \
  --source-ranges 0.0.0.0/0 \
  --target-tags vpn-server \
  --description "Allow SSH access"

# Optional: Allow HTTP for Let's Encrypt
gcloud compute firewall-rules create allow-http \
  --allow tcp:80 \
  --source-ranges 0.0.0.0/0 \
  --target-tags http-server \
  --description "Allow HTTP for Let's Encrypt"
```

### 4. Connect and Setup Instance

```bash
# Connect to instance
gcloud compute ssh family-vpn-server --zone=us-central1-a

# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install OpenVPN and dependencies
sudo apt install -y openvpn easy-rsa git curl

# Clone application
git clone <repository-url>
cd family-vpn-server

# Install dependencies
npm install
```

### 5. Configure Environment

```bash
# Get external IP address
export VPN_HOST=$(curl -s -H "Metadata-Flavor: Google" \
  http://metadata.google.internal/computeMetadata/v1/instance/network-interfaces/0/access-configs/0/external-ip)

# Create environment configuration
cp .env.example .env

# Update .env with GCP-specific settings
cat > .env <<EOF
# Network Configuration
VPN_HOST=$VPN_HOST
VPN_SUBNET=10.8.0.0
VPN_NETMASK=255.255.255.0

# Ports
VPN_PORT=1194
API_PORT=3000

# Production Settings
NODE_ENV=production
WEB_HTTPS_ONLY=true

# Security
WEB_ADMIN_USERNAME=admin
WEB_ADMIN_PASSWORD_HASH=your-bcrypt-hash
WEB_RATE_LIMIT_ENABLED=true
WEB_SESSION_TIMEOUT=1800000

# Paths
VPN_CONFIG_DIR=/etc/openvpn
VPN_CERT_DIR=/etc/openvpn/certificates
EOF
```

### 6. Initialize and Deploy

```bash
# Run setup wizard
npm run setup

# Initialize PKI
npm run init-pki

# Create admin credentials
npm run setup-auth

# Apply security hardening
npm run harden-config

# Start server
npm start
```

## Production Deployment

### 1. Static IP Address

Reserve a static external IP address:

```bash
# Reserve static IP
gcloud compute addresses create family-vpn-ip \
  --region=us-central1

# Get the reserved IP
gcloud compute addresses describe family-vpn-ip \
  --region=us-central1 \
  --format="get(address)"

# Assign to instance
gcloud compute instances delete-access-config family-vpn-server \
  --access-config-name="External NAT" \
  --zone=us-central1-a

gcloud compute instances add-access-config family-vpn-server \
  --access-config-name="External NAT" \
  --address=RESERVED_IP_ADDRESS \
  --zone=us-central1-a
```

### 2. SSL Certificate Setup

#### Using Let's Encrypt

```bash
# Install certbot
sudo apt install certbot

# Stop any running web server
sudo systemctl stop family-vpn

# Generate certificate (replace with your domain)
sudo certbot certonly --standalone -d your-domain.com

# Update .env with SSL paths
echo "SSL_CERT=/etc/letsencrypt/live/your-domain.com/fullchain.pem" >> .env
echo "SSL_KEY=/etc/letsencrypt/live/your-domain.com/privkey.pem" >> .env

# Set up automatic renewal
echo "0 3 * * * /usr/bin/certbot renew --quiet" | sudo crontab -
```

#### Using Google-managed SSL certificates

For load balancer deployments:

```bash
# Create managed SSL certificate
gcloud compute ssl-certificates create family-vpn-ssl \
  --domains=your-domain.com \
  --global
```

### 3. Systemd Service Configuration

```bash
# Create systemd service
sudo tee /etc/systemd/system/family-vpn.service > /dev/null <<EOF
[Unit]
Description=Family VPN Server
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/family-vpn-server
ExecStart=/usr/bin/node src/server.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

# Security settings
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/home/ubuntu/family-vpn-server

[Install]
WantedBy=multi-user.target
EOF

# Enable and start service
sudo systemctl enable family-vpn
sudo systemctl start family-vpn
sudo systemctl status family-vpn
```

## GCP-Specific Features

### 1. Cloud Logging Integration

```bash
# Install Google Cloud Logging agent
curl -sSO https://dl.google.com/cloudagents/add-logging-agent-repo.sh
sudo bash add-logging-agent-repo.sh
sudo apt-get update
sudo apt-get install google-fluentd

# Configure logging
sudo tee /etc/google-fluentd/config.d/family-vpn.conf > /dev/null <<EOF
<source>
  @type tail
  format json
  path /home/ubuntu/family-vpn-server/logs/application.log
  pos_file /var/lib/google-fluentd/pos/family-vpn-application.log.pos
  read_from_head true
  tag family-vpn.application
</source>

<source>
  @type tail
  format json
  path /home/ubuntu/family-vpn-server/logs/error.log
  pos_file /var/lib/google-fluentd/pos/family-vpn-error.log.pos
  read_from_head true
  tag family-vpn.error
</source>
EOF

# Start logging agent
sudo systemctl enable google-fluentd
sudo systemctl start google-fluentd
```

### 2. Cloud Monitoring

```bash
# Install monitoring agent
curl -sSO https://dl.google.com/cloudagents/add-monitoring-agent-repo.sh
sudo bash add-monitoring-agent-repo.sh
sudo apt-get update
sudo apt-get install stackdriver-agent

# Configure monitoring
sudo tee /etc/stackdriver/collectd.d/family-vpn.conf > /dev/null <<EOF
LoadPlugin "processes"
<Plugin "processes">
  ProcessMatch "family-vpn" "node.*server.js"
</Plugin>

LoadPlugin "tcpconns"
<Plugin "tcpconns">
  ListeningPorts true
  LocalPort 3000
  LocalPort 1194
</Plugin>
EOF

# Start monitoring agent
sudo systemctl enable stackdriver-agent
sudo systemctl start stackdriver-agent
```

### 3. Instance Templates and Managed Instance Groups

For high availability:

```bash
# Create instance template
gcloud compute instance-templates create family-vpn-template \
  --machine-type=e2-small \
  --network-interface=network-tier=PREMIUM,subnet=default \
  --maintenance-policy=MIGRATE \
  --image-family=ubuntu-2004-lts \
  --image-project=ubuntu-os-cloud \
  --boot-disk-size=20GB \
  --boot-disk-type=pd-standard \
  --tags=vpn-server,http-server,https-server \
  --metadata-from-file startup-script=startup-script.sh

# Create managed instance group
gcloud compute instance-groups managed create family-vpn-group \
  --base-instance-name=family-vpn \
  --template=family-vpn-template \
  --size=2 \
  --zone=us-central1-a
```

## Backup and Recovery

### 1. Persistent Disk Snapshots

```bash
# Create snapshot
gcloud compute disks snapshot family-vpn-server \
  --snapshot-names=family-vpn-backup-$(date +%Y%m%d-%H%M%S) \
  --zone=us-central1-a

# Automated snapshot script
cat > /home/ubuntu/backup-disk.sh <<EOF
#!/bin/bash
INSTANCE_NAME="family-vpn-server"
ZONE="us-central1-a"
DATE=\$(date +%Y%m%d-%H%M%S)

gcloud compute disks snapshot \$INSTANCE_NAME \
  --snapshot-names=family-vpn-backup-\$DATE \
  --zone=\$ZONE

# Keep only last 7 snapshots
gcloud compute snapshots list \
  --filter="name~'family-vpn-backup-.*'" \
  --sort-by="~creationTimestamp" \
  --format="value(name)" | tail -n +8 | \
  xargs -r gcloud compute snapshots delete --quiet
EOF

chmod +x /home/ubuntu/backup-disk.sh

# Schedule daily snapshots
echo "0 2 * * * /home/ubuntu/backup-disk.sh" | crontab -
```

### 2. Cloud Storage Backup

```bash
# Create storage bucket
gsutil mb gs://your-vpn-backup-bucket

# Create backup script
cat > /home/ubuntu/backup-gcs.sh <<EOF
#!/bin/bash
BACKUP_BUCKET="gs://your-vpn-backup-bucket"
DATE=\$(date +%Y%m%d_%H%M%S)

# Backup certificates and configuration
tar -czf /tmp/vpn-backup-\$DATE.tar.gz \
  /home/ubuntu/family-vpn-server/certificates \
  /home/ubuntu/family-vpn-server/easy-rsa/pki \
  /home/ubuntu/family-vpn-server/.env \
  /home/ubuntu/family-vpn-server/logs

# Upload to Cloud Storage
gsutil cp /tmp/vpn-backup-\$DATE.tar.gz \$BACKUP_BUCKET/

# Clean up local backup
rm /tmp/vpn-backup-\$DATE.tar.gz

# Keep only last 30 backups in Cloud Storage
gsutil ls \$BACKUP_BUCKET/vpn-backup-*.tar.gz | sort | head -n -30 | \
  xargs -r gsutil rm
EOF

chmod +x /home/ubuntu/backup-gcs.sh

# Schedule daily backups
echo "0 3 * * * /home/ubuntu/backup-gcs.sh" | crontab -
```

## Load Balancer Setup

### 1. HTTP(S) Load Balancer

For web interface high availability:

```bash
# Create health check
gcloud compute health-checks create http family-vpn-health-check \
  --port=3000 \
  --request-path=/health

# Create backend service
gcloud compute backend-services create family-vpn-backend \
  --protocol=HTTP \
  --health-checks=family-vpn-health-check \
  --global

# Add instance group to backend service
gcloud compute backend-services add-backend family-vpn-backend \
  --instance-group=family-vpn-group \
  --instance-group-zone=us-central1-a \
  --global

# Create URL map
gcloud compute url-maps create family-vpn-map \
  --default-service=family-vpn-backend

# Create HTTP(S) proxy
gcloud compute target-https-proxies create family-vpn-proxy \
  --url-map=family-vpn-map \
  --ssl-certificates=family-vpn-ssl

# Create forwarding rule
gcloud compute forwarding-rules create family-vpn-forwarding-rule \
  --address=family-vpn-ip \
  --target-https-proxy=family-vpn-proxy \
  --global \
  --ports=443
```

### 2. Network Load Balancer (for VPN traffic)

```bash
# Create health check for VPN
gcloud compute health-checks create tcp family-vpn-udp-health \
  --port=1194

# Create backend service for VPN
gcloud compute backend-services create family-vpn-udp-backend \
  --protocol=UDP \
  --health-checks=family-vpn-udp-health \
  --region=us-central1

# Create forwarding rule for VPN
gcloud compute forwarding-rules create family-vpn-udp-forwarding \
  --address=family-vpn-ip \
  --backend-service=family-vpn-udp-backend \
  --region=us-central1 \
  --ports=1194 \
  --ip-protocol=UDP
```

## Security Best Practices

### 1. IAM and Service Accounts

```bash
# Create service account for VM
gcloud iam service-accounts create family-vpn-sa \
  --display-name="Family VPN Service Account"

# Grant minimal permissions
gcloud projects add-iam-policy-binding your-project-id \
  --member="serviceAccount:family-vpn-sa@your-project-id.iam.gserviceaccount.com" \
  --role="roles/logging.logWriter"

gcloud projects add-iam-policy-binding your-project-id \
  --member="serviceAccount:family-vpn-sa@your-project-id.iam.gserviceaccount.com" \
  --role="roles/monitoring.metricWriter"

# Assign service account to instance
gcloud compute instances set-service-account family-vpn-server \
  --service-account=family-vpn-sa@your-project-id.iam.gserviceaccount.com \
  --scopes=https://www.googleapis.com/auth/logging.write,https://www.googleapis.com/auth/monitoring.write \
  --zone=us-central1-a
```

### 2. VPC Security

```bash
# Create custom VPC
gcloud compute networks create family-vpn-vpc \
  --subnet-mode=custom

# Create subnet
gcloud compute networks subnets create family-vpn-subnet \
  --network=family-vpn-vpc \
  --range=10.0.1.0/24 \
  --region=us-central1

# Create firewall rules for custom VPC
gcloud compute firewall-rules create family-vpn-vpc-allow-internal \
  --network=family-vpn-vpc \
  --allow=tcp:0-65535,udp:0-65535,icmp \
  --source-ranges=10.0.1.0/24

gcloud compute firewall-rules create family-vpn-vpc-allow-ssh \
  --network=family-vpn-vpc \
  --allow=tcp:22 \
  --source-ranges=0.0.0.0/0

gcloud compute firewall-rules create family-vpn-vpc-allow-vpn \
  --network=family-vpn-vpc \
  --allow=udp:1194 \
  --source-ranges=0.0.0.0/0
```

## Cost Optimization

### 1. Preemptible Instances

For development/testing environments:

```bash
# Create preemptible instance
gcloud compute instances create family-vpn-preemptible \
  --zone=us-central1-a \
  --machine-type=e2-small \
  --preemptible \
  --image-family=ubuntu-2004-lts \
  --image-project=ubuntu-os-cloud \
  --boot-disk-size=20GB
```

### 2. Committed Use Discounts

```bash
# Purchase committed use contract
gcloud compute commitments create family-vpn-commitment \
  --region=us-central1 \
  --plan=12-month \
  --resources=type=VCPU,amount=2 \
  --resources=type=MEMORY,amount=2GB
```

### 3. Sustained Use Discounts

Automatically applied for instances running >25% of the month.

## Monitoring and Alerting

### 1. Custom Metrics

```bash
# Create custom metric for VPN connections
gcloud logging metrics create vpn_connections \
  --description="Number of VPN connections" \
  --log-filter='resource.type="gce_instance" AND jsonPayload.message:"Client connected"'
```

### 2. Alerting Policies

```bash
# Create alerting policy for high CPU usage
gcloud alpha monitoring policies create \
  --policy-from-file=cpu-alert-policy.yaml
```

## Troubleshooting

### Common GCP Issues

#### Metadata Service

```bash
# Test metadata service
curl -H "Metadata-Flavor: Google" \
  http://metadata.google.internal/computeMetadata/v1/instance/network-interfaces/0/access-configs/0/external-ip
```

#### Firewall Rules

```bash
# List firewall rules
gcloud compute firewall-rules list

# Test connectivity
gcloud compute ssh family-vpn-server --zone=us-central1-a --command="curl -k https://localhost:3000/health"
```

#### Disk Performance

```bash
# Check disk performance
sudo iostat -x 1

# Test disk speed
sudo dd if=/dev/zero of=/tmp/test bs=1M count=1000 oflag=direct
```

## Related Documentation

- [Production Best Practices](production.md) - Security and monitoring
- [Docker Deployment](docker.md) - Alternative containerized deployment
- [Configuration Guide](../configuration/README.md) - Environment configuration
- [Security Guide](../security/README.md) - Security hardening