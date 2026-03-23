import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb, setCors } from './_db.js';
import type { DbNanny, DbAdminUser } from '@/types';
import { sendRateUpdateNotificationEmail, sendNannyDeletionNotificationEmail } from './_emailTemplates.js';

interface BulkUpdateRateBody {
  action: 'bulk_update_rate';
  newRate: number;
  notifyAdmin?: boolean;
  updatedByName?: string;
  updatedByEmail?: string;
}

interface CreateNannyBody {
  name: string;
  location: string;
  rating?: number;
  bio: string;
  specialties?: string[];
  languages?: string[];
  rate?: number;
  image?: string;
  experience?: string;
  available?: boolean;
  email?: string | null;
  pin?: string;
  phone?: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const sql = getDb();
  
  if (setCors(req, res)) return;

  try {
    // Auto-create nanny_payments table if it doesn't exist
    const ensurePaymentsTable = async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS nanny_payments (
          id SERIAL PRIMARY KEY,
          nanny_id INTEGER REFERENCES nannies(id) ON DELETE CASCADE,
          period_start VARCHAR(20) NOT NULL,
          period_end VARCHAR(20) NOT NULL,
          amount INTEGER NOT NULL DEFAULT 0,
          paid_by VARCHAR(255) DEFAULT '',
          note TEXT DEFAULT '',
          created_at TIMESTAMP DEFAULT NOW()
        )
      `;
    };

    if (req.method === 'GET') {
      // Return nanny payments for a period
      if (req.query.action === 'payments') {
        const periodStart = req.query.period_start as string;
        const periodEnd = req.query.period_end as string;
        if (!periodStart || !periodEnd) {
          return res.status(400).json({ error: 'period_start and period_end are required' });
        }
        await ensurePaymentsTable();
        const payments = await sql`
          SELECT * FROM nanny_payments
          WHERE period_start = ${periodStart} AND period_end = ${periodEnd}
          ORDER BY created_at DESC
        `;
        return res.status(200).json(payments);
      }

      const nannies = await sql`SELECT * FROM nannies ORDER BY name ASC` as DbNanny[];

      // Optionally include blocked dates for all nannies (used by ForwardBookingModal)
      if (req.query.include_blocked === 'true') {
        const allBlocked = await sql`
          SELECT nanny_id, date FROM nanny_blocked_dates ORDER BY date ASC
        ` as { nanny_id: number; date: string }[];
        // Group by nanny_id
        const blockedByNanny: Record<number, string[]> = {};
        for (const row of allBlocked) {
          if (!blockedByNanny[row.nanny_id]) blockedByNanny[row.nanny_id] = [];
          blockedByNanny[row.nanny_id].push(row.date);
        }
        const nanniesWithBlocked = nannies.map(n => ({
          ...n,
          blocked_dates: blockedByNanny[n.id] || [],
        }));
        return res.status(200).json(nanniesWithBlocked);
      }

      return res.status(200).json(nannies);
    }
    
    if (req.method === 'POST') {
      // Record nanny payment(s)
      if (req.body?.action === 'record_payments') {
        const { payments } = req.body as {
          action: 'record_payments';
          payments: { nannyId: number; periodStart: string; periodEnd: string; amount: number; paidBy?: string; note?: string }[];
        };
        if (!payments || !Array.isArray(payments) || payments.length === 0) {
          return res.status(400).json({ error: 'payments array is required' });
        }
        await ensurePaymentsTable();
        const results = [];
        for (const p of payments) {
          // Upsert: delete existing payment for same nanny+period, then insert
          await sql`
            DELETE FROM nanny_payments
            WHERE nanny_id = ${p.nannyId} AND period_start = ${p.periodStart} AND period_end = ${p.periodEnd}
          `;
          const [row] = await sql`
            INSERT INTO nanny_payments (nanny_id, period_start, period_end, amount, paid_by, note)
            VALUES (${p.nannyId}, ${p.periodStart}, ${p.periodEnd}, ${p.amount}, ${p.paidBy || ''}, ${p.note || ''})
            RETURNING *
          `;
          results.push(row);
        }
        return res.status(201).json({ success: true, count: results.length, payments: results });
      }

      // Undo nanny payment(s)
      if (req.body?.action === 'undo_payments') {
        const { nannyIds, periodStart, periodEnd } = req.body as {
          action: 'undo_payments';
          nannyIds: number[];
          periodStart: string;
          periodEnd: string;
        };
        if (!nannyIds || !periodStart || !periodEnd) {
          return res.status(400).json({ error: 'nannyIds, periodStart, and periodEnd are required' });
        }
        await ensurePaymentsTable();
        // Delete one by one to avoid ANY() compatibility issues
        for (const nid of nannyIds) {
          await sql`
            DELETE FROM nanny_payments
            WHERE nanny_id = ${nid} AND period_start = ${periodStart} AND period_end = ${periodEnd}
          `;
        }
        return res.status(200).json({ success: true });
      }

      const { name, location, rating, bio, specialties, languages, rate, image, experience, available, email, pin, phone } = req.body as CreateNannyBody;
      const result = await sql`
        INSERT INTO nannies (name, location, rating, bio, specialties, languages, rate, image, experience, available, email, pin, phone)
        VALUES (${name}, ${location}, ${rating || 4.8}, ${bio}, ${JSON.stringify(specialties || [])}, ${JSON.stringify(languages || [])}, ${rate || 150}, ${image || ''}, ${experience || '1 year'}, ${available !== false}, ${email || null}, ${pin || ''}, ${phone || ''})
        RETURNING *
      ` as DbNanny[];
      return res.status(201).json(result[0]);
    }
    
    if (req.method === 'PUT') {
      const { action, newRate, notifyAdmin, updatedByName, updatedByEmail } = (req.body || {}) as BulkUpdateRateBody;

      if (action !== 'bulk_update_rate') {
        return res.status(400).json({ error: 'Unknown action' });
      }

      const rate = Number(newRate);
      if (!rate || rate <= 0) {
        return res.status(400).json({ error: 'A valid positive rate is required' });
      }

      // Update rate for all non-blocked nannies
      const updated = await sql`
        UPDATE nannies
        SET rate = ${rate}, updated_at = NOW()
        WHERE status != 'blocked'
        RETURNING id
      ` as { id: number }[];

      const nannyCount = updated.length;

      // Notify super admins if requested (supervisor flow)
      if (notifyAdmin && updatedByName && updatedByEmail) {
        try {
          const superAdmins = await sql`
            SELECT email FROM admin_users WHERE role = 'super_admin' AND is_active = true
          ` as Pick<DbAdminUser, 'email'>[];
          const adminEmails = superAdmins.map(a => a.email);
          if (adminEmails.length > 0) {
            await sendRateUpdateNotificationEmail({
              updatedByName,
              updatedByEmail,
              newRate: rate,
              nannyCount,
              adminEmails,
            });
          }
        } catch (err) {
          console.error('Failed to send rate notification:', err);
          // Non-critical — don't fail the request
        }
      }

      return res.status(200).json({ success: true, nannyCount });
    }

    if (req.method === 'DELETE') {
      // Bulk delete nannies
      const { ids, deletedByName, deletedByEmail } = req.body as {
        ids: number[];
        deletedByName?: string;
        deletedByEmail?: string;
      };

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: 'ids array is required' });
      }

      // Fetch nanny details before deleting (for notification)
      const nannyDetails: { id: number; name: string; email: string | null }[] = [];
      for (const id of ids) {
        const rows = await sql`SELECT id, name, email FROM nannies WHERE id = ${id}` as { id: number; name: string; email: string | null }[];
        if (rows.length > 0) nannyDetails.push(rows[0]);
      }

      // Delete nannies one by one
      for (const id of ids) {
        await sql`DELETE FROM nannies WHERE id = ${id}`;
      }

      // Notify all admins
      try {
        const superAdmins = await sql`
          SELECT email FROM admin_users WHERE is_active = true
        ` as Pick<DbAdminUser, 'email'>[];
        const adminEmails = superAdmins.map(a => a.email).filter(Boolean);
        if (adminEmails.length > 0 && nannyDetails.length > 0) {
          await sendNannyDeletionNotificationEmail({
            deletedByName: deletedByName || 'Admin',
            deletedByEmail: deletedByEmail || '',
            deletedNannies: nannyDetails.map(n => ({ id: n.id, name: n.name, email: n.email || undefined })),
            adminEmails,
          });
        }
      } catch (err) {
        console.error('Failed to send nanny deletion notification:', err);
      }

      return res.status(200).json({ success: true, deletedCount: nannyDetails.length });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Nannies API error:', message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
