import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyMigration() {
  console.log('🔍 Verifying data migration to Supabase...\n');

  try {
    const userCount = await prisma.user.count();
    const surveyCount = await prisma.survey.count();
    const questionCount = await prisma.question.count();
    const responseCount = await prisma.response.count();
    const answerCount = await prisma.answer.count();
    const counselingCount = await prisma.counseling.count();
    const settingCount = await prisma.setting.count();
    const visitorLogCount = await prisma.visitorLog.count();

    console.log('📊 Data count in Supabase:');
    console.log(`   Users: ${userCount}`);
    console.log(`   Surveys: ${surveyCount}`);
    console.log(`   Questions: ${questionCount}`);
    console.log(`   Responses: ${responseCount}`);
    console.log(`   Answers: ${answerCount}`);
    console.log(`   Counseling: ${counselingCount}`);
    console.log(`   Settings: ${settingCount}`);
    console.log(`   Visitor Logs: ${visitorLogCount}`);

    const total = userCount + surveyCount + questionCount + responseCount + answerCount + counselingCount + settingCount + visitorLogCount;
    
    if (total > 0) {
      console.log('\n✅ Migration verification successful!');
      console.log(`   Total records: ${total}`);
    } else {
      console.log('\n⚠️  No data found in database. Migration may not have completed.');
    }

  } catch (error) {
    console.error('❌ Error verifying migration:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

verifyMigration()
  .then(() => {
    console.log('\n✨ Verification complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Verification failed:', error);
    process.exit(1);
  });
