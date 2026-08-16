const { exec } = require('child_process');

function testCursorPos() {
  const ps = `
    Add-Type -AssemblyName System.Windows.Forms
    Add-Type -AssemblyName System.Drawing
    $pos = [System.Windows.Forms.Cursor]::Position
    Write-Output "POS:$($pos.X),$($pos.Y)"
    $screen = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
    Write-Output "SCREEN:$($screen.Width)x$($screen.Height)"
  `;

  exec(`powershell -NoProfile -Command "${ps.replace(/\n/g, '; ')}"`, (err, stdout, stderr) => {
    if (err) {
      console.error('Error:', err, stderr);
    } else {
      console.log('Output:\n' + stdout);
    }
  });
}

testCursorPos();
