import { getDb } from '../_db.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const sql = getDb();

    if (req.method === 'GET') {
      const { nannyId } = req.query;
      if (!nannyId) return res.status(400).json({ error: 'nannyId is required' });

      const result = await sql`
        SELECT id, name, email, location, rating, bio, specialties, languages, rate, image, experience, available, created_at
        FROM nannies WHERE id = ${nannyId}
      `;
      if (result.length === 0) return res.status(404).json({ error: 'Nanny not found' });
      return res.status(200).json(result[0]);
    }

    if (req.method === 'PUT') {
      const { nannyId, bio, languages, specialties, image, available, changePin, currentPin, newPin } = req.body;
      if (!nannyId) return res.status(400).json({ error: 'nannyId is required' });

      // Handle PIN change
      if (changePin) {
        if (!currentPin || !newPin) return res.status(400).json({ error: 'Current and new PIN required' });
        if (newPin.length < 4 || newPin.length > 6) return res.status(400).json({ error: 'PIN must be 4-6 digits' });

        const nanny = await sql`SELECT pin FROM nannies WHERE id = ${nannyId}`;
        if (nanny.length === 0) return res.status(404).json({ error: 'Nanny not found' });
        if (nanny[0].pin !== currentPin) return res.status(403).json({ error: 'Current PIN is incorrect' });

        await sql`UPDATE nannies SET pin = ${newPin}, updated_at = NOW() WHERE id = ${nannyId}`;
        return res.status(200).json({ success: true, message: 'PIN updated' });
      }

      const result = await sql`
        UPDATE nannies SET
          bio = COALESCE(${bio}, bio),
          languages = COALESCE(${languages ? JSON.stringify(languages) : null}, languages),
          specialties = COALESCE(${specialties ? JSON.stringify(specialties) : null}, specialties),
          image = COALESCE(${image}, image),
          available = COALESCE(${available}, available),
          updated_at = NOW()
        WHERE id = ${nannyId}
        RETURNING id, name, email, location, rating, bio, specialties, languages, rate, image, experience, available
      `;
      if (result.length === 0) return res.status(404).json({ error: 'Nanny not found' });
      return res.status(200).json(result[0]);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Nanny profile error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
