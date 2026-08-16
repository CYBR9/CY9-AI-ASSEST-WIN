const geminiService = require('../src/services/geminiService');

const decls = geminiService.toolsDefinition[0].functionDeclarations;
console.log(`Analyzing ${decls.length} tool declarations...`);

decls.forEach((tool, index) => {
  if (!tool.name) console.error(`[${index}] Missing name!`);
  if (!tool.description) console.error(`[${tool.name}] Missing description!`);
  if (tool.parameters) {
    if (tool.parameters.type !== 'OBJECT' && tool.parameters.type !== 'object') {
      console.error(`[${tool.name}] parameters.type is not OBJECT: ${tool.parameters.type}`);
    }
    const props = tool.parameters.properties || {};
    const req = tool.parameters.required || [];
    req.forEach(r => {
      if (!props[r]) {
        console.error(`[${tool.name}] required field '${r}' not found in properties!`);
      }
    });

    Object.entries(props).forEach(([propName, propDef]) => {
      if (!propDef.type) {
        console.error(`[${tool.name}] property '${propName}' missing type!`);
      }
      if (propDef.type === 'ARRAY' || propDef.type === 'array') {
        if (!propDef.items) {
          console.error(`[${tool.name}] property '${propName}' is ARRAY but missing items!`);
        }
      }
      if (propDef.enum && (!Array.isArray(propDef.enum) || propDef.enum.length === 0)) {
        console.error(`[${tool.name}] property '${propName}' has invalid enum!`);
      }
    });
  }
});
console.log('Schema syntax validation finished.');
