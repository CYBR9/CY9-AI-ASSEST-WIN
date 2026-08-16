const liveAudioService = require('../src/services/liveAudioService');
const memoryService = require('../src/services/memoryService');

async function testLiveConnect() {
  console.log('Testing live connect...');
  const config = memoryService.getConfig();
  console.log('API Key present:', !!config.apiKey);
  
  const res = await liveAudioService.connect({
    send: (channel, data) => {
      console.log('IPC sent:', channel, typeof data === 'object' ? JSON.stringify(data) : data);
    },
    isDestroyed: () => false
  });

  console.log('Connect result:', res);
}

testLiveConnect().catch(console.error);
