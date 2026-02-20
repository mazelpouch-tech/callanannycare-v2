import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from './_db.js';

interface CountRow { count: string }

export default async function handler(req: VercelRequest, res: VercelResponse) {
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

    // Add phone column
    await sql`ALTER TABLE nannies ADD COLUMN IF NOT EXISTS phone VARCHAR(50) DEFAULT ''`;

    // Add invitation & access control columns
    await sql`ALTER TABLE nannies ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active'`;
    await sql`ALTER TABLE nannies ADD COLUMN IF NOT EXISTS invite_token VARCHAR(64)`;
    await sql`ALTER TABLE nannies ADD COLUMN IF NOT EXISTS invite_token_expires TIMESTAMP`;
    await sql`ALTER TABLE nannies ADD COLUMN IF NOT EXISTS invited_at TIMESTAMP`;
    await sql`ALTER TABLE nannies ADD COLUMN IF NOT EXISTS registered_at TIMESTAMP`;

    // Backfill existing nannies to 'active'
    await sql`UPDATE nannies SET status = 'active', registered_at = NOW() WHERE pin IS NOT NULL AND pin != '' AND status IS NULL`;

    // Add clock in/out columns to bookings
    await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS clock_in TIMESTAMPTZ`;
    await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS clock_out TIMESTAMPTZ`;

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

    // Create admin_users table
    await sql`
      CREATE TABLE IF NOT EXISTS admin_users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'admin',
        is_active BOOLEAN DEFAULT true,
        last_login TIMESTAMP,
        login_count INTEGER DEFAULT 0,
        reset_token VARCHAR(64),
        reset_token_expires TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // Seed default admin user if none exists
    const adminExists = await sql`SELECT COUNT(*) as count FROM admin_users` as CountRow[];
    if (parseInt(adminExists[0].count) === 0) {
      await sql`
        INSERT INTO admin_users (name, email, password, role, is_active)
        VALUES ('Admin', 'admin@callananny.ma', 'admin123', 'super_admin', true)
      `;
    }

    // Delete old generic nannies and replace with real ones
    await sql`DELETE FROM nannies WHERE name IN ('Fatima Zahra', 'Amina Benali', 'Sara Tazi', 'Khadija Alami', 'Nadia Moussaoui', 'Houda El Fassi', 'Fatima Zahra El Idrissi', 'Amina Bouziane', 'Sara Lamrani', 'Khadija Ait Ouahmane', 'Nadia Berrada', 'Houda Chraibi')`;

    // Check if real nannies already exist
    const sanaeExists = await sql`SELECT COUNT(*) as count FROM nannies WHERE name = 'Sanae'` as CountRow[];
    if (parseInt(sanaeExists[0].count) === 0) {
      // Insert real nannies
      await sql`
        INSERT INTO nannies (name, location, rating, bio, specialties, languages, rate, image, experience, available, phone, email, pin, status) VALUES
        ('Sanae', 'Gueliz, Marrakech', 4.9, 'Sanae is a dedicated and experienced nanny with a warm approach to childcare. She is great with children of all ages and ensures a safe, fun environment.', '["Early Childhood","First Aid Certified","Creative Activities"]', '["Arabic","French","English"]', 150, '', '5 years', true, '+212 631 363 797', 'sanae@callanannycare.com', '123456', 'active'),
        ('Fatima Zahra', 'Hivernage, Marrakech', 4.8, 'Fatima Zahra is an experienced childcare professional who specializes in early childhood development and speaks fluent French and English.', '["Early Childhood","Montessori","Newborn Care"]', '["Arabic","French","English"]', 150, '', '8 years', true, '+212 674 666 498', 'fatimazahra@callanannycare.com', '123456', 'active'),
        ('Majda', 'Medina, Marrakech', 4.7, 'Majda brings creativity and patience to every family she works with. She loves outdoor activities and has a gentle approach with toddlers.', '["Outdoor Activities","Toddler Specialist","Pediatric First Aid"]', '["Arabic","French"]', 150, '', '4 years', true, '+212 677 191 510', 'majda@callanannycare.com', '123456', 'active'),
        ('Hayat', 'Palmeraie, Marrakech', 4.9, 'Hayat has extensive experience working with international families and luxury hotel guests. She provides premium childcare with attention to every detail.', '["Premium Care","Hotel Experience","Multiple Children"]', '["Arabic","French","English"]', 150, '', '10 years', true, '+212 672 456 927', 'hayat@callanannycare.com', '123456', 'active'),
        ('Naima', 'Amelkis, Marrakech', 4.6, 'Naima specializes in infant care and has completed advanced training in newborn care. She is calm, patient, and incredibly nurturing.', '["Infant Specialist","Night Care","Sleep Training"]', '["Arabic","French"]', 150, '', '6 years', true, '+212 639 196 589', 'naima@callanannycare.com', '123456', 'active'),
        ('Laila', 'Targa, Marrakech', 4.8, 'Laila is a multilingual nanny who loves introducing children to Moroccan culture through stories, songs, and creative play.', '["Cultural Activities","Storytelling","School-Age Children"]', '["Arabic","French","English"]', 150, '', '7 years', true, '+212 668 932 117', 'laila@callanannycare.com', '123456', 'active'),
        ('Samira', 'Gueliz, Marrakech', 4.8, 'Samira brings warmth and energy to every family. With a background in education, she creates engaging activities that children love.', '["Creative Activities","Education Background","Multiple Children"]', '["Arabic","French","English"]', 150, '', '5 years', true, '+212 661 744 300', 'samira@callanannycare.com', '123456', 'active')
      `;
    }

    const existing = await sql`SELECT COUNT(*) as count FROM nannies` as CountRow[];
    return res.status(200).json({ message: 'Database updated with real nanny names and phone numbers', nannies: parseInt(existing[0].count) });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Seed error:', error);
    return res.status(500).json({ error: message });
  }
}
