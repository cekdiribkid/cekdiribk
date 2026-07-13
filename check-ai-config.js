const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkAIConfig() {
  console.log('\n🔍 Mengecek Konfigurasi AI...\n');
  
  try {
    const aiSettings = await prisma.setting.findMany({
      where: {
        key: {
          in: ['ai_provider', 'ai_base_url', 'ai_api_key', 'ai_model']
        }
      }
    });

    console.log('📊 Status Konfigurasi AI:');
    console.log('========================\n');

    const settingsMap = {};
    for (const setting of aiSettings) {
      settingsMap[setting.key] = setting.value;
    }

    const hasProvider = Boolean(settingsMap.ai_provider);
    const hasBaseUrl = Boolean(settingsMap.ai_base_url);
    const hasApiKey = Boolean(settingsMap.ai_api_key);
    const hasModel = Boolean(settingsMap.ai_model);

    console.log(`Provider:  ${hasProvider ? '✅ ' + settingsMap.ai_provider : '❌ Belum dikonfigurasi'}`);
    console.log(`Base URL:  ${hasBaseUrl ? '✅ ' + settingsMap.ai_base_url : '❌ Belum dikonfigurasi'}`);
    console.log(`API Key:   ${hasApiKey ? '✅ ' + settingsMap.ai_api_key.substring(0, 10) + '...' : '❌ Belum dikonfigurasi'}`);
    console.log(`Model:     ${hasModel ? '✅ ' + settingsMap.ai_model : '❌ Belum dikonfigurasi'}`);

    console.log('\n');

    if (hasProvider && hasBaseUrl && hasApiKey) {
      console.log('✅ AI SUDAH DIKONFIGURASI!');
      console.log('   Fitur Generate AI seharusnya berfungsi.\n');
      console.log('   Jika masih error, kemungkinan:');
      console.log('   1. API Key sudah expired');
      console.log('   2. Base URL salah');
      console.log('   3. Model tidak tersedia\n');
    } else {
      console.log('❌ AI BELUM DIKONFIGURASI!\n');
      console.log('📝 Cara Konfigurasi AI:\n');
      console.log('1. Login sebagai ADMIN');
      console.log('2. Buka menu: Pengaturan → Konfigurasi AI');
      console.log('3. Pilih provider: Groq (GRATIS - Rekomendasi!)');
      console.log('4. Daftar di: https://console.groq.com');
      console.log('5. Buat API Key (klik API Keys → Create API Key)');
      console.log('6. Copy API Key (dimulai dengan gsk_)');
      console.log('7. Paste di form konfigurasi');
      console.log('8. Pilih model: llama-3.3-70b-versatile');
      console.log('9. Klik Simpan & Test Koneksi\n');
      console.log('💡 Groq GRATIS dan CEPAT, cocok untuk Generate AI!\n');
    }

    await prisma.$disconnect();
    process.exit(0);

  } catch (error) {
    console.error('❌ ERROR:', error.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

checkAIConfig();
