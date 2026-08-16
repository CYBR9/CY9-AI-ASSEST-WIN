const { app, BrowserWindow, ipcMain, globalShortcut, Tray, Menu, nativeImage, screen, session } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Ensure single instance lock so double-clicking desktop shortcut restores CY9
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    restoreMainFromWidget();
  });
}

// Global Process Stability & Crash Guards
process.on('uncaughtException', (err) => {
  console.warn('CY9 Process Stability Guard (uncaughtException):', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.warn('CY9 Process Stability Guard (unhandledRejection):', reason);
});

// Ensure dedicated, isolated user data directory to prevent Windows cache lock conflicts
app.name = 'CY9';
const userDataPath = path.join(os.homedir(), '.cy9_data');
try {
  if (!fs.existsSync(userDataPath)) fs.mkdirSync(userDataPath, { recursive: true });
  app.setPath('userData', userDataPath);
} catch (e) {
  console.warn('Custom userData path warning:', e);
}

const geminiService = require('./src/services/geminiService');
const systemService = require('./src/services/systemService');
const agentManager = require('./src/services/agentManager');
const memoryService = require('./src/services/memoryService');
const bluetoothService = require('./src/services/bluetoothService');
const liveAudioService = require('./src/services/liveAudioService');

let mainWindow = null;
let widgetWindow = null;
let tray = null;
let isQuitting = false;
let isMiniMode = false;
let normalBounds = { width: 1280, height: 820 };

function getAppIcon() {
  const ico = path.join(__dirname, 'src/assets/icon.ico');
  const png = path.join(__dirname, 'src/assets/icon.png');
  if (process.platform === 'win32' && fs.existsSync(ico)) return ico;
  return png;
}

// Auto-Start with Windows Management
function getStartupFolderPath() {
  const appData = process.env.APPDATA || path.join(process.env.USERPROFILE || '', 'AppData', 'Roaming');
  return path.join(appData, 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup');
}

function setAutoStart(enable) {
  try {
    // 1. Electron Native Login Item
    app.setLoginItemSettings({
      openAtLogin: !!enable,
      openAsHidden: false,
      path: process.execPath,
      args: app.isPackaged ? [] : [path.resolve(__dirname)]
    });

    // 2. Windows Startup Folder VBS Shortcut for 100% Guaranteed Launch
    const startupFolder = getStartupFolderPath();
    const vbsFile = path.join(startupFolder, 'CY9_AutoLaunch.vbs');

    if (enable) {
      const targetScript = path.join(__dirname, 'تشغيل_صامت.vbs');
      const vbsContent = `Set WshShell = CreateObject("WScript.Shell")\nWshShell.Run "wscript.exe """ & "${targetScript.replace(/\\/g, '\\\\')}" & """", 0, False\nSet WshShell = Nothing\n`;
      try {
        fs.writeFileSync(vbsFile, vbsContent, 'utf8');
      } catch (e) {
        console.warn('Could not write startup vbs:', e);
      }
    } else {
      if (fs.existsSync(vbsFile)) {
        try {
          fs.unlinkSync(vbsFile);
        } catch (e) {
          console.warn('Could not remove startup vbs:', e);
        }
      }
    }

    memoryService.saveConfig({ autoStartWithWindows: !!enable });
    updateTray();
    return isAutoStartEnabled();
  } catch (err) {
    console.error('Error setting auto-start:', err);
    return false;
  }
}

function isAutoStartEnabled() {
  try {
    const settings = app.getLoginItemSettings();
    const config = memoryService.getConfig();
    const startupFolder = getStartupFolderPath();
    const vbsFile = path.join(startupFolder, 'CY9_AutoLaunch.vbs');
    return !!(settings.openAtLogin || config.autoStartWithWindows || fs.existsSync(vbsFile));
  } catch (err) {
    return false;
  }
}

// ----------------------------------------------------
// Main HUD Window Creation
// ----------------------------------------------------
function createMainWindow() {
  const iconPath = getAppIcon();

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    center: true,
    show: true,
    alwaysOnTop: true,
    frame: false,
    transparent: false,
    backgroundColor: '#080f1d',
    hasShadow: true,
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false
    },
    icon: iconPath
  });

  mainWindow.loadFile(path.join(__dirname, 'src/index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
    mainWindow.moveTop();
  });

  const config = memoryService.getConfig();
  if (config.alwaysOnTop) {
    mainWindow.setAlwaysOnTop(true, 'floating');
  }

  // Intercept window minimize & close to transition into floating widget orb
  mainWindow.on('minimize', (e) => {
    e.preventDefault();
    showWidgetMode();
  });

  mainWindow.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault();
      showWidgetMode();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Forward agent manager updates to renderer
  agentManager.on('agents-updated', (agents) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('cy9:agents-updated', agents);
    }
  });
}

// ----------------------------------------------------
// Floating Animated CY9 Orb Widget (Bottom-Right)
// ----------------------------------------------------
function createWidgetWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { workArea } = primaryDisplay;
  const widgetSize = 120;
  const margin = 16;
  const x = Math.round(workArea.x + workArea.width - widgetSize - margin);
  const y = Math.round(workArea.y + workArea.height - widgetSize - margin);

  widgetWindow = new BrowserWindow({
    width: widgetSize,
    height: widgetSize,
    x: x,
    y: y,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    hasShadow: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false
    },
    icon: getAppIcon()
  });

  widgetWindow.loadFile(path.join(__dirname, 'src/widget.html'));

  // Ensure it floats on top of all desktop apps and games
  widgetWindow.setAlwaysOnTop(true, 'screen-saver');
  widgetWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  widgetWindow.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault();
      widgetWindow.hide();
    }
  });

  widgetWindow.on('closed', () => {
    widgetWindow = null;
  });
}

function showWidgetMode() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.hide();
  }
  if (!widgetWindow || widgetWindow.isDestroyed()) {
    createWidgetWindow();
  }
  widgetWindow.show();
  widgetWindow.setAlwaysOnTop(true, 'screen-saver');
  widgetWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
}

function restoreMainFromWidget(triggerVoice = false) {
  if (widgetWindow && !widgetWindow.isDestroyed()) {
    widgetWindow.hide();
  }
  if (!mainWindow || mainWindow.isDestroyed()) {
    createMainWindow();
  } else {
    mainWindow.show();
    mainWindow.restore();
    mainWindow.focus();
    mainWindow.moveTop();
  }

  if (triggerVoice && mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('cy9:restore-triggered', { voice: true });
  }
}

// ----------------------------------------------------
// Windows System Tray Integration
// ----------------------------------------------------
function createTray() {
  const iconPath = path.join(__dirname, 'src/assets/icon.png');
  let trayIcon;

  try {
    trayIcon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
  } catch (e) {
    trayIcon = nativeImage.createEmpty();
  }

  tray = new Tray(trayIcon);
  tray.setToolTip('CY9 // Autonomous AI Assistant');

  updateTray();

  tray.on('click', () => {
    if (mainWindow && mainWindow.isVisible()) {
      showWidgetMode();
    } else {
      restoreMainFromWidget();
    }
  });

  tray.on('double-click', () => {
    restoreMainFromWidget();
  });
}

function updateTray() {
  if (!tray) return;

  const autostart = isAutoStartEnabled();
  const config = memoryService.getConfig();

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '⚡ فتح واجهة CY9 (Open CY9)',
      click: () => restoreMainFromWidget()
    },
    {
      label: '🌀 الوضع المصغر / الدائرة العائمة (Floating Orb)',
      click: () => showWidgetMode()
    },
    {
      label: '🎙️ أمر صوتي فوري (Voice Uplink)',
      click: () => restoreMainFromWidget(true)
    },
    { type: 'separator' },
    {
      label: '🚀 تشغيل تلقائي مع بدء ويندوز (Start with Windows)',
      type: 'checkbox',
      checked: autostart,
      click: (menuItem) => setAutoStart(menuItem.checked)
    },
    {
      label: '📌 التثبيت فوق جميع النوافذ (Always on Top)',
      type: 'checkbox',
      checked: !!config.alwaysOnTop,
      click: (menuItem) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.setAlwaysOnTop(menuItem.checked, 'floating');
          memoryService.saveConfig({ alwaysOnTop: menuItem.checked });
        }
      }
    },
    { type: 'separator' },
    {
      label: '❌ إغلاق CY9 نهائياً (Exit Completely)',
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);
}

// ----------------------------------------------------
// App Lifecycle
// ----------------------------------------------------
app.whenReady().then(() => {
  // Grant microphone, camera, and media permissions for real-time audio uplink
  if (session && session.defaultSession) {
    session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
      callback(true);
    });
    session.defaultSession.setPermissionCheckHandler((webContents, permission) => {
      return true;
    });
  }

  createMainWindow();
  createWidgetWindow();
  createTray();

  // Register Global Hotkey (Ctrl+Shift+J)
  try {
    globalShortcut.register('CommandOrControl+Shift+J', () => {
      if (mainWindow && mainWindow.isVisible() && !mainWindow.isMinimized()) {
        showWidgetMode();
      } else {
        restoreMainFromWidget();
      }
    });
  } catch (err) {
    console.warn('Could not register global shortcut:', err);
  }

  // Ensure default autostart setting is applied
  const config = memoryService.getConfig();
  if (config.autoStartWithWindows) {
    setAutoStart(true);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
      createWidgetWindow();
    }
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', (e) => {
  if (e && e.preventDefault) e.preventDefault();
  // Keep app active in widget or tray mode unless explicitly quitting
  if (isQuitting) {
    app.quit();
  }
});

// ----------------------------------------------------
// IPC Handlers: Core AI & Direct Actions
// ----------------------------------------------------
ipcMain.handle('cy9:send-message', async (event, { text, image, files }) => {
  return await geminiService.processMessage(
    text,
    image,
    (delta) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('cy9:stream-delta', delta);
      }
    },
    (progress) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('cy9:progress', progress);
      }
      if (widgetWindow && !widgetWindow.isDestroyed()) {
        widgetWindow.webContents.send('widget:update', { state: 'thinking' });
      }
    },
    files
  );
});

ipcMain.handle('cy9:get-telemetry', async () => {
  return await systemService.getTelemetry();
});

ipcMain.handle('cy9:get-agents', () => {
  return agentManager.getAgents();
});

ipcMain.handle('cy9:get-config', () => {
  return memoryService.getConfig();
});

ipcMain.handle('cy9:save-config', (event, config) => {
  const updated = memoryService.saveConfig(config);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.setAlwaysOnTop(!!updated.alwaysOnTop, 'floating');
  }
  if (typeof config.autoStartWithWindows !== 'undefined') {
    setAutoStart(config.autoStartWithWindows);
  }
  updateTray();
  return updated;
});

ipcMain.handle('cy9:get-memories', () => {
  return memoryService.getMemories();
});

ipcMain.handle('cy9:add-memory', (event, { content, category }) => {
  return memoryService.addMemory(content, category);
});

ipcMain.handle('cy9:delete-memory', (event, id) => {
  return memoryService.deleteMemory(id);
});

ipcMain.handle('cy9:get-tasks', () => {
  return memoryService.getTasks();
});

ipcMain.handle('cy9:add-task', (event, text) => {
  return memoryService.addTask(text);
});

ipcMain.handle('cy9:toggle-task', (event, id) => {
  return memoryService.toggleTask(id);
});

ipcMain.handle('cy9:delete-task', (event, id) => {
  return memoryService.deleteTask(id);
});

ipcMain.handle('cy9:get-protocols', () => {
  return memoryService.getProtocols();
});

ipcMain.handle('cy9:trigger-protocol', async (event, name) => {
  return await agentManager.executeTool('trigger_protocol', { protocol_name: name });
});

ipcMain.handle('cy9:add-protocol', (event, protocol) => {
  return memoryService.addProtocol(protocol);
});

ipcMain.handle('cy9:delete-protocol', (event, id) => {
  return memoryService.deleteProtocol(id);
});

ipcMain.handle('cy9:get-history', () => {
  return memoryService.getHistory();
});

ipcMain.handle('cy9:clear-history', () => {
  return memoryService.clearHistory();
});

ipcMain.handle('cy9:capture-screenshot', async () => {
  try {
    const { desktopCapturer } = require('electron');
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: 1280, height: 720 }
    });
    if (sources && sources.length > 0) {
      const jpegBuffer = sources[0].thumbnail.toJPEG(65);
      return {
        success: true,
        base64: jpegBuffer.toString('base64'),
        mimeType: 'image/jpeg',
        bytes: jpegBuffer.length,
        message: 'Screen frame buffer acquired via native high-speed desktop stream.'
      };
    }
  } catch (err) {
    console.warn('desktopCapturer fallback to systemService:', err);
  }
  return await systemService.captureScreenshot();
});

ipcMain.handle('cy9:launch-app', async (event, appName) => {
  return await agentManager.executeTool('launch_app', { app_name: appName });
});

ipcMain.handle('cy9:set-volume', async (event, level) => {
  return await systemService.setVolume(level);
});

ipcMain.handle('cy9:execute-powershell', async (event, command) => {
  return await agentManager.executeTool('execute_powershell', { command });
});

ipcMain.handle('cy9:search-platform', async (event, { platform, query, browser }) => {
  return await agentManager.executeTool('search_platform', { platform, query, browser });
});

ipcMain.handle('cy9:control-smart-device', async (event, { device_type, name, command, value }) => {
  return await agentManager.executeTool('control_smart_device', { device_type, name, command, value });
});

ipcMain.handle('cy9:open-browser', async (event, { url, browser }) => {
  return await agentManager.executeTool('open_url', { url, browser });
});

ipcMain.handle('cy9:send-telegram', async (event, { message }) => {
  return await agentManager.executeTool('telegram_send_alert', { message });
});

ipcMain.handle('cy9:organize-files', async (event, path) => {
  return await agentManager.executeTool('organize_files', { path });
});

ipcMain.handle('cy9:deep-research', async (event, { topic, language }) => {
  return await agentManager.executeTool('conduct_deep_research', { topic, language });
});

// Bluetooth & Huawei Headset Management IPCs
ipcMain.handle('cy9:get-bluetooth-devices', async () => {
  return await bluetoothService.scanDevices();
});

ipcMain.handle('cy9:connect-bluetooth', async (event, name) => {
  return await bluetoothService.connectDevice(name);
});

ipcMain.handle('cy9:open-bluetooth-settings', async () => {
  return await bluetoothService.openBluetoothSettings();
});

// Multimodal AI Speech-to-Text Transcription Handler
ipcMain.handle('cy9:transcribe-audio', async (event, { base64Audio, mimeType }) => {
  return await geminiService.transcribeAudio(base64Audio, mimeType);
});

// ----------------------------------------------------
// IPC Handlers: Window & Floating Widget Controls
// ----------------------------------------------------
ipcMain.handle('window:minimize', () => {
  showWidgetMode();
});

ipcMain.handle('window:maximize', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.handle('window:close', () => {
  showWidgetMode();
});

ipcMain.handle('window:show-widget', () => {
  showWidgetMode();
});

ipcMain.handle('window:restore-from-widget', (event, triggerVoice) => {
  restoreMainFromWidget(triggerVoice);
});

ipcMain.handle('widget:show-context-menu', () => {
  const autostart = isAutoStartEnabled();
  const config = memoryService.getConfig();
  const contextMenu = Menu.buildFromTemplate([
    {
      label: '⚡ فتح واجهة CY9 (Open CY9)',
      click: () => restoreMainFromWidget()
    },
    {
      label: '🎙️ أمر صوتي فوري (Voice Uplink)',
      click: () => restoreMainFromWidget(true)
    },
    { type: 'separator' },
    {
      label: '🚀 التشغيل التلقائي مع الويندوز (Auto Start)',
      type: 'checkbox',
      checked: autostart,
      click: (menuItem) => setAutoStart(menuItem.checked)
    },
    {
      label: '📌 التثبيت فوق النوافذ دائماً (Always on Top)',
      type: 'checkbox',
      checked: !!config.alwaysOnTop,
      click: (menuItem) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.setAlwaysOnTop(menuItem.checked, 'floating');
          memoryService.saveConfig({ alwaysOnTop: menuItem.checked });
        }
      }
    },
    { type: 'separator' },
    {
      label: '❌ إغلاق CY9 كلياً (Exit Completely)',
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);

  if (widgetWindow && !widgetWindow.isDestroyed()) {
    contextMenu.popup({ window: widgetWindow });
  }
});

ipcMain.handle('window:move-widget', (event, { dx, dy }) => {
  if (widgetWindow && !widgetWindow.isDestroyed()) {
    const [currX, currY] = widgetWindow.getPosition();
    widgetWindow.setPosition(currX + dx, currY + dy);
  }
});

ipcMain.handle('window:quit-app', () => {
  isQuitting = true;
  app.quit();
});

ipcMain.handle('window:toggle-always-on-top', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    const isTop = !mainWindow.isAlwaysOnTop();
    mainWindow.setAlwaysOnTop(isTop, 'floating');
    memoryService.saveConfig({ alwaysOnTop: isTop });
    updateTray();
    return isTop;
  }
  return false;
});

ipcMain.handle('window:toggle-mini-mode', () => {
  if (!mainWindow || mainWindow.isDestroyed()) return false;
  isMiniMode = !isMiniMode;
  if (isMiniMode) {
    normalBounds = mainWindow.getBounds();
    mainWindow.setSize(440, 680);
    mainWindow.setAlwaysOnTop(true, 'floating');
  } else {
    mainWindow.setSize(normalBounds.width || 1280, normalBounds.height || 820);
    const config = memoryService.getConfig();
    mainWindow.setAlwaysOnTop(!!config.alwaysOnTop, 'floating');
  }
  return isMiniMode;
});

// Auto-Start IPCs
ipcMain.handle('cy9:get-autostart', () => {
  return isAutoStartEnabled();
});

ipcMain.handle('cy9:set-autostart', (event, enabled) => {
  return setAutoStart(enabled);
});

ipcMain.handle('cy9:toggle-autostart', () => {
  return setAutoStart(!isAutoStartEnabled());
});

// Gemini Live Audio & Vision Duplex IPCs
ipcMain.handle('cy9:live-connect', async (event) => {
  try {
    const result = await liveAudioService.connect(event.sender);
    return result;
  } catch (err) {
    console.error('cy9:live-connect handler error:', err);
    return { success: false, message: `Connection error: ${err.message}` };
  }
});

ipcMain.handle('cy9:live-send-audio', (event, pcmBase64) => {
  return liveAudioService.sendAudioChunk(pcmBase64);
});

ipcMain.handle('cy9:live-send-video', (event, jpegBase64) => {
  return liveAudioService.sendVideoChunk(jpegBase64);
});

ipcMain.handle('cy9:live-disconnect', () => {
  return liveAudioService.disconnect();
});

// Windows Mouse & Keyboard RPA IPCs
const mouseControlService = require('./src/services/mouseControlService');

ipcMain.handle('cy9:mouse-click', async (event, { button, x, y }) => {
  return await mouseControlService.click(button, x, y);
});

ipcMain.handle('cy9:mouse-move', async (event, { x, y }) => {
  return await mouseControlService.moveMouse(x, y);
});

ipcMain.handle('cy9:mouse-double-click', async (event, { x, y }) => {
  return await mouseControlService.doubleClick(x, y);
});

ipcMain.handle('cy9:mouse-drag', async (event, { startX, startY, endX, endY }) => {
  return await mouseControlService.drag(startX, startY, endX, endY);
});

ipcMain.handle('cy9:mouse-scroll', async (event, { direction, amount }) => {
  return await mouseControlService.scroll(direction, amount);
});

ipcMain.handle('cy9:type-text', async (event, text) => {
  return await mouseControlService.typeText(text);
});

ipcMain.handle('cy9:press-key', async (event, key) => {
  return await mouseControlService.pressKey(key);
});


