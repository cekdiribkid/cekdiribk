import Database from 'better-sqlite3';
import { PrismaClient } from '@prisma/client';

const sqliteDb = new Database('d:/catatan upload ke github/custom.db', { 
  readonly: true 
});

const prisma = new PrismaClient();

interface SqliteRow {
  [key: string]: any;
}

async function migrateData() {
  console.log('🚀 Starting database migration from SQLite to Supabase...\n');

  try {
    // 1. Migrate Users
    console.log('📦 Migrating Users...');
    const users = sqliteDb.prepare('SELECT * FROM User').all() as SqliteRow[];
    let userCount = 0;
    for (const user of users) {
      await prisma.user.upsert({
        where: { id: user.id },
        update: {},
        create: {
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
      userCount++;
    }
    console.log(`✅ Migrated ${userCount} users\n`);

    // 2. Migrate Surveys
    console.log('📦 Migrating Surveys...');
    const surveys = sqliteDb.prepare('SELECT * FROM Survey').all() as SqliteRow[];
    let surveyCount = 0;
    for (const survey of surveys) {
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
      surveyCount++;
    }
    console.log(`✅ Migrated ${surveyCount} surveys\n`);

    // 3. Migrate Settings
    console.log('📦 Migrating Settings...');
    const settings = sqliteDb.prepare('SELECT * FROM Setting').all() as SqliteRow[];
    let settingCount = 0;
    for (const setting of settings) {
      await prisma.setting.upsert({
        where: { id: setting.id },
        update: {},
        create: {
          id: setting.id,
          key: setting.key,
          value: setting.value,
          createdAt: new Date(setting.createdAt),
          updatedAt: new Date(setting.updatedAt),
        },
      });
      settingCount++;
    }
    console.log(`✅ Migrated ${settingCount} settings\n`);

    // 4. Migrate Questions
    console.log('📦 Migrating Questions...');
    const questions = sqliteDb.prepare('SELECT * FROM Question').all() as SqliteRow[];
    let questionCount = 0;
    for (const question of questions) {
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
      questionCount++;
    }
    console.log(`✅ Migrated ${questionCount} questions\n`);

    // 5. Migrate Responses
    console.log('📦 Migrating Responses...');
    const responses = sqliteDb.prepare('SELECT * FROM Response').all() as SqliteRow[];
    let responseCount = 0;
    for (const response of responses) {
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
      responseCount++;
    }
    console.log(`✅ Migrated ${responseCount} responses\n`);

    // 6. Migrate Answers
    console.log('📦 Migrating Answers...');
    const answers = sqliteDb.prepare('SELECT * FROM Answer').all() as SqliteRow[];
    let answerCount = 0;
    for (const answer of answers) {
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
      answerCount++;
    }
    console.log(`✅ Migrated ${answerCount} answers\n`);

    // 7. Migrate Counseling
    console.log('📦 Migrating Counseling records...');
    const counselings = sqliteDb.prepare('SELECT * FROM Counseling').all() as SqliteRow[];
    let counselingCount = 0;
    for (const counseling of counselings) {
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
      counselingCount++;
    }
    console.log(`✅ Migrated ${counselingCount} counseling records\n`);

    // 8. Migrate VisitorLog
    console.log('📦 Migrating Visitor Logs...');
    const visitorLogs = sqliteDb.prepare('SELECT * FROM VisitorLog').all() as SqliteRow[];
    let visitorLogCount = 0;
    for (const log of visitorLogs) {
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
      visitorLogCount++;
    }
    console.log(`✅ Migrated ${visitorLogCount} visitor logs\n`);

    console.log('🎉 Migration completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   Users: ${userCount}`);
    console.log(`   Surveys: ${surveyCount}`);
    console.log(`   Questions: ${questionCount}`);
    console.log(`   Responses: ${responseCount}`);
    console.log(`   Answers: ${answerCount}`);
    console.log(`   Counseling: ${counselingCount}`);
    console.log(`   Settings: ${settingCount}`);
    console.log(`   Visitor Logs: ${visitorLogCount}`);

  } catch (error) {
    console.error('❌ Error during migration:', error);
    throw error;
  } finally {
    sqliteDb.close();
    await prisma.$disconnect();
  }
}

migrateData()
  .then(() => {
    console.log('\n✨ All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Migration failed:', error);
    process.exit(1);
  });
