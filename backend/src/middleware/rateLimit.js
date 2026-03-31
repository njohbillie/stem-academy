'use strict';

const rateLimit = require('express-rate-limit');

/** Auth endpoints: 10 attempts per 15 min per IP */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many auth attempts. Try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/** AI chat: 30 requests per hour per authenticated user (falls back to IP) */
const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  message: { error: 'AI chat limit reached. Try again in an hour.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.userId || req.ip,
});

/** General API: 120 requests per minute per IP */
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  message: { error: 'Too many requests.' },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { authLimiter, aiLimiter, apiLimiter };
