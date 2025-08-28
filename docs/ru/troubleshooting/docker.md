# Устранение неполадок Docker

Это руководство охватывает специфичные для Docker проблемы и решения для Family VPN Server.

## Частые проблемы Docker

### Контейнер не запускается

**Симптомы:**
- Контейнер немедленно завершается
- Ошибки "Permission denied"
- Сбои создания сетевого интерфейса

**Диагностические шаги:**

```bash
# Проверка статуса контейнера
docker ps -a
docker logs family-vpn-server

# Проверка статуса демона Docker
sudo systemctl status docker

# Проверка установки Docker
docker --version
docker-compose --version
```

**Решения:**

```bash
# 1. Проверка привилегий контейнера
docker inspect family-vpn-server | grep -A10 "CapAdd"

# 2. Обеспечение правильного доступа к устройствам
ls -la /dev/net/tun

# 3. Перезапуск с правильными привилегиями
docker run --cap-add=NET_ADMIN --device /dev/net/tun \
    -p 1194:1194/udp -p 3000:3000 \
    family-vpn-server

# 4. Проверка прав доступа к томам
ls -la $(pwd)/certificates/
chmod -R 755 certificates/
```

### Проблемы сетевого интерфейса

**Симптомы:**
- Ошибки "Cannot create TUN interface"
- Сбои VPN соединений
- Проблемы сетевой маршрутизации

**Решения:**

```bash
# 1. Загрузка модуля TUN на хосте
sudo modprobe tun
echo 'tun' | sudo tee -a /etc/modules

# 2. Проверка доступности устройства TUN
ls -la /dev/net/tun
# Должно показать: crw-rw-rw- 1 root root 10, 200

# 3. Запуск контейнера с сетевыми привилегиями
docker run --cap-add=NET_ADMIN --cap-add=SYS_MODULE \
    --device /dev/net/tun \
    --sysctl net.ipv4.ip_forward=1 \
    family-vpn-server

# 4. Проверка конфигурации сети хоста
sudo sysctl net.ipv4.ip_forward
# Должно вернуть: net.ipv4.ip_forward = 1
```

### Проблемы монтирования томов

**Симптомы:**
- Файлы сертификатов не сохраняются
- Отказ в доступе к томам
- Потеря изменений конфигурации при перезапуске

**Решения:**

```bash
# 1. Проверка синтаксиса монтирования томов
docker inspect family-vpn-server | grep -A5 "Mounts"

# 2. Исправление прав доступа к томам
sudo chown -R $USER:$USER certificates/
sudo chown -R $USER:$USER easy-rsa/
chmod -R 755 certificates/ easy-rsa/

# 3. Использование абсолютных путей в docker-compose.yml
# Убедитесь, что пути абсолютные, а не относительные
volumes:
  - /full/path/to/certificates:/app/certificates
  - /full/path/to/easy-rsa:/app/easy-rsa

# 4. Проверка контекста SELinux (если применимо)
ls -Z certificates/
# Если SELinux включен, добавьте :Z к монтированию томов
volumes:
  - ./certificates:/app/certificates:Z
```

## Проблемы Docker Compose

### Зависимости сервисов

**Симптомы:**
- Сервисы запускаются в неправильном порядке
- Сбои подключения к базе данных
- Проблемы связи между сервисами

**Решения:**

```bash
# 1. Проверка зависимостей сервисов в docker-compose.yml
depends_on:
  - database
  - redis

# 2. Использование проверок состояния
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
  interval: 30s
  timeout: 10s
  retries: 3

# 3. Перезапуск сервисов в правильном порядке
docker-compose down
docker-compose up -d database
sleep 10
docker-compose up -d vpn-server
```

### Переменные окружения

**Симптомы:**
- Конфигурация не загружается
- Используются значения по умолчанию
- Неправильная конфигурация сервиса

**Решения:**

```bash
# 1. Проверка загрузки файла окружения
docker-compose config

# 2. Проверка существования и читаемости файла .env
ls -la .env
cat .env | grep -v PASSWORD

# 3. Использование явного окружения в docker-compose.yml
environment:
  - NODE_ENV=production
  - VPN_HOST=${VPN_HOST}
  - VPN_SUBNET=${VPN_SUBNET}

# 4. Отладка переменных окружения в контейнере
docker exec family-vpn-server env | grep VPN
```

## Проблемы производительности в Docker

### Ограничения ресурсов

**Симптомы:**
- Контейнер использует слишком много CPU/памяти
- Хост-система становится неотзывчивой
- Ошибки нехватки памяти

**Решения:**

```bash
# 1. Установка ограничений ресурсов в docker-compose.yml
deploy:
  resources:
    limits:
      cpus: '0.5'
      memory: 512M
    reservations:
      cpus: '0.25'
      memory: 256M

# 2. Мониторинг ресурсов контейнера
docker stats family-vpn-server

# 3. Проверка использования ресурсов контейнера
docker exec family-vpn-server free -h
docker exec family-vpn-server top
```

### Производительность сети

**Симптомы:**
- Медленные VPN соединения через Docker
- Высокие сетевые задержки
- Потеря пакетов

**Решения:**

```bash
# 1. Использование хост-сети для лучшей производительности
docker run --network host family-vpn-server

# 2. Оптимизация настроек сети Docker
# В docker-compose.yml:
networks:
  vpn-network:
    driver: bridge
    driver_opts:
      com.docker.network.driver.mtu: 1500

# 3. Проверка конфигурации сети Docker
docker network ls
docker network inspect bridge
```

## Проблемы логирования Docker

### Управление логами

**Симптомы:**
- Логи заполняют дисковое пространство
- Невозможно получить доступ к логам приложения
- Ротация логов не работает

**Решения:**

```bash
# 1. Настройка ротации логов в docker-compose.yml
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"

# 2. Просмотр логов контейнера
docker logs family-vpn-server
docker logs -f --tail 100 family-vpn-server

# 3. Доступ к логам внутри контейнера
docker exec family-vpn-server ls -la logs/
docker exec family-vpn-server tail -f logs/application-*.log

# 4. Очистка старых логов
docker system prune -f
```

## Проблемы безопасности в Docker

### Безопасность контейнера

**Симптомы:**
- Предупреждения безопасности
- Проблемы эскалации привилегий
- Несанкционированный доступ

**Решения:**

```bash
# 1. Запуск с минимальными привилегиями
docker run --user 1000:1000 \
    --cap-drop ALL \
    --cap-add NET_ADMIN \
    family-vpn-server

# 2. Использование файловой системы только для чтения где возможно
docker run --read-only \
    --tmpfs /tmp \
    --tmpfs /var/run \
    family-vpn-server

# 3. Сканирование образа на уязвимости
docker scan family-vpn-server

# 4. Использование профилей безопасности
docker run --security-opt apparmor:docker-default \
    family-vpn-server
```

### Безопасность сертификатов в Docker

**Симптомы:**
- Сертификаты доступны другим контейнерам
- Небезопасное хранение сертификатов
- Проблемы прав доступа к сертификатам

**Решения:**

```bash
# 1. Использование секретов Docker для чувствительных данных
echo "certificate-content" | docker secret create vpn-cert -
# Ссылка в docker-compose.yml:
secrets:
  - vpn-cert

# 2. Установка правильных прав доступа к файлам в Dockerfile
RUN chmod 600 /app/certificates/*.key
RUN chmod 644 /app/certificates/*.crt

# 3. Использование именованных томов для хранения сертификатов
volumes:
  vpn-certificates:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: /secure/path/certificates
```

## Отладка Docker

### Отладка контейнера

```bash
# 1. Доступ к оболочке контейнера
docker exec -it family-vpn-server bash
docker exec -it family-vpn-server sh  # если bash недоступен

# 2. Отладка запуска контейнера
docker run -it --entrypoint /bin/bash family-vpn-server

# 3. Проверка процессов контейнера
docker exec family-vpn-server ps aux

# 4. Мониторинг контейнера в реальном времени
docker exec family-vpn-server top
docker stats family-vpn-server
```

### Отладка сети

```bash
# 1. Проверка сети контейнера
docker exec family-vpn-server ip addr show
docker exec family-vpn-server ip route

# 2. Тестирование подключения из контейнера
docker exec family-vpn-server ping 8.8.8.8
docker exec family-vpn-server curl http://google.com

# 3. Проверка привязки портов
docker port family-vpn-server

# 4. Инспекция сетей Docker
docker network ls
docker network inspect bridge
```

### Отладка файловой системы

```bash
# 1. Проверка смонтированных томов
docker exec family-vpn-server df -h
docker exec family-vpn-server mount | grep certificates

# 2. Проверка прав доступа к файлам
docker exec family-vpn-server ls -la certificates/
docker exec family-vpn-server ls -la easy-rsa/pki/

# 3. Проверка использования диска в контейнере
docker exec family-vpn-server du -sh /app/*
```

## Обслуживание Docker

### Регулярные задачи обслуживания

```bash
# 1. Очистка неиспользуемых ресурсов
docker system prune -f

# 2. Обновление образов контейнеров
docker-compose pull
docker-compose up -d

# 3. Резервное копирование данных контейнера
docker run --rm -v family-vpn_certificates:/data \
    -v $(pwd):/backup alpine \
    tar czf /backup/certificates-backup.tar.gz -C /data .

# 4. Мониторинг состояния контейнера
docker inspect family-vpn-server | grep -A5 Health
```

### Обновления контейнера

```bash
# 1. Плавное обновление контейнера
docker-compose down
docker-compose pull
docker-compose up -d

# 2. Роллинг обновление (если используется swarm)
docker service update --image family-vpn-server:latest vpn-service

# 3. Резервное копирование перед обновлением
npm run backup:create
docker-compose down
# Выполнить обновление
docker-compose up -d
```

## Чек-лист устранения неполадок Docker

### Первоначальная диагностика
- [ ] Проверить статус контейнера: `docker ps -a`
- [ ] Просмотреть логи контейнера: `docker logs family-vpn-server`
- [ ] Проверить демон Docker: `sudo systemctl status docker`
- [ ] Проверить системные ресурсы: `docker system df`

### Сетевые проблемы
- [ ] Проверить устройство TUN: `ls -la /dev/net/tun`
- [ ] Проверить привилегии контейнера: `docker inspect family-vpn-server`
- [ ] Протестировать хост-сеть: `docker run --network host`
- [ ] Проверить привязку портов: `docker port family-vpn-server`

### Проблемы томов
- [ ] Проверить монтирование томов: `docker inspect family-vpn-server`
- [ ] Проверить права доступа к файлам: `ls -la certificates/`
- [ ] Протестировать доступ к томам: `docker exec family-vpn-server ls -la /app/certificates`
- [ ] Проверить контекст SELinux: `ls -Z certificates/`

### Проблемы производительности
- [ ] Мониторить ресурсы: `docker stats family-vpn-server`
- [ ] Проверить ограничения ресурсов: `docker inspect family-vpn-server`
- [ ] Просмотреть процессы контейнера: `docker exec family-vpn-server top`
- [ ] Анализировать производительность сети: Тестировать с `--network host`

### Проблемы безопасности
- [ ] Просмотреть привилегии контейнера: `docker inspect family-vpn-server`
- [ ] Проверить права доступа к файлам: `docker exec family-vpn-server ls -la`
- [ ] Сканировать на уязвимости: `docker scan family-vpn-server`
- [ ] Проверить управление секретами: Проверить docker-compose.yml

Помните: Docker добавляет дополнительный уровень сложности. При устранении неполадок всегда проверяйте, что проблема специфична для Docker, а не является общей проблемой приложения, тестируя вне контейнеров, когда это возможно.