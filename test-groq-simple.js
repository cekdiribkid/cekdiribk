require('dotenv').config();

async function testGroqAI() {
  try {
    console.log('🔍 Mengecek konfigurasi AI dari .env...\n');
    
    const apiKey = process.env.AI_API_KEY;
    const baseUrl = process.env.AI_BASE_URL;
    const model = process.env.AI_MODEL;
    const provider = process.env.AI_PROVIDER;
    
    console.log('📋 Konfigurasi AI:');
    console.log(`   Provider: ${provider}`);
    console.log(`   Model: ${model}`);
    console.log(`   Base URL: ${baseUrl}`);
    console.log(`   API Key: ${apiKey ? '✅ Ada (' + apiKey.substring(0, 15) + '...)' : '❌ Tidak ada'}\n`);
    
    if (!apiKey) {
      console.log('❌ API Key tidak ditemukan di .env');
      process.exit(1);
    }
    
    // Test AI generation
    console.log('🚀 Testing AI generation dengan Groq...\n');
    
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: 'user',
            content: 'Halo! Tolong jawab dengan singkat: Siapa presiden pertama Indonesia?'
          }
        ],
        max_tokens: 100,
        temperature: 0.7
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log(`❌ API Error (${response.status}):`, errorText);
      process.exit(1);
    }
    
    const data = await response.json();
    
    if (data.choices && data.choices[0] && data.choices[0].message) {
      console.log('✅ AI BERHASIL MERESPONS!\n');
      console.log('📝 Respons AI:');
      console.log('   ' + data.choices[0].message.content);
      console.log('\n🎉 SUKSES! Fitur AI sudah aktif dan berfungsi dengan baik!');
      console.log('\n💡 Groq API Key Anda sudah terkonfigurasi dengan benar.');
      console.log('   Sekarang aplikasi Anda bisa menggunakan AI untuk generate insights.');
    } else {
      console.log('⚠️  Respons tidak sesuai format:', JSON.stringify(data, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.cause) {
      console.error('   Cause:', error.cause);
    }
  }
}

testGroqAI();
