import { getDb } from '../_db.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const sql = getDb();
    const { email, pin } = req.body;
    
    if (!email || !pin) {
      return res.status(400).json({ error: 'Email and PIN are required' });
    }

    const result = await sql`
      SELECT id, name, email, image, location, rating, experience, bio, specialties, languages, rate, available
      FROM nannies WHERE email = ${email} AND pin = ${pin}
    `;
    
    if (result.length === 0) {
      return res.status(401).json({ error: 'Invalid email or PIN' });
    }

    const nanny = result[0];
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
      }
    });
  } catch (error) {
    console.error('Nanny login error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
