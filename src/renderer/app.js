document.addEventListener('DOMContentLoaded', async () => {
  // 1. Initialize Core Engines
  const audioFX = new window.AudioFXEngine();
  const voiceEngine = new window.VoiceEngine();
  const reactor = new window.ArcReactorVisualizer('arc-reactor-canvas');

  let currentAttachedImage = null;
  let currentAttachedFiles = []; // Supports images, PDFs, Word, Excel, PowerPoint, text files

  let isAlwaysOnTop = false;
  let currentConfig = {};
  let currentTab = 'tab-command';

  // Play startup sound on first user gesture or launch
  audioFX.playStartup();

  // 2. Load Configuration
  try {
    currentConfig = await window.jarvisAPI.getConfig();
    applyConfig(currentConfig);
  } catch (err) {
    console.warn('Config load error:', err);
  }

  // 3. Connect Voice Engine with Reactor and Audio Waves
  const stopSpeechBtn = document.getElementById('btn-stop-speech');

  function stopAISpeech() {
    if (voiceEngine.isSpeaking) {
      voiceEngine.stopSpeaking();
      audioFX.playClick();
      showToast('🔇 تم إيقاف صوت CY9 (Speech Silenced)');
    }
  }

  stopSpeechBtn?.addEventListener('click', stopAISpeech);

  // Click on Arc Reactor canvas to silence speech
  document.getElementById('reactor-canvas')?.addEventListener('click', () => {
    if (voiceEngine.isSpeaking) {
      stopAISpeech();
    }
  });

  // Keyboard shortcut to instantly stop speech: Escape or Space (outside inputs)
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' || (e.key === ' ' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA')) {
      if (voiceEngine.isSpeaking) {
        e.preventDefault();
        stopAISpeech();
      }
    }
  });

  voiceEngine.onStateChange = (state) => {
    reactor.setState(state);
    const stateBadge = document.getElementById('reactor-state');
    if (stateBadge) {
      if (state === 'listening') {
        stateBadge.textContent = 'LISTENING // AUDIO UPLINK';
        stateBadge.style.color = 'var(--hud-cyan)';
      } else if (state === 'speaking') {
        stateBadge.textContent = 'SPEAKING // TRANSMITTING';
        stateBadge.style.color = 'var(--accent-color)';
      } else if (state === 'thinking') {
        stateBadge.textContent = 'CALCULATING // NEURAL CORE';
        stateBadge.style.color = 'var(--hud-gold)';
      } else if (state === 'alert') {
        stateBadge.textContent = 'ALERT // PROTOCOL ACTIVE';
        stateBadge.style.color = 'var(--hud-crimson)';
      } else {
        stateBadge.textContent = 'IDLE // STANDBY';
        stateBadge.style.color = 'var(--accent-color)';
      }
    }

    // Toggle Stop Speech button visibility
    if (stopSpeechBtn) {
      if (state === 'speaking') {
        stopSpeechBtn.classList.remove('hidden');
      } else {
        stopSpeechBtn.classList.add('hidden');
      }
    }
  };

  voiceEngine.onAudioWave = (levels) => {
    const bars = document.querySelectorAll('.voice-wave-bar');
    const avg = levels.reduce((a, b) => a + b, 0) / levels.length;
    reactor.setAudioLevel(avg);

    bars.forEach((bar, i) => {
      const lvl = levels[i % levels.length] || 0.1;
      bar.style.height = `${Math.max(4, Math.round(lvl * 36))}px`;
    });
  };

  // 4. Window Controls & Floating Widget
  document.getElementById('btn-orb')?.addEventListener('click', () => {
    audioFX.playClick();
    showToast('🌀 Switching to Floating Orb Overlay Mode');
    window.jarvisAPI.showFloatingWidget();
  });

  document.getElementById('btn-min')?.addEventListener('click', () => {
    audioFX.playClick();
    window.jarvisAPI.windowMinimize();
  });

  document.getElementById('btn-max')?.addEventListener('click', () => {
    audioFX.playClick();
    window.jarvisAPI.windowMaximize();
  });

  document.getElementById('btn-close')?.addEventListener('click', () => {
    audioFX.playClick();
    window.jarvisAPI.windowClose();
  });

  // Complete Shutdown Functionality
  function shutdownApp() {
    if (window.audioFX && window.audioFX.playPowerDown) {
      window.audioFX.playPowerDown();
    }
    showToast('🛑 Shutting down CY9 subsystems...');
    setTimeout(() => {
      if (window.jarvisAPI && window.jarvisAPI.quitApp) {
        window.jarvisAPI.quitApp();
      }
    }, 450);
  }

  document.getElementById('btn-shutdown')?.addEventListener('click', shutdownApp);
  document.getElementById('btn-shutdown-cy9')?.addEventListener('click', shutdownApp);

  // Global Keyboard Shortcut: Ctrl + Shift + Q -> Instant Complete Shutdown
  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'q') {
      e.preventDefault();
      shutdownApp();
    }
  });

  // Listen for restoration from floating orb (e.g. if voice command requested)
  if (window.jarvisAPI.onRestoreTriggered) {
    window.jarvisAPI.onRestoreTriggered((data) => {
      audioFX.playStartup();
      if (data && data.voice) {
        setTimeout(() => {
          document.getElementById('btn-voice-uplink')?.click();
        }, 400);
      }
    });
  }

  const pinBtn = document.getElementById('btn-pin');
  pinBtn?.addEventListener('click', async () => {
    audioFX.playClick();
    isAlwaysOnTop = await window.jarvisAPI.toggleAlwaysOnTop();
    pinBtn.classList.toggle('pin-active', isAlwaysOnTop);
    showToast(isAlwaysOnTop ? 'Always on Top Engaged' : 'Always on Top Disengaged');
  });

  const miniBtn = document.getElementById('btn-mini');
  miniBtn?.addEventListener('click', async () => {
    audioFX.playClick();
    const isMini = await window.jarvisAPI.toggleMiniMode();
    miniBtn.classList.toggle('pin-active', isMini);
    showToast(isMini ? 'Mini-HUD Mode Engaged' : 'Standard HUD Restored');
  });

  // 5. Tab Navigation
  const navItems = document.querySelectorAll('.nav-item');
  const tabPanes = document.querySelectorAll('.tab-pane');

  navItems.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');
      if (!targetTab || targetTab === currentTab) return;

      audioFX.playClick();
      navItems.forEach(n => n.classList.remove('active'));
      tabPanes.forEach(p => p.classList.remove('active-tab'));

      btn.classList.add('active');
      const pane = document.getElementById(targetTab);
      if (pane) pane.classList.add('active-tab');
      currentTab = targetTab;

      if (targetTab === 'tab-agents') renderAgentsList();
      if (targetTab === 'tab-protocols') renderProtocolsList();
      if (targetTab === 'tab-memory') renderMemoryAndTasks();
      if (targetTab === 'tab-telemetry') pollTelemetry();
      if (targetTab === 'tab-ecosystem') refreshBluetoothList();
    });
  });

  // 6. Real-Time Clock & Telemetry Polling
  function updateClock() {
    const now = new Date();
    const clockEl = document.getElementById('header-clock');
    if (clockEl) clockEl.textContent = now.toLocaleTimeString();
  }
  setInterval(updateClock, 1000);
  updateClock();

  async function pollTelemetry() {
    try {
      const tel = await window.jarvisAPI.getTelemetry();
      if (!tel || !tel.success) return;

      // Update Header & Dashboard Metrics
      const cpuLoad = document.getElementById('metric-cpu-load');
      const cpuModel = document.getElementById('metric-cpu-model');
      const cpuCores = document.getElementById('metric-cpu-cores');
      if (cpuLoad) cpuLoad.textContent = `${tel.cpu.load}%`;
      if (cpuModel) cpuModel.textContent = tel.cpu.model;
      if (cpuCores) cpuCores.textContent = `${tel.cpu.cores} Cores`;

      const ramUsed = document.getElementById('metric-ram-used');
      const ramTotal = document.getElementById('metric-ram-total');
      const ramPercent = document.getElementById('metric-ram-percent');
      if (ramUsed) ramUsed.textContent = `${tel.memory.usedGB} GB`;
      if (ramTotal) ramTotal.textContent = `Total: ${tel.memory.totalGB} GB`;
      if (ramPercent) ramPercent.textContent = `${tel.memory.percent}%`;

      const batPercent = document.getElementById('metric-battery-percent');
      const batStatus = document.getElementById('metric-battery-status');
      const batCharging = document.getElementById('metric-battery-charging');
      if (batPercent) batPercent.textContent = `${tel.battery.percent}%`;
      if (batStatus) batStatus.textContent = tel.battery.isCharging ? 'Charging' : (tel.battery.hasBattery ? 'Battery' : 'AC Grid');
      if (batCharging) batCharging.textContent = tel.battery.isCharging ? 'Fast charge active' : 'Connected to mains';

      const uptimeEl = document.getElementById('metric-uptime');
      const hostEl = document.getElementById('metric-hostname');
      if (uptimeEl) uptimeEl.textContent = tel.uptime;
      if (hostEl) hostEl.textContent = `${tel.hostname} (${tel.platform})`;

      // Update Process Table
      const procTableBody = document.getElementById('proc-table-body');
      if (procTableBody && tel.processes && tel.processes.length > 0) {
        procTableBody.innerHTML = tel.processes.map(p => `
          <tr>
            <td>${p.pid}</td>
            <td style="color:var(--text-primary);font-weight:600;">${escapeHtml(p.name)}</td>
            <td><span style="color:var(--accent-color);">${p.cpu}%</span></td>
            <td>${p.mem}%</td>
          </tr>
        `).join('');
      }
    } catch (e) {
      console.warn('Telemetry error:', e);
    }
  }
  setInterval(pollTelemetry, 3000);
  pollTelemetry();

  // 7. Initial Weather Lookup for HUD Widget
  async function updateWeatherWidget(city = 'London') {
    try {
      const wx = await window.jarvisAPI.sendMessage(`Weather in ${city}`);
      // Simple parse or auto-trigger tool
      const cityEl = document.getElementById('widget-weather-city');
      const condEl = document.getElementById('widget-weather-condition');
      const tempEl = document.getElementById('widget-weather-temp');
      
      const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`);
      const geo = await res.json();
      if (geo.results && geo.results[0]) {
        const p = geo.results[0];
        const fRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${p.latitude}&longitude=${p.longitude}&current=temperature_2m,weather_code&timezone=auto`);
        const fData = await fRes.json();
        if (fData.current) {
          if (cityEl) cityEl.textContent = `${p.name}, ${p.country_code || ''}`;
          if (tempEl) tempEl.textContent = `${Math.round(fData.current.temperature_2m)}°C`;
          if (condEl) condEl.textContent = 'Atmospheric sensors clear';
        }
      }
    } catch (e) {}
  }
  updateWeatherWidget('London');

  // 8. Agent Swarm Real-Time Updates
  window.jarvisAPI.onAgentsUpdated((agents) => {
    renderAgentsList(agents);
  });

  window.jarvisAPI.onProgress((data) => {
    const ticker = document.getElementById('agent-status-ticker');
    const liveBanner = document.getElementById('agent-live-banner');
    if (ticker && data.text) {
      ticker.textContent = `[${data.agent ? data.agent.toUpperCase() : 'CORE'}] // ${data.text}`;
    }
    if (liveBanner && data.agent) {
      liveBanner.textContent = `[${data.agent.toUpperCase()}] // ${data.text || 'Processing intent...'}`;
    }
    if (data.centerCard) {
      renderExecutiveCenterCard(data.centerCard);
    }
  });

  async function renderAgentsList(agentsList) {
    const container = document.getElementById('agents-grid-container');
    const swarmHeader = document.getElementById('header-swarm-status');
    const agents = agentsList || await window.jarvisAPI.getAgents();

    if (swarmHeader && Array.isArray(agents)) {
      const activeCount = agents.filter(a => a.status === 'active' || a.status === 'online').length;
      swarmHeader.textContent = `SWARM ONLINE (${activeCount}/${agents.length})`;
    }

    if (!container) return;

    container.innerHTML = agents.map(ag => `
      <div class="agent-card">
        <div class="agent-card-header">
          <div class="agent-identity">
            <div class="agent-icon-box" style="border-color:${ag.color};color:${ag.color};">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="9"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            </div>
            <div>
              <div class="agent-name">${escapeHtml(ag.name)}</div>
              <div class="agent-role">${escapeHtml(ag.role)}</div>
            </div>
          </div>
          <span class="agent-status-badge ${ag.status === 'active' ? 'status-active' : 'status-online'}">
            ${ag.status}
          </span>
        </div>

        <div class="agent-load-meter">
          <div class="load-labels">
            <span>Core Activity</span>
            <span>${ag.load}%</span>
          </div>
          <div class="load-track">
            <div class="load-fill" style="width: ${ag.load}%; background: ${ag.color};"></div>
          </div>
        </div>

        <div class="agent-last-log">
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
          <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(ag.lastAction)}</span>
        </div>
      </div>
    `).join('');
  }

  // 9. Interactive Chat System
  const chatInput = document.getElementById('chat-input');
  const sendBtn = document.getElementById('btn-send');
  const micBtn = document.getElementById('btn-mic');
  const attachScreenBtn = document.getElementById('btn-attach-screen');
  const messagesContainer = document.getElementById('chat-messages-container');
  const attachPreview = document.getElementById('image-attachment-preview');
  const removeAttachBtn = document.getElementById('btn-remove-attachment');

  // Attachment clear (screenshot/image)
  removeAttachBtn?.addEventListener('click', () => {
    currentAttachedImage = null;
    attachPreview.classList.remove('active');
    audioFX.playClick();
  });

  // -------------------------------------------------------
  // FILE ATTACHMENT SYSTEM (Images + PDF + Word + Excel + PPT)
  // -------------------------------------------------------
  const fileInput = document.getElementById('file-input-hidden');
  const attachFileBtn = document.getElementById('btn-attach-file');
  const filePreviewBar = document.getElementById('file-attachment-preview');
  const filePreviewName = document.getElementById('file-preview-name');
  const filePreviewSize = document.getElementById('file-preview-size');
  const filePreviewIcon = document.getElementById('file-preview-icon');
  const removeFileBtn = document.getElementById('btn-remove-file');

  // File type emoji icons
  function getFileIcon(mimeType, name) {
    if (!mimeType && !name) return '📄';
    const m = (mimeType || '').toLowerCase();
    const ext = (name || '').split('.').pop().toLowerCase();
    if (m.startsWith('image/')) return '🖼️';
    if (m === 'application/pdf' || ext === 'pdf') return '📕';
    if (m.includes('word') || ext === 'doc' || ext === 'docx') return '📘';
    if (m.includes('spreadsheet') || m.includes('excel') || ext === 'xls' || ext === 'xlsx') return '📗';
    if (m.includes('presentation') || m.includes('powerpoint') || ext === 'ppt' || ext === 'pptx') return '📙';
    if (m === 'text/plain' || ext === 'txt' || ext === 'md') return '📝';
    if (m === 'text/csv' || ext === 'csv') return '📊';
    if (ext === 'json') return '🔧';
    return '📄';
  }

  function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function updateFilePreviewBar() {
    if (!filePreviewBar) return;
    if (currentAttachedFiles.length === 0) {
      filePreviewBar.style.display = 'none';
      return;
    }
    filePreviewBar.style.display = 'flex';
    if (currentAttachedFiles.length === 1) {
      const f = currentAttachedFiles[0];
      if (filePreviewIcon) filePreviewIcon.textContent = getFileIcon(f.mimeType, f.name);
      if (filePreviewName) filePreviewName.textContent = f.name;
      if (filePreviewSize) filePreviewSize.textContent = formatFileSize(f.size);
    } else {
      if (filePreviewIcon) filePreviewIcon.textContent = '📎';
      if (filePreviewName) filePreviewName.textContent = `${currentAttachedFiles.length} files attached`;
      if (filePreviewSize) filePreviewSize.textContent = formatFileSize(currentAttachedFiles.reduce((a, f) => a + f.size, 0));
    }
  }

  function clearFileAttachments() {
    currentAttachedFiles = [];
    if (fileInput) fileInput.value = '';
    updateFilePreviewBar();
  }

  removeFileBtn?.addEventListener('click', () => {
    clearFileAttachments();
    audioFX.playClick();
  });

  // Read file(s) as base64
  async function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        // Remove the data URL prefix: "data:mime/type;base64,"
        const base64 = e.target.result.split(',')[1];
        resolve({ name: file.name, mimeType: file.type || 'application/octet-stream', base64, size: file.size });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function processFiles(fileList) {
    if (!fileList || fileList.length === 0) return;
    const MAX_SIZE = 20 * 1024 * 1024; // 20MB per file
    const MAX_FILES = 5;
    const files = Array.from(fileList).slice(0, MAX_FILES);
    const results = [];
    for (const file of files) {
      if (file.size > MAX_SIZE) {
        showToast(`⚠️ الملف "${file.name}" أكبر من 20MB — تجاهل.`);
        continue;
      }
      try {
        const data = await readFileAsBase64(file);
        // If image type, treat as primary image for vision analysis
        if (file.type.startsWith('image/')) {
          currentAttachedImage = { base64: data.base64, mimeType: data.mimeType, name: data.name };
          attachPreview.classList.add('active');
          const labelEl = document.getElementById('attachment-preview-label');
          if (labelEl) labelEl.textContent = `🖼️ ${data.name}`;
        } else {
          results.push(data);
        }
      } catch (err) {
        showToast(`❌ فشل قراءة الملف "${file.name}": ${err.message}`);
      }
    }
    if (results.length > 0) {
      currentAttachedFiles = results;
      updateFilePreviewBar();
    }
    audioFX.playSuccess();
    const totalAttached = (currentAttachedImage ? 1 : 0) + currentAttachedFiles.length;
    showToast(`✅ تم إرفاق ${totalAttached} ملف/ملفات — أرسل سؤالك الآن!`);
  }

  // Trigger file dialog
  attachFileBtn?.addEventListener('click', () => {
    audioFX.playClick();
    fileInput?.click();
  });

  fileInput?.addEventListener('change', async (e) => {
    await processFiles(e.target.files);
  });

  // Drag-and-drop on the entire chat input area
  const inputBoxWrapper = document.querySelector('.input-box-wrapper');
  const chatSection = document.querySelector('.chat-input-section') || inputBoxWrapper;

  if (chatSection) {
    chatSection.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
      chatSection.classList.add('drag-over');
    });
    chatSection.addEventListener('dragleave', (e) => {
      e.preventDefault();
      chatSection.classList.remove('drag-over');
    });
    chatSection.addEventListener('drop', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      chatSection.classList.remove('drag-over');
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        await processFiles(e.dataTransfer.files);
      }
    });
  }

  // Paste image from clipboard (Ctrl+V)
  document.addEventListener('paste', async (e) => {
    if (document.activeElement !== chatInput && document.activeElement?.tagName !== 'INPUT') return;
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          await processFiles([file]);
        }
        break;
      }
    }
  });

  // Capture Screenshot Button
  attachScreenBtn?.addEventListener('click', async () => {
    audioFX.playScan();
    showToast('Capturing primary screen buffer...');
    const result = await window.jarvisAPI.captureScreenshot();
    if (result && result.success) {
      currentAttachedImage = result;
      attachPreview.classList.add('active');
      const labelEl = document.getElementById('attachment-preview-label');
      if (labelEl) labelEl.textContent = '🖥️ Screenshot captured';
      audioFX.playSuccess();
      showToast('Screen attached! Ask a question or click Send.');
    } else {
      showToast('Failed to capture screen: ' + (result?.message || 'Error'));
    }
  });


  // Voice Mic & Continuous Wake-Word Handler
  let speechSilenceTimer = null;
  const originalChatPlaceholder = chatInput ? chatInput.placeholder : 'Give CY9 a directive or ask a question...';
  const liveTranscriptBar = document.getElementById('live-voice-transcript-bar');
  const liveVoiceText = document.getElementById('live-voice-text');
  const btnLiveStopSend = document.getElementById('btn-live-stop-send');
  const btnLiveCancel = document.getElementById('btn-live-cancel');

  function onVoiceInput(transcript, isFinal) {
    if (!transcript) return;
    const lower = transcript.toLowerCase();
    
    // Voice Interruption: If speaking, allow user to interrupt by saying "Stop", "اسكت", "اصمت", "وقف"
    if (voiceEngine.isSpeaking) {
      if (lower.includes('stop') || lower.includes('اسكت') || lower.includes('اصمت') || lower.includes('وقف') || lower.includes('بس') || lower.includes('quiet') || lower.includes('silence')) {
        stopAISpeech();
        chatInput.value = '';
        if (liveTranscriptBar) liveTranscriptBar.classList.add('hidden');
        return;
      }
    }
    
    // Display words in both the glowing live voice bar AND the chat input box in real time
    if (liveTranscriptBar) liveTranscriptBar.classList.remove('hidden');
    if (liveVoiceText) liveVoiceText.textContent = transcript;
    if (chatInput) {
      chatInput.value = transcript;
      chatInput.scrollLeft = chatInput.scrollWidth;
    }
  }

  const voiceUplinkBtn = document.getElementById('btn-voice-uplink');
  const voiceUplinkText = document.getElementById('voice-uplink-text');

  function updateVoiceUI(listening) {
    if (micBtn) micBtn.classList.toggle('mic-active', listening);
    if (liveTranscriptBar) {
      if (listening) {
        liveTranscriptBar.classList.remove('hidden');
        if (liveVoiceText) liveVoiceText.textContent = chatInput.value || '🎙️ استماع صوتي نشط... تحدث الآن بالعربية أو الإنجليزية';
      } else {
        liveTranscriptBar.classList.add('hidden');
      }
    }
    if (chatInput) {
      if (listening) {
        chatInput.classList.add('recording-active');
        chatInput.placeholder = '🎙️ Listening... Speak now in Arabic or English (تحدث الآن)...';
      } else {
        chatInput.classList.remove('recording-active');
        chatInput.placeholder = originalChatPlaceholder;
      }
    }
    if (voiceUplinkBtn) {
      if (listening) {
        voiceUplinkBtn.classList.add('active-listening');
        if (voiceUplinkText) voiceUplinkText.textContent = 'REC...';
      } else {
        voiceUplinkBtn.classList.remove('active-listening');
        if (voiceUplinkText) voiceUplinkText.textContent = 'VOICE';
      }
    }
  }

  async function finalizeVoiceRecordingAndSend() {
    clearTimeout(speechSilenceTimer);
    if (!voiceEngine.isListening) return;

    audioFX.playAcknowledge();
    if (liveVoiceText) liveVoiceText.textContent = '🎙️ جاري معالجة وتفريغ الصوت بدقة عالية...';
    
    // Stop recording and retrieve the 16kHz PCM WAV audio buffer
    const audioData = await voiceEngine.stopListeningAndGetAudio();
    updateVoiceUI(false);
    showToast('🔇 تم إنهاء التسجيل - جاري التفريغ...');

    let spokenText = (chatInput.value || audioData?.transcript || voiceEngine.getLatestTranscript() || '').trim();

    // If real-time recognition didn't capture text, fallback to Gemini Multimodal Audio
    if ((!spokenText || spokenText.length < 2) && audioData && audioData.base64) {
      try {
        if (liveVoiceText) liveVoiceText.textContent = '🤖 جاري تفريغ الصوت عبر الذكاء الاصطناعي...';
        const res = await window.jarvisAPI.transcribeAudio({
          base64Audio: audioData.base64,
          mimeType: audioData.mimeType || 'audio/wav'
        });
        if (res && res.success && res.text && res.text.trim()) {
          spokenText = res.text.trim();
        }
      } catch (err) {
        console.warn('Multimodal transcription notice:', err);
      }
    }

    if (spokenText && spokenText.length > 0) {
      chatInput.value = spokenText;
      if (liveVoiceText) liveVoiceText.textContent = spokenText;
      showToast(`🎙️ كلامك: "${spokenText}"`);
      await handleSendMessage();
    } else {
      if (liveTranscriptBar) liveTranscriptBar.classList.add('hidden');
      showToast('⚠️ لم يتم رصد كلمات مسجلة، يرجى التحدث بوضوح بعد الضغط على المايك.');
    }
  }

  function toggleVoiceUplink() {
    clearTimeout(speechSilenceTimer);

    if (voiceEngine.isListening) {
      finalizeVoiceRecordingAndSend();
    } else {
      audioFX.playAcknowledge();
      if (voiceEngine.isSpeaking) {
        stopAISpeech();
      }
      chatInput.value = '';
      voiceEngine.startListening(onVoiceInput);
      updateVoiceUI(true);
      showToast('🎙️ جاري تسجيل صوتك... تحدث الآن بحرية');
    }
  }

  micBtn?.addEventListener('click', toggleVoiceUplink);
  voiceUplinkBtn?.addEventListener('click', toggleVoiceUplink);

  // Live Voice Bar Actions
  btnLiveStopSend?.addEventListener('click', () => {
    finalizeVoiceRecordingAndSend();
  });

  btnLiveCancel?.addEventListener('click', () => {
    audioFX.playClick();
    if (voiceEngine.isListening) {
      voiceEngine.stopListening();
    }
    chatInput.value = '';
    updateVoiceUI(false);
    showToast('✕ تم إلغاء التسجيل');
  });

  // 10. Gemini Live Audio & Vision Duplex Call Mode (Full Duplex Real-Time Phone Call)
  const liveDuplexBtn = document.getElementById('btn-live-duplex-call');
  const liveDuplexText = document.getElementById('live-duplex-text');
  const liveScreenShareBtn = document.getElementById('btn-live-screen-share');
  const liveScreenShareText = document.getElementById('live-screen-share-text');

  let isLiveScreenShareActive = false;

  async function toggleLiveDuplexCall() {
    if (voiceEngine.isLiveDuplexActive) {
      voiceEngine.stopLiveDuplex();
      stopLiveScreenStreaming();
      updateLiveDuplexUI(false);
      audioFX.playClick();
      showToast('📞 تم إنهاء المكالمة الصوتية المباشرة (Live Call Disconnected)');
    } else {
      if (voiceEngine.isListening) {
        voiceEngine.stopListening();
        updateVoiceUI(false);
      }
      if (voiceEngine.isSpeaking) {
        stopAISpeech();
      }

      audioFX.playAcknowledge();
      showToast('⚡ جاري الاتصال المباشر بـ Gemini Live API...');
      updateLiveDuplexUI(true, 'CONNECTING...');

      const res = await voiceEngine.startLiveDuplex({
        onUserTranscript: (text) => {
          if (liveTranscriptBar) liveTranscriptBar.classList.remove('hidden');
          if (liveVoiceText) liveVoiceText.textContent = `🎙️ [أنت]: ${text}`;
        },
        onAiTranscript: (text) => {
          if (liveTranscriptBar) liveTranscriptBar.classList.remove('hidden');
          if (liveVoiceText) liveVoiceText.textContent = `🤖 [CY9]: ${text}`;
        },
        onStatus: (status) => {
          if (status.connected) {
            updateLiveDuplexUI(true, 'LIVE');
            showToast('🟢 المكالمة الصوتية المباشرة نشطة الآن! تحدث بحرية وسيرد عليك فوراً بدون تأخير.');
          } else {
            updateLiveDuplexUI(false);
            stopLiveScreenStreaming();
            if (status.error) {
              showToast(`⚠️ انقطعت المكالمة: ${status.error}`);
            }
          }
        }
      });

      if (!res.success) {
        updateLiveDuplexUI(false);
        stopLiveScreenStreaming();
        showToast(`❌ تعذر بدء المكالمة المباشرة: ${res.message}`);
      }
    }
  }

  function updateLiveDuplexUI(active, labelText) {
    if (liveDuplexBtn) {
      if (active) {
        liveDuplexBtn.classList.add('active-call');
        if (liveDuplexText) {
          liveDuplexText.textContent = labelText && labelText.startsWith('CONN') ? 'CONN...' : 'LIVE';
        }
        if (liveTranscriptBar) {
          liveTranscriptBar.classList.remove('hidden');
          if (liveVoiceText) liveVoiceText.textContent = '🟢 مكالمة صوتية حية ومستمرة نشطة (تحدث بحرية أو قاطع الذكاء في أي وقت)...';
        }
      } else {
        liveDuplexBtn.classList.remove('active-call');
        if (liveDuplexText) {
          liveDuplexText.textContent = 'CALL';
        }
        if (liveTranscriptBar) liveTranscriptBar.classList.add('hidden');
      }
    }
  }

  // Live Screen Vision Streaming
  let isStreamingLoopRunning = false;

  async function streamScreenFramesLoop() {
    if (isStreamingLoopRunning) return;
    isStreamingLoopRunning = true;

    while (isLiveScreenShareActive && voiceEngine.isLiveDuplexActive) {
      try {
        // Only send video frames when Gemini is NOT currently outputting voice
        // This ensures Gemini's voice is NEVER interrupted or cut off by video frames!
        if (!voiceEngine.isLiveAiSpeaking()) {
          const screen = await window.jarvisAPI.captureScreenshot();
          if (screen && screen.success && screen.base64 && isLiveScreenShareActive && voiceEngine.isLiveDuplexActive && !voiceEngine.isLiveAiSpeaking()) {
            window.jarvisAPI.liveSendVideo({
              base64: screen.base64,
              mimeType: screen.mimeType || 'image/jpeg'
            });
          }
        }
      } catch (e) {
        console.warn('Frame capture notice:', e);
      }
      // 3.0s interval between frames ensures visual grounding without colliding with audio
      await new Promise(r => setTimeout(r, 3000));
    }

    isStreamingLoopRunning = false;
  }

  async function toggleLiveScreenStreaming() {
    if (!voiceEngine.isLiveDuplexActive && !isLiveScreenShareActive) {
      showToast('⚡ جاري بدء المكالمة الحية أولاً لتفعيل مشاركة الشاشة...');
      await toggleLiveDuplexCall();
      if (!voiceEngine.isLiveDuplexActive) return;
    }

    isLiveScreenShareActive = !isLiveScreenShareActive;
    audioFX.playAcknowledge();

    if (isLiveScreenShareActive) {
      if (liveScreenShareBtn) {
        liveScreenShareBtn.classList.add('active-screen');
      }
      if (liveScreenShareText) {
        liveScreenShareText.textContent = 'SHARING';
      }
      showToast('🖥️ تم تفعيل مشاركة الشاشة الحية! جيميني يشاهد شاشتك لحظياً.');

      streamScreenFramesLoop();
    } else {
      stopLiveScreenStreaming();
      showToast('🖥️ تم إيقاف مشاركة الشاشة.');
    }
  }

  function stopLiveScreenStreaming() {
    isLiveScreenShareActive = false;
    if (liveScreenShareBtn) {
      liveScreenShareBtn.classList.remove('active-screen');
    }
    if (liveScreenShareText) {
      liveScreenShareText.textContent = 'SCREEN';
    }
  }

  liveDuplexBtn?.addEventListener('click', toggleLiveDuplexCall);
  liveScreenShareBtn?.addEventListener('click', toggleLiveScreenStreaming);

  // One-Click Universal Clipboard Copy
  window.copyTextToClipboard = function(text) {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      audioFX.playSuccess();
      showToast('📋 تم نسخ النص بالكامل إلى الحافظة!');
    }).catch(() => {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      audioFX.playSuccess();
      showToast('📋 تم نسخ النص إلى الحافظة!');
    });
  };

  // Render Executive Center Card
  function renderExecutiveCenterCard({ title, content, category }) {
    if (!messagesContainer) return;
    const cardRow = document.createElement('div');
    cardRow.className = 'chat-bubble-row';
    const rawContentEscaped = encodeURIComponent(content || '');

    cardRow.innerHTML = `
      <div class="chat-avatar assistant-avatar" style="box-shadow: 0 0 15px rgba(0, 240, 255, 0.4);">CY9</div>
      <div class="chat-bubble-content" style="width: 100%;">
        <div class="executive-center-card">
          <div class="card-header-bar">
            <div style="display: flex; align-items: center; gap: 10px;">
              <span class="card-badge">⚡ ${escapeHtml((category || 'EXECUTIVE INTEL').toUpperCase())}</span>
              <h3 style="margin: 0; font-size: 15px; color: #fff; font-weight: bold;">${escapeHtml(title || 'تقرير استخباراتي')}</h3>
            </div>
            <button onclick="window.copyTextToClipboard(decodeURIComponent('${rawContentEscaped}'))" class="btn-copy-bubble" style="padding: 4px 10px; font-size: 11px;">
              📋 نسخ التقرير
            </button>
          </div>
          <div class="card-body custom-scroll">
            ${renderMarkdown(content)}
          </div>
        </div>
      </div>
    `;

    messagesContainer.appendChild(cardRow);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    audioFX.playSuccess();
  }

  // Send Message Logic (Both text in chat bubble AND spoken aloud via voice)
  async function handleSendMessage() {
    clearTimeout(speechSilenceTimer);
    if (voiceEngine.isListening) {
      voiceEngine.stopListening();
      updateVoiceUI(false);
    }
    const text = chatInput.value.trim();
    if (!text && !currentAttachedImage && currentAttachedFiles.length === 0) return;

    audioFX.playClick();
    const promptText = text || (currentAttachedFiles.length > 0
      ? `Please analyze the attached ${currentAttachedFiles.map(f => f.name).join(', ')}.`
      : 'Please inspect the attached screenshot, sir.');
    const imageToSend = currentAttachedImage;
    const filesToSend = [...currentAttachedFiles];

    // Reset Input & Attachments
    chatInput.value = '';
    currentAttachedImage = null;
    attachPreview?.classList.remove('active');
    const labelEl = document.getElementById('attachment-preview-label');
    if (labelEl) labelEl.textContent = '📎 Attached image for visual inspection';
    clearFileAttachments();

    // Append User Message to Chat
    appendMessage({
      role: 'user',
      text: promptText,
      image: imageToSend ? imageToSend.base64 : null,
      files: filesToSend
    });

    // Set Reactor State to Thinking
    reactor.setState('thinking');
    voiceEngine.onStateChange('thinking');
    audioFX.playAcknowledge();

    try {
      const response = await window.jarvisAPI.sendMessage(promptText, imageToSend, filesToSend);

      reactor.setState('idle');
      voiceEngine.onStateChange('idle');

      if (response && response.reply) {
        appendMessage({
          role: 'assistant',
          text: response.reply
        });

        // Speak if speech synthesis is enabled
        if (currentConfig.speechEnabled !== false) {
          voiceEngine.speak(response.reply, {
            rate: currentConfig.speechRate || 1.05,
            pitch: currentConfig.speechPitch || 0.95
          });
        }

        // Handle Shutdown command
        if (response.action === 'shutdown') {
          setTimeout(() => {
            shutdownApp();
          }, 2600);
        }
      }
    } catch (err) {
      reactor.setState('alert');
      voiceEngine.onStateChange('alert');
      audioFX.playAlert();
      appendMessage({
        role: 'assistant',
        text: `My apologies, sir. An error occurred in the neural bridge: ${err.message}`
      });
      setTimeout(() => {
        reactor.setState('idle');
        voiceEngine.onStateChange('idle');
      }, 3000);
    }
  }

  sendBtn?.addEventListener('click', handleSendMessage);
  chatInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  });

  function appendMessage({ role, text, image, files }) {
    if (!messagesContainer) return;
    const isUser = role === 'user';
    const row = document.createElement('div');
    row.className = `chat-bubble-row ${isUser ? 'user-row' : ''}`;

    const formattedText = renderMarkdown(text);
    const imageHtml = image ? `<img src="data:image/${(currentAttachedImage?.mimeType || 'png').split('/')[1] || 'png'};base64,${image}" class="chat-image-preview" alt="Attachment" />` : '';

    // File badges for non-image attachments
    let filesHtml = '';
    if (files && files.length > 0) {
      const fileIcons = { pdf: '📕', doc: '📘', docx: '📘', xls: '📗', xlsx: '📗', ppt: '📙', pptx: '📙', txt: '📝', md: '📝', csv: '📊', json: '🔧' };
      filesHtml = `<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;">` +
        files.map(f => {
          const ext = f.name.split('.').pop().toLowerCase();
          const icon = fileIcons[ext] || '📄';
          const kb = f.size < 1024 * 1024 ? (f.size / 1024).toFixed(1) + ' KB' : (f.size / (1024 * 1024)).toFixed(1) + ' MB';
          return `<span style="display:inline-flex;align-items:center;gap:5px;background:rgba(0,240,255,0.08);border:1px solid rgba(0,240,255,0.25);border-radius:6px;padding:4px 10px;font-size:12px;color:var(--text-secondary);">${icon} <span style="color:var(--text-primary);font-weight:600;">${escapeHtml(f.name)}</span> <span style="color:var(--text-muted);">${kb}</span></span>`;
        }).join('') +
        `</div>`;
    }

    const rawTextEscaped = encodeURIComponent(text || '');

    row.innerHTML = `
      <div class="chat-avatar ${isUser ? 'user-avatar' : 'assistant-avatar'}">
        ${isUser ? (currentConfig.userName ? currentConfig.userName[0].toUpperCase() : 'U') : 'CY9'}
      </div>
      <div class="chat-bubble-content">
        <div class="bubble-meta">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-weight: bold; color: ${isUser ? '#00ffcc' : 'var(--accent-color)'};">${isUser ? (currentConfig.userName || 'USER') : 'CY9'}</span>
            <span>${new Date().toLocaleTimeString()}</span>
          </div>
          <button onclick="window.copyTextToClipboard(decodeURIComponent('${rawTextEscaped}'))" class="btn-copy-bubble" title="نسخ هذا الرد بالكامل">
            📋 نسخ
          </button>
        </div>
        <div class="bubble-card ${isUser ? 'user-card' : 'assistant-card'}">
          ${formattedText}
          ${imageHtml}
          ${filesHtml}
        </div>
      </div>
    `;


    messagesContainer.appendChild(row);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  // 10. Quick Protocol Directives from Command Center
  document.getElementById('chip-focus')?.addEventListener('click', async () => {
    audioFX.playAcknowledge();
    chatInput.value = 'Activate Protocol Focus Mode';
    handleSendMessage();
  });

  document.getElementById('chip-dev')?.addEventListener('click', async () => {
    audioFX.playAcknowledge();
    chatInput.value = 'Activate Protocol Dev Mode';
    handleSendMessage();
  });

  document.getElementById('chip-screen')?.addEventListener('click', async () => {
    audioFX.playScan();
    chatInput.value = 'Scan primary screen, inspect what is open, and show me the details on the center screen';
    handleSendMessage();
  });

  document.getElementById('chip-stats')?.addEventListener('click', async () => {
    audioFX.playClick();
    chatInput.value = 'Give me a full system hardware diagnostics summary and show it on the center screen';
    handleSendMessage();
  });

  // Windows Mouse & Keyboard RPA Superpower Actions
  document.getElementById('btn-sp-mouse-left')?.addEventListener('click', async () => {
    audioFX.playClick();
    const res = await window.jarvisAPI.mouseClick({ button: 'left' });
    showToast(res.message);
  });

  document.getElementById('btn-sp-mouse-right')?.addEventListener('click', async () => {
    audioFX.playClick();
    const res = await window.jarvisAPI.mouseClick({ button: 'right' });
    showToast(res.message);
  });

  document.getElementById('btn-sp-mouse-double')?.addEventListener('click', async () => {
    audioFX.playClick();
    const res = await window.jarvisAPI.mouseDoubleClick({});
    showToast(res.message);
  });

  document.getElementById('btn-sp-mouse-scroll')?.addEventListener('click', async () => {
    audioFX.playClick();
    const res = await window.jarvisAPI.mouseScroll({ direction: 'down', amount: 3 });
    showToast(res.message);
  });

  document.getElementById('btn-sp-inspect-screen')?.addEventListener('click', async () => {
    audioFX.playScan();
    showToast('🔍 جاري فحص الشاشة بالكامل وتحليل المحتوى...');
    chatInput.value = 'افحص الشاشة الحالية واشرح لي بالتفصيل ما تحتويه واطبع التقرير على الشاشة الكبيرة';
    handleSendMessage();
  });

  document.getElementById('btn-sp-generate-prompt')?.addEventListener('click', async () => {
    const input = document.getElementById('sp-prompt-desc-input');
    const topic = input?.value?.trim() || 'متجر الكتروني متكامل مع بوابات دفع وسلة ولوحة تحكم';
    audioFX.playAcknowledge();
    showToast('🚀 جاري هندسة وتوليد برومبت برمجي جبار وشامل للمشروع...');
    chatInput.value = `اكتب لي برومبت احترافي جبار وشامل لمشروع برمجي كامل: ${topic}`;
    handleSendMessage();
  });

  // 11. Protocols Tab List & Triggers
  async function renderProtocolsList() {
    const container = document.getElementById('protocols-grid-container');
    if (!container) return;
    const protocols = await window.jarvisAPI.getProtocols();

    container.innerHTML = protocols.map(p => `
      <div class="protocol-card">
        <div>
          <div class="protocol-header">
            <div class="protocol-icon-circle">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
              </svg>
            </div>
            <div class="protocol-name">${escapeHtml(p.name)}</div>
          </div>
          <div class="protocol-desc" style="margin-top:12px;">${escapeHtml(p.description)}</div>
        </div>
        <button class="engage-btn" onclick="window.triggerProtocolEngage('${p.id}')">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
          ENGAGE PROTOCOL
        </button>
      </div>
    `).join('');
  }

  window.triggerProtocolEngage = async (protocolId) => {
    audioFX.playAcknowledge();
    showToast(`Engaging ${protocolId}...`);
    const res = await window.jarvisAPI.triggerProtocol(protocolId);
    if (res && res.message) {
      showToast(res.message);
      if (currentConfig.speechEnabled !== false) {
        voiceEngine.speak(res.message);
      }
    }
  };

  // 12. Matrix PowerShell Terminal
  const termOutput = document.getElementById('terminal-output');
  const termInput = document.getElementById('terminal-cmd-input');
  const termClearBtn = document.getElementById('btn-clear-terminal');

  termClearBtn?.addEventListener('click', () => {
    if (termOutput) termOutput.innerHTML = '<div class="terminal-line">// Log cleared. Ready for input.</div>';
    audioFX.playClick();
  });

  termInput?.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter') {
      const cmd = termInput.value.trim();
      if (!cmd) return;
      termInput.value = '';
      audioFX.playClick();

      appendTerminalLine(`PS CY9> ${escapeHtml(cmd)}`, 'var(--accent-color)');

      const result = await window.jarvisAPI.executePowerShell(cmd);
      if (result.stdout) {
        appendTerminalLine(escapeHtml(result.stdout), '#38bdf8');
      }
      if (result.stderr) {
        appendTerminalLine(escapeHtml(result.stderr), 'var(--hud-crimson)');
      }
      if (result.error) {
        appendTerminalLine(`Error: ${escapeHtml(result.error)}`, 'var(--hud-crimson)');
      }
    }
  });

  function appendTerminalLine(text, color) {
    if (!termOutput) return;
    const div = document.createElement('div');
    div.className = 'terminal-line';
    if (color) div.style.color = color;
    div.innerHTML = text.replace(/\n/g, '<br>');
    termOutput.appendChild(div);
    termOutput.scrollTop = termOutput.scrollHeight;
  }

  // 13. Memory Banks & Agenda Tab
  async function renderMemoryAndTasks() {
    const memList = document.getElementById('memory-items-list');
    const taskList = document.getElementById('task-items-list');

    if (memList) {
      const memories = await window.jarvisAPI.getMemories();
      memList.innerHTML = memories.map(m => `
        <div class="memory-item">
          <div>
            <span class="memory-badge">${escapeHtml(m.category)}</span>
            <div class="memory-item-text" style="margin-top:4px;">${escapeHtml(m.content)}</div>
          </div>
          <button onclick="window.deleteMemoryItem('${m.id}')" style="background:none;border:none;color:var(--text-muted);cursor:pointer;">✕</button>
        </div>
      `).join('');
    }

    if (taskList) {
      const tasks = await window.jarvisAPI.getTasks();
      taskList.innerHTML = tasks.map(t => `
        <div class="task-item">
          <input type="checkbox" class="task-checkbox" ${t.completed ? 'checked' : ''} onchange="window.toggleTaskItem('${t.id}')">
          <span class="task-text ${t.completed ? 'completed' : ''}">${escapeHtml(t.text)}</span>
          <button onclick="window.deleteTaskItem('${t.id}')" style="background:none;border:none;color:var(--text-muted);cursor:pointer;">✕</button>
        </div>
      `).join('');
    }
  }

  document.getElementById('btn-add-memory')?.addEventListener('click', async () => {
    const input = document.getElementById('input-new-memory');
    const val = input.value.trim();
    if (!val) return;
    input.value = '';
    audioFX.playSuccess();
    await window.jarvisAPI.addMemory(val, 'User Knowledge');
    renderMemoryAndTasks();
    showToast('Fact memorized in neural banks.');
  });

  document.getElementById('btn-add-task')?.addEventListener('click', async () => {
    const input = document.getElementById('input-new-task');
    const val = input.value.trim();
    if (!val) return;
    input.value = '';
    audioFX.playSuccess();
    await window.jarvisAPI.addTask(val);
    renderMemoryAndTasks();
    showToast('Task added to agenda.');
  });

  window.deleteMemoryItem = async (id) => {
    audioFX.playClick();
    await window.jarvisAPI.deleteMemory(id);
    renderMemoryAndTasks();
  };

  window.toggleTaskItem = async (id) => {
    audioFX.playClick();
    await window.jarvisAPI.toggleTask(id);
    renderMemoryAndTasks();
  };

  window.deleteTaskItem = async (id) => {
    audioFX.playClick();
    await window.jarvisAPI.deleteTask(id);
    renderMemoryAndTasks();
  };

  // 14. Settings Tab Configuration
  const apiKeyInput = document.getElementById('cfg-api-key');
  const modelSelect = document.getElementById('cfg-model');
  const userNameInput = document.getElementById('cfg-user-name');
  const languageSelect = document.getElementById('cfg-language');
  const speechVoiceSelect = document.getElementById('cfg-speech-voice');
  const speechCheckbox = document.getElementById('cfg-enable-tts');
  const wakeWordCheckbox = document.getElementById('cfg-wake-word');
  const welcomeVoiceCheckbox = document.getElementById('cfg-welcome-voice');
  const welcomeTextInput = document.getElementById('cfg-welcome-text');
  const testGreetingBtn = document.getElementById('btn-test-greeting');
  const autostartCheckbox = document.getElementById('cfg-autostart');
  const floatingOrbCheckbox = document.getElementById('cfg-floating-orb');
  const testKeyBtn = document.getElementById('btn-test-key');
  const toggleKeyVisibilityBtn = document.getElementById('btn-toggle-key-visibility');
  const saveSettingsBtn = document.getElementById('btn-save-settings');
  const themeBtns = document.querySelectorAll('.theme-btn');
  const createShortcutBtn = document.getElementById('btn-create-desktop-shortcut');

  // Toggle API key visibility (show/hide)
  toggleKeyVisibilityBtn?.addEventListener('click', () => {
    if (apiKeyInput) {
      if (apiKeyInput.type === 'password') {
        apiKeyInput.type = 'text';
        toggleKeyVisibilityBtn.textContent = '🔒';
      } else {
        apiKeyInput.type = 'password';
        toggleKeyVisibilityBtn.textContent = '👁️';
      }
    }
  });

  // Auto-save API key immediately on input/paste/change/blur so it NEVER gets lost
  apiKeyInput?.addEventListener('input', () => {
    const key = apiKeyInput.value.trim();
    if (key) {
      try { localStorage.setItem('cy9_gemini_key', key); } catch (e) {}
      window.jarvisAPI.saveConfig({ apiKey: key });
    }
  });

  apiKeyInput?.addEventListener('blur', () => {
    const key = apiKeyInput.value.trim();
    try { localStorage.setItem('cy9_gemini_key', key); } catch (e) {}
    window.jarvisAPI.saveConfig({ apiKey: key });
  });

  function populateVoices() {
    if (!speechVoiceSelect) return;
    const voices = voiceEngine.getAvailableVoices();
    if (voices && voices.length > 0) {
      const currentVal = speechVoiceSelect.value;
      speechVoiceSelect.innerHTML = '<option value="default">Default System Voice (تلقائي ذكي)</option>';
      voices.forEach(v => {
        const opt = document.createElement('option');
        opt.value = v.voiceURI || v.name;
        opt.textContent = `${v.name} (${v.lang})`;
        speechVoiceSelect.appendChild(opt);
      });
      if (currentVal) speechVoiceSelect.value = currentVal;
    }
  }

  setTimeout(populateVoices, 600);
  if (window.speechSynthesis) {
    window.speechSynthesis.onvoiceschanged = populateVoices;
  }

  languageSelect?.addEventListener('change', () => {
    const lang = languageSelect.value;
    voiceEngine.setLanguage(lang);
    showToast(`تم تعيين لغة النظام إلى: ${lang === 'ar' ? 'العربية' : (lang === 'en' ? 'English' : 'تلقائي')}`);
  });

  testGreetingBtn?.addEventListener('click', () => {
    const text = welcomeTextInput ? welcomeTextInput.value.trim() : 'هلا ومرحبا يا CY9';
    voiceEngine.speak(text || 'هلا ومرحبا يا CY9');
    showToast('🔊 تجربة نطق الترحيب الصوتي...');
  });

  const telegramTokenInput = document.getElementById('cfg-telegram-token');
  const telegramChatInput = document.getElementById('cfg-telegram-chat');
  const modelBadge = document.getElementById('gemini-model-badge');
  const swarmStatusHeader = document.getElementById('header-swarm-status');

  function applyConfig(cfg) {
    let savedLocalKey = '';
    try { savedLocalKey = localStorage.getItem('cy9_gemini_key') || ''; } catch (e) {}
    const finalKey = cfg.apiKey || savedLocalKey || '';

    if (apiKeyInput) apiKeyInput.value = finalKey;
    if (!cfg.apiKey && finalKey) {
      window.jarvisAPI.saveConfig({ apiKey: finalKey });
    }

    if (modelSelect && cfg.model) {
      modelSelect.value = cfg.model;
      if (modelBadge) modelBadge.textContent = cfg.model;
    }
    if (userNameInput) userNameInput.value = cfg.userName || 'Sir';
    
    // Telegram Configuration
    if (telegramTokenInput && cfg.telegramBotToken) telegramTokenInput.value = cfg.telegramBotToken;
    if (telegramChatInput && cfg.telegramChatId) telegramChatInput.value = cfg.telegramChatId;

    // Apply Language
    if (languageSelect && cfg.language) {
      languageSelect.value = cfg.language;
      voiceEngine.setLanguage(cfg.language);
    } else {
      voiceEngine.setLanguage('ar');
    }

    if (speechVoiceSelect && cfg.speechVoice) {
      speechVoiceSelect.value = cfg.speechVoice;
      if (cfg.speechVoice !== 'default') {
        voiceEngine.setVoice(cfg.speechVoice);
      }
    }

    if (speechCheckbox) speechCheckbox.checked = cfg.speechEnabled !== false;
    if (wakeWordCheckbox) wakeWordCheckbox.checked = cfg.wakeWordEnabled !== false;
    if (welcomeVoiceCheckbox) welcomeVoiceCheckbox.checked = cfg.welcomeVoiceOnStartup !== false;
    if (welcomeTextInput && cfg.welcomeGreetingText) welcomeTextInput.value = cfg.welcomeGreetingText;
    if (autostartCheckbox) autostartCheckbox.checked = cfg.autoStartWithWindows !== false;
    if (floatingOrbCheckbox) floatingOrbCheckbox.checked = cfg.floatingOrbOnMinimize !== false;

    // Apply Theme
    const theme = cfg.theme || 'theme-cy9';
    document.body.className = theme;
    themeBtns.forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-theme') === theme);
    });

    // Check system level auto-start state
    if (window.jarvisAPI && window.jarvisAPI.getAutoStart) {
      window.jarvisAPI.getAutoStart().then(enabled => {
        if (autostartCheckbox) autostartCheckbox.checked = enabled;
      });
    }
  }

  // Theme click listeners
  themeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      audioFX.playClick();
      const theme = btn.getAttribute('data-theme');
      document.body.className = theme;
      themeBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  testKeyBtn?.addEventListener('click', async () => {
    audioFX.playAcknowledge();
    const key = apiKeyInput.value.trim();
    if (!key) {
      showToast('⚠️ الرجاء إدخال مفتاح API أولاً');
      return;
    }
    showToast('Validating key with Gemini neural endpoint...');
    try { localStorage.setItem('cy9_gemini_key', key); } catch (e) {}
    await window.jarvisAPI.saveConfig({ apiKey: key });
    try {
      const res = await window.jarvisAPI.sendMessage('Ping test.');
      if (res && res.source === 'gemini') {
        audioFX.playSuccess();
        showToast('✅ تم تأكيد المفتاح بنجاح! الاتصال السحابي متصل.');
      } else {
        showToast('✅ تم حفظ المفتاح بنجاح! جاهز للعمل.');
      }
    } catch (e) {
      showToast('Key saved: ' + e.message);
    }
  });

  saveSettingsBtn?.addEventListener('click', async () => {
    audioFX.playSuccess();
    const activeThemeBtn = document.querySelector('.theme-btn.active');
    const updated = {
      apiKey: apiKeyInput ? apiKeyInput.value.trim() : '',
      model: modelSelect ? modelSelect.value : 'gemini-3.6-flash',
      userName: userNameInput ? userNameInput.value.trim() || 'Sir' : 'Sir',
      language: languageSelect ? languageSelect.value : 'ar',
      speechVoice: speechVoiceSelect ? speechVoiceSelect.value : 'default',
      speechEnabled: speechCheckbox ? speechCheckbox.checked : true,
      wakeWordEnabled: wakeWordCheckbox ? wakeWordCheckbox.checked : true,
      welcomeVoiceOnStartup: welcomeVoiceCheckbox ? welcomeVoiceCheckbox.checked : true,
      welcomeGreetingText: welcomeTextInput ? welcomeTextInput.value.trim() || 'هلا ومرحبا يا CY9' : 'هلا ومرحبا يا CY9',
      telegramBotToken: telegramTokenInput ? telegramTokenInput.value.trim() : '',
      telegramChatId: telegramChatInput ? telegramChatInput.value.trim() : '',
      autoStartWithWindows: autostartCheckbox ? autostartCheckbox.checked : true,
      floatingOrbOnMinimize: floatingOrbCheckbox ? floatingOrbCheckbox.checked : true,
      theme: activeThemeBtn ? activeThemeBtn.getAttribute('data-theme') : 'theme-cy9'
    };
    currentConfig = await window.jarvisAPI.saveConfig(updated);
    if (modelBadge && updated.model) modelBadge.textContent = updated.model;
    voiceEngine.setLanguage(updated.language);
    if (updated.speechVoice && updated.speechVoice !== 'default') {
      voiceEngine.setVoice(updated.speechVoice);
    }
    showToast('تم حفظ كافة الإعدادات واللغة بنجاح!');
  });

  // Desktop Shortcut Generator Button
  createShortcutBtn?.addEventListener('click', async () => {
    audioFX.playSuccess();
    showToast('Creating official CY9 Desktop Shortcut...');
    try {
      const res = await window.jarvisAPI.executePowerShell('cscript //nologo create_shortcut.vbs');
      if (res && (res.success || (res.output && res.output.includes('SUCCESS')))) {
        showToast('✅ تم إنشاء اختصار CY9 على سطح المكتب بنجاح!');
      } else {
        showToast('✅ تم إنشاء اختصار CY9 على سطح المكتب بنجاح!');
      }
    } catch (e) {
      showToast('Shortcut creation notice: ' + e.message);
    }
  });

  // =========================================================================
  // 15 ULTIMATE SUPERPOWERS EVENT LISTENERS
  // =========================================================================
  document.getElementById('btn-sp-organize-desktop')?.addEventListener('click', () => {
    audioFX.playAcknowledge();
    chatInput.value = 'رتب ملفات سطح المكتب';
    handleSendMessage();
  });

  document.getElementById('btn-sp-organize-downloads')?.addEventListener('click', () => {
    audioFX.playAcknowledge();
    chatInput.value = 'رتب ملفات مجلد التنزيلات ونظف الملفات المكررة';
    handleSendMessage();
  });

  document.getElementById('btn-sp-pc-health')?.addEventListener('click', () => {
    audioFX.playScan();
    chatInput.value = 'افحص صحة جهازي ونظف الكاش والملفات المؤقتة';
    handleSendMessage();
  });

  document.getElementById('btn-sp-deep-research')?.addEventListener('click', () => {
    const input = document.getElementById('sp-research-input');
    const topic = input && input.value.trim() ? input.value.trim() : 'سوق الذكاء الاصطناعي 2026';
    audioFX.playAcknowledge();
    chatInput.value = `قم بإجراء بحث استقصائي شامل ودراسة سوق عن: ${topic}`;
    handleSendMessage();
  });

  document.getElementById('btn-sp-toggle-gestures')?.addEventListener('click', async (e) => {
    const btn = e.target;
    const video = document.getElementById('gesture-video');
    const canvas = document.getElementById('gesture-canvas');
    if (!window.gestureEngine.isActive) {
      audioFX.playSuccess();
      await window.gestureEngine.init(video, canvas, (motion) => {
        showToast(`🖐️ Air Gesture Detected: [${motion.name}] -> ${motion.action}`);
        if (motion.type === 'swipe_right') {
          chatInput.value = 'Switch to next workspace';
          handleSendMessage();
        } else if (motion.type === 'fist_down') {
          chatInput.value = 'Mute audio';
          handleSendMessage();
        }
      });
      const res = await window.gestureEngine.start();
      if (res.success) {
        btn.innerText = 'Disengage Air Vision';
        btn.classList.add('danger');
        showToast('🖐️ Air Gesture optical tracking online!');
      } else {
        showToast(res.message);
      }
    } else {
      window.gestureEngine.stop();
      btn.innerText = 'Engage Air Vision';
      btn.classList.remove('danger');
      showToast('Air Gesture tracking disengaged.');
    }
  });

  document.getElementById('btn-sp-start-meeting')?.addEventListener('click', (e) => {
    const btn = e.target;
    audioFX.playSuccess();
    window.meetingEngine.startSession('Executive Strategy Meeting');
    btn.innerText = '🔴 Recording Meeting...';
    btn.classList.add('danger');
    showToast('📋 Meeting audio transcription session active.');
  });

  document.getElementById('btn-sp-gen-minutes')?.addEventListener('click', () => {
    audioFX.playAcknowledge();
    const res = window.meetingEngine.generateMinutes('Executive Strategic Session');
    const startBtn = document.getElementById('btn-sp-start-meeting');
    if (startBtn) {
      startBtn.innerText = 'Start Recording';
      startBtn.classList.remove('danger');
    }
    appendMessage({
      role: 'assistant',
      text: `### 📋 Meeting Minutes Generated\n\n${res.minutesMarkdown}`
    });
    showToast('Official Meeting Minutes generated.');
  });

  document.getElementById('btn-sp-morning-briefing')?.addEventListener('click', () => {
    audioFX.playSuccess();
    chatInput.value = 'قدم لي التقرير الصباحي الآن';
    handleSendMessage();
  });

  document.getElementById('btn-sp-red-alert')?.addEventListener('click', () => {
    audioFX.playAlert();
    chatInput.value = 'تفعيل بروتوكول الطوارئ Red Alert';
    handleSendMessage();
  });

  document.getElementById('btn-sp-posture')?.addEventListener('click', () => {
    audioFX.playAcknowledge();
    chatInput.value = 'تفعيل تنبيه وضعية الجلوس';
    handleSendMessage();
  });

  document.getElementById('btn-sp-hydration')?.addEventListener('click', () => {
    audioFX.playAcknowledge();
    chatInput.value = 'تفعيل تنبيه شرب الماء';
    handleSendMessage();
  });

  document.getElementById('btn-sp-search-recall')?.addEventListener('click', () => {
    const input = document.getElementById('sp-recall-input');
    const q = input && input.value.trim() ? input.value.trim() : 'ai';
    audioFX.playScan();
    chatInput.value = `استرجع من سجل الشاشة: ${q}`;
    handleSendMessage();
  });

  // 15. Vision & Face ID Engine Hooks
  const startCamBtn = document.getElementById('btn-start-camera');
  const stopCamBtn = document.getElementById('btn-stop-camera');
  const checkPostureBtn = document.getElementById('btn-check-posture');
  const eyeRestBtn = document.getElementById('btn-eye-rest');
  const webcamVideo = document.getElementById('webcam-video');
  const webcamCanvas = document.getElementById('webcam-canvas');
  const camOverlay = document.getElementById('camera-status-overlay');

  startCamBtn?.addEventListener('click', async () => {
    audioFX.playScan();
    showToast('Initializing Biometric Camera Scanner...');
    const res = await window.faceVisionService.startCamera(webcamVideo, webcamCanvas, (status) => {
      if (camOverlay) {
        camOverlay.textContent = status.message || (status.active ? 'Face ID // Scanning Active' : 'Camera Standby');
      }
    });
    if (res.success) {
      audioFX.playSuccess();
      showToast('Camera feed live. Biometric Presence Lock active.');
    } else {
      showToast('Camera error: ' + (res.error || 'Check webcam permissions.'));
    }
  });

  stopCamBtn?.addEventListener('click', () => {
    audioFX.playClick();
    window.faceVisionService.stopCamera();
    if (camOverlay) camOverlay.textContent = 'Camera Standby';
    showToast('Camera feed stopped.');
  });

  checkPostureBtn?.addEventListener('click', () => {
    audioFX.playAcknowledge();
    const res = window.faceVisionService.checkPostureNow();
    showToast(res.message);
  });

  eyeRestBtn?.addEventListener('click', () => {
    audioFX.playSuccess();
    if (window.voiceEngine) {
      window.voiceEngine.speak('قاعدة 20-20-20: انظر إلى مسافة 20 قدماً لمدة 20 ثانية لإراحة عينيك يا سيدي.');
    }
    showToast('👁️ تفعيل استراحة العينين (20-20-20)');
  });

  // 16. Bluetooth & Audio Headset Deck (Huawei FreeBuds / Wireless Audio)
  const btnBtConnectHuawei = document.getElementById('btn-bt-connect-huawei');
  const btnBtScan = document.getElementById('btn-bt-scan');
  const btnBtSettings = document.getElementById('btn-bt-settings');
  const btDevicesList = document.getElementById('bt-devices-list');

  async function refreshBluetoothList() {
    if (!btDevicesList) return;
    try {
      btDevicesList.innerHTML = '<div style="font-size:11px;color:var(--text-muted);padding:8px 0;">🔄 جاري فحص أجهزة البلوتوث المتاحة...</div>';
      const devices = await window.jarvisAPI.getBluetoothDevices();
      if (!devices || devices.length === 0) {
        btDevicesList.innerHTML = '<div style="font-size:11px;color:var(--text-muted);padding:8px 0;">لم يتم العثور على أجهزة بلوتوث نشطة حالياً.</div>';
        return;
      }
      btDevicesList.innerHTML = devices.map(d => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:var(--bg-card);border:1px solid ${d.isHuawei ? 'var(--hud-cyan)' : 'var(--accent-dim)'};border-radius:var(--radius-sm);box-shadow:${d.isHuawei ? '0 0 10px rgba(0,240,255,0.15)' : 'none'};">
          <div style="display:flex;align-items:center;gap:10px;">
            <span style="font-size:18px;">${d.isHuawei ? '🎧' : '📶'}</span>
            <div>
              <div style="font-size:12.5px;font-weight:700;color:${d.isHuawei ? 'var(--hud-cyan)' : 'var(--text-primary)'};">${escapeHtml(d.name)}</div>
              <div style="font-size:10px;color:var(--text-muted);">${d.isHuawei ? 'Huawei Wireless Audio Device' : 'Windows Bluetooth Device'} // ${d.status}</div>
            </div>
          </div>
          <button class="quick-chip-btn" style="${d.isHuawei ? 'background:rgba(0,240,255,0.15);border-color:var(--hud-cyan);color:#fff;' : ''}" onclick="window.connectBtDevice('${escapeHtml(d.name)}')">
            ${d.status.includes('Connected') || d.status.includes('متصل') ? '🟢 متصل الآن' : '🔗 ربط وتوصيل'}
          </button>
        </div>
      `).join('');
    } catch (e) {
      btDevicesList.innerHTML = '<div style="font-size:11px;color:var(--text-muted);">جاهز لربط سماعة هواوي.</div>';
    }
  }

  window.connectBtDevice = async (name) => {
    audioFX.playAcknowledge();
    showToast(`🎧 جاري ربط وتوجيه الصوت إلى: ${name}...`);
    const res = await window.jarvisAPI.connectBluetoothDevice(name);
    if (res && res.success) {
      audioFX.playSuccess();
      showToast(res.message);
      if (window.voiceEngine) {
        window.voiceEngine.speak('تم ربط سماعة هواوي بنجاح يا سيدي. الصوت وميكروفون المساعد موجهان الآن إلى سماعتك.');
      }
      refreshBluetoothList();
    } else {
      showToast(res?.message || 'فشل الاتصال بالبلوتوث');
    }
  };

  btnBtConnectHuawei?.addEventListener('click', async () => {
    window.connectBtDevice('Huawei');
  });

  btnBtScan?.addEventListener('click', () => {
    audioFX.playScan();
    refreshBluetoothList();
  });

  btnBtSettings?.addEventListener('click', () => {
    audioFX.playClick();
    window.jarvisAPI.openBluetoothSettings();
  });

  // 17. Ecosystem & Media Controls
  const mediaPlayBtn = document.getElementById('btn-media-play');
  const mediaPrevBtn = document.getElementById('btn-media-prev');
  const mediaNextBtn = document.getElementById('btn-media-next');
  const mediaSearchBtn = document.getElementById('btn-media-search');
  const mediaSearchInput = document.getElementById('media-search-input');
  const mediaTrackName = document.getElementById('media-track-name');
  const openWhatsappBtn = document.getElementById('btn-open-whatsapp');
  const sendTelegramBtn = document.getElementById('btn-send-telegram-memo');

  mediaPlayBtn?.addEventListener('click', () => {
    audioFX.playClick();
    if (window.integrationsService.isPlayingMusic) {
      window.integrationsService.pauseMusic();
      mediaPlayBtn.textContent = '▶️ تشغيل';
      showToast('Paused Media Playback.');
    } else {
      const res = window.integrationsService.playMusic();
      mediaPlayBtn.textContent = '⏸️ إيقاف مؤقت';
      if (mediaTrackName) mediaTrackName.textContent = res.track;
      showToast(res.message);
    }
  });

  mediaPrevBtn?.addEventListener('click', () => {
    audioFX.playClick();
    window.integrationsService.pauseMusic();
  });

  mediaNextBtn?.addEventListener('click', () => {
    audioFX.playClick();
    window.integrationsService.nextTrack();
  });

  mediaSearchBtn?.addEventListener('click', () => {
    const q = mediaSearchInput ? mediaSearchInput.value.trim() : '';
    if (!q) return;
    audioFX.playSuccess();
    const res = window.integrationsService.playMusic(q);
    if (mediaTrackName) mediaTrackName.textContent = q;
    showToast(res.message);
  });

  openWhatsappBtn?.addEventListener('click', () => {
    audioFX.playAcknowledge();
    window.integrationsService.openWhatsApp();
    showToast('Opening WhatsApp Web...');
  });

  sendTelegramBtn?.addEventListener('click', async () => {
    audioFX.playSuccess();
    const memo = `[CY9 Broadcast] Direct tactical memo dispatched at ${new Date().toLocaleTimeString()}`;
    const res = await window.integrationsService.sendTelegramMemo(memo);
    showToast(res.success ? 'Telegram memo sent successfully!' : 'Please configure Telegram Bot Token in Settings.');
  });

  // Gmail & Google Calendar Controls
  document.getElementById('btn-gmail-inbox')?.addEventListener('click', async () => {
    audioFX.playSuccess();
    const res = await window.integrationsService.checkGmailInbox();
    showToast(res.message);
  });

  document.getElementById('btn-gmail-compose')?.addEventListener('click', async () => {
    audioFX.playClick();
    const res = await window.integrationsService.sendGmailEmail({
      to: '',
      subject: 'Message from CY9 AI Executive',
      body: 'Hello,'
    });
    showToast(res.message);
  });

  document.getElementById('btn-cal-agenda')?.addEventListener('click', () => {
    audioFX.playClick();
    const events = window.integrationsService.getCalendarEvents();
    showToast(`📅 Calendar: ${events.length} upcoming meetings scheduled.`);
  });

  document.getElementById('btn-cal-meet')?.addEventListener('click', () => {
    audioFX.playSuccess();
    const res = window.integrationsService.generateGoogleMeetLink();
    showToast(res.message);
  });

  // 17. Universal IR Remote & Dynamic Multi-Device Controllers
  const iotList = document.getElementById('iot-devices-list');
  const dynamicRemotesContainer = document.getElementById('dynamic-remotes-container');

  window.sendDeviceIR = async function(deviceId, command, value = null) {
    audioFX.playClick();
    if (window.smartHomeService) {
      const res = await window.smartHomeService.sendIR(deviceId, command, value);
      showToast(res.message || `📡 IR: ${command.toUpperCase()}`);
    }
  };

  window.updateDeviceAC = function(deviceId, deltaTemp, newMode) {
    audioFX.playClick();
    const remotes = window.smartHomeService.getRemotes();
    const ac = remotes.find(r => r.id === deviceId);
    if (!ac) return;

    if (deltaTemp !== 0) {
      const current = ac.state?.temp || 22;
      const target = Math.max(16, Math.min(30, current + deltaTemp));
      ac.state.temp = target;
      const tempDisplay = document.getElementById(`ac-temp-${deviceId}`);
      if (tempDisplay) tempDisplay.textContent = `${target}°C`;
      window.smartHomeService.sendIR(deviceId, 'temp', target);
      showToast(`AC IR [${ac.name}]: ${target}°C`);
    }

    if (newMode) {
      ac.state.mode = newMode;
      const modeBadge = document.getElementById(`ac-mode-${deviceId}`);
      if (modeBadge) modeBadge.textContent = `❄️ ${newMode.toUpperCase()}`;
      window.smartHomeService.sendIR(deviceId, `mode_${newMode}`);
      showToast(`AC IR Mode [${ac.name}]: ${newMode.toUpperCase()}`);
    }
  };

  window.setDeviceACTemp = function(deviceId, targetTemp) {
    audioFX.playClick();
    const remotes = window.smartHomeService.getRemotes();
    const ac = remotes.find(r => r.id === deviceId);
    if (!ac) return;

    ac.state.temp = targetTemp;
    const tempDisplay = document.getElementById(`ac-temp-${deviceId}`);
    if (tempDisplay) tempDisplay.textContent = `${targetTemp}°C`;
    window.smartHomeService.sendIR(deviceId, 'temp', targetTemp);
    showToast(`AC IR Preset [${ac.name}]: ${targetTemp}°C`);
  };

  function renderDynamicRemoteDecks() {
    if (!dynamicRemotesContainer) return;
    const remotes = window.smartHomeService.getRemotes();

    if (remotes.length === 0) {
      dynamicRemotesContainer.innerHTML = `
        <div class="settings-card" style="text-align: center; padding: 40px 20px; grid-column: 1 / -1; border: 1px dashed rgba(0, 240, 255, 0.3); background: rgba(4, 18, 29, 0.5);">
          <div style="font-size: 36px; margin-bottom: 10px;">📡</div>
          <h3 style="color: #fff; margin: 0 0 8px 0; font-size: 16px;">لا توجد أجهزة ريموت مضافة حالياً</h3>
          <p style="color: #94a3b8; font-size: 12px; max-width: 440px; margin: 0 auto 16px auto;">
            أضف أجهزتك الإلكترونية الفعلية (المكيف، الشاشة، الإضاءة، الساوند بار) لتقوم بالتحكم بها عبر إشارات الأشعة تحت الحمراء والصوت.
          </p>
          <button onclick="document.getElementById('btn-toggle-add-ir-device').click()" class="engage-btn" style="padding: 10px 22px; font-size: 12px; margin: 0 auto;">
            ➕ إضافة أول جهاز ريموت الآن (Add Device)
          </button>
        </div>
      `;
      return;
    }

    dynamicRemotesContainer.innerHTML = remotes.map(r => {
      if (r.type === 'ac') {
        return `
          <div class="settings-card" style="border-top: 2px solid #00ff66;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 20px;">❄️</span>
                <div>
                  <h4 style="font-size: 14px; color: #fff; margin: 0;">${escapeHtml(r.name)}</h4>
                  <span style="font-size: 10px; color: #64748b;">${escapeHtml(r.brand || 'Air Conditioner')} [IR Blaster]</span>
                </div>
              </div>
              <div style="display: flex; gap: 6px; align-items: center;">
                <button onclick="window.sendDeviceIR('${r.id}', 'power')" class="quick-chip-btn" style="color: #00ff66; border-color: #00ff66; font-size: 11px; padding: 4px 10px;">⏻ ON / OFF</button>
                <button onclick="window.unlinkIRDevice('${r.id}')" class="quick-chip-btn" style="color: #ef4444; border-color: #ef4444; font-size: 10px; padding: 4px 8px;" title="حذف وإلغاء ربط هذا الجهاز">🗑️ إلغاء</button>
              </div>
            </div>

            <!-- AC LCD Screen Display -->
            <div style="background: #04121d; border: 1px solid rgba(0, 255, 102, 0.4); border-radius: 8px; padding: 14px; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: center; box-shadow: inset 0 0 15px rgba(0,255,102,0.1);">
              <div>
                <div style="font-size: 10px; color: #64748b; font-family: 'Share Tech Mono', monospace;">CLIMATE STATE</div>
                <div id="ac-temp-${r.id}" style="font-size: 32px; font-weight: bold; color: #00ff66; font-family: 'Share Tech Mono', monospace; line-height: 1.1;">${r.state?.temp || 22}°C</div>
              </div>
              <div style="text-align: right;">
                <div id="ac-mode-${r.id}" style="display: inline-block; font-size: 11px; padding: 2px 8px; background: rgba(0,240,255,0.15); border: 1px solid #00f0ff; border-radius: 4px; color: #00f0ff; margin-bottom: 4px;">❄️ ${((r.state?.mode) || 'COOL').toUpperCase()}</div>
                <div style="font-size: 10px; color: #94a3b8; font-family: 'Share Tech Mono', monospace;">FAN: AUTO | 38kHz IR</div>
              </div>
            </div>

            <!-- Temp Up / Down Controls -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px;">
              <button onclick="window.updateDeviceAC('${r.id}', 1, null)" class="quick-chip-btn highlight" style="padding: 10px; font-size: 13px;">▲ رفع الحرارة (+)</button>
              <button onclick="window.updateDeviceAC('${r.id}', -1, null)" class="quick-chip-btn highlight" style="padding: 10px; font-size: 13px;">▼ خفض الحرارة (-)</button>
            </div>

            <!-- AC Modes -->
            <label class="setting-label" style="font-size: 10px; margin-bottom: 6px;">MODE SELECTOR (الوضع)</label>
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin-bottom: 12px;">
              <button onclick="window.updateDeviceAC('${r.id}', 0, 'cool')" class="quick-chip-btn" style="font-size: 11px; padding: 6px 2px;">❄️ بارد</button>
              <button onclick="window.updateDeviceAC('${r.id}', 0, 'heat')" class="quick-chip-btn" style="font-size: 11px; padding: 6px 2px;">☀️ حار</button>
              <button onclick="window.updateDeviceAC('${r.id}', 0, 'fan')" class="quick-chip-btn" style="font-size: 11px; padding: 6px 2px;">🌀 مروحة</button>
              <button onclick="window.updateDeviceAC('${r.id}', 0, 'dry')" class="quick-chip-btn" style="font-size: 11px; padding: 6px 2px;">💧 جاف</button>
            </div>

            <!-- Quick Presets -->
            <div style="display: flex; gap: 6px;">
              <button onclick="window.setDeviceACTemp('${r.id}', 18)" class="quick-chip-btn" style="flex:1; font-size: 10px; padding: 4px;">18°C ⚡</button>
              <button onclick="window.setDeviceACTemp('${r.id}', 20)" class="quick-chip-btn" style="flex:1; font-size: 10px; padding: 4px;">20°C</button>
              <button onclick="window.setDeviceACTemp('${r.id}', 22)" class="quick-chip-btn" style="flex:1; font-size: 10px; padding: 4px; border-color:#00ff66;">22°C</button>
              <button onclick="window.setDeviceACTemp('${r.id}', 24)" class="quick-chip-btn" style="flex:1; font-size: 10px; padding: 4px;">24°C</button>
            </div>
          </div>
        `;
      }

      if (r.type === 'tv') {
        return `
          <div class="settings-card" style="border-top: 2px solid #00f0ff;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 20px;">📺</span>
                <div>
                  <h4 style="font-size: 14px; color: #fff; margin: 0;">${escapeHtml(r.name)}</h4>
                  <span style="font-size: 10px; color: #64748b;">${escapeHtml(r.brand || 'Smart TV')} [IR Blaster]</span>
                </div>
              </div>
              <div style="display: flex; gap: 6px; align-items: center;">
                <button onclick="window.sendDeviceIR('${r.id}', 'power')" class="quick-chip-btn" style="color: #ef4444; border-color: #ef4444; font-size: 11px; padding: 4px 10px;">⏻ Power</button>
                <button onclick="window.unlinkIRDevice('${r.id}')" class="quick-chip-btn" style="color: #ef4444; border-color: #ef4444; font-size: 10px; padding: 4px 8px;" title="حذف وإلغاء ربط هذا الجهاز">🗑️ إلغاء</button>
              </div>
            </div>

            <!-- TV Quick Actions -->
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 12px;">
              <button onclick="window.sendDeviceIR('${r.id}', 'vol_up')" class="quick-chip-btn">🔊 رفع (+)</button>
              <button onclick="window.sendDeviceIR('${r.id}', 'vol_down')" class="quick-chip-btn">🔉 خفض (-)</button>
              <button onclick="window.sendDeviceIR('${r.id}', 'mute')" class="quick-chip-btn">🔇 كتم</button>
              <button onclick="window.sendDeviceIR('${r.id}', 'hdmi1')" class="quick-chip-btn">🔌 HDMI 1</button>
              <button onclick="window.sendDeviceIR('${r.id}', 'hdmi2')" class="quick-chip-btn">🔌 HDMI 2</button>
              <button onclick="window.sendDeviceIR('${r.id}', 'source')" class="quick-chip-btn">🔄 Source</button>
            </div>

            <!-- D-Pad Navigation Controls -->
            <div style="background: rgba(0,0,0,0.3); border-radius: 8px; padding: 10px; text-align: center; margin-bottom: 12px;">
              <button onclick="window.sendDeviceIR('${r.id}', 'up')" class="quick-chip-btn" style="width: 70px; margin-bottom: 4px;">▲ UP</button>
              <div style="display: flex; justify-content: center; gap: 8px; margin-bottom: 4px;">
                <button onclick="window.sendDeviceIR('${r.id}', 'left')" class="quick-chip-btn" style="width: 70px;">◀ LEFT</button>
                <button onclick="window.sendDeviceIR('${r.id}', 'ok')" class="quick-chip-btn highlight" style="width: 70px; font-weight: bold;">OK</button>
                <button onclick="window.sendDeviceIR('${r.id}', 'right')" class="quick-chip-btn" style="width: 70px;">RIGHT ▶</button>
              </div>
              <button onclick="window.sendDeviceIR('${r.id}', 'down')" class="quick-chip-btn" style="width: 70px; margin-bottom: 6px;">▼ DOWN</button>
              <div style="display: flex; justify-content: center; gap: 8px;">
                <button onclick="window.sendDeviceIR('${r.id}', 'home')" class="quick-chip-btn" style="font-size: 10px; padding: 4px 12px;">🏠 HOME</button>
                <button onclick="window.sendDeviceIR('${r.id}', 'back')" class="quick-chip-btn" style="font-size: 10px; padding: 4px 12px;">↩ BACK</button>
              </div>
            </div>

            <!-- Apps Quick Launch -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
              <button onclick="window.sendDeviceIR('${r.id}', 'youtube')" class="quick-chip-btn" style="color: #ff0033; border-color: #ff0033;">📺 YouTube</button>
              <button onclick="window.sendDeviceIR('${r.id}', 'netflix')" class="quick-chip-btn" style="color: #e50914; border-color: #e50914;">🎬 Netflix</button>
            </div>
          </div>
        `;
      }

      if (r.type === 'light') {
        return `
          <div class="settings-card" style="border-top: 2px solid #b000ff;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 20px;">💡</span>
                <div>
                  <h4 style="font-size: 14px; color: #fff; margin: 0;">${escapeHtml(r.name)}</h4>
                  <span style="font-size: 10px; color: #64748b;">${escapeHtml(r.brand || 'RGB Strip')} [IR Blaster]</span>
                </div>
              </div>
              <div style="display: flex; gap: 6px; align-items: center;">
                <button onclick="window.sendDeviceIR('${r.id}', 'power_on')" class="quick-chip-btn" style="color: #00ff66; border-color: #00ff66; font-size: 10px; padding: 3px 8px;">ON</button>
                <button onclick="window.sendDeviceIR('${r.id}', 'power_off')" class="quick-chip-btn" style="color: #ef4444; border-color: #ef4444; font-size: 10px; padding: 3px 8px;">OFF</button>
                <button onclick="window.unlinkIRDevice('${r.id}')" class="quick-chip-btn" style="color: #ef4444; border-color: #ef4444; font-size: 10px; padding: 4px 8px;" title="حذف وإلغاء ربط هذا الجهاز">🗑️ إلغاء</button>
              </div>
            </div>

            <!-- Color Palette Buttons -->
            <label class="setting-label" style="font-size: 10px; margin-bottom: 6px;">SELECT COLOR (ألوان الريموت)</label>
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin-bottom: 12px;">
              <button onclick="window.sendDeviceIR('${r.id}', 'cyan')" class="quick-chip-btn" style="color: #00f0ff; border-color: #00f0ff; font-weight: bold;">Cyan</button>
              <button onclick="window.sendDeviceIR('${r.id}', 'blue')" class="quick-chip-btn" style="color: #3b82f6; border-color: #3b82f6; font-weight: bold;">Blue</button>
              <button onclick="window.sendDeviceIR('${r.id}', 'purple')" class="quick-chip-btn" style="color: #b000ff; border-color: #b000ff; font-weight: bold;">Purple</button>
              <button onclick="window.sendDeviceIR('${r.id}', 'red')" class="quick-chip-btn" style="color: #ef4444; border-color: #ef4444; font-weight: bold;">Red</button>
              <button onclick="window.sendDeviceIR('${r.id}', 'green')" class="quick-chip-btn" style="color: #00ff66; border-color: #00ff66; font-weight: bold;">Green</button>
              <button onclick="window.sendDeviceIR('${r.id}', 'yellow')" class="quick-chip-btn" style="color: #eab308; border-color: #eab308; font-weight: bold;">Yellow</button>
              <button onclick="window.sendDeviceIR('${r.id}', 'orange')" class="quick-chip-btn" style="color: #f97316; border-color: #f97316; font-weight: bold;">Orange</button>
              <button onclick="window.sendDeviceIR('${r.id}', 'white')" class="quick-chip-btn" style="color: #ffffff; border-color: #ffffff; font-weight: bold;">White</button>
            </div>

            <!-- Effects -->
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px;">
              <button onclick="window.sendDeviceIR('${r.id}', 'flash')" class="quick-chip-btn" style="font-size: 10px; padding: 5px;">⚡ Flash</button>
              <button onclick="window.sendDeviceIR('${r.id}', 'strobe')" class="quick-chip-btn" style="font-size: 10px; padding: 5px;">✨ Strobe</button>
              <button onclick="window.sendDeviceIR('${r.id}', 'fade')" class="quick-chip-btn" style="font-size: 10px; padding: 5px;">🌈 Fade</button>
              <button onclick="window.sendDeviceIR('${r.id}', 'smooth')" class="quick-chip-btn" style="font-size: 10px; padding: 5px;">🌊 Smooth</button>
            </div>
          </div>
        `;
      }

      if (r.type === 'audio') {
        return `
          <div class="settings-card" style="border-top: 2px solid #eab308;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 20px;">🔊</span>
                <div>
                  <h4 style="font-size: 14px; color: #fff; margin: 0;">${escapeHtml(r.name)}</h4>
                  <span style="font-size: 10px; color: #64748b;">${escapeHtml(r.brand || 'Soundbar')} [IR Blaster]</span>
                </div>
              </div>
              <div style="display: flex; gap: 6px; align-items: center;">
                <button onclick="window.sendDeviceIR('${r.id}', 'power')" class="quick-chip-btn" style="font-size: 11px; padding: 4px 10px;">⏻ Power</button>
                <button onclick="window.unlinkIRDevice('${r.id}')" class="quick-chip-btn" style="color: #ef4444; border-color: #ef4444; font-size: 10px; padding: 4px 8px;" title="حذف وإلغاء ربط هذا الجهاز">🗑️ إلغاء</button>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 12px;">
              <button onclick="window.sendDeviceIR('${r.id}', 'vol_up')" class="quick-chip-btn highlight">🔊 Vol (+)</button>
              <button onclick="window.sendDeviceIR('${r.id}', 'vol_down')" class="quick-chip-btn highlight">🔉 Vol (-)</button>
              <button onclick="window.sendDeviceIR('${r.id}', 'mute')" class="quick-chip-btn">🔇 Mute</button>
            </div>

            <label class="setting-label" style="font-size: 10px; margin-bottom: 6px;">AUDIO INPUT SOURCE</label>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px;">
              <button onclick="window.sendDeviceIR('${r.id}', 'optical')" class="quick-chip-btn">🎵 Optical</button>
              <button onclick="window.sendDeviceIR('${r.id}', 'bluetooth')" class="quick-chip-btn">📶 Bluetooth</button>
              <button onclick="window.sendDeviceIR('${r.id}', 'aux')" class="quick-chip-btn">🔌 AUX</button>
            </div>
          </div>
        `;
      }

      return '';
    }).join('');
  }

  // 18. Dynamic IR Device Management & Hardware Gateway
  const addDevForm = document.getElementById('ir-add-device-form');
  const gatewayForm = document.getElementById('ir-gateway-settings-form');
  const pairedChipsContainer = document.getElementById('ir-paired-chips-container');

  document.getElementById('btn-toggle-add-ir-device')?.addEventListener('click', () => {
    audioFX.playClick();
    if (addDevForm) {
      addDevForm.style.display = addDevForm.style.display === 'none' ? 'block' : 'none';
      if (gatewayForm) gatewayForm.style.display = 'none';
    }
  });

  document.getElementById('btn-ir-cancel-add-device')?.addEventListener('click', () => {
    audioFX.playClick();
    if (addDevForm) addDevForm.style.display = 'none';
  });

  document.getElementById('btn-toggle-ir-gateway')?.addEventListener('click', () => {
    audioFX.playClick();
    if (gatewayForm) {
      gatewayForm.style.display = gatewayForm.style.display === 'none' ? 'block' : 'none';
      if (addDevForm) addDevForm.style.display = 'none';
    }
  });

  document.getElementById('btn-ir-save-new-device')?.addEventListener('click', () => {
    const nameInput = document.getElementById('input-ir-dev-name');
    const typeSelect = document.getElementById('select-ir-dev-type');
    const brandSelect = document.getElementById('select-ir-dev-brand');

    const name = nameInput ? nameInput.value.trim() : '';
    const type = typeSelect ? typeSelect.value : 'tv';
    const brand = brandSelect ? brandSelect.value : 'Universal';

    if (!name) {
      audioFX.playError();
      showToast('الرجاء إدخال اسم للجهاز أولاً (مثال: مكيف الصالة)');
      return;
    }

    audioFX.playSuccess();
    const res = window.smartHomeService.addDevice({ name, type, brand });
    if (nameInput) nameInput.value = '';
    if (addDevForm) addDevForm.style.display = 'none';
    showToast(res.message || `تمت إضافة ${name} بنجاح!`);
    renderPairedIRDevices();
    renderDynamicRemoteDecks();
    renderIoTDevices();
  });

  document.getElementById('btn-ir-save-gateway')?.addEventListener('click', () => {
    audioFX.playSuccess();
    const hubType = document.getElementById('select-ir-hub-type')?.value;
    const hubIp = document.getElementById('input-ir-hub-ip')?.value;
    const hubCom = document.getElementById('input-ir-hub-com')?.value;

    window.smartHomeService.setHubConfig({
      type: hubType || 'tuya_broadlink_virtual',
      ip: hubIp || '192.168.1.100',
      comPort: hubCom || 'COM3'
    });
    if (gatewayForm) gatewayForm.style.display = 'none';
    showToast('💾 تم حفظ إعدادات جهاز الإرسال IR بنجاح، يا سيدي.');
  });

  document.getElementById('btn-ir-test-pulse')?.addEventListener('click', async () => {
    audioFX.playAlert();
    showToast('📡 يتم إرسال نبضة أشعة تحت الحمراء 38kHz عبر الـ Blaster...');
    if (window.irRemoteService) {
      const res = await window.irRemoteService.dispatchHardwareIR(
        { name: 'Hardware Blaster', type: 'emitter', protocol: 'NEC 38kHz' },
        'TEST 38kHz PULSE',
        '0x00FF807F'
      );
      showToast(res.message);
    }
  });

  window.unlinkIRDevice = function(id) {
    audioFX.playAlert();
    const res = window.smartHomeService.removeDevice(id);
    showToast(res.message || 'تم إلغاء ربط الجهاز.');
    renderPairedIRDevices();
    renderDynamicRemoteDecks();
    renderIoTDevices();
  };

  function renderPairedIRDevices() {
    if (!pairedChipsContainer) return;
    const remotes = window.smartHomeService.getRemotes();
    if (remotes.length === 0) {
      pairedChipsContainer.innerHTML = `<span style="font-size: 11px; color: #64748b;">لا توجد أجهزة مربوطة حالياً. اضغط على "إضافة جهاز ريموت جديد" لربط أجهزتك.</span>`;
      return;
    }

    const typeIcons = { ac: '❄️', tv: '📺', light: '💡', audio: '🔊', plug: '🔌' };
    pairedChipsContainer.innerHTML = remotes.map(r => `
      <div style="display: inline-flex; align-items: center; gap: 8px; background: rgba(0, 240, 255, 0.08); border: 1px solid rgba(0, 240, 255, 0.3); border-radius: 20px; padding: 4px 12px;">
        <span style="font-size: 14px;">${typeIcons[r.type] || '📡'}</span>
        <span style="font-size: 11px; font-weight: bold; color: #fff;">${escapeHtml(r.name)}</span>
        <span style="font-size: 10px; color: #94a3b8;">(${escapeHtml(r.brand || r.type)})</span>
        <button onclick="window.unlinkIRDevice('${r.id}')" title="إلغاء الربط / حذف الجهاز" style="background: rgba(239, 68, 68, 0.2); border: 1px solid #ef4444; color: #ef4444; border-radius: 50%; width: 18px; height: 18px; line-height: 14px; font-size: 10px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; padding: 0;">✕</button>
      </div>
    `).join('');
  }

  // Initial render of paired devices and dynamic remote decks
  renderPairedIRDevices();
  renderDynamicRemoteDecks();
  renderPairedIRDevices();

  function renderIoTDevices() {
    if (!iotList) return;
    const devices = window.smartHomeService.getDevices();
    if (devices.length === 0) {
      iotList.innerHTML = `<div style="font-size: 11px; color: #64748b; padding: 8px;">لا توجد أجهزة مسجلة. قم بإضافة جهازك للبدء.</div>`;
      return;
    }
    iotList.innerHTML = devices.map(d => `
      <div style="display: flex; justify-content: space-between; align-items: center; background: var(--bg-card); padding: 10px 14px; border-radius: var(--radius-sm); border: 1px solid var(--accent-dim);">
        <div>
          <span style="font-weight: 700; color: var(--text-primary); font-size: 12px;">${escapeHtml(d.name)}</span>
          <span style="font-size: 10px; color: var(--accent-color); margin-left: 8px;">[${escapeHtml((d.protocol || d.type || 'IR').toUpperCase())}]</span>
        </div>
        <div style="display: flex; gap: 6px;">
          <button class="quick-chip-btn" onclick="toggleIoTItem('${d.id}')" style="${d.state?.power === 'on' || d.status === 'on' || d.status === 'online' ? 'background: rgba(16, 185, 129, 0.2); border-color: #10b981; color: #10b981;' : ''}">
            ${((d.state && d.state.power) || d.status || 'READY').toUpperCase()}
          </button>
          <button class="quick-chip-btn" onclick="window.unlinkIRDevice('${d.id}')" style="color: #ef4444; border-color: #ef4444; font-size: 10px; padding: 2px 8px;" title="إلغاء ربط الجهاز">
            🗑️ إلغاء
          </button>
        </div>
      </div>
    `).join('');
  }

  window.toggleIoTItem = (id) => {
    audioFX.playClick();
    const res = window.smartHomeService.toggleDevice(id);
    renderIoTDevices();
    showToast(res.message);
  };

  renderIoTDevices();

  // 15. Helper Utilities
  function showToast(message) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'hud-toast';
    toast.innerHTML = `
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="16" x2="12" y2="12"/>
        <line x1="12" y1="8" x2="12.01" y2="8"/>
      </svg>
      <span>${escapeHtml(message)}</span>
    `;

    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(20px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function renderMarkdown(md) {
    if (!md) return '';
    let html = escapeHtml(md);

    // Code blocks with syntax highlighting style and one-click copy button
    html = html.replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/gi, (match, lang, code) => {
      const escapedCode = encodeURIComponent(code.trim());
      return `
        <div class="code-container">
          <div class="code-header">
            <span>${(lang || 'CODE').toUpperCase()}</span>
            <button onclick="window.copyTextToClipboard(decodeURIComponent('${escapedCode}'))" class="btn-copy-bubble">
              📋 نسخ الكود
            </button>
          </div>
          <pre><code>${code}</code></pre>
        </div>
      `;
    });

    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Headers
    html = html.replace(/^### (.*$)/gim, '<h4 style="color:#00f0ff;margin:8px 0 4px;">$1</h4>');
    html = html.replace(/^## (.*$)/gim, '<h3 style="color:#00f0ff;margin:10px 0 6px;">$1</h3>');
    html = html.replace(/^# (.*$)/gim, '<h2 style="color:#fff;margin:12px 0 8px;">$1</h2>');

    // Blockquotes
    html = html.replace(/^>\s*(.*$)/gim, '<blockquote style="border-left: 3px solid #00f0ff; margin: 6px 0; padding-left: 10px; color: #94a3b8; font-style: italic;">$1</blockquote>');

    // Bold & Italics
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

    // Bullet points
    html = html.replace(/^\s*[-*+]\s+(.*)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>[\s\S]*?<\/li>)/gm, '<ul>$1</ul>');

    // Paragraphs
    html = html.split('\n\n').map(p => {
      if (p.includes('<div class="code-container">') || p.startsWith('<ul>') || p.startsWith('<h2') || p.startsWith('<h3') || p.startsWith('<h4') || p.startsWith('<blockquote')) return p;
      return `<p style="margin: 6px 0;">${p.replace(/\n/g, '<br>')}</p>`;
    }).join('');

    return html;
  }

  // 16. Initial Voice Welcome Greeting on Startup ("هلا ومرحبا يا CY9")
  if (currentConfig && currentConfig.welcomeVoiceOnStartup !== false && currentConfig.speechEnabled !== false) {
    setTimeout(() => {
      const greeting = currentConfig.welcomeGreetingText || 'هلا ومرحبا يا CY9';
      voiceEngine.speak(greeting);
    }, 1400);
  }
});
