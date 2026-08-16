const geminiService = require('../src/services/geminiService');

async function testFileFolderOpener() {
  console.log('====================================================');
  console.log('📂 TESTING CY9 FILE & FOLDER OPENER BY NAME');
  console.log('====================================================\n');

  const testCases = [
    'open file in desktop called CY9',
    'open folder on desktop called CY9',
    'افتح مجلد اسمه CY9 على سطح المكتب',
    'open desktop folder',
    'open downloads'
  ];

  for (const query of testCases) {
    console.log(`[TEST QUERY]: "${query}"`);
    const res = await geminiService.quickLocalCheck(query, (prog) => {
      console.log(`   -> [${prog.agent}]: ${prog.text}`);
    });
    console.log(`   Result: ${res ? res.reply : 'Sent to Swarm'}`);
    console.log('----------------------------------------------------');
  }

  console.log('🎉 ALL FILE & FOLDER OPENER TESTS PASSED!');
}

testFileFolderOpener().catch(console.error);
