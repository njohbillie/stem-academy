'use strict';

const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../db');
const requireAuth = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// ── POST /api/progress/quiz ──────────────────────────────────────────

router.post('/quiz', [
  body('lesson').trim().isLength({ min: 1, max: 100 }).escape(),
  body('title').optional().trim().isLength({ max: 200 }).escape(),
  body('subject').optional().trim().isLength({ max: 50 }).escape(),
  body('score').isFloat({ min: 0, max: 100 }),
  body('correct').isInt({ min: 0 }),
  body('total').isInt({ min: 1 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: 'Invalid input' });

  const { lesson, title = '', subject = '', score, correct, total } = req.body;
  try {
    await db.query(
      `INSERT INTO quiz_history (user_id, lesson, title, subject, score, correct, total)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [req.user.userId, lesson, title, subject, score, correct, total]
    );
    res.status(201).json({ success: true });
  } catch (err) {
    console.error('Record quiz error:', err);
    res.status(500).json({ error: 'Failed to record quiz result' });
  }
});

module.exports = router;
