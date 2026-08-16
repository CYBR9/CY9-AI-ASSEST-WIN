const geminiService = require('../src/services/geminiService');
const agentManager = require('../src/services/agentManager');
const liveAudioService = require('../src/services/liveAudioService');

async function testLiveHangup() {
  console.log('====================================================');
  console.log('📞 TESTING GEMINI LIVE CALL VOICE HANGUP TOOL');
  console.log('====================================================\n');

  // 1. Verify tool exists in toolsDefinition
  const decls = geminiService.toolsDefinition[0].functionDeclarations;
  const hangupTool = decls.find(t => t.name === 'end_live_call');
  
  if (hangupTool) {
    console.log('✅ [PASS] Tool "end_live_call" declared in Gemini function declarations:');
    console.log(`   Description: ${hangupTool.description}`);
  } else {
    console.error('❌ [FAIL] "end_live_call" NOT found in functionDeclarations!');
    process.exit(1);
  }

  // 2. Test execution of end_live_call
  console.log('\n2. Testing agentManager execution of "end_live_call":');
  const result = await agentManager.executeTool('end_live_call', { farewell: 'مع السلامة يا سيدي' }, (prog) => {
    console.log(`   [Progress]: ${prog.agent} -> ${prog.text}`);
  });

  console.log('   Execution Output:', result);

  if (result.success) {
    console.log('\n✅ [PASS] Live call hangup tool executed successfully!');
  } else {
    console.error('\n❌ [FAIL] Live call hangup returned failure:', result);
    process.exit(1);
  }

  console.log('\n🎉 ALL LIVE CALL HANGUP TESTS PASSED SUCCESSFULLY!');
}

testLiveHangup().catch(console.error);
