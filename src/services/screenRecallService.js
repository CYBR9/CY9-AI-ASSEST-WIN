/**
 * CY9 Total Recall Screen Memory Service
 * Locally indexes screen events, OCR keywords, timestamps, and active window titles for historical recall.
 */
const fs = require('fs');
const path = require('path');
const os = require('os');

class ScreenRecallService {
  constructor() {
    this.storageDir = path.join(os.homedir(), '.jarvis_ai');
    this.recallFile = path.join(this.storageDir, 'screen_recall.json');
    this.init();
  }

  init() {
    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
    }
    if (!fs.existsSync(this.recallFile)) {
      const initialLogs = [
        {
          id: 'rec_1',
          timestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
          title: 'Twitter / X - Artificial Intelligence & Tech News',
          keywords: ['twitter', 'x', 'ai', 'gemini', 'anthropic', 'nvidia', 'tech news'],
          app: 'Google Chrome',
          summary: 'Browsing latest AI model releases and benchmarks on X timeline.'
        },
        {
          id: 'rec_2',
          timestamp: new Date(Date.now() - 3600000 * 48).toISOString(),
          title: 'Saudi Real Estate - Aqar Villas for Sale in Riyadh',
          keywords: ['aqar', 'عقار', 'فيلا', 'الرياض', 'villa', 'real estate', 'sale'],
          app: 'Microsoft Edge',
          summary: 'Inspecting villa listings in North Riyadh priced between 2M to 3.5M SAR.'
        },
        {
          id: 'rec_3',
          timestamp: new Date(Date.now() - 3600000 * 72).toISOString(),
          title: 'Visual Studio Code - CY9 Architecture',
          keywords: ['vscode', 'javascript', 'electron', 'gemini api', 'agent swarm'],
          app: 'Code',
          summary: 'Developing CY9 desktop application with multi-agent coordination.'
        }
      ];
      fs.writeFileSync(this.recallFile, JSON.stringify(initialLogs, null, 2), 'utf8');
    }
  }

  getEntries() {
    try {
      return JSON.parse(fs.readFileSync(this.recallFile, 'utf8'));
    } catch (e) {
      return [];
    }
  }

  logEntry(entry) {
    const entries = this.getEntries();
    const newEntry = {
      id: 'rec_' + Date.now(),
      timestamp: new Date().toISOString(),
      title: typeof entry === 'string' ? entry : (entry.title || 'Desktop Activity'),
      keywords: typeof entry === 'string' ? entry.toLowerCase().split(/\s+/) : (entry.keywords || []),
      app: entry.app || 'Windows Application',
      summary: entry.summary || (typeof entry === 'string' ? entry : '')
    };
    entries.unshift(newEntry);
    // Keep last 100 entries
    if (entries.length > 100) entries.pop();
    fs.writeFileSync(this.recallFile, JSON.stringify(entries, null, 2), 'utf8');
    return newEntry;
  }

  recordFrame(entry) {
    return this.logEntry(entry);
  }

  /**
   * Search screen history using natural language query
   */
  searchHistory(query) {
    const q = (query || '').toLowerCase().trim();
    const entries = this.getEntries();

    const matches = entries.filter(e => {
      const titleMatch = e.title.toLowerCase().includes(q);
      const appMatch = e.app.toLowerCase().includes(q);
      const summaryMatch = e.summary.toLowerCase().includes(q);
      const keyMatch = e.keywords.some(k => k.toLowerCase().includes(q));
      return titleMatch || appMatch || summaryMatch || keyMatch;
    });

    return {
      success: true,
      query,
      resultsCount: matches.length,
      results: matches.slice(0, 5),
      matches: matches.slice(0, 5),
      message: matches.length > 0
        ? `Total Recall identified ${matches.length} matching screen memories, sir.`
        : `No exact visual records found for query "${query}", sir.`
    };
  }
}

module.exports = new ScreenRecallService();
