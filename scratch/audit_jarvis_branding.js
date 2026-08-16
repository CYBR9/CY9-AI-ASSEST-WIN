/**
 * Audit: Find all "jarvis" references that are user-facing (displayed to user)
 * and distinguish them from internal IPC channel names (which are OK to keep as-is)
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

// IPC channel names & API bridge internals - these are OK to keep as 'jarvis:' or 'jarvisAPI'
// since they're internal plumbing, NOT displayed to users
const INTERNAL_PATTERNS = [
  /jarvis:[a-z\-]+/g,           // IPC channel names like jarvis:send-message
  /window\.jarvisAPI/g,          // renderer bridge
  /jarvisAPI/g,                  // bridge usage
  /jarvis:restore-triggered/g,
  /ipcMain\.handle\(['"]jarvis/g,
  /ipcRenderer\.(invoke|on|removeListener)\(['"]jarvis/g,
  /ipcRenderer\.(invoke|on|removeListener)\(['"]window/g,
  /ipcRenderer\.(invoke|on|removeListener)\(['"]widget/g,
  /ipcMain\.handle\(['"]window/g,
  /ipcMain\.handle\(['"]widget/g,
];

function isInternal(line) {
  for (const p of INTERNAL_PATTERNS) {
    p.lastIndex = 0;
    if (p.test(line)) return true;
  }
  return false;
}

const filesToScan = [
  'src/index.html',
  'src/renderer/app.js',
  'src/renderer/voiceEngine.js',
  'src/renderer/audioFX.js',
  'src/renderer/arcReactor.js',
  'src/renderer/widgetRenderer.js',
  'src/renderer/meetingEngine.js',
  'src/styles/hud.css',
  'src/services/geminiService.js',
  'src/services/liveAudioService.js',
  'src/services/agentManager.js',
  'src/services/memoryService.js',
  'src/services/systemService.js',
  'src/services/promptEngineeringService.js',
  'src/widget.html',
  'main.js',
  'preload.js',
  'package.json',
  'create_shortcut.vbs',
  'انشاء_اختصار_سطح_المكتب.bat',
  'تشغيل_CY9.bat',
  'README.md',
];

const JARVIS_RE = /jarvis/gi;

let totalFound = 0;
const allHits = [];

for (const rel of filesToScan) {
  const fp = path.join(ROOT, rel);
  if (!fs.existsSync(fp)) continue;
  const lines = fs.readFileSync(fp, 'utf8').split('\n');
  lines.forEach((line, i) => {
    if (!JARVIS_RE.test(line)) { JARVIS_RE.lastIndex = 0; return; }
    JARVIS_RE.lastIndex = 0;
    const internal = isInternal(line);
    allHits.push({ file: rel, line: i + 1, text: line.trim(), internal });
    if (!internal) totalFound++;
  });
}

console.log('=================================================');
console.log('    JARVIS BRANDING AUDIT (user-facing only)');
console.log('=================================================\n');

const userFacing = allHits.filter(h => !h.internal);
const internalOnly = allHits.filter(h => h.internal);

if (userFacing.length === 0) {
  console.log('✅ No user-facing "Jarvis" references found! All branding is CY9.');
} else {
  console.log(`❌ Found ${userFacing.length} user-facing "Jarvis" references:\n`);
  let lastFile = '';
  for (const h of userFacing) {
    if (h.file !== lastFile) { console.log(`\n📄 ${h.file}`); lastFile = h.file; }
    console.log(`   L${h.line}: ${h.text.substring(0, 120)}`);
  }
}

console.log(`\n📦 Internal IPC/API references (OK to keep): ${internalOnly.length}`);
console.log('\n=================================================');
console.log(`  SUMMARY: ${userFacing.length} user-facing | ${internalOnly.length} internal (OK)`);
console.log('=================================================');

// Export for programmatic fixing
module.exports = { userFacing, internalOnly };
