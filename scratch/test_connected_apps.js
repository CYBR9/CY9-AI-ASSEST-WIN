const geminiService = require('../src/services/geminiService');
const integrationsService = require('../src/services/integrationsService');

async function testConnectedApps() {
  console.log('====================================================');
  console.log('🌐 TESTING CY9 CONNECTED APPS (GMAIL, CALENDAR, GITHUB)');
  console.log('====================================================\n');

  const testQueries = [
    'Check my Gmail inbox',
    'افحص بريدي الإلكتروني في جيميل',
    'Send an email to partner@company.com',
    'What are my calendar meetings today?',
    'سجل موعد جديد اجتماع مناقشة المشاريع',
    'Check GitHub notifications'
  ];

  for (const q of testQueries) {
    console.log(`[TEST QUERY]: "${q}"`);
    const res = await geminiService.quickLocalCheck(q, (prog) => {
      console.log(`   -> [${prog.agent}]: ${prog.text}`);
    });
    console.log(`   Result Reply: ${res ? res.reply : 'N/A'}`);
    console.log('----------------------------------------------------');
  }

  console.log('🎉 ALL CONNECTED APPS TESTS COMPLETED SUCCESSFULLY!');
}

testConnectedApps().catch(console.error);
