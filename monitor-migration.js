const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function monitorMigration() {
  console.log('\n⏱️  Monitoring migration progress...\n');
  
  try {
    const counts = await Promise.all([
      prisma.user.count(),
      prisma.survey.count(),
      prisma.question.count(),
      prisma.response.count(),
      prisma.answer.count(),
      prisma.counseling.count(),
      prisma.setting.count(),
      prisma.visitorLog.count(),
    ]);

    const [users, surveys, questions, responses, answers, counseling, settings, visitorLogs] = counts;
    const total = counts.reduce((sum, count) => sum + count, 0);

    console.log('📊 CURRENT STATUS IN SUPABASE:');
    console.log('==============================');
    console.log(`Users:         ${users}/50 (target)`);
    console.log(`Surveys:       ${surveys}/12 (target)`);
    console.log(`Questions:     ${questions}/360 (target)`);
    console.log(`Responses:     ${responses}/149 (target)`);
    console.log(`Answers:       ${answers}/4470 (target)`);
    console.log(`Counseling:    ${counseling}/14 (target)`);
    console.log(`Settings:      ${settings}/22 (target)`);
    console.log(`Visitor Logs:  ${visitorLogs}/62 (target)`);
    console.log('==============================');
    console.log(`TOTAL:         ${total}/5139 records\n`);

    const percentComplete = ((total / 5139) * 100).toFixed(1);
    console.log(`Progress: ${percentComplete}%`);
    
    if (total >= 5139) {
      console.log('\n✅ MIGRATION COMPLETE!\n');
    } else if (total > 0) {
      console.log('\n⏳ Migration in progress...\n');
      console.log('Run this script again to check updated progress.');
    } else {
      console.log('\n⚠️  No data yet. Migration may still be starting...\n');
    }

    await prisma.$disconnect();
    process.exit(0);

  } catch (error) {
    console.error('❌ ERROR:', error.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

monitorMigration();
