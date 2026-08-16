const { spawn } = require('child_process');
const readline = require('readline');

class MouseControlService {
  constructor() {
    this.screenWidth = 1920;
    this.screenHeight = 1080;
    this.ready = false;
    this.callbacks = [];
    this.initWorker();
  }

  initWorker() {
    const psScript = `
      Add-Type -AssemblyName System.Windows.Forms
      Add-Type -AssemblyName System.Drawing
      $sig = @"
using System;
using System.Runtime.InteropServices;
public class NativeInput {
    [DllImport("user32.dll")]
    public static extern void mouse_event(int dwFlags, int dx, int dy, int dwData, int dwExtraInfo);
    
    [DllImport("user32.dll")]
    public static extern bool SetCursorPos(int X, int Y);
    
    [DllImport("user32.dll")]
    public static extern bool GetCursorPos(out POINT lpPoint);

    [StructLayout(LayoutKind.Sequential)]
    public struct POINT { public int X; public int Y; }
}
"@
      Add-Type -TypeDefinition $sig
      
      Write-Output "READY"
      
      while ($line = [Console]::In.ReadLine()) {
        if (-not $line) { continue }
        try {
          $cmd = $line | ConvertFrom-Json
          if ($cmd.action -eq "metrics") {
            $s = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
            $p = New-Object NativeInput+POINT
            [NativeInput]::GetCursorPos([ref]$p)
            Write-Output "RESULT:$($s.Width)|$($s.Height)|$($p.X)|$($p.Y)"
          }
          elseif ($cmd.action -eq "move") {
            [NativeInput]::SetCursorPos($cmd.x, $cmd.y)
            Write-Output "RESULT:MOVED"
          }
          elseif ($cmd.action -eq "click") {
            if ($cmd.x -ne $null -and $cmd.y -ne $null) {
              [NativeInput]::SetCursorPos($cmd.x, $cmd.y)
              Start-Sleep -Milliseconds 20
            }
            if ($cmd.button -eq "right") {
              [NativeInput]::mouse_event(0x08, 0, 0, 0, 0)
              [NativeInput]::mouse_event(0x10, 0, 0, 0, 0)
            }
            elseif ($cmd.button -eq "middle") {
              [NativeInput]::mouse_event(0x20, 0, 0, 0, 0)
              [NativeInput]::mouse_event(0x40, 0, 0, 0, 0)
            }
            else {
              [NativeInput]::mouse_event(0x02, 0, 0, 0, 0)
              [NativeInput]::mouse_event(0x04, 0, 0, 0, 0)
            }
            Write-Output "RESULT:CLICKED"
          }
          elseif ($cmd.action -eq "doubleClick") {
            if ($cmd.x -ne $null -and $cmd.y -ne $null) {
              [NativeInput]::SetCursorPos($cmd.x, $cmd.y)
              Start-Sleep -Milliseconds 20
            }
            [NativeInput]::mouse_event(0x02, 0, 0, 0, 0)
            [NativeInput]::mouse_event(0x04, 0, 0, 0, 0)
            Start-Sleep -Milliseconds 70
            [NativeInput]::mouse_event(0x02, 0, 0, 0, 0)
            [NativeInput]::mouse_event(0x04, 0, 0, 0, 0)
            Write-Output "RESULT:DOUBLE_CLICKED"
          }
          elseif ($cmd.action -eq "drag") {
            [NativeInput]::SetCursorPos($cmd.startX, $cmd.startY)
            Start-Sleep -Milliseconds 30
            [NativeInput]::mouse_event(0x02, 0, 0, 0, 0)
            Start-Sleep -Milliseconds 50
            [NativeInput]::SetCursorPos($cmd.endX, $cmd.endY)
            Start-Sleep -Milliseconds 50
            [NativeInput]::mouse_event(0x04, 0, 0, 0, 0)
            Write-Output "RESULT:DRAGGED"
          }
          elseif ($cmd.action -eq "scroll") {
            [NativeInput]::mouse_event(0x0800, 0, 0, $cmd.delta, 0)
            Write-Output "RESULT:SCROLLED"
          }
          elseif ($cmd.action -eq "type") {
            [System.Windows.Forms.SendKeys]::SendWait($cmd.text)
            Write-Output "RESULT:TYPED"
          }
          elseif ($cmd.action -eq "key") {
            [System.Windows.Forms.SendKeys]::SendWait($cmd.key)
            Write-Output "RESULT:KEY_PRESSED"
          }
        } catch {
          Write-Output "ERROR:$($_.Exception.Message)"
        }
      }
    `;

    const encoded = Buffer.from(psScript, 'utf16le').toString('base64');
    this.ps = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-EncodedCommand', encoded], {
      windowsHide: true
    });

    const rl = readline.createInterface({ input: this.ps.stdout });
    rl.on('line', (line) => {
      const trimmed = line.trim();
      if (trimmed === 'READY') {
        this.ready = true;
        this.getMetrics();
        if (this.onReadyCallback) {
          this.onReadyCallback();
          this.onReadyCallback = null;
        }
      } else if (trimmed.startsWith('RESULT:') || trimmed.startsWith('ERROR:')) {
        const cb = this.callbacks.shift();
        if (cb) cb(trimmed);
      }
    });

    this.ps.on('exit', () => {
      this.ready = false;
    });
  }

  sendWorkerCommand(cmdObj) {
    return new Promise((resolve) => {
      const exec = () => {
        this.callbacks.push(resolve);
        try {
          this.ps.stdin.write(JSON.stringify(cmdObj) + '\n');
        } catch (e) {
          resolve(`ERROR:${e.message}`);
        }
      };

      if (this.ready) {
        exec();
      } else {
        const prev = this.onReadyCallback;
        this.onReadyCallback = () => {
          if (prev) prev();
          exec();
        };
      }
    });
  }

  // Get screen metrics & current cursor position
  async getMetrics() {
    const res = await this.sendWorkerCommand({ action: 'metrics' });
    if (res && res.startsWith('RESULT:')) {
      const parts = res.replace('RESULT:', '').split('|').map(Number);
      if (parts.length >= 4) {
        this.screenWidth = parts[0];
        this.screenHeight = parts[1];
        return {
          width: parts[0],
          height: parts[1],
          cursorX: parts[2],
          cursorY: parts[3]
        };
      }
    }
    return { width: this.screenWidth, height: this.screenHeight, cursorX: 0, cursorY: 0 };
  }

  // Normalize coordinates: pixels or percentage
  normalizeCoords(x, y, metrics) {
    let targetX = x;
    let targetY = y;
    if (typeof x === 'number' && x > 0 && x <= 1.0) targetX = Math.round(x * metrics.width);
    else if (typeof x === 'number' && x > 1.0 && x <= 100.0 && Number.isInteger(x) === false) targetX = Math.round((x / 100) * metrics.width);

    if (typeof y === 'number' && y > 0 && y <= 1.0) targetY = Math.round(y * metrics.height);
    else if (typeof y === 'number' && y > 1.0 && y <= 100.0 && Number.isInteger(y) === false) targetY = Math.round((y / 100) * metrics.height);

    targetX = Math.max(0, Math.min(metrics.width - 1, Math.round(targetX)));
    targetY = Math.max(0, Math.min(metrics.height - 1, Math.round(targetY)));
    return { targetX, targetY };
  }

  // Move Mouse Cursor to (x, y)
  async moveMouse(x, y) {
    const metrics = await this.getMetrics();
    const { targetX, targetY } = this.normalizeCoords(x, y, metrics);
    const res = await this.sendWorkerCommand({ action: 'move', x: targetX, y: targetY });

    return {
      success: res.includes('RESULT:MOVED'),
      x: targetX,
      y: targetY,
      message: `Mouse cursor moved to (${targetX}, ${targetY}) [Screen: ${metrics.width}x${metrics.height}].`
    };
  }

  // Click Mouse: left, right, middle
  async click(button = 'left', x = null, y = null) {
    const metrics = await this.getMetrics();
    let targetX = null;
    let targetY = null;

    if (x !== null && y !== null) {
      const coords = this.normalizeCoords(x, y, metrics);
      targetX = coords.targetX;
      targetY = coords.targetY;
    }

    const btn = (button || 'left').toLowerCase();
    const res = await this.sendWorkerCommand({ action: 'click', button: btn, x: targetX, y: targetY });
    const btnLabel = btn === 'right' ? 'Right-Click (Context Menu)' : btn === 'middle' ? 'Middle-Click' : 'Left-Click';

    return {
      success: res.includes('RESULT:CLICKED'),
      button: btn,
      x: targetX ?? metrics.cursorX,
      y: targetY ?? metrics.cursorY,
      message: `Executed ${btnLabel} ${targetX !== null ? `at (${targetX}, ${targetY})` : 'at current cursor position'}.`
    };
  }

  // Double Click Mouse
  async doubleClick(x = null, y = null) {
    const metrics = await this.getMetrics();
    let targetX = null;
    let targetY = null;

    if (x !== null && y !== null) {
      const coords = this.normalizeCoords(x, y, metrics);
      targetX = coords.targetX;
      targetY = coords.targetY;
    }

    const res = await this.sendWorkerCommand({ action: 'doubleClick', x: targetX, y: targetY });
    return {
      success: res.includes('RESULT:DOUBLE_CLICKED'),
      x: targetX ?? metrics.cursorX,
      y: targetY ?? metrics.cursorY,
      message: `Executed Double-Click ${targetX !== null ? `at (${targetX}, ${targetY})` : ''} to launch/select item.`
    };
  }

  // Mouse Drag & Drop
  async drag(startX, startY, endX, endY) {
    const metrics = await this.getMetrics();
    const start = this.normalizeCoords(startX, startY, metrics);
    const end = this.normalizeCoords(endX, endY, metrics);

    const res = await this.sendWorkerCommand({
      action: 'drag',
      startX: start.targetX,
      startY: start.targetY,
      endX: end.targetX,
      endY: end.targetY
    });

    return {
      success: res.includes('RESULT:DRAGGED'),
      message: `Mouse dragged from (${start.targetX}, ${start.targetY}) to (${end.targetX}, ${end.targetY}).`
    };
  }

  // Mouse Scroll Wheel (up or down)
  async scroll(direction = 'down', amount = 3) {
    const dir = direction.toLowerCase() === 'up' ? 1 : -1;
    const delta = dir * Math.abs(amount || 3) * 120;
    const res = await this.sendWorkerCommand({ action: 'scroll', delta });

    return {
      success: res.includes('RESULT:SCROLLED'),
      direction: dir > 0 ? 'up' : 'down',
      amount,
      message: `Mouse scroll wheel rotated ${dir > 0 ? 'UP' : 'DOWN'} by ${amount} steps.`
    };
  }

  // Type Text into active window
  async typeText(text) {
    if (!text) return { success: false, message: 'No text provided to type.' };
    const safeText = text.replace(/[\{\}\+\^\%\~\(\)\[\]]/g, '{$&}');
    const res = await this.sendWorkerCommand({ action: 'type', text: safeText });

    return {
      success: res.includes('RESULT:TYPED'),
      typedLength: text.length,
      message: `Typed text input ("${text.length > 30 ? text.substring(0, 30) + '...' : text}") into active element.`
    };
  }

  // Press special key or hotkey
  async pressKey(keyName) {
    if (!keyName) return { success: false, message: 'No key specified.' };
    const k = keyName.toLowerCase().trim();

    const keyMap = {
      'enter': '{ENTER}',
      'return': '{ENTER}',
      'esc': '{ESC}',
      'escape': '{ESC}',
      'tab': '{TAB}',
      'backspace': '{BACKSPACE}',
      'delete': '{DELETE}',
      'del': '{DELETE}',
      'up': '{UP}',
      'down': '{DOWN}',
      'left': '{LEFT}',
      'right': '{RIGHT}',
      'home': '{HOME}',
      'end': '{END}',
      'space': ' ',
      'ctrl+c': '^c',
      'ctrl+v': '^v',
      'ctrl+a': '^a',
      'ctrl+z': '^z',
      'ctrl+s': '^s',
      'ctrl+f': '^f',
      'ctrl+w': '^w',
      'ctrl+t': '^t',
      'alt+f4': '%{F4}',
      'alt+tab': '%{TAB}',
      'win': '^{ESC}',
      'f5': '{F5}',
      'f11': '{F11}'
    };

    const sendKey = keyMap[k] || `{${k.toUpperCase()}}`;
    const res = await this.sendWorkerCommand({ action: 'key', key: sendKey });

    return {
      success: res.includes('RESULT:KEY_PRESSED'),
      key: keyName,
      message: `Pressed key/hotkey: [${keyName.toUpperCase()}].`
    };
  }

  // Clean shutdown
  destroy() {
    if (this.ps) {
      try { this.ps.kill(); } catch (e) {}
    }
  }
}

module.exports = new MouseControlService();
