# Руководство по установке Docker

Установка Docker является рекомендуемым методом развертывания семейного VPN-сервера. Она обеспечивает согласованную, изолированную среду, которая работает на всех платформах.

## Предварительные требования

Перед началом убедитесь, что у вас есть:
- Выполнены [системные требования](requirements.md)
- Установлен Docker Engine 20.10+
- Установлен Docker Compose 2.0+
- Установлен Git (или скачайте проект как ZIP)

## Шаг 1: Установка Docker

### Windows
1. **Скачайте Docker Desktop**:
   - Перейдите на https://www.docker.com/products/docker-desktop/
   - Скачайте Docker Desktop для Windows
   - Запустите установщик и следуйте мастеру настройки

2. **Настройте Docker**:
   - Перезагрузите компьютер при запросе
   - Откройте Docker Desktop и дождитесь запуска
   - Проверьте установку: `docker --version`

### macOS
1. **Скачайте Docker Desktop**:
   - Перейдите на https://www.docker.com/products/docker-desktop/
   - Скачайте Docker Desktop для Mac
   - Перетащите Docker в папку Applications

2. **Запустите Docker**:
   - Откройте Docker из Applications
   - Следуйте инструкциям по настройке
   - Проверьте установку: `docker --version`

### Linux (Ubuntu/Debian)
```bash
# Обновить индекс пакетов
sudo apt update

# Установить Docker используя скрипт удобства
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Добавить пользователя в группу docker
sudo usermod -aG docker $USER

# Установить Docker Compose
sudo apt install docker-compose-plugin

# Выйти и войти снова, затем проверить
docker --version
docker compose version
```

### Linux (CentOS/RHEL)
```bash
# Установить Docker
sudo yum install -y yum-utils
sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
sudo yum install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Запустить и включить Docker
sudo systemctl start docker
sudo systemctl enable docker

# Добавить пользователя в группу docker
sudo usermod -aG docker $USER

# Выйти и войти снова
```

## Шаг 2: Скачивание VPN-сервера

### Вариант A: Использование Git
```bash
# Клонировать репозиторий
git clone https://github.com/your-username/family-vpn-server.git
cd family-vpn-server
```

### Вариант B: Скачать ZIP
1. Перейдите в репозиторий GitHub
2. Нажмите "Code" → "Download ZIP"
3. Извлеките ZIP-файл
4. Откройте терминал в извлеченной папке

## Шаг 3: Настройка окружения

### Создание файла окружения
```bash
# Скопировать пример конфигурации
cp .env.example .env

# Редактировать конфигурацию
nano .env
```

### Основная конфигурация
Отредактируйте файл `.env` с вашими настройками:

```env
# Конфигурация сервера
VPN_HOST=YOUR_SERVER_IP_ADDRESS
VPN_PORT=1194
VPN_SUBNET=10.8.0.0
VPN_NETMASK=255.255.255.0

# Веб-интерфейс
API_PORT=3000
NODE_ENV=production

# Настройки безопасности
JWT_SECRET=your_secure_jwt_secret_here
SESSION_SECRET=your_secure_session_secret_here

# Логирование
LOG_LEVEL=info
```

**Важно**: Замените `YOUR_SERVER_IP_ADDRESS` на:
- **Локальная установка**: IP-адрес вашего компьютера
- **Облачное развертывание**: Публичный IP-адрес вашего сервера
- **Домашняя сеть**: Внешний IP-адрес вашего роутера

### Найти ваш IP-адрес

#### Windows
```cmd
# Откройте командную строку и выполните:
ipconfig

# Найдите "IPv4 Address" под вашим активным сетевым адаптером
```

#### macOS
```bash
# Получить локальный IP
ifconfig | grep "inet " | grep -v 127.0.0.1

# Или используйте Системные настройки → Сеть → Дополнительно → TCP/IP
```

#### Linux
```bash
# Получить локальный IP
hostname -I

# Или
ip addr show | grep "inet " | grep -v 127.0.0.1
```

#### Публичный IP (для облачных серверов)
```bash
# Получить публичный IP
curl ifconfig.me
# или
curl ipinfo.io/ip
```

## Шаг 4: Сборка и развертывание

### Быстрое развертывание
```bash
# Собрать Docker образ
npm run docker:build

# Запустить сервисы
npm run docker:up

# Проверить статус
npm run docker:logs
```

### Ручные команды Docker
```bash
# Собрать образ
docker build -t family-vpn-server .

# Запустить с docker-compose
docker-compose up -d

# Просмотреть логи
docker-compose logs -f

# Проверить запущенные контейнеры
docker-compose ps
```

## Шаг 5: Первоначальная настройка

### Создание учетных данных администратора
```bash
# Настроить аутентификацию администратора
docker exec -it family-vpn-server npm run setup-auth

# Следуйте подсказкам для создания имени пользователя и пароля
```

### Инициализация PKI (система сертификатов)
```bash
# Инициализировать центр сертификации
docker exec -it family-vpn-server npm run init-pki

# Это создает CA и серверные сертификаты
```

### Применение усиления безопасности
```bash
# Применить конфигурации безопасности
docker exec -it family-vpn-server npm run harden-config

# Настроить правила брандмауэра (если на Linux хосте)
docker exec -it family-vpn-server npm run firewall:init
```

## Шаг 6: Проверка установки

### Проверка статуса сервиса
```bash
# Просмотреть статус контейнера
docker-compose ps

# Проверить логи на ошибки
docker-compose logs family-vpn-server

# Тестировать веб-интерфейс
curl -k http://localhost:3000/health
```

### Доступ к веб-интерфейсу
1. **Откройте браузер** и перейдите на:
   - Локально: `http://localhost:3000`
   - Удаленно: `http://YOUR_SERVER_IP:3000`

2. **Войдите** с созданными учетными данными

3. **Проверьте**, что вы можете видеть интерфейс управления VPN

## Шаг 7: Генерация клиентских сертификатов

### Использование веб-интерфейса
1. **Доступ к порталу управления** на `http://YOUR_SERVER_IP:3000`
2. **Войдите** с учетными данными администратора
3. **Нажмите "Generate New Certificate"**
4. **Введите имя клиента** (например, "john-laptop")
5. **Скачайте .ovpn файл**

### Использование командной строки
```bash
# Генерировать клиентский сертификат
docker exec -it family-vpn-server npm run generate-client

# Следуйте подсказкам для ввода имени клиента
# Сертификат будет создан в директории certificates/
```

## Детали конфигурации Docker

### Архитектура контейнера
Настройка Docker включает:
- **Базовый образ**: Alpine Linux (минимальный, безопасный)
- **Среда выполнения**: Node.js 18
- **VPN программное обеспечение**: OpenVPN с Easy-RSA
- **Безопасность**: Пользователь без root, минимальные привилегии

### Монтирование томов
```yaml
volumes:
  - ./easy-rsa:/app/easy-rsa          # Управление PKI
  - vpn-certificates:/app/certificates # Хранение сертификатов
  - vpn-logs:/app/logs                # Хранение логов
```

### Конфигурация сети
```yaml
ports:
  - "1194:1194/udp"  # Трафик OpenVPN
  - "3000:3000/tcp"  # Веб-интерфейс управления

cap_add:
  - NET_ADMIN        # Требуется для функциональности VPN

devices:
  - /dev/net/tun:/dev/net/tun  # Доступ к устройству TUN
```

### Переменные окружения
Ключевые переменные окружения в контейнере:
```env
VPN_CERT_DIR=/app/certificates
VPN_CONFIG_DIR=/app/config
NODE_ENV=production
DOCKER_ENV=true
```

## Продакшн развертывание

### Использование продакшн Compose файла
```bash
# Использовать продакшн конфигурацию
docker-compose -f docker-compose.prod.yml up -d

# Это включает:
# - SSL/TLS терминацию
# - Улучшенные настройки безопасности
# - Продакшн логирование
# - Проверки здоровья
```

### Настройка SSL/HTTPS
```bash
# Генерировать SSL сертификаты (Let's Encrypt)
docker exec -it family-vpn-server-prod npm run ssl:generate

# Или использовать существующие сертификаты
# Монтировать их в docker-compose.prod.yml
```

## Команды управления

### Управление контейнерами
```bash
# Запустить сервисы
docker-compose up -d

# Остановить сервисы
docker-compose down

# Перезапустить сервисы
docker-compose restart

# Просмотреть логи
docker-compose logs -f

# Выполнить команды в контейнере
docker exec -it family-vpn-server bash
```

### Резервное копирование и восстановление
```bash
# Создать резервную копию
docker exec -it family-vpn-server npm run backup:create

# Список резервных копий
docker exec -it family-vpn-server npm run backup:list

# Восстановить из резервной копии
docker exec -it family-vpn-server npm run backup:restore
```

### Обновления
```bash
# Получить последний образ
docker-compose pull

# Пересобрать и перезапустить
docker-compose up -d --build

# Очистить старые образы
docker image prune
```

## Устранение неполадок

### Общие проблемы

#### "Контейнер не запускается"
```bash
# Проверить логи
docker-compose logs family-vpn-server

# Общие причины:
# - Конфликты портов (изменить порты в docker-compose.yml)
# - Проблемы с разрешениями (проверить владельца файлов)
# - Отсутствует устройство TUN (убедиться, что /dev/net/tun существует)
```

#### "Не могу получить доступ к веб-интерфейсу"
```bash
# Проверить, запущен ли контейнер
docker-compose ps

# Проверить привязку портов
docker port family-vpn-server

# Тестировать подключение
curl -k http://localhost:3000/health

# Проверить брандмауэр
sudo ufw status
```

#### "VPN клиенты не могут подключиться"
```bash
# Проверить процесс OpenVPN
docker exec -it family-vpn-server ps aux | grep openvpn

# Проверить VPN порт
docker exec -it family-vpn-server netstat -ulnp | grep 1194

# Проверить логи
docker exec -it family-vpn-server tail -f /var/log/openvpn/openvpn.log
```

#### Ошибки "Доступ запрещен"
```bash
# Исправить разрешения файлов
sudo chown -R $USER:$USER .

# Для доступа к Docker сокету
sudo usermod -aG docker $USER
# Выйти и войти снова
```

### Режим отладки
```bash
# Запустить в режиме отладки
docker-compose -f docker-compose.yml -f docker-compose.debug.yml up

# Или установить отладочное окружение
docker run -it --rm \
  -e DEBUG=* \
  -e LOG_LEVEL=debug \
  family-vpn-server npm start
```

## Соображения безопасности

### Безопасность контейнера
- **Пользователь без root**: Контейнер работает как непривилегированный пользователь
- **Минимальные возможности**: Добавлена только возможность NET_ADMIN
- **Файловая система только для чтения**: Большая часть файловой системы только для чтения
- **Нет доступа к shell**: Продакшн контейнеры не имеют shell

### Сетевая безопасность
- **Правила брандмауэра**: Ограничить доступ к интерфейсу управления
- **TLS шифрование**: Использовать HTTPS для веб-интерфейса
- **VPN шифрование**: Сильные настройки шифрования OpenVPN

### Защита данных
- **Шифрование томов**: Рассмотреть шифрование Docker томов
- **Безопасность сертификатов**: Защитить хранилище сертификатов
- **Шифрование резервных копий**: Шифровать резервные копии перед хранением

## Следующие шаги

После успешной установки Docker:

1. **[Конфигурация окружения](../configuration/environment.md)**
2. **[Конфигурация безопасности](../configuration/security.md)**
3. **[Управление сертификатами](../configuration/certificates.md)**
4. **[Настройка клиентов](../troubleshooting/common-issues.md#client-setup)**

## Расширенная конфигурация Docker

### Пользовательские сети
```yaml
# docker-compose.yml
networks:
  vpn-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16
```

### Ограничения ресурсов
```yaml
# docker-compose.yml
services:
  vpn-server:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
```

### Проверки здоровья
```yaml
# docker-compose.yml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s
```

<!-- auto-added placeholders to match EN structure -->

## Дополнительный раздел (заглушка 1)


## Дополнительный раздел (заглушка 2)


## Дополнительный раздел (заглушка 3)
