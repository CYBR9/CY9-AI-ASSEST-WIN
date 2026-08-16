const fs = require('fs');
const path = require('path');
const os = require('os');

class MemoryService {
  constructor() {
    this.storageDir = path.join(os.homedir(), '.cy9');
    this.dataFile = path.join(this.storageDir, 'cy9_data.json');
    this.ensureStorage();
    this.data = this.loadData();
  }

  ensureStorage() {
    if (!fs.existsSync(this.storageDir)) {
      try {
        fs.mkdirSync(this.storageDir, { recursive: true });
      } catch (err) {
        console.error('Failed to create storage directory:', err);
      }
    }
  }

  getDefaultData() {
    return {
      config: {
        apiKey: process.env.GEMINI_API_KEY || '',
        model: 'gemini-3.6-flash',
        userName: 'Sir',
        language: 'ar', // 'ar', 'en', 'auto'
        theme: 'theme-cy9', // theme-cy9, theme-gold, theme-purple, theme-emerald
        speechEnabled: true,
        speechVoice: 'Arabic Natural / British Male',
        speechRate: 1.0,
        speechPitch: 1.0,
        soundFXEnabled: true,
        alwaysOnTop: false,
        wakeWordEnabled: true,
        welcomeVoiceOnStartup: true,
        welcomeGreetingText: 'هلا ومرحبا يا CY9',
        autoStartWithWindows: true,
        floatingOrbOnMinimize: true
      },
      memories: [
        {
          id: 'mem_1',
          category: 'Identity',
          content: 'User prefers to be addressed as Sir and appreciates concise, proactive intelligence.',
          timestamp: new Date().toISOString()
        },
        {
          id: 'mem_2',
          category: 'System',
          content: 'Running on Windows 11 workstation with multi-agent orchestration enabled.',
          timestamp: new Date().toISOString()
        }
      ],
      tasks: [
        {
          id: 'task_1',
          text: 'Calibrate holographic Arc Reactor and initialize sensor arrays',
          completed: true,
          timestamp: new Date().toISOString()
        },
        {
          id: 'task_2',
          text: 'Configure Gemini API Key in Settings for full agent swarm autonomy',
          completed: false,
          timestamp: new Date().toISOString()
        }
      ],
      protocols: [
        {
          id: 'protocol_focus',
          name: 'Protocol Focus Mode',
          description: 'Minimizes distractions, sets volume to 25%, and focuses on primary tasks.',
          actions: ['volume:25', 'speak:Focus protocol engaged, sir. Distractions minimized.']
        },
        {
          id: 'protocol_dev',
          name: 'Protocol Dev Mode',
          description: 'Launches VS Code, Terminal, and sets volume for high-efficiency coding.',
          actions: ['app:code', 'app:wt', 'speak:Development environment initialized, sir. Code compilers ready.']
        },
        {
          id: 'protocol_clean',
          name: 'Protocol Clean Slate',
          description: 'Clears clipboard, scans system telemetry, and frees background memory.',
          actions: ['clipboard:clear', 'speak:Clean slate protocol executed. Cache freed.']
        },
        {
          id: 'protocol_night',
          name: 'Protocol Night Owl',
          description: 'Dims HUD, sets low audio volume, and prepares night telemetry.',
          actions: ['theme:theme-purple', 'volume:20', 'speak:Night protocol active, sir. Standing by quietly.']
        }
      ],
      history: []
    };
  }

  loadData() {
    try {
      if (fs.existsSync(this.dataFile)) {
        const raw = fs.readFileSync(this.dataFile, 'utf8');
        const parsed = JSON.parse(raw);
        return {
          ...this.getDefaultData(),
          ...parsed,
          config: { ...this.getDefaultData().config, ...(parsed.config || {}) }
        };
      }
    } catch (err) {
      console.error('Error reading memory file, using defaults:', err);
    }
    const defaultData = this.getDefaultData();
    this.saveData(defaultData);
    return defaultData;
  }

  saveData(dataToSave) {
    try {
      this.ensureStorage();
      fs.writeFileSync(this.dataFile, JSON.stringify(dataToSave || this.data, null, 2), 'utf8');
      return true;
    } catch (err) {
      console.error('Failed to save memory data:', err);
      return false;
    }
  }

  getConfig() {
    return this.data.config;
  }

  saveConfig(newConfig) {
    this.data.config = { ...this.data.config, ...newConfig };
    this.saveData();
    return this.data.config;
  }

  getMemories() {
    return this.data.memories;
  }

  addMemory(content, category = 'General') {
    const memory = {
      id: 'mem_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      category,
      content,
      timestamp: new Date().toISOString()
    };
    this.data.memories.unshift(memory);
    if (this.data.memories.length > 100) this.data.memories.pop();
    this.saveData();
    return memory;
  }

  deleteMemory(id) {
    this.data.memories = this.data.memories.filter(m => m.id !== id);
    this.saveData();
    return true;
  }

  getTasks() {
    return this.data.tasks;
  }

  addTask(text) {
    const task = {
      id: 'task_' + Date.now(),
      text,
      completed: false,
      timestamp: new Date().toISOString()
    };
    this.data.tasks.unshift(task);
    this.saveData();
    return task;
  }

  toggleTask(id) {
    const task = this.data.tasks.find(t => t.id === id);
    if (task) {
      task.completed = !task.completed;
      this.saveData();
      return task;
    }
    return null;
  }

  deleteTask(id) {
    this.data.tasks = this.data.tasks.filter(t => t.id !== id);
    this.saveData();
    return true;
  }

  getProtocols() {
    return this.data.protocols;
  }

  addProtocol(protocol) {
    const newProt = {
      id: 'prot_' + Date.now(),
      name: protocol.name,
      description: protocol.description || '',
      actions: protocol.actions || []
    };
    this.data.protocols.push(newProt);
    this.saveData();
    return newProt;
  }

  deleteProtocol(id) {
    this.data.protocols = this.data.protocols.filter(p => p.id !== id);
    this.saveData();
    return true;
  }

  // Semantic and keyword memory search
  searchMemories(query) {
    if (!query || typeof query !== 'string') return this.data.memories.slice(0, 8);
    const terms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
    if (terms.length === 0) return this.data.memories.slice(0, 8);

    const scored = this.data.memories.map(m => {
      let score = 0;
      const text = `${m.category} ${m.content}`.toLowerCase();
      for (const term of terms) {
        if (text.includes(term)) score += 2;
      }
      return { ...m, score };
    });

    return scored
      .filter(m => m.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);
  }

  // Get active learned facts and user preferences for LLM system prompt injection
  getLearnedContext() {
    const memories = this.data.memories || [];
    if (memories.length === 0) return 'No specialized facts stored yet.';
    return memories.slice(0, 15).map(m => `- [${m.category}]: ${m.content}`).join('\n');
  }

  // Project bookmarks for rapid IDE/Folder navigation
  setProjectBookmark(name, folderPath) {
    if (!this.data.projectBookmarks) this.data.projectBookmarks = {};
    this.data.projectBookmarks[name.toLowerCase().trim()] = folderPath;
    this.addMemory(`Project "${name}" is located at: ${folderPath}`, 'Projects');
    this.saveData();
    return { success: true, name, path: folderPath };
  }

  getProjectBookmarks() {
    return this.data.projectBookmarks || {};
  }

  // Auto-extract and save preferences from natural user messages
  autoExtractAndSaveFacts(userMessage) {
    if (!userMessage || typeof userMessage !== 'string') return null;
    const msg = userMessage.trim();

    // English patterns: "remember that ...", "my name is ...", "my favorite ...", "my project is in ..."
    const enMatch = msg.match(/\b(?:remember(?:\s+that)?|note(?:\s+down)?|don't forget(?:\s+that)?|my project is in|my favorite\s+([a-z0-9_-]+)\s+is)\s+(.+)/i);
    if (enMatch) {
      const fact = (enMatch[2] || enMatch[1] || msg).replace(/[!?.]$/, '').trim();
      if (fact.length > 3) {
        return this.addMemory(fact, 'User Preference');
      }
    }

    // Arabic patterns: "تذكر ان...", "احفظ ان...", "مشروعي هو...", "مجلدي المفضل..."
    const arMatch = msg.match(/(?:تذكر(?:\s+ان|\s+أن)?|احفظ(?:\s+ان|\s+أن)?|لا تنسى(?:\s+ان|\s+أن)?|مشروعي(?:\s+هو|\s+في)?|مجلدي(?:\s+هو|\s+في)?)\s+(.+)/i);
    if (arMatch) {
      const fact = (arMatch[1] || msg).replace(/[!؟?.,]$/, '').trim();
      if (fact.length > 3) {
        return this.addMemory(fact, 'تفضيلات المستخدم');
      }
    }

    return null;
  }

  addHistory(entry) {
    this.data.history.push({
      ...entry,
      timestamp: new Date().toISOString()
    });
    if (this.data.history.length > 200) {
      this.data.history = this.data.history.slice(-200);
    }
    this.saveData();
  }

  getHistory() {
    return this.data.history;
  }

  clearHistory() {
    this.data.history = [];
    this.saveData();
    return true;
  }
}

module.exports = new MemoryService();
