const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

async function updateAIConfigInDatabase() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔄 Updating AI configuration in database...\n');
    
    // Get values from .env
    const provider = process.env.AI_PROVIDER;
    const baseUrl = process.env.AI_BASE_URL;
    const apiKey = process.env.AI_API_KEY;
    const model = process.env.AI_MODEL;
    
    if (!provider || !baseUrl || !apiKey || !model) {
      console.log('❌ Missing AI configuration in .env file');
      console.log('   Please make sure .env has:');
      console.log('   - AI_PROVIDER');
      console.log('   - AI_BASE_URL');
      console.log('   - AI_API_KEY');
      console.log('   - AI_MODEL');
      process.exit(1);
    }
    
    console.log('📋 Configuration from .env:');
    console.log(`   Provider: ${provider}`);
    console.log(`   Base URL: ${baseUrl}`);
    console.log(`   Model: ${model}`);
    console.log(`   API Key: ${apiKey.substring(0, 15)}...\n`);
    
    // Update or create settings in database
    const settings = [
      { key: 'ai_provider', value: provider },
      { key: 'ai_base_url', value: baseUrl },
      { key: 'ai_api_key', value: apiKey },
      { key: 'ai_model', value: model },
    ];
    
    for (const setting of settings) {
      await prisma.setting.upsert({
        where: { key: setting.key },
        update: { value: setting.value },
        create: { key: setting.key, value: setting.value },
      });
      console.log(`✅ Updated: ${setting.key}`);
    }
    
    console.log('\n🎉 AI configuration successfully updated in database!');
    console.log('   The web application will now use Groq API for AI features.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code === 'P2002') {
      console.log('   This is a unique constraint error. Settings might already exist.');
    }
  } finally {
    await prisma.$disconnect();
  }
}

updateAIConfigInDatabase();
