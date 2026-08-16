const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '../src/index.html'), 'utf8');
const appJs = fs.readFileSync(path.join(__dirname, '../src/renderer/app.js'), 'utf8');
const arcReactorJs = fs.readFileSync(path.join(__dirname, '../src/renderer/arcReactor.js'), 'utf8');
const gestureEngineJs = fs.readFileSync(path.join(__dirname, '../src/renderer/gestureEngine.js'), 'utf8');
const meetingEngineJs = fs.readFileSync(path.join(__dirname, '../src/renderer/meetingEngine.js'), 'utf8');

const combined = appJs + arcReactorJs + gestureEngineJs + meetingEngineJs;

const buttonRegex = /<button[^>]*id=["']([^"']+)["'][^>]*>/g;
let match;
const buttons = [];
while ((match = buttonRegex.exec(html)) !== null) {
  buttons.push(match[1]);
}

console.log('Total buttons with IDs in index.html:', buttons.length);

const unhandled = [];
for (const btn of buttons) {
  if (!combined.includes(btn)) {
    unhandled.push(btn);
  }
}

console.log('Buttons not referenced directly in renderer JS:');
console.log(unhandled);
