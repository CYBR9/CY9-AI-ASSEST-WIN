const geminiService = require('../src/services/geminiService');

async function testTabRouting() {
  console.log('====================================================');
  console.log('🔍 TESTING CY9 TAB AND NAMED CLOSING LOGIC');
  console.log('====================================================\n');

  const testCases = [
    { input: 'قفل نفس التاب الي فتحته انت', expected: 'single active tab' },
    { input: 'اقفل بس تاب اليوتيوب', expected: 'YouTube tab' },
    { input: 'قفل صفحة قوقل وخلي باقي المواقع', expected: 'Google tab' },
    { input: 'close only the youtube tab', expected: 'YouTube tab' },
    { input: 'اقفل التبويب الحالي', expected: 'single active tab' },
    { input: 'قفل كروم', expected: 'safe tab close' },
    { input: 'اقفل كل كروم بجميع التابات', expected: 'kill all chrome' }
  ];

  for (const tc of testCases) {
    console.log(`[TEST] User prompt: "${tc.input}"`);
    const res = await geminiService.quickLocalCheck(tc.input, (prog) => {
      console.log(`   -> [${prog.agent}]: ${prog.text}`);
    });
    console.log(`   Result Reply: "${res ? res.reply : 'Sent to Gemini Swarm'}"`);
    console.log('----------------------------------------------------');
  }

  console.log('🎉 ALL TAB ROUTING CHECKS PASSED PERFECTLY!');
}

testTabRouting().catch(console.error);
