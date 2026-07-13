const { PrismaClient } = require('@prisma/client');

async function testGroqAI() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Mengecek konfigurasi AI di database...\n');
    
    // Get AI config from database
    const aiConfig = await prisma.aIConfig.findFirst({
      orderBy: { updatedAt: 'desc' }
    });
    
    if (!aiConfig) {
      console.log('❌ Tidak ada konfigurasi AI di database');
      process.exit(1);
    }
    
    console.log('📋 Konfigurasi AI saat ini:');
    console.log(`   Provider: ${aiConfig.provider}`);
    console.log(`   Model: ${aiConfig.model}`);
    console.log(`   Base URL: ${aiConfig.baseUrl}`);
    console.log(`   API Key: ${aiConfig.apiKey ? '✅ Ada (' + aiConfig.apiKey.substring(0, 15) + '...)' : '❌ Tidak ada'}\n`);
    
    // Test AI generation
    console.log('🚀 Testing AI generation...\n');
    
    const apiKey = process.env.AI_API_KEY || aiConfig.apiKey;
    const baseUrl = process.env.AI_BASE_URL || aiConfig.baseUrl;
    const model = process.env.AI_MODEL || aiConfig.model;
    
    if (!apiKey) {
      console.log('❌ API Key tidak ditemukan');
      process.exit(1);
    }
    
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
      console.log('\n🎉 Fitur AI sudah aktif dan berfungsi dengan baik!');
    } else {
      console.log('⚠️  Respons tidak sesuai format:', JSON.stringify(data, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.cause) {
      console.error('   Cause:', error.cause);
    }
  } finally {
    await prisma.$disconnect();
  }
}

testGroqAI();
