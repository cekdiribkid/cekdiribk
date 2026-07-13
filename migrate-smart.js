const Database = require('better-sqlite3');
const { PrismaClient } = require('@prisma/client');

const sqliteDb = new Database('d:/catatan upload ke github/custom.db', { readonly: true });
const prisma = new PrismaClient();

let stats = {
  users: { inserted: 0, skipped: 0, errors: 0 },
  surveys: { inserted: 0, skipped: 0, errors: 0 },
  questions: { inserted: 0, skipped: 0, errors: 0 },
  responses: { inserted: 0, skipped: 0, errors: 0 },
  answers: { inserted: 0, skipped: 0, errors: 0 },
  counseling: { inserted: 0, skipped: 0, errors: 0 },
  settings: { inserted: 0, skipped: 0, errors: 0 },
  visitorLogs: { inserted: 0, skipped: 0, errors: 0 },
};

async function migrateData() {
  console.log('\n🚀 Starting SMART database migration from SQLite to Supabase...');
  console.log('   This version handles conflicts and shows progress.\n');

  try {
    // 1. Migrate Users
    console.log('📦 Migrating Users...');
    const users = sqliteDb.prepare('SELECT * FROM User').all();
    for (const user of users) {
      try {
        // Check if user with this email already exists
        const existing = await prisma.user.findUnique({ where: { email: user.email } });
        
        if (existing) {
          // Update existing user with new data
          await prisma.user.update({
            where: { email: user.email },
            data: {
              name: user.name,
              password: user.password,
              whatsapp: user.whatsapp,
              jenisKelamin: user.jenisKelamin,
              grade: user.grade,
              role: user.role,
              image: user.image,
            }
          });
          stats.users.skipped++;
        } else {
          // Create new user
          await prisma.user.create({
            data: {
              id: user.id,
              name: user.name,
              email: user.email,
              password: user.password,
              whatsapp: user.whatsapp,
              jenisKelamin: user.jenisKelamin,
              grade: user.grade,
              role: user.role,
              image: user.image,
              createdAt: new Date(user.createdAt),
              updatedAt: new Date(user.updatedAt),
            },
          });
          stats.users.inserted++;
        }
      } catch (error) {
        stats.users.errors++;
        console.log(`  ⚠️  Error with user ${user.email}: ${error.message}`);
      }
    }
    console.log(`✅ Users: ${stats.users.inserted} inserted, ${stats.users.skipped} updated, ${stats.users.errors} errors\n`);

    // 2. Migrate Surveys
    console.log('📦 Migrating Surveys...');
    const surveys = sqliteDb.prepare('SELECT * FROM Survey').all();
    for (const survey of surveys) {
      try {
        await prisma.survey.upsert({
          where: { id: survey.id },
          update: {},
          create: {
            id: survey.id,
            title: survey.title,
            description: survey.description,
            grade: survey.grade,
            field: survey.field,
            active: Boolean(survey.active),
            createdAt: new Date(survey.createdAt),
            updatedAt: new Date(survey.updatedAt),
          },
        });
        stats.surveys.inserted++;
      } catch (error) {
        stats.surveys.errors++;
      }
    }
    console.log(`✅ Surveys: ${stats.surveys.inserted} processed, ${stats.surveys.errors} errors\n`);

    // 3. Migrate Settings
    console.log('📦 Migrating Settings...');
    const settings = sqliteDb.prepare('SELECT * FROM Setting').all();
    for (const setting of settings) {
      try {
        await prisma.setting.upsert({
          where: { key: setting.key },
          update: { value: setting.value },
          create: {
            id: setting.id,
            key: setting.key,
            value: setting.value,
            createdAt: new Date(setting.createdAt),
            updatedAt: new Date(setting.updatedAt),
          },
        });
        stats.settings.inserted++;
      } catch (error) {
        stats.settings.errors++;
      }
    }
    console.log(`✅ Settings: ${stats.settings.inserted} processed, ${stats.settings.errors} errors\n`);

    // 4. Migrate Questions
    console.log('📦 Migrating Questions...');
    const questions = sqliteDb.prepare('SELECT * FROM Question').all();
    for (const question of questions) {
      try {
        await prisma.question.upsert({
          where: { id: question.id },
          update: {},
          create: {
            id: question.id,
            surveyId: question.surveyId,
            text: question.text,
            order: question.order,
            createdAt: new Date(question.createdAt),
            updatedAt: new Date(question.updatedAt),
          },
        });
        stats.questions.inserted++;
      } catch (error) {
        stats.questions.errors++;
      }
    }
    console.log(`✅ Questions: ${stats.questions.inserted} processed, ${stats.questions.errors} errors\n`);

    // 5. Migrate Responses
    console.log('📦 Migrating Responses...');
    const responses = sqliteDb.prepare('SELECT * FROM Response').all();
    for (const response of responses) {
      try {
        await prisma.response.upsert({
          where: { id: response.id },
          update: {},
          create: {
            id: response.id,
            userId: response.userId,
            surveyId: response.surveyId,
            completed: Boolean(response.completed),
            completedAt: response.completedAt ? new Date(response.completedAt) : null,
            createdAt: new Date(response.createdAt),
            updatedAt: new Date(response.updatedAt),
          },
        });
        stats.responses.inserted++;
      } catch (error) {
        stats.responses.errors++;
      }
    }
    console.log(`✅ Responses: ${stats.responses.inserted} processed, ${stats.responses.errors} errors\n`);

    // 6. Migrate Answers (THIS WILL TAKE LONGEST - 4470 records)
    console.log('📦 Migrating Answers (this may take a few minutes)...');
    const answers = sqliteDb.prepare('SELECT * FROM Answer').all();
    let answerProgress = 0;
    for (const answer of answers) {
      try {
        await prisma.answer.upsert({
          where: { 
            responseId_questionId: {
              responseId: answer.responseId,
              questionId: answer.questionId,
            }
          },
          update: {},
          create: {
            id: answer.id,
            responseId: answer.responseId,
            questionId: answer.questionId,
            value: answer.value,
            createdAt: new Date(answer.createdAt),
          },
        });
        stats.answers.inserted++;
        answerProgress++;
        if (answerProgress % 500 === 0) {
          console.log(`  Progress: ${answerProgress}/${answers.length} answers...`);
        }
      } catch (error) {
        stats.answers.errors++;
      }
    }
    console.log(`✅ Answers: ${stats.answers.inserted} processed, ${stats.answers.errors} errors\n`);

    // 7. Migrate Counseling
    console.log('📦 Migrating Counseling records...');
    const counselings = sqliteDb.prepare('SELECT * FROM Counseling').all();
    for (const counseling of counselings) {
      try {
        await prisma.counseling.upsert({
          where: { id: counseling.id },
          update: {},
          create: {
            id: counseling.id,
            studentId: counseling.studentId,
            date: new Date(counseling.date),
            topic: counseling.topic,
            field: counseling.field,
            topicItems: counseling.topicItems,
            ringkasan: counseling.ringkasan,
            notes: counseling.notes,
            followUp: counseling.followUp,
            solusi: counseling.solusi,
            status: counseling.status,
            bkOfficer: counseling.bkOfficer,
            createdAt: new Date(counseling.createdAt),
            updatedAt: new Date(counseling.updatedAt),
          },
        });
        stats.counseling.inserted++;
      } catch (error) {
        stats.counseling.errors++;
      }
    }
    console.log(`✅ Counseling: ${stats.counseling.inserted} processed, ${stats.counseling.errors} errors\n`);

    // 8. Migrate VisitorLog
    console.log('📦 Migrating Visitor Logs...');
    const visitorLogs = sqliteDb.prepare('SELECT * FROM VisitorLog').all();
    for (const log of visitorLogs) {
      try {
        await prisma.visitorLog.upsert({
          where: { id: log.id },
          update: {},
          create: {
            id: log.id,
            userId: log.userId,
            userName: log.userName,
            userRole: log.userRole,
            loginAt: new Date(log.loginAt),
            logoutAt: log.logoutAt ? new Date(log.logoutAt) : null,
            durationSeconds: log.durationSeconds,
            deviceType: log.deviceType,
            deviceBrand: log.deviceBrand,
            deviceModel: log.deviceModel,
            deviceOS: log.deviceOS,
            browser: log.browser,
            userAgent: log.userAgent,
            createdAt: new Date(log.createdAt),
          },
        });
        stats.visitorLogs.inserted++;
      } catch (error) {
        stats.visitorLogs.errors++;
      }
    }
    console.log(`✅ Visitor Logs: ${stats.visitorLogs.inserted} processed, ${stats.visitorLogs.errors} errors\n`);

    console.log('🎉 Migration completed!\n');
    console.log('📊 FINAL SUMMARY:');
    console.log('==================');
    console.log(`Users:        ${stats.users.inserted} new, ${stats.users.skipped} updated`);
    console.log(`Surveys:      ${stats.surveys.inserted}`);
    console.log(`Questions:    ${stats.questions.inserted}`);
    console.log(`Responses:    ${stats.responses.inserted}`);
    console.log(`Answers:      ${stats.answers.inserted}`);
    console.log(`Counseling:   ${stats.counseling.inserted}`);
    console.log(`Settings:     ${stats.settings.inserted}`);
    console.log(`Visitor Logs: ${stats.visitorLogs.inserted}`);

  } catch (error) {
    console.error('\n❌ Fatal error during migration:', error);
    throw error;
  } finally {
    sqliteDb.close();
    await prisma.$disconnect();
  }
}

migrateData()
  .then(() => {
    console.log('\n✨ Migration process finished!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Migration failed:', error);
    process.exit(1);
  });
