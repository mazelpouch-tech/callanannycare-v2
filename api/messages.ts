import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from './_db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const sql = getDb();

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // ─── GET: Fetch messages or channel list ───
    if (req.method === 'GET') {
      const { channel, readerType, readerId } = req.query;

      if (!channel) {
        return res.status(400).json({ error: 'channel is required' });
      }

      // Return conversation list with unread counts
      if (channel === 'list') {
        if (!readerType || !readerId) {
          return res.status(400).json({ error: 'readerType and readerId required for list' });
        }

        const rid = parseInt(readerId as string);

        if (readerType === 'admin') {
          // Admin sees all channels
          const channels = await sql`
            WITH last_msgs AS (
              SELECT DISTINCT ON (channel)
                channel, content as last_message, sender_name as last_sender, created_at as last_at
              FROM chat_messages
              ORDER BY channel, created_at DESC
            ),
            unreads AS (
              SELECT cm.channel, COUNT(cm.id) as unread_count
              FROM chat_messages cm
              LEFT JOIN chat_reads cr
                ON cr.channel = cm.channel
                AND cr.reader_type = ${readerType}
                AND cr.reader_id = ${rid}
              WHERE cm.created_at > COALESCE(cr.last_read_at, '1970-01-01'::timestamp)
                AND NOT (cm.sender_type = ${readerType} AND cm.sender_id = ${rid})
              GROUP BY cm.channel
            )
            SELECT lm.*, COALESCE(u.unread_count, 0) as unread_count
            FROM last_msgs lm
            LEFT JOIN unreads u ON u.channel = lm.channel
            ORDER BY lm.last_at DESC
          `;
          return res.status(200).json(channels);
        } else {
          // Nanny sees only group_all and their own dm channel
          const dmChannel = `dm_${readerId}`;
          const channels = await sql`
            WITH my_channels(ch) AS (
              VALUES ('group_all'), (${dmChannel})
            ),
            last_msgs AS (
              SELECT DISTINCT ON (channel)
                channel, content as last_message, sender_name as last_sender, created_at as last_at
              FROM chat_messages
              WHERE channel IN ('group_all', ${dmChannel})
              ORDER BY channel, created_at DESC
            ),
            unreads AS (
              SELECT cm.channel, COUNT(cm.id) as unread_count
              FROM chat_messages cm
              LEFT JOIN chat_reads cr
                ON cr.channel = cm.channel
                AND cr.reader_type = ${readerType}
                AND cr.reader_id = ${rid}
              WHERE cm.channel IN ('group_all', ${dmChannel})
                AND cm.created_at > COALESCE(cr.last_read_at, '1970-01-01'::timestamp)
                AND NOT (cm.sender_type = ${readerType} AND cm.sender_id = ${rid})
              GROUP BY cm.channel
            )
            SELECT mc.ch as channel,
                   lm.last_message, lm.last_sender, lm.last_at,
                   COALESCE(u.unread_count, 0) as unread_count
            FROM my_channels mc
            LEFT JOIN last_msgs lm ON lm.channel = mc.ch
            LEFT JOIN unreads u ON u.channel = mc.ch
            ORDER BY lm.last_at DESC NULLS LAST
          `;
          return res.status(200).json(channels);
        }
      }

      // Fetch messages for a specific channel (latest 50)
      const messages = await sql`
        SELECT * FROM chat_messages
        WHERE channel = ${channel}
        ORDER BY created_at DESC
        LIMIT 50
      `;
      return res.status(200).json((messages as unknown[]).reverse());
    }

    // ─── POST: Send a message ───
    if (req.method === 'POST') {
      const { channel, senderType, senderId, senderName, content } = req.body;
      if (!channel || !senderType || !senderId || !content) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Nannies can only post to group_all or their own dm channel
      if (senderType === 'nanny') {
        const allowed = ['group_all', `dm_${senderId}`];
        if (!allowed.includes(channel)) {
          return res.status(403).json({ error: 'Unauthorized channel' });
        }
      }

      const result = await sql`
        INSERT INTO chat_messages (channel, sender_type, sender_id, sender_name, content)
        VALUES (${channel}, ${senderType}, ${senderId}, ${senderName || 'Unknown'}, ${content})
        RETURNING *
      `;

      // Auto-update sender's read position
      await sql`
        INSERT INTO chat_reads (channel, reader_type, reader_id, last_read_at)
        VALUES (${channel}, ${senderType}, ${senderId}, NOW())
        ON CONFLICT (channel, reader_type, reader_id)
        DO UPDATE SET last_read_at = NOW()
      `;

      return res.status(201).json(result[0]);
    }

    // ─── PUT: Mark channel as read ───
    if (req.method === 'PUT') {
      const { channel, readerType, readerId } = req.body;
      if (!channel || !readerType || !readerId) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      await sql`
        INSERT INTO chat_reads (channel, reader_type, reader_id, last_read_at)
        VALUES (${channel}, ${readerType}, ${readerId}, NOW())
        ON CONFLICT (channel, reader_type, reader_id)
        DO UPDATE SET last_read_at = NOW()
      `;
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Messages API error:', message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
