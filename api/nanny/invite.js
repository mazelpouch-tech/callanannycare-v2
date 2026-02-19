import { getDb } from '../_db.js';
import crypto from 'crypto';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const sql = getDb();

  try {
    // POST: Create a new invitation
    if (req.method === 'POST') {
      const { name, email } = req.body;

      if (!name || !email) {
        return res.status(400).json({ error: 'Name and email are required' });
      }

      // Check for existing nanny with this email
      const existing = await sql`SELECT id, status FROM nannies WHERE email = ${email}`;
      if (existing.length > 0) {
        return res.status(409).json({ error: 'A nanny with this email already exists' });
      }

      // Generate secure invite token (64-char hex)
      const inviteToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      // Create nanny record with invited status
      const result = await sql`
        INSERT INTO nannies (name, email, status, invite_token, invite_token_expires, invited_at, pin, available)
        VALUES (${name}, ${email}, 'invited', ${inviteToken}, ${expiresAt.toISOString()}, NOW(), '', false)
        RETURNING id, name, email, status
      `;

      const nanny = result[0];
      const host = req.headers.host || 'dazzling-bouman.vercel.app';
      const protocol = host.includes('localhost') ? 'http' : 'https';
      const inviteLink = `${protocol}://${host}/nanny/register?token=${inviteToken}`;

      return res.status(201).json({
        success: true,
        inviteLink,
        nanny: { id: nanny.id, name: nanny.name, email: nanny.email, status: nanny.status }
      });
    }

    // PUT: Resend / regenerate invitation
    if (req.method === 'PUT') {
      const { nannyId } = req.body;

      if (!nannyId) {
        return res.status(400).json({ error: 'nannyId is required' });
      }

      // Verify nanny exists and is in invited status
      const existing = await sql`SELECT id, name, email, status FROM nannies WHERE id = ${nannyId}`;
      if (existing.length === 0) {
        return res.status(404).json({ error: 'Nanny not found' });
      }
      if (existing[0].status !== 'invited') {
        return res.status(400).json({ error: 'Can only resend invitations for nannies with invited status' });
      }

      // Generate new token
      const inviteToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      await sql`
        UPDATE nannies SET
          invite_token = ${inviteToken},
          invite_token_expires = ${expiresAt.toISOString()},
          invited_at = NOW()
        WHERE id = ${nannyId}
      `;

      const host = req.headers.host || 'dazzling-bouman.vercel.app';
      const protocol = host.includes('localhost') ? 'http' : 'https';
      const inviteLink = `${protocol}://${host}/nanny/register?token=${inviteToken}`;

      return res.status(200).json({
        success: true,
        inviteLink,
        nanny: { id: existing[0].id, name: existing[0].name, email: existing[0].email }
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Invite error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
