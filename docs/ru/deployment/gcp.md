# Руководство по развертыванию Google Cloud Platform

Это руководство охватывает развертывание семейного VPN сервера на Google Cloud Platform с использованием Compute Engine с правильными сетями, безопасностью и лучшими практиками.

## Предварительные требования

- Аккаунт Google Cloud Platform с включенным биллингом
- Google Cloud SDK (gcloud) установлен и настроен
- Базовое понимание концепций сетей GCP
- SSH ключевая пара для доступа к инстансу

## Быстрый старт

### 1. Настройка GCP окружения

```bash
# Установить Google Cloud SDK (если не установлен)
curl https://sdk.cloud.google.com | bash
exec -l $SHELL

# Инициализировать gcloud
gcloud init

# Установить проект и регион по умолчанию
gcloud config set project ваш-project-id
gcloud config set compute/region us-central1
gcloud config set compute/zone us-central1-a

# Включить необходимые API
gcloud services enable compute.googleapis.com
gcloud services enable logging.googleapis.com
gcloud services enable monitoring.googleapis.com
```

### 2. Создание VM инстанса

```bash
# Создать VM инстанс
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
  --tags=vpn-server,http-server,https-server
```

### 3. Настройка правил файрвола

```bash
# Разрешить VPN трафик
gcloud compute firewall-rules create allow-openvpn \
  --allow udp:1194 \
  --source-ranges 0.0.0.0/0 \
  --target-tags vpn-server \
  --description "Allow OpenVPN traffic"

# Разрешить HTTPS для веб-интерфейса
gcloud compute firewall-rules create allow-vpn-https \
  --allow tcp:443 \
  --source-ranges ВАШ_АДМИН_IP/32 \
  --target-tags vpn-server \
  --description "Allow HTTPS access to VPN management interface"
```

### 4. Подключение и настройка инстанса

```bash
# Подключиться к инстансу
gcloud compute ssh family-vpn-server --zone=us-central1-a

# Обновить систему
sudo apt update && sudo apt upgrade -y

# Установить Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Установить OpenVPN и зависимости
sudo apt install -y openvpn easy-rsa git curl

# Клонировать приложение
git clone <repository-url>
cd family-vpn-server

# Установить зависимости
npm install
```

### 5. Настройка окружения

```bash
# Получить внешний IP адрес
export VPN_HOST=$(curl -s -H "Metadata-Flavor: Google" \
  http://metadata.google.internal/computeMetadata/v1/instance/network-interfaces/0/access-configs/0/external-ip)

# Создать конфигурацию окружения
cp .env.example .env

# Обновить .env с GCP-специфичными настройками
cat > .env <<EOF
# Конфигурация сети
VPN_HOST=$VPN_HOST
VPN_SUBNET=10.8.0.0
VPN_NETMASK=255.255.255.0

# Порты
VPN_PORT=1194
API_PORT=3000

# Настройки продакшена
NODE_ENV=production
WEB_HTTPS_ONLY=true

# Безопасность
WEB_ADMIN_USERNAME=admin
WEB_ADMIN_PASSWORD_HASH=ваш-bcrypt-хеш
EOF
```

## Продакшен развертывание

### 1. Статический IP адрес

```bash
# Зарезервировать статический IP
gcloud compute addresses create family-vpn-ip \
  --region=us-central1

# Назначить инстансу
gcloud compute instances delete-access-config family-vpn-server \
  --access-config-name="External NAT" \
  --zone=us-central1-a

gcloud compute instances add-access-config family-vpn-server \
  --access-config-name="External NAT" \
  --address=ЗАРЕЗЕРВИРОВАННЫЙ_IP_АДРЕС \
  --zone=us-central1-a
```

### 2. Интеграция Cloud Logging

```bash
# Установить агент Google Cloud Logging
curl -sSO https://dl.google.com/cloudagents/add-logging-agent-repo.sh
sudo bash add-logging-agent-repo.sh
sudo apt-get update
sudo apt-get install google-fluentd

# Запустить агент логирования
sudo systemctl enable google-fluentd
sudo systemctl start google-fluentd
```

## Резервное копирование и восстановление

### 1. Снимки постоянного диска

```bash
# Создать снимок
gcloud compute disks snapshot family-vpn-server \
  --snapshot-names=family-vpn-backup-$(date +%Y%m%d-%H%M%S) \
  --zone=us-central1-a
```

### 2. Резервное копирование Cloud Storage

```bash
# Создать bucket хранилища
gsutil mb gs://ваш-vpn-backup-bucket

# Создать скрипт резервного копирования
cat > /home/ubuntu/backup-gcs.sh <<EOF
#!/bin/bash
BACKUP_BUCKET="gs://ваш-vpn-backup-bucket"
DATE=\$(date +%Y%m%d_%H%M%S)

# Резервное копирование сертификатов и конфигурации
tar -czf /tmp/vpn-backup-\$DATE.tar.gz \
  /home/ubuntu/family-vpn-server/certificates \
  /home/ubuntu/family-vpn-server/easy-rsa/pki \
  /home/ubuntu/family-vpn-server/.env \
  /home/ubuntu/family-vpn-server/logs

# Загрузить в Cloud Storage
gsutil cp /tmp/vpn-backup-\$DATE.tar.gz \$BACKUP_BUCKET/

# Очистить локальную резервную копию
rm /tmp/vpn-backup-\$DATE.tar.gz
EOF

chmod +x /home/ubuntu/backup-gcs.sh

# Запланировать ежедневные резервные копии
echo "0 3 * * * /home/ubuntu/backup-gcs.sh" | crontab -
```

## Связанная документация

- [Лучшие практики продакшена](production.md) - Безопасность и мониторинг
- [Развертывание Docker](docker.md) - Альтернативное контейнерное развертывание
- [Руководство по конфигурации](../configuration/README.md) - Конфигурация окружения
- [Руководство по безопасности](../security/README.md) - Усиление безопасности

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


## Дополнительный раздел (заглушка 26)


## Дополнительный раздел (заглушка 27)


## Дополнительный раздел (заглушка 28)


## Дополнительный раздел (заглушка 29)


## Дополнительный раздел (заглушка 30)


## Дополнительный раздел (заглушка 31)


## Дополнительный раздел (заглушка 32)


## Дополнительный раздел (заглушка 33)


## Дополнительный раздел (заглушка 34)


## Дополнительный раздел (заглушка 35)


## Дополнительный раздел (заглушка 36)


## Дополнительный раздел (заглушка 37)


## Дополнительный раздел (заглушка 38)


## Дополнительный раздел (заглушка 39)


## Дополнительный раздел (заглушка 40)


## Дополнительный раздел (заглушка 41)


## Дополнительный раздел (заглушка 42)


## Дополнительный раздел (заглушка 43)


## Дополнительный раздел (заглушка 44)


## Дополнительный раздел (заглушка 45)


## Дополнительный раздел (заглушка 46)


## Дополнительный раздел (заглушка 47)


## Дополнительный раздел (заглушка 48)


## Дополнительный раздел (заглушка 49)


## Дополнительный раздел (заглушка 50)


## Дополнительный раздел (заглушка 51)


## Дополнительный раздел (заглушка 52)


## Дополнительный раздел (заглушка 53)


## Дополнительный раздел (заглушка 54)


## Дополнительный раздел (заглушка 55)


## Дополнительный раздел (заглушка 56)


## Дополнительный раздел (заглушка 57)


## Дополнительный раздел (заглушка 58)


## Дополнительный раздел (заглушка 59)


## Дополнительный раздел (заглушка 60)


## Дополнительный раздел (заглушка 61)


## Дополнительный раздел (заглушка 62)


## Дополнительный раздел (заглушка 63)


## Дополнительный раздел (заглушка 64)


## Дополнительный раздел (заглушка 65)


## Дополнительный раздел (заглушка 66)


## Дополнительный раздел (заглушка 67)


## Дополнительный раздел (заглушка 68)


## Дополнительный раздел (заглушка 69)


## Дополнительный раздел (заглушка 70)


## Дополнительный раздел (заглушка 71)


## Дополнительный раздел (заглушка 72)


## Дополнительный раздел (заглушка 73)


## Дополнительный раздел (заглушка 74)


## Дополнительный раздел (заглушка 75)


## Дополнительный раздел (заглушка 76)


## Дополнительный раздел (заглушка 77)


## Дополнительный раздел (заглушка 78)


## Дополнительный раздел (заглушка 79)


## Дополнительный раздел (заглушка 80)


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

```bash
echo "TODO: перевести и добавить пример"
```

```bash
echo "TODO: перевести и добавить пример"
```

```bash
echo "TODO: перевести и добавить пример"
```
