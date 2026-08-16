const { GoogleGenAI } = require('@google/genai');
const memoryService = require('../src/services/memoryService');
const geminiService = require('../src/services/geminiService');

async function testToolsIsolation() {
  const config = memoryService.getConfig();
  const ai = new GoogleGenAI({ apiKey: config.apiKey });
  
  // Test 1: No tools
  console.log('--- Test 1: No tools ---');
  await testSession(ai, undefined);

  // Test 2: Tools schema inspection
  const allTools = geminiService.toolsDefinition[0].functionDeclarations;
  console.log(`Total tools defined: ${allTools.length}`);

  // Test tools in batches or individually
  let failingTools = [];
  for (let i = 0; i < allTools.length; i++) {
    const tool = allTools[i];
    const success = await testSession(ai, [{ functionDeclarations: [tool] }], tool.name);
    if (!success) {
      failingTools.push(tool.name);
    }
  }

  console.log('\n=======================================');
  console.log(`Failing tools count: ${failingTools.length}`);
  console.log('Failing tools:', failingTools);
  console.log('=======================================');
}

async function testSession(ai, tools, label = 'none') {
  return new Promise(async (resolve) => {
    let closed = false;
    let opened = false;
    let timeout;

    try {
      const session = await ai.live.connect({
        model: 'gemini-3.1-flash-live-preview',
        config: {
          responseModalities: ['audio'],
          systemInstruction: { parts: [{ text: 'You are CY9 assistant.' }] },
          ...(tools ? { tools } : {})
        },
        callbacks: {
          onopen: () => {
            opened = true;
          },
          onmessage: (msg) => {},
          onerror: (err) => {
            // console.error(`Error [${label}]:`, err);
          },
          onclose: (e) => {
            closed = true;
            clearTimeout(timeout);
            if (e?.code === 1011) {
              console.log(`❌ Tool [${label}] failed with close code 1011: ${e.reason}`);
              resolve(false);
            } else {
              // closed normally or other
              resolve(true);
            }
          }
        }
      });

      timeout = setTimeout(() => {
        if (!closed) {
          // survived 2 seconds without 1011
          // console.log(`✅ Tool [${label}] OK`);
          try { session.close(); } catch(e) {}
          resolve(true);
        }
      }, 1500);

    } catch (err) {
      console.log(`❌ Connect threw error [${label}]:`, err.message);
      resolve(false);
    }
  });
}

testToolsIsolation();
