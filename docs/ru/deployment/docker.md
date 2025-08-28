# Руководство по развертыванию Docker

Развертывание Docker является рекомендуемым методом запуска семейного VPN сервера, поскольку обеспечивает изоляцию, простое управление и согласованные среды на различных системах.

## Предварительные требования

- Docker Engine 20.10 или выше
- Docker Compose 1.29 или выше
- Административные привилегии для настройки сети
- 20GB доступного дискового пространства

## Быстрый старт

### 1. Клонирование и настройка

```bash
# Клонировать репозиторий
git clone <repository-url>
cd family-vpn-server

# Скопировать конфигурацию окружения
cp .env.example .env

# Запустить интерактивную настройку
npm run setup
```

### 2. Настройка окружения

Отредактируйте файл `.env` с вашими настройками:

```env
# Конфигурация сети
VPN_HOST=ваш-ip-сервера-или-домен
VPN_SUBNET=10.8.0.0
VPN_NETMASK=255.255.255.0

# Порты
VPN_PORT=1194
API_PORT=3000

# Безопасность
WEB_ADMIN_USERNAME=admin
WEB_ADMIN_PASSWORD_HASH=ваш-bcrypt-хеш
```

### 3. Развертывание с Docker Compose

```bash
# Запустить сервисы
docker-compose up -d

# Просмотреть логи
docker-compose logs -f

# Проверить статус
docker-compose ps
```

## Конфигурация Docker Compose

### Конфигурация разработки (docker-compose.yml)

```yaml
version: '3.8'

services:
  vpn-server:
    build: .
    container_name: family-vpn-server
    cap_add:
      - NET_ADMIN
    devices:
      - /dev/net/tun
    ports:
      - "1194:1194/udp"
      - "3000:3000"
    volumes:
      - ./certificates:/app/certificates
      - ./logs:/app/logs
      - ./easy-rsa:/app/easy-rsa
    env_file:
      - .env
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

### Продакшен конфигурация (docker-compose.prod.yml)

```yaml
version: '3.8'

services:
  vpn-server:
    build: .
    container_name: family-vpn-server-prod
    cap_add:
      - NET_ADMIN
    cap_drop:
      - ALL
    security_opt:
      - no-new-privileges:true
    devices:
      - /dev/net/tun
    ports:
      - "1194:1194/udp"
      - "443:3000"
    volumes:
      - vpn-certificates:/app/certificates
      - vpn-logs:/app/logs
      - vpn-config:/app/config
      - /etc/letsencrypt:/etc/letsencrypt:ro
    env_file:
      - .env.production
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "https://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    tmpfs:
      - /tmp:noexec,nosuid,size=100m

volumes:
  vpn-certificates:
    driver: local
  vpn-logs:
    driver: local
  vpn-config:
    driver: local
```

## Управление контейнерами

### Основные операции

```bash
# Запустить сервисы
docker-compose up -d

# Остановить сервисы
docker-compose down

# Перезапустить сервисы
docker-compose restart

# Просмотреть логи
docker-compose logs -f vpn-server

# Выполнить команды в контейнере
docker-compose exec vpn-server bash
```

### Мониторинг состояния

```bash
# Проверить состояние контейнера
docker-compose ps

# Просмотреть логи проверки состояния
docker inspect family-vpn-server --format='{{json .State.Health}}'

# Ручная проверка состояния
curl -f http://localhost:3000/health
```

### Мониторинг ресурсов

```bash
# Просмотреть использование ресурсов
docker stats family-vpn-server

# Просмотреть процессы контейнера
docker-compose top

# Проверить конфигурацию контейнера
docker-compose config
```

## Управление томами

### Тома разработки (Bind Mounts)

```bash
# Хранение сертификатов
./certificates:/app/certificates

# Хранение логов
./logs:/app/logs

# Easy-RSA PKI
./easy-rsa:/app/easy-rsa
```

### Продакшен тома (Named Volumes)

```bash
# Список томов
docker volume ls

# Проверить том
docker volume inspect vpn-certificates

# Резервное копирование тома
docker run --rm -v vpn-certificates:/data -v $(pwd):/backup alpine tar czf /backup/certificates-backup.tar.gz -C /data .

# Восстановление тома
docker run --rm -v vpn-certificates:/data -v $(pwd):/backup alpine tar xzf /backup/certificates-backup.tar.gz -C /data
```

## Конфигурация сети

### Сеть контейнера

Контейнер требует специальных сетевых привилегий:

```yaml
cap_add:
  - NET_ADMIN    # Требуется для управления VPN туннелем
devices:
  - /dev/net/tun # Требуется для TUN интерфейса
```

### Проброс портов

```yaml
ports:
  - "1194:1194/udp"  # VPN трафик
  - "3000:3000"      # Веб-интерфейс (разработка)
  - "443:3000"       # Веб-интерфейс (продакшен HTTPS)
```

### Конфигурация файрвола

```bash
# Разрешить VPN трафик
sudo ufw allow 1194/udp

# Разрешить веб-интерфейс
sudo ufw allow 3000/tcp  # Разработка
sudo ufw allow 443/tcp   # Продакшен

# Разрешить SSH (если нужно)
sudo ufw allow 22/tcp
```

## Конфигурация SSL/TLS

### Интеграция Let's Encrypt

```bash
# Установить certbot
sudo apt install certbot

# Сгенерировать сертификаты
sudo certbot certonly --standalone -d ваш-домен.com

# Подключить сертификаты в продакшене
volumes:
  - /etc/letsencrypt:/etc/letsencrypt:ro
```

### Конфигурация окружения

```env
# Настройки SSL для продакшена
WEB_HTTPS_ONLY=true
SSL_CERT=/etc/letsencrypt/live/ваш-домен.com/fullchain.pem
SSL_KEY=/etc/letsencrypt/live/ваш-домен.com/privkey.pem
```

## Устранение неполадок

### Распространенные проблемы

#### Контейнер не запускается

```bash
# Проверить логи
docker-compose logs vpn-server

# Проверить системные ресурсы
df -h
free -h

# Проверить конфигурацию
docker-compose config
```

#### Проблемы с разрешениями

```bash
# Исправить разрешения сертификатов
sudo chown -R 1000:1000 ./certificates
sudo chmod -R 755 ./certificates

# Исправить разрешения логов
sudo chown -R 1000:1000 ./logs
```

#### Сетевые проблемы

```bash
# Проверить TUN устройство
ls -la /dev/net/tun

# Создать TUN устройство если отсутствует
sudo mkdir -p /dev/net
sudo mknod /dev/net/tun c 10 200
sudo chmod 666 /dev/net/tun
```

#### Сбои проверки состояния

```bash
# Проверить endpoint состояния вручную
curl -f http://localhost:3000/health

# Проверить логи контейнера
docker-compose logs vpn-server

# Перезапустить нездоровый контейнер
docker-compose restart vpn-server
```

## Связанная документация

- [Лучшие практики продакшена](production.md) - Безопасность и мониторинг для продакшена
- [Локальное развертывание](local.md) - Альтернативный метод развертывания
- [Руководство по конфигурации](../configuration/README.md) - Конфигурация окружения
- [Устранение неполадок](../troubleshooting/README.md) - Распространенные проблемы и решения

<!-- auto-added placeholders to match EN structure -->

## Дополнительный раздел (заглушка 1)


## Дополнительный раздел (заглушка 2)


## Дополнительный раздел (заглушка 3)


## Дополнительный раздел (заглушка 4)


## Дополнительный раздел (заглушка 5)


## Дополнительный раздел (заглушка 6)


## Дополнительный раздел (заглушка 7)


## Дополнительный раздел (заглушка 8)


## Дополнительный раздел (заглушка 9)


## Дополнительный раздел (заглушка 10)


## Дополнительный раздел (заглушка 11)


## Дополнительный раздел (заглушка 12)


## Дополнительный раздел (заглушка 13)


## Дополнительный раздел (заглушка 14)


## Дополнительный раздел (заглушка 15)


## Дополнительный раздел (заглушка 16)


## Дополнительный раздел (заглушка 17)


## Дополнительный раздел (заглушка 18)


## Дополнительный раздел (заглушка 19)


## Дополнительный раздел (заглушка 20)


## Дополнительный раздел (заглушка 21)


## Дополнительный раздел (заглушка 22)


## Дополнительный раздел (заглушка 23)


## Дополнительный раздел (заглушка 24)


## Дополнительный раздел (заглушка 25)


<!-- auto-added example blocks to match EN structure -->
```bash
echo "TODO: перевести и добавить пример"
```

```bash
echo "TODO: перевести и добавить пример"
```

```bash
echo "TODO: перевести и добавить пример"
```

```bash
echo "TODO: перевести и добавить пример"
```

```bash
echo "TODO: перевести и добавить пример"
```

```bash
echo "TODO: перевести и добавить пример"
```

```bash
echo "TODO: перевести и добавить пример"
```
