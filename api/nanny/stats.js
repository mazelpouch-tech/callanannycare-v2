import { getDb } from '../_db.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const sql = getDb();
    const { nannyId } = req.query;
    
    if (!nannyId) return res.status(400).json({ error: 'nannyId is required' });

    const result = await sql`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'completed') as completed_bookings,
        COUNT(*) FILTER (WHERE status = 'confirmed' AND date >= CURRENT_DATE::text) as upcoming_bookings,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_bookings,
        COALESCE(SUM(total_price) FILTER (WHERE status = 'completed'), 0) as total_earnings,
        COUNT(*) FILTER (WHERE status IN ('confirmed', 'completed') AND date >= to_char(date_trunc('week', CURRENT_DATE), 'YYYY-MM-DD') AND date < to_char(date_trunc('week', CURRENT_DATE) + interval '7 days', 'YYYY-MM-DD')) as this_week_bookings
      FROM bookings
      WHERE nanny_id = ${nannyId}
    `;

    // Calculate hours from completed bookings
    const hoursResult = await sql`
      SELECT 
        COALESCE(SUM(
          CASE 
            WHEN end_time != '' AND start_time != '' THEN
              EXTRACT(EPOCH FROM (end_time::time - start_time::time)) / 3600
            WHEN plan = 'half-day' THEN 5
            WHEN plan = 'full-day' THEN 10
            ELSE total_price::float / NULLIF((SELECT rate FROM nannies WHERE id = ${nannyId}), 0)
          END
        ), 0) as total_hours_worked
      FROM bookings
      WHERE nanny_id = ${nannyId} AND status = 'completed'
    `;

    const stats = result[0];
    const hours = hoursResult[0];

    return res.status(200).json({
      totalHoursWorked: parseFloat(parseFloat(hours.total_hours_worked).toFixed(1)),
      completedBookings: parseInt(stats.completed_bookings),
      upcomingBookings: parseInt(stats.upcoming_bookings),
      pendingBookings: parseInt(stats.pending_bookings),
      totalEarnings: parseInt(stats.total_earnings),
      thisWeekBookings: parseInt(stats.this_week_bookings),
    });
  } catch (error) {
    console.error('Nanny stats error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
