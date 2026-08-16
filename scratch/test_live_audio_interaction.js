const liveAudioService = require('../src/services/liveAudioService');
const memoryService = require('../src/services/memoryService');

async function testLiveInteraction() {
  console.log('Testing live interaction with audio...');
  
  let audioChunksReceived = 0;
  let aiTranscript = '';
  
  const res = await liveAudioService.connect({
    send: (channel, data) => {
      if (channel === 'live:audio-chunk') {
        audioChunksReceived++;
      } else if (channel === 'live:ai-transcript') {
        aiTranscript += data;
        console.log('AI Transcript:', data);
      } else if (channel === 'live:status') {
        console.log('Live Status:', data);
      }
    },
    isDestroyed: () => false
  });

  console.log('Connected:', res);

  // Send 1 second of 16kHz PCM audio
  const fakePcm = Buffer.alloc(16000 * 2).toString('base64');
  console.log('Sending audio chunk...');
  liveAudioService.sendAudioChunk(fakePcm);

  // Also send text to prompt a response
  console.log('Sending text input...');
  if (liveAudioService.session) {
    liveAudioService.session.sendRealtimeInput({
      text: 'مرحبا جيميني، هل تسمعني؟ قل نعم بكلمة واحدة.'
    });
  }

  await new Promise(r => setTimeout(r, 6000));
  console.log(`Summary: Audio Chunks Received: ${audioChunksReceived}, AI Transcript: "${aiTranscript}"`);
  liveAudioService.disconnect();
}

testLiveInteraction().catch(console.error);
