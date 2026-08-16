const { GoogleGenAI } = require('@google/genai');
const memoryService = require('./memoryService');
const agentManager = require('./agentManager');
const systemService = require('./systemService');

class GeminiService {
  constructor() {
    this.client = null;
    this.conversationHistory = [];
    this.toolsDefinition = [
      {
        functionDeclarations: [
          {
            name: 'launch_app',
            description: 'Launch or open a Windows application, executable, or tool by name (e.g. Chrome, VS Code, Notepad, Calculator, Spotify, Explorer, Terminal, Paint, Word, Excel, Settings).',
            parameters: {
              type: 'OBJECT',
              properties: {
                app_name: {
                  type: 'STRING',
                  description: 'The name of the application to launch (e.g. "notepad", "chrome", "code", "calc", "spotify", "explorer", "discord").'
                }
              },
              required: ['app_name']
            }
          },
          {
            name: 'close_app',
            description: 'Close, terminate, or exit a running application or process on Windows (e.g. Chrome, Spotify, Notepad, Code).',
            parameters: {
              type: 'OBJECT',
              properties: {
                app_name: {
                  type: 'STRING',
                  description: 'The name of the application or process to close (e.g. "chrome", "spotify", "notepad", "code").'
                }
              },
              required: ['app_name']
            }
          },
          {
            name: 'power_control',
            description: 'Control Windows power operations: shutdown PC, restart PC, sleep, lock workstation, or abort pending shutdown.',
            parameters: {
              type: 'OBJECT',
              properties: {
                action: {
                  type: 'STRING',
                  description: 'Action: "shutdown", "restart", "sleep", "lock", "abort"',
                  enum: ['shutdown', 'restart', 'sleep', 'lock', 'abort']
                },
                delay_seconds: {
                  type: 'INTEGER',
                  description: 'Seconds before shutdown or restart (default: 15).'
                }
              },
              required: ['action']
            }
          },
          {
            name: 'media_control',
            description: 'Control media playback keys on Windows: play/pause, next track, previous track, or stop audio.',
            parameters: {
              type: 'OBJECT',
              properties: {
                action: {
                  type: 'STRING',
                  description: 'Media action: "play_pause", "next", "prev", "stop"',
                  enum: ['play_pause', 'next', 'prev', 'stop']
                }
              },
              required: ['action']
            }
          },
          {
            name: 'window_management',
            description: 'Manage desktop windows: minimize all windows to show clean desktop or restore previously minimized windows.',
            parameters: {
              type: 'OBJECT',
              properties: {
                action: {
                  type: 'STRING',
                  description: 'Action: "minimize_all" (show desktop) or "restore_all"',
                  enum: ['minimize_all', 'restore_all', 'show_desktop']
                }
              },
              required: ['action']
            }
          },
          {
            name: 'open_folder',
            description: 'Open a specific folder or system location in File Explorer (e.g. Downloads, Documents, Desktop, Pictures, or specific folder path).',
            parameters: {
              type: 'OBJECT',
              properties: {
                path: {
                  type: 'STRING',
                  description: 'Folder name or path (e.g. "downloads", "documents", "desktop", "c:\\")'
                }
              },
              required: ['path']
            }
          },
          {
            name: 'empty_recycle_bin',
            description: 'Purge and empty the Windows Recycle Bin to free storage.',
            parameters: {
              type: 'OBJECT',
              properties: {}
            }
          },
          {
            name: 'control_volume',
            description: 'Adjust the Windows system master audio volume level or mute/unmute audio.',
            parameters: {
              type: 'OBJECT',
              properties: {
                action: {
                  type: 'STRING',
                  description: 'Action to perform: "set", "mute", "unmute", "up", "down"',
                  enum: ['set', 'mute', 'unmute', 'up', 'down']
                },
                level: {
                  type: 'INTEGER',
                  description: 'Volume percentage from 0 to 100 (required when action is "set").'
                }
              },
              required: ['action']
            }
          },
          {
            name: 'get_system_telemetry',
            description: 'Retrieve real-time hardware telemetry: CPU load %, RAM usage, battery level & charging state, disk space, and uptime.',
            parameters: {
              type: 'OBJECT',
              properties: {}
            }
          },
          {
            name: 'execute_powershell',
            description: 'Execute a PowerShell command or script in Windows and get the stdout/stderr result.',
            parameters: {
              type: 'OBJECT',
              properties: {
                command: {
                  type: 'STRING',
                  description: 'The exact PowerShell command to execute.'
                }
              },
              required: ['command']
            }
          },
          {
            name: 'take_screenshot_and_analyze',
            description: 'Capture the user primary desktop screen and analyze its visual contents, active windows, or error messages.',
            parameters: {
              type: 'OBJECT',
              properties: {
                prompt: {
                  type: 'STRING',
                  description: 'Specific instruction for what to inspect in the screenshot (e.g. "explain the error on screen", "what code is open?").'
                }
              }
            }
          },
          {
            name: 'get_weather_intelligence',
            description: 'Retrieve live meteorological forecast and current weather conditions for any city or location.',
            parameters: {
              type: 'OBJECT',
              properties: {
                location: {
                  type: 'STRING',
                  description: 'City or location name (e.g. "London", "New York", "Tokyo", "Paris", "Riyadh", "Dubai", "Cairo").'
                }
              },
              required: ['location']
            }
          },
          {
            name: 'web_search_query',
            description: 'Search the web for up-to-date facts, current news, technical questions, or general intelligence.',
            parameters: {
              type: 'OBJECT',
              properties: {
                query: {
                  type: 'STRING',
                  description: 'The search query.'
                }
              },
              required: ['query']
            }
          },
          {
            name: 'save_memory_fact',
            description: 'Save a key fact, user preference, or important note into CY9 long-term memory bank.',
            parameters: {
              type: 'OBJECT',
              properties: {
                fact: {
                  type: 'STRING',
                  description: 'The fact or piece of information to store.'
                },
                category: {
                  type: 'STRING',
                  description: 'Category such as "Preference", "Project", "Personal", "Work".'
                }
              },
              required: ['fact']
            }
          },
          {
            name: 'manage_task_item',
            description: 'Add a new task or list tasks on user to-do agenda.',
            parameters: {
              type: 'OBJECT',
              properties: {
                action: {
                  type: 'STRING',
                  description: 'Action: "add", "list", "complete"',
                  enum: ['add', 'list', 'complete']
                },
                task_text: {
                  type: 'STRING',
                  description: 'The text of the task (when action is "add").'
                }
              },
              required: ['action']
            }
          },
          {
            name: 'search_platform',
            description: 'Perform a search or open a query directly in YouTube, Google Maps, Google, Aqar, Bayut, Haraj, Amazon, Noon, Twitter/X, or GitHub using a specific browser.',
            parameters: {
              type: 'OBJECT',
              properties: {
                platform: {
                  type: 'STRING',
                  description: 'Platform: "youtube", "google_maps", "google", "aqar", "bayut", "haraj", "amazon", "noon", "twitter", "github"'
                },
                query: {
                  type: 'STRING',
                  description: 'The search query or video name or map location.'
                },
                browser: {
                  type: 'STRING',
                  description: 'Target browser: "chrome", "edge", "firefox", "brave", "opera", or "default".'
                }
              },
              required: ['platform', 'query']
            }
          },
          {
            name: 'search_real_estate',
            description: 'Search Saudi & Gulf real estate portals (Aqar.fm, Bayut.sa) for villas, apartments, residential/commercial lands, buildings with specific filters for city, price, and area.',
            parameters: {
              type: 'OBJECT',
              properties: {
                city: {
                  type: 'STRING',
                  description: 'City (e.g. الرياض, جدة, الدمام, مكة, الخبر, المدينة).'
                },
                type: {
                  type: 'STRING',
                  description: 'Property type: "فيلا", "شقة", "أرض سكنية", "أرض تجارية", "عمارة", "دور"'
                },
                purpose: {
                  type: 'STRING',
                  description: '"للبيع" or "للإيجار"'
                },
                min_price: { type: 'INTEGER', description: 'Minimum price in SAR' },
                max_price: { type: 'INTEGER', description: 'Maximum price in SAR' },
                min_area: { type: 'INTEGER', description: 'Minimum area in m²' },
                max_area: { type: 'INTEGER', description: 'Maximum area in m²' },
                platform: { type: 'STRING', description: '"aqar" or "bayut"' },
                browser: { type: 'STRING', description: '"chrome", "edge", "firefox", "brave", "default"' }
              },
              required: ['city', 'type']
            }
          },
          {
            name: 'compose_email',
            description: 'Draft a professional, official, or executive email and open it directly in Gmail or Outlook web / native compose window ready for review and sending.',
            parameters: {
              type: 'OBJECT',
              properties: {
                to: { type: 'STRING', description: 'Recipient email address (optional).' },
                subject: { type: 'STRING', description: 'Subject line of the email.' },
                body: { type: 'STRING', description: 'The complete, professionally written email body text.' },
                service: { type: 'STRING', description: '"gmail", "outlook", or "native"' },
                browser: { type: 'STRING', description: 'Target browser (e.g. "chrome", "edge", "firefox")' }
              },
              required: ['subject', 'body']
            }
          },
          {
            name: 'control_smart_device',
            description: 'Control smart IoT devices in the room (Smart TV like Samsung/LG/Android TV, smart lights, smart plugs, AC, Chromecast) to turn on/off, adjust volume, launch apps, or cast media.',
            parameters: {
              type: 'OBJECT',
              properties: {
                device_type: { type: 'STRING', description: 'Device type: "tv", "light", "ac", "plug", "speaker"' },
                name: { type: 'STRING', description: 'Device name (e.g. "Living Room TV", "Bedroom Light")' },
                command: { type: 'STRING', description: 'Command: "power", "volume", "mute", "app", "source", "wake", "turn_on", "turn_off"' },
                value: { type: 'STRING', description: 'Command parameter value (e.g. volume level, channel, app name)' }
              },
              required: ['device_type', 'command']
            }
          },
          {
            name: 'send_phone_notification',
            description: 'Send an instant tactical notification, memo, or alert to the user mobile phone or Windows Action Center.',
            parameters: {
              type: 'OBJECT',
              properties: {
                title: { type: 'STRING', description: 'Notification title.' },
                message: { type: 'STRING', description: 'Notification body message.' }
              },
              required: ['title', 'message']
            }
          },
          {
            name: 'organize_files',
            description: 'Organize loose files in Desktop or Downloads into neat structured folders (Documents, Images, Code, Invoices, Videos).',
            parameters: {
              type: 'OBJECT',
              properties: {
                path: { type: 'STRING', description: 'Folder alias like "desktop", "downloads", "documents", or full path.' }
              }
            }
          },
          {
            name: 'connect_bluetooth_device',
            description: 'Connect or link to paired Bluetooth audio headphones, earbuds, or speakers (such as Huawei FreeBuds, AirPods, Sony, or Bose) and route Windows audio to them.',
            parameters: {
              type: 'OBJECT',
              properties: {
                device_name: { type: 'STRING', description: 'Name of the device to connect (e.g. "Huawei", "FreeBuds", "Headphones").' }
              }
            }
          },
          {
            name: 'scan_bluetooth_devices',
            description: 'Scan and list all available and paired Bluetooth devices and audio headsets on Windows.',
            parameters: {
              type: 'OBJECT',
              properties: {}
            }
          },
          {
            name: 'find_duplicate_files',
            description: 'Scan directory to find duplicate files and save storage.',
            parameters: {
              type: 'OBJECT',
              properties: {
                path: { type: 'STRING', description: 'Folder to scan (e.g. "downloads", "desktop").' }
              }
            }
          },
          {
            name: 'rpa_action',
            description: 'Simulate native mouse movement, clicks, typing, or hotkeys on Windows desktop.',
            parameters: {
              type: 'OBJECT',
              properties: {
                action: { type: 'STRING', enum: ['move', 'click', 'type', 'hotkey'], description: 'Action type.' },
                x: { type: 'INTEGER', description: 'X screen coordinate (for move).' },
                y: { type: 'INTEGER', description: 'Y screen coordinate (for move).' },
                button: { type: 'STRING', enum: ['left', 'right'], description: 'Mouse button for click.' },
                text: { type: 'STRING', description: 'Text to type into active window.' },
                hotkey: { type: 'STRING', description: 'Hotkey name (e.g. "ctrl+c", "ctrl+v", "alt+tab", "enter").' }
              },
              required: ['action']
            }
          },
          {
            name: 'run_pc_maintenance',
            description: 'Run PC health diagnostic, calculate hardware health score, purge Windows temp files, and flush DNS cache.',
            parameters: {
              type: 'OBJECT',
              properties: {}
            }
          },
          {
            name: 'conduct_deep_research',
            description: 'Perform deep research on a complex topic and compile an executive intelligence report saved to Desktop.',
            parameters: {
              type: 'OBJECT',
              properties: {
                topic: { type: 'STRING', description: 'Research topic, market query, or technical study.' },
                language: { type: 'STRING', description: '"arabic" or "english"' }
              },
              required: ['topic']
            }
          },
          {
            name: 'telegram_send_alert',
            description: 'Send an instant remote message or report to the user phone via Telegram bot.',
            parameters: {
              type: 'OBJECT',
              properties: {
                message: { type: 'STRING', description: 'Message or report text.' }
              },
              required: ['message']
            }
          },
          {
            name: 'search_screen_memory',
            description: 'Search local visual screen history (Total Recall) to find past articles, websites, codes, or invoices viewed on screen.',
            parameters: {
              type: 'OBJECT',
              properties: {
                query: { type: 'STRING', description: 'Natural language search query.' }
              },
              required: ['query']
            }
          },
          {
            name: 'trigger_health_guard',
            description: 'Trigger an ergonomics posture check, hydration reminder, or 20-20-20 eye strain break.',
            parameters: {
              type: 'OBJECT',
              properties: {
                type: { type: 'STRING', enum: ['posture', 'hydration', 'eye_rest'], description: 'Health check type.' }
              },
              required: ['type']
            }
          },
          {
            name: 'git_commit_and_push',
            description: 'Stage all code modifications, commit with an executive message, and push to GitHub repository branch.',
            parameters: {
              type: 'OBJECT',
              properties: {
                message: { type: 'STRING', description: 'Commit message.' },
                branch: { type: 'STRING', description: 'Target branch (default: main).' },
                repoPath: { type: 'STRING', description: 'Repository directory path.' }
              },
              required: ['message']
            }
          },
          {
            name: 'create_project',
            description: 'Scaffold a new software project directory with boilerplate code files on Desktop or workspace.',
            parameters: {
              type: 'OBJECT',
              properties: {
                name: { type: 'STRING', description: 'Project name.' },
                type: { type: 'STRING', enum: ['python', 'node', 'web'], description: 'Project type.' }
              },
              required: ['name']
            }
          },
          {
            name: 'get_morning_briefing',
            description: 'Deliver the comprehensive morning briefing (time, weather, hardware health, and daily task agenda).',
            parameters: {
              type: 'OBJECT',
              properties: {}
            }
          },
          {
            name: 'trigger_red_alert',
            description: 'Engage Emergency Red Alert lockdown: mute audio, minimize all windows, clear clipboard, and lock workstation.',
            parameters: {
              type: 'OBJECT',
              properties: {}
            }
          },
          {
            name: 'trigger_protocol',
            description: 'Trigger a predefined Iron Man automation protocol (e.g. "Protocol Focus Mode", "Protocol Dev Mode", "Protocol Clean Slate", "Protocol Night Owl").',
            parameters: {
              type: 'OBJECT',
              properties: {
                protocol_name: {
                  type: 'STRING',
                  description: 'The name or ID of the protocol to activate.'
                }
              },
              required: ['protocol_name']
            }
          },
          {
            name: 'search_files',
            description: 'Search for files in Windows folders (Downloads, Documents, Desktop) by extension, size (e.g. find largest files), or modified date.',
            parameters: {
              type: 'OBJECT',
              properties: {
                folder: { type: 'STRING', description: 'Folder name or path ("downloads", "documents", "desktop", or custom path).' },
                extension: { type: 'STRING', description: 'File extension filter (e.g. ".pdf", ".png", ".js", ".zip", ".docx").' },
                sortBySize: { type: 'BOOLEAN', description: 'True to sort largest first, false to sort newest first.' },
                limit: { type: 'INTEGER', description: 'Maximum files to return (default: 5).' }
              }
            }
          },
          {
            name: 'read_file_content',
            description: 'Read the text, code, script, or markdown content from a local file.',
            parameters: {
              type: 'OBJECT',
              properties: {
                file_path: { type: 'STRING', description: 'Full path to the file to read.' },
                max_lines: { type: 'INTEGER', description: 'Maximum lines to read (default: 150).' }
              },
              required: ['file_path']
            }
          },
          {
            name: 'write_file_content',
            description: 'Write, create, or update a text, script, note, or code file on the filesystem.',
            parameters: {
              type: 'OBJECT',
              properties: {
                file_path: { type: 'STRING', description: 'Full destination file path.' },
                content: { type: 'STRING', description: 'Text content to write.' }
              },
              required: ['file_path', 'content']
            }
          },
          {
            name: 'save_learned_preference',
            description: 'Persist a learned user preference, project directory, habit, or rule into CY9 permanent episodic memory bank.',
            parameters: {
              type: 'OBJECT',
              properties: {
                fact: { type: 'STRING', description: 'The fact or preference to remember permanently.' },
                category: { type: 'STRING', description: 'Category (e.g. "Preference", "Project", "Habit", "Work").' }
              },
              required: ['fact']
            }
          },
          {
            name: 'search_memory_vault',
            description: 'Search CY9 permanent memory vault for past learned facts, rules, and user notes.',
            parameters: {
              type: 'OBJECT',
              properties: {
                query: { type: 'STRING', description: 'Search term or query.' }
              },
              required: ['query']
            }
          },
          {
            name: 'set_project_bookmark',
            description: 'Bookmark a software project directory path with an alias for fast opening.',
            parameters: {
              type: 'OBJECT',
              properties: {
                name: { type: 'STRING', description: 'Project name or alias.' },
                path: { type: 'STRING', description: 'Folder path to the project.' }
              },
              required: ['name', 'path']
            }
          },
          {
            name: 'close_tab',
            description: 'Close a single specific browser tab by name (e.g. "YouTube", "Google", "GitHub") or close ONLY the current active tab without closing the rest of the application or other open tabs (Ctrl+W).',
            parameters: {
              type: 'OBJECT',
              properties: {
                tab_name: {
                  type: 'STRING',
                  description: 'Specific name, title, or platform of the tab to close (e.g. "YouTube", "Google", "GitHub", "Aqar"). If omitted or empty, closes only the current active tab.'
                }
              }
            }
          },
          {
            name: 'open_file_or_folder',
            description: 'Locate and open any folder or file by its name on Windows (e.g. "open folder called CY9 on desktop", "open file report.pdf in downloads", "open desktop folder"). Opens folders in File Explorer and files in their default application.',
            parameters: {
              type: 'OBJECT',
              properties: {
                name_or_path: {
                  type: 'STRING',
                  description: 'The name, title, or path of the file or folder (e.g. "CY9", "CY9-AI-ASSEST-WIN", "Downloads", "Desktop", "report.pdf", "project.docx").'
                },
                location: {
                  type: 'STRING',
                  description: 'Optional location hint where to search (e.g. "desktop", "downloads", "documents").'
                }
              },
              required: ['name_or_path']
            }
          },
          {
            name: 'gmail_check_inbox',
            description: 'Check Gmail inbox for unread messages, fetch email summaries, or search emails.',
            parameters: {
              type: 'OBJECT',
              properties: {
                query: { type: 'STRING', description: 'Search filter e.g. "is:unread", "from:github", "invoice".' },
                limit: { type: 'NUMBER', description: 'Maximum number of emails to retrieve.' }
              }
            }
          },
          {
            name: 'gmail_send_email',
            description: 'Compose and dispatch an email via Gmail.',
            parameters: {
              type: 'OBJECT',
              properties: {
                to: { type: 'STRING', description: 'Recipient email address.' },
                subject: { type: 'STRING', description: 'Subject of the email.' },
                body: { type: 'STRING', description: 'Email body text or HTML.' }
              },
              required: ['to']
            }
          },
          {
            name: 'calendar_get_events',
            description: 'Retrieve upcoming Google Calendar meetings, appointments, and agenda.',
            parameters: {
              type: 'OBJECT',
              properties: {}
            }
          },
          {
            name: 'calendar_create_event',
            description: 'Schedule a new event or meeting in Google Calendar.',
            parameters: {
              type: 'OBJECT',
              properties: {
                title: { type: 'STRING', description: 'Title or topic of the meeting.' },
                date: { type: 'STRING', description: 'Date of the event (e.g. "Today", "Tomorrow", "2026-08-20").' },
                time: { type: 'STRING', description: 'Time of the event (e.g. "3:00 PM").' }
              },
              required: ['title']
            }
          },
          {
            name: 'github_get_notifications',
            description: 'Check GitHub notifications, pull requests, and repository updates.',
            parameters: {
              type: 'OBJECT',
              properties: {}
            }
          },
          {
            name: 'open_tab',
            description: 'Open a new tab in the active browser or editor (sends Ctrl+T).',
            parameters: {
              type: 'OBJECT',
              properties: {}
            }
          },
          {
            name: 'end_live_call',
            description: 'End, close, or hang up the current active live duplex phone call session with the user when they explicitly say goodbye, tell you to hang up, or ask to end/close the call (e.g. "close the call", "اقفل المكالمة", "سكر المكالمة", "انه المكالمة"). NEVER invoke this for normal acknowledgements like "تمام", "أوك", or questions about the screen.',
            parameters: {
              type: 'OBJECT',
              properties: {
                farewell: {
                  type: 'STRING',
                  description: 'Brief farewell message to the user before hanging up (e.g. "في أمان الله يا سيدي", "مع السلامة").'
                },
                reason: {
                  type: 'STRING',
                  description: 'Reason for hanging up if mentioned by the user.'
                }
              }
            }
          },
          {
            name: 'inspect_screen',
            description: 'Capture and visually inspect the entire Windows desktop screen in real-time to analyze what windows, apps, buttons, errors, or content the user is viewing.',
            parameters: {
              type: 'OBJECT',
              properties: {
                focus_query: {
                  type: 'STRING',
                  description: 'Optional question or focus area (e.g. "find YouTube button", "read error dialog", "what is on screen").'
                }
              }
            }
          },
          {
            name: 'mouse_click',
            description: 'Perform a native mouse click (left-click, right-click context menu, or middle-click) at specific screen coordinates (x, y) or at the current cursor position.',
            parameters: {
              type: 'OBJECT',
              properties: {
                button: {
                  type: 'STRING',
                  enum: ['left', 'right', 'middle'],
                  description: 'Mouse button: "left" (standard click), "right" (context menu), or "middle".'
                },
                x: {
                  type: 'NUMBER',
                  description: 'Horizontal screen pixel coordinate or normalized percentage (e.g. 500 or 0.5 for center).'
                },
                y: {
                  type: 'NUMBER',
                  description: 'Vertical screen pixel coordinate or normalized percentage (e.g. 300 or 0.5 for center).'
                }
              }
            }
          },
          {
            name: 'mouse_move',
            description: 'Move the Windows mouse cursor smoothly to exact coordinates (x, y) or percentage of screen (e.g. center, top-left, bottom-right).',
            parameters: {
              type: 'OBJECT',
              properties: {
                x: { type: 'NUMBER', description: 'Target X coordinate or percentage (0-1.0 or pixels).' },
                y: { type: 'NUMBER', description: 'Target Y coordinate or percentage (0-1.0 or pixels).' }
              },
              required: ['x', 'y']
            }
          },
          {
            name: 'mouse_double_click',
            description: 'Perform a native double-click at coordinates (x, y) or current position to launch applications, open files/folders, or select words.',
            parameters: {
              type: 'OBJECT',
              properties: {
                x: { type: 'NUMBER', description: 'Optional target X coordinate.' },
                y: { type: 'NUMBER', description: 'Optional target Y coordinate.' }
              }
            }
          },
          {
            name: 'mouse_drag',
            description: 'Perform a native mouse drag-and-drop from start coordinates to end coordinates.',
            parameters: {
              type: 'OBJECT',
              properties: {
                startX: { type: 'NUMBER', description: 'Start X coordinate.' },
                startY: { type: 'NUMBER', description: 'Start Y coordinate.' },
                endX: { type: 'NUMBER', description: 'Destination X coordinate.' },
                endY: { type: 'NUMBER', description: 'Destination Y coordinate.' }
              },
              required: ['startX', 'startY', 'endX', 'endY']
            }
          },
          {
            name: 'mouse_scroll',
            description: 'Rotate the mouse scroll wheel up or down by a number of steps.',
            parameters: {
              type: 'OBJECT',
              properties: {
                direction: { type: 'STRING', enum: ['up', 'down'], description: '"up" or "down".' },
                amount: { type: 'INTEGER', description: 'Number of scroll steps (default: 3).' }
              },
              required: ['direction']
            }
          },
          {
            name: 'keyboard_type',
            description: 'Type text or strings into the currently focused Windows input box or application.',
            parameters: {
              type: 'OBJECT',
              properties: {
                text: { type: 'STRING', description: 'The text to type.' }
              },
              required: ['text']
            }
          },
          {
            name: 'keyboard_press',
            description: 'Press a special key or hotkey (e.g. "enter", "esc", "tab", "win", "ctrl+c", "ctrl+v", "ctrl+a", "alt+tab", "f5").',
            parameters: {
              type: 'OBJECT',
              properties: {
                key: { type: 'STRING', description: 'Key name (e.g. "enter", "esc", "tab", "win", "ctrl+c", "ctrl+v", "alt+tab").' }
              },
              required: ['key']
            }
          },
          {
            name: 'show_on_center_screen',
            description: 'Print formatted data, markdown, table, analysis, or intelligence card directly onto the prominent central HUD screen when the user asks "وريني" (Show me) or requests visual reports.',
            parameters: {
              type: 'OBJECT',
              properties: {
                title: { type: 'STRING', description: 'Title header for the report or card.' },
                content: { type: 'STRING', description: 'Full formatted Markdown content, tables, lists, or code to display prominently in the center console.' },
                category: { type: 'STRING', description: 'Category e.g. "Research", "System", "Smart Home", "Inspection", "Intelligence".' }
              },
              required: ['title', 'content']
            }
          },
          {
            name: 'create_programming_prompt',
            description: 'Design and synthesize a master production-grade system prompt and architectural blueprint for programming projects, applications, and codebases (for Cursor, Windsurf, Claude 3.5 Sonnet, Antigravity, Gemini, ChatGPT).',
            parameters: {
              type: 'OBJECT',
              properties: {
                project_description: {
                  type: 'STRING',
                  description: 'Detailed description or idea of the software project/application requested by the user.'
                },
                tech_stack: {
                  type: 'STRING',
                  description: 'Preferred technologies, frontend/backend frameworks, database, CSS (e.g. Next.js, FastAPI, PostgreSQL, Flutter).'
                },
                target_ai: {
                  type: 'STRING',
                  description: 'The target AI coding agent e.g. "Cursor", "Claude 3.5 Sonnet", "Antigravity", "Windsurf", "ChatGPT".'
                },
                project_type: {
                  type: 'STRING',
                  description: '"fullstack", "web_app", "mobile_app", "electron_desktop", "backend_api", or "ai_agent".'
                },
                language: {
                  type: 'STRING',
                  description: '"ar" (Arabic), "en" (English), or "bilingual".'
                },
                save_to_file: {
                  type: 'BOOLEAN',
                  description: 'Whether to save the generated prompt as a Markdown file on the Desktop.'
                }
              },
              required: ['project_description']
            }
          }
        ]
      }
    ];
  }

  getClient() {
    const config = memoryService.getConfig();
    const apiKey = config.apiKey || process.env.GEMINI_API_KEY;
    if (!apiKey) return null;
    if (!this.client || this.currentApiKey !== apiKey) {
      this.currentApiKey = apiKey;
      this.client = new GoogleGenAI({ apiKey });
    }
    return this.client;
  }

  buildSystemInstruction() {
    const config = memoryService.getConfig();
    const userName = config.userName || 'Sir';
    const memories = memoryService.getLearnedContext();
    const projectBookmarks = JSON.stringify(memoryService.getProjectBookmarks(), null, 2);
    const tasks = memoryService.getTasks().slice(0, 8).map(t => `- [${t.completed ? 'x' : ' '}] ${t.text}`).join('\n');

    return `You are CY9, an ultra-advanced, highly sophisticated autonomous AI assistant and tactical digital executive deeply integrated into the user's Windows workstation and connected smart ecosystem.

PRIMARY DIRECTIVES & PERSONALITY:
1. Ultra-Natural Human Intelligence & Autonomous Reasoning (ReAct Loop):
   - Talk and understand like an exceptionally intelligent, cultured, and loyal human executive partner.
   - For complex, multi-step goals (e.g. "find the largest file, summarize it, and message me"), break them down logically and execute each tool step sequentially.
   - Comprehend complex human intent, subtext, emotions, implied tasks, Arabic idioms/dialects (Saudi, Gulf, Levant, etc.) and English effortlessly.
   - Avoid robotic or repetitive boilerplate responses; speak with warmth, razor-sharp wit, and utmost professionalism.
2. Step-by-Step Confirmation & Transparency Protocol (بروتوكول التأكيد والاستئذان):
   - Whenever drafting an official email, sending notifications, or performing high-impact system changes, present the exact draft/plan clearly to the user and ask for confirmation before final dispatch (e.g. "كتبت لك المسودة التالية يا سيدي، هل تعتمد إرسالها؟").
   - When asked to perform tasks, explain what you are doing in a crisp, reassuring manner.
3. Complete Windows & IoT Ecosystem Control:
   - Windows OS: Launch/close apps, close/open tabs, manage windows, power, volume, media keys, File Explorer, Recycle Bin, and PowerShell.
   - File System Operations: Search files by size/extension ('search_files'), read files ('read_file_content'), and write files/scripts ('write_file_content').
   - Multi-Browser Deep Search: Target Chrome, Edge, Firefox, Brave, or default browser for Real Estate (Aqar, Bayut), YouTube, Google Maps, Haraj, Amazon, and general web.
   - Professional Copywriting: Compose official business emails, articles, proposals, and reports with impeccable phrasing.
   - Smart Device & IoT Control: Control Smart TVs (Samsung/LG/Android TV), smart lights, plugs, ACs, and phone notification uplink ('control_smart_device', 'send_phone_notification').
   - Multimodal Vision: Analyze the screen or images to read emails, debug code, or extract data.
4. Respect & Hierarchy:
   - Always address the user respectfully as "${userName}" (or Sir/Ma'am).

LEARNED USER MEMORY & PREFERENCES:
${memories}

PROJECT BOOKMARKS:
${projectBookmarks !== '{}' ? projectBookmarks : 'No custom project bookmarks yet.'}

ACTIVE TASK ROSTER:
${tasks || 'No pending tasks on agenda.'}

LANGUAGE & VOCAL DIRECTIVE:
Primary System Language: ${config.language === 'en' ? 'English' : 'العربية (Arabic)'}.
- When communicating in Arabic, speak with natural fluency, polite Saudi/Gulf or Modern Standard Arabic flair, warmth, and respectful courtesy ("حاضر يا سيدي", "أبشر", "تحت أمرك", "تم ذلك بنجاح").
- Always format outputs concisely so they can be comfortably spoken aloud via voice synthesis.
`;
  }

  async quickLocalCheck(userMessage, onProgress) {
    if (!userMessage) return null;
    const config = memoryService.getConfig();
    const userName = config.userName || 'Sir';
    let raw = userMessage.trim().toLowerCase();
    raw = raw.replace(/^\//, '').trim();
    const lower = raw.toLowerCase();

    const cleanAppExtraction = (str) => {
      let cleaned = (str || '').toLowerCase().trim();
      cleaned = cleaned.replace(/[\u064B-\u065F\u0670]/g, ''); // Strip all Arabic tashkeel/tanween
      cleaned = cleaned.replace(/\b(can you|could you|would you|please|thank you|thanks|hey|hello|hi|s9|sci-nine|cy9|jarvis|a new tab of|new tab of|a new window of|new window of|new tab|new window|tab of|window of|tab|now|just|for me)\b/gi, ' ');
      cleaned = cleaned.replace(/(?:صفحة جديدة|نافذة جديدة|تبويب جديد)\s*(?:لـ|ل|من|عن)?\s*/gi, ' ');
      cleaned = cleaned.replace(/(?:شكرا|شكراً|مشكور|تسلم|لو سمحت|من فضلك|الله يخليك|هلا|والله|تقدر|ممكن|يا سيدي|يا بطل|ودنا|ودّنا|ابغاك|ابغى|الان|لي)/gi, ' ');
      cleaned = cleaned.replace(/^(app|برنامج|تطبيق|برمجية|folder|directory|file|مجلد|ملف|دليل|لـ|ل|من|عن)\s+/i, ' ');
      cleaned = cleaned.replace(/^ل([a-z0-9\u0600-\u06FF]+)/i, '$1');
      cleaned = cleaned.replace(/\s+(app|برنامج|تطبيق|folder|directory|file|مجلد|ملف|دليل)$/i, ' ');
      cleaned = cleaned.replace(/[؟?.,!]/g, '');
      cleaned = cleaned.replace(/\s+/g, ' ').trim();
      return cleaned;
    };

    const KNOWN_APPS = [
      { regex: /(chrome|google chrome|كروم|قوقل كروم|جوجل كروم)/i, target: 'chrome', nameEn: 'Google Chrome', nameAr: 'جوجل كروم' },
      { regex: /(notepad|مفكرة|المفكرة|نوت باد)/i, target: 'notepad', nameEn: 'Notepad', nameAr: 'المفكرة' },
      { regex: /(calculator|calc|حاسبة|الحاسبة|الة حاسبة)/i, target: 'calc', nameEn: 'Calculator', nameAr: 'الآلة الحاسبة' },
      { regex: /(vscode|vs code|visual studio code|في اس كود)/i, target: 'code', nameEn: 'Visual Studio Code', nameAr: 'فيجوال ستوديو كود' },
      { regex: /(edge|msedge|مايكروسوفت ايدج|ايدج)/i, target: 'msedge', nameEn: 'Microsoft Edge', nameAr: 'إيدج' },
      { regex: /(word|winword|وورد|الوورد)/i, target: 'winword', nameEn: 'Microsoft Word', nameAr: 'مايكروسوفت وورد' },
      { regex: /(excel|اكسل|الإكسل)/i, target: 'excel', nameEn: 'Microsoft Excel', nameAr: 'إكسل' },
      { regex: /(powerpoint|بوربوينت|باوربوينت)/i, target: 'powerpnt', nameEn: 'Microsoft PowerPoint', nameAr: 'بوربوينت' },
      { regex: /(terminal|powershell|باور شيل|ترمنال|الطرفية)/i, target: 'powershell', nameEn: 'PowerShell', nameAr: 'باور شيل' },
      { regex: /(cmd|command prompt|موجه الاوامر)/i, target: 'cmd', nameEn: 'Command Prompt', nameAr: 'موجه الأوامر' },
      { regex: /(explorer|file explorer|مستكشف الملفات)/i, target: 'explorer', nameEn: 'File Explorer', nameAr: 'مستكشف الملفات' },
      { regex: /(spotify|سبوتيفاي)/i, target: 'spotify', nameEn: 'Spotify', nameAr: 'سبوتيفاي' },
      { regex: /(whatsapp|واتساب|الواتس)/i, target: 'whatsapp', nameEn: 'WhatsApp', nameAr: 'واتساب' },
      { regex: /(telegram|تيليجرام|تليجرام)/i, target: 'telegram', nameEn: 'Telegram', nameAr: 'تيليجرام' },
      { regex: /(discord|ديسكورد|دسكورد)/i, target: 'discord', nameEn: 'Discord', nameAr: 'ديسكورد' },
      { regex: /(taskmgr|task manager|مدير المهام)/i, target: 'taskmgr', nameEn: 'Task Manager', nameAr: 'مدير المهام' },
      { regex: /(paint|mspaint|الرسام)/i, target: 'mspaint', nameEn: 'Paint', nameAr: 'الرسام' },
      { regex: /(control panel|لوحة التحكم)/i, target: 'control', nameEn: 'Control Panel', nameAr: 'لوحة التحكم' },
      { regex: /(settings|الاعدادات|الإعدادات)/i, target: 'ms-settings:', nameEn: 'Windows Settings', nameAr: 'إعدادات ويندوز' }
    ];

    const findKnownApp = (text) => {
      for (const a of KNOWN_APPS) {
        if (a.regex.test(text)) return a;
      }
      return null;
    };

    // 1. Tab Controls & Named Tab Closing (Close single tab by name or current active tab)
    const isTabCloseIntent = /(close|kill|quit|terminate|اقفل|قفل|تقفل|سكر|تسكر|أغلق|اغلق|انهي|أوقف|اوقف)/i.test(raw) &&
      (/(tab|tabs|تبويب|التبويب|صفحة|الصفحة|الموقع|موقع|التاب|هذا التاب|التاب اللي|التاب الي|نفس التاب)/i.test(raw) || /(youtube|يوتيوب|google|قوقل|جوجل|github|تويتر|twitter|x\.com|aqar|عقار|amazon|أمازون|bayut|بيوت)/i.test(raw)) &&
      !/(all|كل|كامل|جميع|كل كروم|جميع التابات|كل التابات)/i.test(raw);

    if (isTabCloseIntent) {
      let targetTabName = '';
      if (/(youtube|يوتيوب)/i.test(raw)) targetTabName = 'YouTube';
      else if (/(google|قوقل|جوجل)/i.test(raw)) targetTabName = 'Google';
      else if (/(github|جيت هب)/i.test(raw)) targetTabName = 'GitHub';
      else if (/(twitter|تويتر|x\.com)/i.test(raw)) targetTabName = 'Twitter';
      else if (/(aqar|عقار)/i.test(raw)) targetTabName = 'Aqar';
      else if (/(bayut|بيوت)/i.test(raw)) targetTabName = 'Bayut';
      else if (/(amazon|امازون|أمازون)/i.test(raw)) targetTabName = 'Amazon';
      else {
        const match = raw.match(/(?:tab|تبويب|صفحة|موقع)\s+([a-z0-9\u0600-\u06FF]+)/i);
        if (match && match[1] && !['الحالي', 'هذا', 'الجديد', 'active', 'this', 'current', 'اللي', 'الي', 'نفس'].includes(match[1])) {
          targetTabName = match[1];
        }
      }

      const res = await agentManager.executeTool('close_tab', { tab_name: targetTabName }, onProgress);
      return {
        success: true,
        reply: targetTabName
          ? (config.language === 'ar' ? `حاضر يا سيدي. قمت بإغلاق تبويب **${targetTabName}** فقط، مع إبقاء بقية المواقع مفتوحة.` : `Right away, ${userName}. Closed only the **${targetTabName}** tab.`)
          : (config.language === 'ar' ? 'حاضر يا سيدي. تم إغلاق التبويب الحالي فقط دون المساس بباقي الصفحات (Ctrl+W).' : `Right away, ${userName}. Closed only the active tab for you.`),
        source: 'local'
      };
    }

    if (/^(open\s+new\s+tab|new\s+tab|افتح\s+تبويب\s+جديد|تبويب\s+جديد|صفحة\s+جديدة)$/i.test(raw)) {
      const res = await agentManager.executeTool('open_tab', {}, onProgress);
      return {
        success: true,
        reply: config.language === 'ar' ? 'تم فتح تبويب جديد، يا سيدي (Ctrl+T).' : `Opened a new tab, ${userName}.`,
        source: 'local'
      };
    }

    // 0. Dedicated File & Folder Opening by Name (e.g. "open folder called CY9 on desktop", "افتح ملف اسمه CY9")
    const isFileOrFolderOpen = /(open|launch|start|run|افتح|تفتح|شغل|تشغل)\s+(?:a\s+|the\s+)?(?:folder|file|directory|مجلد|ملف|دليل)\s+/i.test(raw) ||
      /(?:folder|file|directory|مجلد|ملف)\s+(?:called|named|اسمه|باسم)\s+/i.test(raw) ||
      /(?:on\s+desktop|in\s+desktop|in\s+downloads|in\s+documents|على\s+سطح\s+المكتب|في\s+التنزيلات|في\s+المستندات)/i.test(raw);

    if (isFileOrFolderOpen && /(open|launch|start|run|افتح|تفتح|شغل|تشغل)/i.test(raw)) {
      let location = null;
      if (/(desktop|سطح المكتب)/i.test(raw)) location = 'desktop';
      else if (/(download|تنزيل|تحميل)/i.test(raw)) location = 'downloads';
      else if (/(document|مستند)/i.test(raw)) location = 'documents';

      let targetName = raw;
      targetName = targetName.replace(/^(?:can you|please|could you|لو سمحت|من فضلك)?\s*(?:open|launch|start|run|افتح|تفتح|شغل|تشغل)\s+/i, '');
      targetName = targetName.replace(/(?:a\s+|the\s+)?(?:folder|file|directory|مجلد|ملف|دليل)\s+(?:called|named|اسمه|باسم|من)?\s*/gi, '');
      targetName = targetName.replace(/(?:called|named|اسمه|باسم)\s+/gi, '');
      targetName = targetName.replace(/(?:on\s+desktop|in\s+desktop|in\s+downloads|in\s+documents|على\s+سطح\s+المكتب|في\s+التنزيلات|في\s+المستندات|في\s+سطح\s+المكتب)/gi, '');
      targetName = targetName.replace(/(?:folder|file|مجلد|ملف)$/gi, '');
      targetName = targetName.replace(/[؟?.,!]/g, '').trim();

      if (targetName && targetName.length > 0 && !['chrome', 'calc', 'notepad', 'code', 'spotify', 'whatsapp', 'tab', 'تبويب', 'مكيف', 'تلفزيون', 'اضاءة', 'نور', 'ليد', 'ريموت'].includes(targetName)) {
        const res = await agentManager.executeTool('open_file_or_folder', { name_or_path: targetName, location }, onProgress);
        return {
          success: res.success,
          reply: res.message || (config.language === 'ar' ? `تم فتح **${targetName}** بنجاح يا سيدي.` : `Opened **${targetName}** for you, ${userName}.`),
          source: 'local'
        };
      }
    }

    // 0.5. Universal IR Remote & Smart Device Controls (الريموت / التلفزيون / الإضاءة / المكيف / الساوند بار)
    if (lower.includes('ريموت') || lower.includes('remote') || lower.includes('مكيف') || lower.includes('سبليت') || lower.includes('تلفزيون') || lower.includes('تلفاز') || (lower.includes('tv') && !lower.includes('activity')) || lower.includes('اضاءة') || lower.includes('إضاءة') || lower.includes('ليد') || lower.includes('ساوند') || lower.includes('soundbar')) {
      let device = 'tv';
      let name = 'Smart TV';
      let cmd = 'power';
      let val = '';

      if (lower.includes('اضاءة') || lower.includes('إضاءة') || lower.includes('نور') || lower.includes('light') || lower.includes('ليد') || lower.includes('led')) {
        device = 'light';
        name = 'Ambient RGB Strip';
        cmd = 'power_on';
        if (lower.includes('ازرق') || lower.includes('أزرق') || lower.includes('blue')) cmd = 'blue';
        else if (lower.includes('سماوي') || lower.includes('cyan')) cmd = 'cyan';
        else if (lower.includes('احمر') || lower.includes('أحمر') || lower.includes('red')) cmd = 'red';
        else if (lower.includes('اخضر') || lower.includes('أخضر') || lower.includes('green')) cmd = 'green';
        else if (lower.includes('ابيض') || lower.includes('أبيض') || lower.includes('white')) cmd = 'white';
        else if (lower.includes('بنفسجي') || lower.includes('purple')) cmd = 'purple';
        else if (lower.includes('اصفر') || lower.includes('أصفر') || lower.includes('yellow')) cmd = 'yellow';
      } else if (lower.includes('مكيف') || lower.includes('ac') || lower.includes('سبليت')) {
        device = 'ac';
        name = 'Living Room AC';
        const tempMatch = raw.match(/\b(1[6-9]|2[0-9]|30)\b/);
        if (tempMatch) {
          cmd = 'temp';
          val = tempMatch[1];
        } else if (lower.includes('بارد') || lower.includes('cool')) {
          cmd = 'mode_cool';
        } else if (lower.includes('حار') || lower.includes('heat')) {
          cmd = 'mode_heat';
        } else if (lower.includes('رفع') || lower.includes('up') || lower.includes('زد')) {
          cmd = 'temp';
          val = 24;
        } else if (lower.includes('خفض') || lower.includes('down') || lower.includes('برد') || lower.includes('نقص')) {
          cmd = 'temp';
          val = 20;
        }
      } else if (lower.includes('ساوند') || lower.includes('soundbar') || lower.includes('سماعة') || lower.includes('مسرح')) {
        device = 'audio';
        name = 'Home Audio Soundbar';
        if (lower.includes('رفع') || lower.includes('up')) cmd = 'vol_up';
        else if (lower.includes('خفض') || lower.includes('down')) cmd = 'vol_down';
        else if (lower.includes('كتم') || lower.includes('mute')) cmd = 'mute';
        else if (lower.includes('بلوتوث') || lower.includes('bluetooth')) cmd = 'bluetooth';
      } else {
        // TV controls
        if (lower.includes('رفع') || lower.includes('up')) cmd = 'vol_up';
        else if (lower.includes('خفض') || lower.includes('down')) cmd = 'vol_down';
        else if (lower.includes('كتم') || lower.includes('mute')) cmd = 'mute';
        else if (lower.includes('hdmi 1') || lower.includes('hdmi1')) cmd = 'hdmi1';
        else if (lower.includes('hdmi 2') || lower.includes('hdmi2')) cmd = 'hdmi2';
        else if (lower.includes('يوتيوب') || lower.includes('youtube')) cmd = 'youtube';
        else if (lower.includes('نتفلكس') || lower.includes('netflix')) cmd = 'netflix';
      }

      if (lower.includes('شغل') || lower.includes('turn on') || lower.includes('افتح')) {
        if (cmd === 'power') cmd = 'power_on';
      }
      if (lower.includes('طفي') || lower.includes('اقفل') || lower.includes('turn off') || lower.includes('سكر') || lower.includes('اغلق') || lower.includes('اطفئ')) {
        cmd = device === 'light' ? 'power_off' : 'power';
      }

      const res = await agentManager.executeTool('control_smart_device', {
        device_type: device,
        name,
        command: cmd,
        value: val
      }, onProgress);

      return {
        success: true,
        reply: res.message || `📡 IR Remote Signal sent to **${name}** (${device}): executed **${cmd}**, ${userName}.`,
        source: 'local'
      };
    }

    // 0.8. Connected Apps: Gmail, Google Calendar, GitHub
    if (lower.includes('gmail') || lower.includes('جيميل') || lower.includes('بريدي') || lower.includes('ايميل') || lower.includes('إيميل') || lower.includes('inbox') || lower.includes('email') || lower.includes('mail')) {
      if (lower.includes('ارسل') || lower.includes('أرسل') || lower.includes('send') || lower.includes('اكتب')) {
        const emailMatch = raw.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/i);
        const recipient = emailMatch ? emailMatch[1] : '';
        const res = await agentManager.executeTool('gmail_send_email', {
          to: recipient || 'contact@example.com',
          subject: 'Direct Message via CY9 AI Executive',
          body: 'Hello, this message was initiated via CY9 Autonomous AI Assistant.'
        }, onProgress);
        return { success: true, reply: res.message, source: 'local' };
      } else {
        const res = await agentManager.executeTool('gmail_check_inbox', {}, onProgress);
        return { success: true, reply: res.message, source: 'local' };
      }
    }

    if (lower.includes('تقويم') || lower.includes('calendar') || lower.includes('مواعيد') || lower.includes('اجتماع') || lower.includes('meeting') || lower.includes('schedule')) {
      if (lower.includes('انشئ') || lower.includes('سجل') || lower.includes('احجز') || lower.includes('schedule') || lower.includes('add')) {
        const res = await agentManager.executeTool('calendar_create_event', {
          title: raw.replace(/.*(?:موعد|اجتماع|meeting|event)\s*/i, '').trim() || 'Tactical Meeting',
          date: 'Today',
          time: '12:00 PM'
        }, onProgress);
        return { success: true, reply: res.message, source: 'local' };
      } else {
        const res = await agentManager.executeTool('calendar_get_events', {}, onProgress);
        const evList = (res.events || []).map(e => `• 🕒 **${e.time}** (${e.date}): ${e.title}`).join('\n');
        return {
          success: true,
          reply: `📅 **Google Calendar Agenda**:\n${evList}\n\n(To add or modify events, say "Schedule meeting tomorrow at 3 PM").`,
          source: 'local'
        };
      }
    }

    if (lower.includes('github') || lower.includes('قيت هاب') || lower.includes('جيت هاب')) {
      const res = await agentManager.executeTool('github_get_notifications', {}, onProgress);
      return { success: true, reply: res.message, source: 'local' };
    }

    // 1. Open App or Folder (افتح / شغل / تفتح / تشغل / open / launch)
    const openKeywords = ['open', 'launch', 'start', 'run', 'افتح', 'تفتح', 'شغل', 'تشغل', 'ابدا', 'ابدأ'];
    for (const kw of openKeywords) {
      if (raw.startsWith(kw + ' ') || raw.includes(` ${kw} `) || raw.includes(`${kw} `)) {
        // Priority A: Check if input mentions a registered known application
        const known = findKnownApp(raw);
        if (known) {
          const res = await agentManager.executeTool('launch_app', { app_name: known.target }, onProgress);
          return {
            success: true,
            reply: res.success
              ? (config.language === 'ar' ? `حاضر يا سيدي. قمت بتشغيل **${known.nameAr}** فوراً.` : `Right away, ${userName}. I have initialized **${known.nameEn}** for you.`)
              : (config.language === 'ar' ? `حاولت تشغيل ${known.nameAr} ولكن: ${res.message}.` : `I attempted to initialize ${known.nameEn}, but encountered an error: ${res.message}.`),
            source: 'local'
          };
        }

        // Priority B: Dynamic path or custom application
        let appName = raw.slice(raw.indexOf(kw) + kw.length).trim();
        appName = cleanAppExtraction(appName);
        if (['downloads', 'documents', 'desktop', 'pictures', 'التنزيلات', 'المستندات', 'التحميلات', 'سطح المكتب', 'الصور'].includes(appName)) {
          let folderPath = appName;
          if (appName === 'التنزيلات' || appName === 'التحميلات') folderPath = 'downloads';
          if (appName === 'المستندات') folderPath = 'documents';
          if (appName === 'سطح المكتب') folderPath = 'desktop';
          if (appName === 'الصور') folderPath = 'pictures';
          const res = await agentManager.executeTool('open_folder', { path: folderPath }, onProgress);
          return { success: true, reply: res.message, source: 'local' };
        }
        if (appName && appName.length > 1 && !['weather', 'volume', 'protocol', 'screenshot', 'what', 'how', 'why', 'who'].includes(appName)) {
          const res = await agentManager.executeTool('launch_app', { app_name: appName }, onProgress);
          return {
            success: true,
            reply: res.success
              ? (config.language === 'ar' ? `حاضر يا سيدي. قمت بتشغيل **${appName}** فوراً.` : `Right away, ${userName}. I have initialized **${appName}** for you.`)
              : (config.language === 'ar' ? `حاولت تشغيل ${appName} ولكن: ${res.message}.` : `I attempted to initialize ${appName}, but encountered an error: ${res.message}.`),
            source: 'local'
          };
        }
      }
    }

    // 2. Close App (اقفل / سكر / تقفل / تسكر / close / kill)
    const closeKeywords = ['close', 'kill', 'quit', 'terminate', 'اقفل', 'قفل', 'تقفل', 'سكر', 'تسكر', 'أغلق', 'اغلق', 'انهي', 'أوقف', 'اوقف'];
    for (const kw of closeKeywords) {
      if (raw.startsWith(kw + ' ') || raw.includes(` ${kw} `) || raw.includes(`${kw} `)) {
        const isCloseAll = /(all|كل|كامل|جميع|كل كروم|جميع التابات|كل التابات)/i.test(raw);
        const known = findKnownApp(raw);
        
        // If user says "close chrome" without "all", default to closing the active tab safely
        if (known && known.target === 'chrome' && !isCloseAll) {
          const res = await agentManager.executeTool('close_tab', {}, onProgress);
          return {
            success: true,
            reply: config.language === 'ar'
              ? 'حاضر يا سيدي. تم إغلاق التبويب الحالي فقط دون المساس بباقي الصفحات (إذا كنت تريد إغلاق كل كروم بالكامل قل "اقفل كل كروم").'
              : `Closed the active tab, ${userName}. (To close all Chrome windows, say "close all Chrome").`,
            source: 'local'
          };
        }

        if (known) {
          const res = await agentManager.executeTool('close_app', { app_name: known.target }, onProgress);
          return {
            success: true,
            reply: res.message || (config.language === 'ar' ? `تم إنهاء وإغلاق **${known.nameAr}**، يا سيدي.` : `Terminated **${known.nameEn}**, ${userName}.`),
            source: 'local'
          };
        }

        let appName = raw.slice(raw.indexOf(kw) + kw.length).trim();
        appName = cleanAppExtraction(appName);
        if (appName && appName.length > 1 && !appName.includes('shutdown') && !appName.includes('pc') && !appName.includes('windows')) {
          const res = await agentManager.executeTool('close_app', { app_name: appName }, onProgress);
          return {
            success: true,
            reply: res.message || (config.language === 'ar' ? `تم إنهاء وإغلاق **${appName}**، يا سيدي.` : `Terminated **${appName}**, ${userName}.`),
            source: 'local'
          };
        }
      }
    }

    // 3. Audio & Volume Controls
    if (raw.includes('mute') || raw.includes('كتم الصوت') || raw.includes('صامت')) {
      const res = await agentManager.executeTool('adjust_volume', { action: 'mute' }, onProgress);
      return { success: true, reply: res.message, source: 'local' };
    }
    if (raw.includes('unmute') || raw.includes('الغاء الكتم') || raw.includes('تشغيل الصوت')) {
      const res = await agentManager.executeTool('adjust_volume', { action: 'unmute' }, onProgress);
      return { success: true, reply: res.message, source: 'local' };
    }
    if (raw.includes('volume up') || raw.includes('ارفع الصوت') || raw.includes('علي الصوت')) {
      const res = await agentManager.executeTool('adjust_volume', { action: 'up' }, onProgress);
      return { success: true, reply: res.message, source: 'local' };
    }
    if (raw.includes('volume down') || raw.includes('اخفض الصوت') || raw.includes('قصر الصوت')) {
      const res = await agentManager.executeTool('adjust_volume', { action: 'down' }, onProgress);
      return { success: true, reply: res.message, source: 'local' };
    }

    return null;
  }

  async processMessage(userMessage, attachedImage = null, onStream = () => {}, onProgress = () => {}, attachedFiles = []) {
    const config = memoryService.getConfig();
    const modelName = config.model || 'gemini-3.5-flash';
    const userName = config.userName || 'Sir';
    const client = this.getClient();

    // Auto-extract user preferences, project locations, and rules into long-term memory
    try {
      memoryService.autoExtractAndSaveFacts(userMessage);
    } catch (e) {}

    agentManager.setAgentActive('executive', `Analyzing query from ${userName}`);
    onProgress({ agent: 'executive', text: `Analyzing command intent: "${userMessage.substring(0, 40)}..."` });

    // Zero-latency instant local execution for standard workstation commands
    if (!attachedImage && (!attachedFiles || attachedFiles.length === 0)) {
      const quickMatch = await this.quickLocalCheck(userMessage, onProgress);
      if (quickMatch) {
        return quickMatch;
      }
    }

    if (!client) {
      return await this.fallbackLocalHandler(userMessage, onStream, onProgress);
    }

    try {
      const systemInstruction = this.buildSystemInstruction();
      let contents = [];
      
      const recentHistory = memoryService.getHistory().slice(-6);
      for (const h of recentHistory) {
        if (h.role === 'user') {
          contents.push({ role: 'user', parts: [{ text: h.content }] });
        } else if (h.role === 'assistant') {
          contents.push({ role: 'model', parts: [{ text: h.content }] });
        }
      }

      const userParts = [{ text: userMessage }];
      // Attach screenshot/image
      if (attachedImage) {
        userParts.push({
          inlineData: {
            mimeType: attachedImage.mimeType || 'image/png',
            data: attachedImage.base64
          }
        });
      }
      // Attach additional files (PDF, Word, Excel, PowerPoint, text, etc.)
      if (attachedFiles && attachedFiles.length > 0) {
        for (const file of attachedFiles) {
          if (file && file.base64 && file.mimeType) {
            userParts.push({
              inlineData: {
                mimeType: file.mimeType,
                data: file.base64
              }
            });
          }
        }
      }
      contents.push({ role: 'user', parts: userParts });


      let response;
      let activeModel = 'gemini-3.5-flash';
      const candidateModels = ['gemini-3.5-flash', 'gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite'];
      const uniqueModels = [...new Set(candidateModels)];
      let lastModelError = null;

      const callWithTimeout = (promise, ms = 6000) => {
        return Promise.race([
          promise,
          new Promise((_, reject) => setTimeout(() => reject(new Error('AI generation timeout')), ms))
        ]);
      };

      for (const mName of uniqueModels) {
        try {
          response = await callWithTimeout(
            client.models.generateContent({
              model: mName,
              contents: contents,
              config: {
                systemInstruction: systemInstruction,
                tools: this.toolsDefinition,
                temperature: 0.7
              }
            }),
            6000
          );
          if (response) {
            activeModel = mName;
            break;
          }
        } catch (mErr) {
          lastModelError = mErr;
          console.warn(`Model ${mName} fallback notice:`, mErr.message);
          continue;
        }
      }

      if (!response && lastModelError) {
        throw lastModelError;
      }

      let candidate = response.candidates && response.candidates[0];
      let functionCalls = candidate && candidate.content && candidate.content.parts
        ? candidate.content.parts.filter(p => p.functionCall).map(p => p.functionCall)
        : [];

      let toolTurn = 0;
      while (functionCalls.length > 0 && toolTurn < 5) {
        toolTurn++;
        const toolResults = [];

        for (const fc of functionCalls) {
          onProgress({ agent: 'executive', text: `Executing tool subroutine: [${fc.name}]` });
          
          let execResult;
          if (fc.name === 'take_screenshot_and_analyze') {
            const screen = await systemService.captureScreenshot();
            if (screen.success) {
              onProgress({ agent: 'vision_screen', text: 'Processing desktop screenshot frame with Gemini Vision...' });
              const visionPrompt = fc.args?.prompt || userMessage || 'Describe the active desktop screenshot and any prominent windows, code, or alerts.';
              const visionRes = await client.models.generateContent({
                model: activeModel,
                contents: [
                  {
                    role: 'user',
                    parts: [
                      { text: visionPrompt },
                      { inlineData: { mimeType: 'image/png', data: screen.base64 } }
                    ]
                  }
                ],
                config: {
                  systemInstruction: 'You are CY9 Vision Subsystem. Describe what is visible in the desktop screenshot accurately, concisely, and technically.'
                }
              });
              execResult = {
                success: true,
                screenshotCaptured: true,
                visionAnalysis: visionRes.text
              };
            } else {
              execResult = screen;
            }
          } else {
            execResult = await agentManager.executeTool(fc.name, fc.args || {}, onProgress);
          }

          toolResults.push({
            functionResponse: {
              name: fc.name,
              response: { result: execResult }
            }
          });
        }

        contents.push(candidate.content);
        contents.push({
          role: 'user',
          parts: toolResults
        });

        onProgress({ agent: 'executive', text: 'Synthesizing tactical report from agent subroutines...' });
        
        response = await client.models.generateContent({
          model: activeModel,
          contents: contents,
          config: {
            systemInstruction: systemInstruction,
            tools: this.toolsDefinition,
            temperature: 0.7
          }
        });

        candidate = response.candidates && response.candidates[0];
        functionCalls = candidate && candidate.content && candidate.content.parts
          ? candidate.content.parts.filter(p => p.functionCall).map(p => p.functionCall)
          : [];
      }

      const finalReply = response.text || (candidate && candidate.content?.parts?.map(p => p.text).filter(Boolean).join(' ')) || 'Subroutine complete, sir.';

      agentManager.setAgentIdle('executive', 'Awaiting next directive');
      
      memoryService.addHistory({ role: 'user', content: userMessage });
      memoryService.addHistory({ role: 'assistant', content: finalReply });

      return {
        success: true,
        reply: finalReply,
        source: 'gemini'
      };
    } catch (err) {
      console.error('Gemini error:', err.message);
      agentManager.setAgentIdle('executive', `Operating in Local Mode`);
      
      const fallback = await this.fallbackLocalHandler(userMessage, onStream, onProgress);
      
      let friendlyNotice = '';
      if (err.message && (err.message.includes('429') || err.message.includes('quota') || err.message.includes('RESOURCE_EXHAUSTED'))) {
        friendlyNotice = `> 💡 *(تنبيه: تم الوصول للحد الأقصى المؤقت لطلبات Gemini API المجانية على هذا المفتاح 429 - جاري تنفيذ الأمر عبر النظام المحلي المستقل)*\n\n`;
      } else if (err.message && (err.message.includes('API_KEY_INVALID') || err.message.includes('403') || err.message.includes('unregistered'))) {
        friendlyNotice = `> 💡 *(تنبيه: مفتاح Gemini API غير مسجل أو منتهي - جاري تنفيذ الأمر عبر النظام المحلي)*\n\n`;
      }

      return {
        success: true,
        reply: friendlyNotice + fallback.reply,
        source: 'fallback'
      };
    }
  }

  async transcribeAudio(base64Audio, mimeType = 'audio/wav') {
    if (!base64Audio) return { success: false, text: '' };
    const client = this.getClient();
    if (!client) {
      return { success: false, text: '', error: 'Gemini client not initialized' };
    }

    const candidateModels = ['gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-flash-latest'];
    const prompt = `Transcribe the spoken audio words accurately into text.
Rules:
1. If spoken in Arabic (Saudi, Gulf, Egyptian, Levant, or Standard), transcribe accurately in Arabic.
2. If spoken in English, transcribe accurately in English.
3. Output ONLY the exact transcribed text words. Do NOT include any explanations, quotes, or preambles.`;

    for (const model of candidateModels) {
      try {
        const response = await client.models.generateContent({
          model: model,
          contents: [
            {
              role: 'user',
              parts: [
                {
                  inlineData: {
                    mimeType: mimeType || 'audio/wav',
                    data: base64Audio
                  }
                },
                { text: prompt }
              ]
            }
          ]
        });

        let text = (response.text || '').trim();
        text = text.replace(/^["']|["']$/g, '').trim();
        if (text) {
          return { success: true, text };
        }
      } catch (err) {
        console.warn(`Audio transcribe model ${model} notice:`, err.message);
      }
    }

    return { success: false, text: '' };
  }

  // Heuristic offline intent parser with full Arabic & English support
  async fallbackLocalHandler(userMessage, onStream, onProgress) {
    const config = memoryService.getConfig();
    const userName = config.userName || 'Sir';
    let raw = (userMessage || '').trim();
    // Support slash commands seamlessly (e.g. /close chrome -> close chrome)
    raw = raw.replace(/^\//, '').trim();
    const lower = raw.toLowerCase();

    // 0. CY9 Application Shutdown & Exit (Strict exact match only)
    if (
      lower === 'shutdown cy9' || lower === 'exit cy9' || lower === 'quit cy9' ||
      lower === 'اغلق cy9' || lower === 'اقفل cy9' || lower === 'طفي cy9' ||
      lower === 'اغلق البرنامج' || lower === 'اقفل البرنامج' || lower === 'خروج من التطبيق'
    ) {
      return {
        success: true,
        reply: `Shutting down all CY9 neural, telemetry, and tactical subsystems. Have a pleasant day, ${userName}.`,
        source: 'local',
        action: 'shutdown'
      };
    }

    // 1. PC Power Controls (Shutdown PC, Restart, Sleep, Lock, Abort) - Strict Match
    if (lower === 'shutdown pc' || lower === 'طفي الكمبيوتر' || lower === 'اطفاء الكمبيوتر' || lower === 'إيقاف تشغيل الكمبيوتر') {
      const res = await agentManager.executeTool('power_control', { action: 'shutdown', delay_seconds: 15 }, onProgress);
      return { success: true, reply: res.message || `PC shutdown initiated, ${userName}. Powering down in 15 seconds. Say "Cancel shutdown" to abort.`, source: 'local' };
    }

    if (lower === 'restart pc' || lower === 'reboot pc' || lower === 'اعادة تشغيل الكمبيوتر' || lower === 'أعد تشغيل الجهاز') {
      const res = await agentManager.executeTool('power_control', { action: 'restart', delay_seconds: 15 }, onProgress);
      return { success: true, reply: res.message || `System reboot initiated, ${userName}. Restarting in 15 seconds.`, source: 'local' };
    }

    if (lower === 'cancel shutdown' || lower === 'abort shutdown' || lower === 'الغاء الاطفاء' || lower === 'إلغاء الإيقاف') {
      const res = await agentManager.executeTool('power_control', { action: 'abort' }, onProgress);
      return { success: true, reply: res.message, source: 'local' };
    }

    if (lower === 'sleep pc' || lower === 'وضع السكون للكمبيوتر') {
      const res = await agentManager.executeTool('power_control', { action: 'sleep' }, onProgress);
      return { success: true, reply: res.message || `Workstation entering sleep mode, ${userName}.`, source: 'local' };
    }

    // Explicit Lock Workstation only (never match partial 'lock' or general speech)
    if (lower === 'lock windows' || lower === 'lock workstation' || lower === 'lock pc' || lower === 'قفل الويندوز' || lower === 'قفل الشاشة' || lower === 'اقفل شاشة الكمبيوتر') {
      const res = await agentManager.executeTool('power_control', { action: 'lock' }, onProgress);
      return { success: true, reply: res.message || `Workstation locked successfully, ${userName}.`, source: 'local' };
    }

    // 2. Window Management (Minimize all / Show Desktop)
    if (lower === 'show desktop' || lower === 'minimize all' || lower === 'صغر النوافذ' || lower === 'اخف النوافذ' || lower === 'رتب ملفات سطح المكتب') {
      const res = await agentManager.executeTool('window_management', { action: 'minimize_all' }, onProgress);
      return { success: true, reply: res.message || `All windows minimized, displaying clean desktop, ${userName}.`, source: 'local' };
    }

    const cleanAppExtraction = (str) => {
      let cleaned = (str || '').toLowerCase().trim();
      cleaned = cleaned.replace(/\b(can you|could you|would you|please|thank you|thanks|hey|hello|hi|s9|sci-nine|cy9|jarvis|new window|new windows|new tab|now|just|for me)\b/gi, ' ');
      cleaned = cleaned.replace(/\b(لو سمحت|من فضلك|شكرا|يا بطل|يا سيدي|الله يخليك|نافذة جديدة|تبويب جديد|الان|لي)\b/gi, ' ');
      cleaned = cleaned.replace(/^(app|برنامج|تطبيق|برمجية)\s+/i, ' ');
      cleaned = cleaned.replace(/\s+(app|برنامج|تطبيق)$/i, ' ');
      return cleaned.trim();
    };

    // 3. Close Applications (close / kill / quit / اقفل / سكر / اغلق / انهي)
    const closeKeywords = ['close', 'kill', 'quit', 'terminate', 'اقفل', 'سكر', 'أغلق', 'اغلق', 'انهي', 'أوقف', 'اوقف'];
    for (const kw of closeKeywords) {
      if (lower.startsWith(kw + ' ') || lower.includes(` ${kw} `)) {
        let appName = lower.replace(new RegExp(`.*(?:${kw})\\s+([a-z0-9\\u0600-\\u06FF\\s_-]+).*`, 'i'), '$1').trim();
        appName = cleanAppExtraction(appName);
        if (appName && appName.length > 1 && !appName.includes('shutdown') && !appName.includes('pc') && !appName.includes('windows')) {
          const res = await agentManager.executeTool('close_app', { app_name: appName }, onProgress);
          return {
            success: true,
            reply: res.message || `Terminated **${appName}**, ${userName}.`,
            source: 'local'
          };
        }
      }
    }

    // 4. Open Applications (open / launch / start / run / افتح / شغل)
    const openKeywords = ['open', 'launch', 'start', 'run', 'افتح', 'شغل', 'ابدا', 'ابدأ'];
    for (const kw of openKeywords) {
      if (lower.startsWith(kw + ' ') || lower.includes(` ${kw} `)) {
        let appName = lower.replace(new RegExp(`.*(?:${kw})\\s+([a-z0-9\\u0600-\\u06FF\\s_-]+).*`, 'i'), '$1').trim();
        appName = cleanAppExtraction(appName);
        // Check folder aliases
        if (['downloads', 'documents', 'desktop', 'pictures', 'التنزيلات', 'المستندات', 'التحميلات', 'سطح المكتب', 'الصور'].includes(appName)) {
          let folderPath = appName;
          if (appName === 'التنزيلات' || appName === 'التحميلات') folderPath = 'downloads';
          if (appName === 'المستندات') folderPath = 'documents';
          if (appName === 'سطح المكتب') folderPath = 'desktop';
          if (appName === 'الصور') folderPath = 'pictures';
          const res = await agentManager.executeTool('open_folder', { path: folderPath }, onProgress);
          return { success: true, reply: res.message, source: 'local' };
        }
        if (appName && appName.length > 1 && !appName.includes('weather') && !appName.includes('volume') && !appName.includes('protocol') && !appName.includes('screenshot')) {
          const res = await agentManager.executeTool('launch_app', { app_name: appName }, onProgress);
          return {
            success: true,
            reply: res.success
              ? `Right away, ${userName}. I have initialized **${appName}** for you.`
              : `I attempted to initialize ${appName}, but encountered an error: ${res.message}.`,
            source: 'local'
          };
        }
      }
    }

    // 5. Empty Recycle Bin
    if (lower.includes('empty recycle bin') || lower.includes('clean recycle bin') || lower.includes('سلة المحذوفات') || lower.includes('نظف السلة') || lower.includes('تفريغ السلة')) {
      const res = await agentManager.executeTool('empty_recycle_bin', {}, onProgress);
      return { success: true, reply: res.message, source: 'local' };
    }

    // 6. Media Playback Controls
    if (lower.includes('play music') || lower.includes('pause music') || lower.includes('next song') || lower.includes('next track') || lower.includes('شغل الموسيقى') || lower.includes('وقف الموسيقى') || lower.includes('التالي')) {
      let act = 'play_pause';
      if (lower.includes('next') || lower.includes('التالي')) act = 'next';
      if (lower.includes('prev') || lower.includes('السابق')) act = 'prev';
      if (lower.includes('stop') || lower.includes('ايقاف')) act = 'stop';
      const res = await agentManager.executeTool('media_control', { action: act }, onProgress);
      return { success: true, reply: res.message, source: 'local' };
    }

    // 6.1 Bluetooth & Huawei Headset Connection Intent
    if (lower.includes('بلوتوث') || lower.includes('سماعة') || lower.includes('سماعات') || lower.includes('هواوي') || lower.includes('bluetooth') || lower.includes('headset') || lower.includes('headphones') || lower.includes('freebuds')) {
      const res = await agentManager.executeTool('connect_bluetooth_device', { device_name: 'Huawei' }, onProgress);
      return {
        success: true,
        reply: `🎧 **Bluetooth Audio Uplink**: ${res.message || 'تم ربط سماعة هواوي (HUAWEI FreeBuds) وتوجيه الصوت بنجاح.'}`,
        source: 'local'
      };
    }

    // 7. Real Estate Search (عقار / بيوت / فلل / شقق / أراضي)
    if (lower.includes('عقار') || lower.includes('بيوت') || lower.includes('فيلا') || lower.includes('فلل') || lower.includes('شقة') || lower.includes('شقق') || lower.includes('أرض') || lower.includes('ارض') || lower.includes('عمارة') || lower.includes('real estate') || lower.includes('aqar') || lower.includes('bayut')) {
      // Determine browser
      let targetBrowser = 'default';
      if (lower.includes('chrome') || lower.includes('كروم')) targetBrowser = 'chrome';
      if (lower.includes('edge') || lower.includes('ايدج')) targetBrowser = 'edge';
      if (lower.includes('firefox') || lower.includes('فايرفوكس') || lower.includes('فاير')) targetBrowser = 'firefox';
      if (lower.includes('brave') || lower.includes('بريف')) targetBrowser = 'brave';

      // Determine platform
      let targetPlatform = lower.includes('bayut') || lower.includes('بيوت') ? 'bayut' : 'aqar';

      // Determine city
      let targetCity = 'الرياض';
      const cities = ['الرياض', 'جدة', 'الدمام', 'مكة', 'المدينة', 'الخبر', 'الجبيل', 'تبوك', 'أبها', 'الطائف', 'خميس مشيط', 'بريدة'];
      for (const c of cities) {
        if (raw.includes(c)) {
          targetCity = c;
          break;
        }
      }

      // Determine property type
      let propType = 'فيلا';
      if (lower.includes('شقة') || lower.includes('شقق')) propType = 'شقة';
      if (lower.includes('أرض تجارية') || lower.includes('ارض تجارية') || lower.includes('تجارية')) propType = 'أرض تجارية';
      else if (lower.includes('أرض') || lower.includes('ارض')) propType = 'أرض سكنية';
      if (lower.includes('عمارة') || lower.includes('عمائر')) propType = 'عمارة';
      if (lower.includes('دور')) propType = 'دور';

      let purpose = (lower.includes('إيجار') || lower.includes('ايجار') || lower.includes('rent')) ? 'للإيجار' : 'للبيع';

      const res = await agentManager.executeTool('search_real_estate', {
        city: targetCity,
        type: propType,
        purpose,
        browser: targetBrowser,
        platform: targetPlatform
      }, onProgress);

      return {
        success: true,
        reply: `Right away, ${userName}. I have opened **${targetPlatform.toUpperCase()}** in **${targetBrowser.toUpperCase()}** to search for: **${propType} ${purpose} في ${targetCity}**.\n\n🌐 Direct Link: ${res.url}`,
        source: 'local'
      };
    }

    // 8. YouTube & Videos Search
    if (lower.includes('youtube') || lower.includes('يوتيوب') || lower.includes('فيديو') || lower.includes('مقطع')) {
      let targetBrowser = 'default';
      if (lower.includes('chrome') || lower.includes('كروم')) targetBrowser = 'chrome';
      if (lower.includes('edge') || lower.includes('ايدج')) targetBrowser = 'edge';
      if (lower.includes('firefox') || lower.includes('فايرفوكس') || lower.includes('فاير')) targetBrowser = 'firefox';

      let cleanQuery = raw.replace(/.*(?:youtube|يوتيوب|فيديو|مقطع)\s*(?:عن|في|على)?/i, '')
                          .replace(/(?:في|على)\s*(?:كروم|ايدج|فايرفوكس|chrome|edge|firefox)/i, '')
                          .trim();
      if (!cleanQuery) cleanQuery = 'trending';

      const res = await agentManager.executeTool('search_platform', {
        platform: 'youtube',
        query: cleanQuery,
        browser: targetBrowser
      }, onProgress);

      return {
        success: true,
        reply: `Opening **YouTube** in **${targetBrowser.toUpperCase()}** for: **"${cleanQuery}"**, ${userName}.`,
        source: 'local'
      };
    }

    // 9. Google Maps & Navigation Search
    if (lower.includes('maps') || lower.includes('map') || lower.includes('خرائط') || lower.includes('خريطة') || lower.includes('قوقل ماب')) {
      let targetBrowser = 'default';
      if (lower.includes('chrome') || lower.includes('كروم')) targetBrowser = 'chrome';
      if (lower.includes('edge') || lower.includes('ايدج')) targetBrowser = 'edge';
      if (lower.includes('firefox') || lower.includes('فايرفوكس') || lower.includes('فاير')) targetBrowser = 'firefox';

      let cleanQuery = raw.replace(/.*(?:maps|map|خرائط|خريطة|قوقل ماب)\s*(?:عن|في|على)?/i, '')
                          .replace(/(?:في|على)\s*(?:كروم|ايدج|فايرفوكس|chrome|edge|firefox)/i, '')
                          .trim();
      if (!cleanQuery) cleanQuery = 'الرياض';

      const res = await agentManager.executeTool('search_platform', {
        platform: 'google_maps',
        query: cleanQuery,
        browser: targetBrowser
      }, onProgress);

      return {
        success: true,
        reply: `Opening **Google Maps** in **${targetBrowser.toUpperCase()}** to locate: **"${cleanQuery}"**, ${userName}.`,
        source: 'local'
      };
    }

    // 10. General Search (Google, Haraj, Amazon, etc.)
    if (lower.includes('ابحث') || lower.includes('search') || lower.includes('قوقل') || lower.includes('حراج') || lower.includes('امازون')) {
      let targetBrowser = 'default';
      if (lower.includes('chrome') || lower.includes('كروم')) targetBrowser = 'chrome';
      if (lower.includes('edge') || lower.includes('ايدج')) targetBrowser = 'edge';
      if (lower.includes('firefox') || lower.includes('فايرفوكس') || lower.includes('فاير')) targetBrowser = 'firefox';

      let platform = 'google';
      if (lower.includes('حراج') || lower.includes('haraj')) platform = 'haraj';
      if (lower.includes('امازون') || lower.includes('amazon')) platform = 'amazon';

      let cleanQuery = raw.replace(/.*(?:ابحث|search|قوقل|حراج|امازون)\s*(?:عن|في|على)?/i, '')
                          .replace(/(?:في|على)\s*(?:كروم|ايدج|فايرفوكس|chrome|edge|firefox)/i, '')
                          .trim();

      const res = await agentManager.executeTool('search_platform', {
        platform,
        query: cleanQuery || raw,
        browser: targetBrowser
      }, onProgress);

      return {
        success: true,
        reply: `Executed search on **${platform.toUpperCase()}** in **${targetBrowser.toUpperCase()}** for: **"${cleanQuery || raw}"**, ${userName}.`,
        source: 'local'
      };
    }

    // 11. Email & Professional Messaging (Gmail / Outlook / الإيميل / البريد)
    if (lower.includes('email') || lower.includes('gmail') || lower.includes('outlook') || lower.includes('ايميل') || lower.includes('إيميل') || lower.includes('رسالة بريد') || lower.includes('جيميل') || lower.includes('اوتلوك')) {
      let service = 'gmail';
      if (lower.includes('outlook') || lower.includes('اوتلوك')) service = 'outlook';

      let targetBrowser = 'default';
      if (lower.includes('chrome') || lower.includes('كروم')) targetBrowser = 'chrome';
      if (lower.includes('edge') || lower.includes('ايدج')) targetBrowser = 'edge';
      if (lower.includes('firefox') || lower.includes('فايرفوكس') || lower.includes('فاير')) targetBrowser = 'firefox';

      let subject = 'رسالة رسمية ومتابعة عمل';
      let body = `السلام عليكم ورحمة الله وبركاته،\n\nتحية طيبة وبعد،\n\nأود إحاطتكم علماً بمتابعة الموضوع والاطلاع على التفاصيل المرفقة.\nشاكراً لكم حسن تعاونكم الدائم.\n\nوتفضلوا بقبول فائق الاحترام والتقدير،\n${userName}`;

      if (lower.includes('اعتذار') || lower.includes('apology')) {
        subject = 'خطاب اعتذار وتوضيح رسمي';
        body = `السادة الأفاضل،\n\nنود تقديم خالص اعتذارنا عن أي تأخير أو إشكال طرأ، ونؤكد حرصنا الكامل على تلبية أعلى معايير الجودة وخدمتكم على النحو الأمثل.\n\nشاكرين ومقدرين حسن تفهمكم.\n\nمع فائق الاحترام،\n${userName}`;
      } else if (lower.includes('طلب') || lower.includes('عرض') || lower.includes('proposal') || lower.includes('quote')) {
        subject = 'طلب عرض سعر ومقترح عمل رسمي';
        body = `تحية طيبة،\n\nبالإشارة إلى اهتمامنا بتعزيز التعاون المشترك، يسعدنا طلب عرض تفصيلي ومقترح عمل لمشروعنا الحالي.\nنأمل التكرم بموافاتنا بالتفاصيل والجدول الزمني المتاح.\n\nوتفضلوا بقبول وافر الشكر والتقدير،\n${userName}`;
      }

      const res = await agentManager.executeTool('compose_email', {
        to: '',
        subject,
        body,
        service,
        browser: targetBrowser
      }, onProgress);

      return {
        success: true,
        reply: `I have drafted a formal executive email and opened **${service.toUpperCase()}** in **${targetBrowser.toUpperCase()}** for you, ${userName}.\n\n### 📧 Draft Preview:\n**Subject:** ${subject}\n\n${body.replace(/\n/g, '<br>')}`,
        source: 'local'
      };
    }

    // 12. Weather
    if (lower.includes('weather') || lower.includes('temperature') || lower.includes('الطقس') || lower.includes('درجة الحرارة')) {
      const match = lower.match(/in ([a-zA-Z\s]+)/) || lower.match(/في ([a-zA-Z\u0600-\u06FF\s]+)/) || lower.match(/for ([a-zA-Z\s]+)/);
      const loc = match ? match[1].trim() : 'Riyadh';
      const wx = await agentManager.executeTool('get_weather_intelligence', { location: loc }, onProgress);
      if (wx.success) {
        return {
          success: true,
          reply: `Atmospheric telemetry for **${wx.location}**: The temperature is currently **${wx.temperature}** (feels like ${wx.feelsLike}) with **${wx.condition}**. Humidity is at ${wx.humidity} and wind velocity at ${wx.windSpeed}, ${userName}.`,
          source: 'local'
        };
      }
    }

    // 13. Universal IR Remote & Smart Device Controls (الريموت / التلفزيون / الإضاءة / المكيف / الساوند بار)
    if (lower.includes('ريموت') || lower.includes('remote') || lower.includes('ir') || lower.includes('تلفزيون') || lower.includes('تلفاز') || lower.includes('tv') || lower.includes('اضاءة') || lower.includes('إضاءة') || lower.includes('مكيف') || lower.includes('ساوند') || lower.includes('soundbar') || lower.includes('جوال') || lower.includes('هاتف')) {
      let device = 'tv';
      let name = 'Smart TV';
      let cmd = 'power';
      let val = '';

      if (lower.includes('اضاءة') || lower.includes('إضاءة') || lower.includes('نور') || lower.includes('light') || lower.includes('ليد') || lower.includes('led')) {
        device = 'light';
        name = 'Ambient RGB Strip';
        cmd = 'power_on';
        if (lower.includes('ازرق') || lower.includes('أزرق') || lower.includes('blue')) cmd = 'blue';
        else if (lower.includes('سماوي') || lower.includes('cyan')) cmd = 'cyan';
        else if (lower.includes('احمر') || lower.includes('أحمر') || lower.includes('red')) cmd = 'red';
        else if (lower.includes('اخضر') || lower.includes('أخضر') || lower.includes('green')) cmd = 'green';
        else if (lower.includes('ابيض') || lower.includes('أبيض') || lower.includes('white')) cmd = 'white';
        else if (lower.includes('بنفسجي') || lower.includes('purple')) cmd = 'purple';
        else if (lower.includes('اصفر') || lower.includes('أصفر') || lower.includes('yellow')) cmd = 'yellow';
      } else if (lower.includes('مكيف') || lower.includes('ac') || lower.includes('سبليت')) {
        device = 'ac';
        name = 'Living Room AC';
        const tempMatch = raw.match(/\b(1[6-9]|2[0-9]|30)\b/);
        if (tempMatch) {
          cmd = 'temp';
          val = tempMatch[1];
        } else if (lower.includes('بارد') || lower.includes('cool')) {
          cmd = 'mode_cool';
        } else if (lower.includes('حار') || lower.includes('heat')) {
          cmd = 'mode_heat';
        } else if (lower.includes('رفع') || lower.includes('up') || lower.includes('زد')) {
          cmd = 'temp';
          val = 24;
        } else if (lower.includes('خفض') || lower.includes('down') || lower.includes('برد') || lower.includes('نقص')) {
          cmd = 'temp';
          val = 20;
        }
      } else if (lower.includes('ساوند') || lower.includes('soundbar') || lower.includes('سماعة') || lower.includes('مسرح')) {
        device = 'audio';
        name = 'Home Audio Soundbar';
        if (lower.includes('رفع') || lower.includes('up')) cmd = 'vol_up';
        else if (lower.includes('خفض') || lower.includes('down')) cmd = 'vol_down';
        else if (lower.includes('كتم') || lower.includes('mute')) cmd = 'mute';
        else if (lower.includes('بلوتوث') || lower.includes('bluetooth')) cmd = 'bluetooth';
      } else if (lower.includes('جوال') || lower.includes('هاتف') || lower.includes('phone') || lower.includes('تنبيه')) {
        const notif = await agentManager.executeTool('send_phone_notification', {
          title: 'CY9 Uplink Alert',
          message: raw
        }, onProgress);
        return {
          success: true,
          reply: `Tactical alert dispatched to your smartphone uplink, ${userName}.`,
          source: 'local'
        };
      } else {
        // TV controls
        if (lower.includes('رفع') || lower.includes('up')) cmd = 'vol_up';
        else if (lower.includes('خفض') || lower.includes('down')) cmd = 'vol_down';
        else if (lower.includes('كتم') || lower.includes('mute')) cmd = 'mute';
        else if (lower.includes('hdmi 1') || lower.includes('hdmi1')) cmd = 'hdmi1';
        else if (lower.includes('hdmi 2') || lower.includes('hdmi2')) cmd = 'hdmi2';
        else if (lower.includes('يوتيوب') || lower.includes('youtube')) cmd = 'youtube';
        else if (lower.includes('نتفلكس') || lower.includes('netflix')) cmd = 'netflix';
      }

      if (lower.includes('شغل') || lower.includes('turn on') || lower.includes('افتح')) {
        if (cmd === 'power') cmd = 'power_on';
      }
      if (lower.includes('طفي') || lower.includes('اقفل') || lower.includes('turn off') || lower.includes('سكر') || lower.includes('اغلق') || lower.includes('اطفئ')) {
        cmd = device === 'light' ? 'power_off' : 'power';
      }

      const res = await agentManager.executeTool('control_smart_device', {
        device_type: device,
        name,
        command: cmd,
        value: val
      }, onProgress);

      return {
        success: true,
        reply: res.message || `📡 IR Remote Signal sent to **${name}** (${device}): executed **${cmd}**, ${userName}.`,
        source: 'local'
      };
    }

    // 8. Hardware Telemetry
    if (lower.includes('system') || lower.includes('telemetry') || lower.includes('status') || lower.includes('hardware') || lower.includes('cpu') || lower.includes('ram') || lower.includes('المواصفات') || lower.includes('المعالج') || lower.includes('الرام') || lower.includes('الجهاز')) {
      const tel = await systemService.getTelemetry();
      return {
        success: true,
        reply: `All systems nominal, ${userName}.\n\n- **CPU Load**: ${tel.cpu.load}% (${tel.cpu.model})\n- **RAM Usage**: ${tel.memory.usedGB} GB / ${tel.memory.totalGB} GB (${tel.memory.percent}%)\n- **System Uptime**: ${tel.uptime}\n- **Workstation**: ${tel.hostname} (${tel.platform})\n- **Battery**: ${tel.battery.percent}% ${tel.battery.isCharging ? '(Charging)' : ''}\n\nAgent swarm operates with optimal bandwidth.`,
        source: 'local'
      };
    }

    // 9. Volume Control
    if (lower.includes('volume') || lower.includes('mute') || lower.includes('sound') || lower.includes('الصوت') || lower.includes('اكتم الصوت')) {
      if (lower.includes('mute') || lower.includes('اكتم')) {
        await systemService.muteVolume();
        return { success: true, reply: `Audio output muted, ${userName}.`, source: 'local' };
      }
      const numMatch = lower.match(/\d+/);
      const level = numMatch ? parseInt(numMatch[0], 10) : 50;
      await systemService.setVolume(level);
      return { success: true, reply: `System audio level calibrated to ${level}%, ${userName}.`, source: 'local' };
    }

    // 10. Protocols
    if (lower.includes('protocol') || lower.includes('mode') || lower.includes('بروتوكول') || lower.includes('وضع')) {
      let protName = 'focus';
      if (lower.includes('dev') || lower.includes('code') || lower.includes('برمجة')) protName = 'dev';
      if (lower.includes('clean') || lower.includes('slate') || lower.includes('تنظيف')) protName = 'clean';
      if (lower.includes('night') || lower.includes('dark') || lower.includes('ليلي')) protName = 'night';
      const res = await agentManager.executeTool('trigger_protocol', { protocol_name: protName }, onProgress);
      return { success: true, reply: res.message || `Protocol initiated, ${userName}.`, source: 'local' };
    }

    // 14. File Organizing & Zero Clutter
    if (lower.includes('رتب') || lower.includes('تنظيم') || lower.includes('نظف سطح المكتب') || lower.includes('organize') || lower.includes('clean clutter')) {
      let target = 'desktop';
      if (lower.includes('تنزيل') || lower.includes('تحميل') || lower.includes('download')) target = 'downloads';
      const res = await agentManager.executeTool('organize_files', { path: target }, onProgress);
      return { success: true, reply: res.message || `Files in ${target} organized successfully, ${userName}.`, source: 'local' };
    }

    // 15. PC Health & Mechanic
    if (lower.includes('افحص') || lower.includes('صحة جهازي') || lower.includes('صيانة') || lower.includes('تنظيف الكاش') || lower.includes('pc health') || lower.includes('mechanic')) {
      const res = await agentManager.executeTool('run_pc_maintenance', {}, onProgress);
      return {
        success: true,
        reply: `### 🛡️ PC Diagnostic & Optimization Report\n- **Health Score**: ${res.diagnostic.healthScore}%\n- **CPU Load**: ${res.diagnostic.cpu.loadPercent}%\n- **RAM**: ${res.diagnostic.memory.usedGB} GB / ${res.diagnostic.memory.totalGB} GB (${res.diagnostic.memory.percent}%)\n- **Uptime**: ${res.diagnostic.uptime}\n\n🧹 *${res.cleanup}*`,
        source: 'local'
      };
    }

    // 16. Deep Research Dossier
    if (lower.includes('بحث استقصائي') || lower.includes('دراسة سوق') || lower.includes('تقرير شامل') || lower.includes('deep research') || lower.includes('research dossier')) {
      let topic = raw.replace(/.*(?:بحث استقصائي|دراسة سوق|تقرير شامل|deep research|research)\s*(?:عن|حول)?/i, '').trim();
      if (!topic) topic = 'سوق الذكاء الاصطناعي 2026';
      const res = await agentManager.executeTool('conduct_deep_research', { topic }, onProgress);
      return {
        success: true,
        reply: `### 🛡️ Deep Intelligence Dossier Synthesized\n\n${res.message}\n\n📂 **File Location:** \`${res.filePath}\`\n\n> *${res.preview}*`,
        source: 'local'
      };
    }

    // 17. Git Commit & Push
    if (lower.includes('git') || lower.includes('جيت هب') || lower.includes('ارفع التعديلات') || lower.includes('commit') || lower.includes('push')) {
      let msg = raw.replace(/.*(?:commit|رسالة|كوميت)\s*/i, '').trim();
      if (!msg || msg === raw) msg = 'feat: autonomous update via CY9';
      const res = await agentManager.executeTool('git_commit_and_push', { message: msg }, onProgress);
      return { success: true, reply: res.message, source: 'local' };
    }

    // 18. Morning Tactical Briefing
    if (lower.includes('صباحي') || lower.includes('التقرير الصباحي') || lower.includes('تقرير صباحي') || lower.includes('صباح الخير') || lower.includes('morning brief')) {
      const res = await agentManager.executeTool('get_morning_briefing', {}, onProgress);
      const greeting = `صباح الخير والإنتاجية يا ${userName}! جميع أنظمة CY9 تعمل بكامل كفاءتها.`;
      const sysStatus = res.summary || `Uptime: ${res.uptime || 'Active'} | CPU: ${res.cpuLoad || 'Normal'} | RAM: ${res.memPercent || 'Normal'}`;
      return {
        success: true,
        reply: `### 🌅 Morning Tactical Briefing\n\n- **التحية:** ${greeting}\n- **حالة العتاد:** ${sysStatus}\n- **التاريخ:** ${res.timestamp || new Date().toLocaleDateString()}\n- **العمليات النشطة:** ${res.topProcesses || 'Nominal'}`,
        source: 'local'
      };
    }

    // 19. Emergency Red Alert Protocol
    if (lower.includes('red alert') || lower.includes('بروتوكول الطوارئ') || lower.includes('طوارئ') || lower.includes('قفل طارئ')) {
      const res = await agentManager.executeTool('trigger_red_alert', {}, onProgress);
      return { success: true, reply: res.message, source: 'local' };
    }

    // 20. Total Recall Screen Memory
    if (lower.includes('استرجع') || lower.includes('وين شفت') || lower.includes('سجل الشاشة') || lower.includes('recall screen') || lower.includes('شفت قبل')) {
      let q = raw.replace(/.*(?:استرجع|وين شفت|سجل الشاشة|recall)\s*(?:عن)?/i, '').trim();
      const res = await agentManager.executeTool('search_screen_memory', { query: q || 'ai' }, onProgress);
      const itemsText = res.matches.map(m => `- **[${m.title}]** (${new Date(m.timestamp).toLocaleDateString()}): ${m.summary}`).join('\n');
      return {
        success: true,
        reply: `### 🧠 Total Recall Results for "${q}":\n\n${itemsText || 'No recorded history found for this query, sir.'}`,
        source: 'local'
      };
    }

    // 21. Health & Ergonomics Guardian
    if (lower.includes('صحة') || lower.includes('ماء') || lower.includes('ظهر') || lower.includes('جلوس') || lower.includes('عين') || lower.includes('health guard') || lower.includes('posture')) {
      let type = 'posture';
      if (lower.includes('ماء') || lower.includes('شرب') || lower.includes('water')) type = 'hydration';
      if (lower.includes('عين') || lower.includes('eye')) type = 'eye_rest';
      const res = await agentManager.executeTool('trigger_health_guard', { type }, onProgress);
      return { success: true, reply: res.message, source: 'local' };
    }

    // 22. Scaffold Project
    if (lower.includes('انشئ مشروع') || lower.includes('مشروع جديد') || lower.includes('create project')) {
      let pType = 'python';
      if (lower.includes('node') || lower.includes('جافاسكريبت')) pType = 'node';
      if (lower.includes('web') || lower.includes('موقع')) pType = 'web';
      let pName = raw.replace(/.*(?:مشروع|project)\s*/i, '').trim() || 'cy9_auto_app';
      const res = await agentManager.executeTool('create_project', { type: pType, name: pName }, onProgress);
      return { success: true, reply: res.message, source: 'local' };
    }

    // 23. AI Master Programming Prompt Synthesis
    if (lower.includes('برومبت') || lower.includes('prompt') || lower.includes('هندسة اوامر') || lower.includes('برمجة تطبيق') || lower.includes('اصنع برومبت') || lower.includes('اكتب برومبت')) {
      const res = await agentManager.executeTool('create_programming_prompt', {
        project_description: raw,
        tech_stack: 'Next.js 14, TypeScript, TailwindCSS, Node.js, PostgreSQL',
        target_ai: 'Cursor / Claude 3.5 Sonnet / Antigravity',
        language: 'ar'
      }, onProgress);
      return {
        success: true,
        reply: res.message || `🎯 تم توليد برومبت هندسي شامل لمشروعك وطباعته على الشاشة الكبيرة مع إمكانية النسخ بضغطة واحدة!`,
        source: 'local'
      };
    }

    // 23. Screenshot
    if (lower.includes('screenshot') || lower.includes('screen') || lower.includes('capture') || lower.includes('الشاشة') || lower.includes('صور الشاشة')) {
      const screen = await systemService.captureScreenshot();
      return {
        success: true,
        reply: screen.success
          ? `Primary display frame captured successfully, ${userName}. (To perform deep visual reasoning, configure your Gemini API Key in Settings).`
          : `Failed to capture screen: ${screen.message}`,
        source: 'local'
      };
    }

    agentManager.setAgentIdle('executive', 'Standing by');
    const isApiKeyMissing = !config.apiKey;
    return {
      success: true,
      reply: `At your service, ${userName}. I have full control over your Windows workstation (launching/closing applications, power shutdown/restart/sleep, volume, media keys, file explorer, recycle bin, hardware diagnostics, and protocols).\n\n${isApiKeyMissing ? '> 💡 **Tip**: Add your **Google Gemini API Key** in **Settings (⚙️)** to activate the full multi-agent generative reasoning engine and multimodal vision!' : ''}`,
      source: 'local'
    };
  }
}

module.exports = new GeminiService();
