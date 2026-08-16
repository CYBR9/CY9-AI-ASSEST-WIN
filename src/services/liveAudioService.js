const { GoogleGenAI } = require('@google/genai');
const memoryService = require('./memoryService');
const agentManager = require('./agentManager');
const geminiService = require('./geminiService');

class LiveAudioService {
  constructor() {
    this.session = null;
    this.isConnected = false;
    this.webContents = null;
  }

  async connect(webContents) {
    if (this.isConnected && this.session) {
      return { success: true, message: 'Live session already connected.' };
    }

    this.webContents = webContents;
    const config = memoryService.getConfig();
    const apiKey = config.apiKey || process.env.GEMINI_API_KEY;
    const userName = config.userName || 'Sir';

    if (!apiKey) {
      return { success: false, message: 'No Gemini API Key found in settings.' };
    }

    try {
      const ai = new GoogleGenAI({ apiKey });
      const systemInstructionText = `You are CY9, an ultra-advanced autonomous AI executive in a live bidirectional voice and vision call with ${userName}.
You are DEEPLY INTEGRATED into ${userName}'s Windows 11 workstation, display screen, and connected smart ecosystem.

CRITICAL DIRECTIVE ON PERMISSIONS & DEVICE CONTROL:
- You have FULL PERMISSION, complete authority, and native tools to control this Windows computer, mouse cursor, keyboard, and connected appliances.
- NEVER say "I don't have permission to control your device" or "I cannot access your computer". You have tools provided in your function declarations.

MOUSE & KEYBOARD RPA AUTOMATION:
- When ${userName} asks you to move the mouse, click left, click right (context menu), double-click, scroll up/down, drag, or type text, IMMEDIATELY invoke:
  * 'mouse_move' (to move cursor)
  * 'mouse_click' (left, right, or middle click)
  * 'mouse_double_click' (to open files/apps)
  * 'mouse_scroll' (to scroll pages/documents)
  * 'mouse_drag' (to drag & drop)
  * 'keyboard_type' (to type text)
  * 'keyboard_press' (to press hotkeys e.g. enter, esc, win, ctrl+c, ctrl+v).

LIVE SCREEN VISION & MULTI-AGENT COLLABORATION:
- You receive real-time screen frames and can call 'inspect_screen' to inspect whatever window or content ${userName} is looking at.
- When ${userName} asks "هل تشوف شاشتي؟" (Can you see my screen?) or asks questions about the screen, describe what you see naturally and concisely in voice!
- You orchestrate 6 specialized AI sub-agents (System Agent, Vision Agent, Research Agent, Smart Home Agent, Integrations Agent, Memory Agent). You coordinate and delegate sub-tasks to them seamlessly.
- Whenever ${userName} says "وريني" (Show me), "اطبع على الشاشة", or asks for data/reports/tables/plans, invoke 'show_on_center_screen' to render a prominent, formatted executive card on the big central HUD display.

AI PROMPT ENGINEERING & CODE PROJECT BLUEPRINTS:
- Whenever ${userName} asks you to write, craft, design, or synthesize a prompt for a programming project, software architecture, or coding task (e.g. "اكتب لي برومبت لمشروع", "اصنع لي prompt جبار لبرمجة تطبيق", "برومبت لـ Cursor / Windsurf / Claude"), IMMEDIATELY invoke 'create_programming_prompt' with the project details.
- This will automatically compile a master-tier production-grade prompt specification and render it directly on the big Center Screen with a 1-click copy button! Tell ${userName} that you have generated a master prompt on the main screen ready to copy.

CRITICAL DIRECTIVE ON ENDING / CLOSING THE CALL:
- ONLY invoke 'end_live_call' when ${userName} EXPLICITLY commands you to end/hang up the phone call (e.g. "اقفل المكالمة", "قفل الخط", "سكر المكالمة", "مع السلامة اقفل الخط", "Close the call now").
- NEVER invoke 'end_live_call' when ${userName} says "تمام", "أوك", "شكرا", "واضح", or when asking if you see the screen! Continue the live call and answer their questions attentively.

- Speak concisely, naturally, with elegance, warmth, and respectful Saudi/Gulf or Modern Standard Arabic flair ("حاضر يا سيدي", "أبشر", "أنا أشاهد شاشتك بوضوح", "Right away, Sir").`;

      this.session = await ai.live.connect({
        model: 'gemini-3.1-flash-live-preview',
        config: {
          responseModalities: ['audio'],
          systemInstruction: { parts: [{ text: systemInstructionText }] },
          tools: geminiService.toolsDefinition
        },
        callbacks: {
          onopen: () => {
            this.isConnected = true;
            if (this.webContents && !this.webContents.isDestroyed()) {
              this.webContents.send('live:status', { connected: true });
            }
          },
          onmessage: async (response) => {
            if (!this.webContents || this.webContents.isDestroyed()) return;

            const content = response.serverContent;
            if (content) {
              // 1. Stream 24kHz PCM Audio Chunks
              if (content.modelTurn?.parts) {
                for (const part of content.modelTurn.parts) {
                  if (part.inlineData && part.inlineData.data) {
                    this.webContents.send('live:audio-chunk', part.inlineData.data);
                  }
                }
              }

              // 2. Real-time Transcriptions
              if (content.inputTranscription?.text) {
                this.webContents.send('live:user-transcript', content.inputTranscription.text);
              }
              if (content.outputTranscription?.text) {
                this.webContents.send('live:ai-transcript', content.outputTranscription.text);
              }

              // 3. User Interruption Handling (User spoke while AI was speaking)
              if (content.interrupted) {
                this.webContents.send('live:interrupted');
              }
            }

            // 4. Synchronous Live Function Calling
            const toolCall = response.toolCall;
            if (toolCall?.functionCalls && toolCall.functionCalls.length > 0) {
              const functionResponses = [];
              let shouldHangUp = false;
              for (const fc of toolCall.functionCalls) {
                if (fc.name === 'end_live_call' || fc.name === 'hang_up_call') {
                  shouldHangUp = true;
                }
                let execResult = null;
                try {
                  execResult = await agentManager.executeTool(fc.name, fc.args || {}, (prog) => {
                    if (this.webContents && !this.webContents.isDestroyed()) {
                      this.webContents.send('cy9:progress', prog);
                    }
                  });
                } catch (toolErr) {
                  console.error(`Live tool ${fc.name} error:`, toolErr);
                  execResult = { success: false, message: `Tool execution failed: ${toolErr.message}` };
                }

                functionResponses.push({
                  id: fc.id,
                  name: fc.name,
                  response: { result: execResult }
                });
              }
              if (this.session && this.isConnected) {
                try {
                  this.session.sendToolResponse({ functionResponses });
                } catch (te) {
                  console.warn('Live tool response error:', te.message);
                }
              }
              if (shouldHangUp) {
                setTimeout(() => {
                  this.disconnect();
                }, 1000);
              }
            }
          },
          onerror: (error) => {
            console.error('Live Audio Session error:', error);
            this.isConnected = false;
            if (this.webContents && !this.webContents.isDestroyed()) {
              this.webContents.send('live:status', { connected: false, error: error.message });
            }
          },
          onclose: () => {
            this.isConnected = false;
            this.session = null;
            if (this.webContents && !this.webContents.isDestroyed()) {
              this.webContents.send('live:status', { connected: false });
            }
          }
        }
      });

      return { success: true, message: 'Live Audio Duplex uplink established.' };
    } catch (err) {
      this.isConnected = false;
      this.session = null;
      return { success: false, message: `Live connect failed: ${err.message}` };
    }
  }

  sendAudioChunk(pcm16kBase64) {
    if (!this.isConnected || !this.session) return false;
    try {
      this.session.sendRealtimeInput({
        audio: {
          data: pcm16kBase64,
          mimeType: 'audio/pcm;rate=16000'
        }
      });
      return true;
    } catch (e) {
      console.warn('Failed to send live audio chunk:', e.message);
      return false;
    }
  }

  sendVideoChunk(imagePayload) {
    if (!this.isConnected || !this.session) return false;
    try {
      let rawBase64 = '';
      let mimeType = 'image/jpeg';

      if (typeof imagePayload === 'object' && imagePayload !== null) {
        rawBase64 = imagePayload.base64 || imagePayload.data || '';
        mimeType = imagePayload.mimeType || 'image/jpeg';
      } else if (typeof imagePayload === 'string') {
        rawBase64 = imagePayload;
        if (rawBase64.startsWith('data:image/png;base64,')) {
          mimeType = 'image/png';
        }
      }

      // Clean base64 string
      const cleanBase64 = (rawBase64 || '').replace(/^data:image\/[a-z]+;base64,/, '').trim();
      if (!cleanBase64) return false;

      this.session.sendRealtimeInput({
        video: {
          data: cleanBase64,
          mimeType: mimeType
        }
      });
      return true;
    } catch (e) {
      console.warn('Failed to send live screen frame:', e.message);
      return false;
    }
  }

  disconnect() {
    this.isConnected = false;
    if (this.session) {
      try {
        this.session.close();
      } catch (e) {}
      this.session = null;
    }
    if (this.webContents && !this.webContents.isDestroyed()) {
      this.webContents.send('live:status', { connected: false });
    }
    return { success: true, message: 'Live duplex disconnected.' };
  }
}

module.exports = new LiveAudioService();
