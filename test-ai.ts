
import { callAI } from './src/lib/ai-config';

async function testAI() {
  console.log('Testing AI generation...');
  try {
    const response = await callAI([
      { role: 'user', content: 'Halo, apakah kamu bisa mendengar saya? Jawab dengan singkat.' }
    ]);
    console.log('AI Response:', response);
    if (response) {
      console.log('✅ AI is working correctly!');
    } else {
      console.log('❌ AI returned an empty response.');
    }
  } catch (error) {
    console.error('❌ AI Error:', error.message);
  }
}

testAI();
