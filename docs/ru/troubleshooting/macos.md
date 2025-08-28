# Устранение неполадок macOS

Это руководство охватывает специфичные для macOS проблемы и решения для Family VPN Server.

## Проблемы, специфичные для macOS

### Зависимости Homebrew

**Проблемы установки:**

```bash
# Проверка установки Homebrew
brew --version

# Установка Homebrew, если отсутствует
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Обновление Homebrew
brew update

# Установка OpenVPN и зависимостей
brew install openvpn easy-rsa node

# Проверка установленных пакетов
brew list | grep -E "(openvpn|easy-rsa|node)"

# Исправление сломанных установок
brew doctor
brew cleanup
```

**Проблемы PATH:**

```bash
# Проверка конфигурации PATH
echo $PATH

# Добавление Homebrew в PATH (если отсутствует)
echo 'export PATH="/opt/homebrew/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc

# Для Intel Mac:
echo 'export PATH="/usr/local/bin:$PATH"' >> ~/.zshrc

# Проверка расположения OpenVPN
which openvpn
ls -la $(which openvpn)
```

### System Integrity Protection (SIP)

**Проблемы TUN/TAP интерфейса:**

```bash
# Проверка статуса SIP
csrutil status

# Установка драйвера TUN/TAP (при необходимости)
# Скачать с: https://tunnelblick.net/tun-tap.html
# Или использовать Homebrew:
brew install --cask tuntap

# Проверка устройства TUN
ls -la /dev/tun*

# Проверка расширений ядра
kextstat | grep tun
```

**Проблемы прав доступа с SIP:**

```bash
# Проверка статуса системных расширений
systemextensionsctl list

# Для новых версий macOS используйте системные расширения
# Установите Tunnelblick для поддержки TUN/TAP
brew install --cask tunnelblick

# Альтернатива: Использование встроенного VPN клиента
# Настройте как IKEv2 или L2TP вместо OpenVPN
```

### Сетевая конфигурация

**Управление сетевыми интерфейсами:**

```bash
# Список сетевых интерфейсов
ifconfig
networksetup -listallhardwareports

# Проверка таблицы маршрутизации
netstat -rn
route -n get default

# Проверка конфигурации DNS
scutil --dns
cat /etc/resolv.conf

# Очистка кэша DNS
sudo dscacheutil -flushcache
sudo killall -HUP mDNSResponder
```

**Конфигурация брандмауэра:**

```bash
# Проверка статуса брандмауэра macOS
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate

# Включение брандмауэра
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --setglobalstate on

# Разрешение Node.js через брандмауэр
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add /usr/local/bin/node
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --unblockapp /usr/local/bin/node

# Проверка правил pfctl (продвинутый уровень)
sudo pfctl -sr
sudo pfctl -sn
```

## Управление сервисами

### LaunchDaemons и LaunchAgents

**Создание Launch Daemon для VPN сервера:**

```bash
# Создание plist файла launch daemon
sudo nano /Library/LaunchDaemons/com.family.vpn.plist

# Содержимое plist:
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.family.vpn</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/node</string>
        <string>/path/to/vpn/server.js</string>
    </array>
    <key>WorkingDirectory</key>
    <string>/path/to/vpn</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/path/to/vpn/logs/stdout.log</string>
    <key>StandardErrorPath</key>
    <string>/path/to/vpn/logs/stderr.log</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>NODE_ENV</key>
        <string>production</string>
    </dict>
</dict>
</plist>

# Загрузка демона
sudo launchctl load /Library/LaunchDaemons/com.family.vpn.plist

# Запуск сервиса
sudo launchctl start com.family.vpn

# Проверка статуса сервиса
sudo launchctl list | grep com.family.vpn
```

**Управление сервисом OpenVPN:**

```bash
# Создание launch daemon для OpenVPN
sudo nano /Library/LaunchDaemons/org.openvpn.server.plist

# Загрузка сервиса OpenVPN
sudo launchctl load /Library/LaunchDaemons/org.openvpn.server.plist

# Проверка статуса OpenVPN
sudo launchctl list | grep openvpn

# Просмотр логов сервиса
tail -f /var/log/openvpn.log
```

### Управление процессами

**Управление фоновыми процессами:**

```bash
# Поиск VPN-связанных процессов
ps aux | grep -E "(node|openvpn)" | grep -v grep

# Корректное завершение процессов
pkill -TERM -f "node.*server.js"
sudo pkill -TERM openvpn

# Принудительное завершение при необходимости
pkill -KILL -f "node.*server.js"
sudo pkill -KILL openvpn

# Мониторинг ресурсов процесса
top -pid $(pgrep -f "node.*server.js")
```

## Файловая система и права доступа

### Права доступа к файлам macOS

**Права доступа к файлам сертификатов:**

```bash
# Проверка прав доступа к файлам
ls -la@ easy-rsa/pki/private/
ls -la@ certificates/

# Удаление расширенных атрибутов при наличии
xattr -c easy-rsa/pki/private/*
xattr -c certificates/*

# Установка правильных прав доступа
chmod 700 easy-rsa/pki/private/
chmod 600 easy-rsa/pki/private/*
chmod 644 easy-rsa/pki/*.crt
chmod 644 certificates/*.crt certificates/*.conf
chmod 600 certificates/*.key

# Проверка атрибутов карантина
xattr -l certificates/*
# Удаление карантина при наличии
xattr -d com.apple.quarantine certificates/*
```

**Проблемы Gatekeeper:**

```bash
# Проверка статуса Gatekeeper
spctl --status

# Разрешение неподписанных приложений (временно)
sudo spctl --master-disable

# Повторное включение Gatekeeper
sudo spctl --master-enable

# Разрешение конкретного приложения
sudo spctl --add /usr/local/bin/node
sudo spctl --enable /usr/local/bin/node
```

### Управление Keychain и сертификатами

**Интеграция с системным Keychain:**

```bash
# Импорт CA сертификата в системный keychain
sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain easy-rsa/pki/ca.crt

# Список сертификатов в keychain
security find-certificate -a -p /Library/Keychains/System.keychain | grep -B1 -A1 "Family VPN"

# Удаление сертификата из keychain
sudo security delete-certificate -c "Family VPN CA" /Library/Keychains/System.keychain
```

## Устранение сетевых неполадок

### Проблемы сетевого подключения

**Проблемы разрешения DNS:**

```bash
# Проверка DNS серверов
scutil --dns | grep nameserver

# Тестирование разрешения DNS
nslookup google.com
dig google.com

# Проверка mDNS разрешения
dns-sd -q google.com

# Сброс сетевой конфигурации
sudo dscacheutil -flushcache
sudo killall -HUP mDNSResponder
sudo networksetup -setdnsservers "Wi-Fi" 8.8.8.8 8.8.4.4
```

**Проблемы маршрутизации:**

```bash
# Проверка маршрута по умолчанию
route -n get default

# Добавление статического маршрута (при необходимости)
sudo route add -net 10.8.0.0/24 -interface tun0

# Удаление маршрута
sudo route delete -net 10.8.0.0/24

# Проверка таблицы маршрутов
netstat -rn | grep tun
```

**Проблемы сетевого интерфейса:**

```bash
# Проверка сетевых интерфейсов
ifconfig -a
networksetup -listallhardwareports

# Сброс сетевого интерфейса
sudo ifconfig en0 down
sudo ifconfig en0 up

# Обновление DHCP аренды
sudo ipconfig set en0 DHCP

# Проверка порядка сетевых сервисов
networksetup -listnetworkserviceorder
```

## Безопасность и конфиденциальность

### Настройки конфиденциальности

**Разрешения сетевого доступа:**

```bash
# Проверка разрешений сетевого доступа
# Системные настройки > Безопасность и конфиденциальность > Конфиденциальность > Полный доступ к диску
# Добавьте Terminal.app и Node.js при необходимости

# Проверка разрешений доступности
# Системные настройки > Безопасность и конфиденциальность > Конфиденциальность > Доступность
```

**Конфигурация брандмауэра:**

```bash
# Включение брандмауэра приложений
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --setglobalstate on

# Установка режима скрытности брандмауэра
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --setstealthmode on

# Разрешение подписанных приложений
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --setallowsigned on

# Проверка статуса брандмауэра
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate
```

### Проблемы подписи кода

**Проблемы неподписанных бинарных файлов:**

```bash
# Проверка подписи кода
codesign -dv /usr/local/bin/node
codesign -dv /usr/local/bin/openvpn

# Подпись бинарного файла (если у вас есть сертификат разработчика)
codesign -s "Developer ID Application: Your Name" /path/to/binary

# Удаление атрибута карантина
xattr -d com.apple.quarantine /path/to/binary

# Разрешение выполнения в Gatekeeper
sudo spctl --add /path/to/binary
```

## Оптимизация производительности

### Производительность системы

**Мониторинг ресурсов:**

```bash
# Мониторинг системных ресурсов
top -o cpu
top -o mem

# Проверка активности системы
sudo fs_usage | grep -E "(node|openvpn)"
sudo dtrace -n 'syscall:::entry /execname == "node"/ { @[probefunc] = count(); }'

# Мониторинг сетевой активности
nettop -p $(pgrep -f "node.*server.js")
```

**Управление памятью:**

```bash
# Проверка давления памяти
memory_pressure

# Мониторинг использования памяти
vm_stat
sudo purge  # Освобождение неактивной памяти

# Проверка использования swap
sysctl vm.swapusage
```

### Производительность сети

**Оптимизация сети:**

```bash
# Проверка размеров сетевых буферов
sysctl net.inet.tcp.sendspace
sysctl net.inet.tcp.recvspace

# Оптимизация сетевых настроек (при необходимости)
sudo sysctl -w net.inet.tcp.sendspace=65536
sudo sysctl -w net.inet.tcp.recvspace=65536

# Сделать изменения постоянными
echo "net.inet.tcp.sendspace=65536" | sudo tee -a /etc/sysctl.conf
echo "net.inet.tcp.recvspace=65536" | sudo tee -a /etc/sysctl.conf
```

## Проблемы, специфичные для версий macOS

### macOS Big Sur и новее

**Проблемы системных расширений:**

```bash
# Проверка системных расширений
systemextensionsctl list

# Сброс системных расширений (при необходимости)
sudo systemextensionsctl reset

# Установка сетевого расширения для VPN
# Используйте Network Extension framework вместо TUN/TAP
```

### macOS Monterey и новее

**Изменения конфиденциальности сети:**

```bash
# Проверка настроек конфиденциальности сети
# Системные настройки > Безопасность и конфиденциальность > Конфиденциальность > Локальная сеть

# Разрешение сетевого доступа для приложений Node.js и OpenVPN
# Добавьте приложения в список разрешенных вручную
```

## Чек-лист устранения неполадок для macOS

### Первоначальная диагностика
- [ ] Проверить установку Homebrew: `brew --version`
- [ ] Проверить установку OpenVPN: `which openvpn`
- [ ] Проверить версию Node.js: `node --version`
- [ ] Протестировать доступность TUN/TAP: `ls -la /dev/tun*`

### Сетевая конфигурация
- [ ] Проверить сетевые интерфейсы: `ifconfig -a`
- [ ] Проверить таблицу маршрутизации: `netstat -rn`
- [ ] Протестировать разрешение DNS: `nslookup google.com`
- [ ] Проверить статус брандмауэра: `sudo /usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate`

### Управление сервисами
- [ ] Проверить запущенные процессы: `ps aux | grep -E "(node|openvpn)"`
- [ ] Проверить launch daemons: `sudo launchctl list | grep -E "(vpn|openvpn)"`
- [ ] Проверить логи сервисов: `tail -f /var/log/system.log`
- [ ] Протестировать запуск сервиса: `sudo launchctl start com.family.vpn`

### Права доступа к файлам
- [ ] Проверить права доступа к сертификатам: `ls -la@ certificates/`
- [ ] Проверить расширенные атрибуты: `xattr -l certificates/*`
- [ ] Проверить статус Gatekeeper: `spctl --status`
- [ ] Протестировать доступ к файлам: `cat certificates/ca.crt`

### Настройки безопасности
- [ ] Проверить статус SIP: `csrutil status`
- [ ] Проверить разрешения конфиденциальности: Системные настройки > Безопасность и конфиденциальность
- [ ] Проверить подписи кода: `codesign -dv /usr/local/bin/node`
- [ ] Протестировать сетевой доступ: `curl -I http://localhost:3000`

Помните, что macOS имеет более строгие политики безопасности по сравнению с Linux, поэтому многие проблемы связаны с правами доступа, подписью кода и защитой целостности системы. Всегда проверяйте Системные настройки > Безопасность и конфиденциальность при устранении проблем доступа.