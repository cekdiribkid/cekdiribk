import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/admin/visitors - Get all visitor logs
export async function GET(req: NextRequest) {
  try {
    const userRole = req.headers.get('x-user-role');
    if (userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get('limit') || '100');
    const page = parseInt(url.searchParams.get('page') || '1');
    const skip = (page - 1) * limit;
    const search = url.searchParams.get('search') || '';
    const roleFilter = url.searchParams.get('role') || '';
    const dateFrom = url.searchParams.get('dateFrom') || '';
    const dateTo = url.searchParams.get('dateTo') || '';

    // Build where clause
    const where: Record<string, unknown> = {};

    if (search) {
      where.userName = { contains: search };
    }

    if (roleFilter) {
      where.userRole = roleFilter;
    }

    if (dateFrom || dateTo) {
      where.loginAt = {};
      if (dateFrom) {
        (where.loginAt as Record<string, unknown>).gte = new Date(dateFrom);
      }
      if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        (where.loginAt as Record<string, unknown>).lte = toDate;
      }
    }

    const [logs, total] = await Promise.all([
      db.visitorLog.findMany({
        where,
        orderBy: { loginAt: 'desc' },
        skip,
        take: limit,
        // Include the user's photo + gender so the admin visitor table can
        // render the same UserPhoto component used elsewhere (Kelola User,
        // Monitoring, etc.). Falls back to gender avatar / school logo /
        // initials inside the component if no photo is set.
        include: {
          user: {
            select: { image: true, jenisKelamin: true },
          },
        },
      }),
      db.visitorLog.count({ where }),
    ]);

    // Format duration for each log
    const formattedLogs = logs.map((log) => {
      let durationStr = '-';
      if (log.logoutAt && log.durationSeconds !== null) {
        const hours = Math.floor(log.durationSeconds / 3600);
        const minutes = Math.floor((log.durationSeconds % 3600) / 60);
        const seconds = log.durationSeconds % 60;
        durationStr = `${hours}j ${minutes}m ${seconds}d`;
      } else if (!log.logoutAt) {
        // Still active — calculate from loginAt to now
        const now = new Date();
        const diffMs = now.getTime() - new Date(log.loginAt).getTime();
        const diffSec = Math.floor(diffMs / 1000);
        const hours = Math.floor(diffSec / 3600);
        const minutes = Math.floor((diffSec % 3600) / 60);
        const seconds = diffSec % 60;
        durationStr = `${hours}j ${minutes}m ${seconds}d (aktif)`;
      }

      return {
        id: log.id,
        userId: log.userId,
        userName: log.userName,
        userRole: log.userRole,
        // Photo + gender come from the included user relation (null if the
        // user was deleted but logs remain, or if no photo was uploaded).
        userImage: log.user?.image ?? null,
        userJenisKelamin: log.user?.jenisKelamin ?? null,
        loginAt: log.loginAt,
        logoutAt: log.logoutAt,
        durationSeconds: log.durationSeconds,
        durationStr,
        isActive: !log.logoutAt,
        deviceType: log.deviceType || '',
        deviceBrand: log.deviceBrand || '',
        deviceModel: log.deviceModel || '',
        deviceOS: log.deviceOS || '',
        browser: log.browser || '',
        userAgent: log.userAgent || '',
      };
    });

    // Get summary stats
    const totalVisits = total;
    const activeNow = await db.visitorLog.count({
      where: { logoutAt: null },
    });

    return NextResponse.json({
      logs: formattedLogs,
      total,
      page,
      limit,
      stats: {
        totalVisits,
        activeNow,
      },
    });
  } catch (error) {
    console.error('Get visitor logs error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}

// DELETE /api/admin/visitors
// Supports multiple deletion modes via JSON body:
//   { mode: "ids",        ids: string[] }                      -> delete specific entries by ID
//   { mode: "olderThan",  days: number }                       -> delete entries older than N days
//   { mode: "dateRange",  dateFrom?: string, dateTo?: string } -> delete entries within a date range
//   { mode: "all" }                                             -> delete ALL visitor logs
export async function DELETE(req: NextRequest) {
  try {
    const userRole = req.headers.get('x-user-role');
    if (userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const mode = body?.mode as string | undefined;

    let deletedCount = 0;

    if (mode === 'ids' || mode === 'selected') {
      const ids = Array.isArray(body?.ids) ? (body.ids as unknown[]).filter(Boolean) : [];
      if (ids.length === 0) {
        return NextResponse.json(
          { error: 'Tidak ada ID yang dipilih untuk dihapus' },
          { status: 400 }
        );
      }
      const result = await db.visitorLog.deleteMany({
        where: { id: { in: ids as string[] } },
      });
      deletedCount = result.count;
    } else if (mode === 'olderThan') {
      const days = Number(body?.days);
      if (!Number.isFinite(days) || days <= 0) {
        return NextResponse.json(
          { error: 'Jumlah hari tidak valid' },
          { status: 400 }
        );
      }
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      const result = await db.visitorLog.deleteMany({
        where: { loginAt: { lt: cutoff } },
      });
      deletedCount = result.count;
    } else if (mode === 'dateRange') {
      const dateFrom = body?.dateFrom as string | undefined;
      const dateTo = body?.dateTo as string | undefined;
      if (!dateFrom && !dateTo) {
        return NextResponse.json(
          { error: 'Tanggal mulai dan/atau tanggal akhir harus diisi' },
          { status: 400 }
        );
      }
      const loginAt: Record<string, Date> = {};
      if (dateFrom) loginAt.gte = new Date(dateFrom);
      if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        loginAt.lte = toDate;
      }
      const result = await db.visitorLog.deleteMany({ where: { loginAt } });
      deletedCount = result.count;
    } else if (mode === 'all') {
      const result = await db.visitorLog.deleteMany({});
      deletedCount = result.count;
    } else {
      return NextResponse.json(
        { error: 'Mode penghapusan tidak valid' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      deletedCount,
    });
  } catch (error) {
    console.error('Delete visitor logs error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan server saat menghapus log visitor' },
      { status: 500 }
    );
  }
}
