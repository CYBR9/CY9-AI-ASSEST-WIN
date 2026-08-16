const promptEngineeringService = require('../src/services/promptEngineeringService');
const agentManager = require('../src/services/agentManager');
const geminiService = require('../src/services/geminiService');

async function testPromptArchitect() {
  console.log('====================================================');
  console.log('💻 TESTING AI CODING PROMPT ARCHITECT SERVICE');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;

  function assert(name, condition, details = '') {
    total++;
    if (condition) {
      console.log(`✅ [PASS] ${name} ${details ? '(' + details + ')' : ''}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${name} ${details ? '(' + details + ')' : ''}`);
    }
  }

  // 1. Direct Service Call
  console.log('--- 1. Testing promptEngineeringService.generateProjectPrompt ---');
  const res1 = promptEngineeringService.generateProjectPrompt({
    project_description: 'منصة مزادات وتجارة الكترونية فورية مع بث مباشر ومحافظ رقمية',
    tech_stack: 'Next.js 14, TypeScript, Prisma, PostgreSQL, TailwindCSS, Socket.io',
    target_ai: 'Cursor & Claude 3.5 Sonnet',
    project_type: 'fullstack',
    language: 'ar',
    save_to_file: true
  });

  assert('Prompt Generated Successfully', res1 && res1.success);
  assert('Prompt Length is Rich & Comprehensive', res1.promptMarkdown && res1.promptMarkdown.length > 500, `${res1.promptMarkdown.length} chars`);
  assert('Contains Role & Objective', res1.promptMarkdown.includes('ROLE & CORE OBJECTIVE'));
  assert('Contains Tech Stack', res1.promptMarkdown.includes('Next.js 14'));
  assert('Contains Directory Tree', res1.promptMarkdown.includes('src/'));
  assert('Contains Design Tokens & Colors', res1.promptMarkdown.includes('#00f0ff'));
  assert('Contains Step-by-Step Protocol', res1.promptMarkdown.includes('Phase 1'));
  assert('Saved to Desktop as File', typeof res1.savedFilePath === 'string', res1.savedFilePath);

  // 2. Agent Manager Tool Execution
  console.log('\n--- 2. Testing agentManager.executeTool("create_programming_prompt") ---');
  let capturedCenterCard = null;
  const agentRes = await agentManager.executeTool('create_programming_prompt', {
    project_description: 'تطبيق ذكاء اصطناعي لتحليل البيانات والرسوم البيانية',
    target_ai: 'Antigravity'
  }, (prog) => {
    if (prog.centerCard) {
      capturedCenterCard = prog.centerCard;
    }
  });

  assert('Agent Tool Success', agentRes && agentRes.success);
  assert('Center Card Emitted for Big Screen', capturedCenterCard !== null, capturedCenterCard?.title);
  assert('Center Card Contains Prompt', capturedCenterCard && capturedCenterCard.content.length > 300);

  // 3. Local Intent Processing
  console.log('\n--- 3. Testing Local NLP Intent for Prompt Request ---');
  const nlpRes = await geminiService.fallbackLocalHandler('اصنع لي برومبت جبار لتطبيق توصيل طلبات مع تتبع حي للخرائط');
  assert('Local NLP Intent Response', nlpRes && nlpRes.success, nlpRes.reply?.slice(0, 60));

  console.log('\n====================================================');
  console.log(`📊 TEST SUMMARY: ${passed} / ${total} CHECKS PASSED (${Math.round((passed/total)*100)}%)`);
  console.log('====================================================\n');

  if (passed === total) {
    console.log('🎉 AI PROMPT ARCHITECT ENGINE IS 100% OPERATIONAL!');
  } else {
    process.exit(1);
  }
}

testPromptArchitect().catch(err => {
  console.error('Fatal Prompt Architect Test Error:', err);
  process.exit(1);
});
