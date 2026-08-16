const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('jarvisAPI', {
  // Core AI & Agent Chat
  sendMessage: (text, image, files) => ipcRenderer.invoke('cy9:send-message', { text, image, files }),

  onProgress: (callback) => {
    const subscription = (event, data) => callback(data);
    ipcRenderer.on('cy9:progress', subscription);
    return () => ipcRenderer.removeListener('cy9:progress', subscription);
  },

  // Telemetry & Hardware
  getTelemetry: () => ipcRenderer.invoke('cy9:get-telemetry'),

  // Agents
  getAgents: () => ipcRenderer.invoke('cy9:get-agents'),
  onAgentsUpdated: (callback) => {
    const subscription = (event, data) => callback(data);
    ipcRenderer.on('cy9:agents-updated', subscription);
    return () => ipcRenderer.removeListener('cy9:agents-updated', subscription);
  },

  // Configuration & Settings
  getConfig: () => ipcRenderer.invoke('cy9:get-config'),
  saveConfig: (config) => ipcRenderer.invoke('cy9:save-config', config),

  // Long-Term Memory
  getMemories: () => ipcRenderer.invoke('cy9:get-memories'),
  addMemory: (content, category) => ipcRenderer.invoke('cy9:add-memory', { content, category }),
  deleteMemory: (id) => ipcRenderer.invoke('cy9:delete-memory', id),

  // Tasks / Agenda
  getTasks: () => ipcRenderer.invoke('cy9:get-tasks'),
  addTask: (text) => ipcRenderer.invoke('cy9:add-task', text),
  toggleTask: (id) => ipcRenderer.invoke('cy9:toggle-task', id),
  deleteTask: (id) => ipcRenderer.invoke('cy9:delete-task', id),

  // Protocols
  getProtocols: () => ipcRenderer.invoke('cy9:get-protocols'),
  triggerProtocol: (name) => ipcRenderer.invoke('cy9:trigger-protocol', name),
  addProtocol: (protocol) => ipcRenderer.invoke('cy9:add-protocol', protocol),
  deleteProtocol: (id) => ipcRenderer.invoke('cy9:delete-protocol', id),

  // History
  getHistory: () => ipcRenderer.invoke('cy9:get-history'),
  clearHistory: () => ipcRenderer.invoke('cy9:clear-history'),

  // Direct Windows Actions
  captureScreenshot: () => ipcRenderer.invoke('cy9:capture-screenshot'),
  launchApp: (appName) => ipcRenderer.invoke('cy9:launch-app', appName),
  setVolume: (level) => ipcRenderer.invoke('cy9:set-volume', level),
  executePowerShell: (command) => ipcRenderer.invoke('cy9:execute-powershell', command),
  searchPlatform: (platform, query, browser) => ipcRenderer.invoke('cy9:search-platform', { platform, query, browser }),
  controlSmartDevice: (device_type, name, command, value) => ipcRenderer.invoke('cy9:control-smart-device', { device_type, name, command, value }),
  openBrowser: (url, browser) => ipcRenderer.invoke('cy9:open-browser', { url, browser }),
  sendTelegramAlert: (message) => ipcRenderer.invoke('cy9:send-telegram', { message }),
  organizeFiles: (folder) => ipcRenderer.invoke('cy9:organize-files', folder),
  conductDeepResearch: (topic, language) => ipcRenderer.invoke('cy9:deep-research', { topic, language }),

  // Bluetooth & Audio Headset Uplink
  getBluetoothDevices: () => ipcRenderer.invoke('cy9:get-bluetooth-devices'),
  connectBluetoothDevice: (name) => ipcRenderer.invoke('cy9:connect-bluetooth', name),
  openBluetoothSettings: () => ipcRenderer.invoke('cy9:open-bluetooth-settings'),

  // Multimodal AI Speech-to-Text Transcription
  transcribeAudio: (payload) => ipcRenderer.invoke('cy9:transcribe-audio', payload),

  // Window & Widget Controls
  windowMinimize: () => ipcRenderer.invoke('window:minimize'),
  windowMaximize: () => ipcRenderer.invoke('window:maximize'),
  windowClose: () => ipcRenderer.invoke('window:close'),
  toggleAlwaysOnTop: () => ipcRenderer.invoke('window:toggle-always-on-top'),
  toggleMiniMode: () => ipcRenderer.invoke('window:toggle-mini-mode'),
  showFloatingWidget: () => ipcRenderer.invoke('window:show-widget'),
  restoreFromWidget: (triggerVoice) => ipcRenderer.invoke('window:restore-from-widget', triggerVoice),
  showWidgetContextMenu: () => ipcRenderer.invoke('widget:show-context-menu'),
  moveWidget: (dx, dy) => ipcRenderer.invoke('window:move-widget', { dx, dy }),
  quitApp: () => ipcRenderer.invoke('window:quit-app'),

  // Auto-Start with Windows
  getAutoStart: () => ipcRenderer.invoke('cy9:get-autostart'),
  setAutoStart: (enabled) => ipcRenderer.invoke('cy9:set-autostart', enabled),
  toggleAutoStart: () => ipcRenderer.invoke('cy9:toggle-autostart'),

  // Gemini Live Audio & Vision Duplex API (Real-Time Bidirectional Full Duplex)
  liveConnect: () => ipcRenderer.invoke('cy9:live-connect'),
  liveSendAudio: (pcmBase64) => ipcRenderer.invoke('cy9:live-send-audio', pcmBase64),
  liveSendVideo: (jpegBase64) => ipcRenderer.invoke('cy9:live-send-video', jpegBase64),
  liveDisconnect: () => ipcRenderer.invoke('cy9:live-disconnect'),
  onLiveAudioChunk: (callback) => {
    const sub = (event, data) => callback(data);
    ipcRenderer.on('live:audio-chunk', sub);
    return () => ipcRenderer.removeListener('live:audio-chunk', sub);
  },
  onLiveUserTranscript: (callback) => {
    const sub = (event, data) => callback(data);
    ipcRenderer.on('live:user-transcript', sub);
    return () => ipcRenderer.removeListener('live:user-transcript', sub);
  },
  onLiveAiTranscript: (callback) => {
    const sub = (event, data) => callback(data);
    ipcRenderer.on('live:ai-transcript', sub);
    return () => ipcRenderer.removeListener('live:ai-transcript', sub);
  },
  onLiveInterrupted: (callback) => {
    const sub = (event, data) => callback(data);
    ipcRenderer.on('live:interrupted', sub);
    return () => ipcRenderer.removeListener('live:interrupted', sub);
  },
  onLiveStatus: (callback) => {
    const sub = (event, data) => callback(data);
    ipcRenderer.on('live:status', sub);
    return () => ipcRenderer.removeListener('live:status', sub);
  },

  // Windows Native Mouse & Keyboard RPA
  mouseClick: (payload) => ipcRenderer.invoke('cy9:mouse-click', payload),
  mouseMove: (payload) => ipcRenderer.invoke('cy9:mouse-move', payload),
  mouseDoubleClick: (payload) => ipcRenderer.invoke('cy9:mouse-double-click', payload),
  mouseDrag: (payload) => ipcRenderer.invoke('cy9:mouse-drag', payload),
  mouseScroll: (payload) => ipcRenderer.invoke('cy9:mouse-scroll', payload),
  typeText: (text) => ipcRenderer.invoke('cy9:type-text', text),
  pressKey: (key) => ipcRenderer.invoke('cy9:press-key', key),

  // Widget Event Subscriptions
  onWidgetUpdate: (callback) => {
    const subscription = (event, data) => callback(data);
    ipcRenderer.on('widget:update', subscription);
    return () => ipcRenderer.removeListener('widget:update', subscription);
  },
  onRestoreTriggered: (callback) => {
    const subscription = (event, data) => callback(data);
    ipcRenderer.on('cy9:restore-triggered', subscription);
    return () => ipcRenderer.removeListener('cy9:restore-triggered', subscription);
  }
});
