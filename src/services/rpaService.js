/**
 * CY9 Robotic Process Automation (RPA) & Computer Use Service
 * Controls mouse coordinates, clicks, keystrokes, and window interactions natively on Windows.
 */
const { exec } = require('child_process');

class RpaService {
  /**
   * Move mouse to absolute screen coordinates
   */
  async moveMouse(x, y) {
    return new Promise((resolve) => {
      const psScript = `Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${parseInt(x, 10)}, ${parseInt(y, 10)});`;
      exec(`powershell -NoProfile -Command "${psScript}"`, (err) => {
        resolve({
          success: !err,
          message: !err ? `Cursor repositioned to (${x}, ${y}), sir.` : `Failed to move cursor: ${err.message}`
        });
      });
    });
  }

  /**
   * Simulate mouse click (left, right, double)
   */
  async clickMouse(button = 'left', count = 1) {
    return new Promise((resolve) => {
      const psScript = `Add-Type -MemberDefinition '[DllImport("user32.dll")] public static extern void mouse_event(int flags, int dx, int dy, int cButtons, int extraInfo);' -Name U32 -Namespace Win32; $leftDown = 0x02; $leftUp = 0x04; $rightDown = 0x08; $rightUp = 0x10; if ('${button}' -eq 'right') { [Win32.U32]::mouse_event($rightDown, 0, 0, 0, 0); [Win32.U32]::mouse_event($rightUp, 0, 0, 0, 0); } else { for ($i = 0; $i -lt ${count}; $i++) { [Win32.U32]::mouse_event($leftDown, 0, 0, 0, 0); [Win32.U32]::mouse_event($leftUp, 0, 0, 0, 0); Start-Sleep -Milliseconds 100; } };`;
      exec(`powershell -NoProfile -Command "${psScript}"`, (err) => {
        resolve({
          success: !err,
          message: !err ? `Simulated ${button} click (${count}x), sir.` : `Click simulation failed: ${err.message}`
        });
      });
    });
  }

  /**
   * Type arbitrary text into the currently focused window
   */
  async typeText(text) {
    return new Promise((resolve) => {
      // Escape special SendKeys characters: { } + ^ % ~ ( ) [ ]
      const escaped = text
        .replace(/\{/g, '{{}')
        .replace(/\}/g, '{}}')
        .replace(/\+/g, '{+}')
        .replace(/\^/g, '{^}')
        .replace(/%/g, '{%}')
        .replace(/~/g, '{~}')
        .replace(/\(/g, '{(}')
        .replace(/\)/g, '{)}')
        .replace(/"/g, '`"');

      const safeText = escaped.replace(/'/g, "''");
      const psScript = `(New-Object -ComObject Wscript.Shell).SendKeys('${safeText}')`;
      exec(`powershell -NoProfile -Command "${psScript}"`, (err) => {
        resolve({
          success: !err,
          message: !err ? `Simulated keystrokes: "${text.substring(0, 30)}...", sir.` : `Typing failed: ${err.message}`
        });
      });
    });
  }

  /**
   * Send hotkey combinations (e.g. "Ctrl+C", "Win+D", "Alt+Tab", "Ctrl+V", "Enter", "Escape")
   */
  async sendHotkey(hotkey) {
    return new Promise((resolve) => {
      const h = (hotkey || '').toLowerCase().trim();
      let sendKeyPattern = '';

      if (h === 'enter') sendKeyPattern = '{ENTER}';
      else if (h === 'esc' || h === 'escape') sendKeyPattern = '{ESC}';
      else if (h === 'tab') sendKeyPattern = '{TAB}';
      else if (h === 'backspace') sendKeyPattern = '{BACKSPACE}';
      else if (h.includes('ctrl+c') || h.includes('copy')) sendKeyPattern = '^c';
      else if (h.includes('ctrl+v') || h.includes('paste')) sendKeyPattern = '^v';
      else if (h.includes('ctrl+a') || h.includes('select all')) sendKeyPattern = '^a';
      else if (h.includes('ctrl+s') || h.includes('save')) sendKeyPattern = '^s';
      else if (h.includes('ctrl+z') || h.includes('undo')) sendKeyPattern = '^z';
      else if (h.includes('alt+tab')) sendKeyPattern = '%{TAB}';
      else if (h.includes('alt+f4')) sendKeyPattern = '%{F4}';
      else sendKeyPattern = hotkey;

      const safeKey = sendKeyPattern.replace(/'/g, "''");
      const psScript = `(New-Object -ComObject Wscript.Shell).SendKeys('${safeKey}')`;
      exec(`powershell -NoProfile -Command "${psScript}"`, (err) => {
        resolve({
          success: !err,
          message: !err ? `Dispatched hotkey [${hotkey.toUpperCase()}], sir.` : `Hotkey failed: ${err.message}`
        });
      });
    });
  }
}

module.exports = new RpaService();
