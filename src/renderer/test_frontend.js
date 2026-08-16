const fs = require('fs');
const path = require('path');
const workspaceDir = 'c:/Users/ahq37/OneDrive/Desktop/CY9-AI-ASSEST-WIN';

async function testFrontendIntegrity() {
  console.log('====================================================');
  console.log('🎨 TESTING FRONTEND HUD, DOM & VOICE INTEGRATION');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;

  function assert(name, condition, details = '') {
    total++;
    if (condition) {
      console.log(`✅ [PASS] ${name} ${details ? '(' + details + ')' : ''}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${name} ${details ? '(' + details + ')' : ''}`);
    }
  }

  // 1. Read index.html
  const htmlPath = path.join(workspaceDir, 'src/index.html');
  assert('index.html exists', fs.existsSync(htmlPath));
  const htmlContent = fs.readFileSync(htmlPath, 'utf8');

  // 2. Check essential HUD IDs in index.html
  const essentialIds = [
    // Header & Window
    'btn-pin', 'btn-orb', 'btn-mini', 'btn-min', 'btn-max', 'btn-close', 'btn-shutdown', 'header-clock',
    // Sidebar Tabs
    'hud-sidebar', 'tab-command', 'tab-agents', 'tab-telemetry', 'tab-protocols', 'tab-terminal', 'tab-superpowers', 'tab-memory', 'tab-vision', 'tab-ecosystem', 'tab-smarthome',
    // Arc Reactor & Voice Wave & Gemini Live Duplex Call & Vision
    'arc-reactor-canvas', 'reactor-state', 'btn-stop-speech', 'btn-live-duplex-call', 'live-duplex-text', 'btn-live-screen-share', 'live-screen-share-text',
    // Chat & Messaging & Real-Time Live Voice Bar
    'chat-messages-container', 'chat-input', 'btn-send', 'btn-mic', 'btn-attach-screen', 'image-attachment-preview', 'btn-remove-attachment',
    'live-voice-transcript-bar', 'live-voice-text', 'btn-live-stop-send', 'btn-live-cancel',
    // Superpowers Deck
    'btn-sp-organize-desktop', 'btn-sp-organize-downloads', 'btn-sp-pc-health', 'btn-sp-deep-research', 'sp-research-input', 'btn-sp-toggle-gestures', 'btn-sp-start-meeting', 'btn-sp-gen-minutes', 'btn-sp-morning-briefing', 'btn-sp-red-alert', 'btn-sp-posture', 'btn-sp-hydration', 'btn-sp-search-recall', 'sp-recall-input',
    'btn-sp-mouse-left', 'btn-sp-mouse-right', 'btn-sp-mouse-double', 'btn-sp-mouse-scroll', 'btn-sp-inspect-screen', 'btn-sp-generate-prompt', 'sp-prompt-desc-input',
    // Vision & Face ID
    'btn-start-camera', 'btn-stop-camera', 'btn-check-posture', 'btn-eye-rest', 'webcam-video', 'webcam-canvas', 'camera-status-overlay',
    // Ecosystem & Bluetooth & Gmail & Calendar
    'btn-bt-connect-huawei', 'btn-bt-scan', 'btn-bt-settings', 'bt-devices-list',
    'btn-media-play', 'btn-media-prev', 'btn-media-next', 'btn-media-search', 'media-search-input', 'media-track-name', 'btn-open-whatsapp', 'btn-send-telegram-memo',
    'btn-gmail-inbox', 'btn-gmail-compose', 'btn-cal-agenda', 'btn-cal-meet',
    // Smart Home & Dynamic IR Device Manager
    'btn-toggle-add-ir-device', 'btn-toggle-ir-gateway', 'ir-add-device-form', 'ir-gateway-settings-form', 'ir-paired-chips-container', 'dynamic-remotes-container', 'iot-devices-list',
    // Toast Container
    'toast-container'
  ];

  console.log('\n--- 1. Verifying Essential HTML DOM Elements ---');
  essentialIds.forEach(id => {
    const hasId = htmlContent.includes(`id="${id}"`) || htmlContent.includes(`id='${id}'`);
    assert(`Element #${id}`, hasId);
  });

  // 3. Check All Script Tags in index.html
  console.log('\n--- 2. Verifying Script Inclusions in index.html ---');
  const requiredScripts = [
    'services/neuralVoiceService.js',
    'services/faceVisionService.js',
    'services/visionAgentService.js',
    'services/integrationsService.js',
    'services/irRemoteService.js',
    'services/smartHomeService.js',
    'renderer/audioFX.js',
    'renderer/voiceEngine.js',
    'renderer/arcReactor.js',
    'renderer/gestureEngine.js',
    'renderer/meetingEngine.js',
    'renderer/app.js'
  ];

  requiredScripts.forEach(scriptRel => {
    const scriptFile = path.join(workspaceDir, 'src', scriptRel);
    const fileExists = fs.existsSync(scriptFile);
    const includedInHtml = htmlContent.includes(scriptRel);
    assert(`Script file: ${scriptRel}`, fileExists && includedInHtml);
  });

  // 4. Test Voice Engine Text Cleaner
  console.log('\n--- 3. Testing Voice Engine Text Processing ---');
  const VoiceEngine = require(path.join(workspaceDir, 'src/renderer/voiceEngine.js'));
  const testEngine = new VoiceEngine();
  
  const sampleMarkdown = `
    ### Hello Sir!
    Here is your **code update**:
    \`\`\`javascript
    console.log("hello");
    \`\`\`
    Please visit [CY9 Link](https://cy9.ai) for details.
    * Feature 1
    * Feature 2 😊
  `;
  const cleaned = testEngine.cleanTextForSpeech(sampleMarkdown);
  assert('Clean Markdown Headers', !cleaned.includes('###'));
  assert('Remove Code Blocks', !cleaned.includes('console.log'));
  assert('Remove Bold Stars', !cleaned.includes('**'));
  assert('Remove Markdown Links', !cleaned.includes('https://cy9.ai') && cleaned.includes('CY9 Link'));
  assert('Clean Emojis', !cleaned.includes('😊'));

  console.log('\n====================================================');
  console.log(`📊 FRONTEND VERIFICATION SUMMARY: ${passed} / ${total} CHECKS PASSED (${Math.round((passed/total)*100)}%)`);
  console.log('====================================================');
}

testFrontendIntegrity().catch(err => {
  console.error('Frontend Test Error:', err);
  process.exit(1);
});
