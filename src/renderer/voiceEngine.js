class VoiceEngine {
  constructor() {
    this.synthesis = typeof window !== 'undefined' ? window.speechSynthesis : null;
    this.recognition = null;
    this.isListening = false;
    this.isSpeaking = false;
    this.voices = [];
    this.selectedVoice = null;
    this.arabicVoice = null;
    this.englishVoice = null;
    this.language = 'ar'; // 'ar', 'en', 'auto'
    this.onStateChange = () => {};
    this.onAudioWave = () => {};

    this.isContinuous = false;
    this.wakeWordCallback = null;
    if (typeof window !== 'undefined') {
      this.initVoices();
      this.initRecognition();
    }
  }

  initVoices() {
    if (!this.synthesis) return;
    const loadVoices = () => {
      this.voices = this.synthesis.getVoices();
      
      // 1. Find Best Arabic Voice (e.g. Saudi, Egyptian, Gulf, Arabic)
      this.arabicVoice = 
        this.voices.find(v => v.lang === 'ar-SA' || v.lang === 'ar_SA') ||
        this.voices.find(v => v.lang.startsWith('ar')) ||
        this.voices.find(v => v.name.toLowerCase().includes('arabic') || v.name.toLowerCase().includes('naayf') || v.name.toLowerCase().includes('hoda') || v.name.toLowerCase().includes('salma') || v.name.toLowerCase().includes('maged') || v.name.toLowerCase().includes('laila') || v.name.toLowerCase().includes('tarik'));

      // 2. Find Best English Voice (British Male / Natural)
      this.englishVoice = 
        this.voices.find(v => (v.lang === 'en-GB' || v.lang === 'en_GB') && (v.name.includes('Male') || v.name.includes('George') || v.name.includes('David') || v.name.includes('Oliver') || v.name.includes('Natural'))) ||
        this.voices.find(v => v.lang === 'en-GB' || v.lang === 'en_GB') ||
        this.voices.find(v => v.lang.startsWith('en')) ||
        this.voices[0];

      // Set default selected voice according to current language
      this.updateVoiceSelection();
    };

    loadVoices();
    if (this.synthesis.onvoiceschanged !== undefined) {
      this.synthesis.onvoiceschanged = loadVoices;
    }
  }

  updateVoiceSelection() {
    if (this.language === 'ar') {
      this.selectedVoice = this.arabicVoice || this.englishVoice || this.voices[0];
    } else {
      this.selectedVoice = this.englishVoice || this.arabicVoice || this.voices[0];
    }
  }

  setLanguage(lang) {
    this.language = lang || 'ar';
    this.updateVoiceSelection();
    if (this.recognition) {
      if (this.language === 'ar') {
        this.recognition.lang = 'ar-SA';
      } else if (this.language === 'en') {
        this.recognition.lang = 'en-US';
      } else {
        this.recognition.lang = 'ar-SA'; // default auto to Arabic
      }
    }
  }

  getAvailableVoices() {
    return this.voices;
  }

  setVoice(voiceURI) {
    const found = this.voices.find(v => v.voiceURI === voiceURI || v.name === voiceURI);
    if (found) {
      this.selectedVoice = found;
      if (found.lang.startsWith('ar')) {
        this.arabicVoice = found;
      } else {
        this.englishVoice = found;
      }
    }
  }

  initRecognition() {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('SpeechRecognition not supported in this environment');
      return;
    }

    try {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = this.language === 'en' ? 'en-US' : 'ar-SA';

      this.recognition.onstart = () => {
        this.isListening = true;
        this.onStateChange('listening');
      };

      this.accumulatedText = '';
      this.recognition.onresult = (event) => {
        let sessionFinal = '';
        let sessionInterim = '';

        for (let i = 0; i < event.results.length; i++) {
          const piece = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            sessionFinal += piece + ' ';
          } else {
            sessionInterim += piece;
          }
        }

        const fullText = (this.accumulatedText + ' ' + sessionFinal + ' ' + sessionInterim).replace(/\s+/g, ' ').trim();
        this.latestTranscript = fullText;
        const isFinal = !!sessionFinal && !sessionInterim;

        if (this.onResultCallback && fullText) {
          this.onResultCallback(fullText, isFinal);
        }
      };

      this.recognition.onerror = (event) => {
        if (event.error !== 'no-speech') {
          console.warn('Speech recognition notice:', event.error);
        }
        // Auto-reconnect if temporary network or silence error occurs while recording is ON
        if (this.isListening && !this.isSpeaking) {
          if (this.latestTranscript) {
            this.accumulatedText = this.latestTranscript;
          }
          try {
            this.recognition.start();
          } catch (e) {}
        }
      };

      this.recognition.onend = () => {
        // Stay recording continuously until the user clicks stop, preserving all words
        if (this.isListening && !this.isSpeaking) {
          if (this.latestTranscript) {
            this.accumulatedText = this.latestTranscript;
          }
          try {
            this.recognition.start();
          } catch (e) {}
        }
      };
    } catch (e) {
      console.warn('Failed to initialize speech recognition:', e);
    }
  }

  async startMicrophoneAnalysis() {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      this.startSimulatedWave();
      return;
    }
    try {
      if (this.audioStream) {
        this.audioStream.getTracks().forEach(t => t.stop());
      }
      this.audioStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) {
        this.startSimulatedWave();
        return;
      }
      if (!this.audioCtx || this.audioCtx.state === 'closed') {
        this.audioCtx = new AudioCtx({ sampleRate: 16000 });
      }
      if (this.audioCtx.state === 'suspended') {
        await this.audioCtx.resume();
      }

      this.sampleRate = this.audioCtx.sampleRate || 16000;
      this.pcmChunks = [];

      const source = this.audioCtx.createMediaStreamSource(this.audioStream);
      
      // Analyser for visual equalizer bars
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 64;
      source.connect(this.analyser);

      // Mute gain node to prevent microphone speaker feedback
      this.muteGain = this.audioCtx.createGain();
      this.muteGain.gain.value = 0;

      // ScriptProcessor for PCM audio recording
      this.pcmProcessor = this.audioCtx.createScriptProcessor(4096, 1, 1);
      this.pcmProcessor.onaudioprocess = (e) => {
        if (!this.isListening) return;
        const inputData = e.inputBuffer.getChannelData(0);
        this.pcmChunks.push(new Float32Array(inputData));
      };

      source.connect(this.pcmProcessor);
      this.pcmProcessor.connect(this.muteGain);
      this.muteGain.connect(this.audioCtx.destination);

      // Secondary MediaRecorder buffer for 100% redundancy
      this.mediaRecorderChunks = [];
      if (typeof MediaRecorder !== 'undefined') {
        try {
          this.mediaRecorder = new MediaRecorder(this.audioStream);
          this.mediaRecorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) this.mediaRecorderChunks.push(e.data);
          };
          this.mediaRecorder.start(100);
        } catch (mrErr) {
          console.warn('MediaRecorder notice:', mrErr);
        }
      }

      const bufferLength = this.analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateAnalysis = () => {
        if (!this.isListening) return;
        this.analyser.getByteFrequencyData(dataArray);
        const bars = [];
        for (let i = 0; i < 16; i++) {
          const val = (dataArray[i % bufferLength] || 0) / 255;
          bars.push(Math.max(0.1, Math.min(1.0, val * 1.6)));
        }
        this.onAudioWave(bars);
        this.micAnimFrame = requestAnimationFrame(updateAnalysis);
      };
      updateAnalysis();
    } catch (e) {
      console.warn('Microphone access warning:', e);
      this.startSimulatedWave();
    }
  }

  encodeWAV(samples, sampleRate) {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);

    const writeString = (offset, string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + samples.length * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM format
    view.setUint16(22, 1, true); // Mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true); // 16-bit
    writeString(36, 'data');
    view.setUint32(40, samples.length * 2, true);

    let offset = 44;
    for (let i = 0; i < samples.length; i++) {
      const s = Math.max(-1, Math.min(1, samples[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
      offset += 2;
    }

    return buffer;
  }

  async stopListeningAndGetAudio() {
    this.isContinuous = false;
    this.isListening = false;

    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {}
    }

    if (this.micAnimFrame) {
      cancelAnimationFrame(this.micAnimFrame);
      this.micAnimFrame = null;
    }
    if (this.micInterval) {
      clearInterval(this.micInterval);
      this.micInterval = null;
    }

    let wavBase64 = null;
    if (this.pcmChunks && this.pcmChunks.length > 0) {
      let totalSamples = 0;
      for (const c of this.pcmChunks) totalSamples += c.length;
      const merged = new Float32Array(totalSamples);
      let pcmOffset = 0;
      for (const c of this.pcmChunks) {
        merged.set(c, pcmOffset);
        pcmOffset += c.length;
      }

      // Check if user actually spoke (RMS volume calculation)
      let sumSquares = 0;
      for (let i = 0; i < merged.length; i++) sumSquares += merged[i] * merged[i];
      const rms = Math.sqrt(sumSquares / (merged.length || 1));

      const wavBuffer = this.encodeWAV(merged, this.sampleRate || 16000);
      
      // Convert ArrayBuffer to Base64 in browser
      let binary = '';
      const bytes = new Uint8Array(wavBuffer);
      const len = bytes.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      wavBase64 = window.btoa(binary);
    }

    let mimeType = 'audio/wav';
    if (!wavBase64 && this.mediaRecorderChunks && this.mediaRecorderChunks.length > 0) {
      try {
        const blob = new Blob(this.mediaRecorderChunks, { type: 'audio/webm' });
        const arrayBuffer = await blob.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        wavBase64 = window.btoa(binary);
        mimeType = 'audio/webm';
      } catch (e) {}
    }

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
      } catch (e) {}
    }

    if (this.pcmProcessor) {
      try {
        this.pcmProcessor.disconnect();
        this.pcmProcessor.onaudioprocess = null;
      } catch (e) {}
      this.pcmProcessor = null;
    }
    if (this.audioStream) {
      try {
        this.audioStream.getTracks().forEach(t => t.stop());
      } catch (e) {}
      this.audioStream = null;
    }

    this.onAudioWave(Array(16).fill(0.05));
    if (!this.isSpeaking) {
      this.onStateChange('idle');
    }

    return {
      base64: wavBase64,
      mimeType: mimeType,
      transcript: this.latestTranscript || ''
    };
  }

  startSimulatedWave() {
    if (this.micInterval) clearInterval(this.micInterval);
    this.micInterval = setInterval(() => {
      if (!this.isListening) {
        clearInterval(this.micInterval);
        return;
      }
      const fakeLevels = Array.from({ length: 16 }, () => Math.random() * 0.7 + 0.15);
      this.onAudioWave(fakeLevels);
    }, 90);
  }

  stopMicrophoneAnalysis() {
    if (this.micAnimFrame) {
      cancelAnimationFrame(this.micAnimFrame);
      this.micAnimFrame = null;
    }
    if (this.micInterval) {
      clearInterval(this.micInterval);
      this.micInterval = null;
    }
    if (this.audioStream) {
      try {
        this.audioStream.getTracks().forEach(t => t.stop());
      } catch (e) {}
      this.audioStream = null;
    }
  }

  setContinuousMode(enabled, onResult) {
    this.isContinuous = !!enabled;
    this.onResultCallback = onResult;
    if (this.isContinuous) {
      this.startListening(onResult);
    } else {
      this.stopListening();
    }
  }

  startListening(onResult) {
    if (!this.recognition) {
      this.initRecognition();
    }
    this.latestTranscript = '';
    this.accumulatedText = '';
    this.isListening = true;
    this.onResultCallback = onResult;
    this.onStateChange('listening');

    if (this.recognition) {
      try {
        if (this.isSpeaking) this.stopSpeaking();
        this.recognition.lang = this.language === 'en' ? 'en-US' : 'ar-SA';
        this.recognition.start();
      } catch (e) {
        // already started or retry
      }
    }
    this.startMicrophoneAnalysis();
  }

  getLatestTranscript() {
    return this.latestTranscript || '';
  }

  stopListening() {
    this.isContinuous = false;
    this.isListening = false;
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
      } catch (e) {}
    }
    if (this.recognition) {
      try {
        this.recognition.stop();
        this.recognition.abort();
      } catch (e) {}
    }
    this.stopMicrophoneAnalysis();
    this.onAudioWave(Array(16).fill(0.05));
    if (!this.isSpeaking) {
      this.onStateChange('idle');
    }
  }

  toggleListening(onResult) {
    if (this.isListening) {
      this.stopListening();
      return false;
    } else {
      this.startListening(onResult);
      return true;
    }
  }

  cleanTextForSpeech(text) {
    if (!text) return '';
    return text
      // Remove code blocks
      .replace(/```[\s\S]*?```/g, 'Code block omitted.')
      // Remove inline code
      .replace(/`([^`]+)`/g, '$1')
      // Remove markdown bold/italics
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      // Remove markdown headers
      .replace(/#{1,6}\s+/g, '')
      // Remove markdown links
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      // Remove bullet asterisks/dashes
      .replace(/^\s*[-*+]\s+/gm, '')
      // Remove emojis
      .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
      .trim();
  }

  speak(text, options = {}, onEnd = () => {}) {
    if (!this.synthesis) return;
    this.stopSpeaking();

    const clean = this.cleanTextForSpeech(text);
    if (!clean) return;

    const utterance = new SpeechSynthesisUtterance(clean);
    
    // Auto-detect language of this specific text
    const isArabic = /[\u0600-\u06FF]/.test(clean);
    
    if (isArabic && this.arabicVoice) {
      utterance.voice = this.arabicVoice;
      utterance.lang = this.arabicVoice.lang || 'ar-SA';
    } else if (!isArabic && this.englishVoice) {
      utterance.voice = this.englishVoice;
      utterance.lang = this.englishVoice.lang || 'en-US';
    } else if (this.selectedVoice) {
      utterance.voice = this.selectedVoice;
      utterance.lang = this.selectedVoice.lang || (isArabic ? 'ar-SA' : 'en-US');
    } else {
      utterance.lang = isArabic ? 'ar-SA' : 'en-US';
    }

    utterance.rate = options.rate || (isArabic ? 1.0 : 1.05);
    utterance.pitch = options.pitch || 1.0;
    utterance.volume = options.volume !== undefined ? options.volume : 1.0;

    let waveInterval;

    utterance.onstart = () => {
      this.isSpeaking = true;
      this.onStateChange('speaking');
      
      // Simulate audio waveform oscillation during speech
      waveInterval = setInterval(() => {
        const fakeLevels = Array.from({ length: 16 }, () => Math.random() * 0.8 + 0.2);
        this.onAudioWave(fakeLevels);
      }, 80);
    };

    utterance.onend = () => {
      this.isSpeaking = false;
      clearInterval(waveInterval);
      this.onAudioWave(Array(16).fill(0.05));
      if (!this.isListening) {
        this.onStateChange('idle');
      }
      onEnd();
    };

    utterance.onerror = () => {
      this.isSpeaking = false;
      clearInterval(waveInterval);
      this.onAudioWave(Array(16).fill(0.05));
      if (!this.isListening) {
        this.onStateChange('idle');
      }
      onEnd();
    };

    this.synthesis.speak(utterance);
  }

  stopSpeaking() {
    if (this.synthesis && this.isSpeaking) {
      this.synthesis.cancel();
      this.isSpeaking = false;
      this.onAudioWave(Array(16).fill(0.05));
      this.onStateChange('idle');
    }
  }

  // ==========================================
  // GEMINI LIVE AUDIO DUPLEX (REAL-TIME CALL)
  // ==========================================
  async startLiveDuplex(callbacks = {}) {
    if (this.isLiveDuplexActive) return { success: true };

    try {
      // 1. Initialize Native 24kHz Audio Output Context for Gemini Native Voice
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.liveAudioContextOut = new AudioCtx({ sampleRate: 24000 });
      this.liveAudioQueue = [];
      this.liveIsPlaying = false;
      this.liveNextPlayTime = 0;
      this.activeLiveSources = [];

      if (this.liveAudioContextOut && this.liveAudioContextOut.state === 'suspended') {
        await this.liveAudioContextOut.resume();
      }

      // 2. Connect to Backend Live WebSocket Session
      const connRes = await window.jarvisAPI.liveConnect();
      if (!connRes.success) {
        throw new Error(connRes.message || 'Live connection failed');
      }

      // 3. Setup Native Mic Audio Stream (16kHz PCM 16-bit Mono)
      this.liveMediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      this.liveAudioContextIn = new AudioCtx({ sampleRate: 16000 });
      if (this.liveAudioContextIn.state === 'suspended') {
        await this.liveAudioContextIn.resume();
      }

      const micSource = this.liveAudioContextIn.createMediaStreamSource(this.liveMediaStream);
      
      // Use 2048 buffer size for ~128ms low-latency chunk stream
      this.liveScriptProcessor = this.liveAudioContextIn.createScriptProcessor(2048, 1, 1);

      this.liveScriptProcessor.onaudioprocess = (e) => {
        if (!this.isLiveDuplexActive) return;
        const inputData = e.inputBuffer.getChannelData(0);
        
        // Compute live mic volume levels for HUD visualization
        let sum = 0;
        for (let i = 0; i < inputData.length; i++) {
          sum += inputData[i] * inputData[i];
        }
        const rms = Math.sqrt(sum / inputData.length);
        const wave = Array.from({ length: 16 }, () => Math.min(1.0, rms * 4 + Math.random() * 0.1));
        this.onAudioWave(wave);

        // Acoustic Echo Suppression:
        // If Gemini is currently speaking and user is not shouting over it,
        // send silence to prevent speaker output from triggering self-interruption!
        if (this.isLiveAiSpeaking() && rms < 0.05) {
          const silencePcm = new Int16Array(inputData.length);
          const u8 = new Uint8Array(silencePcm.buffer);
          let bin = '';
          for (let i = 0; i < u8.length; i++) bin += String.fromCharCode(u8[i]);
          window.jarvisAPI.liveSendAudio(btoa(bin));
          return;
        }

        // Convert float32 [-1.0, 1.0] to 16-bit signed PCM little-endian
        const pcm16 = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }

        // Convert Int16Array buffer to Base64
        const uint8 = new Uint8Array(pcm16.buffer);
        let binary = '';
        const len = uint8.byteLength;
        for (let i = 0; i < len; i++) {
          binary += String.fromCharCode(uint8[i]);
        }
        const base64Chunk = btoa(binary);

        window.jarvisAPI.liveSendAudio(base64Chunk);
      };

      micSource.connect(this.liveScriptProcessor);
      this.liveScriptProcessor.connect(this.liveAudioContextIn.destination);

      // 4. Setup Listeners for Server Audio & Transcripts
      this.unsubLiveAudio = window.jarvisAPI.onLiveAudioChunk((base64Chunk) => {
        this.enqueueLiveAudioChunk(base64Chunk);
      });

      this.unsubLiveUser = window.jarvisAPI.onLiveUserTranscript((text) => {
        if (callbacks.onUserTranscript) callbacks.onUserTranscript(text);
      });

      this.unsubLiveAi = window.jarvisAPI.onLiveAiTranscript((text) => {
        if (callbacks.onAiTranscript) callbacks.onAiTranscript(text);
      });

      this.unsubLiveInterrupt = window.jarvisAPI.onLiveInterrupted(() => {
        this.handleLiveInterruption();
      });

      this.unsubLiveStatus = window.jarvisAPI.onLiveStatus((status) => {
        if (!status.connected) {
          this.stopLiveDuplex();
        }
        if (callbacks.onStatus) callbacks.onStatus(status);
      });

      this.isLiveDuplexActive = true;
      this.onStateChange('live_call');
      return { success: true };
    } catch (err) {
      console.error('Error starting live duplex:', err);
      this.stopLiveDuplex();
      return { success: false, message: err.message };
    }
  }

  enqueueLiveAudioChunk(base64Chunk) {
    if (!this.isLiveDuplexActive || !this.liveAudioContextOut) return;

    try {
      if (this.liveAudioContextOut.state === 'suspended') {
        this.liveAudioContextOut.resume();
      }

      const binaryString = atob(base64Chunk);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const pcm16 = new Int16Array(bytes.buffer);
      const float32 = new Float32Array(pcm16.length);
      for (let i = 0; i < pcm16.length; i++) {
        float32[i] = pcm16[i] / 32768.0;
      }

      const audioBuffer = this.liveAudioContextOut.createBuffer(1, float32.length, 24000);
      audioBuffer.getChannelData(0).set(float32);

      const source = this.liveAudioContextOut.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.liveAudioContextOut.destination);

      const currentTime = this.liveAudioContextOut.currentTime;
      if (this.liveNextPlayTime < currentTime) {
        this.liveNextPlayTime = currentTime + 0.02; // small 20ms jitter buffer
      }

      source.start(this.liveNextPlayTime);
      this.liveNextPlayTime += audioBuffer.duration;
      this.activeLiveSources.push(source);

      source.onended = () => {
        const idx = this.activeLiveSources.indexOf(source);
        if (idx !== -1) this.activeLiveSources.splice(idx, 1);
      };
    } catch (e) {
      console.warn('Error decoding live audio chunk:', e);
    }
  }

  isLiveAiSpeaking() {
    return this.activeLiveSources && this.activeLiveSources.length > 0;
  }

  handleLiveInterruption() {
    // When user speaks over AI, immediately cancel currently playing audio
    if (this.activeLiveSources && this.activeLiveSources.length > 0) {
      for (const src of this.activeLiveSources) {
        try { src.stop(); } catch (e) {}
      }
      this.activeLiveSources = [];
    }
    if (this.liveAudioContextOut) {
      this.liveNextPlayTime = this.liveAudioContextOut.currentTime;
    }
  }

  stopLiveDuplex() {
    this.isLiveDuplexActive = false;
    this.handleLiveInterruption();

    if (this.liveMediaStream) {
      this.liveMediaStream.getTracks().forEach(track => track.stop());
      this.liveMediaStream = null;
    }

    if (this.liveScriptProcessor) {
      try { this.liveScriptProcessor.disconnect(); } catch (e) {}
      this.liveScriptProcessor = null;
    }

    if (this.liveAudioContextIn) {
      try { this.liveAudioContextIn.close(); } catch (e) {}
      this.liveAudioContextIn = null;
    }

    if (this.liveAudioContextOut) {
      try { this.liveAudioContextOut.close(); } catch (e) {}
      this.liveAudioContextOut = null;
    }

    if (this.unsubLiveAudio) this.unsubLiveAudio();
    if (this.unsubLiveUser) this.unsubLiveUser();
    if (this.unsubLiveAi) this.unsubLiveAi();
    if (this.unsubLiveInterrupt) this.unsubLiveInterrupt();
    if (this.unsubLiveStatus) this.unsubLiveStatus();

    try {
      window.jarvisAPI.liveDisconnect();
    } catch (e) {}

    this.onAudioWave(Array(16).fill(0.05));
    this.onStateChange('idle');
  }
}

if (typeof window !== 'undefined') {
  window.VoiceEngine = VoiceEngine;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = VoiceEngine;
}
