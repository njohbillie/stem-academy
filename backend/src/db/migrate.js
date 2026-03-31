'use strict';

const bcrypt = require('bcryptjs');
const db = require('./index');
const config = require('../config');

/**
 * Runs on every API startup.
 * 1. Ensures the users.role constraint includes 'admin' (safe to run on an
 *    existing database that was created before the admin role was added).
 * 2. If ADMIN_EMAIL is set in the environment, creates or promotes that user
 *    to the admin role.  If ADMIN_PASSWORD is also set, it is used as the
 *    password when creating a brand-new admin account.
 */
async function runMigrations() {
  // ── 1. Role constraint ───────────────────────────────────────────────
  await db.query(`
    ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
    ALTER TABLE users ADD CONSTRAINT users_role_check
      CHECK (role IN ('student', 'parent', 'tutor', 'admin'));
  `);

  // ── 2. Admin account ─────────────────────────────────────────────────
  const adminEmail    = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminFname    = process.env.ADMIN_FNAME || 'Admin';

  if (!adminEmail) return;

  const { rows: [existing] } = await db.query(
    'SELECT id, role FROM users WHERE email = $1',
    [adminEmail]
  );

  if (existing) {
    if (existing.role !== 'admin') {
      await db.query('UPDATE users SET role = $1 WHERE id = $2', ['admin', existing.id]);
      console.log(`[migrate] Promoted ${adminEmail} to admin`);
    }
  } else {
    if (!adminPassword) {
      console.warn('[migrate] ADMIN_EMAIL set but ADMIN_PASSWORD is missing — skipping admin creation');
      return;
    }
    const hash = await bcrypt.hash(adminPassword, config.bcryptRounds);
    await db.query(
      `INSERT INTO users (email, password_hash, role, fname, lname)
       VALUES ($1, $2, 'admin', $3, '')`,
      [adminEmail, hash, adminFname]
    );
    console.log(`[migrate] Created admin account for ${adminEmail}`);
  }
}

module.exports = runMigrations;
