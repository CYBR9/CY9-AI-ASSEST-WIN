/**
 * CY9 FULL SYSTEM AUDIT
 * Checks all known potential issues across the entire live call pipeline
 */
const geminiService = require('../src/services/geminiService');
const agentManager = require('../src/services/agentManager');
const memoryService = require('../src/services/memoryService');
const fs = require('fs');
const path = require('path');

const PASS = '✅';
const FAIL = '❌';
const WARN = '⚠️';

const results = [];

function check(label, passed, detail = '') {
  const icon = passed === true ? PASS : passed === 'warn' ? WARN : FAIL;
  results.push({ icon, label, detail, passed });
  console.log(`${icon} ${label}${detail ? `: ${detail}` : ''}`);
}

console.log('=================================================');
console.log('       CY9 FULL LIVE CALL SYSTEM AUDIT');
console.log('=================================================\n');

// ── 1. CONFIG CHECK ─────────────────────────────────────────
console.log('[ 1 ] CONFIGURATION');
const config = memoryService.getConfig();
check('API Key present', !!config.apiKey, config.apiKey ? `${config.apiKey.slice(0, 8)}...` : 'MISSING');
check('User name set', !!config.userName, config.userName || 'Not set');
check('Language set', !!config.language, config.language || 'Not set');

// ── 2. TOOLS DEFINITION ─────────────────────────────────────
console.log('\n[ 2 ] TOOLS DEFINITION');
const allTools = geminiService.toolsDefinition[0].functionDeclarations;
check('toolsDefinition array exists', Array.isArray(allTools));
check('Tools count reasonable (< 64)', allTools.length < 64, `${allTools.length} tools`);

// Duplicate check
const seen = new Set();
const dups = [];
for (const t of allTools) { if (seen.has(t.name)) dups.push(t.name); seen.add(t.name); }
check('No duplicate tool names', dups.length === 0, dups.length ? `Duplicates: ${dups.join(', ')}` : 'None');

// Schema validity
let schemaErrors = [];
for (const t of allTools) {
  if (!t.name) schemaErrors.push('tool missing name');
  if (!t.description) schemaErrors.push(`${t.name}: missing description`);
  if (t.parameters) {
    const upper = t.parameters.type?.toUpperCase();
    if (upper !== 'OBJECT') schemaErrors.push(`${t.name}: parameters.type should be OBJECT, got ${t.parameters.type}`);
    const props = t.parameters.properties || {};
    for (const [k, v] of Object.entries(props)) {
      if (!v.type) schemaErrors.push(`${t.name}.${k}: missing type`);
      if ((v.type === 'ARRAY' || v.type === 'array') && !v.items) schemaErrors.push(`${t.name}.${k}: ARRAY missing items`);
    }
    for (const req of (t.parameters.required || [])) {
      if (!props[req]) schemaErrors.push(`${t.name}: required '${req}' not in properties`);
    }
  }
}
check('All tool schemas valid', schemaErrors.length === 0, schemaErrors.join('; ') || 'All OK');

// ── 3. AGENT HANDLER COVERAGE ────────────────────────────────
console.log('\n[ 3 ] AGENT HANDLER COVERAGE');
const agentSrc = fs.readFileSync(path.join(__dirname, '../src/services/agentManager.js'), 'utf8');
const unhandled = allTools.filter(t => !new RegExp(`case\\s+['"]${t.name}['"]`).test(agentSrc));
check('All tools have agentManager handlers', unhandled.length === 0,
  unhandled.length ? `Missing: ${unhandled.map(t => t.name).join(', ')}` : 'All handled');

// ── 4. IPCMAIN LIVE HANDLERS ─────────────────────────────────
console.log('\n[ 4 ] IPC MAIN HANDLERS (main.js)');
const mainSrc = fs.readFileSync(path.join(__dirname, '../main.js'), 'utf8');
const liveIPCs = [
  'cy9:live-connect',
  'cy9:live-send-audio',
  'cy9:live-send-video',
  'cy9:live-disconnect'
];
for (const ipc of liveIPCs) {
  check(`IPC handler: ${ipc}`, mainSrc.includes(`'${ipc}'`));
}

// ── 5. PRELOAD BRIDGE ─────────────────────────────────────────
console.log('\n[ 5 ] PRELOAD BRIDGE (preload.js)');
const preloadSrc = fs.readFileSync(path.join(__dirname, '../preload.js'), 'utf8');
const preloadAPIs = [
  'liveConnect',
  'liveSendAudio',
  'liveSendVideo',
  'liveDisconnect',
  'onLiveAudioChunk',
  'onLiveUserTranscript',
  'onLiveAiTranscript',
  'onLiveInterrupted',
  'onLiveStatus'
];
for (const api of preloadAPIs) {
  check(`Preload API: ${api}`, preloadSrc.includes(api));
}

// ── 6. LIVEAUDIOSERVICE INTEGRITY ────────────────────────────
console.log('\n[ 6 ] LIVEAUDIOSERVICE INTEGRITY');
const liveSrc = fs.readFileSync(path.join(__dirname, '../src/services/liveAudioService.js'), 'utf8');
check('Uses geminiService.toolsDefinition', liveSrc.includes('geminiService.toolsDefinition'));
check('onmessage handler present', liveSrc.includes('onmessage:'));
check('onopen handler present', liveSrc.includes('onopen:'));
check('onerror handler present', liveSrc.includes('onerror:'));
check('onclose handler present', liveSrc.includes('onclose:'));
check('sendAudioChunk method exists', liveSrc.includes('sendAudioChunk'));
check('sendVideoChunk method exists', liveSrc.includes('sendVideoChunk'));
check('disconnect method exists', liveSrc.includes('disconnect()'));
check('Sends live:audio-chunk IPC', liveSrc.includes("'live:audio-chunk'"));
check('Sends live:user-transcript IPC', liveSrc.includes("'live:user-transcript'"));
check('Sends live:ai-transcript IPC', liveSrc.includes("'live:ai-transcript'"));
check('Sends live:interrupted IPC', liveSrc.includes("'live:interrupted'"));
check('Sends live:status IPC', liveSrc.includes("'live:status'"));
check('Handles end_live_call', liveSrc.includes("'end_live_call'"));
check('Correct model used', liveSrc.includes('gemini-3.1-flash-live-preview'), '(latest live model)');
check('Audio mimeType 16kHz', liveSrc.includes('audio/pcm;rate=16000'));

// ── 7. VOICEENGINE INTEGRITY ─────────────────────────────────
console.log('\n[ 7 ] VOICEENGINE INTEGRITY (renderer)');
const veSrc = fs.readFileSync(path.join(__dirname, '../src/renderer/voiceEngine.js'), 'utf8');
check('startLiveDuplex method exists', veSrc.includes('startLiveDuplex'));
check('stopLiveDuplex method exists', veSrc.includes('stopLiveDuplex'));
check('enqueueLiveAudioChunk method', veSrc.includes('enqueueLiveAudioChunk'));
check('handleLiveInterruption method', veSrc.includes('handleLiveInterruption'));
check('isLiveAiSpeaking method', veSrc.includes('isLiveAiSpeaking'));
check('Echo suppression logic', veSrc.includes('isLiveAiSpeaking() && rms'));
check('24kHz output AudioContext', veSrc.includes('sampleRate: 24000'));
check('16kHz input AudioContext', veSrc.includes('sampleRate: 16000'));
check('Uses onLiveAudioChunk', veSrc.includes('onLiveAudioChunk'));
check('Uses onLiveStatus', veSrc.includes('onLiveStatus'));
check('Calls liveConnect IPC', veSrc.includes('liveConnect'));
check('Calls liveSendAudio IPC', veSrc.includes('liveSendAudio'));
check('Calls liveDisconnect IPC', veSrc.includes('liveDisconnect'));

// ── 8. APP.JS LIVE UI ─────────────────────────────────────────
console.log('\n[ 8 ] APP.JS LIVE CALL UI');
const appSrc = fs.readFileSync(path.join(__dirname, '../src/renderer/app.js'), 'utf8');
check('toggleLiveDuplexCall function', appSrc.includes('toggleLiveDuplexCall'));
check('updateLiveDuplexUI function', appSrc.includes('updateLiveDuplexUI'));
check('startLiveDuplex call', appSrc.includes('startLiveDuplex'));
check('stopLiveDuplex call', appSrc.includes('stopLiveDuplex'));
check('Live screen streaming loop', appSrc.includes('streamScreenFramesLoop'));
check('btn-live-duplex-call element', appSrc.includes('btn-live-duplex-call'));
check('onUserTranscript callback', appSrc.includes('onUserTranscript'));
check('onAiTranscript callback', appSrc.includes('onAiTranscript'));
check('onStatus callback', appSrc.includes('onStatus'));

// ── 9. HTML LIVE ELEMENTS ─────────────────────────────────────
console.log('\n[ 9 ] INDEX.HTML LIVE ELEMENTS');
const htmlSrc = fs.readFileSync(path.join(__dirname, '../src/index.html'), 'utf8');
check('btn-live-duplex-call exists', htmlSrc.includes('btn-live-duplex-call'));
check('live-duplex-text exists', htmlSrc.includes('live-duplex-text'));
check('btn-live-screen-share exists', htmlSrc.includes('btn-live-screen-share'));
check('live-voice-transcript-bar exists', htmlSrc.includes('live-voice-transcript-bar') || htmlSrc.includes('liveTranscriptBar'));

// ── SUMMARY ───────────────────────────────────────────────────
const total = results.length;
const passed = results.filter(r => r.passed === true).length;
const warnings = results.filter(r => r.passed === 'warn').length;
const failed = results.filter(r => r.passed === false).length;

console.log('\n=================================================');
console.log(`       AUDIT SUMMARY: ${passed}/${total} passed`);
if (failed > 0) console.log(`       ${FAIL} FAILURES: ${failed}`);
if (warnings > 0) console.log(`       ${WARN} WARNINGS: ${warnings}`);
console.log('=================================================');

if (failed > 0) {
  console.log('\nFailed checks:');
  results.filter(r => r.passed === false).forEach(r => console.log(`  ${r.icon} ${r.label}: ${r.detail}`));
}
