import 'dotenv/config';
import { callAI } from './src/lib/ai-config';

(async () => {
  try {
    const result = await callAI([
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'Berikan contoh ringkasan konseling singkat.' },
    ]);
    console.log('AI response:', result);
  } catch (err:any) {
    console.error('Error:', err.message);
  }
})();
