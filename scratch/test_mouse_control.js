const { exec } = require('child_process');

function testMouseControl() {
  console.log('Testing Windows Mouse Control via PowerShell P/Invoke...');
  const psScript = `
    Add-Type -TypeDefinition @"
    using System;
    using System.Runtime.InteropServices;
    public class WinMouse {
        [DllImport("user32.dll")]
        public static extern bool SetCursorPos(int X, int Y);

        [DllImport("user32.dll")]
        public static extern bool GetCursorPos(out POINT lpPoint);

        [DllImport("user32.dll")]
        public static extern void mouse_event(uint dwFlags, uint dx, uint dy, uint dwData, int dwExtraInfo);

        public const uint MOUSEEVENTF_LEFTDOWN = 0x0002;
        public const uint MOUSEEVENTF_LEFTUP = 0x0004;
        public const uint MOUSEEVENTF_RIGHTDOWN = 0x0008;
        public const uint MOUSEEVENTF_RIGHTUP = 0x0010;

        [StructLayout(LayoutKind.Sequential)]
        public struct POINT {
            public int X;
            public int Y;
        }

        public static string GetPos() {
            POINT p;
            GetCursorPos(out p);
            return p.X + "," + p.Y;
        }
    }
"@
    [WinMouse]::GetPos()
  `;

  exec(`powershell -NoProfile -Command "${psScript.replace(/"/g, '\\"')}"`, (err, stdout, stderr) => {
    if (err) {
      console.error('Error:', err.message, stderr);
    } else {
      console.log('Current cursor position:', stdout.trim());
    }
  });
}

testMouseControl();
