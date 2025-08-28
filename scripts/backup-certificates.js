#!/usr/bin/env node

const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');

class CertificateBackupManager {
  constructor() {
    this.backupDir = path.join(process.cwd(), 'certificate-backups');
    this.pkiDir = path.join(process.cwd(), 'easy-rsa', 'pki');
    this.certDir = path.join(process.cwd(), 'test-certificates');
    this.configDir = path.join(process.cwd(), 'src');
  }

  /**
   * Создание резервной копии всех сертификатов и конфигураций
   */
  async createBackup() {
    try {
      console.log('🔄 Создание резервной копии сертификатов...');
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.join(this.backupDir, `backup-${timestamp}`);
      
      await fs.ensureDir(backupPath);
      
      // Создание манифеста резервной копии
      const manifest = {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        description: 'Резервная копия сертификатов и конфигураций VPN сервера',
        files: []
      };

      // Резервное копирование PKI директории
      if (await fs.pathExists(this.pkiDir)) {
        const pkiBackupPath = path.join(backupPath, 'pki');
        await fs.copy(this.pkiDir, pkiBackupPath);
        manifest.files.push({
          source: this.pkiDir,
          destination: 'pki',
          type: 'directory',
          description: 'PKI инфраструктура (CA, сертификаты, ключи)'
        });
        console.log('✅ PKI директория скопирована');
      }

      // Резервное копирование клиентских сертификатов
      if (await fs.pathExists(this.certDir)) {
        const certBackupPath = path.join(backupPath, 'certificates');
        await fs.copy(this.certDir, certBackupPath);
        manifest.files.push({
          source: this.certDir,
          destination: 'certificates',
          type: 'directory',
          description: 'Клиентские сертификаты и конфигурации'
        });
        console.log('✅ Клиентские сертификаты скопированы');
      }

      // Резервное копирование конфигурационных файлов
      const configFiles = ['.env', '.env.example', 'package.json'];
      for (const configFile of configFiles) {
        const sourcePath = path.join(process.cwd(), configFile);
        if (await fs.pathExists(sourcePath)) {
          const destPath = path.join(backupPath, 'config', configFile);
          await fs.ensureDir(path.dirname(destPath));
          await fs.copy(sourcePath, destPath);
          manifest.files.push({
            source: sourcePath,
            destination: path.join('config', configFile),
            type: 'file',
            description: `Конфигурационный файл: ${configFile}`
          });
        }
      }
      console.log('✅ Конфигурационные файлы скопированы');

      // Создание контрольных сумм для проверки целостности
      await this.generateChecksums(backupPath, manifest);

      // Сохранение манифеста
      await fs.writeJson(path.join(backupPath, 'manifest.json'), manifest, { spaces: 2 });

      // Создание архива (опционально)
      if (process.argv.includes('--archive')) {
        await this.createArchive(backupPath);
      }

      console.log(`✅ Резервная копия создана: ${backupPath}`);
      console.log(`📋 Файлов в резервной копии: ${manifest.files.length}`);
      
      return backupPath;
    } catch (error) {
      console.error('❌ Ошибка создания резервной копии:', error.message);
      throw error;
    }
  }

  /**
   * Восстановление из резервной копии
   */
  async restoreBackup(backupPath) {
    try {
      console.log(`🔄 Восстановление из резервной копии: ${backupPath}`);
      
      if (!await fs.pathExists(backupPath)) {
        throw new Error(`Резервная копия не найдена: ${backupPath}`);
      }

      const manifestPath = path.join(backupPath, 'manifest.json');
      if (!await fs.pathExists(manifestPath)) {
        throw new Error('Манифест резервной копии не найден');
      }

      const manifest = await fs.readJson(manifestPath);
      console.log(`📋 Восстановление резервной копии от: ${manifest.timestamp}`);

      // Проверка целостности перед восстановлением
      const isValid = await this.verifyBackupIntegrity(backupPath);
      if (!isValid) {
        throw new Error('Резервная копия повреждена');
      }

      // Создание резервной копии текущего состояния
      console.log('🔄 Создание резервной копии текущего состояния...');
      const currentBackupPath = await this.createBackup();
      console.log(`✅ Текущее состояние сохранено в: ${currentBackupPath}`);

      // Восстановление файлов
      for (const file of manifest.files) {
        const sourcePath = path.join(backupPath, file.destination);
        const destPath = file.source;

        if (file.type === 'directory') {
          if (await fs.pathExists(destPath)) {
            await fs.remove(destPath);
          }
          await fs.copy(sourcePath, destPath);
          console.log(`✅ Восстановлена директория: ${file.destination}`);
        } else {
          await fs.ensureDir(path.dirname(destPath));
          await fs.copy(sourcePath, destPath);
          console.log(`✅ Восстановлен файл: ${file.destination}`);
        }
      }

      console.log('✅ Восстановление завершено успешно');
    } catch (error) {
      console.error('❌ Ошибка восстановления:', error.message);
      throw error;
    }
  }

  /**
   * Проверка целостности резервной копии
   */
  async verifyBackupIntegrity(backupPath) {
    try {
      console.log('🔍 Проверка целостности резервной копии...');
      
      const manifestPath = path.join(backupPath, 'manifest.json');
      const checksumPath = path.join(backupPath, 'checksums.json');
      
      if (!await fs.pathExists(manifestPath) || !await fs.pathExists(checksumPath)) {
        console.log('⚠️  Файлы проверки целостности не найдены');
        return false;
      }

      const manifest = await fs.readJson(manifestPath);
      const storedChecksums = await fs.readJson(checksumPath);

      let isValid = true;
      for (const file of manifest.files) {
        const filePath = path.join(backupPath, file.destination);
        if (await fs.pathExists(filePath)) {
          const currentChecksum = await this.calculateChecksum(filePath);
          const storedChecksum = storedChecksums[file.destination];
          
          if (currentChecksum !== storedChecksum) {
            console.log(`❌ Контрольная сумма не совпадает: ${file.destination}`);
            isValid = false;
          } else {
            console.log(`✅ Проверен: ${file.destination}`);
          }
        } else {
          console.log(`⚠️  Файл не найден: ${file.destination}`);
          isValid = false;
        }
      }

      if (isValid) {
        console.log('✅ Резервная копия прошла проверку целостности');
      } else {
        console.log('❌ Резервная копия повреждена');
      }

      return isValid;
    } catch (error) {
      console.error('❌ Ошибка проверки целостности:', error.message);
      return false;
    }
  }

  /**
   * Список доступных резервных копий
   */
  async listBackups() {
    try {
      if (!await fs.pathExists(this.backupDir)) {
        console.log('📁 Резервные копии не найдены');
        return [];
      }

      const backups = await fs.readdir(this.backupDir);
      const backupList = [];

      for (const backup of backups) {
        const backupPath = path.join(this.backupDir, backup);
        const manifestPath = path.join(backupPath, 'manifest.json');
        
        if (await fs.pathExists(manifestPath)) {
          const manifest = await fs.readJson(manifestPath);
          const stats = await fs.stat(backupPath);
          
          backupList.push({
            name: backup,
            path: backupPath,
            timestamp: manifest.timestamp,
            description: manifest.description,
            fileCount: manifest.files.length,
            size: await this.getDirectorySize(backupPath)
          });
        }
      }

      backupList.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      console.log('📋 Доступные резервные копии:');
      backupList.forEach((backup, index) => {
        console.log(`${index + 1}. ${backup.name}`);
        console.log(`   Дата: ${backup.timestamp}`);
        console.log(`   Файлов: ${backup.fileCount}`);
        console.log(`   Размер: ${this.formatBytes(backup.size)}`);
        console.log('');
      });

      return backupList;
    } catch (error) {
      console.error('❌ Ошибка получения списка резервных копий:', error.message);
      return [];
    }
  }

  /**
   * Генерация контрольных сумм для файлов
   */
  async generateChecksums(backupPath, manifest) {
    const checksums = {};
    
    for (const file of manifest.files) {
      const filePath = path.join(backupPath, file.destination);
      if (await fs.pathExists(filePath)) {
        checksums[file.destination] = await this.calculateChecksum(filePath);
      }
    }
    
    await fs.writeJson(path.join(backupPath, 'checksums.json'), checksums, { spaces: 2 });
    console.log('✅ Контрольные суммы созданы');
  }

  /**
   * Вычисление контрольной суммы файла или директории
   */
  async calculateChecksum(filePath) {
    const stats = await fs.stat(filePath);
    
    if (stats.isDirectory()) {
      // Для директорий вычисляем хеш от списка файлов и их содержимого
      const files = await this.getAllFiles(filePath);
      const hash = crypto.createHash('sha256');
      
      for (const file of files.sort()) {
        const relativePath = path.relative(filePath, file);
        const content = await fs.readFile(file);
        hash.update(relativePath);
        hash.update(content);
      }
      
      return hash.digest('hex');
    } else {
      // Для файлов вычисляем хеш содержимого
      const content = await fs.readFile(filePath);
      return crypto.createHash('sha256').update(content).digest('hex');
    }
  }

  /**
   * Получение всех файлов в директории рекурсивно
   */
  async getAllFiles(dirPath) {
    const files = [];
    const items = await fs.readdir(dirPath);
    
    for (const item of items) {
      const itemPath = path.join(dirPath, item);
      const stats = await fs.stat(itemPath);
      
      if (stats.isDirectory()) {
        const subFiles = await this.getAllFiles(itemPath);
        files.push(...subFiles);
      } else {
        files.push(itemPath);
      }
    }
    
    return files;
  }

  /**
   * Получение размера директории
   */
  async getDirectorySize(dirPath) {
    let size = 0;
    const files = await this.getAllFiles(dirPath);
    
    for (const file of files) {
      const stats = await fs.stat(file);
      size += stats.size;
    }
    
    return size;
  }

  /**
   * Форматирование размера в читаемый вид
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Создание архива резервной копии
   */
  async createArchive(backupPath) {
    // Простая реализация без внешних зависимостей
    console.log('📦 Архивирование не реализовано (требует дополнительных зависимостей)');
    console.log('💡 Используйте: tar -czf backup.tar.gz ' + path.basename(backupPath));
  }
}

// CLI интерфейс
async function main() {
  const backup = new CertificateBackupManager();
  const command = process.argv[2];

  try {
    switch (command) {
      case 'create':
        await backup.createBackup();
        break;
      
      case 'restore':
        const backupPath = process.argv[3];
        if (!backupPath) {
          console.log('❌ Укажите путь к резервной копии');
          console.log('Использование: npm run backup:restore <путь_к_резервной_копии>');
          process.exit(1);
        }
        await backup.restoreBackup(backupPath);
        break;
      
      case 'verify':
        const verifyPath = process.argv[3];
        if (!verifyPath) {
          console.log('❌ Укажите путь к резервной копии');
          console.log('Использование: npm run backup:verify <путь_к_резервной_копии>');
          process.exit(1);
        }
        await backup.verifyBackupIntegrity(verifyPath);
        break;
      
      case 'list':
        await backup.listBackups();
        break;
      
      default:
        console.log('📋 Управление резервными копиями сертификатов');
        console.log('');
        console.log('Доступные команды:');
        console.log('  create  - Создать резервную копию');
        console.log('  restore - Восстановить из резервной копии');
        console.log('  verify  - Проверить целостность резервной копии');
        console.log('  list    - Показать список резервных копий');
        console.log('');
        console.log('Примеры:');
        console.log('  npm run backup:create');
        console.log('  npm run backup:list');
        console.log('  npm run backup:verify certificate-backups/backup-2025-07-25T10-30-00-000Z');
        console.log('  npm run backup:restore certificate-backups/backup-2025-07-25T10-30-00-000Z');
    }
  } catch (error) {
    console.error('❌ Ошибка выполнения команды:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = CertificateBackupManager;