'use strict';

const express = require('express');
const { body, validationResult } = require('express-validator');
const Anthropic = require('@anthropic-ai/sdk');
const db = require('../db');
const requireAuth = require('../middleware/auth');
const { aiLimiter } = require('../middleware/rateLimit');
const config = require('../config');

const router = express.Router();
router.use(requireAuth);

const anthropic = new Anthropic({ apiKey: config.anthropicApiKey });

const EN_STAGE_LABEL = (level) => {
  if (level < 20) return '🇫🇷 Francophone';
  if (level < 40) return '🌱 Débutant EN';
  if (level < 60) return '⚡ Initié EN';
  if (level < 80) return '🚀 Intermédiaire';
  return '🌟 Bilingue STEM';
};

// ── POST /api/ai/chat ────────────────────────────────────────────────

router.post('/chat', aiLimiter, [
  body('messages').isArray({ min: 1, max: 50 }),
  body('messages.*.role').isIn(['user', 'assistant']),
  body('messages.*.content').isString().isLength({ min: 1, max: 4000 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: 'Invalid input' });

  const { messages } = req.body;

  try {
    const { rows: [u] } = await db.query(
      'SELECT fname, career, english_level FROM users WHERE id = $1',
      [req.user.userId]
    );
    if (!u) return res.status(404).json({ error: 'User not found' });

    const enLevel = u.english_level || 0;
    const system = `Tu es ARIA, tutrice IA bilingue (FR/EN) pour ${u.fname || 'une élève'}, 13 ans, Cameroun → USA. Niveau 2nde C.
Manuels: L'Excellence en Mathématiques (2nde C), L'Excellence en Physique-Chimie (2nde C).
Curriculum US cible: 8th/9th grade (Algebra I, Physical Science, Life Science, ELA, US History, Civics, Health, Financial Literacy, Computer Science).
Niveau anglais de l'élève: ${enLevel}% (${EN_STAGE_LABEL(enLevel)}).
Carrière visée: ${u.career || 'Ingénieure'}.
Adapte la proportion FR/EN selon son niveau anglais (${enLevel}<40%=surtout FR, sinon bilingue).
Exemples locaux: marchés Yaoundé/Douala, moto-taxis, mangues, ndolé, etc.
Sois encourageante, précise, pédagogique. Donne des formules, étapes, exemples. Max 300 mots.`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system,
      messages: messages.map(m => ({ role: m.role, content: String(m.content) })),
    });

    res.json({ content: response.content[0]?.text || '' });
  } catch (err) {
    console.error('AI chat error:', err);
    res.status(500).json({ error: 'AI service unavailable' });
  }
});

module.exports = router;
