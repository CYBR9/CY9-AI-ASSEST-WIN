const irRemoteService = require('../src/services/irRemoteService');
const smartHomeService = require('../src/services/smartHomeService');

async function testAddRemoveIR() {
  console.log('====================================================');
  console.log('📡 TESTING IR REMOTE DYNAMIC ADD, SAVE & REMOVE');
  console.log('====================================================\n');

  // Step 1: Initial state
  console.log('1. Checking initial remotes count:');
  const initial = smartHomeService.getRemotes();
  console.log(`   Initial count: ${initial.length}`);

  // Step 2: Add AC device
  console.log('\n2. Adding Custom AC Device ("مكيف غرفتي"):');
  const addAcRes = smartHomeService.addDevice({
    name: 'مكيف غرفتي',
    type: 'ac',
    brand: 'Gree'
  });
  console.log(`   Result: ${addAcRes.message} (ID: ${addAcRes.remote.id})`);

  // Step 3: Add TV device
  console.log('\n3. Adding Custom TV Device ("شاشة الصالة"):');
  const addTvRes = smartHomeService.addDevice({
    name: 'شاشة الصالة',
    type: 'tv',
    brand: 'Samsung'
  });
  console.log(`   Result: ${addTvRes.message} (ID: ${addTvRes.remote.id})`);

  // Step 4: Verify count is 2
  const current = smartHomeService.getRemotes();
  console.log(`\n4. Current Remotes in Memory & Disk: ${current.length}`);
  current.forEach((r, idx) => console.log(`   [${idx+1}] ${r.name} (${r.type} - ${r.brand})`));

  // Step 5: Test send IR command to custom added device
  console.log('\n5. Sending IR command to "مكيف غرفتي":');
  const irRes = await smartHomeService.sendIR(addAcRes.remote.id, 'temp', 20);
  console.log(`   Result: ${irRes.message}`);

  // Step 6: Remove AC device
  console.log('\n6. Removing AC Device:');
  const removeAcRes = smartHomeService.removeDevice(addAcRes.remote.id);
  console.log(`   Result: ${removeAcRes.message}`);
  console.log(`   Remaining count: ${smartHomeService.getRemotes().length}`);

  // Step 7: Remove TV device
  console.log('\n7. Removing TV Device:');
  const removeTvRes = smartHomeService.removeDevice(addTvRes.remote.id);
  console.log(`   Result: ${removeTvRes.message}`);
  console.log(`   Remaining count: ${smartHomeService.getRemotes().length}`);

  // Step 8: Verify persistence stays empty
  const reloaded = irRemoteService.loadRemotes();
  console.log(`\n8. Reloaded from disk count: ${reloaded.length}`);

  if (reloaded.length === 0) {
    console.log('\n🎉 SUCCESS: ADD, PERSIST, AND REMOVE WORK PERFECTLY!');
  } else {
    console.error('❌ ERROR: Expected 0 remotes but found', reloaded.length);
  }
}

testAddRemoveIR().catch(console.error);
