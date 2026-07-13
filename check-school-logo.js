const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const prisma = new PrismaClient();

async function checkAndUploadLogo() {
  try {
    console.log('🔍 Checking schoolLogo setting...\n');
    
    // Cek setting schoolLogo
    const logoSetting = await prisma.setting.findUnique({
      where: { key: 'schoolLogo' }
    });
    
    if (logoSetting && logoSetting.value && logoSetting.value.startsWith('data:image/')) {
      console.log('✅ School logo already exists in database!');
      console.log('📊 Logo data size:', logoSetting.value.length, 'characters');
      console.log('📝 First 100 chars:', logoSetting.value.substring(0, 100) + '...');
    } else {
      console.log('❌ School logo NOT found in database');
      console.log('📤 Uploading school-illustration.png...\n');
      
      // Baca file school-illustration.png
      const imagePath = path.join(process.cwd(), 'public', 'school-illustration.png');
      
      if (!fs.existsSync(imagePath)) {
        console.log('❌ school-illustration.png not found!');
        return;
      }
      
      // Convert to base64 data URL
      const imageBuffer = fs.readFileSync(imagePath);
      const base64 = imageBuffer.toString('base64');
      const dataUrl = `data:image/png;base64,${base64}`;
      
      // Upload ke database
      await prisma.setting.upsert({
        where: { key: 'schoolLogo' },
        update: { value: dataUrl },
        create: { key: 'schoolLogo', value: dataUrl }
      });
      
      console.log('✅ School logo uploaded successfully!');
      console.log('📊 Logo data size:', dataUrl.length, 'characters');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkAndUploadLogo();
