# Docker Troubleshooting

This guide covers Docker-specific issues and solutions for the Family VPN Server.

## Common Docker Issues

### Container Won't Start

**Symptoms:**
- Container exits immediately
- "Permission denied" errors
- Network interface creation failures

**Diagnostic Steps:**

```bash
# Check container status
docker ps -a
docker logs family-vpn-server

# Check Docker daemon status
sudo systemctl status docker

# Verify Docker installation
docker --version
docker-compose --version
```

**Solutions:**

```bash
# 1. Check container privileges
docker inspect family-vpn-server | grep -A10 "CapAdd"

# 2. Ensure proper device access
ls -la /dev/net/tun

# 3. Restart with correct privileges
docker run --cap-add=NET_ADMIN --device /dev/net/tun \
    -p 1194:1194/udp -p 3000:3000 \
    family-vpn-server

# 4. Check volume permissions
ls -la $(pwd)/certificates/
chmod -R 755 certificates/
```

### Network Interface Issues

**Symptoms:**
- "Cannot create TUN interface" errors
- VPN connections fail
- Network routing problems

**Solutions:**

```bash
# 1. Load TUN module on host
sudo modprobe tun
echo 'tun' | sudo tee -a /etc/modules

# 2. Verify TUN device availability
ls -la /dev/net/tun
# Should show: crw-rw-rw- 1 root root 10, 200

# 3. Run container with network privileges
docker run --cap-add=NET_ADMIN --cap-add=SYS_MODULE \
    --device /dev/net/tun \
    --sysctl net.ipv4.ip_forward=1 \
    family-vpn-server

# 4. Check host networking configuration
sudo sysctl net.ipv4.ip_forward
# Should return: net.ipv4.ip_forward = 1
```

### Volume Mount Problems

**Symptoms:**
- Certificate files not persisting
- Permission denied accessing volumes
- Configuration changes lost on restart

**Solutions:**

```bash
# 1. Check volume mount syntax
docker inspect family-vpn-server | grep -A5 "Mounts"

# 2. Fix volume permissions
sudo chown -R $USER:$USER certificates/
sudo chown -R $USER:$USER easy-rsa/
chmod -R 755 certificates/ easy-rsa/

# 3. Use absolute paths in docker-compose.yml
# Ensure paths are absolute, not relative
volumes:
  - /full/path/to/certificates:/app/certificates
  - /full/path/to/easy-rsa:/app/easy-rsa

# 4. Check SELinux context (if applicable)
ls -Z certificates/
# If SELinux is enabled, add :Z to volume mounts
volumes:
  - ./certificates:/app/certificates:Z
```

## Docker Compose Issues

### Service Dependencies

**Symptoms:**
- Services start in wrong order
- Database connection failures
- Service communication problems

**Solutions:**

```bash
# 1. Check service dependencies in docker-compose.yml
depends_on:
  - database
  - redis

# 2. Use health checks
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
  interval: 30s
  timeout: 10s
  retries: 3

# 3. Restart services in correct order
docker-compose down
docker-compose up -d database
sleep 10
docker-compose up -d vpn-server
```

### Environment Variables

**Symptoms:**
- Configuration not loading
- Default values being used
- Service misconfiguration

**Solutions:**

```bash
# 1. Check environment file loading
docker-compose config

# 2. Verify .env file exists and is readable
ls -la .env
cat .env | grep -v PASSWORD

# 3. Use explicit environment in docker-compose.yml
environment:
  - NODE_ENV=production
  - VPN_HOST=${VPN_HOST}
  - VPN_SUBNET=${VPN_SUBNET}

# 4. Debug environment variables in container
docker exec family-vpn-server env | grep VPN
```

## Performance Issues in Docker

### Resource Limits

**Symptoms:**
- Container using too much CPU/memory
- Host system becomes unresponsive
- Out of memory errors

**Solutions:**

```bash
# 1. Set resource limits in docker-compose.yml
deploy:
  resources:
    limits:
      cpus: '0.5'
      memory: 512M
    reservations:
      cpus: '0.25'
      memory: 256M

# 2. Monitor container resources
docker stats family-vpn-server

# 3. Check container resource usage
docker exec family-vpn-server free -h
docker exec family-vpn-server top
```

### Network Performance

**Symptoms:**
- Slow VPN connections through Docker
- High network latency
- Packet loss

**Solutions:**

```bash
# 1. Use host networking for better performance
docker run --network host family-vpn-server

# 2. Optimize Docker network settings
# In docker-compose.yml:
networks:
  vpn-network:
    driver: bridge
    driver_opts:
      com.docker.network.driver.mtu: 1500

# 3. Check Docker network configuration
docker network ls
docker network inspect bridge
```

## Docker Logging Issues

### Log Management

**Symptoms:**
- Logs filling up disk space
- Cannot access application logs
- Log rotation not working

**Solutions:**

```bash
# 1. Configure log rotation in docker-compose.yml
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"

# 2. View container logs
docker logs family-vpn-server
docker logs -f --tail 100 family-vpn-server

# 3. Access logs inside container
docker exec family-vpn-server ls -la logs/
docker exec family-vpn-server tail -f logs/application-*.log

# 4. Clean up old logs
docker system prune -f
```

## Security Issues in Docker

### Container Security

**Symptoms:**
- Security warnings
- Privilege escalation concerns
- Unauthorized access

**Solutions:**

```bash
# 1. Run with minimal privileges
docker run --user 1000:1000 \
    --cap-drop ALL \
    --cap-add NET_ADMIN \
    family-vpn-server

# 2. Use read-only root filesystem where possible
docker run --read-only \
    --tmpfs /tmp \
    --tmpfs /var/run \
    family-vpn-server

# 3. Scan image for vulnerabilities
docker scan family-vpn-server

# 4. Use security profiles
docker run --security-opt apparmor:docker-default \
    family-vpn-server
```

### Certificate Security in Docker

**Symptoms:**
- Certificates accessible to other containers
- Insecure certificate storage
- Certificate permission issues

**Solutions:**

```bash
# 1. Use Docker secrets for sensitive data
echo "certificate-content" | docker secret create vpn-cert -
# Reference in docker-compose.yml:
secrets:
  - vpn-cert

# 2. Set proper file permissions in Dockerfile
RUN chmod 600 /app/certificates/*.key
RUN chmod 644 /app/certificates/*.crt

# 3. Use named volumes for certificate storage
volumes:
  vpn-certificates:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: /secure/path/certificates
```

## Docker Debugging

### Container Debugging

```bash
# 1. Access container shell
docker exec -it family-vpn-server bash
docker exec -it family-vpn-server sh  # if bash not available

# 2. Debug container startup
docker run -it --entrypoint /bin/bash family-vpn-server

# 3. Check container processes
docker exec family-vpn-server ps aux

# 4. Monitor container in real-time
docker exec family-vpn-server top
docker stats family-vpn-server
```

### Network Debugging

```bash
# 1. Check container networking
docker exec family-vpn-server ip addr show
docker exec family-vpn-server ip route

# 2. Test connectivity from container
docker exec family-vpn-server ping 8.8.8.8
docker exec family-vpn-server curl http://google.com

# 3. Check port bindings
docker port family-vpn-server

# 4. Inspect Docker networks
docker network ls
docker network inspect bridge
```

### File System Debugging

```bash
# 1. Check mounted volumes
docker exec family-vpn-server df -h
docker exec family-vpn-server mount | grep certificates

# 2. Verify file permissions
docker exec family-vpn-server ls -la certificates/
docker exec family-vpn-server ls -la easy-rsa/pki/

# 3. Check disk usage in container
docker exec family-vpn-server du -sh /app/*
```

## Docker Maintenance

### Regular Maintenance Tasks

```bash
# 1. Clean up unused resources
docker system prune -f

# 2. Update container images
docker-compose pull
docker-compose up -d

# 3. Backup container data
docker run --rm -v family-vpn_certificates:/data \
    -v $(pwd):/backup alpine \
    tar czf /backup/certificates-backup.tar.gz -C /data .

# 4. Monitor container health
docker inspect family-vpn-server | grep -A5 Health
```

### Container Updates

```bash
# 1. Graceful container update
docker-compose down
docker-compose pull
docker-compose up -d

# 2. Rolling update (if using swarm)
docker service update --image family-vpn-server:latest vpn-service

# 3. Backup before update
npm run backup:create
docker-compose down
# Perform update
docker-compose up -d
```

## Docker Troubleshooting Checklist

### Initial Diagnosis
- [ ] Check container status: `docker ps -a`
- [ ] Review container logs: `docker logs family-vpn-server`
- [ ] Verify Docker daemon: `sudo systemctl status docker`
- [ ] Check system resources: `docker system df`

### Network Issues
- [ ] Verify TUN device: `ls -la /dev/net/tun`
- [ ] Check container privileges: `docker inspect family-vpn-server`
- [ ] Test host networking: `docker run --network host`
- [ ] Verify port bindings: `docker port family-vpn-server`

### Volume Issues
- [ ] Check volume mounts: `docker inspect family-vpn-server`
- [ ] Verify file permissions: `ls -la certificates/`
- [ ] Test volume access: `docker exec family-vpn-server ls -la /app/certificates`
- [ ] Check SELinux context: `ls -Z certificates/`

### Performance Issues
- [ ] Monitor resources: `docker stats family-vpn-server`
- [ ] Check resource limits: `docker inspect family-vpn-server`
- [ ] Review container processes: `docker exec family-vpn-server top`
- [ ] Analyze network performance: Test with `--network host`

### Security Issues
- [ ] Review container privileges: `docker inspect family-vpn-server`
- [ ] Check file permissions: `docker exec family-vpn-server ls -la`
- [ ] Scan for vulnerabilities: `docker scan family-vpn-server`
- [ ] Verify secrets management: Check docker-compose.yml

Remember: Docker adds an additional layer of complexity. When troubleshooting, always verify that the issue is Docker-specific and not a general application problem by testing outside of containers when possible.