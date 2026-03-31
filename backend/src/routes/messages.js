'use strict';

const express = require('express');
const { body, query, validationResult } = require('express-validator');
const db = require('../db');
const requireAuth = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// ── GET /api/messages?with=<userId> ─────────────────────────────────

router.get('/', [
  query('with').isUUID(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: 'Invalid recipient ID' });

  const otherId = req.query.with;
  try {
    const { rows } = await db.query(
      `SELECT id, sender_id, recipient_id, text, ts
       FROM messages
       WHERE (sender_id = $1 AND recipient_id = $2)
          OR (sender_id = $2 AND recipient_id = $1)
       ORDER BY ts ASC
       LIMIT 200`,
      [req.user.userId, otherId]
    );
    res.json(rows.map(m => ({
      id: m.id,
      senderId: m.sender_id,
      recipientId: m.recipient_id,
      text: m.text,
      ts: m.ts,
    })));
  } catch (err) {
    console.error('GET messages error:', err);
    res.status(500).json({ error: 'Failed to retrieve messages' });
  }
});

// ── POST /api/messages ───────────────────────────────────────────────

router.post('/', [
  body('recipientId').isUUID(),
  body('text').trim().isLength({ min: 1, max: 2000 }).escape(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: 'Invalid input' });

  const { recipientId, text } = req.body;

  // Ensure the recipient is a real user and is linked to the sender
  try {
    const { rows: [recipient] } = await db.query(
      'SELECT id FROM users WHERE id = $1',
      [recipientId]
    );
    if (!recipient) return res.status(404).json({ error: 'Recipient not found' });

    const { rows: [msg] } = await db.query(
      `INSERT INTO messages (sender_id, recipient_id, text) VALUES ($1, $2, $3)
       RETURNING id, ts`,
      [req.user.userId, recipientId, text]
    );
    res.status(201).json({
      id: msg.id,
      senderId: req.user.userId,
      recipientId,
      text,
      ts: msg.ts,
    });
  } catch (err) {
    console.error('POST messages error:', err);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

module.exports = router;
