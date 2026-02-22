import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from '../_db.js';
import crypto from 'crypto';
import type { DbNanny } from '@/types';
import { sendInviteEmail } from '../_emailTemplates.js';

interface InviteCreateBody {
  name: string;
  email: string;
}

interface InviteResendBody {
  nannyId: number;
}

interface InviteRegisterBody {
  token: string;
  pin: string;
  name?: string;
  age?: string;
  phone?: string;
  bio?: string;
  languages?: string[];
  specialties?: string[];
  image?: string;
  location?: string;
  experience?: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const sql = getDb();

  try {
    // GET: Validate invite token and return nanny info (for registration page)
    if (req.method === 'GET') {
      const { token } = req.query;
      if (!token) {
        return res.status(400).json({ error: 'Token is required' });
      }

      const result = await sql`
        SELECT id, name, email, invite_token_expires
        FROM nannies
        WHERE invite_token = ${token} AND status = 'invited'
      ` as DbNanny[];

      if (result.length === 0) {
        return res.status(400).json({ error: 'Invalid or already used invitation link' });
      }

      const nanny = result[0];
      if (nanny.invite_token_expires && new Date(nanny.invite_token_expires) < new Date()) {
        return res.status(400).json({ error: 'This invitation has expired. Please contact the admin for a new one.' });
      }

      return res.status(200).json({ success: true, name: nanny.name, email: nanny.email });
    }

    // POST: Create a new invitation
    if (req.method === 'POST') {
      const { name, email } = req.body as InviteCreateBody;

      if (!name || !email) {
        return res.status(400).json({ error: 'Name and email are required' });
      }

      const existing = await sql`SELECT id, status FROM nannies WHERE LOWER(email) = LOWER(${email})` as DbNanny[];
      if (existing.length > 0) {
        return res.status(409).json({ error: 'A nanny with this email already exists' });
      }

      const inviteToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      const result = await sql`
        INSERT INTO nannies (name, email, status, invite_token, invite_token_expires, invited_at, pin, available)
        VALUES (${name}, ${email}, 'invited', ${inviteToken}, ${expiresAt.toISOString()}, NOW(), '', false)
        RETURNING id, name, email, status
      ` as DbNanny[];

      const nanny = result[0];
      const host = req.headers.host || 'callanannycare.vercel.app';
      const protocol = host.includes('localhost') ? 'http' : 'https';
      const inviteLink = `${protocol}://${host}/nanny/register?token=${inviteToken}`;

      // Send invite email (best-effort)
      let emailSent = false;
      try {
        emailSent = await sendInviteEmail({
          nannyName: name,
          nannyEmail: email,
          inviteLink,
        });
      } catch (err) {
        console.error('Failed to send invite email:', err);
      }

      return res.status(201).json({
        success: true,
        inviteLink,
        emailSent,
        nanny: { id: nanny.id, name: nanny.name, email: nanny.email, status: nanny.status }
      });
    }

    // PUT: Resend / regenerate invitation
    if (req.method === 'PUT') {
      const { nannyId } = req.body as InviteResendBody;

      if (!nannyId) {
        return res.status(400).json({ error: 'nannyId is required' });
      }

      const existing = await sql`SELECT id, name, email, status FROM nannies WHERE id = ${nannyId}` as DbNanny[];
      if (existing.length === 0) {
        return res.status(404).json({ error: 'Nanny not found' });
      }
      if (existing[0].status !== 'invited') {
        return res.status(400).json({ error: 'Can only resend invitations for nannies with invited status' });
      }

      const inviteToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      await sql`
        UPDATE nannies SET
          invite_token = ${inviteToken},
          invite_token_expires = ${expiresAt.toISOString()},
          invited_at = NOW()
        WHERE id = ${nannyId}
      `;

      const host = req.headers.host || 'callanannycare.vercel.app';
      const protocol = host.includes('localhost') ? 'http' : 'https';
      const inviteLink = `${protocol}://${host}/nanny/register?token=${inviteToken}`;

      // Re-send invite email (best-effort)
      let emailSent = false;
      try {
        emailSent = await sendInviteEmail({
          nannyName: existing[0].name,
          nannyEmail: existing[0].email!,
          inviteLink,
        });
      } catch (err) {
        console.error('Failed to resend invite email:', err);
      }

      return res.status(200).json({
        success: true,
        inviteLink,
        emailSent,
        nanny: { id: existing[0].id, name: existing[0].name, email: existing[0].email }
      });
    }

    // PATCH: Complete registration (nanny sets PIN + profile)
    if (req.method === 'PATCH') {
      const { token, pin, name, age, phone, bio, languages, specialties, image, location, experience } = req.body as InviteRegisterBody;

      if (!token) {
        return res.status(400).json({ error: 'Invitation token is required' });
      }
      if (!pin || pin.length < 4 || pin.length > 6 || !/^\d+$/.test(pin)) {
        return res.status(400).json({ error: 'PIN must be 4-6 digits' });
      }

      const result = await sql`
        SELECT id, name, email, invite_token_expires
        FROM nannies
        WHERE invite_token = ${token} AND status = 'invited'
      ` as DbNanny[];

      if (result.length === 0) {
        return res.status(400).json({ error: 'Invalid or already used invitation link' });
      }

      const nanny = result[0];
      if (nanny.invite_token_expires && new Date(nanny.invite_token_expires) < new Date()) {
        return res.status(400).json({ error: 'This invitation has expired. Please contact the admin for a new one.' });
      }

      const updated = await sql`
        UPDATE nannies SET
          pin = ${pin},
          name = COALESCE(${name || null}, name),
          age = COALESCE(${age || null}, age),
          phone = COALESCE(${phone || null}, phone),
          bio = COALESCE(${bio || null}, bio),
          languages = COALESCE(${languages ? JSON.stringify(languages) : null}, languages),
          specialties = COALESCE(${specialties ? JSON.stringify(specialties) : null}, specialties),
          image = COALESCE(${image || null}, image),
          location = COALESCE(${location || null}, location),
          experience = COALESCE(${experience || null}, experience),
          status = 'active',
          available = true,
          invite_token = NULL,
          invite_token_expires = NULL,
          registered_at = NOW(),
          updated_at = NOW()
        WHERE id = ${nanny.id}
        RETURNING id, name, email
      ` as DbNanny[];

      return res.status(200).json({
        success: true,
        message: 'Registration complete! You can now log in.',
        nanny: { id: updated[0].id, name: updated[0].name, email: updated[0].email }
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Invite error:', message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
