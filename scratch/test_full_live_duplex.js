const liveAudioService = require('../src/services/liveAudioService');
const memoryService = require('../src/services/memoryService');
const geminiService = require('../src/services/geminiService');

async function testFullLiveDuplex() {
  console.log('=====================================================');
  console.log('🎙️ TESTING GEMINI LIVE DUPLEX AUDIO & FUNCTION CALLS');
  console.log('=====================================================\n');

  // 1. Check duplicate tools in geminiService
  const allTools = geminiService.toolsDefinition[0].functionDeclarations;
  const seen = new Set();
  const duplicates = [];
  for (const t of allTools) {
    if (seen.has(t.name)) duplicates.push(t.name);
    seen.add(t.name);
  }

  if (duplicates.length > 0) {
    console.warn('⚠️ Warning: Duplicate tool definitions detected:', duplicates);
  } else {
    console.log('✅ No duplicate tool definitions in geminiService.');
  }

  let audioChunksReceived = 0;
  let aiTranscript = '';
  let userTranscript = '';
  let statusHistory = [];

  const fakeWebContents = {
    send: (channel, data) => {
      if (channel === 'live:status') {
        statusHistory.push(data);
        console.log('📡 [Status Event]:', JSON.stringify(data));
      } else if (channel === 'live:audio-chunk') {
        audioChunksReceived++;
        if (audioChunksReceived === 1) {
          console.log('🔊 [First 24kHz Audio Chunk Received from Gemini Live!]');
        }
      } else if (channel === 'live:ai-transcript') {
        aiTranscript += data;
        console.log('🤖 [AI Transcript Chunk]:', data);
      } else if (channel === 'live:user-transcript') {
        userTranscript += data;
        console.log('🎙️ [User Transcript Chunk]:', data);
      } else if (channel === 'jarvis:progress') {
        console.log('⚡ [Tool Progress]:', data);
      }
    },
    isDestroyed: () => false
  };

  console.log('Connecting to LiveAudioService...');
  const res = await liveAudioService.connect(fakeWebContents);
  console.log('Connect return value:', res);

  if (!res.success) {
    console.error('❌ Connection failed:', res.message);
    process.exit(1);
  }

  // Wait 1.5s for session to be fully ready
  await new Promise(r => setTimeout(r, 1500));

  console.log('\nSending text prompt to live session...');
  if (liveAudioService.session) {
    try {
      liveAudioService.session.sendRealtimeInput({
        text: 'مرحبا، عرف عن نفسك بجملة واحدة قصيرة.'
      });
      console.log('Prompt sent. Waiting for audio & transcript response...');
    } catch (e) {
      console.error('Failed to send text input:', e);
    }
  }

  // Wait 7s to receive streaming audio chunks & transcript
  await new Promise(r => setTimeout(r, 7000));

  console.log('\n=====================================================');
  console.log('📊 LIVE CALL TEST RESULTS:');
  console.log(`- Audio chunks received: ${audioChunksReceived}`);
  console.log(`- AI transcript: "${aiTranscript.trim()}"`);
  console.log(`- Connection status: ${liveAudioService.isConnected ? 'CONNECTED' : 'DISCONNECTED'}`);
  console.log('=====================================================');

  liveAudioService.disconnect();

  if (audioChunksReceived > 0 || aiTranscript.length > 0) {
    console.log('🎉 LIVE CALL TEST PASSED WITH FLYING COLORS!');
  } else {
    console.log('❌ No audio or transcript received during test window.');
  }
}

testFullLiveDuplex().catch(console.error);
