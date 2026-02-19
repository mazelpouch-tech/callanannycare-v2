import { getDb } from './_db.js';

export default async function handler(req, res) {
  const sql = getDb();
  
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'GET') {
      const nannies = await sql`SELECT * FROM nannies ORDER BY name ASC`;
      return res.status(200).json(nannies);
    }
    
    if (req.method === 'POST') {
      const { name, location, rating, bio, specialties, languages, rate, image, experience, available, email, pin } = req.body;
      const result = await sql`
        INSERT INTO nannies (name, location, rating, bio, specialties, languages, rate, image, experience, available, email, pin)
        VALUES (${name}, ${location}, ${rating || 4.8}, ${bio}, ${JSON.stringify(specialties || [])}, ${JSON.stringify(languages || [])}, ${rate || 150}, ${image || ''}, ${experience || '1 year'}, ${available !== false}, ${email || null}, ${pin || ''})
        RETURNING *
      `;
      return res.status(201).json(result[0]);
    }
    
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Nannies API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
