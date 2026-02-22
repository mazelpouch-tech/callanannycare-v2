import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from '../_db.js';
import crypto from 'crypto';
import type { DbAdminUser } from '@/types';
import { sendAdminInviteEmail } from '../_emailTemplates.js';
import { logLoginEvent, extractRequestMeta } from '../_auditLog.js';

interface AdminLoginBody {
  action?: string;
  email?: string;
  password?: string;
  name?: string;
  adminId?: number;
  currentPassword?: string;
  newPassword?: string;
  token?: string;
  resetToken?: string;
  isActive?: boolean;
}

interface AdminIdRow { id: number }
interface AdminIdRoleRow { id: number; role: string }
interface AdminResetRow { id: number; reset_token_expires: string | null }

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const sql = getDb();

  try {
    // POST: Admin Login
    if (req.method === 'POST') {
      const { action, email, password, name, adminId, currentPassword, newPassword, resetToken } = (req.body || {}) as AdminLoginBody;

      // --- Login ---
      if (!action || action === 'login') {
        if (!email || !password) {
          return res.status(400).json({ error: 'Email and password are required' });
        }

        const result = await sql`
          SELECT id, name, email, password, role, is_active, last_login, login_count
          FROM admin_users
          WHERE LOWER(email) = LOWER(${email})
        ` as DbAdminUser[];

        const { ip, userAgent } = extractRequestMeta(req);

        if (result.length === 0) {
          await logLoginEvent({ userType: 'admin', userEmail: email, action: 'login_failed', ipAddress: ip, userAgent, details: 'Email not found' });
          return res.status(401).json({ error: 'Invalid credentials' });
        }

        const admin = result[0];

        if (!admin.is_active) {
          await logLoginEvent({ userType: 'admin', userId: admin.id, userEmail: email, userName: admin.name, action: 'login_failed', ipAddress: ip, userAgent, details: 'Account deactivated' });
          return res.status(403).json({ error: 'Your account has been deactivated. Contact the super admin.' });
        }

        if (admin.password !== password) {
          await logLoginEvent({ userType: 'admin', userId: admin.id, userEmail: email, userName: admin.name, action: 'login_failed', ipAddress: ip, userAgent, details: 'Invalid password' });
          return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Update login tracking
        await sql`
          UPDATE admin_users SET
            last_login = NOW(),
            login_count = COALESCE(login_count, 0) + 1
          WHERE id = ${admin.id}
        `;

        await logLoginEvent({ userType: 'admin', userId: admin.id, userEmail: email, userName: admin.name, action: 'login_success', ipAddress: ip, userAgent });

        return res.status(200).json({
          success: true,
          admin: {
            id: admin.id,
            name: admin.name,
            email: admin.email,
            role: admin.role,
            lastLogin: admin.last_login,
            loginCount: (admin.login_count || 0) + 1
          }
        });
      }

      // --- Add Admin User (invite via email) ---
      if (action === 'add_user') {
        if (!name || !email) {
          return res.status(400).json({ error: 'Name and email are required' });
        }

        const existing = await sql`SELECT id FROM admin_users WHERE LOWER(email) = LOWER(${email})` as AdminIdRow[];
        if (existing.length > 0) {
          return res.status(409).json({ error: 'An admin with this email already exists' });
        }

        // Generate a random temp password (admin will set their own via registration link)
        const tempPassword = crypto.randomBytes(16).toString('hex');
        // Generate registration token (24h expiry)
        const registrationToken = crypto.randomBytes(32).toString('hex');
        const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        const created = await sql`
          INSERT INTO admin_users (name, email, password, role, is_active, reset_token, reset_token_expires)
          VALUES (${name}, ${email}, ${tempPassword}, 'admin', false, ${registrationToken}, ${tokenExpires.toISOString()})
          RETURNING id, name, email, role, is_active, created_at
        ` as DbAdminUser[];

        // Send registration email
        const host = req.headers.host || 'callanannycare.vercel.app';
        const protocol = host.includes('localhost') ? 'http' : 'https';
        const registrationLink = `${protocol}://${host}/admin/login?register=${registrationToken}`;

        let emailSent = false;
        try {
          emailSent = await sendAdminInviteEmail({
            adminName: name,
            adminEmail: email,
            registrationLink,
          });
        } catch (err) {
          console.error('Failed to send admin invite email:', err);
        }

        return res.status(201).json({
          success: true,
          emailSent,
          admin: {
            id: created[0].id,
            name: created[0].name,
            email: created[0].email,
            role: created[0].role,
            isActive: created[0].is_active,
            createdAt: created[0].created_at
          }
        });
      }

      // --- Change Password ---
      if (action === 'change_password') {
        if (!adminId || !currentPassword || !newPassword) {
          return res.status(400).json({ error: 'Admin ID, current password, and new password are required' });
        }

        if (newPassword.length < 6) {
          return res.status(400).json({ error: 'New password must be at least 6 characters' });
        }

        const admin = await sql`SELECT id, password FROM admin_users WHERE id = ${adminId}` as DbAdminUser[];
        if (admin.length === 0) {
          return res.status(404).json({ error: 'Admin not found' });
        }

        if (admin[0].password !== currentPassword) {
          return res.status(401).json({ error: 'Current password is incorrect' });
        }

        await sql`
          UPDATE admin_users SET password = ${newPassword}, updated_at = NOW()
          WHERE id = ${adminId}
        `;

        const { ip: pwIp, userAgent: pwUa } = extractRequestMeta(req);
        await logLoginEvent({ userType: 'admin', userId: adminId, action: 'password_change', ipAddress: pwIp, userAgent: pwUa });

        return res.status(200).json({ success: true, message: 'Password changed successfully' });
      }

      // --- Request Password Reset ---
      if (action === 'forgot_password') {
        if (!email) {
          return res.status(400).json({ error: 'Email is required' });
        }

        const admin = await sql`SELECT id, name, email FROM admin_users WHERE LOWER(email) = LOWER(${email}) AND is_active = true` as DbAdminUser[];
        if (admin.length === 0) {
          // Don't reveal if email exists
          return res.status(200).json({ success: true, message: 'If that email is registered, a reset link has been generated.' });
        }

        const resetTokenValue = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour

        await sql`
          UPDATE admin_users SET
            reset_token = ${resetTokenValue},
            reset_token_expires = ${expiresAt.toISOString()},
            updated_at = NOW()
          WHERE id = ${admin[0].id}
        `;

        const host = req.headers.host || 'callanannycare.vercel.app';
        const protocol = host.includes('localhost') ? 'http' : 'https';
        const resetLink = `${protocol}://${host}/admin/login?reset=${resetTokenValue}`;

        return res.status(200).json({
          success: true,
          message: 'Reset link generated. Share it securely with the user.',
          resetLink
        });
      }

      // --- Reset Password (with token) ---
      if (action === 'reset_password') {
        if (!resetToken || !newPassword) {
          return res.status(400).json({ error: 'Reset token and new password are required' });
        }

        if (newPassword.length < 6) {
          return res.status(400).json({ error: 'New password must be at least 6 characters' });
        }

        const admin = await sql`
          SELECT id, reset_token_expires
          FROM admin_users
          WHERE reset_token = ${resetToken} AND is_active = true
        ` as AdminResetRow[];

        if (admin.length === 0) {
          return res.status(400).json({ error: 'Invalid or expired reset link' });
        }

        if (admin[0].reset_token_expires && new Date(admin[0].reset_token_expires) < new Date()) {
          return res.status(400).json({ error: 'This reset link has expired. Please request a new one.' });
        }

        await sql`
          UPDATE admin_users SET
            password = ${newPassword},
            reset_token = NULL,
            reset_token_expires = NULL,
            updated_at = NOW()
          WHERE id = ${admin[0].id}
        `;

        const { ip: resetIp, userAgent: resetUa } = extractRequestMeta(req);
        await logLoginEvent({ userType: 'admin', userId: admin[0].id, action: 'password_reset', ipAddress: resetIp, userAgent: resetUa });

        return res.status(200).json({ success: true, message: 'Password has been reset successfully. You can now log in.' });
      }

      // --- Register Admin (complete registration from invite) ---
      if (action === 'register_admin') {
        if (!resetToken || !newPassword) {
          return res.status(400).json({ error: 'Registration token and password are required' });
        }

        if (newPassword.length < 6) {
          return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        // Find the invited (inactive) admin by token
        const admin = await sql`
          SELECT id, reset_token_expires
          FROM admin_users
          WHERE reset_token = ${resetToken} AND is_active = false
        ` as AdminResetRow[];

        if (admin.length === 0) {
          return res.status(400).json({ error: 'Invalid or expired registration link' });
        }

        if (admin[0].reset_token_expires && new Date(admin[0].reset_token_expires) < new Date()) {
          return res.status(400).json({ error: 'This registration link has expired. Please ask the admin to resend the invite.' });
        }

        // Set password, activate account, clear token
        await sql`
          UPDATE admin_users SET
            password = ${newPassword},
            is_active = true,
            reset_token = NULL,
            reset_token_expires = NULL,
            updated_at = NOW()
          WHERE id = ${admin[0].id}
        `;

        return res.status(200).json({ success: true, message: 'Registration complete! You can now sign in.' });
      }

      return res.status(400).json({ error: 'Unknown action' });
    }

    // GET: List admin users (for admin panel)
    if (req.method === 'GET') {
      const admins = await sql`
        SELECT id, name, email, role, is_active, last_login, login_count, created_at
        FROM admin_users
        ORDER BY created_at ASC
      ` as DbAdminUser[];

      return res.status(200).json(admins.map(a => ({
        id: a.id,
        name: a.name,
        email: a.email,
        role: a.role,
        isActive: a.is_active,
        lastLogin: a.last_login,
        loginCount: a.login_count || 0,
        createdAt: a.created_at
      })));
    }

    // PUT: Update admin user (toggle active, update name/email)
    if (req.method === 'PUT') {
      const { adminId, name, email, isActive } = req.body as AdminLoginBody;

      if (!adminId) {
        return res.status(400).json({ error: 'Admin ID is required' });
      }

      const existing = await sql`SELECT id, role FROM admin_users WHERE id = ${adminId}` as AdminIdRoleRow[];
      if (existing.length === 0) {
        return res.status(404).json({ error: 'Admin not found' });
      }

      // Check email uniqueness if changing email
      if (email) {
        const emailCheck = await sql`SELECT id FROM admin_users WHERE LOWER(email) = LOWER(${email}) AND id != ${adminId}` as AdminIdRow[];
        if (emailCheck.length > 0) {
          return res.status(409).json({ error: 'Another admin already uses this email' });
        }
      }

      const updated = await sql`
        UPDATE admin_users SET
          name = COALESCE(${name || null}, name),
          email = COALESCE(${email || null}, email),
          is_active = COALESCE(${isActive !== undefined ? isActive : null}, is_active),
          updated_at = NOW()
        WHERE id = ${adminId}
        RETURNING id, name, email, role, is_active, last_login, login_count, created_at
      ` as DbAdminUser[];

      const a = updated[0];
      return res.status(200).json({
        success: true,
        admin: {
          id: a.id,
          name: a.name,
          email: a.email,
          role: a.role,
          isActive: a.is_active,
          lastLogin: a.last_login,
          loginCount: a.login_count || 0,
          createdAt: a.created_at
        }
      });
    }

    // DELETE: Remove admin user
    if (req.method === 'DELETE') {
      const { adminId } = (req.body || {}) as AdminLoginBody;

      if (!adminId) {
        return res.status(400).json({ error: 'Admin ID is required' });
      }

      // Prevent deleting the last super_admin
      const superAdmins = await sql`SELECT id FROM admin_users WHERE role = 'super_admin' AND is_active = true` as AdminIdRow[];
      const target = await sql`SELECT id, role FROM admin_users WHERE id = ${adminId}` as AdminIdRoleRow[];

      if (target.length === 0) {
        return res.status(404).json({ error: 'Admin not found' });
      }

      if (target[0].role === 'super_admin' && superAdmins.length <= 1) {
        return res.status(400).json({ error: 'Cannot delete the last super admin' });
      }

      await sql`DELETE FROM admin_users WHERE id = ${adminId}`;

      return res.status(200).json({ success: true, message: 'Admin user removed' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Admin login/user error:', message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
