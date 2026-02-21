import { getDb } from './_db.js';

export async function logLoginEvent(params: {
  userType: 'admin' | 'nanny';
  userId?: number | null;
  userEmail?: string | null;
  userName?: string | null;
  action: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  details?: string | null;
}) {
  try {
    const sql = getDb();
    await sql`
      INSERT INTO login_logs (user_type, user_id, user_email, user_name, action, ip_address, user_agent, details)
      VALUES (
        ${params.userType},
        ${params.userId || null},
        ${params.userEmail || null},
        ${params.userName || null},
        ${params.action},
        ${params.ipAddress || null},
        ${params.userAgent || null},
        ${params.details || null}
      )
    `;
  } catch (err) {
    console.error('Audit log failed:', err);
  }
}

export function extractRequestMeta(req: { headers: Record<string, string | string[] | undefined> }) {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : (forwarded?.[0] || null);
  const userAgent = (typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : null);
  return { ip, userAgent };
}
