# AWS EC2 Deployment Guide

This guide covers deploying the Family VPN Server on Amazon Web Services EC2 instances with proper security groups, networking, and best practices.

## Prerequisites

- AWS Account with EC2 access
- AWS CLI configured (optional but recommended)
- SSH key pair for EC2 access
- Basic understanding of AWS networking concepts

## Quick Start

### 1. Launch EC2 Instance

#### Using AWS Console

1. **Navigate to EC2 Dashboard**
   - Go to AWS Console → EC2 → Instances
   - Click "Launch Instance"

2. **Choose AMI**
   - **Recommended**: Ubuntu Server 20.04 LTS (Free Tier eligible)
   - Alternative: Amazon Linux 2

3. **Choose Instance Type**
   - **Minimum**: t3.micro (1 vCPU, 1GB RAM) - Free Tier
   - **Recommended**: t3.small (2 vCPU, 2GB RAM)
   - **High Traffic**: t3.medium or larger

4. **Configure Instance**
   - **Storage**: 20GB GP2 (minimum)
   - **Security Group**: Create new (see configuration below)
   - **Key Pair**: Select existing or create new

#### Using AWS CLI

```bash
# Create security group
aws ec2 create-security-group \
  --group-name family-vpn-sg \
  --description "Family VPN Server Security Group"

# Add security group rules
aws ec2 authorize-security-group-ingress \
  --group-name family-vpn-sg \
  --protocol tcp \
  --port 22 \
  --cidr 0.0.0.0/0

aws ec2 authorize-security-group-ingress \
  --group-name family-vpn-sg \
  --protocol udp \
  --port 1194 \
  --cidr 0.0.0.0/0

aws ec2 authorize-security-group-ingress \
  --group-name family-vpn-sg \
  --protocol tcp \
  --port 443 \
  --cidr YOUR_ADMIN_IP/32

# Launch instance
aws ec2 run-instances \
  --image-id ami-0c02fb55956c7d316 \
  --count 1 \
  --instance-type t3.small \
  --key-name your-key-pair \
  --security-groups family-vpn-sg \
  --block-device-mappings DeviceName=/dev/sda1,Ebs={VolumeSize=20}
```

### 2. Security Group Configuration

Create a security group with the following rules:

| Type | Protocol | Port Range | Source | Description |
|------|----------|------------|--------|-------------|
| SSH | TCP | 22 | Your IP/0.0.0.0/0 | SSH access |
| Custom UDP | UDP | 1194 | 0.0.0.0/0 | VPN traffic |
| HTTPS | TCP | 443 | Your Admin IPs | Web interface |
| Custom TCP | TCP | 3000 | Your Admin IPs | Development interface |

**Security Best Practice**: Restrict the web interface (port 443/3000) to your admin IP addresses only.

### 3. Connect and Setup Instance

```bash
# Connect to instance
ssh -i your-key.pem ubuntu@your-instance-public-ip

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

### 4. Configure Environment

```bash
# Get instance public IP
export VPN_HOST=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)

# Create environment configuration
cp .env.example .env

# Update .env with AWS-specific settings
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

### 5. Initialize and Deploy

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

### 1. SSL Certificate Setup

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

#### Using AWS Certificate Manager (ALB)

For high-availability deployments, use Application Load Balancer with ACM:

```bash
# Create target group
aws elbv2 create-target-group \
  --name family-vpn-targets \
  --protocol HTTP \
  --port 3000 \
  --vpc-id vpc-12345678 \
  --health-check-path /health

# Create load balancer
aws elbv2 create-load-balancer \
  --name family-vpn-alb \
  --subnets subnet-12345678 subnet-87654321 \
  --security-groups sg-12345678
```

### 2. Systemd Service Configuration

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

### 3. Firewall Configuration

```bash
# Configure UFW
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 1194/udp
sudo ufw allow 443/tcp

# Optional: Allow HTTP for Let's Encrypt
sudo ufw allow 80/tcp
```

## AWS-Specific Optimizations

### 1. Elastic IP

Assign an Elastic IP for consistent public IP:

```bash
# Allocate Elastic IP
aws ec2 allocate-address --domain vpc

# Associate with instance
aws ec2 associate-address \
  --instance-id i-1234567890abcdef0 \
  --allocation-id eipalloc-12345678
```

### 2. EBS Volume Optimization

```bash
# Create optimized EBS volume
aws ec2 create-volume \
  --size 20 \
  --volume-type gp3 \
  --iops 3000 \
  --throughput 125 \
  --availability-zone us-east-1a

# Attach to instance
aws ec2 attach-volume \
  --volume-id vol-1234567890abcdef0 \
  --instance-id i-1234567890abcdef0 \
  --device /dev/sdf
```

### 3. CloudWatch Monitoring

```bash
# Install CloudWatch agent
wget https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
sudo dpkg -i amazon-cloudwatch-agent.deb

# Configure monitoring
sudo tee /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json > /dev/null <<EOF
{
  "metrics": {
    "namespace": "FamilyVPN",
    "metrics_collected": {
      "cpu": {
        "measurement": ["cpu_usage_idle", "cpu_usage_iowait"],
        "metrics_collection_interval": 60
      },
      "disk": {
        "measurement": ["used_percent"],
        "metrics_collection_interval": 60,
        "resources": ["*"]
      },
      "mem": {
        "measurement": ["mem_used_percent"],
        "metrics_collection_interval": 60
      }
    }
  },
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/home/ubuntu/family-vpn-server/logs/application.log",
            "log_group_name": "family-vpn-application",
            "log_stream_name": "{instance_id}"
          }
        ]
      }
    }
  }
}
EOF

# Start CloudWatch agent
sudo systemctl enable amazon-cloudwatch-agent
sudo systemctl start amazon-cloudwatch-agent
```

## Backup and Recovery

### 1. EBS Snapshots

```bash
# Create snapshot
aws ec2 create-snapshot \
  --volume-id vol-1234567890abcdef0 \
  --description "Family VPN Server backup $(date)"

# Automated snapshot script
cat > /home/ubuntu/backup-ebs.sh <<EOF
#!/bin/bash
VOLUME_ID=\$(curl -s http://169.254.169.254/latest/meta-data/block-device-mapping/root | xargs -I {} curl -s http://169.254.169.254/latest/meta-data/block-device-mapping/{})
aws ec2 create-snapshot --volume-id \$VOLUME_ID --description "Auto backup \$(date)"
EOF

chmod +x /home/ubuntu/backup-ebs.sh

# Schedule daily backups
echo "0 2 * * * /home/ubuntu/backup-ebs.sh" | crontab -
```

### 2. S3 Backup

```bash
# Install AWS CLI (if not already installed)
sudo apt install awscli

# Create backup script
cat > /home/ubuntu/backup-s3.sh <<EOF
#!/bin/bash
BACKUP_BUCKET="your-vpn-backup-bucket"
DATE=\$(date +%Y%m%d_%H%M%S)

# Backup certificates and configuration
tar -czf /tmp/vpn-backup-\$DATE.tar.gz \
  /home/ubuntu/family-vpn-server/certificates \
  /home/ubuntu/family-vpn-server/easy-rsa/pki \
  /home/ubuntu/family-vpn-server/.env \
  /home/ubuntu/family-vpn-server/logs

# Upload to S3
aws s3 cp /tmp/vpn-backup-\$DATE.tar.gz s3://\$BACKUP_BUCKET/

# Clean up local backup
rm /tmp/vpn-backup-\$DATE.tar.gz

# Keep only last 30 backups in S3
aws s3 ls s3://\$BACKUP_BUCKET/ | sort | head -n -30 | awk '{print \$4}' | xargs -I {} aws s3 rm s3://\$BACKUP_BUCKET/{}
EOF

chmod +x /home/ubuntu/backup-s3.sh

# Schedule daily S3 backups
echo "0 3 * * * /home/ubuntu/backup-s3.sh" | crontab -
```

## High Availability Setup

### 1. Multi-AZ Deployment

```bash
# Launch instances in multiple AZs
aws ec2 run-instances \
  --image-id ami-0c02fb55956c7d316 \
  --count 2 \
  --instance-type t3.small \
  --key-name your-key-pair \
  --security-groups family-vpn-sg \
  --subnet-id subnet-12345678  # AZ 1

aws ec2 run-instances \
  --image-id ami-0c02fb55956c7d316 \
  --count 1 \
  --instance-type t3.small \
  --key-name your-key-pair \
  --security-groups family-vpn-sg \
  --subnet-id subnet-87654321  # AZ 2
```

### 2. Application Load Balancer

```bash
# Create ALB for web interface
aws elbv2 create-load-balancer \
  --name family-vpn-alb \
  --subnets subnet-12345678 subnet-87654321 \
  --security-groups sg-12345678 \
  --scheme internet-facing \
  --type application
```

## Cost Optimization

### 1. Instance Scheduling

```bash
# Stop instance during off-hours (if applicable)
cat > /home/ubuntu/schedule-instance.sh <<EOF
#!/bin/bash
# Stop instance at 11 PM
if [ \$(date +%H) -eq 23 ]; then
  sudo shutdown -h now
fi
EOF

# Add to crontab
echo "0 23 * * * /home/ubuntu/schedule-instance.sh" | crontab -
```

### 2. Spot Instances

For non-critical environments, consider using Spot Instances:

```bash
# Launch spot instance
aws ec2 request-spot-instances \
  --spot-price "0.05" \
  --instance-count 1 \
  --type "one-time" \
  --launch-specification '{
    "ImageId": "ami-0c02fb55956c7d316",
    "InstanceType": "t3.small",
    "KeyName": "your-key-pair",
    "SecurityGroups": ["family-vpn-sg"]
  }'
```

## Troubleshooting

### Common AWS Issues

#### Security Group Connectivity

```bash
# Test connectivity
telnet your-instance-ip 1194
curl -k https://your-instance-ip:443/health

# Check security group rules
aws ec2 describe-security-groups --group-names family-vpn-sg
```

#### Instance Metadata Issues

```bash
# Test metadata service
curl -s http://169.254.169.254/latest/meta-data/public-ipv4
curl -s http://169.254.169.254/latest/meta-data/instance-id
```

#### EBS Volume Issues

```bash
# Check disk usage
df -h

# Check EBS volume status
aws ec2 describe-volumes --volume-ids vol-1234567890abcdef0
```

### Performance Monitoring

```bash
# Monitor network traffic
sudo nethogs
sudo iftop

# Monitor system resources
htop
iostat -x 1

# Check VPN connections
sudo netstat -tulpn | grep :1194
```

## Security Best Practices

### 1. IAM Roles and Policies

Create minimal IAM policies for EC2 instances:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::your-backup-bucket/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "ec2:CreateSnapshot",
        "ec2:DescribeSnapshots"
      ],
      "Resource": "*"
    }
  ]
}
```

### 2. VPC Configuration

Deploy in a private subnet with NAT Gateway for enhanced security:

```bash
# Create VPC
aws ec2 create-vpc --cidr-block 10.0.0.0/16

# Create private subnet
aws ec2 create-subnet \
  --vpc-id vpc-12345678 \
  --cidr-block 10.0.1.0/24 \
  --availability-zone us-east-1a
```

### 3. Network ACLs

Additional network-level security:

```bash
# Create restrictive network ACL
aws ec2 create-network-acl --vpc-id vpc-12345678

# Add rules for VPN traffic only
aws ec2 create-network-acl-entry \
  --network-acl-id acl-12345678 \
  --rule-number 100 \
  --protocol udp \
  --port-range From=1194,To=1194 \
  --cidr-block 0.0.0.0/0 \
  --rule-action allow
```

## Related Documentation

- [Production Best Practices](production.md) - Security and monitoring
- [Docker Deployment](docker.md) - Alternative containerized deployment
- [Configuration Guide](../configuration/README.md) - Environment configuration
- [Security Guide](../security/README.md) - Security hardening