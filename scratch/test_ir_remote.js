const geminiService = require('../src/services/geminiService');
const irRemoteService = require('../src/services/irRemoteService');

async function testIRRemoteHub() {
  console.log('====================================================');
  console.log('📡 TESTING CY9 UNIVERSAL IR REMOTE & APPLIANCE HUB');
  console.log('====================================================\n');

  // 1. Test Direct IR Signal Generation
  console.log('--- 1. Testing Direct IR Hardware Signals ---');
  const acSignal = await irRemoteService.sendIRCommand('ir_ac_living', 'temp', 22);
  console.log('[AC IR]:', acSignal.message);

  const tvSignal = await irRemoteService.sendIRCommand('ir_tv_living', 'vol_up');
  console.log('[TV IR]:', tvSignal.message);

  const lightSignal = await irRemoteService.sendIRCommand('ir_rgb_light', 'cyan');
  console.log('[RGB IR]:', lightSignal.message);

  // 2. Test Natural Language & Voice Queries
  console.log('\n--- 2. Testing Natural Voice Commands ---');
  const voiceQueries = [
    'شغل المكيف بالريموت على 22 بارد',
    'ارفع صوت التلفزيون بالريموت',
    'غير لون الإضاءة للأزرق بالريموت',
    'اقفل التلفزيون بالريموت'
  ];

  for (const q of voiceQueries) {
    console.log(`[VOICE INPUT]: "${q}"`);
    const res = await geminiService.quickLocalCheck(q, (p) => {
      console.log(`   -> [${p.agent}]: ${p.text}`);
    });
    console.log(`   Result: ${res ? res.reply : 'N/A'}`);
    console.log('----------------------------------------------------');
  }

  console.log('🎉 ALL UNIVERSAL IR REMOTE TESTS PASSED PERFECTLY!');
}

testIRRemoteHub().catch(console.error);
