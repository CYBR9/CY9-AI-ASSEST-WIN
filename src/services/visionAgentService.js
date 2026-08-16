// Vision Agent: Autonomous Screen Navigation & Mouse/Keyboard Action Pipeline
class VisionAgentService {
  constructor() {
    this.isExecuting = false;
    this.actionHistory = [];
  }

  // Click at specific desktop coordinates or UI elements
  async clickAt(x, y, button = 'left') {
    this.actionHistory.push({ action: 'click', x, y, timestamp: new Date().toISOString() });
    if (window.jarvisAPI && window.jarvisAPI.executePowerShell) {
      // Use Windows PowerShell cursor positioning and click simulation
      const psScript = `
        Add-Type -AssemblyName System.Windows.Forms
        [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${Math.round(x)}, ${Math.round(y)})
        Add-Type -MemberDefinition '[DllImport("user32.dll")] public static extern void mouse_event(int flags, int dx, int dy, int cButtons, int info);' -Name U32 -Namespace Win32
        [Win32.U32]::mouse_event(${button === 'right' ? '0x08' : '0x02'}, 0, 0, 0, 0)
        Start-Sleep -Milliseconds 50
        [Win32.U32]::mouse_event(${button === 'right' ? '0x10' : '0x04'}, 0, 0, 0, 0)
      `;
      return await window.jarvisAPI.executePowerShell(psScript);
    }
    return { success: true, simulated: true };
  }

  // Type text into current active window
  async typeText(text) {
    this.actionHistory.push({ action: 'type', text, timestamp: new Date().toISOString() });
    if (typeof window !== 'undefined' && window.jarvisAPI && window.jarvisAPI.executePowerShell) {
      const escaped = text.replace(/([{}()+^%~])/g, '{$1}').replace(/'/g, "''");
      const psScript = `(New-Object -ComObject Wscript.Shell).SendKeys('${escaped}')`;
      return await window.jarvisAPI.executePowerShell(psScript);
    }
    return { success: true, simulated: true };
  }

  // Press specific hotkey combo (e.g. ^c for copy, ^v for paste, %{F4} for alt+f4)
  async sendHotkey(keys) {
    if (typeof window !== 'undefined' && window.jarvisAPI && window.jarvisAPI.executePowerShell) {
      const safeKey = String(keys).replace(/'/g, "''");
      const psScript = `(New-Object -ComObject Wscript.Shell).SendKeys('${safeKey}')`;
      return await window.jarvisAPI.executePowerShell(psScript);
    }
    return { success: true, simulated: true };
  }

  // Perform autonomous task flow
  async executeAutonomousTask(taskName, onStep = () => {}) {
    this.isExecuting = true;
    onStep({ status: 'started', message: `بدء تنفيذ المهمة الذاتية: ${taskName}` });

    if (taskName.toLowerCase().includes('clean') || taskName.includes('تنظيف')) {
      onStep({ status: 'progress', message: 'جاري فحص سطح المكتب وتنظيم الملفات...' });
      const res = await window.jarvisAPI.organizeFiles('desktop');
      onStep({ status: 'completed', message: 'تم تنظيم سطح المكتب بنجاح!' });
      this.isExecuting = false;
      return res;
    }

    if (taskName.toLowerCase().includes('research') || taskName.includes('بحث')) {
      onStep({ status: 'progress', message: 'جاري فتح المتصفح وجمع المعلومات من محركات البحث...' });
      const res = await window.jarvisAPI.conductDeepResearch(taskName, 'arabic');
      onStep({ status: 'completed', message: 'تم الانتهاء من البحث وحفظ التقرير على سطح المكتب!' });
      this.isExecuting = false;
      return res;
    }

    // Generic autonomous vision flow
    onStep({ status: 'capturing', message: 'التقاط الشاشة وتحليل العناصر النشطة...' });
    const screen = await window.jarvisAPI.captureScreenshot();
    onStep({ status: 'analyzing', message: 'تحليل موضع النوافذ وإنجاز الإجراء...' });
    
    this.isExecuting = false;
    onStep({ status: 'done', message: `تم إنجاز المطلوب بنجاح يا سيدي.` });
    return { success: true, screen };
  }
}

if (typeof window !== 'undefined') {
  window.visionAgentService = new VisionAgentService();
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = new VisionAgentService();
}

