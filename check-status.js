const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function checkStatus() {
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
    const percentComplete = ((total / 5139) * 100).toFixed(1);

    const result = `
MIGRATION STATUS - ${new Date().toLocaleString('id-ID')}
=============================================

Users:         ${users} / 50
Surveys:       ${surveys} / 12
Questions:     ${questions} / 360
Responses:     ${responses} / 149
Answers:       ${answers} / 4470
Counseling:    ${counseling} / 14
Settings:      ${settings} / 22
Visitor Logs:  ${visitorLogs} / 62

TOTAL:         ${total} / 5139 (${percentComplete}%)

${total >= 5139 ? '✅ MIGRATION COMPLETE!' : '⏳ Migration in progress...'}
`;

    // Write to file
    fs.writeFileSync('migration-status.txt', result);
    
    // Also write to console
    console.log(result);

    await prisma.$disconnect();
    process.exit(0);

  } catch (error) {
    const errorMsg = `ERROR: ${error.message}\n`;
    fs.writeFileSync('migration-status.txt', errorMsg);
    console.error(errorMsg);
    await prisma.$disconnect();
    process.exit(1);
  }
}

checkStatus();
