const { exec } = require('child_process');

function testClick() {
  const ps = `
    $sig = @'
[DllImport("user32.dll")]
public static extern void mouse_event(int dwFlags, int dx, int dy, int dwData, int dwExtraInfo);
'@
    $m = Add-Type -MemberDefinition $sig -Name "Win32MouseEvent" -Namespace "Win32Functions" -PassThru
    Add-Type -AssemblyName System.Windows.Forms
    Add-Type -AssemblyName System.Drawing
    
    # Get current pos
    $p = [System.Windows.Forms.Cursor]::Position
    Write-Output "Current pos: $($p.X), $($p.Y)"
    
    # Test Left Click
    $m::mouse_event(0x02, 0, 0, 0, 0)
    $m::mouse_event(0x04, 0, 0, 0, 0)
    Write-Output "SUCCESS: Mouse Click Dispatched"
  `;

  exec(`powershell -NoProfile -Command "${ps.replace(/"/g, '\\"')}"`, (err, stdout, stderr) => {
    if (err) {
      console.error('Error:', err, stderr);
    } else {
      console.log('Output:\n' + stdout);
    }
  });
}

testClick();
