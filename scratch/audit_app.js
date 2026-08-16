const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '../src/index.html'), 'utf8');
const appJs = fs.readFileSync(path.join(__dirname, '../src/renderer/app.js'), 'utf8');
const arcReactorJs = fs.readFileSync(path.join(__dirname, '../src/renderer/arcReactor.js'), 'utf8');
const audioFxJs = fs.readFileSync(path.join(__dirname, '../src/renderer/audioFX.js'), 'utf8');
const voiceEngineJs = fs.readFileSync(path.join(__dirname, '../src/renderer/voiceEngine.js'), 'utf8');
const gestureEngineJs = fs.readFileSync(path.join(__dirname, '../src/renderer/gestureEngine.js'), 'utf8');
const meetingEngineJs = fs.readFileSync(path.join(__dirname, '../src/renderer/meetingEngine.js'), 'utf8');

const combinedRenderer = appJs + arcReactorJs + audioFxJs + voiceEngineJs + gestureEngineJs + meetingEngineJs;

const idRegex = /id=["']([^"']+)["']/g;
const uniqueIds = new Set();
let match;
while ((match = idRegex.exec(html)) !== null) {
  uniqueIds.add(match[1]);
}

console.log(`Total HTML IDs found: ${uniqueIds.size}`);

const missing = [];
for (const id of uniqueIds) {
  if (!combinedRenderer.includes(id)) {
    missing.push(id);
  }
}

console.log('IDs not referenced in renderer JS files:');
console.log(missing);
