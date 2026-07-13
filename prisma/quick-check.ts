import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function quickCheck() {
  try {
    console.log('Testing connection to Supabase...');
    
    // Try to fetch counts
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

    console.log('\n=== DATABASE STATUS ===');
    console.log(`Users: ${counts[0]}`);
    console.log(`Surveys: ${counts[1]}`);
    console.log(`Questions: ${counts[2]}`);
    console.log(`Responses: ${counts[3]}`);
    console.log(`Answers: ${counts[4]}`);
    console.log(`Counseling: ${counts[5]}`);
    console.log(`Settings: ${counts[6]}`);
    console.log(`Visitor Logs: ${counts[7]}`);
    console.log(`\nTotal: ${counts.reduce((a, b) => a + b, 0)} records`);
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

quickCheck();
