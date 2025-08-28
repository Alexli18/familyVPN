# Процедуры резервного копирования и восстановления

Это руководство охватывает создание резервных копий, восстановление и процедуры аварийного восстановления.

## Процедуры резервного копирования

### Автоматизированное резервное копирование

Система включает автоматизированную функциональность резервного копирования для сертификатов и конфигурации.

```bash
# Создание полной резервной копии
npm run backup:create

# Список доступных резервных копий
npm run backup:list

# Проверка целостности резервной копии
npm run backup:verify
```

### Ручное резервное копирование

#### Резервное копирование сертификатов

```bash
# Резервное копирование PKI инфраструктуры
cp -r easy-rsa/pki/ backup-pki-$(date +%Y%m%d)/

# Резервное копирование клиентских сертификатов
cp -r test-certificates/ backup-certs-$(date +%Y%m%d)/
cp -r certificates/ backup-server-certs-$(date +%Y%m%d)/

# Создание сжатого архива
tar -czf pki-backup-$(date +%Y%m%d).tar.gz backup-pki-* backup-certs-* backup-server-certs-*
```

#### Резервное копирование конфигурации

```bash
# Резервное копирование конфигурации окружения
cp .env backup-env-$(date +%Y%m%d)

# Резервное копирование логов приложения
cp -r logs/ backup-logs-$(date +%Y%m%d)/

# Резервное копирование скриптов и пользовательских конфигураций
cp -r scripts/ backup-scripts-$(date +%Y%m%d)/
```

#### Полное резервное копирование системы

```bash
#!/bin/bash
# Скрипт полного резервного копирования

BACKUP_DIR="vpn-backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p $BACKUP_DIR

# Копирование основных файлов
cp .env $BACKUP_DIR/
cp -r easy-rsa/pki/ $BACKUP_DIR/pki/
cp -r certificates/ $BACKUP_DIR/certificates/
cp -r test-certificates/ $BACKUP_DIR/test-certificates/
cp -r logs/ $BACKUP_DIR/logs/
cp package.json $BACKUP_DIR/
cp package-lock.json $BACKUP_DIR/

# Создание манифеста
echo "Резервная копия создана: $(date)" > $BACKUP_DIR/manifest.txt
echo "Система: $(uname -a)" >> $BACKUP_DIR/manifest.txt
echo "Node.js: $(node --version)" >> $BACKUP_DIR/manifest.txt
echo "NPM: $(npm --version)" >> $BACKUP_DIR/manifest.txt

# Создание контрольных сумм
find $BACKUP_DIR -type f -exec md5sum {} \; > $BACKUP_DIR/checksums.md5

# Сжатие резервной копии
tar -czf $BACKUP_DIR.tar.gz $BACKUP_DIR/
rm -rf $BACKUP_DIR/

echo "Резервная копия создана: $BACKUP_DIR.tar.gz"
```

## Процедуры восстановления

### Восстановление сертификатов

#### Восстановление PKI инфраструктуры

```bash
# Сначала остановите сервисы
npm run docker:down
pkill -f "node.*server.js"

# Создайте резервную копию текущего состояния (если есть)
mv easy-rsa/pki/ easy-rsa/pki-backup-$(date +%Y%m%d) 2>/dev/null

# Восстановление из резервной копии
tar -xzf pki-backup-YYYYMMDD.tar.gz
cp -r backup-pki-YYYYMMDD/ easy-rsa/pki/

# Установка правильных прав доступа
chmod -R 755 easy-rsa/pki/
chmod 600 easy-rsa/pki/private/*
chown -R $USER:$USER easy-rsa/pki/

# Проверка восстановления
ls -la easy-rsa/pki/
openssl x509 -in easy-rsa/pki/ca.crt -text -noout | grep -A2 "Validity"
```

#### Восстановление клиентских сертификатов

```bash
# Восстановление каталога клиентских сертификатов
rm -rf test-certificates/
cp -r backup-certs-YYYYMMDD/ test-certificates/

# Восстановление серверных сертификатов
rm -rf certificates/
cp -r backup-server-certs-YYYYMMDD/ certificates/

# Установка прав доступа
chmod 755 test-certificates/ certificates/
chmod 644 test-certificates/*.crt test-certificates/*.ovpn
chmod 600 test-certificates/*.key
```

### Восстановление конфигурации

#### Восстановление конфигурации окружения

```bash
# Резервное копирование текущей конфигурации
cp .env .env.backup-$(date +%Y%m%d) 2>/dev/null

# Восстановление из резервной копии
cp backup-env-YYYYMMDD .env

# Проверка конфигурации
cat .env | grep -E "(VPN_HOST|VPN_SUBNET|JWT_SECRET)"

# Тестирование конфигурации
npm run validate-config
```

#### Восстановление состояния приложения

```bash
# Восстановление логов (опционально)
rm -rf logs/
cp -r backup-logs-YYYYMMDD/ logs/

# Восстановление пользовательских скриптов
cp -r backup-scripts-YYYYMMDD/* scripts/

# Переустановка зависимостей
npm install

# Проверка установки
npm test
```

### Полное восстановление системы

#### Полное восстановление системы

```bash
#!/bin/bash
# Скрипт полного восстановления системы

BACKUP_FILE="$1"
if [ -z "$BACKUP_FILE" ]; then
    echo "Использование: $0 <backup-file.tar.gz>"
    exit 1
fi

echo "🔄 Начало восстановления системы из $BACKUP_FILE"

# Остановка всех сервисов
echo "Остановка сервисов..."
npm run docker:down 2>/dev/null
pkill -f "node.*server.js" 2>/dev/null
sleep 5

# Создание резервной копии восстановления текущего состояния
echo "Создание резервной копии восстановления..."
RECOVERY_BACKUP="recovery-backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p $RECOVERY_BACKUP
cp .env $RECOVERY_BACKUP/ 2>/dev/null
cp -r easy-rsa/pki/ $RECOVERY_BACKUP/pki/ 2>/dev/null
cp -r certificates/ $RECOVERY_BACKUP/certificates/ 2>/dev/null

# Извлечение резервной копии
echo "Извлечение резервной копии..."
tar -xzf $BACKUP_FILE

# Определение имени каталога резервной копии
BACKUP_DIR=$(tar -tzf $BACKUP_FILE | head -1 | cut -f1 -d"/")

# Восстановление файлов
echo "Восстановление конфигурации..."
cp $BACKUP_DIR/.env .env

echo "Восстановление PKI..."
rm -rf easy-rsa/pki/
cp -r $BACKUP_DIR/pki/ easy-rsa/pki/

echo "Восстановление сертификатов..."
rm -rf certificates/ test-certificates/
cp -r $BACKUP_DIR/certificates/ certificates/
cp -r $BACKUP_DIR/test-certificates/ test-certificates/

echo "Восстановление логов..."
rm -rf logs/
cp -r $BACKUP_DIR/logs/ logs/

# Установка прав доступа
echo "Установка прав доступа..."
chmod -R 755 easy-rsa/pki/
chmod 600 easy-rsa/pki/private/*
chmod 755 certificates/ test-certificates/
chmod 644 certificates/*.crt test-certificates/*.crt
chmod 600 certificates/*.key test-certificates/*.key
chown -R $USER:$USER easy-rsa/ certificates/ test-certificates/

# Проверка контрольных сумм, если доступны
if [ -f "$BACKUP_DIR/checksums.md5" ]; then
    echo "Проверка контрольных сумм..."
    cd $BACKUP_DIR
    md5sum -c checksums.md5
    cd ..
fi

# Очистка извлеченной резервной копии
rm -rf $BACKUP_DIR/

# Переустановка зависимостей
echo "Переустановка зависимостей..."
npm install

# Тестирование восстановления
echo "Тестирование восстановления..."
npm test

if [ $? -eq 0 ]; then
    echo "✅ Восстановление системы завершено успешно"
    echo "Резервная копия восстановления сохранена в: $RECOVERY_BACKUP"
    
    # Запуск сервисов
    echo "Запуск сервисов..."
    npm start &
    
    echo "🎉 Система готова!"
else
    echo "❌ Восстановление системы не удалось"
    echo "Проверьте логи и рассмотрите ручное восстановление"
    echo "Резервная копия восстановления доступна в: $RECOVERY_BACKUP"
    exit 1
fi
```

## Сценарии аварийного восстановления

### Сценарий 1: Полная потеря PKI

Когда вся PKI инфраструктура потеряна или повреждена:

```bash
# КРИТИЧНО: Это сделает недействительными ВСЕ существующие клиентские сертификаты!

echo "⚠️  ПРЕДУПРЕЖДЕНИЕ: Это сделает недействительными все существующие сертификаты!"
read -p "Продолжить? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    exit 1
fi

# Остановка всех сервисов
npm run docker:down
pkill -f "node.*server.js"

# Резервное копирование поврежденной PKI для криминалистики
mv easy-rsa/pki/ easy-rsa/pki-corrupted-$(date +%Y%m%d)

# Инициализация новой PKI
npm run clean
npm run init-pki

# Перегенерация серверного сертификата
npm run fix-server-cert

# Обновление конфигурации сервера
npm run harden-config

# Уведомление всех пользователей о обновлении сертификатов
echo "📧 ВАЖНО: Все клиентские сертификаты должны быть перегенерированы!"
echo "Предыдущие сертификаты больше не действительны."

# Генерация новых клиентских сертификатов для известных пользователей
# (Извлечение списка пользователей из логов или резервной копии)
grep "CLIENT_CERTIFICATE_GENERATED" logs/security-*.log | \
    awk '{print $NF}' | sort -u > client-list.txt

echo "Список клиентов сохранен в client-list.txt"
echo "Перегенерируйте сертификаты для каждого клиента вручную"
```

### Сценарий 2: Нарушение безопасности

При обнаружении нарушения безопасности:

```bash
# ПРОТОКОЛ НЕМЕДЛЕННОГО РЕАГИРОВАНИЯ

echo "🚨 ОБНАРУЖЕНО НАРУШЕНИЕ БЕЗОПАСНОСТИ - ИНИЦИАЦИЯ БЛОКИРОВКИ"

# 1. Немедленно остановить все сервисы
npm run docker:down
pkill -f "node.*server.js"
sudo systemctl stop openvpn@server 2>/dev/null

# 2. Создать криминалистическую резервную копию
FORENSIC_BACKUP="forensic-backup-$(date +%Y%m%d-%H%M%S)"
cp -r . ../$FORENSIC_BACKUP/
echo "Криминалистическая резервная копия создана: ../$FORENSIC_BACKUP"

# 3. Проверить признаки компрометации
echo "Проверка индикаторов компрометации..."
grep -i -E "(failed|breach|attack|intrusion|unauthorized)" logs/security-*.log > security-incidents.log
grep -i -E "(authentication.*failed)" logs/application-*.log >> security-incidents.log

# 4. Немедленно отозвать все сертификаты
echo "Отзыв всех активных сертификатов..."
# Добавить все выданные сертификаты в CRL
for cert in easy-rsa/pki/issued/*.crt; do
    if [ "$cert" != "easy-rsa/pki/issued/server.crt" ]; then
        basename=$(basename "$cert" .crt)
        echo "Отзыв: $basename"
        cd easy-rsa && ./easyrsa revoke "$basename" && cd ..
    fi
done

# Генерация нового CRL
cd easy-rsa && ./easyrsa gen-crl && cd ..

# 5. Изменить все секреты
echo "Изменение всех секретов аутентификации..."
rm .env
npm run setup-auth
npm run setup-secrets

# 6. Переинициализировать PKI с новым CA
echo "Переинициализация PKI инфраструктуры..."
npm run clean
npm run init-pki

# 7. Обновить конфигурацию безопасности
npm run harden-config
npm run security-scan

# 8. Создать отчет об инциденте
cat > security-incident-$(date +%Y%m%d-%H%M%S).txt << EOF
ОТЧЕТ О ИНЦИДЕНТЕ БЕЗОПАСНОСТИ
=============================
Дата: $(date)
Система: $(uname -a)

ПРЕДПРИНЯТЫЕ ДЕЙСТВИЯ:
- Все сервисы немедленно остановлены
- Создана криминалистическая резервная копия: $FORENSIC_BACKUP
- Все сертификаты отозваны
- Секреты аутентификации изменены
- PKI инфраструктура переинициализирована
- Конфигурация безопасности обновлена

ДОКАЗАТЕЛЬСТВА:
$(cat security-incidents.log)

СЛЕДУЮЩИЕ ШАГИ:
1. Анализ криминалистической резервной копии на векторы атак
2. Просмотр системных логов для временной шкалы компрометации
3. Обновление мер безопасности на основе находок
4. Перегенерация всех клиентских сертификатов
5. Уведомление всех пользователей об инциденте безопасности
EOF

echo "✅ Немедленное реагирование завершено"
echo "📋 Отчет об инциденте: security-incident-$(date +%Y%m%d-%H%M%S).txt"
echo "🔍 Просмотрите криминалистическую резервную копию: ../$FORENSIC_BACKUP"
```

### Сценарий 3: Потеря доступа к системе

Когда административный доступ к системе потерян:

```bash
# ВОССТАНОВЛЕНИЕ ЭКСТРЕННОГО ДОСТУПА

# Если у вас есть физический/консольный доступ:

# 1. Сброс веб-аутентификации
rm .env
npm run setup-auth

# 2. Проверка сетевой конфигурации
npm run firewall:status
netstat -tlnp | grep 3000

# 3. Сброс к конфигурации по умолчанию
cp .env.example .env
npm run setup

# 4. Проверка статуса сервиса
npm test
npm start

# Если у вас есть резервный доступ через SSH ключ:

# 1. Подключение через SSH
ssh -i ~/.ssh/emergency_key user@vpn-server

# 2. Переход в каталог VPN
cd /path/to/vpn/server

# 3. Следование стандартным процедурам восстановления
npm run backup:create  # Создание резервной копии текущего состояния
# Затем продолжить с сбросом конфигурации
```

## Мониторинг и предотвращение

### Автоматизированное расписание резервного копирования

```bash
# Добавить в crontab (crontab -e)

# Ежедневное резервное копирование в 2 утра
0 2 * * * cd /path/to/vpn && npm run backup:create

# Еженедельное полное резервное копирование в 3 утра по воскресеньям
0 3 * * 0 cd /path/to/vpn && ./full-backup.sh

# Ежемесячная очистка старых резервных копий (сохранить последние 12)
0 4 1 * * find /path/to/vpn/certificate-backups/ -type d -mtime +360 -exec rm -rf {} \;
```

### Мониторинг состояния

```bash
# Добавить в crontab для ежедневных проверок состояния

# Ежедневная проверка состояния в 6 утра
0 6 * * * cd /path/to/vpn && npm test > /tmp/vpn-health-$(date +\%Y\%m\%d).log 2>&1

# Проверка истечения сертификатов (еженедельно)
0 7 * * 1 cd /path/to/vpn && openssl x509 -in easy-rsa/pki/ca.crt -checkend 2592000 -noout || echo "CA сертификат истекает в течение 30 дней" | mail -s "Предупреждение о сертификате VPN" admin@example.com
```

### Проверка резервных копий

```bash
#!/bin/bash
# Скрипт проверки резервных копий

BACKUP_DIR="certificate-backups"

echo "🔍 Проверка целостности резервных копий..."

for backup in $BACKUP_DIR/backup-*/; do
    if [ -d "$backup" ]; then
        echo "Проверка: $backup"
        
        # Проверка манифеста
        if [ -f "$backup/manifest.json" ]; then
            echo "  ✅ Манифест существует"
        else
            echo "  ❌ Манифест отсутствует"
        fi
        
        # Проверка контрольных сумм
        if [ -f "$backup/checksums.json" ]; then
            echo "  ✅ Контрольные суммы существуют"
            # Проверить контрольные суммы здесь при необходимости
        else
            echo "  ❌ Контрольные суммы отсутствуют"
        fi
        
        # Проверка основных файлов
        if [ -f "$backup/pki/ca.crt" ]; then
            echo "  ✅ CA сертификат присутствует"
        else
            echo "  ❌ CA сертификат отсутствует"
        fi
    fi
done

echo "Проверка резервных копий завершена"
```

## Тестирование восстановления

### Регулярные учения по восстановлению

```bash
#!/bin/bash
# Скрипт учений по восстановлению - запускать ежемесячно

echo "🧪 Начало учений по восстановлению..."

# Создание тестовой среды
TEST_DIR="recovery-test-$(date +%Y%m%d)"
mkdir -p $TEST_DIR
cd $TEST_DIR

# Копирование файлов приложения (не данных)
cp -r ../src .
cp -r ../scripts .
cp ../package.json .
cp ../package-lock.json .

# Установка зависимостей
npm install

# Тестирование восстановления резервной копии
LATEST_BACKUP=$(ls -t ../certificate-backups/backup-*.tar.gz | head -1)
echo "Тестирование восстановления: $LATEST_BACKUP"

# Извлечение и восстановление
tar -xzf $LATEST_BACKUP
# ... шаги восстановления ...

# Тестирование функциональности
npm test

if [ $? -eq 0 ]; then
    echo "✅ Учения по восстановлению успешны"
else
    echo "❌ Учения по восстановлению не удались"
fi

# Очистка
cd ..
rm -rf $TEST_DIR

echo "Учения по восстановлению завершены"
```

Помните: Регулярное тестирование процедур резервного копирования и восстановления крайне важно. Планируйте ежемесячные учения по восстановлению, чтобы убедиться, что ваши процедуры работают при необходимости.