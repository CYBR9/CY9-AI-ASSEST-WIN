const liveAudioService = require('../src/services/liveAudioService');
const systemService = require('../src/services/systemService');

async function testLiveVisionWithScreenshot() {
  console.log('====================================================');
  console.log('👁️ TESTING REAL LIVE VISION SCREENSHOT TRANSMISSION');
  console.log('====================================================\n');

  let audioChunks = 0;
  let aiTranscript = '';
  
  const connRes = await liveAudioService.connect({
    send: (channel, data) => {
      if (channel === 'live:audio-chunk') {
        audioChunks++;
      } else if (channel === 'live:ai-transcript') {
        aiTranscript += data;
        process.stdout.write(data);
      } else if (channel === 'live:status') {
        console.log('\n[Live Status]:', data);
      }
    },
    isDestroyed: () => false
  });

  console.log('Uplink Status:', connRes);
  if (!connRes.success) {
    console.error('Failed to connect:', connRes.message);
    process.exit(1);
  }

  // 1. Capture real desktop screenshot
  console.log('\n📸 Capturing real desktop screenshot...');
  const screen = await systemService.captureScreenshot();
  console.log(`Screenshot capture: success=${screen.success}, bytes=${screen.bytes}, mime=${screen.mimeType}`);

  if (!screen.success || !screen.base64) {
    console.error('Screenshot failed!');
    process.exit(1);
  }

  // 2. Send video frame to live session
  console.log('\n🚀 Transmitting screen frame to Gemini Live API session...');
  const videoSent = liveAudioService.sendVideoChunk({
    base64: screen.base64,
    mimeType: screen.mimeType
  });
  console.log('Video frame dispatched:', videoSent);

  // 3. Send query asking about the screen
  console.log('\n💬 Sending prompt: "أنا شاركت الشاشة معك الآن، صف لي ماذا ترى على شاشتي بالتفصيل وما التطبيقات المفتوحة؟"');
  if (liveAudioService.session) {
    liveAudioService.session.sendRealtimeInput({
      text: 'أنا شاركت الشاشة معك الآن، صف لي ماذا ترى على شاشتي بالتفصيل وما التطبيقات المفتوحة؟'
    });
  }

  console.log('\n⏳ Waiting for Gemini real-time multimodal response...\n--- AI SPOKEN RESPONSE ---');
  await new Promise(r => setTimeout(r, 12000));
  
  console.log('\n\n====================================================');
  console.log(`📊 TEST RESULT: Received ${audioChunks} Audio Chunks, Full Transcript: "${aiTranscript}"`);
  console.log('====================================================');

  liveAudioService.disconnect();
}

testLiveVisionWithScreenshot().catch(err => {
  console.error('Fatal Test Error:', err);
  process.exit(1);
});
