import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from '../_db.js';
import type { DbNanny } from '@/types';
import { logLoginEvent, extractRequestMeta } from '../_auditLog.js';

interface NannyLoginBody {
  email: string;
  pin: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const sql = getDb();
    const { email, pin } = req.body as NannyLoginBody;

    if (!email || !pin) {
      return res.status(400).json({ error: 'Email and PIN are required' });
    }

    const { ip, userAgent } = extractRequestMeta(req);

    const result = await sql`
      SELECT id, name, email, image, location, rating, experience, bio, specialties, languages, rate, available, status
      FROM nannies WHERE email = ${email} AND pin = ${pin}
    ` as DbNanny[];

    if (result.length === 0) {
      await logLoginEvent({ userType: 'nanny', userEmail: email, action: 'login_failed', ipAddress: ip, userAgent, details: 'Invalid email or PIN' });
      return res.status(401).json({ error: 'Invalid email or PIN' });
    }

    const nanny = result[0];

    // Access control: block login for non-active nannies
    if (nanny.status === 'blocked') {
      await logLoginEvent({ userType: 'nanny', userId: nanny.id, userEmail: email, userName: nanny.name, action: 'login_failed', ipAddress: ip, userAgent, details: 'Account blocked' });
      return res.status(403).json({ error: 'Your account has been suspended. Please contact the admin.' });
    }
    if (nanny.status === 'invited') {
      await logLoginEvent({ userType: 'nanny', userId: nanny.id, userEmail: email, userName: nanny.name, action: 'login_failed', ipAddress: ip, userAgent, details: 'Registration incomplete' });
      return res.status(403).json({ error: 'Please complete your registration using your invitation link.' });
    }

    await logLoginEvent({ userType: 'nanny', userId: nanny.id, userEmail: email, userName: nanny.name, action: 'login_success', ipAddress: ip, userAgent });

    return res.status(200).json({
      success: true,
      nanny: {
        id: nanny.id,
        name: nanny.name,
        email: nanny.email,
        image: nanny.image,
        location: nanny.location,
        rating: nanny.rating,
        experience: nanny.experience,
        status: nanny.status || 'active',
      }
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Nanny login error:', message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
