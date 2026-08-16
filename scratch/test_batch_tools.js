const { GoogleGenAI } = require('@google/genai');
const memoryService = require('../src/services/memoryService');
const geminiService = require('../src/services/geminiService');

async function testBatches() {
  const config = memoryService.getConfig();
  const ai = new GoogleGenAI({ apiKey: config.apiKey });
  const allTools = geminiService.toolsDefinition[0].functionDeclarations;

  console.log(`Total tools: ${allTools.length}`);

  console.log('Testing Batch 1 (0 to 30)...');
  const b1 = await testGroup(ai, allTools.slice(0, 30));
  console.log('Batch 1 result:', b1);

  console.log('Testing Batch 2 (30 to 61)...');
  const b2 = await testGroup(ai, allTools.slice(30));
  console.log('Batch 2 result:', b2);

  console.log('Testing All Tools (0 to 61)...');
  const bAll = await testGroup(ai, allTools);
  console.log('All tools result:', bAll);
}

function testGroup(ai, tools) {
  return new Promise(async (resolve) => {
    let finished = false;
    let timer;
    const finish = (val) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      resolve(val);
    };

    try {
      const session = await ai.live.connect({
        model: 'gemini-3.1-flash-live-preview',
        config: {
          responseModalities: ['audio'],
          systemInstruction: { parts: [{ text: 'You are CY9 assistant.' }] },
          tools: [{ functionDeclarations: tools }]
        },
        callbacks: {
          onopen: () => {},
          onmessage: () => {},
          onerror: (e) => finish({ ok: false, reason: 'error: ' + (e?.message || e) }),
          onclose: (e) => {
            if (e?.code === 1011) {
              finish({ ok: false, reason: `1011 ${e?.reason || ''}` });
            } else if (e?.code !== 1000 && e?.code !== 1005) {
              finish({ ok: false, reason: `close ${e?.code}: ${e?.reason}` });
            }
          }
        }
      });

      timer = setTimeout(() => {
        try { session.close(); } catch(e) {}
        finish({ ok: true });
      }, 1500);
    } catch (err) {
      finish({ ok: false, reason: 'catch: ' + err.message });
    }
  });
}

testBatches();
