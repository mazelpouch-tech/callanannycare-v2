import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from './_db.js';

interface CountRow { count: string }
interface RateRow { rate: number }
interface BookingRow { id: number; start_time: string; end_time: string; date: string; end_date: string | null; total_price: number }

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

    // ─── MAD → EUR Price Migration ──────────────────────────────────
    // Old pricing was in MAD (150 MAD/hr). New pricing is EUR (10€/hr).
    // Detect if migration is needed by checking nanny rates.
    // If any nanny has rate > 50, it means rates are still in MAD.
    // Convert booking prices (÷15 because 150MAD/hr → 10€/hr)
    // and update nanny rates to 10€.
    await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS price_migrated_to_eur BOOLEAN DEFAULT true`;
    await sql`ALTER TABLE bookings ALTER COLUMN price_migrated_to_eur SET DEFAULT true`;

    const nannyRates = await sql`SELECT rate FROM nannies WHERE rate > 50 LIMIT 1` as RateRow[];
    const needsMigration = nannyRates.length > 0;

    let migrated = 0;
    if (needsMigration) {
      // Convert old MAD booking prices to EUR (divide by 15: 150MAD/hr → 10€/hr)
      // Only convert bookings that haven't been migrated yet
      const result = await sql`
        UPDATE bookings
        SET total_price = GREATEST(ROUND(total_price::numeric / 15), 1),
            price_migrated_to_eur = true
        WHERE price_migrated_to_eur = false
          AND total_price > 0
      `;
      migrated = (result as unknown as { count?: number })?.count || 0;

      // Mark any remaining bookings as migrated (e.g., price = 0)
      await sql`UPDATE bookings SET price_migrated_to_eur = true WHERE price_migrated_to_eur = false`;

      // Update all nanny rates from MAD to EUR
      await sql`UPDATE nannies SET rate = 10 WHERE rate > 50`;
    }
    // ────────────────────────────────────────────────────────────────

    // ─── Price Repair ─────────────────────────────────────────────
    // Fix bookings corrupted by migration: new EUR-priced bookings that
    // had price_migrated_to_eur=false (default) got divided by 15.
    // Recalculate from stored times for any booking with a suspiciously
    // low price (< 50% of expected).
    const REPAIR_RATE = 10; // €/hr
    const REPAIR_TAXI = 10; // € flat fee for evening bookings
    let repaired = 0;
    const bookingsToCheck = await sql`
      SELECT id, start_time, end_time, date, end_date, total_price
      FROM bookings
      WHERE start_time LIKE '%h%' AND end_time LIKE '%h%'
        AND start_time != '' AND end_time != ''
        AND total_price > 0
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

        // Only repair if price is way off (less than 50% of expected)
        if (expectedPrice > 0 && b.total_price < expectedPrice * 0.5) {
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

    // ─── Seed Reviews (French names, 5 stars) ──────────────────────
    const reviewsExist = await sql`SELECT COUNT(*) as count FROM nanny_reviews` as CountRow[];
    let seededReviews = 0;
    if (parseInt(reviewsExist[0].count) === 0) {
      // Look up nanny IDs by name
      const nannyRows = await sql`SELECT id, name FROM nannies WHERE name IN ('Sanae','Fatima Zahra','Majda','Hayat','Naima','Laila','Samira')` as { id: number; name: string }[];
      const nannyMap: Record<string, number> = {};
      for (const n of nannyRows) nannyMap[n.name] = n.id;

      const reviewData: { nanny: string; client: string; comment: string }[] = [
        // ── Sanae (12 reviews) ──
        { nanny: 'Sanae', client: 'Sophie Moreau', comment: 'Sanae was absolutely wonderful with our two children. She kept them entertained and happy the entire evening. Highly recommend!' },
        { nanny: 'Sanae', client: 'Marie Dupont', comment: 'We booked Sanae for three nights during our stay in Marrakech. She was punctual, professional, and our kids adored her.' },
        { nanny: 'Sanae', client: 'Isabelle Laurent', comment: 'Our baby was in the best hands with Sanae. She is incredibly gentle and attentive. We felt completely at ease.' },
        { nanny: 'Sanae', client: 'Claire Fontaine', comment: 'Sanae made our holiday so much more relaxing. She played games, read stories, and our daughter did not want her to leave!' },
        { nanny: 'Sanae', client: 'Camille Rousseau', comment: 'Fantastic experience! Sanae arrived on time, was very warm with the kids, and even tidied up after playtime.' },
        { nanny: 'Sanae', client: 'Nathalie Bernard', comment: 'We used the service twice and requested Sanae both times. She is patient, kind, and truly loves what she does.' },
        { nanny: 'Sanae', client: 'Élodie Petit', comment: 'Sanae took amazing care of our 8-month-old. She followed our routine perfectly. Will definitely book again!' },
        { nanny: 'Sanae', client: 'Juliette Martin', comment: 'Our kids still talk about Sanae weeks later! She organized crafts and outdoor games. A true gem.' },
        { nanny: 'Sanae', client: 'Céline Dubois', comment: 'Professional, reliable, and so sweet with children. Sanae made us feel confident leaving our little ones.' },
        { nanny: 'Sanae', client: 'Aurélie Lefebvre', comment: 'Sanae was a lifesaver during our trip. She handled bedtime like a pro and our kids slept peacefully.' },
        { nanny: 'Sanae', client: 'Charlotte Girard', comment: 'I cannot say enough good things. Sanae is warm, experienced, and our children felt safe and happy with her.' },
        { nanny: 'Sanae', client: 'Pauline Mercier', comment: 'Excellent service from start to finish. Sanae communicated well and was flexible with our schedule changes.' },

        // ── Fatima Zahra (11 reviews) ──
        { nanny: 'Fatima Zahra', client: 'Valérie Simon', comment: 'Fatima Zahra is an exceptional nanny. Her Montessori approach kept our toddler engaged and learning through play.' },
        { nanny: 'Fatima Zahra', client: 'Sandrine Bonnet', comment: 'We were so impressed by Fatima Zahra. She was calm, organized, and our baby bonded with her immediately.' },
        { nanny: 'Fatima Zahra', client: 'Delphine Renaud', comment: 'Fatima Zahra speaks perfect French which was so reassuring. She took wonderful care of our newborn.' },
        { nanny: 'Fatima Zahra', client: 'Émilie Garnier', comment: 'Absolutely outstanding! Fatima Zahra prepared activities for our children and they had the best time.' },
        { nanny: 'Fatima Zahra', client: 'Stéphanie Leclerc', comment: 'Our third time booking Fatima Zahra and she never disappoints. The kids run to greet her every time!' },
        { nanny: 'Fatima Zahra', client: 'Véronique Thomas', comment: 'Fatima Zahra has such a natural way with children. She is gentle yet firm when needed. Truly professional.' },
        { nanny: 'Fatima Zahra', client: 'Anne-Sophie Blanc', comment: 'We felt completely at ease leaving our 3-month-old with Fatima Zahra. She has extensive newborn experience.' },
        { nanny: 'Fatima Zahra', client: 'Laure Faure', comment: 'Fatima Zahra was incredible with our twins. She managed both beautifully and even gave us a full update after.' },
        { nanny: 'Fatima Zahra', client: 'Mélanie Perrin', comment: 'Highly professional and caring. Fatima Zahra made our vacation worry-free. Could not recommend more!' },
        { nanny: 'Fatima Zahra', client: 'Christine Morel', comment: 'From the moment she arrived, Fatima Zahra put everyone at ease. Our daughter loved every minute.' },
        { nanny: 'Fatima Zahra', client: 'Florence André', comment: 'Fatima Zahra went above and beyond. She even helped with bath time and bedtime stories. A wonderful nanny!' },

        // ── Majda (10 reviews) ──
        { nanny: 'Majda', client: 'Brigitte Chevalier', comment: 'Majda took our kids on an amazing outdoor adventure in the garden. They came back tired and happy!' },
        { nanny: 'Majda', client: 'Sophie Moreau', comment: 'We loved Majda! She was patient with our shy toddler and by the end of the evening they were best friends.' },
        { nanny: 'Majda', client: 'Nathalie Bernard', comment: 'Majda is creative and fun. She organized painting and games that kept our three kids entertained for hours.' },
        { nanny: 'Majda', client: 'Claire Fontaine', comment: 'Such a lovely person. Majda was gentle and attentive, and our little one was smiling the whole time.' },
        { nanny: 'Majda', client: 'Juliette Martin', comment: 'Majda was fantastic with our two boys. She has so much energy and really knows how to engage children.' },
        { nanny: 'Majda', client: 'Élodie Petit', comment: 'We booked Majda for an afternoon and she was perfect. Kind, responsible, and our kids had a blast.' },
        { nanny: 'Majda', client: 'Camille Rousseau', comment: 'Majda adapted to our schedule beautifully. She brought coloring books and puzzles. Very thoughtful!' },
        { nanny: 'Majda', client: 'Aurélie Lefebvre', comment: 'Great experience with Majda. She is warm, reliable, and made our holiday stress-free.' },
        { nanny: 'Majda', client: 'Pauline Mercier', comment: 'Our children loved Majda! She played outdoor games and even taught them a few words in Arabic. So special.' },
        { nanny: 'Majda', client: 'Marie Dupont', comment: 'Majda arrived with a big smile and instantly connected with our daughter. Would absolutely book her again.' },

        // ── Hayat (12 reviews) ──
        { nanny: 'Hayat', client: 'Isabelle Laurent', comment: 'Hayat is the best nanny we have ever had. Her experience with hotel families really shows. Impeccable service.' },
        { nanny: 'Hayat', client: 'Sandrine Bonnet', comment: 'Hayat took care of our three children effortlessly. She is calm, organized, and incredibly professional.' },
        { nanny: 'Hayat', client: 'Delphine Renaud', comment: 'We were staying at a luxury riad and Hayat fit right in. Discreet, elegant, and amazing with the kids.' },
        { nanny: 'Hayat', client: 'Émilie Garnier', comment: 'Hayat has a gift with children. Our son, who is usually difficult with strangers, warmed up to her in minutes.' },
        { nanny: 'Hayat', client: 'Stéphanie Leclerc', comment: 'Ten years of experience really makes a difference. Hayat handled every situation with grace and confidence.' },
        { nanny: 'Hayat', client: 'Véronique Thomas', comment: 'We booked Hayat for a full week and it was the best decision. Our kids were happy and cared for every day.' },
        { nanny: 'Hayat', client: 'Anne-Sophie Blanc', comment: 'Hayat is truly premium. She anticipated our needs and went above expectations. Thank you so much!' },
        { nanny: 'Hayat', client: 'Laure Faure', comment: 'Hayat speaks excellent English and French. Communication was easy and she kept us informed throughout.' },
        { nanny: 'Hayat', client: 'Mélanie Perrin', comment: 'We had an incredible experience. Hayat is patient, loving, and made our children feel completely at home.' },
        { nanny: 'Hayat', client: 'Christine Morel', comment: 'Hayat managed our two toddlers and infant beautifully. She is experienced and it shows in everything she does.' },
        { nanny: 'Hayat', client: 'Florence André', comment: 'Outstanding nanny! Hayat was flexible with last-minute changes and always had a positive attitude.' },
        { nanny: 'Hayat', client: 'Brigitte Chevalier', comment: 'Hayat was recommended by our hotel concierge and she exceeded all expectations. Truly the best.' },

        // ── Naima (10 reviews) ──
        { nanny: 'Naima', client: 'Charlotte Girard', comment: 'Naima was amazing with our 4-month-old. She followed our feeding and sleep schedule perfectly.' },
        { nanny: 'Naima', client: 'Sophie Moreau', comment: 'We needed someone for night care and Naima was perfect. Our baby slept through the night in her care.' },
        { nanny: 'Naima', client: 'Valérie Simon', comment: 'Naima is so gentle and nurturing. Our infant was calm and content with her. We felt completely at peace.' },
        { nanny: 'Naima', client: 'Nathalie Bernard', comment: 'Naima specializes in babies and it really shows. She knew exactly what to do and our little one loved her.' },
        { nanny: 'Naima', client: 'Céline Dubois', comment: 'We booked Naima for evening care so we could enjoy dinner. Our baby was sound asleep when we returned!' },
        { nanny: 'Naima', client: 'Isabelle Laurent', comment: 'Naima helped us with sleep training tips during our stay. She is knowledgeable and so patient.' },
        { nanny: 'Naima', client: 'Camille Rousseau', comment: 'Wonderful experience! Naima has a calming presence that babies respond to instantly.' },
        { nanny: 'Naima', client: 'Juliette Martin', comment: 'Naima took excellent care of our newborn. She is experienced, reliable, and genuinely caring.' },
        { nanny: 'Naima', client: 'Marie Dupont', comment: 'Our first time leaving our baby with a sitter and Naima made it easy. She sent us photo updates too!' },
        { nanny: 'Naima', client: 'Élodie Petit', comment: 'Naima is a true infant specialist. She handled colic, feeding, and diaper changes like a pro. Five stars!' },

        // ── Laila (11 reviews) ──
        { nanny: 'Laila', client: 'Delphine Renaud', comment: 'Laila taught our children Moroccan songs and stories. It was such a beautiful cultural experience!' },
        { nanny: 'Laila', client: 'Émilie Garnier', comment: 'Our kids absolutely adored Laila. She is creative, fun, and so good at engaging school-age children.' },
        { nanny: 'Laila', client: 'Stéphanie Leclerc', comment: 'Laila brought traditional Moroccan crafts for the kids to try. They were thrilled and so were we!' },
        { nanny: 'Laila', client: 'Sandrine Bonnet', comment: 'Laila is multilingual and communicated perfectly with our French-speaking children. Very professional.' },
        { nanny: 'Laila', client: 'Anne-Sophie Blanc', comment: 'We loved that Laila incorporated cultural activities. Our kids learned so much and had a wonderful time.' },
        { nanny: 'Laila', client: 'Laure Faure', comment: 'Laila is a storyteller at heart. She captivated our children with tales and kept them engaged for hours.' },
        { nanny: 'Laila', client: 'Mélanie Perrin', comment: 'Fantastic nanny! Laila was warm, punctual, and our children were so happy when we picked them up.' },
        { nanny: 'Laila', client: 'Christine Morel', comment: 'Laila organized a mini treasure hunt in the hotel garden. Our kids said it was the highlight of their trip!' },
        { nanny: 'Laila', client: 'Florence André', comment: 'We booked Laila three times and she was amazing every single time. Reliable, creative, and kind.' },
        { nanny: 'Laila', client: 'Brigitte Chevalier', comment: 'Laila has seven years of experience and it shows. She is confident, capable, and our children loved her.' },
        { nanny: 'Laila', client: 'Charlotte Girard', comment: 'Laila read bedtime stories in French and the kids fell asleep smiling. What more could you ask for?' },

        // ── Samira (11 reviews) ──
        { nanny: 'Samira', client: 'Pauline Mercier', comment: 'Samira was fantastic! She organized educational games and our kids learned while having fun.' },
        { nanny: 'Samira', client: 'Aurélie Lefebvre', comment: 'Samira has a background in education and it really comes through. She was so good with our children.' },
        { nanny: 'Samira', client: 'Sophie Moreau', comment: 'We booked Samira for two evenings and she was wonderful both times. The kids kept asking when she would come back!' },
        { nanny: 'Samira', client: 'Valérie Simon', comment: 'Samira is energetic, warm, and engaging. She brought art supplies and the kids created beautiful drawings.' },
        { nanny: 'Samira', client: 'Claire Fontaine', comment: 'Samira handled our three kids with ease. She was organized and had planned activities for each age group.' },
        { nanny: 'Samira', client: 'Nathalie Bernard', comment: 'Wonderful nanny! Samira was patient with our toddler and creative with our older child. Perfect balance.' },
        { nanny: 'Samira', client: 'Céline Dubois', comment: 'Samira made our vacation so enjoyable. We could relax knowing the kids were in excellent hands.' },
        { nanny: 'Samira', client: 'Isabelle Laurent', comment: 'Samira speaks fluent English and French. She connected with our kids instantly and they had a great time.' },
        { nanny: 'Samira', client: 'Camille Rousseau', comment: 'Samira is professional and caring. She sent us updates and photos during the evening. So thoughtful!' },
        { nanny: 'Samira', client: 'Marie Dupont', comment: 'Our kids adored Samira. She played board games, did puzzles, and read stories. A truly wonderful nanny.' },
        { nanny: 'Samira', client: 'Juliette Martin', comment: 'Samira went above and beyond. She even prepared a small snack for the kids. We will definitely book her again!' },
      ];

      for (const r of reviewData) {
        const nannyId = nannyMap[r.nanny];
        if (!nannyId) continue;
        await sql`
          INSERT INTO nanny_reviews (nanny_id, client_name, client_email, rating, comment)
          VALUES (${nannyId}, ${r.client}, '', 5, ${r.comment})
        `;
        seededReviews++;
      }

      // Update nanny ratings to 5.0 since all reviews are 5 stars
      for (const name of Object.keys(nannyMap)) {
        const nId = nannyMap[name];
        const avgResult = await sql`
          SELECT ROUND(AVG(rating)::numeric, 1) as avg_rating
          FROM nanny_reviews WHERE nanny_id = ${nId}
        ` as { avg_rating: string }[];
        if (avgResult[0]?.avg_rating) {
          await sql`UPDATE nannies SET rating = ${parseFloat(avgResult[0].avg_rating)} WHERE id = ${nId}`;
        }
      }
    }
    // ────────────────────────────────────────────────────────────────

    const existing = await sql`SELECT COUNT(*) as count FROM nannies` as CountRow[];
    const parts: string[] = [];
    if (needsMigration) parts.push(`MAD→EUR migration: ${migrated} booking(s) converted, nanny rates updated to 10€/hr`);
    if (repaired > 0) parts.push(`Price repair: ${repaired} booking(s) recalculated`);
    if (seededReviews > 0) parts.push(`Seeded ${seededReviews} nanny reviews`);
    if (parts.length === 0) parts.push('Database up to date');

    return res.status(200).json({
      message: parts.join('. ') + '.',
      nannies: parseInt(existing[0].count),
      migrated: needsMigration,
      repaired,
      seededReviews,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Seed error:', error);
    return res.status(500).json({ error: message });
  }
}
