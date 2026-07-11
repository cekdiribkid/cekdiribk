import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const userRole = req.headers.get('x-user-role');
    if (userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    // Parse query parameters for filtering
    const { searchParams } = new URL(req.url);
    const gradeFilter = searchParams.get('grade');
    const searchQuery = searchParams.get('search');

    const users = await db.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        whatsapp: true,
        jenisKelamin: true,
        image: true,
        grade: true,
        role: true,
        createdAt: true,
        responses: {
          select: {
            id: true,
            surveyId: true,
            completed: true,
            completedAt: true,
            survey: {
              select: {
                id: true,
                title: true,
                field: true,
                grade: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get all active surveys grouped by grade
    const allSurveys = await db.survey.findMany({
      where: { active: true },
      select: { id: true, title: true, field: true, grade: true },
      orderBy: [{ grade: 'asc' }, { field: 'asc' }],
    });

    // Build survey completion status per user
    const surveyFields = ['PRIBADI', 'SOSIAL', 'BELAJAR', 'KARIR'] as const;

    const usersWithStatus = users.map((u) => {
      // Surveys for this user's grade
      const gradeSurveys = allSurveys.filter((s) => s.grade === u.grade);
      const totalSurveys = gradeSurveys.length;

      // Per-survey status — includes `started` for in-progress detection
      const surveyStatus = gradeSurveys.map((survey) => {
        const response = u.responses.find((r) => r.surveyId === survey.id);
        const completed = response?.completed ?? false;
        // A survey is "started" if a response exists but not yet completed
        const started = !completed && !!response;
        return {
          surveyId: survey.id,
          title: survey.title,
          field: survey.field,
          completed,
          started,
          completedAt: response?.completedAt ?? null,
        };
      });

      // Per-field status — a field is "completed" only if ALL surveys for that field are completed
      const fieldStatus = surveyFields.map((field) => {
        const fieldSurveys = gradeSurveys.filter((s) => s.field === field);
        const fieldSurveyStatuses = surveyStatus.filter((s) => s.field === field);
        const allCompleted = fieldSurveys.length > 0 && fieldSurveyStatuses.length === fieldSurveys.length && fieldSurveyStatuses.every((s) => s.completed);
        const latestCompletedAt = fieldSurveyStatuses
          .filter((s) => s.completedAt)
          .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime())[0]?.completedAt ?? null;
        return {
          field,
          title: fieldSurveys[0]?.title || `${field}`,
          completed: allCompleted,
          completedAt: latestCompletedAt,
        };
      });

      const completedCount = surveyStatus.filter((s) => s.completed).length;
      const completionPercentage = totalSurveys > 0 ? Math.round((completedCount / totalSurveys) * 100) : 0;

      // Determine overall status
      let overallStatus: 'SELESAI' | 'PROSES' | 'BELUM';
      if (totalSurveys > 0 && completedCount === totalSurveys) {
        overallStatus = 'SELESAI';
      } else if (completedCount > 0) {
        overallStatus = 'PROSES';
      } else {
        overallStatus = 'BELUM';
      }

      return {
        id: u.id,
        name: u.name,
        email: u.email,
        whatsapp: u.whatsapp,
        jenisKelamin: u.jenisKelamin,
        image: u.image,
        grade: u.grade,
        role: u.role,
        createdAt: u.createdAt,
        totalSurveys,
        completedSurveys: completedCount,
        completedCount, // Alias for admin-users.tsx compatibility
        completionPercentage,
        overallStatus,
        surveyStatus,
        fieldStatus,
      };
    });

    // Separate students from admins
    const studentUsers = usersWithStatus.filter((u) => u.role === 'USER');
    const adminUsersList = usersWithStatus.filter((u) => u.role === 'ADMIN');

    // Apply grade filter to students
    let filteredStudents = studentUsers;
    if (gradeFilter && gradeFilter !== 'ALL') {
      filteredStudents = studentUsers.filter((u) => String(u.grade) === gradeFilter);
    }

    // Apply search filter to students
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filteredStudents = filteredStudents.filter(
        (u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
      );
    }

    // Compute summary stats (from ALL students, not filtered)
    const summary = {
      totalUsers: studentUsers.length,
      completedAll: studentUsers.filter((u) => u.overallStatus === 'SELESAI').length,
      inProgress: studentUsers.filter((u) => u.overallStatus === 'PROSES').length,
      notStarted: studentUsers.filter((u) => u.overallStatus === 'BELUM').length,
    };

    // Group surveys by grade
    const surveysByGrade: Record<number, typeof allSurveys> = {};
    for (const survey of allSurveys) {
      if (!surveysByGrade[survey.grade]) {
        surveysByGrade[survey.grade] = [];
      }
      surveysByGrade[survey.grade].push(survey);
    }

    return NextResponse.json({
      users: filteredStudents,
      adminUsers: adminUsersList,
      summary,
      surveysByGrade,
    });
  } catch (error) {
    console.error('Admin users error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
