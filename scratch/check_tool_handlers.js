const geminiService = require('../src/services/geminiService');
const agentManager = require('../src/services/agentManager');

const allTools = geminiService.toolsDefinition[0].functionDeclarations;
console.log(`Checking handler coverage for ${allTools.length} tools...`);

// Let's read agentManager.js source code to see handled tool names
const fs = require('fs');
const agentManagerCode = fs.readFileSync(__dirname + '/../src/services/agentManager.js', 'utf8');

const unhandled = [];
for (const tool of allTools) {
  const casePattern = new RegExp(`case\\s+['"]${tool.name}['"]`);
  if (!casePattern.test(agentManagerCode)) {
    unhandled.push(tool.name);
  }
}

console.log(`Unhandled tools count: ${unhandled.length}`);
if (unhandled.length > 0) {
  console.log('Unhandled tools:', unhandled);
} else {
  console.log('✅ ALL tools have corresponding handlers in agentManager.js!');
}
