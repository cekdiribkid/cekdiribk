const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function checkAIConfig() {
  let output = '\n🔍 Mengecek Konfigurasi AI...\n\n';
  
  try {
    const aiSettings = await prisma.setting.findMany({
      where: {
        key: {
          in: ['ai_provider', 'ai_base_url', 'ai_api_key', 'ai_model']
        }
      }
    });

    output += '📊 Status Konfigurasi AI:\n';
    output += '========================\n\n';

    const settingsMap = {};
    for (const setting of aiSettings) {
      settingsMap[setting.key] = setting.value;
    }

    const hasProvider = Boolean(settingsMap.ai_provider);
    const hasBaseUrl = Boolean(settingsMap.ai_base_url);
    const hasApiKey = Boolean(settingsMap.ai_api_key);
    const hasModel = Boolean(settingsMap.ai_model);

    output += `Provider:  ${hasProvider ? '✅ ' + settingsMap.ai_provider : '❌ Belum dikonfigurasi'}\n`;
    output += `Base URL:  ${hasBaseUrl ? '✅ ' + settingsMap.ai_base_url : '❌ Belum dikonfigurasi'}\n`;
    output += `API Key:   ${hasApiKey ? '✅ ' + settingsMap.ai_api_key.substring(0, 10) + '...' : '❌ Belum dikonfigurasi'}\n`;
    output += `Model:     ${hasModel ? '✅ ' + settingsMap.ai_model : '❌ Belum dikonfigurasi'}\n`;

    output += '\n';

    if (hasProvider && hasBaseUrl && hasApiKey) {
      output += '✅ AI SUDAH DIKONFIGURASI!\n';
      output += '   Fitur Generate AI seharusnya berfungsi.\n\n';
      output += '   Jika masih error, kemungkinan:\n';
      output += '   1. API Key sudah expired\n';
      output += '   2. Base URL salah\n';
      output += '   3. Model tidak tersedia\n\n';
    } else {
      output += '❌ AI BELUM DIKONFIGURASI!\n\n';
      output += '📝 Cara Konfigurasi AI:\n\n';
      output += '1. Login sebagai ADMIN\n';
      output += '2. Buka menu: Pengaturan → Konfigurasi AI\n';
      output += '3. Pilih provider: Groq (GRATIS - Rekomendasi!)\n';
      output += '4. Daftar di: https://console.groq.com\n';
      output += '5. Buat API Key (klik API Keys → Create API Key)\n';
      output += '6. Copy API Key (dimulai dengan gsk_)\n';
      output += '7. Paste di form konfigurasi\n';
      output += '8. Pilih model: llama-3.3-70b-versatile\n';
      output += '9. Klik Simpan & Test Koneksi\n\n';
      output += '💡 Groq GRATIS dan CEPAT, cocok untuk Generate AI!\n\n';
    }

    // Write to file
    fs.writeFileSync('ai-config-status.txt', output);
    console.log(output);

    await prisma.$disconnect();
    process.exit(0);

  } catch (error) {
    output += `❌ ERROR: ${error.message}\n`;
    fs.writeFileSync('ai-config-status.txt', output);
    console.error(output);
    await prisma.$disconnect();
    process.exit(1);
  }
}

checkAIConfig();
