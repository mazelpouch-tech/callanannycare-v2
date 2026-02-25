import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from './_db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const sql = getDb();

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // GET: Return VAPID public key (read env directly — no web-push dependency)
    if (req.method === 'GET') {
      const vapidPublicKey = process.env.VAPID_PUBLIC_KEY || '';
      return res.status(200).json({ vapidPublicKey });
    }

    // POST: Save push subscription (upsert by endpoint)
    if (req.method === 'POST') {
      const { user_type, user_id, subscription } = req.body as {
        user_type: 'admin' | 'nanny';
        user_id: number;
        subscription: { endpoint: string; keys: { p256dh: string; auth: string } };
      };

      if (!user_type || !user_id || !subscription?.endpoint || !subscription?.keys) {
        return res.status(400).json({ error: 'user_type, user_id, and subscription are required' });
      }

      await sql`
        INSERT INTO push_subscriptions (user_type, user_id, endpoint, p256dh, auth, user_agent, updated_at)
        VALUES (
          ${user_type},
          ${user_id},
          ${subscription.endpoint},
          ${subscription.keys.p256dh},
          ${subscription.keys.auth},
          ${req.headers['user-agent'] || ''},
          NOW()
        )
        ON CONFLICT (endpoint) DO UPDATE SET
          user_type = ${user_type},
          user_id = ${user_id},
          p256dh = ${subscription.keys.p256dh},
          auth = ${subscription.keys.auth},
          user_agent = ${req.headers['user-agent'] || ''},
          updated_at = NOW()
      `;

      return res.status(200).json({ success: true });
    }

    // DELETE: Remove push subscription
    if (req.method === 'DELETE') {
      const { endpoint } = req.body as { endpoint: string };
      if (!endpoint) return res.status(400).json({ error: 'endpoint is required' });

      await sql`DELETE FROM push_subscriptions WHERE endpoint = ${endpoint}`;
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Push API error:', message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
