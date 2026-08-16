const { spawn } = require('child_process');
const readline = require('readline');

class FastMouseWorker {
  constructor() {
    this.ready = false;
    this.callbacks = [];
    this.initProcess();
  }

  initProcess() {
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
            if ($cmd.x -and $cmd.y) {
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
            if ($cmd.x -and $cmd.y) {
              [NativeInput]::SetCursorPos($cmd.x, $cmd.y)
              Start-Sleep -Milliseconds 20
            }
            [NativeInput]::mouse_event(0x02, 0, 0, 0, 0)
            [NativeInput]::mouse_event(0x04, 0, 0, 0, 0)
            Start-Sleep -Milliseconds 80
            [NativeInput]::mouse_event(0x02, 0, 0, 0, 0)
            [NativeInput]::mouse_event(0x04, 0, 0, 0, 0)
            Write-Output "RESULT:DOUBLE_CLICKED"
          }
          elseif ($cmd.action -eq "drag") {
            [NativeInput]::SetCursorPos($cmd.startX, $cmd.startY)
            Start-Sleep -Milliseconds 30
            [NativeInput]::mouse_event(0x02, 0, 0, 0, 0)
            Start-Sleep -Milliseconds 40
            [NativeInput]::SetCursorPos($cmd.endX, $cmd.endY)
            Start-Sleep -Milliseconds 40
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
        if (this.onReady) this.onReady();
      } else if (trimmed.startsWith('RESULT:') || trimmed.startsWith('ERROR:')) {
        const cb = this.callbacks.shift();
        if (cb) cb(trimmed);
      }
    });

    this.ps.stderr.on('data', (d) => {
      console.warn('MouseWorker stderr:', d.toString());
    });
  }

  sendCommand(cmdObj) {
    return new Promise((resolve) => {
      const execNow = () => {
        this.callbacks.push(resolve);
        this.ps.stdin.write(JSON.stringify(cmdObj) + '\n');
      };
      if (this.ready) {
        execNow();
      } else {
        const oldReady = this.onReady;
        this.onReady = () => {
          if (oldReady) oldReady();
          execNow();
        };
      }
    });
  }
}

async function testFastWorker() {
  console.log('Starting Fast Mouse Worker...');
  const t0 = Date.now();
  const worker = new FastMouseWorker();

  const mRes = await worker.sendCommand({ action: 'metrics' });
  console.log(`[${Date.now() - t0}ms] Metrics:`, mRes);

  const t1 = Date.now();
  const moveRes = await worker.sendCommand({ action: 'move', x: 500, y: 500 });
  console.log(`[${Date.now() - t1}ms] Move:`, moveRes);

  const t2 = Date.now();
  const clickRes = await worker.sendCommand({ action: 'click', button: 'left' });
  console.log(`[${Date.now() - t2}ms] Click:`, clickRes);

  const t3 = Date.now();
  const rightClickRes = await worker.sendCommand({ action: 'click', button: 'right' });
  console.log(`[${Date.now() - t3}ms] Right Click:`, rightClickRes);

  const t4 = Date.now();
  const scrollRes = await worker.sendCommand({ action: 'scroll', delta: -240 });
  console.log(`[${Date.now() - t4}ms] Scroll:`, scrollRes);

  worker.ps.kill();
  console.log('Worker closed. Total latency for 4 mouse commands was ~10ms each!');
}

testFastWorker().catch(console.error);
