const { GoogleGenAI } = require('@google/genai');
const memoryService = require('../src/services/memoryService');
const geminiService = require('../src/services/geminiService');

async function testBatch2Individual() {
  const config = memoryService.getConfig();
  const ai = new GoogleGenAI({ apiKey: config.apiKey });
  const allTools = geminiService.toolsDefinition[0].functionDeclarations;

  console.log('Testing tools 30 to 61 individually...');
  const badTools = [];

  for (let i = 30; i < allTools.length; i++) {
    const t = allTools[i];
    const res = await testTool(ai, t);
    if (!res.ok) {
      console.log(`❌ Tool #${i} [${t.name}] FAILED: ${res.reason}`);
      badTools.push({ index: i, name: t.name, schema: t });
    } else {
      console.log(`✅ Tool #${i} [${t.name}] OK`);
    }
  }

  console.log('\n--- Summary of bad tools ---');
  console.log(JSON.stringify(badTools, null, 2));
}

function testTool(ai, tool) {
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
          tools: [{ functionDeclarations: [tool] }]
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
      }, 1000);
    } catch (err) {
      finish({ ok: false, reason: 'catch: ' + err.message });
    }
  });
}

testBatch2Individual();
