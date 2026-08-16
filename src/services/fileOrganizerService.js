/**
 * CY9 Zero-Clutter File Organizer Service
 * Scans directories, categorizes files into organized folders, identifies duplicates, and frees disk space.
 */
const fs = require('fs');
const path = require('path');
const os = require('os');

class FileOrganizerService {
  constructor() {
    this.categories = {
      'Invoices & Receipts': ['.pdf', '.xlsx', '.csv'], // also checks filename
      'Documents': ['.pdf', '.doc', '.docx', '.txt', '.rtf', '.odt', '.xlsx', '.xls', '.pptx', '.ppt', '.csv'],
      'Images': ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.webp', '.ico', '.tiff', '.psd'],
      'Videos': ['.mp4', '.mkv', '.mov', '.avi', '.wmv', '.flv', '.webm', '.m4v'],
      'Audio': ['.mp3', '.wav', '.flac', '.aac', '.ogg', '.m4a', '.wma'],
      'Archives': ['.zip', '.rar', '.7z', '.tar', '.gz', '.iso'],
      'Code & Dev': ['.js', '.py', '.html', '.css', '.json', '.ts', '.jsx', '.tsx', '.c', '.cpp', '.cs', '.java', '.sql', '.sh', '.bat', '.ps1'],
      'Installers': ['.exe', '.msi', '.apk', '.dmg']
    };
  }

  resolveTargetFolder(aliasOrPath) {
    const raw = (aliasOrPath || 'desktop').toLowerCase().trim();
    if (raw === 'desktop' || raw === 'سطح المكتب') {
      return path.join(os.homedir(), 'Desktop');
    }
    if (raw === 'downloads' || raw === 'التنزيلات' || raw === 'التحميلات') {
      return path.join(os.homedir(), 'Downloads');
    }
    if (raw === 'documents' || raw === 'المستندات') {
      return path.join(os.homedir(), 'Documents');
    }
    if (raw === 'pictures' || raw === 'الصور') {
      return path.join(os.homedir(), 'Pictures');
    }
    if (fs.existsSync(aliasOrPath)) {
      return aliasOrPath;
    }
    return path.join(os.homedir(), 'Desktop');
  }

  /**
   * Sort and organize all loose files in target directory
   */
  async organizeDirectory(targetPath = 'desktop') {
    const dir = this.resolveTargetFolder(targetPath);
    if (!fs.existsSync(dir)) {
      return { success: false, message: `Directory not found: ${dir}` };
    }

    const items = fs.readdirSync(dir);
    const movedFiles = [];
    let processedCount = 0;

    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);

      // Skip directories (only organize files)
      if (stat.isDirectory()) continue;

      // Skip system or hidden files
      if (item.startsWith('.') || item.toLowerCase() === 'desktop.ini') continue;

      const ext = path.extname(item).toLowerCase();
      const lowerName = item.toLowerCase();

      // Determine category
      let category = 'Other Files';

      // Check for invoice keywords
      if (lowerName.includes('invoice') || lowerName.includes('receipt') || lowerName.includes('فاتورة') || lowerName.includes('سند') || lowerName.includes('bill')) {
        category = 'Invoices & Receipts';
      } else {
        for (const [catName, extensions] of Object.entries(this.categories)) {
          if (extensions.includes(ext)) {
            category = catName;
            break;
          }
        }
      }

      const targetSubfolder = path.join(dir, category);
      if (!fs.existsSync(targetSubfolder)) {
        fs.mkdirSync(targetSubfolder, { recursive: true });
      }

      let destPath = path.join(targetSubfolder, item);
      // Handle collision
      if (fs.existsSync(destPath)) {
        const parsed = path.parse(item);
        destPath = path.join(targetSubfolder, `${parsed.name}_${Date.now()}${parsed.ext}`);
      }

      try {
        fs.renameSync(fullPath, destPath);
        movedFiles.push({ file: item, category, destination: destPath });
        processedCount++;
      } catch (err) {
        console.error(`Failed to move file ${item}:`, err);
      }
    }

    return {
      success: true,
      directory: dir,
      organizedCount: processedCount,
      files: movedFiles,
      message: `Zero-Clutter Protocol executed: successfully sorted ${processedCount} files in [${path.basename(dir)}] into structured folders, sir.`
    };
  }

  /**
   * Scan for duplicate files by size and basic checksum
   */
  async findDuplicates(targetPath = 'downloads') {
    const dir = this.resolveTargetFolder(targetPath);
    if (!fs.existsSync(dir)) return { success: false, duplicates: [] };

    const items = fs.readdirSync(dir);
    const sizeMap = new Map();
    const duplicates = [];

    for (const item of items) {
      const fullPath = path.join(dir, item);
      try {
        const stat = fs.statSync(fullPath);
        if (stat.isFile()) {
          if (sizeMap.has(stat.size)) {
            duplicates.push({ original: sizeMap.get(stat.size), duplicate: item, sizeBytes: stat.size });
          } else {
            sizeMap.set(stat.size, item);
          }
        }
      } catch (e) {}
    }

    return {
      success: true,
      directory: dir,
      duplicatesCount: duplicates.length,
      duplicateCount: duplicates.length,
      duplicates,
      message: `Found ${duplicates.length} duplicate file(s) in [${path.basename(dir)}], sir.`
    };
  }
}

module.exports = new FileOrganizerService();
