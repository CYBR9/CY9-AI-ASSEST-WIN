const { GoogleGenAI } = require('@google/genai');
const memoryService = require('../src/services/memoryService');
const geminiService = require('../src/services/geminiService');

async function testTools() {
  const config = memoryService.getConfig();
  const ai = new GoogleGenAI({ apiKey: config.apiKey });
  const allTools = geminiService.toolsDefinition[0].functionDeclarations;
  console.log(`Total tools to test: ${allTools.length}`);

  // Test with all tools except end_live_call
  const filtered = allTools.filter(t => t.name !== 'end_live_call');
  
  try {
    const session = await ai.live.connect({
      model: 'gemini-3.1-flash-live-preview',
      config: {
        responseModalities: ['audio'],
        systemInstruction: { parts: [{ text: 'You are CY9 assistant.' }] },
        tools: [{ functionDeclarations: filtered }]
      },
      callbacks: {
        onopen: () => console.log('OPENED WITH FILTERED TOOLS!'),
        onclose: (e) => console.log('CLOSED:', e.code, e.reason),
        onerror: (e) => console.error('ERROR:', e)
      }
    });

    await new Promise(r => setTimeout(r, 3000));
    session.close();
  } catch (err) {
    console.error('Catch error:', err);
  }
}

testTools();
