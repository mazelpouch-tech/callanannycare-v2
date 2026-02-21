import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from '../_db.js';
import type { DbLoginLog } from '@/types';

interface CountRow { count: string }

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });

  try {
    const sql = getDb();
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '50'), 10)));
    const offset = (page - 1) * limit;
    const userType = req.query.userType as string | undefined;
    const action = req.query.action as string | undefined;
    const search = req.query.search as string | undefined;

    // Build conditions
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (userType && userType !== 'all') {
      conditions.push(`user_type = '${userType === 'admin' ? 'admin' : 'nanny'}'`);
    }
    if (action && action !== 'all') {
      conditions.push(`action = '${action.replace(/[^a-z_]/g, '')}'`);
    }

    const whereClause = conditions.length > 0 ? conditions.join(' AND ') : 'TRUE';

    let rows: DbLoginLog[];
    let total: CountRow[];

    if (search) {
      const pattern = `%${search}%`;
      rows = await sql`
        SELECT * FROM login_logs
        WHERE (${sql(whereClause)}) IS NOT NULL
          AND user_type = COALESCE(${userType && userType !== 'all' ? userType : null}, user_type)
          AND action = COALESCE(${action && action !== 'all' ? action : null}, action)
          AND (user_email ILIKE ${pattern} OR user_name ILIKE ${pattern})
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      ` as DbLoginLog[];
      total = await sql`
        SELECT COUNT(*) as count FROM login_logs
        WHERE user_type = COALESCE(${userType && userType !== 'all' ? userType : null}, user_type)
          AND action = COALESCE(${action && action !== 'all' ? action : null}, action)
          AND (user_email ILIKE ${pattern} OR user_name ILIKE ${pattern})
      ` as CountRow[];
    } else {
      rows = await sql`
        SELECT * FROM login_logs
        WHERE user_type = COALESCE(${userType && userType !== 'all' ? userType : null}, user_type)
          AND action = COALESCE(${action && action !== 'all' ? action : null}, action)
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      ` as DbLoginLog[];
      total = await sql`
        SELECT COUNT(*) as count FROM login_logs
        WHERE user_type = COALESCE(${userType && userType !== 'all' ? userType : null}, user_type)
          AND action = COALESCE(${action && action !== 'all' ? action : null}, action)
      ` as CountRow[];
    }

    return res.status(200).json({
      logs: rows.map(r => ({
        id: r.id,
        userType: r.user_type,
        userId: r.user_id,
        userEmail: r.user_email,
        userName: r.user_name,
        action: r.action,
        ipAddress: r.ip_address,
        userAgent: r.user_agent,
        details: r.details,
        createdAt: r.created_at,
      })),
      total: parseInt(total[0].count),
      page,
      limit,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Login logs error:', message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
