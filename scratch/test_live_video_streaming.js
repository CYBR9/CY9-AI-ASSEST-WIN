const liveAudioService = require('../src/services/liveAudioService');

async function testLiveVideoStreaming() {
  console.log('====================================================');
  console.log('🎥 TESTING GEMINI LIVE VIDEO STREAMING PAYLOAD FORMAT');
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

  // Mock a live session to inspect exact payload sent to sendRealtimeInput
  let capturedInput = null;
  liveAudioService.isConnected = true;
  liveAudioService.session = {
    sendRealtimeInput: (payload) => {
      capturedInput = payload;
    }
  };

  // Test 1: Sending object payload with PNG base64
  console.log('--- 1. Testing sendVideoChunk with object payload ---');
  const dummyB64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const ok1 = liveAudioService.sendVideoChunk({
    base64: dummyB64,
    mimeType: 'image/png'
  });

  assert('sendVideoChunk returns true', ok1 === true);
  assert('Payload uses "video" key (NOT "media")', capturedInput && capturedInput.video !== undefined && capturedInput.media === undefined);
  assert('Video data is clean base64', capturedInput?.video?.data === dummyB64);
  assert('MIME type is image/png', capturedInput?.video?.mimeType === 'image/png');

  // Test 2: Sending raw data URI string
  console.log('\n--- 2. Testing sendVideoChunk with data URI string ---');
  capturedInput = null;
  const dataUri = `data:image/png;base64,${dummyB64}`;
  const ok2 = liveAudioService.sendVideoChunk(dataUri);

  assert('sendVideoChunk handles data URI', ok2 === true);
  assert('Data URI prefix stripped from data', capturedInput?.video?.data === dummyB64);
  assert('MIME type auto-detected as image/png', capturedInput?.video?.mimeType === 'image/png');

  console.log('\n====================================================');
  console.log(`📊 TEST SUMMARY: ${passed} / ${total} CHECKS PASSED (${Math.round((passed/total)*100)}%)`);
  console.log('====================================================\n');

  if (passed === total) {
    console.log('🎉 LIVE VIDEO PAYLOAD COMPLIANCE IS 100% VERIFIED!');
  } else {
    process.exit(1);
  }
}

testLiveVideoStreaming().catch(err => {
  console.error('Fatal Test Error:', err);
  process.exit(1);
});
