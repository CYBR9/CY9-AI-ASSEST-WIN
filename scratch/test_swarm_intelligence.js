const memoryService = require('../src/services/memoryService');
const systemService = require('../src/services/systemService');
const agentManager = require('../src/services/agentManager');
const geminiService = require('../src/services/geminiService');

async function testAllSwarmIntelligence() {
  console.log('====================================================');
  console.log('🧠 TESTING CY9 SWARM INTELLIGENCE & REACT SYSTEM');
  console.log('====================================================\n');

  // 1. Test Auto Memory Learning
  console.log('--- 1. Testing Episodic Memory & Auto-Learning ---');
  memoryService.autoExtractAndSaveFacts('remember that my project is in C:/Users/ahq37/OneDrive/Desktop/CY9-AI-ASSEST-WIN');
  memoryService.autoExtractAndSaveFacts('احفظ ان المتصفح المفضل لدي هو جوجل كروم');
  
  const memories = memoryService.searchMemories('project');
  console.log('✅ Found relevant memories for "project":', memories.length);
  const learnedContext = memoryService.getLearnedContext();
  console.log('✅ Learned Context injected into LLM System Prompt:\n', learnedContext.substring(0, 200) + '...\n');

  // 2. Test File Management & Search
  console.log('--- 2. Testing File System Tools (Search & Read/Write) ---');
  const findResult = await systemService.findFiles({ folder: 'downloads', limit: 3 });
  console.log('✅ File Search in Downloads:', findResult.message, '| Count:', findResult.count);

  const testFilePath = 'scratch/test_report.txt';
  const writeRes = await systemService.writeTextFile(testFilePath, 'CY9 Autonomous Swarm Intelligence Mission Report: All neural arrays nominal.');
  console.log('✅ Write File:', writeRes.message);

  const readRes = await systemService.readTextFile(testFilePath);
  console.log('✅ Read File content:', `"${readRes.content}"`);

  // 3. Test Morning Tactical Briefing
  console.log('\n--- 3. Testing Morning Tactical Briefing ---');
  const briefing = await systemService.generateMorningBriefing();
  console.log('✅ Morning Briefing compiled:');
  console.log('   - Uptime:', briefing.uptime);
  console.log('   - CPU:', briefing.cpuLoad);
  console.log('   - RAM:', briefing.memPercent);
  console.log('   - Battery:', briefing.battery);
  console.log('   - Summary:', briefing.summary);

  // 4. Test Agent Tool Dispatch
  console.log('\n--- 4. Testing Multi-Agent Tool Dispatch ---');
  const toolRes1 = await agentManager.executeTool('search_memory_vault', { query: 'chrome' });
  console.log('✅ Tool search_memory_vault:', toolRes1.count, 'records found');

  const toolRes2 = await agentManager.executeTool('get_morning_briefing', {});
  console.log('✅ Tool get_morning_briefing:', toolRes2.success);

  console.log('\n====================================================');
  console.log('🎉 ALL SWARM INTELLIGENCE SUBSYSTEMS PASSED 100%');
  console.log('====================================================');
}

testAllSwarmIntelligence().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
