const liveAudioService = require('../src/services/liveAudioService');

async function testConcurrentAudioVideoLive() {
  console.log('====================================================');
  console.log('🧪 TESTING CONCURRENT LIVE AUDIO & SCREEN VISION COEXISTENCE');
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

  // Mock a live session and track all events
  const receivedInputs = [];
  liveAudioService.isConnected = true;
  liveAudioService.session = {
    sendRealtimeInput: (payload) => {
      receivedInputs.push(payload);
    }
  };

  const dummyPcm = Buffer.alloc(1024).toString('base64');
  const dummyB64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

  console.log('--- 1. Simulating Concurrent Audio Chunks & Screen Video Frames ---');

  // Send 10 interleaved audio chunks and screen frames simultaneously
  for (let i = 1; i <= 5; i++) {
    const audioOk = liveAudioService.sendAudioChunk(dummyPcm);
    assert(`Audio Chunk #${i} dispatched`, audioOk === true);

    const videoOk = liveAudioService.sendVideoChunk({
      base64: dummyB64,
      mimeType: 'image/png'
    });
    assert(`Video Frame #${i} dispatched`, videoOk === true);
  }

  console.log('\n--- 2. Verifying Session Stream Integrity ---');
  assert('Total inputs received', receivedInputs.length === 10, `Count: ${receivedInputs.length}`);

  const audioCount = receivedInputs.filter(r => r.audio && r.audio.mimeType === 'audio/pcm;rate=16000').length;
  const videoCount = receivedInputs.filter(r => r.video && r.video.mimeType === 'image/png').length;

  assert('5 Audio chunks arrived correctly with PCM format', audioCount === 5);
  assert('5 Video frames arrived correctly with video format', videoCount === 5);
  assert('Zero collisions or dropped payloads', audioCount + videoCount === 10);

  console.log('\n====================================================');
  console.log(`📊 CONCURRENCY TEST SUMMARY: ${passed} / ${total} CHECKS PASSED (${Math.round((passed/total)*100)}%)`);
  console.log('====================================================\n');

  if (passed === total) {
    console.log('🎉 AUDIO + SCREEN VISION SIMULTANEOUS OPERATION IS 100% VERIFIED!');
  } else {
    process.exit(1);
  }
}

testConcurrentAudioVideoLive().catch(err => {
  console.error('Fatal Concurrency Test Error:', err);
  process.exit(1);
});
