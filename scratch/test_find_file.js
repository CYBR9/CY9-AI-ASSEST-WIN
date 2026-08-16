const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');

async function findAndOpenFileOrFolder(targetName, preferredFolder = null) {
  const home = os.homedir();
  const searchRoots = [];

  if (preferredFolder) {
    const pf = preferredFolder.toLowerCase();
    if (pf.includes('desktop') || pf.includes('سطح المكتب')) {
      searchRoots.push(path.join(home, 'Desktop'), path.join(home, 'OneDrive', 'Desktop'));
    } else if (pf.includes('download') || pf.includes('تنزيل') || pf.includes('تحميل')) {
      searchRoots.push(path.join(home, 'Downloads'));
    } else if (pf.includes('document') || pf.includes('مستند')) {
      searchRoots.push(path.join(home, 'Documents'), path.join(home, 'OneDrive', 'Documents'));
    }
  }

  // Standard locations
  searchRoots.push(
    path.join(home, 'Desktop'),
    path.join(home, 'OneDrive', 'Desktop'),
    path.join(home, 'Downloads'),
    path.join(home, 'Documents'),
    path.join(home, 'OneDrive', 'Documents'),
    process.cwd()
  );

  const cleanTarget = targetName.toLowerCase().trim().replace(/['"]/g, '');
  let foundPath = null;
  let isDirectory = false;

  // 1. Direct check in search roots
  for (const root of searchRoots) {
    if (!fs.existsSync(root)) continue;
    try {
      const entries = fs.readdirSync(root);
      for (const entry of entries) {
        const full = path.join(root, entry);
        const lowerEntry = entry.toLowerCase();
        
        // Exact or strong substring match
        if (lowerEntry === cleanTarget || lowerEntry.startsWith(cleanTarget) || lowerEntry.includes(cleanTarget)) {
          const stat = fs.statSync(full);
          foundPath = full;
          isDirectory = stat.isDirectory();
          break;
        }
      }
    } catch (e) {}
    if (foundPath) break;
  }

  return { foundPath, isDirectory };
}

async function test() {
  console.log('Testing open CY9 on Desktop...');
  const res = await findAndOpenFileOrFolder('CY9', 'desktop');
  console.log('Result for CY9 on Desktop:', res);
}

test();
