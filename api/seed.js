import { getDb } from './_db.js';

export default async function handler(req, res) {
  const sql = getDb();
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  try {
    // Create tables
    await sql`
      CREATE TABLE IF NOT EXISTS nannies (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        location VARCHAR(255) DEFAULT 'Marrakech',
        rating DECIMAL(2,1) DEFAULT 4.8,
        bio TEXT,
        specialties JSONB DEFAULT '[]',
        languages JSONB DEFAULT '[]',
        rate INTEGER DEFAULT 150,
        image VARCHAR(500) DEFAULT '',
        experience VARCHAR(100) DEFAULT '1 year',
        available BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS bookings (
        id SERIAL PRIMARY KEY,
        nanny_id INTEGER REFERENCES nannies(id) ON DELETE SET NULL,
        client_name VARCHAR(255) NOT NULL,
        client_email VARCHAR(255) NOT NULL,
        client_phone VARCHAR(50) DEFAULT '',
        hotel VARCHAR(255) DEFAULT '',
        date VARCHAR(20) NOT NULL,
        start_time VARCHAR(10) NOT NULL,
        end_time VARCHAR(10) DEFAULT '',
        plan VARCHAR(20) DEFAULT 'hourly',
        children_count INTEGER DEFAULT 1,
        children_ages VARCHAR(255) DEFAULT '',
        notes TEXT DEFAULT '',
        total_price INTEGER DEFAULT 0,
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // Add nanny auth columns if not exists
    await sql`ALTER TABLE nannies ADD COLUMN IF NOT EXISTS email VARCHAR(255)`;
    await sql`ALTER TABLE nannies ADD COLUMN IF NOT EXISTS pin VARCHAR(6) DEFAULT ''`;

    // Create notifications table
    await sql`
      CREATE TABLE IF NOT EXISTS nanny_notifications (
        id SERIAL PRIMARY KEY,
        nanny_id INTEGER REFERENCES nannies(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        booking_id INTEGER REFERENCES bookings(id) ON DELETE SET NULL,
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // Check if nannies already seeded
    const existing = await sql`SELECT COUNT(*) as count FROM nannies`;
    if (parseInt(existing[0].count) > 0) {
      return res.status(200).json({ message: 'Database already seeded', nannies: parseInt(existing[0].count) });
    }

    // Seed nannies
    await sql`
      INSERT INTO nannies (name, location, rating, bio, specialties, languages, rate, image, experience, available) VALUES
      ('Fatima Zahra', 'Gueliz, Marrakech', 4.9, 'Fatima is an experienced childcare professional with over 8 years working with international families. She specializes in early childhood development and speaks fluent English and French.', '["Early Childhood","First Aid Certified","Montessori"]', '["Arabic","French","English"]', 150, 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400&h=400&fit=crop&crop=face', '8 years', true),
      ('Amina Benali', 'Hivernage, Marrakech', 4.8, 'Amina brings warmth and creativity to every family she works with. With a background in education, she creates engaging activities that children love.', '["Creative Activities","Education Background","Newborn Care"]', '["Arabic","French","English","Spanish"]', 150, 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=400&h=400&fit=crop&crop=face', '5 years', true),
      ('Sara Tazi', 'Medina, Marrakech', 4.7, 'Sara is a certified pediatric first-aider with a gentle approach to childcare. She is particularly great with toddlers and loves outdoor activities.', '["Outdoor Activities","Pediatric First Aid","Toddler Specialist"]', '["Arabic","French","English"]', 150, 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=400&fit=crop&crop=face', '4 years', true),
      ('Khadija Alami', 'Palmeraie, Marrakech', 4.9, 'Khadija has extensive experience with high-profile families and luxury hotel guests. She provides premium childcare with attention to every detail.', '["Premium Care","Hotel Experience","Multiple Children"]', '["Arabic","French","English","German"]', 150, 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop&crop=face', '10 years', true),
      ('Nadia Moussaoui', 'Amelkis, Marrakech', 4.6, 'Nadia specializes in caring for infants and has completed advanced training in newborn care. She is calm, patient, and incredibly nurturing.', '["Infant Specialist","Night Care","Sleep Training"]', '["Arabic","French"]', 150, 'https://images.unsplash.com/photo-1509967419530-da38b4704bc6?w=400&h=400&fit=crop&crop=face', '6 years', false),
      ('Houda El Fassi', 'Targa, Marrakech', 4.8, 'Houda is a multilingual nanny who loves introducing children to Moroccan culture through stories, songs, and creative play.', '["Cultural Activities","Storytelling","School-Age Children"]', '["Arabic","French","English","Italian"]', 150, 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop&crop=face', '7 years', true)
    `;

    // Seed nanny login credentials
    await sql`UPDATE nannies SET email = 'fatima@callananny.ma', pin = '123456' WHERE name = 'Fatima Zahra'`;
    await sql`UPDATE nannies SET email = 'amina@callananny.ma', pin = '123456' WHERE name = 'Amina Benali'`;
    await sql`UPDATE nannies SET email = 'sara@callananny.ma', pin = '123456' WHERE name = 'Sara Tazi'`;
    await sql`UPDATE nannies SET email = 'khadija@callananny.ma', pin = '123456' WHERE name = 'Khadija Alami'`;
    await sql`UPDATE nannies SET email = 'nadia@callananny.ma', pin = '123456' WHERE name = 'Nadia Moussaoui'`;
    await sql`UPDATE nannies SET email = 'houda@callananny.ma', pin = '123456' WHERE name = 'Houda El Fassi'`;

    return res.status(200).json({ message: 'Database seeded successfully with 6 nannies and login credentials' });
  } catch (error) {
    console.error('Seed error:', error);
    return res.status(500).json({ error: error.message });
  }
}
