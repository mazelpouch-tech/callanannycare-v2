import { getDb } from '../_db.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const sql = getDb();
    const { token, pin, bio, languages, specialties, image, location, experience } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Invitation token is required' });
    }
    if (!pin || pin.length < 4 || pin.length > 6 || !/^\d+$/.test(pin)) {
      return res.status(400).json({ error: 'PIN must be 4-6 digits' });
    }

    // Look up the nanny by token
    const result = await sql`
      SELECT id, name, email, invite_token_expires
      FROM nannies
      WHERE invite_token = ${token} AND status = 'invited'
    `;

    if (result.length === 0) {
      return res.status(400).json({ error: 'Invalid or already used invitation link' });
    }

    const nanny = result[0];

    // Check expiry
    if (nanny.invite_token_expires && new Date(nanny.invite_token_expires) < new Date()) {
      return res.status(400).json({ error: 'This invitation has expired. Please contact the admin for a new one.' });
    }

    // Complete registration
    const updated = await sql`
      UPDATE nannies SET
        pin = ${pin},
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
    `;

    return res.status(200).json({
      success: true,
      message: 'Registration complete! You can now log in.',
      nanny: { id: updated[0].id, name: updated[0].name, email: updated[0].email }
    });
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
