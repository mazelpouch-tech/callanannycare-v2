import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from './_db.js';

interface CountRow { count: string }
interface RateRow { rate: number }
interface BookingRow { id: number; start_time: string; end_time: string; date: string; end_date: string | null; total_price: number }

export default async function seedHandler(req: VercelRequest, res: VercelResponse) {
  const sql = getDb();

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
        rate INTEGER DEFAULT 10,
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

    // Add age column and widen image to TEXT for base64 photos
    await sql`ALTER TABLE nannies ADD COLUMN IF NOT EXISTS age VARCHAR(10)`;
    await sql`ALTER TABLE nannies ALTER COLUMN image TYPE TEXT`;

    // Add clock in/out columns to bookings
    await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS clock_in TIMESTAMPTZ`;
    await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS clock_out TIMESTAMPTZ`;

    // Add end_date column for multi-day bookings
    await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS end_date VARCHAR(20)`;

    // Add created_by tracking (parent, nanny, admin)
    await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS created_by VARCHAR(20) DEFAULT 'parent'`;
    await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS created_by_name VARCHAR(255) DEFAULT ''`;

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

    // Create login_logs table for audit trail
    await sql`
      CREATE TABLE IF NOT EXISTS login_logs (
        id SERIAL PRIMARY KEY,
        user_type VARCHAR(20) NOT NULL,
        user_id INTEGER,
        user_email VARCHAR(255),
        user_name VARCHAR(255),
        action VARCHAR(50) NOT NULL,
        ip_address VARCHAR(50),
        user_agent TEXT,
        details TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // ─── Nanny Blocked Dates & Reminder Tracking ────────────────────
    await sql`
      CREATE TABLE IF NOT EXISTS nanny_blocked_dates (
        id SERIAL PRIMARY KEY,
        nanny_id INTEGER REFERENCES nannies(id) ON DELETE CASCADE,
        date VARCHAR(20) NOT NULL,
        reason VARCHAR(255) DEFAULT '',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_nanny_blocked_unique ON nanny_blocked_dates(nanny_id, date)`;
    await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN DEFAULT false`;
    await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS locale VARCHAR(10) DEFAULT 'en'`;

    // ─── Cancellation Tracking ────────────────────────────────────────
    await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ`;
    await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancellation_reason TEXT DEFAULT ''`;
    await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancelled_by VARCHAR(20) DEFAULT ''`;
    // ────────────────────────────────────────────────────────────────

    // ─── Created By Tracking ──────────────────────────────────────────
    await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS created_by VARCHAR(100) DEFAULT ''`;
    // Backfill: set empty created_by to 'Admin' for existing bookings
    await sql`UPDATE bookings SET created_by = 'Admin' WHERE created_by = '' OR created_by IS NULL`;
    // ────────────────────────────────────────────────────────────────

    // ─── Nanny Reviews ─────────────────────────────────────────────
    await sql`
      CREATE TABLE IF NOT EXISTS nanny_reviews (
        id SERIAL PRIMARY KEY,
        booking_id INTEGER REFERENCES bookings(id) ON DELETE CASCADE,
        nanny_id INTEGER REFERENCES nannies(id) ON DELETE CASCADE,
        client_name VARCHAR(255) NOT NULL,
        client_email VARCHAR(255),
        rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
        comment TEXT DEFAULT '',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_review_booking_unique ON nanny_reviews(booking_id)`;
    await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS review_token VARCHAR(64)`;
    await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS review_sent_at TIMESTAMPTZ`;
    // ────────────────────────────────────────────────────────────────

    // ─── Payment Reconciliation ──────────────────────────────────────
    await sql`
      CREATE TABLE IF NOT EXISTS booking_payments (
        id SERIAL PRIMARY KEY,
        booking_id INTEGER REFERENCES bookings(id) ON DELETE CASCADE,
        amount INTEGER NOT NULL,
        currency VARCHAR(5) DEFAULT 'EUR',
        method VARCHAR(20) DEFAULT 'cash',
        received_by VARCHAR(255) DEFAULT '',
        note TEXT DEFAULT '',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_booking_payments ON booking_payments(booking_id)`;

    await sql`
      CREATE TABLE IF NOT EXISTS booking_payouts (
        id SERIAL PRIMARY KEY,
        booking_id INTEGER REFERENCES bookings(id) ON DELETE CASCADE,
        nanny_id INTEGER REFERENCES nannies(id) ON DELETE SET NULL,
        amount INTEGER NOT NULL,
        currency VARCHAR(5) DEFAULT 'DH',
        method VARCHAR(20) DEFAULT 'cash',
        paid_by VARCHAR(255) DEFAULT '',
        note TEXT DEFAULT '',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_booking_payouts ON booking_payouts(booking_id)`;
    // ────────────────────────────────────────────────────────────────

    // ─── Push Subscriptions ─────────────────────────────────────────
    await sql`
      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id SERIAL PRIMARY KEY,
        user_type VARCHAR(20) NOT NULL,
        user_id INTEGER NOT NULL,
        endpoint TEXT NOT NULL UNIQUE,
        p256dh TEXT NOT NULL,
        auth TEXT NOT NULL,
        user_agent TEXT DEFAULT '',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_push_subs_user ON push_subscriptions(user_type, user_id)`;
    // ────────────────────────────────────────────────────────────────

    // ─── MAD → EUR Price Migration ──────────────────────────────────
    await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS price_migrated_to_eur BOOLEAN DEFAULT true`;
    await sql`ALTER TABLE bookings ALTER COLUMN price_migrated_to_eur SET DEFAULT true`;

    const nannyRates = await sql`SELECT rate FROM nannies WHERE rate > 50 LIMIT 1` as RateRow[];
    const needsMigration = nannyRates.length > 0;

    let migrated = 0;
    if (needsMigration) {
      const result = await sql`
        UPDATE bookings
        SET total_price = GREATEST(ROUND(total_price::numeric / 15), 1),
            price_migrated_to_eur = true
        WHERE price_migrated_to_eur = false
          AND total_price > 0
      `;
      migrated = (result as unknown as { count?: number })?.count || 0;

      await sql`UPDATE bookings SET price_migrated_to_eur = true WHERE price_migrated_to_eur = false`;
      await sql`UPDATE nannies SET rate = 10 WHERE rate > 50`;
    }
    // ────────────────────────────────────────────────────────────────

    // ─── Price Repair ─────────────────────────────────────────────
    const REPAIR_RATE = 10;
    const REPAIR_TAXI = 10;
    let repaired = 0;
    const bookingsToCheck = await sql`
      SELECT id, start_time, end_time, date, end_date, COALESCE(total_price, 0) as total_price
      FROM bookings
      WHERE start_time LIKE '%h%' AND end_time LIKE '%h%'
        AND start_time != '' AND end_time != ''
    ` as BookingRow[];

    for (const b of bookingsToCheck) {
      try {
        const [sh, sm] = b.start_time.split('h').map(Number);
        const [eh, em] = b.end_time.split('h').map(Number);
        if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) continue;
        const hours = Math.max(0, (eh + em / 60) - (sh + sm / 60));
        if (hours <= 0) continue;

        let dayCount = 1;
        if (b.end_date && b.end_date !== b.date) {
          const startMs = new Date(b.date).getTime();
          const endMs = new Date(b.end_date).getTime();
          if (!isNaN(startMs) && !isNaN(endMs)) {
            dayCount = Math.max(1, Math.round((endMs - startMs) / 86400000) + 1);
          }
        }

        const isEvening = eh > 19 || (eh === 19 && em > 0) || sh < 7;
        const taxiFee = isEvening ? REPAIR_TAXI * dayCount : 0;
        const expectedPrice = Math.round(REPAIR_RATE * hours * dayCount + taxiFee);

        if (expectedPrice > 0 && b.total_price !== expectedPrice) {
          await sql`UPDATE bookings SET total_price = ${expectedPrice} WHERE id = ${b.id}`;
          repaired++;
        }
      } catch { /* skip unparseable */ }
    }
    // ────────────────────────────────────────────────────────────────

    // Seed default admin user if none exists
    const adminExists = await sql`SELECT COUNT(*) as count FROM admin_users` as CountRow[];
    if (parseInt(adminExists[0].count) === 0) {
      await sql`
        INSERT INTO admin_users (name, email, password, role, is_active)
        VALUES ('Admin', 'admin@callananny.ma', 'admin123', 'super_admin', true)
      `;
    }

    // Seed supervisor account (Doha) — create or fix if exists with wrong role
    const dohaCheck = await sql`SELECT id, role FROM admin_users WHERE LOWER(email) = 'doha@callanannycare.com'` as { id: number; role: string }[];
    if (dohaCheck.length === 0) {
      await sql`
        INSERT INTO admin_users (name, email, password, role, is_active)
        VALUES ('Doha', 'doha@callanannycare.com', 'doha2024', 'supervisor', true)
      `;
    } else if (dohaCheck[0].role !== 'supervisor') {
      await sql`
        UPDATE admin_users SET role = 'supervisor', is_active = true, password = 'doha2024', updated_at = NOW()
        WHERE id = ${dohaCheck[0].id}
      `;
    }

    // Delete old generic nannies and replace with real ones
    await sql`DELETE FROM nannies WHERE name IN ('Fatima Zahra', 'Amina Benali', 'Sara Tazi', 'Khadija Alami', 'Nadia Moussaoui', 'Houda El Fassi', 'Fatima Zahra El Idrissi', 'Amina Bouziane', 'Sara Lamrani', 'Khadija Ait Ouahmane', 'Nadia Berrada', 'Houda Chraibi')`;

    // Check if real nannies already exist
    const sanaeExists = await sql`SELECT COUNT(*) as count FROM nannies WHERE name = 'Sanae'` as CountRow[];
    if (parseInt(sanaeExists[0].count) === 0) {
      // Insert real nannies (rate = 10€/hr)
      await sql`
        INSERT INTO nannies (name, location, rating, bio, specialties, languages, rate, image, experience, available, phone, email, pin, status) VALUES
        ('Sanae', 'Gueliz, Marrakech', 4.9, 'Sanae is a dedicated and experienced nanny with a warm approach to childcare. She is great with children of all ages and ensures a safe, fun environment.', '["Early Childhood","First Aid Certified","Creative Activities"]', '["Arabic","French","English"]', 10, '', '5 years', true, '+212 631 363 797', 'sanae@callanannycare.com', '123456', 'active'),
        ('Fatima Zahra', 'Hivernage, Marrakech', 4.8, 'Fatima Zahra is an experienced childcare professional who specializes in early childhood development and speaks fluent French and English.', '["Early Childhood","Montessori","Newborn Care"]', '["Arabic","French","English"]', 10, '', '8 years', true, '+212 674 666 498', 'fatimazahra@callanannycare.com', '123456', 'active'),
        ('Majda', 'Medina, Marrakech', 4.7, 'Majda brings creativity and patience to every family she works with. She loves outdoor activities and has a gentle approach with toddlers.', '["Outdoor Activities","Toddler Specialist","Pediatric First Aid"]', '["Arabic","French"]', 10, '', '4 years', true, '+212 677 191 510', 'majda@callanannycare.com', '123456', 'active'),
        ('Hayat', 'Palmeraie, Marrakech', 4.9, 'Hayat has extensive experience working with international families and luxury hotel guests. She provides premium childcare with attention to every detail.', '["Premium Care","Hotel Experience","Multiple Children"]', '["Arabic","French","English"]', 10, '', '10 years', true, '+212 672 456 927', 'hayat@callanannycare.com', '123456', 'active'),
        ('Naima', 'Amelkis, Marrakech', 4.6, 'Naima specializes in infant care and has completed advanced training in newborn care. She is calm, patient, and incredibly nurturing.', '["Infant Specialist","Night Care","Sleep Training"]', '["Arabic","French"]', 10, '', '6 years', true, '+212 639 196 589', 'naima@callanannycare.com', '123456', 'active'),
        ('Laila', 'Targa, Marrakech', 4.8, 'Laila is a multilingual nanny who loves introducing children to Moroccan culture through stories, songs, and creative play.', '["Cultural Activities","Storytelling","School-Age Children"]', '["Arabic","French","English"]', 10, '', '7 years', true, '+212 668 932 117', 'laila@callanannycare.com', '123456', 'active'),
        ('Samira', 'Gueliz, Marrakech', 4.8, 'Samira brings warmth and energy to every family. With a background in education, she creates engaging activities that children love.', '["Creative Activities","Education Background","Multiple Children"]', '["Arabic","French","English"]', 10, '', '5 years', true, '+212 661 744 300', 'samira@callanannycare.com', '123456', 'active')
      `;
    }

    const existing = await sql`SELECT COUNT(*) as count FROM nannies` as CountRow[];
    const parts: string[] = [];
    if (needsMigration) parts.push(`MAD→EUR migration: ${migrated} booking(s) converted, nanny rates updated to 10€/hr`);
    if (repaired > 0) parts.push(`Price repair: ${repaired} booking(s) recalculated`);
    if (parts.length === 0) parts.push('Database up to date');

    return res.status(200).json({
      message: parts.join('. ') + '.',
      nannies: parseInt(existing[0].count),
      migrated: needsMigration,
      repaired,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Seed error:', error);
    return res.status(500).json({ error: message });
  }
}
