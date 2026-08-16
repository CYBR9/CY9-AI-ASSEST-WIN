const fs = require('fs');
const path = require('path');

function pngToIco(pngPath, icoPath) {
  const pngBuffer = fs.readFileSync(pngPath);
  const pngSize = pngBuffer.length;

  // ICONDIR Header (6 bytes)
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // Reserved
  header.writeUInt16LE(1, 2); // 1 = ICO
  header.writeUInt16LE(1, 4); // 1 image

  // ICONDIRENTRY (16 bytes)
  const entry = Buffer.alloc(16);
  entry.writeUInt8(0, 0); // Width: 0 means 256px
  entry.writeUInt8(0, 1); // Height: 0 means 256px
  entry.writeUInt8(0, 2); // Color count: 0 (>=8bpp)
  entry.writeUInt8(0, 3); // Reserved: 0
  entry.writeUInt16LE(1, 4); // Color planes: 1
  entry.writeUInt16LE(32, 6); // Bits per pixel: 32
  entry.writeUInt32LE(pngSize, 8); // Size of image data
  entry.writeUInt32LE(22, 12); // Offset to image data (6 + 16 = 22)

  const icoBuffer = Buffer.concat([header, entry, pngBuffer]);
  fs.writeFileSync(icoPath, icoBuffer);
  console.log(`Generated ICO at: ${icoPath} (${icoBuffer.length} bytes)`);
}

const cy9Png = path.join(__dirname, 'CY9.png');
const icoPath1 = path.join(__dirname, 'src', 'assets', 'icon.ico');
const icoPath2 = path.join(__dirname, 'CY9.ico');

pngToIco(cy9Png, icoPath1);
pngToIco(cy9Png, icoPath2);
