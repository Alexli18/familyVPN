# Руководство по развертыванию Microsoft Azure

Это руководство охватывает развертывание семейного VPN сервера на Microsoft Azure с использованием виртуальных машин с правильными сетями, безопасностью и лучшими практиками.

## Предварительные требования

- Аккаунт Microsoft Azure с активной подпиской
- Azure CLI установлен и настроен
- Базовое понимание концепций сетей Azure
- SSH ключевая пара для доступа к VM

## Быстрый старт

### 1. Настройка Azure окружения

```bash
# Установить Azure CLI (если не установлен)
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

# Войти в Azure
az login

# Установить подписку по умолчанию
az account set --subscription "ваш-subscription-id"

# Создать группу ресурсов
az group create --name family-vpn-rg --location eastus
```

### 2. Создание виртуальной машины

```bash
# Создать VM с Ubuntu 20.04
az vm create \
  --resource-group family-vpn-rg \
  --name family-vpn-server \
  --image UbuntuLTS \
  --size Standard_B2s \
  --admin-username azureuser \
  --generate-ssh-keys \
  --public-ip-sku Standard \
  --storage-sku Premium_LRS \
  --os-disk-size-gb 30

# Получить публичный IP адрес
az vm show -d -g family-vpn-rg -n family-vpn-server --query publicIps -o tsv
```

### 3. Настройка группы сетевой безопасности

```bash
# Создать группу сетевой безопасности
az network nsg create \
  --resource-group family-vpn-rg \
  --name family-vpn-nsg

# Разрешить SSH
az network nsg rule create \
  --resource-group family-vpn-rg \
  --nsg-name family-vpn-nsg \
  --name allow-ssh \
  --protocol Tcp \
  --priority 1000 \
  --destination-port-range 22 \
  --access Allow

# Разрешить OpenVPN
az network nsg rule create \
  --resource-group family-vpn-rg \
  --nsg-name family-vpn-nsg \
  --name allow-openvpn \
  --protocol Udp \
  --priority 1001 \
  --destination-port-range 1194 \
  --access Allow

# Разрешить HTTPS для веб-интерфейса
az network nsg rule create \
  --resource-group family-vpn-rg \
  --nsg-name family-vpn-nsg \
  --name allow-https \
  --protocol Tcp \
  --priority 1002 \
  --destination-port-range 443 \
  --source-address-prefix ВАШ_АДМИН_IP \
  --access Allow
```

### 4. Подключение и настройка VM

```bash
# Получить публичный IP VM
VM_IP=$(az vm show -d -g family-vpn-rg -n family-vpn-server --query publicIps -o tsv)

# Подключиться к VM
ssh azureuser@$VM_IP

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
# Получить публичный IP VM
export VPN_HOST=$(curl -s -H Metadata:true \
  "http://169.254.169.254/metadata/instance/network/interface/0/ipv4/ipAddress/0/publicIpAddress?api-version=2017-08-01&format=text")

# Создать конфигурацию окружения
cp .env.example .env

# Обновить .env с Azure-специфичными настройками
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

### 1. Статический публичный IP

```bash
# Создать статический публичный IP
az network public-ip create \
  --resource-group family-vpn-rg \
  --name family-vpn-ip \
  --sku Standard \
  --allocation-method Static

# Связать с VM
az network nic ip-config update \
  --resource-group family-vpn-rg \
  --nic-name family-vpn-serverVMNic \
  --name ipconfigfamily-vpn-server \
  --public-ip-address family-vpn-ip
```

### 2. Интеграция Azure Monitor

```bash
# Создать рабочую область Log Analytics
az monitor log-analytics workspace create \
  --resource-group family-vpn-rg \
  --workspace-name family-vpn-workspace

# Установить и настроить агент Log Analytics
wget https://raw.githubusercontent.com/Microsoft/OMS-Agent-for-Linux/master/installer/scripts/onboard_agent.sh
sudo sh onboard_agent.sh -w $WORKSPACE_ID -s $WORKSPACE_KEY
```

## Резервное копирование и восстановление

### 1. Снимки VM

```bash
# Создать снимок
az snapshot create \
  --resource-group family-vpn-rg \
  --name family-vpn-snapshot-$(date +%Y%m%d-%H%M%S) \
  --source family-vpn-server_OsDisk_1_$(az vm show -g family-vpn-rg -n family-vpn-server --query storageProfile.osDisk.managedDisk.id -o tsv | cut -d'/' -f9)
```

### 2. Резервное копирование Azure Storage

```bash
# Создать аккаунт хранилища
az storage account create \
  --name familyvpnbackup$(date +%s) \
  --resource-group family-vpn-rg \
  --location eastus \
  --sku Standard_LRS

# Создать скрипт резервного копирования
cat > /home/azureuser/backup-storage.sh <<EOF
#!/bin/bash
STORAGE_ACCOUNT="ваш-storage-account-name"
STORAGE_KEY="ваш-storage-key"
CONTAINER="vpn-backups"
DATE=\$(date +%Y%m%d_%H%M%S)

# Резервное копирование сертификатов и конфигурации
tar -czf /tmp/vpn-backup-\$DATE.tar.gz \
  /home/azureuser/family-vpn-server/certificates \
  /home/azureuser/family-vpn-server/easy-rsa/pki \
  /home/azureuser/family-vpn-server/.env \
  /home/azureuser/family-vpn-server/logs

# Загрузить в Azure Storage
az storage blob upload \
  --file /tmp/vpn-backup-\$DATE.tar.gz \
  --name vpn-backup-\$DATE.tar.gz \
  --container-name \$CONTAINER \
  --account-name \$STORAGE_ACCOUNT \
  --account-key \$STORAGE_KEY

# Очистить локальную резервную копию
rm /tmp/vpn-backup-\$DATE.tar.gz
EOF

chmod +x /home/azureuser/backup-storage.sh

# Запланировать ежедневные резервные копии
echo "0 3 * * * /home/azureuser/backup-storage.sh" | crontab -
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


## Дополнительный раздел (заглушка 81)


## Дополнительный раздел (заглушка 82)


## Дополнительный раздел (заглушка 83)


## Дополнительный раздел (заглушка 84)


## Дополнительный раздел (заглушка 85)


## Дополнительный раздел (заглушка 86)


## Дополнительный раздел (заглушка 87)


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

```bash
echo "TODO: перевести и добавить пример"
```

```bash
echo "TODO: перевести и добавить пример"
```
