const { GoogleGenAI } = require('@google/genai');
const memoryService = require('../src/services/memoryService');
const geminiService = require('../src/services/geminiService');

async function debugLive() {
  const config = memoryService.getConfig();
  const ai = new GoogleGenAI({ apiKey: config.apiKey });
  
  console.log('Testing connect with full config and tools...');
  try {
    const session = await ai.live.connect({
      model: 'gemini-3.1-flash-live-preview',
      config: {
        responseModalities: ['audio'],
        systemInstruction: { parts: [{ text: 'You are CY9 assistant.' }] },
        tools: geminiService.toolsDefinition
      },
      callbacks: {
        onopen: () => console.log('✅ onopen fired!'),
        onmessage: (msg) => console.log('📩 onmessage:', JSON.stringify(msg)),
        onerror: (err) => console.error('❌ onerror:', err),
        onclose: (event) => console.log('🔒 onclose:', event?.code, event?.reason)
      }
    });

    console.log('Session connected object keys:', Object.keys(session));
    await new Promise(r => setTimeout(r, 4000));
    console.log('Closing session...');
    session.close();
  } catch (err) {
    console.error('💥 Catch error:', err);
  }
}

debugLive();
