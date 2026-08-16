const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

function captureScreenshot() {
  return new Promise((resolve) => {
    const tempPath = path.join(os.tmpdir(), `cy9_screen_${Date.now()}.png`);
    const psCommands = [
      'Add-Type -AssemblyName System.Windows.Forms',
      'Add-Type -AssemblyName System.Drawing',
      '$screen = [System.Windows.Forms.Screen]::PrimaryScreen',
      '$bitmap = New-Object System.Drawing.Bitmap $screen.Bounds.Width, $screen.Bounds.Height',
      '$graphics = [System.Drawing.Graphics]::FromImage($bitmap)',
      '$graphics.CopyFromScreen($screen.Bounds.X, $screen.Bounds.Y, 0, 0, $bitmap.Size)',
      `$bitmap.Save('${tempPath.replace(/\\/g, '\\\\')}', [System.Drawing.Imaging.ImageFormat]::Png)`,
      '$graphics.Dispose()',
      '$bitmap.Dispose()'
    ].join('; ');

    exec(`powershell -NoProfile -Command "${psCommands}"`, (error, stdout, stderr) => {
      if (error || !fs.existsSync(tempPath)) {
        resolve({
          success: false,
          message: `Screenshot capture failed: ${error ? error.message : stderr || 'File not generated'}`
        });
      } else {
        try {
          const imageBuffer = fs.readFileSync(tempPath);
          const base64Image = imageBuffer.toString('base64');
          fs.unlink(tempPath, () => {});
          resolve({
            success: true,
            filePath: tempPath,
            base64: base64Image,
            bytes: imageBuffer.length,
            mimeType: 'image/png',
            message: 'Desktop screenshot captured successfully.'
          });
        } catch (e) {
          resolve({
            success: false,
            message: `Failed to encode screenshot: ${e.message}`
          });
        }
      }
    });
  });
}

async function run() {
  console.log('Testing captureScreenshot...');
  const res = await captureScreenshot();
  console.log('Result success:', res.success);
  console.log('Message:', res.message);
  if (res.success) {
    console.log('Captured image size:', res.bytes, 'bytes | Base64 length:', res.base64.length);
  }
}

run();
