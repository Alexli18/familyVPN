# Устранение неполадок Linux

Это руководство охватывает специфичные для Linux проблемы и решения для Family VPN Server.

## Проблемы, специфичные для дистрибутивов

### Проблемы Ubuntu/Debian

**Управление пакетами:**

```bash
# Обновление списков пакетов
sudo apt update

# Установка недостающих зависимостей
sudo apt install -y openvpn easy-rsa nodejs npm

# Исправление сломанных пакетов
sudo apt --fix-broken install

# Проверка заблокированных пакетов
apt-mark showhold
```

**Управление сервисами:**

```bash
# Проверка статуса сервиса OpenVPN
sudo systemctl status openvpn@server

# Включение сервиса OpenVPN
sudo systemctl enable openvpn@server

# Проверка логов сервиса
sudo journalctl -u openvpn@server -f

# Перезапуск сети
sudo systemctl restart networking
```

### Проблемы CentOS/RHEL/Fedora

**Управление пакетами:**

```bash
# Установка репозитория EPEL (CentOS/RHEL)
sudo yum install -y epel-release

# Установка зависимостей
sudo yum install -y openvpn easy-rsa nodejs npm

# Или для новых версий:
sudo dnf install -y openvpn easy-rsa nodejs npm

# Проверка конфликтов пакетов
sudo yum check
```

**Конфигурация брандмауэра:**

```bash
# Проверка статуса firewalld
sudo firewall-cmd --state

# Открытие портов VPN
sudo firewall-cmd --permanent --add-port=1194/udp
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --reload

# Проверка активных зон
sudo firewall-cmd --get-active-zones

# Список всех правил
sudo firewall-cmd --list-all
```

### Проблемы Arch Linux

**Управление пакетами:**

```bash
# Обновление системы
sudo pacman -Syu

# Установка зависимостей
sudo pacman -S openvpn easy-rsa nodejs npm

# Установка из AUR (при необходимости)
yay -S easy-rsa-git  # если используется yay
```

## Проблемы сетевой конфигурации

### IP Forwarding

**Симптомы:**
- VPN клиенты могут подключиться, но не могут получить доступ к интернету
- Отсутствует маршрутизация трафика через VPN

**Решения:**

```bash
# Проверка текущего статуса IP forwarding
cat /proc/sys/net/ipv4/ip_forward
sysctl net.ipv4.ip_forward

# Временное включение IP forwarding
sudo sysctl -w net.ipv4.ip_forward=1

# Постоянное включение IP forwarding
echo 'net.ipv4.ip_forward=1' | sudo tee -a /etc/sysctl.conf
sudo sysctl -p

# Проверка изменения
sysctl net.ipv4.ip_forward
```

### Конфигурация брандмауэра

**Проблемы iptables:**

```bash
# Проверка текущих правил iptables
sudo iptables -L -n -v
sudo iptables -t nat -L -n -v

# Сохранение текущих правил (Ubuntu/Debian)
sudo iptables-save > /tmp/iptables-backup.rules

# Восстановление правил (Ubuntu/Debian)
sudo iptables-restore < /tmp/iptables-backup.rules

# Сделать правила постоянными (Ubuntu/Debian)
sudo apt install iptables-persistent
sudo netfilter-persistent save

# Сделать правила постоянными (CentOS/RHEL)
sudo service iptables save
```

**Проблемы UFW (Ubuntu):**

```bash
# Проверка статуса UFW
sudo ufw status verbose

# Включение UFW
sudo ufw enable

# Разрешение VPN трафика
sudo ufw allow 1194/udp
sudo ufw allow 3000/tcp

# Разрешение пересылки
sudo ufw route allow in on tun0 out on eth0
sudo ufw route allow in on eth0 out on tun0

# Редактирование конфигурации UFW для NAT
sudo nano /etc/ufw/before.rules
# Добавить перед *filter:
# *nat
# :POSTROUTING ACCEPT [0:0]
# -A POSTROUTING -s 10.8.0.0/24 -o eth0 -j MASQUERADE
# COMMIT
```

### Проблемы сетевого интерфейса

**Проблемы TUN интерфейса:**

```bash
# Проверка загрузки модуля TUN
lsmod | grep tun

# Загрузка модуля TUN
sudo modprobe tun

# Автозагрузка модуля TUN при старте
echo 'tun' | sudo tee -a /etc/modules

# Проверка прав доступа к устройству TUN
ls -la /dev/net/tun
# Должно показать: crw-rw-rw- 1 root root 10, 200

# Создание устройства TUN, если отсутствует
sudo mkdir -p /dev/net
sudo mknod /dev/net/tun c 10 200
sudo chmod 666 /dev/net/tun
```

**Конфликты NetworkManager:**

```bash
# Проверка статуса NetworkManager
sudo systemctl status NetworkManager

# Исключение VPN интерфейса из NetworkManager
sudo nano /etc/NetworkManager/NetworkManager.conf
# Добавить под [main]:
# plugins=keyfile
# [keyfile]
# unmanaged-devices=interface-name:tun0

# Перезапуск NetworkManager
sudo systemctl restart NetworkManager
```

## Проблемы системных сервисов

### Проблемы сервисов systemd

**Конфигурация сервиса:**

```bash
# Создание systemd сервиса для VPN сервера
sudo nano /etc/systemd/system/family-vpn.service

# Содержимое файла сервиса:
[Unit]
Description=Family VPN Server
After=network.target

[Service]
Type=simple
User=vpn-user
WorkingDirectory=/path/to/vpn/server
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target

# Перезагрузка systemd и включение сервиса
sudo systemctl daemon-reload
sudo systemctl enable family-vpn
sudo systemctl start family-vpn
```

**Отладка сервиса:**

```bash
# Проверка статуса сервиса
sudo systemctl status family-vpn

# Просмотр логов сервиса
sudo journalctl -u family-vpn -f

# Проверка зависимостей сервиса
systemctl list-dependencies family-vpn

# Отладка запуска сервиса
sudo systemctl --debug start family-vpn
```

### Проблемы сервиса OpenVPN

**Проблемы конфигурации:**

```bash
# Тестирование конфигурации OpenVPN
sudo openvpn --config /etc/openvpn/server.conf --test-crypto

# Проверка логов OpenVPN
sudo tail -f /var/log/openvpn/server.log

# Ручной запуск OpenVPN для отладки
sudo openvpn --config /etc/openvpn/server.conf --verb 6

# Проверка статуса сервиса OpenVPN
sudo systemctl status openvpn@server
```

## Файловая система и права доступа

### Проблемы прав доступа

**Права доступа к файлам сертификатов:**

```bash
# Проверка текущих прав доступа
ls -la easy-rsa/pki/private/
ls -la certificates/

# Исправление прав доступа PKI
sudo chown -R $USER:$USER easy-rsa/
chmod -R 755 easy-rsa/
chmod 600 easy-rsa/pki/private/*
chmod 644 easy-rsa/pki/*.crt

# Исправление прав доступа к сертификатам
sudo chown -R $USER:$USER certificates/
chmod 755 certificates/
chmod 644 certificates/*.crt certificates/*.conf
chmod 600 certificates/*.key
```

**Проблемы SELinux (CentOS/RHEL/Fedora):**

```bash
# Проверка статуса SELinux
getenforce
sestatus

# Проверка контекстов SELinux
ls -Z easy-rsa/pki/
ls -Z certificates/

# Установка правильных контекстов SELinux
sudo setsebool -P openvpn_can_network_connect 1
sudo setsebool -P openvpn_run_unconfined 1

# Восстановление контекстов по умолчанию
sudo restorecon -R easy-rsa/
sudo restorecon -R certificates/

# Создание пользовательской политики SELinux при необходимости
sudo audit2allow -a -M vpn-server
sudo semodule -i vpn-server.pp

# Временное отключение SELinux для тестирования
sudo setenforce 0
# Повторное включение после тестирования
sudo setenforce 1
```

### Проблемы дискового пространства

**Управление файлами логов:**

```bash
# Проверка использования диска
df -h
du -sh logs/

# Очистка старых логов
find logs/ -name "*.log" -mtime +30 -delete

# Настройка ротации логов
sudo nano /etc/logrotate.d/family-vpn

# Конфигурация logrotate:
/path/to/vpn/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    copytruncate
}

# Тестирование ротации логов
sudo logrotate -d /etc/logrotate.d/family-vpn
```

## Управление процессами и ресурсами

### Проблемы памяти

**Проблемы нехватки памяти:**

```bash
# Проверка использования памяти
free -h
cat /proc/meminfo

# Проверка процессов, потребляющих много памяти
ps aux --sort=-%mem | head -10

# Проверка утечек памяти
valgrind --tool=memcheck --leak-check=full node server.js

# Добавление swap пространства при необходимости
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Сделать swap постоянным
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### Проблемы CPU

**Высокое использование CPU:**

```bash
# Мониторинг использования CPU
top
htop  # если доступен

# Проверка CPU-интенсивных процессов
ps aux --sort=-%cpu | head -10

# Мониторинг загрузки системы
uptime
cat /proc/loadavg

# Проверка неконтролируемых процессов
ps aux | grep -E "(node|openvpn)" | grep -v grep

# Ограничение использования CPU процессом
cpulimit -p $(pgrep -f "node.*server.js") -l 50
```

## Проблемы безопасности

### Управление пользователями и группами

**Настройка пользователя сервиса:**

```bash
# Создание выделенного пользователя VPN
sudo useradd -r -s /bin/false vpn-user
sudo usermod -a -G vpn-user $USER

# Настройка правильного владения
sudo chown -R vpn-user:vpn-user /path/to/vpn/
sudo chmod -R 755 /path/to/vpn/
sudo chmod 600 /path/to/vpn/easy-rsa/pki/private/*
```

### SSH и удаленный доступ

**Конфигурация SSH для управления VPN:**

```bash
# Безопасная конфигурация SSH
sudo nano /etc/ssh/sshd_config

# Рекомендуемые настройки:
# Port 2222  # Изменить порт по умолчанию
# PermitRootLogin no
# PasswordAuthentication no
# PubkeyAuthentication yes
# AllowUsers vpn-admin

# Перезапуск сервиса SSH
sudo systemctl restart sshd

# Настройка аутентификации по SSH ключу
ssh-keygen -t rsa -b 4096 -C "vpn-admin@server"
ssh-copy-id -p 2222 vpn-admin@server-ip
```

## Мониторинг и логирование

### Настройка системного мониторинга

**Установка инструментов мониторинга:**

```bash
# Ubuntu/Debian
sudo apt install -y htop iotop iftop nethogs sysstat

# CentOS/RHEL
sudo yum install -y htop iotop iftop nethogs sysstat

# Включение системной статистики
sudo systemctl enable sysstat
sudo systemctl start sysstat
```

**Мониторинг логов:**

```bash
# Мониторинг системных логов
sudo tail -f /var/log/syslog  # Ubuntu/Debian
sudo tail -f /var/log/messages  # CentOS/RHEL

# Мониторинг логов аутентификации
sudo tail -f /var/log/auth.log  # Ubuntu/Debian
sudo tail -f /var/log/secure  # CentOS/RHEL

# Мониторинг сообщений ядра
dmesg -w
```

## Чек-лист устранения неполадок Linux

### Проверка состояния системы
- [ ] Проверить системные ресурсы: `free -h`, `df -h`, `uptime`
- [ ] Проверить сервисы: `systemctl status family-vpn openvpn@server`
- [ ] Проверить сеть: `ip addr show`, `ip route`
- [ ] Просмотреть логи: `journalctl -xe`, `tail -f /var/log/syslog`

### Сетевая конфигурация
- [ ] Проверить IP forwarding: `sysctl net.ipv4.ip_forward`
- [ ] Проверить правила брандмауэра: `iptables -L -n`, `ufw status`
- [ ] Протестировать TUN интерфейс: `ls -la /dev/net/tun`
- [ ] Проверить маршрутизацию: `ip route show`

### Права доступа к файлам
- [ ] Проверить права доступа PKI: `ls -la easy-rsa/pki/private/`
- [ ] Проверить владение сертификатами: `ls -la certificates/`
- [ ] Проверить контексты SELinux: `ls -Z` (если применимо)
- [ ] Протестировать доступ к файлам: `sudo -u vpn-user ls certificates/`

### Конфигурация сервиса
- [ ] Проверить конфигурацию OpenVPN: `openvpn --test-crypto`
- [ ] Проверить сервисы systemd: `systemctl list-failed`
- [ ] Проверить переменные окружения: `systemctl show-environment`
- [ ] Протестировать запуск сервиса: `systemctl --debug start family-vpn`

### Проверка безопасности
- [ ] Проверить запущенные процессы: `ps aux | grep -E "(node|openvpn)"`
- [ ] Проверить права пользователя: `id vpn-user`
- [ ] Проверить конфигурацию SSH: `sshd -T`
- [ ] Просмотреть логи безопасности: `grep -i failed /var/log/auth.log`

Помните, что всегда нужно проверять документацию, специфичную для дистрибутива, и учитывать соглашения конкретного дистрибутива Linux при устранении неполадок.