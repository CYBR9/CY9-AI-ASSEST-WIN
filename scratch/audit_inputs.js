const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '../src/index.html'), 'utf8');
const appJs = fs.readFileSync(path.join(__dirname, '../src/renderer/app.js'), 'utf8');
const gestureEngineJs = fs.readFileSync(path.join(__dirname, '../src/renderer/gestureEngine.js'), 'utf8');
const meetingEngineJs = fs.readFileSync(path.join(__dirname, '../src/renderer/meetingEngine.js'), 'utf8');

const combined = appJs + gestureEngineJs + meetingEngineJs;

const inputRegex = /<(?:input|select|textarea)[^>]*id=["']([^"']+)["'][^>]*>/g;
let match;
const inputs = [];
while ((match = inputRegex.exec(html)) !== null) {
  inputs.push(match[1]);
}

console.log('Total input/select elements with IDs in index.html:', inputs.length);

const unhandledInputs = [];
for (const inp of inputs) {
  if (!combined.includes(inp)) {
    unhandledInputs.push(inp);
  }
}

console.log('Inputs not referenced in renderer JS:');
console.log(unhandledInputs);
