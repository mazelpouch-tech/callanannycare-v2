import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from '../_db.js';
import type { DbNotification } from '@/types';

interface MarkReadBody {
  notificationIds: number[];
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const sql = getDb();

    if (req.method === 'GET') {
      const { nannyId } = req.query;
      if (!nannyId) return res.status(400).json({ error: 'nannyId is required' });

      const notifications = await sql`
        SELECT * FROM nanny_notifications
        WHERE nanny_id = ${nannyId}
        ORDER BY created_at DESC
        LIMIT 50
      ` as DbNotification[];
      return res.status(200).json(notifications);
    }

    if (req.method === 'PUT') {
      const { notificationIds } = req.body as MarkReadBody;
      if (!notificationIds || !Array.isArray(notificationIds) || notificationIds.length === 0) {
        return res.status(400).json({ error: 'notificationIds array is required' });
      }

      await sql`
        UPDATE nanny_notifications SET is_read = true
        WHERE id = ANY(${notificationIds})
      `;
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Nanny notifications error:', message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
