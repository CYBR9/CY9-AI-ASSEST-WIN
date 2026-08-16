const EventEmitter = require('events');
const systemService = require('./systemService');
const memoryService = require('./memoryService');
const rpaService = require('./rpaService');
const fileOrganizerService = require('./fileOrganizerService');
const pcMechanicService = require('./pcMechanicService');
const deepResearchService = require('./deepResearchService');
const telegramUplinkService = require('./telegramUplinkService');
const screenRecallService = require('./screenRecallService');
const healthGuardService = require('./healthGuardService');
const bluetoothService = require('./bluetoothService');
const integrationsService = require('./integrationsService');
const promptEngineeringService = require('./promptEngineeringService');

class AgentManager extends EventEmitter {
  constructor() {
    super();
    this.agents = {
      executive: {
        id: 'executive',
        name: 'CY9 Core',
        role: 'Executive Intelligence & Decision Engine',
        status: 'online', // online, active, idle, busy
        load: 12,
        icon: 'atom',
        color: '#00f0ff',
        lastAction: 'System initialized and sensor arrays nominal.'
      },
      windows_system: {
        id: 'windows_system',
        name: 'Windows System Agent',
        role: 'Hardware Telemetry & App Control',
        status: 'online',
        load: 8,
        icon: 'terminal',
        color: '#00ffaa',
        lastAction: 'Monitoring hardware sensors and process tree.'
      },
      web_research: {
        id: 'web_research',
        name: 'Web & Intel Agent',
        role: 'Live Web Search & Weather Uplink',
        status: 'online',
        load: 5,
        icon: 'globe',
        color: '#38bdf8',
        lastAction: 'Connected to live weather and knowledge endpoints.'
      },
      vision_screen: {
        id: 'vision_screen',
        name: 'Vision & Screen Agent',
        role: 'Desktop Visual Analysis & OCR',
        status: 'online',
        load: 4,
        icon: 'eye',
        color: '#f59e0b',
        lastAction: 'Desktop frame capture buffer ready.'
      },
      terminal_runner: {
        id: 'terminal_runner',
        name: 'Terminal & Script Agent',
        role: 'PowerShell Subprocess Execution',
        status: 'online',
        load: 6,
        icon: 'code',
        color: '#a855f7',
        lastAction: 'PowerShell execution environment verified.'
      },
      memory_protocol: {
        id: 'memory_protocol',
        name: 'Protocol & Memory Agent',
        role: 'Long-Term Memory & Macro Protocols',
        status: 'online',
        load: 10,
        icon: 'database',
        color: '#ec4899',
        lastAction: 'User profile and memory bank synced.'
      }
    };
  }

  getAgents() {
    return Object.values(this.agents);
  }

  updateAgent(agentId, updates) {
    if (this.agents[agentId]) {
      this.agents[agentId] = { ...this.agents[agentId], ...updates };
      this.emit('agents-updated', this.getAgents());
    }
  }

  setAgentActive(agentId, actionText) {
    const target = (this.agents && this.agents[agentId]) ? agentId : 'executive';
    if (!this.agents[target]) return;
    this.updateAgent(target, {
      status: 'active',
      load: Math.min(95, (this.agents[target].load || 10) + 30),
      lastAction: actionText
    });
  }

  setAgentIdle(agentId, actionText) {
    const target = (this.agents && this.agents[agentId]) ? agentId : 'executive';
    if (!this.agents[target]) return;
    this.updateAgent(target, {
      status: 'online',
      load: Math.max(5, Math.floor(Math.random() * 15) + 5),
      lastAction: actionText || this.agents[target].lastAction
    });
  }

  // Tool dispatch handler for all agents
  async executeTool(toolName, args, onProgress = () => {}) {
    const config = memoryService.getConfig();
    const userName = config.userName || 'Sir';

    switch (toolName) {
      case 'launch_app': {
        this.setAgentActive('windows_system', `Launching application: ${args.app_name}`);
        onProgress({ agent: 'windows_system', text: `Accessing Windows app registry for "${args.app_name}"...` });
        const result = await systemService.launchApp(args.app_name);
        this.setAgentIdle('windows_system', result.message);
        return result;
      }

      case 'open_file_or_folder':
      case 'open_folder':
      case 'open_file': {
        const target = args.name_or_path || args.path || args.file_name_or_path || args.name;
        const location = args.location || args.folder;
        this.setAgentActive('windows_system', `Locating & opening: ${target}`);
        onProgress({ agent: 'windows_system', text: `Searching file system to open "${target}"...` });
        const result = await systemService.openFileOrFolder(target, location);
        this.setAgentIdle('windows_system', result.message);
        return result;
      }

      case 'close_app': {
        this.setAgentActive('windows_system', `Terminating application: ${args.app_name}`);
        onProgress({ agent: 'windows_system', text: `Terminating process for "${args.app_name}"...` });
        const result = await systemService.closeApp(args.app_name);
        this.setAgentIdle('windows_system', result.message);
        return result;
      }

      case 'close_tab': {
        const tabTarget = args.tab_name || '';
        this.setAgentActive('windows_system', tabTarget ? `Closing tab: ${tabTarget}` : 'Closing active tab');
        onProgress({ agent: 'windows_system', text: tabTarget ? `Locating and closing "${tabTarget}" tab...` : 'Closing active browser tab (Ctrl+W)...' });
        const result = await systemService.closeActiveTab(tabTarget);
        this.setAgentIdle('windows_system', result.message);
        return result;
      }

      case 'open_tab': {
        this.setAgentActive('windows_system', 'Opening new tab');
        onProgress({ agent: 'windows_system', text: 'Opening new browser tab (Ctrl+T)...' });
        const result = await systemService.openNewTab();
        this.setAgentIdle('windows_system', result.message);
        return result;
      }

      case 'power_control': {
        this.setAgentActive('windows_system', `Executing power command: ${args.action}`);
        let result;
        if (args.action === 'shutdown') {
          result = await systemService.shutdownPC(args.delay_seconds || 15);
        } else if (args.action === 'restart') {
          result = await systemService.restartPC(args.delay_seconds || 15);
        } else if (args.action === 'abort') {
          result = await systemService.abortShutdown();
        } else if (args.action === 'sleep') {
          result = await systemService.sleepPC();
        } else {
          result = await systemService.lockWorkstation();
        }
        this.setAgentIdle('windows_system', result.message);
        return result;
      }

      case 'media_control': {
        this.setAgentActive('windows_system', `Media key: ${args.action}`);
        const result = await systemService.mediaControl(args.action);
        this.setAgentIdle('windows_system', result.message);
        return result;
      }

      case 'window_management': {
        this.setAgentActive('windows_system', `Window management: ${args.action}`);
        let result;
        if (args.action === 'minimize_all' || args.action === 'show_desktop') {
          result = await systemService.minimizeAllWindows();
        } else {
          result = await systemService.restoreAllWindows();
        }
        this.setAgentIdle('windows_system', result.message);
        return result;
      }

      case 'open_folder': {
        this.setAgentActive('windows_system', `Opening folder: ${args.path}`);
        const result = await systemService.openFolder(args.path);
        this.setAgentIdle('windows_system', result.message);
        return result;
      }

      case 'empty_recycle_bin': {
        this.setAgentActive('windows_system', 'Purging Recycle Bin');
        const result = await systemService.emptyRecycleBin();
        this.setAgentIdle('windows_system', result.message);
        return result;
      }

      case 'open_url': {
        this.setAgentActive('web_research', `Navigating to ${args.url} in ${args.browser || 'browser'}`);
        const result = await systemService.openInBrowser(args.url, args.browser || 'default');
        this.setAgentIdle('web_research', result.message);
        return result;
      }

      case 'search_platform': {
        this.setAgentActive('web_research', `Searching ${args.platform}: "${args.query}"`);
        onProgress({ agent: 'web_research', text: `Querying ${args.platform} for "${args.query}" in ${args.browser || 'browser'}...` });
        const result = await systemService.searchPlatform(args.platform, args.query, args.browser || 'default');
        this.setAgentIdle('web_research', result.message);
        return result;
      }

      case 'search_real_estate': {
        this.setAgentActive('web_research', `Filtering real estate properties in ${args.city || 'الرياض'}`);
        onProgress({ agent: 'web_research', text: `Scanning real estate market on ${args.platform || 'Aqar'}...` });
        const result = await systemService.searchRealEstate(args);
        this.setAgentIdle('web_research', result.message);
        return result;
      }

      case 'compose_email': {
        this.setAgentActive('executive', `Drafting executive email to: ${args.to || 'recipient'}`);
        onProgress({ agent: 'executive', text: `Drafting professional message and opening ${args.service || 'email client'}...` });
        const result = await systemService.composeEmail(args);
        this.setAgentIdle('executive', result.message);
        return result;
      }

      case 'control_smart_device': {
        this.setAgentActive('windows_system', `Communicating with ${args.name || args.device_type}`);
        onProgress({ agent: 'windows_system', text: `Broadcasting command to ${args.device_type} (${args.name || 'IoT'})...` });
        const result = await systemService.controlSmartDevice(args);
        this.setAgentIdle('windows_system', result.message);
        return result;
      }

      case 'send_phone_notification': {
        this.setAgentActive('executive', `Dispatching uplink alert: ${args.title}`);
        const result = await systemService.sendPhoneNotification(args);
        this.setAgentIdle('executive', result.output);
        return result;
      }

      case 'gmail_check_inbox': {
        this.setAgentActive('web_research', 'Checking Gmail Inbox');
        onProgress({ agent: 'web_research', text: 'Connecting to Gmail service & fetching unread messages...' });
        const result = await integrationsService.checkGmailInbox(args);
        this.setAgentIdle('web_research', result.message);
        return result;
      }

      case 'gmail_send_email': {
        this.setAgentActive('web_research', `Preparing email to: ${args.to}`);
        onProgress({ agent: 'web_research', text: `Composing email addressed to "${args.to}" with subject "${args.subject}"...` });
        const result = await integrationsService.sendGmailEmail(args);
        this.setAgentIdle('web_research', result.message);
        return result;
      }

      case 'calendar_get_events': {
        this.setAgentActive('executive', 'Checking Google Calendar schedule');
        onProgress({ agent: 'executive', text: 'Retrieving upcoming calendar meetings & agenda...' });
        const result = { success: true, events: integrationsService.getCalendarEvents() };
        this.setAgentIdle('executive', `Found ${result.events.length} events`);
        return result;
      }

      case 'calendar_create_event': {
        this.setAgentActive('executive', `Scheduling calendar event: ${args.title}`);
        onProgress({ agent: 'executive', text: `Adding event "${args.title}" to Google Calendar...` });
        const result = await integrationsService.createCalendarEvent(args);
        this.setAgentIdle('executive', result.message);
        return result;
      }

      case 'github_get_notifications': {
        this.setAgentActive('web_research', 'Synchronizing GitHub updates');
        onProgress({ agent: 'web_research', text: 'Fetching GitHub notifications and repository updates...' });
        const result = await integrationsService.getGitHubNotifications();
        this.setAgentIdle('web_research', result.message);
        return result;
      }

      case 'organize_files': {
        this.setAgentActive('windows_system', `Organizing directory: ${args.path || 'Desktop'}`);
        onProgress({ agent: 'windows_system', text: `Categorizing files in ${args.path || 'Desktop'} into organized subfolders...` });
        const result = await fileOrganizerService.organizeDirectory(args.path || 'Desktop');
        this.setAgentIdle('windows_system', result.message);
        return result;
      }

      case 'find_duplicate_files': {
        this.setAgentActive('windows_system', `Scanning duplicates in ${args.path || 'Downloads'}`);
        const result = await fileOrganizerService.findDuplicates(args.path || 'Downloads');
        this.setAgentIdle('windows_system', result.message);
        return result;
      }

      case 'rpa_action': {
        this.setAgentActive('windows_system', `RPA Action: ${args.action}`);
        let result;
        if (args.action === 'move') result = await rpaService.moveMouse(args.x || 0, args.y || 0);
        else if (args.action === 'click') result = await rpaService.clickMouse(args.button || 'left', args.count || 1);
        else if (args.action === 'type') result = await rpaService.typeText(args.text || '');
        else if (args.action === 'hotkey') result = await rpaService.sendHotkey(args.hotkey || 'enter');
        this.setAgentIdle('windows_system', result ? result.message : 'RPA completed');
        return result;
      }

      case 'run_pc_maintenance': {
        this.setAgentActive('windows_system', 'Running PC Diagnostic & Cleanup');
        onProgress({ agent: 'windows_system', text: 'Purging system temp files, flushing DNS, and evaluating hardware health...' });
        const cleanRes = await pcMechanicService.cleanSystemCaches();
        const diagRes = await pcMechanicService.runHealthDiagnostic();
        this.setAgentIdle('windows_system', `Health Score: ${diagRes.healthScore}%`);
        return {
          success: true,
          cleanup: cleanRes.message,
          diagnostic: diagRes,
          message: `PC Maintenance complete: Health Score is **${diagRes.healthScore}%**. ${cleanRes.message}`
        };
      }

      case 'conduct_deep_research': {
        this.setAgentActive('web_research', `Deep Intelligence Research: "${args.topic}"`);
        onProgress({ agent: 'web_research', text: `Conducting multi-source deep research and compiling executive dossier for "${args.topic}"...` });
        const result = await deepResearchService.conductResearch(args.topic, args);
        this.setAgentIdle('web_research', `Report generated: ${result.filePath}`);
        return result;
      }

      case 'telegram_send_alert': {
        this.setAgentActive('executive', `Sending Telegram memo: ${args.message}`);
        const result = await telegramUplinkService.sendMessage(args.message);
        this.setAgentIdle('executive', result.success ? 'Telegram transmitted' : 'Telegram error');
        return result;
      }

      case 'search_screen_memory': {
        this.setAgentActive('vision_screen', `Searching Total Recall for: "${args.query}"`);
        const result = screenRecallService.searchHistory(args.query);
        this.setAgentIdle('vision_screen', result.message);
        return result;
      }

      case 'trigger_health_guard': {
        this.setAgentActive('executive', `Health Guard: ${args.type || 'posture'}`);
        let result;
        if (args.type === 'hydration') result = healthGuardService.triggerHydrationAlert();
        else if (args.type === 'eye_rest') result = healthGuardService.triggerEyeRest2020();
        else result = healthGuardService.triggerPostureCheck();
        this.setAgentIdle('executive', result.message);
        return result;
      }

      case 'git_commit_and_push': {
        this.setAgentActive('terminal_runner', `Git Commit & Push: "${args.message}"`);
        onProgress({ agent: 'terminal_runner', text: `Staging, committing, and pushing repository changes...` });
        const result = await systemService.gitCommitAndPush(args);
        this.setAgentIdle('terminal_runner', result.message);
        return result;
      }

      case 'create_project': {
        this.setAgentActive('terminal_runner', `Scaffolding ${args.type || 'python'} project: ${args.name}`);
        const result = await systemService.createProjectScaffold(args);
        this.setAgentIdle('terminal_runner', result.message);
        return result;
      }

      case 'search_files': {
        this.setAgentActive('windows_system', `Searching files: ${args.extension || ''} in ${args.folder || 'Downloads'}`);
        onProgress({ agent: 'windows_system', text: `Scanning file system for "${args.extension || 'files'}" in ${args.folder || 'Downloads'}...` });
        const result = await systemService.findFiles(args);
        this.setAgentIdle('windows_system', result.message);
        return result;
      }

      case 'read_file_content': {
        this.setAgentActive('windows_system', `Reading file: ${args.file_path}`);
        onProgress({ agent: 'windows_system', text: `Accessing and reading "${args.file_path}"...` });
        const result = await systemService.readTextFile(args.file_path, args.max_lines || 150);
        this.setAgentIdle('windows_system', result.success ? 'File read complete' : 'File read error');
        return result;
      }

      case 'write_file_content': {
        this.setAgentActive('windows_system', `Writing file: ${args.file_path}`);
        onProgress({ agent: 'windows_system', text: `Writing content to "${args.file_path}"...` });
        const result = await systemService.writeTextFile(args.file_path, args.content || '');
        this.setAgentIdle('windows_system', result.message);
        return result;
      }

      case 'save_learned_preference': {
        this.setAgentActive('memory_protocol', `Saving preference: ${args.fact}`);
        const result = memoryService.addMemory(args.fact, args.category || 'User Preference');
        this.setAgentIdle('memory_protocol', 'Fact committed to long-term memory');
        return { success: true, message: `Committed fact to long-term memory vault: "${args.fact}"`, memory: result };
      }

      case 'search_memory_vault': {
        this.setAgentActive('memory_protocol', `Searching memory vault for: "${args.query}"`);
        const memories = memoryService.searchMemories(args.query);
        this.setAgentIdle('memory_protocol', `Found ${memories.length} relevant memories`);
        return { success: true, count: memories.length, memories };
      }

      case 'set_project_bookmark': {
        this.setAgentActive('memory_protocol', `Bookmarking project "${args.name}"`);
        const result = memoryService.setProjectBookmark(args.name, args.path);
        this.setAgentIdle('memory_protocol', `Bookmarked project ${args.name}`);
        return result;
      }

      case 'get_morning_briefing': {
        this.setAgentActive('executive', 'Compiling Morning Tactical Briefing');
        const result = await systemService.generateMorningBriefing();
        this.setAgentIdle('executive', 'Morning Briefing delivered');
        return result;
      }

      case 'trigger_red_alert': {
        this.setAgentActive('executive', '🚨 ENGAGING PROTOCOL RED ALERT');
        const result = await systemService.triggerRedAlert();
        this.setAgentIdle('executive', 'Red Alert Executed');
        return result;
      }

      case 'control_volume': {
        this.setAgentActive('windows_system', `Adjusting volume to ${args.level || args.action}`);
        let res;
        if (args.action === 'mute' || args.action === 'unmute') {
          res = await systemService.muteVolume();
        } else {
          res = await systemService.setVolume(args.level || 50);
        }
        this.setAgentIdle('windows_system', res.message);
        return res;
      }

      case 'get_system_telemetry': {
        this.setAgentActive('windows_system', 'Polling real-time hardware telemetry');
        const telemetry = await systemService.getTelemetry();
        this.setAgentIdle('windows_system', `CPU: ${telemetry.cpu.load}%, RAM: ${telemetry.memory.percent}%`);
        return telemetry;
      }

      case 'connect_bluetooth_device': {
        this.setAgentActive('windows_system', `Connecting Bluetooth device: ${args.device_name || 'Huawei'}`);
        onProgress({ agent: 'windows_system', text: `Scanning Bluetooth spectrum and linking ${args.device_name || 'Huawei Headset'}...` });
        const res = await bluetoothService.connectDevice(args.device_name || 'Huawei');
        this.setAgentIdle('windows_system', res.message);
        return res;
      }

      case 'scan_bluetooth_devices': {
        this.setAgentActive('windows_system', 'Scanning available Bluetooth & Audio devices');
        const devices = await bluetoothService.scanDevices();
        this.setAgentIdle('windows_system', `Found ${devices.length} Bluetooth devices`);
        return { success: true, devices };
      }

      case 'execute_powershell': {
        this.setAgentActive('terminal_runner', `Running PowerShell: ${args.command}`);
        onProgress({ agent: 'terminal_runner', text: `Executing: ${args.command}` });
        const res = await systemService.executePowerShell(args.command);
        this.setAgentIdle('terminal_runner', res.success ? 'Command executed successfully' : 'Command error');
        return res;
      }

      case 'take_screenshot_and_analyze': {
        this.setAgentActive('vision_screen', 'Capturing and analyzing primary desktop frame');
        onProgress({ agent: 'vision_screen', text: 'Capturing desktop frame...' });
        const screenshot = await systemService.captureScreenshot();
        this.setAgentIdle('vision_screen', 'Screenshot frame buffer acquired');
        return screenshot;
      }

      case 'get_weather_intelligence': {
        this.setAgentActive('web_research', `Retrieving weather intel for ${args.location}`);
        onProgress({ agent: 'web_research', text: `Fetching meteorological satellite data for ${args.location}...` });
        try {
          // Use Open-Meteo geocoding & weather API (No API key required)
          const loc = encodeURIComponent(args.location || 'London');
          const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${loc}&count=1&language=en&format=json`);
          const geoData = await geoRes.json();
          if (geoData.results && geoData.results.length > 0) {
            const place = geoData.results[0];
            const wxRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&timezone=auto`);
            const wxData = await wxRes.json();
            const current = wxData.current || {};
            
            const weatherDesc = this.getWeatherDescription(current.weather_code);
            const report = {
              success: true,
              location: `${place.name}, ${place.country || ''}`,
              temperature: `${current.temperature_2m}°C`,
              feelsLike: `${current.apparent_temperature}°C`,
              humidity: `${current.relative_humidity_2m}%`,
              windSpeed: `${current.wind_speed_10m} km/h`,
              condition: weatherDesc,
              raw: current
            };
            this.setAgentIdle('web_research', `Weather for ${place.name}: ${current.temperature_2m}°C, ${weatherDesc}`);
            return report;
          } else {
            throw new Error(`Location "${args.location}" not found.`);
          }
        } catch (e) {
          this.setAgentIdle('web_research', `Weather lookup failed: ${e.message}`);
          return {
            success: false,
            message: `Could not retrieve weather for ${args.location}: ${e.message}`
          };
        }
      }

      case 'web_search_query': {
        this.setAgentActive('web_research', `Searching live intelligence for: ${args.query}`);
        onProgress({ agent: 'web_research', text: `Querying web archives for: "${args.query}"...` });
        try {
          // Use duckduckgo instant answer API or wiki summary
          const q = encodeURIComponent(args.query);
          const res = await fetch(`https://api.duckduckgo.com/?q=${q}&format=json&no_html=1&skip_disambig=1`);
          const data = await res.json();
          const summary = data.AbstractText || (data.RelatedTopics && data.RelatedTopics[0]?.Text) || 'Live search completed. Information grounded in query context.';
          this.setAgentIdle('web_research', 'Search query returned results');
          return {
            success: true,
            query: args.query,
            summary: summary,
            source: data.AbstractSource || 'Web Intel'
          };
        } catch (e) {
          this.setAgentIdle('web_research', 'Search query offline fallback');
          return {
            success: true,
            query: args.query,
            summary: `Search processed for "${args.query}".`
          };
        }
      }

      case 'save_memory_fact': {
        this.setAgentActive('memory_protocol', `Storing new fact in long-term memory: ${args.fact}`);
        const mem = memoryService.addMemory(args.fact, args.category || 'User Knowledge');
        this.setAgentIdle('memory_protocol', `Memorized: ${args.fact.substring(0, 30)}...`);
        return { success: true, memory: mem, message: 'Fact committed to long-term memory banks.' };
      }

      case 'manage_task_item': {
        this.setAgentActive('memory_protocol', `Managing task item: ${args.action}`);
        let result;
        if (args.action === 'add') {
          result = memoryService.addTask(args.task_text);
        } else if (args.action === 'complete') {
          result = memoryService.toggleTask(args.task_id);
        } else {
          result = memoryService.getTasks();
        }
        this.setAgentIdle('memory_protocol', 'Task roster updated');
        return { success: true, tasks: memoryService.getTasks() };
      }

      case 'trigger_protocol': {
        this.setAgentActive('memory_protocol', `Executing Iron Man Protocol: ${args.protocol_name}`);
        const protocols = memoryService.getProtocols();
        const prot = protocols.find(p => p.name.toLowerCase().includes(args.protocol_name.toLowerCase()) || p.id.includes(args.protocol_name.toLowerCase()));
        
        if (prot) {
          const executed = [];
          for (const act of prot.actions) {
            const [type, val] = act.split(':');
            if (type === 'volume') await systemService.setVolume(parseInt(val, 10));
            if (type === 'app') await systemService.launchApp(val);
            if (type === 'clipboard' && val === 'clear') {
              await systemService.executePowerShell('Set-Clipboard -Value $null');
            }
            executed.push(act);
          }
          this.setAgentIdle('memory_protocol', `Protocol ${prot.name} successfully activated`);
          return {
            success: true,
            protocol: prot.name,
            executed,
            message: `${prot.name} engaged, ${userName}. All sub-routines running smoothly.`
          };
        } else {
          this.setAgentIdle('memory_protocol', `Protocol ${args.protocol_name} not found`);
          return { success: false, message: `Protocol "${args.protocol_name}" not found in protocol database.` };
        }
      }

      case 'end_live_call':
      case 'hang_up_call': {
        const liveAudioService = require('./liveAudioService');
        this.setAgentActive('executive', 'Ending live call session');
        onProgress({ agent: 'executive', text: 'Disconnecting live voice uplink at user request...' });
        liveAudioService.disconnect();
        this.setAgentIdle('executive', 'Live call ended');
        return {
          success: true,
          message: 'تم إنهاء المكالمة الصوتية الحية وإغلاق الخط، يا سيدي. في أمان الله!'
        };
      }

      case 'inspect_screen': {
        this.setAgentActive('vision_screen', 'Capturing and inspecting desktop screen');
        onProgress({ agent: 'vision_screen', text: 'Scanning active workstation display and visual elements...' });
        const screen = await systemService.captureScreenshot();
        this.setAgentIdle('vision_screen', 'Screen captured for inspection');
        if (screen && screen.success && screen.base64) {
          return {
            success: true,
            hasImage: true,
            base64Image: screen.base64,
            mimeType: screen.mimeType || 'image/jpeg',
            message: 'Screen frame captured and inspected successfully, sir. You can now analyze windows, buttons, and documents on screen.'
          };
        } else {
          return {
            success: false,
            message: 'Unable to capture desktop screen for inspection.'
          };
        }
      }

      case 'mouse_click': {
        const mouseControlService = require('./mouseControlService');
        this.setAgentActive('system_control', `Executing ${args.button || 'Left'}-Click`);
        onProgress({ agent: 'system_control', text: `Dispatching native ${args.button || 'left'} mouse click on Windows...` });
        const res = await mouseControlService.click(args.button || 'left', args.x, args.y);
        this.setAgentIdle('system_control', res.message);
        return res;
      }

      case 'mouse_move': {
        const mouseControlService = require('./mouseControlService');
        this.setAgentActive('system_control', `Moving cursor to (${args.x}, ${args.y})`);
        onProgress({ agent: 'system_control', text: `Repositioning mouse cursor to (${args.x}, ${args.y})...` });
        const res = await mouseControlService.moveMouse(args.x, args.y);
        this.setAgentIdle('system_control', res.message);
        return res;
      }

      case 'mouse_double_click': {
        const mouseControlService = require('./mouseControlService');
        this.setAgentActive('system_control', 'Executing Double-Click');
        onProgress({ agent: 'system_control', text: 'Dispatching double-click event...' });
        const res = await mouseControlService.doubleClick(args.x, args.y);
        this.setAgentIdle('system_control', res.message);
        return res;
      }

      case 'mouse_drag': {
        const mouseControlService = require('./mouseControlService');
        this.setAgentActive('system_control', 'Dragging mouse');
        onProgress({ agent: 'system_control', text: `Dragging from (${args.startX}, ${args.startY}) to (${args.endX}, ${args.endY})...` });
        const res = await mouseControlService.drag(args.startX, args.startY, args.endX, args.endY);
        this.setAgentIdle('system_control', res.message);
        return res;
      }

      case 'mouse_scroll': {
        const mouseControlService = require('./mouseControlService');
        this.setAgentActive('system_control', `Scrolling ${args.direction || 'down'}`);
        onProgress({ agent: 'system_control', text: `Rotating scroll wheel ${args.direction || 'down'}...` });
        const res = await mouseControlService.scroll(args.direction || 'down', args.amount || 3);
        this.setAgentIdle('system_control', res.message);
        return res;
      }

      case 'keyboard_type': {
        const mouseControlService = require('./mouseControlService');
        this.setAgentActive('system_control', 'Typing text input');
        onProgress({ agent: 'system_control', text: `Typing: "${args.text.substring(0, 20)}..."` });
        const res = await mouseControlService.typeText(args.text);
        this.setAgentIdle('system_control', res.message);
        return res;
      }

      case 'keyboard_press': {
        const mouseControlService = require('./mouseControlService');
        this.setAgentActive('system_control', `Pressing key [${args.key}]`);
        onProgress({ agent: 'system_control', text: `Dispatching keypress: [${args.key}]...` });
        const res = await mouseControlService.pressKey(args.key);
        this.setAgentIdle('system_control', res.message);
        return res;
      }

      case 'show_on_center_screen': {
        this.setAgentActive('executive', `Displaying intelligence on Center Screen: ${args.title}`);
        onProgress({
          agent: 'executive',
          text: `Rendering ${args.title} directly into the main Center HUD Display...`,
          centerCard: {
            title: args.title,
            content: args.content,
            category: args.category || 'Intelligence Report'
          }
        });
        this.setAgentIdle('executive', 'Center screen display updated');
        return {
          success: true,
          message: `تم عرض "${args.title}" على الشاشة الرئيسية الكبيرة في المنتصف بنجاح، يا سيدي.`
        };
      }

      case 'create_programming_prompt': {
        this.setAgentActive('terminal_runner', `Synthesizing Master AI Prompt for: ${args.project_description?.slice(0, 40)}`);
        const result = promptEngineeringService.generateProjectPrompt({
          project_description: args.project_description,
          tech_stack: args.tech_stack,
          target_ai: args.target_ai,
          project_type: args.project_type,
          language: args.language || 'ar',
          save_to_file: args.save_to_file !== false
        });

        // Automatically push the master prompt directly to the central HUD screen with 1-click copy!
        onProgress({
          agent: 'terminal_runner',
          text: `Master AI Blueprint synthesized. Rendering to Center Screen for instant copying...`,
          centerCard: {
            title: `🚀 Master AI Prompt: ${result.projectName}`,
            content: result.promptMarkdown,
            category: `PROMPT ARCHITECT // ${result.targetAI || 'UNIVERSAL AI'}`
          }
        });

        this.setAgentIdle('terminal_runner', `Prompt blueprint compiled: ${result.projectName}`);
        return {
          success: true,
          projectName: result.projectName,
          targetAI: result.targetAI,
          savedFilePath: result.savedFilePath,
          promptMarkdown: result.promptMarkdown,
          message: `🎯 تم توليد برومبت هندسي جبار وشامل لمشروع **(${result.projectName})** وعرضه على الشاشة الكبيرة مع زر نسخ بالكامل بضغطة واحدة! ${result.savedFilePath ? `\n\n💾 تم حفظه كملف على سطح المكتب: \`${result.savedFilePath}\`` : ''}`
        };
      }

      default:
        return { success: false, message: `Unknown tool "${toolName}".` };
    }
  }

  getWeatherDescription(code) {
    const weatherCodes = {
      0: 'Clear sky',
      1: 'Mainly clear',
      2: 'Partly cloudy',
      3: 'Overcast',
      45: 'Foggy',
      48: 'Depositing rime fog',
      51: 'Light drizzle',
      53: 'Moderate drizzle',
      55: 'Dense drizzle',
      61: 'Slight rain',
      63: 'Moderate rain',
      65: 'Heavy rain',
      71: 'Slight snow fall',
      73: 'Moderate snow fall',
      75: 'Heavy snow fall',
      80: 'Slight rain showers',
      81: 'Moderate rain showers',
      82: 'Violent rain showers',
      95: 'Thunderstorm',
      96: 'Thunderstorm with slight hail',
      99: 'Thunderstorm with heavy hail'
    };
    return weatherCodes[code] || 'Atmospheric conditions clear';
  }
}

module.exports = new AgentManager();
