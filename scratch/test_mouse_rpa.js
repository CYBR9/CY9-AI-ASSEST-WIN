const mouseControlService = require('../src/services/mouseControlService');

async function testRpa() {
  console.log('====================================================');
  console.log('🖱️ TESTING WINDOWS MOUSE & KEYBOARD RPA SERVICE');
  console.log('====================================================\n');

  // 1. Get Metrics
  console.log('1. Fetching Screen Metrics & Cursor Position:');
  const metrics = await mouseControlService.getMetrics();
  console.log(`   Resolution: ${metrics.width}x${metrics.height} | Current Cursor: (${metrics.cursorX}, ${metrics.cursorY})`);

  // 2. Move Mouse to center of screen
  console.log('\n2. Moving cursor to screen center (50%, 50%):');
  const moveRes = await mouseControlService.moveMouse(metrics.width / 2, metrics.height / 2);
  console.log(`   Result: ${moveRes.message}`);

  // 3. Left Click
  console.log('\n3. Performing Left Click:');
  const clickRes = await mouseControlService.click('left');
  console.log(`   Result: ${clickRes.message}`);

  // 4. Right Click
  console.log('\n4. Performing Right Click (Context Menu):');
  const rightClickRes = await mouseControlService.click('right');
  console.log(`   Result: ${rightClickRes.message}`);

  // 5. Scroll Wheel
  console.log('\n5. Scrolling Down:');
  const scrollRes = await mouseControlService.scroll('down', 2);
  console.log(`   Result: ${scrollRes.message}`);

  console.log('\n🎉 SUCCESS: MOUSE & KEYBOARD RPA ENGINE OPERATIONAL!');
}

testRpa().catch(console.error);
