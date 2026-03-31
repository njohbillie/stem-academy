'use strict';

const jwt = require('jsonwebtoken');
const config = require('../config');

/**
 * Middleware: requires a valid JWT Bearer token in the Authorization header.
 * Sets req.user = { userId, role } on success.
 */
module.exports = function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const token = header.slice(7);
  try {
    req.user = jwt.verify(token, config.jwtSecret);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};
