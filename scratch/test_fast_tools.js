const { GoogleGenAI } = require('@google/genai');
const memoryService = require('../src/services/memoryService');
const geminiService = require('../src/services/geminiService');

async function testFast() {
  const config = memoryService.getConfig();
  const ai = new GoogleGenAI({ apiKey: config.apiKey });
  const allTools = geminiService.toolsDefinition[0].functionDeclarations;

  console.log('1. Testing with ZERO tools...');
  let res0 = await runSingleTest(ai, []);
  console.log('Zero tools result:', res0);

  console.log('\n2. Testing tools individually...');
  const badTools = [];
  for (let i = 0; i < allTools.length; i++) {
    const t = allTools[i];
    const res = await runSingleTest(ai, [t]);
    if (!res.ok) {
      console.log(`❌ Tool [${i}: ${t.name}] failed: ${res.reason}`);
      badTools.push({ index: i, name: t.name, reason: res.reason, tool: t });
    } else {
      process.stdout.write('.');
    }
  }

  console.log('\n\n--- SUMMARY ---');
  console.log(`Bad tools count: ${badTools.length} / ${allTools.length}`);
  console.log('Bad tools list:', JSON.stringify(badTools, null, 2));
}

function runSingleTest(ai, toolList) {
  return new Promise(async (resolve) => {
    let timer;
    let done = false;

    const finish = (result) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      resolve(result);
    };

    try {
      const config = {
        responseModalities: ['audio'],
        systemInstruction: { parts: [{ text: 'You are CY9 assistant.' }] }
      };
      if (toolList && toolList.length > 0) {
        config.tools = [{ functionDeclarations: toolList }];
      }

      const session = await ai.live.connect({
        model: 'gemini-3.1-flash-live-preview',
        config: config,
        callbacks: {
          onopen: () => {},
          onmessage: (msg) => {},
          onerror: (err) => {
            finish({ ok: false, reason: 'error: ' + (err?.message || err) });
          },
          onclose: (e) => {
            if (e?.code === 1011) {
              finish({ ok: false, reason: `1011 ${e?.reason || ''}` });
            } else if (e?.code !== 1000 && e?.code !== 1005) {
              finish({ ok: false, reason: `close code ${e?.code}: ${e?.reason}` });
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

testFast();
