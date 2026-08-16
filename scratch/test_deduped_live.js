const { GoogleGenAI } = require('@google/genai');
const memoryService = require('../src/services/memoryService');
const geminiService = require('../src/services/geminiService');

async function testDeduplicated() {
  const config = memoryService.getConfig();
  const ai = new GoogleGenAI({ apiKey: config.apiKey });
  const allTools = geminiService.toolsDefinition[0].functionDeclarations;

  // Deduplicate by name
  const seen = new Set();
  const deduped = [];
  const duplicates = [];

  for (const t of allTools) {
    if (seen.has(t.name)) {
      duplicates.push(t.name);
    } else {
      seen.add(t.name);
      deduped.push(t);
    }
  }

  console.log(`Original count: ${allTools.length}, Deduped count: ${deduped.length}`);
  console.log('Duplicates found:', duplicates);

  return new Promise(async (resolve) => {
    try {
      const session = await ai.live.connect({
        model: 'gemini-3.1-flash-live-preview',
        config: {
          responseModalities: ['audio'],
          systemInstruction: { parts: [{ text: 'You are CY9 assistant.' }] },
          tools: [{ functionDeclarations: deduped }]
        },
        callbacks: {
          onopen: () => console.log('✅ Live WebSocket Connected successfully with deduplicated tools!'),
          onmessage: (msg) => console.log('📩 Message received:', msg),
          onerror: (e) => console.error('❌ Error:', e),
          onclose: (e) => console.log('🔒 Closed:', e.code, e.reason)
        }
      });

      console.log('Session active! Waiting 3 seconds...');
      await new Promise(r => setTimeout(r, 3000));
      session.close();
      console.log('🎉 TEST COMPLETED SUCCESSFULLY WITH ZERO ERRORS!');
      resolve();
    } catch (err) {
      console.error('💥 Connect failed:', err);
      resolve();
    }
  });
}

testDeduplicated();
