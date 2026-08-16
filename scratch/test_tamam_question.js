const liveAudioService = require('../src/services/liveAudioService');
const systemService = require('../src/services/systemService');

async function testTamamQuestion() {
  console.log('Connecting to Live Audio...');
  let callEnded = false;
  let audioCount = 0;
  let fullTranscript = '';

  const res = await liveAudioService.connect({
    send: (channel, data) => {
      if (channel === 'live:audio-chunk') {
        audioCount++;
      } else if (channel === 'live:ai-transcript') {
        fullTranscript += data;
        console.log('[Transcript Chunk]:', data);
      } else if (channel === 'live:status') {
        console.log('[Status]:', data);
        if (!data.connected) callEnded = true;
      }
    },
    isDestroyed: () => false
  });

  console.log('Connect res:', res);
  const screen = await systemService.captureScreenshot();
  console.log('Screenshot capture:', screen.success);
  liveAudioService.sendVideoChunk(screen);

  console.log('Sending text...');
  if (liveAudioService.session) {
    liveAudioService.session.sendRealtimeInput({
      text: 'هل تقدر تشوف شاشتي تمام؟'
    });
  }

  await new Promise(r => setTimeout(r, 7000));
  console.log(`Audio Chunks: ${audioCount}, Transcript: "${fullTranscript}"`);
  liveAudioService.disconnect();
}

testTamamQuestion().catch(console.error);

