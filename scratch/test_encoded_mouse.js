const { exec } = require('child_process');

function runPowerShellScript(script) {
  return new Promise((resolve, reject) => {
    const encoded = Buffer.from(script, 'utf16le').toString('base64');
    exec(`powershell -NoProfile -NonInteractive -EncodedCommand ${encoded}`, (err, stdout, stderr) => {
      if (err) reject(new Error(stderr || err.message));
      else resolve(stdout.trim());
    });
  });
}

async function testEncoded() {
  const ps = `
    $sig = @"
[DllImport("user32.dll")]
public static extern void mouse_event(int dwFlags, int dx, int dy, int dwData, int dwExtraInfo);
"@
    $m = Add-Type -MemberDefinition $sig -Name "Win32MouseEvent" -Namespace "Win32Functions" -PassThru
    Add-Type -AssemblyName System.Windows.Forms
    
    $p = [System.Windows.Forms.Cursor]::Position
    Write-Output "ORIGINAL_POS:$($p.X),$($p.Y)"
    
    # Move to center or test click
    $screen = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
    Write-Output "SCREEN:$($screen.Width)x$($screen.Height)"
    
    # Left click test
    $m::mouse_event(0x02, 0, 0, 0, 0)
    $m::mouse_event(0x04, 0, 0, 0, 0)
    Write-Output "CLICK_OK"
  `;

  try {
    const out = await runPowerShellScript(ps);
    console.log('Result:\n' + out);
  } catch (e) {
    console.error('Failed:', e);
  }
}

testEncoded();
