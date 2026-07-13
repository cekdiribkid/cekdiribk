const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkMigration() {
  console.log('\n🔍 Checking Supabase Database Status...\n');
  
  try {
    const results = await Promise.all([
      prisma.user.count().catch(() => 0),
      prisma.survey.count().catch(() => 0),
      prisma.question.count().catch(() => 0),
      prisma.response.count().catch(() => 0),
      prisma.answer.count().catch(() => 0),
      prisma.counseling.count().catch(() => 0),
      prisma.setting.count().catch(() => 0),
      prisma.visitorLog.count().catch(() => 0),
    ]);

    const [users, surveys, questions, responses, answers, counseling, settings, visitorLogs] = results;
    const total = results.reduce((sum, count) => sum + count, 0);

    console.log('📊 DATABASE STATUS:');
    console.log('==================');
    console.log(`Users:        ${users}`);
    console.log(`Surveys:      ${surveys}`);
    console.log(`Questions:    ${questions}`);
    console.log(`Responses:    ${responses}`);
    console.log(`Answers:      ${answers}`);
    console.log(`Counseling:   ${counseling}`);
    console.log(`Settings:     ${settings}`);
    console.log(`Visitor Logs: ${visitorLogs}`);
    console.log('==================');
    console.log(`TOTAL RECORDS: ${total}\n`);

    if (total > 0) {
      console.log('✅ SUCCESS! Database has been migrated to Supabase.');
      console.log('   Your data is now in the cloud! 🎉\n');
    } else {
      console.log('⚠️  WARNING: No data found in database.');
      console.log('   You may need to run the migration script:\n');
      console.log('   node node_modules/tsx/dist/cli.mjs prisma/migrate-from-sqlite.ts\n');
    }

    await prisma.$disconnect();
    process.exit(0);

  } catch (error) {
    console.error('❌ ERROR connecting to Supabase:');
    console.error(error.message);
    console.log('\nPlease check:');
    console.log('1. Your .env file has correct DATABASE_URL and DIRECT_URL');
    console.log('2. Your Supabase project is active');
    console.log('3. Prisma Client is generated (run: npm run db:generate)\n');
    
    await prisma.$disconnect();
    process.exit(1);
  }
}

checkMigration();
