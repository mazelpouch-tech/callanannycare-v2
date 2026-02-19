import { getDb } from '../_db.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const sql = getDb();
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    const result = await sql`
      SELECT id, name, email, invite_token_expires
      FROM nannies
      WHERE invite_token = ${token} AND status = 'invited'
    `;

    if (result.length === 0) {
      return res.status(400).json({ error: 'Invalid or already used invitation link' });
    }

    const nanny = result[0];

    // Check if token has expired
    if (nanny.invite_token_expires && new Date(nanny.invite_token_expires) < new Date()) {
      return res.status(400).json({ error: 'This invitation has expired. Please contact the admin for a new one.' });
    }

    return res.status(200).json({
      success: true,
      name: nanny.name,
      email: nanny.email,
    });
  } catch (error) {
    console.error('Invite info error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
