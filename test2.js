require('dotenv').config();
// This script should be run with ts-node (npm script) to allow TypeScript import
const { callAI } = require('./src/lib/ai-config.ts');

(async () => {
  try {
    const result = await callAI([
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'Berikan contoh ringkasan konseling singkat.' },
    ]);
    console.log('AI response:', result);
  } catch (err) {
    console.error('Error:', err.message);
  }
})();