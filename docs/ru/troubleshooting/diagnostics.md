# Системная диагностика

Это руководство предоставляет инструменты и процедуры для диагностики системных проблем.

## Быстрые диагностические команды

### Проверка состояния системы

```bash
# Запуск комплексного системного теста
npm test

# Проверка статуса всех сервисов
npm run status

# Просмотр логов в реальном времени
tail -f logs/application-$(date +%Y-%m-%d).log
tail -f logs/error-$(date +%Y-%m-%d).log
tail -f logs/security-$(date +%Y-%m-%d).log
```

### Системная информация

```bash
# Информация об операционной системе
uname -a
cat /etc/os-release

# Версии Node.js и npm
node --version
npm --version

# Системные ресурсы
free -h          # Использование памяти
df -h            # Использование диска
uptime           # Загрузка системы
```

### Информация о процессах

```bash
# Проверка запущенных процессов
ps aux | grep -E "(node|openvpn)"

# Проверка дерева процессов
pstree -p

# Мониторинг системных процессов
top
htop  # если доступен
```

## Сетевая диагностика

### Статус портов и соединений

```bash
# Проверка прослушиваемых портов
netstat -tlnp | grep -E "(1194|3000)"
ss -tlnp | grep -E "(1194|3000)"

# Проверка всех сетевых соединений
netstat -an
ss -an

# Проверка доступности конкретного порта
lsof -i :3000
lsof -i :1194
```

### Сетевая конфигурация

```bash
# Сетевые интерфейсы
ip addr show
ifconfig  # на старых системах

# Таблица маршрутизации
ip route
route -n

# Сетевая статистика
ip -s link
cat /proc/net/dev
```

### Тестирование подключения

```bash
# Базовое подключение
ping -c 4 8.8.8.8
ping -c 4 google.com

# Разрешение DNS
nslookup google.com
dig google.com
host google.com

# Трассировка сетевого пути
traceroute 8.8.8.8
mtr google.com  # если доступен
```

### Специфичные для VPN сетевые проверки

```bash
# Проверка TUN интерфейса
ip addr show tun0
ip route | grep tun0

# Проверка VPN маршрутизации
ip route show table main
ip rule show

# Тестирование VPN DNS
nslookup google.com 8.8.8.8
```

## Диагностика сертификатов

### Статус PKI

```bash
# Проверка структуры каталога PKI
ls -la easy-rsa/pki/
tree easy-rsa/pki/  # если доступен

# Проверка файлов сертификатов
ls -la easy-rsa/pki/issued/
ls -la easy-rsa/pki/private/
```

### Информация о сертификатах

```bash
# Детали CA сертификата
openssl x509 -in easy-rsa/pki/ca.crt -text -noout

# Детали серверного сертификата
openssl x509 -in easy-rsa/pki/issued/server.crt -text -noout

# Детали клиентского сертификата
openssl x509 -in test-certificates/test-client.crt -text -noout

# Проверка истечения сертификата
openssl x509 -in easy-rsa/pki/ca.crt -checkend 86400 -noout
echo $?  # 0 = действителен, 1 = истекает в течение 24 часов
```

### Валидация сертификатов

```bash
# Проверка цепочки сертификатов
openssl verify -CAfile easy-rsa/pki/ca.crt easy-rsa/pki/issued/server.crt
openssl verify -CAfile easy-rsa/pki/ca.crt test-certificates/test-client.crt

# Проверка соответствия ключа и сертификата
openssl x509 -noout -modulus -in easy-rsa/pki/issued/server.crt | openssl md5
openssl rsa -noout -modulus -in easy-rsa/pki/private/server.key | openssl md5

# Проверка CRL (Список отозванных сертификатов)
openssl crl -in easy-rsa/pki/crl.pem -text -noout
```

## Анализ логов

### Расположение файлов логов

```bash
# Логи приложения
ls -la logs/
tail -f logs/application-$(date +%Y-%m-%d).log

# Системные логи (зависит от ОС)
# Ubuntu/Debian
tail -f /var/log/syslog
journalctl -f

# CentOS/RHEL
tail -f /var/log/messages
journalctl -f

# Логи OpenVPN
tail -f /var/log/openvpn/server.log
```

### Команды анализа логов

```bash
# Поиск ошибок
grep -i error logs/*.log
grep -i failed logs/*.log
grep -i warning logs/*.log

# Поиск конкретных шаблонов
grep "authentication" logs/security-*.log
grep "certificate" logs/application-*.log
grep "connection" logs/*.log

# Подсчет вхождений ошибок
grep -c "ERROR" logs/error-*.log
grep -c "FAILED" logs/security-*.log

# Показать недавние ошибки
tail -100 logs/error-$(date +%Y-%m-%d).log | grep -i error
```

### Анализ логов безопасности

```bash
# Проверка неудачных попыток аутентификации
grep "AUTHENTICATION_FAILED" logs/security-*.log

# Проверка операций с сертификатами
grep "CERTIFICATE_" logs/security-*.log

# Проверка подозрительной активности
grep -E "(BREACH|ATTACK|INTRUSION)" logs/security-*.log

# Проверка паттернов входа
grep "LOGIN_" logs/security-*.log | tail -20
```

## Диагностика производительности

### Производительность системы

```bash
# Использование CPU
top -n 1 | head -20
cat /proc/loadavg

# Использование памяти
free -m
cat /proc/meminfo

# Дисковый I/O
iostat 1 5  # если доступен
iotop       # если доступен

# Сетевой I/O
iftop       # если доступен
nethogs     # если доступен
```

### Производительность приложения

```bash
# Информация о процессе Node.js
ps aux | grep node
pmap $(pgrep node)  # карта памяти

# Проверка утечек памяти
node --inspect server.js
# Затем подключитесь с помощью Chrome DevTools

# Мониторинг файловых дескрипторов
lsof -p $(pgrep node)
```

## Создание диагностических отчетов

### Автоматизированный диагностический отчет

```bash
#!/bin/bash
# Создание комплексного диагностического отчета

REPORT_FILE="diagnostic-report-$(date +%Y%m%d-%H%M%S).txt"

echo "=== Диагностический отчет Family VPN Server ===" > $REPORT_FILE
echo "Создан: $(date)" >> $REPORT_FILE
echo "" >> $REPORT_FILE

echo "=== Системная информация ===" >> $REPORT_FILE
uname -a >> $REPORT_FILE
cat /etc/os-release >> $REPORT_FILE
echo "" >> $REPORT_FILE

echo "=== Версии программного обеспечения ===" >> $REPORT_FILE
node --version >> $REPORT_FILE
npm --version >> $REPORT_FILE
echo "" >> $REPORT_FILE

echo "=== Системные ресурсы ===" >> $REPORT_FILE
free -h >> $REPORT_FILE
df -h >> $REPORT_FILE
uptime >> $REPORT_FILE
echo "" >> $REPORT_FILE

echo "=== Статус процессов ===" >> $REPORT_FILE
ps aux | grep -E "(node|openvpn)" >> $REPORT_FILE
echo "" >> $REPORT_FILE

echo "=== Статус сети ===" >> $REPORT_FILE
netstat -tlnp | grep -E "(1194|3000)" >> $REPORT_FILE
ip addr show >> $REPORT_FILE
ip route >> $REPORT_FILE
echo "" >> $REPORT_FILE

echo "=== Статус сертификатов ===" >> $REPORT_FILE
ls -la easy-rsa/pki/ >> $REPORT_FILE
openssl x509 -in easy-rsa/pki/ca.crt -subject -dates -noout >> $REPORT_FILE 2>/dev/null
echo "" >> $REPORT_FILE

echo "=== Недавние логи ===" >> $REPORT_FILE
echo "--- Лог приложения ---" >> $REPORT_FILE
tail -50 logs/application-$(date +%Y-%m-%d).log >> $REPORT_FILE 2>/dev/null
echo "--- Лог ошибок ---" >> $REPORT_FILE
tail -50 logs/error-$(date +%Y-%m-%d).log >> $REPORT_FILE 2>/dev/null
echo "--- Лог безопасности ---" >> $REPORT_FILE
tail -50 logs/security-$(date +%Y-%m-%d).log >> $REPORT_FILE 2>/dev/null
echo "" >> $REPORT_FILE

echo "=== Конфигурация (Очищенная) ===" >> $REPORT_FILE
cat .env | grep -v -E "(PASSWORD|SECRET|KEY)" >> $REPORT_FILE 2>/dev/null
echo "" >> $REPORT_FILE

echo "Диагностический отчет создан: $REPORT_FILE"
```

### Скрипт быстрой проверки состояния

```bash
#!/bin/bash
# Быстрая проверка состояния системы

echo "🔍 Проверка состояния Family VPN Server"
echo "======================================="

# Проверка, запущен ли сервер
if pgrep -f "node.*server.js" > /dev/null; then
    echo "✅ Node.js сервер запущен"
else
    echo "❌ Node.js сервер не запущен"
fi

# Проверка, запущен ли OpenVPN
if pgrep openvpn > /dev/null; then
    echo "✅ OpenVPN сервер запущен"
else
    echo "❌ OpenVPN сервер не запущен"
fi

# Проверка веб-интерфейса
if curl -s http://localhost:3000 > /dev/null; then
    echo "✅ Веб-интерфейс доступен"
else
    echo "❌ Веб-интерфейс недоступен"
fi

# Проверка файлов сертификатов
if [ -f "easy-rsa/pki/ca.crt" ]; then
    echo "✅ CA сертификат существует"
else
    echo "❌ CA сертификат отсутствует"
fi

# Проверка дискового пространства
DISK_USAGE=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ $DISK_USAGE -lt 90 ]; then
    echo "✅ Дисковое пространство в порядке ($DISK_USAGE% использовано)"
else
    echo "⚠️  Мало дискового пространства ($DISK_USAGE% использовано)"
fi

# Проверка использования памяти
MEM_USAGE=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
if [ $MEM_USAGE -lt 90 ]; then
    echo "✅ Использование памяти в порядке ($MEM_USAGE% использовано)"
else
    echo "⚠️  Высокое использование памяти ($MEM_USAGE% использовано)"
fi

echo ""
echo "Запустите 'npm test' для подробной диагностики"
```

## Удаленная диагностика

### SSH диагностика

```bash
# Подключение и запуск диагностики удаленно
ssh user@vpn-server "cd /path/to/vpn && npm test"

# Копирование логов для анализа
scp user@vpn-server:/path/to/vpn/logs/*.log ./remote-logs/

# Запуск удаленной проверки состояния
ssh user@vpn-server "cd /path/to/vpn && ./health-check.sh"
```

### Docker диагностика

```bash
# Проверка статуса контейнера
docker ps
docker stats

# Просмотр логов контейнера
docker logs family-vpn-server
docker logs -f family-vpn-server

# Выполнение команд в контейнере
docker exec -it family-vpn-server bash
docker exec family-vpn-server npm test

# Проверка ресурсов контейнера
docker exec family-vpn-server df -h
docker exec family-vpn-server free -h
```

## Чек-лист устранения неполадок

При диагностике проблем следуйте этому систематическому подходу:

### Первоначальная оценка
- [ ] Запустите `npm test` для общей проверки состояния
- [ ] Проверьте недавние логи на сообщения об ошибках
- [ ] Убедитесь, что все необходимые процессы запущены
- [ ] Проверьте системные ресурсы (CPU, память, диск)

### Сетевые проблемы
- [ ] Протестируйте базовое подключение (ping, DNS)
- [ ] Проверьте доступность портов и правила брандмауэра
- [ ] Убедитесь в правильности конфигурации сетевого интерфейса
- [ ] Протестируйте специфичную для VPN сеть

### Проблемы с сертификатами
- [ ] Проверьте структуру каталога PKI и права доступа
- [ ] Убедитесь в действительности и сроке действия сертификатов
- [ ] Протестируйте валидацию цепочки сертификатов
- [ ] Проверьте несоответствия сертификат/ключ

### Проблемы производительности
- [ ] Мониторьте системные ресурсы во время работы
- [ ] Проверьте утечки памяти или высокое использование CPU
- [ ] Анализируйте пропускную способность сети и задержки
- [ ] Просмотрите файлы логов на предупреждения о производительности

### Проблемы безопасности
- [ ] Проверьте логи безопасности на подозрительную активность
- [ ] Убедитесь в правильности конфигурации аутентификации
- [ ] Проверьте права доступа к файлам и владельцев
- [ ] Просмотрите недавние изменения конфигурации

Не забывайте документировать свои находки и создавать диагностические отчеты при обращении за помощью или эскалации проблем.