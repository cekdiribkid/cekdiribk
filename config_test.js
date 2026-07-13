require('dotenv').config();
// Register ts-node to allow importing TypeScript files directly
require('ts-node').register({ transpileOnly: true });
const path = require('path');
// Resolve the TypeScript source file directly
const aiConfigPath = path.resolve(__dirname, 'src', 'lib', 'ai-config.ts');
const { getAIConfig } = require(aiConfigPath);

(async () => {
  try {
    const cfg = await getAIConfig();
    console.log('AI Config:', cfg);
  } catch (err) {
    console.error('Error getting config:', err.message);
  }
})();
