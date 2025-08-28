# Оптимизация производительности

Это руководство охватывает проблемы производительности, методы оптимизации и мониторинг для Family VPN Server.

## Проблемы производительности

### Медленное VPN соединение

**Симптомы:**
- Низкая скорость передачи данных
- Высокие задержки/время пинга
- Таймауты соединения
- Медленный веб-серфинг через VPN

**Диагностические шаги:**

```bash
# Тестирование скорости соединения без VPN
speedtest-cli  # если доступен
curl -o /dev/null -s -w "%{speed_download}\n" http://speedtest.wdc01.softlayer.com/downloads/test100.zip

# Тестирование производительности VPN интерфейса
iperf3 -s  # на сервере
iperf3 -c server-ip  # на клиенте

# Проверка статистики сетевого интерфейса
ip -s link show tun0
cat /proc/net/dev | grep tun0
```

**Решения:**

```bash
# 1. Оптимизация конфигурации OpenVPN
# Добавить в openvpn.conf:
echo "sndbuf 0" >> certificates/openvpn.conf
echo "rcvbuf 0" >> certificates/openvpn.conf
echo "fast-io" >> certificates/openvpn.conf
echo "comp-lzo adaptive" >> certificates/openvpn.conf

# 2. Настройка размера MTU
# Тестирование оптимального MTU
ping -M do -s 1472 8.8.8.8  # Начните с 1472, уменьшайте при фрагментации
# Добавить в конфигурацию:
echo "tun-mtu 1500" >> certificates/openvpn.conf
echo "mssfix 1460" >> certificates/openvpn.conf

# 3. Использование протокола UDP (по умолчанию, но проверьте)
grep "proto udp" certificates/openvpn.conf

# 4. Оптимизация выбора шифра
echo "cipher AES-256-GCM" >> certificates/openvpn.conf
echo "auth SHA256" >> certificates/openvpn.conf

# Перезапуск OpenVPN после изменений
sudo systemctl restart openvpn@server
```

### Высокое использование CPU

**Симптомы:**
- Система становится неотзывчивой
- Высокие средние нагрузки
- Медленный отклик приложения

**Диагностические шаги:**

```bash
# Мониторинг использования CPU
top -p $(pgrep -f "node.*server.js")
htop  # если доступен

# Проверка загрузки системы
uptime
cat /proc/loadavg

# Мониторинг процесса OpenVPN
top -p $(pgrep openvpn)

# Проверка CPU-интенсивных процессов
ps aux --sort=-%cpu | head -10
```

**Решения:**

```bash
# 1. Оптимизация производительности Node.js
# Установка NODE_ENV для продакшена
echo "NODE_ENV=production" >> .env

# 2. Ограничение одновременных соединений
# Добавить в openvpn.conf:
echo "max-clients 10" >> certificates/openvpn.conf

# 3. Использование аппаратного ускорения, если доступно
# Проверка поддержки AES-NI
grep -m1 -o aes /proc/cpuinfo
# Если доступно, используйте шифр AES-256-GCM (уже оптимизирован)

# 4. Настройка приоритета процесса
# Понижение приоритета для некритичных процессов
renice +5 $(pgrep -f "node.*server.js")

# 5. Мониторинг и ограничение использования ресурсов
# Использование systemd для ограничения ресурсов (если используется systemd)
sudo systemctl edit openvpn@server
# Добавить:
# [Service]
# CPUQuota=50%
# MemoryLimit=512M
```

### Проблемы с памятью

**Симптомы:**
- Ошибки нехватки памяти
- Система использует swap
- Сбои приложения

**Диагностические шаги:**

```bash
# Проверка использования памяти
free -h
cat /proc/meminfo

# Мониторинг конкретных процессов
ps aux --sort=-%mem | head -10
pmap $(pgrep -f "node.*server.js")

# Проверка утечек памяти
valgrind --tool=memcheck --leak-check=full node server.js  # для отладки

# Мониторинг использования swap
swapon -s
cat /proc/swaps
```

**Решения:**

```bash
# 1. Оптимизация использования памяти Node.js
# Установка лимитов памяти
node --max-old-space-size=512 server.js

# 2. Регулярная очистка файлов логов
# Добавить в crontab
echo "0 2 * * * find /path/to/vpn/logs -name '*.log' -mtime +30 -delete" | crontab -

# 3. Оптимизация использования памяти OpenVPN
# Добавить в openvpn.conf:
echo "mlock" >> certificates/openvpn.conf  # Блокировка страниц памяти

# 4. Добавление swap при необходимости (временное решение)
sudo fallocate -l 1G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# 5. Мониторинг использования памяти
# Добавление скрипта мониторинга
cat > memory-monitor.sh << 'EOF'
#!/bin/bash
THRESHOLD=80
USAGE=$(free | awk 'FNR==2{printf "%.0f", $3/($3+$4)*100}')
if [ $USAGE -gt $THRESHOLD ]; then
    echo "Высокое использование памяти: $USAGE%" | logger -t vpn-monitor
    # Опционально: перезапуск сервисов при критическом состоянии
fi
EOF
chmod +x memory-monitor.sh
```

### Проблемы производительности сети

**Симптомы:**
- Потеря пакетов
- Высокие сетевые задержки
- Разрывы соединения

**Диагностические шаги:**

```bash
# Тестирование сетевого подключения
ping -c 100 8.8.8.8 | tail -5  # Проверка потери пакетов
mtr google.com  # Анализ сетевого пути

# Проверка ошибок сетевого интерфейса
ip -s link show
netstat -i

# Мониторинг сетевого трафика
iftop  # если доступен
nethogs  # если доступен
ss -i  # Статистика сокетов

# Проверка производительности брандмауэра
iptables -L -n -v  # Проверка счетчиков попаданий в правила
```

**Решения:**

```bash
# 1. Оптимизация размеров сетевых буферов
# Системная оптимизация сети
echo 'net.core.rmem_max = 16777216' >> /etc/sysctl.conf
echo 'net.core.wmem_max = 16777216' >> /etc/sysctl.conf
echo 'net.ipv4.tcp_rmem = 4096 87380 16777216' >> /etc/sysctl.conf
echo 'net.ipv4.tcp_wmem = 4096 65536 16777216' >> /etc/sysctl.conf
sysctl -p

# 2. Оптимизация буферов OpenVPN
echo "sndbuf 393216" >> certificates/openvpn.conf
echo "rcvbuf 393216" >> certificates/openvpn.conf

# 3. Снижение нагрузки на брандмауэр
# Оптимизация правил iptables (перемещение наиболее частых правил наверх)
npm run firewall:optimize

# 4. Использование оптимизации отслеживания соединений
echo 'net.netfilter.nf_conntrack_max = 65536' >> /etc/sysctl.conf
sysctl -p
```

## Мониторинг производительности

### Настройка системного мониторинга

```bash
# Установка инструментов мониторинга (Ubuntu/Debian)
sudo apt-get install htop iotop iftop nethogs sysstat

# Установка инструментов мониторинга (CentOS/RHEL)
sudo yum install htop iotop iftop nethogs sysstat

# Включение сбора системной статистики
sudo systemctl enable sysstat
sudo systemctl start sysstat
```

### Скрипт мониторинга производительности

```bash
#!/bin/bash
# performance-monitor.sh - Непрерывный мониторинг производительности

LOG_FILE="performance-$(date +%Y%m%d).log"

while true; do
    echo "=== $(date) ===" >> $LOG_FILE
    
    # Использование CPU
    echo "Использование CPU:" >> $LOG_FILE
    top -bn1 | grep "Cpu(s)" >> $LOG_FILE
    
    # Использование памяти
    echo "Использование памяти:" >> $LOG_FILE
    free -h >> $LOG_FILE
    
    # Сетевая статистика
    echo "Сетевая статистика:" >> $LOG_FILE
    ip -s link show tun0 >> $LOG_FILE 2>/dev/null
    
    # VPN соединения
    echo "Активные соединения:" >> $LOG_FILE
    ss -tuln | grep -E "(1194|3000)" >> $LOG_FILE
    
    # Информация о процессах
    echo "VPN процессы:" >> $LOG_FILE
    ps aux | grep -E "(node|openvpn)" | grep -v grep >> $LOG_FILE
    
    echo "" >> $LOG_FILE
    
    sleep 300  # Мониторинг каждые 5 минут
done
```

### Панель производительности в реальном времени

```bash
#!/bin/bash
# performance-dashboard.sh - Отображение производительности в реальном времени

while true; do
    clear
    echo "🖥️  Панель производительности Family VPN Server"
    echo "=============================================="
    echo "Последнее обновление: $(date)"
    echo ""
    
    # Загрузка системы
    echo "📊 Загрузка системы:"
    uptime
    echo ""
    
    # Использование CPU
    echo "🔥 Использование CPU:"
    top -bn1 | grep "Cpu(s)" | awk '{print $2}' | sed 's/%us,//'
    echo ""
    
    # Использование памяти
    echo "💾 Использование памяти:"
    free -h | grep "Mem:"
    echo ""
    
    # Использование диска
    echo "💿 Использование диска:"
    df -h / | tail -1
    echo ""
    
    # Сетевые интерфейсы
    echo "🌐 Сетевые интерфейсы:"
    ip addr show | grep -E "(inet |UP|DOWN)" | grep -v "127.0.0.1"
    echo ""
    
    # Активные VPN соединения
    echo "🔗 VPN соединения:"
    if [ -f "/var/log/openvpn/server.log" ]; then
        grep "CLIENT_LIST" /var/log/openvpn/server.log | tail -5
    else
        echo "Лог OpenVPN не найден"
    fi
    echo ""
    
    # Статус сервисов
    echo "⚙️  Статус сервисов:"
    if pgrep -f "node.*server.js" > /dev/null; then
        echo "✅ Веб-сервер: Запущен"
    else
        echo "❌ Веб-сервер: Остановлен"
    fi
    
    if pgrep openvpn > /dev/null; then
        echo "✅ OpenVPN: Запущен"
    else
        echo "❌ OpenVPN: Остановлен"
    fi
    
    sleep 5
done
```

## Чек-лист оптимизации производительности

### Оптимизации на уровне системы

- [ ] **Оптимизация CPU**
  - [ ] Включить аппаратное ускорение (AES-NI)
  - [ ] Оптимизировать приоритеты процессов
  - [ ] Использовать эффективные шифры (AES-256-GCM)
  - [ ] Ограничить одновременные соединения

- [ ] **Оптимизация памяти**
  - [ ] Установить подходящие лимиты памяти Node.js
  - [ ] Настроить swap при необходимости
  - [ ] Регулярно очищать файлы логов
  - [ ] Мониторить утечки памяти

- [ ] **Оптимизация сети**
  - [ ] Оптимизировать размеры буферов
  - [ ] Настроить оптимальный MTU
  - [ ] Использовать протокол UDP
  - [ ] Оптимизировать правила брандмауэра

- [ ] **Оптимизация хранилища**
  - [ ] Использовать SSD хранилище, если возможно
  - [ ] Регулярная ротация логов
  - [ ] Мониторить дисковое пространство
  - [ ] Оптимизировать права доступа к файлам

### Оптимизации на уровне приложения

- [ ] **Оптимизации Node.js**
  - [ ] Установить NODE_ENV=production
  - [ ] Использовать кластеризацию при необходимости
  - [ ] Оптимизировать запросы к базе данных
  - [ ] Реализовать кэширование

- [ ] **Оптимизации OpenVPN**
  - [ ] Использовать оптимальный набор шифров
  - [ ] Настроить сжатие
  - [ ] Оптимизировать размеры буферов
  - [ ] Использовать режим fast-io

- [ ] **Оптимизации веб-интерфейса**
  - [ ] Минимизировать HTTP запросы
  - [ ] Сжимать статические ресурсы
  - [ ] Использовать кэширование браузера
  - [ ] Оптимизировать изображения

### Мониторинг и оповещения

- [ ] **Мониторинг производительности**
  - [ ] Настроить системный мониторинг
  - [ ] Мониторить ключевые метрики
  - [ ] Создать базовые показатели производительности
  - [ ] Настроить пороги оповещений

- [ ] **Управление логами**
  - [ ] Реализовать ротацию логов
  - [ ] Мониторить размеры логов
  - [ ] Настроить анализ логов
  - [ ] Архивировать старые логи

## Бенчмаркинг производительности

### Тест базовой производительности

```bash
#!/bin/bash
# baseline-test.sh - Установление базовой производительности

echo "🧪 Тест базовой производительности Family VPN Server"
echo "=================================================="

# Системная информация
echo "Системная информация:"
uname -a
cat /proc/cpuinfo | grep "model name" | head -1
free -h | grep "Mem:"
df -h / | tail -1
echo ""

# Сетевая базовая линия (без VPN)
echo "Сетевая базовая линия (без VPN):"
ping -c 10 8.8.8.8 | tail -1
echo ""

# Запуск сервисов, если не запущены
if ! pgrep -f "node.*server.js" > /dev/null; then
    npm start &
    sleep 5
fi

# Время отклика веб-интерфейса
echo "Производительность веб-интерфейса:"
time curl -s http://localhost:3000 > /dev/null
echo ""

# Производительность генерации сертификатов
echo "Производительность генерации сертификатов:"
time npm run generate-client test-perf-client > /dev/null 2>&1
echo ""

# Время отклика API
echo "Производительность API:"
time curl -s -X POST http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username":"test","password":"test"}' > /dev/null
echo ""

echo "Базовый тест завершен"
echo "Сохраните эти результаты для сравнения"
```

### Нагрузочное тестирование

```bash
#!/bin/bash
# load-test.sh - Простое нагрузочное тестирование

echo "🔥 Нагрузочное тестирование Family VPN Server"
echo "============================================="

# Тестирование одновременных соединений к веб-интерфейсу
echo "Тестирование одновременных веб-соединений..."
for i in {1..10}; do
    curl -s http://localhost:3000 > /dev/null &
done
wait

# Тестирование нагрузки API
echo "Тестирование нагрузки API..."
for i in {1..20}; do
    curl -s -X GET http://localhost:3000/api/status > /dev/null &
done
wait

echo "Нагрузочное тестирование завершено"
echo "Проверьте системные ресурсы во время теста"
```

Помните, что нужно устанавливать базовые показатели производительности, когда система работает оптимально, и регулярно сравнивать текущую производительность с этими базовыми показателями для раннего обнаружения деградации.