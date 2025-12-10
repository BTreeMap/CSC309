/**
 * Authentication Routes
 * 
 * Handles login, password reset requests, and token consumption.
 */
'use strict';

const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const prisma = require('../db/prisma');
const { validateRequest } = require('../validation');

const router = express.Router();

// JWT Secret from environment
const JWT_SECRET = process.env.JWT_SECRET;

// In-memory rate limiting for password resets
const ResetRateLimits = new Map();
const RESET_RATE_LIMIT_MS = 60000; // 1 minute
const RESET_TOKEN_EXPIRY_MS = 3600000; // 1 hour

/**
 * POST /auth/tokens - Login and get JWT token
 */
router.post('/tokens', async (req, res) => {
  try {
    const validation = validateRequest('POST /auth/tokens', req.body);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    const { utorid, password } = req.body;
    const user = await prisma.user.findUnique({ where: { utorid } });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.passwordBcrypt);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() }
    });

    const expiresIn = 2 * 60 * 60; // 2 hours in seconds
    const token = jwt.sign(
      { sub: user.id, role: user.role },
      JWT_SECRET,
      { expiresIn }
    );

    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
    res.json({ token, expiresAt });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /auth/resets - Request password reset
 */
router.post('/resets', async (req, res) => {
  try {
    const validation = validateRequest('POST /auth/resets', req.body);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    const { utorid } = req.body;

    // Security: Block password reset for default superuser account
    const DEFAULT_SUPERUSER_UTORID = 'superadm';
    if (utorid === DEFAULT_SUPERUSER_UTORID) {
      return res.status(403).json({ error: 'Password reset is disabled for this account' });
    }

    // Rate limiting by IP
    const clientIp = req.ip;
    const now = Date.now();
    const lastReset = ResetRateLimits.get(clientIp);

    if (lastReset && now - lastReset < RESET_RATE_LIMIT_MS) {
      return res.status(429).json({ error: 'Too many requests' });
    }

    const user = await prisma.user.findUnique({ where: { utorid } });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    ResetRateLimits.set(clientIp, now);

    const resetToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_MS);

    // Delete any existing reset tokens for this user
    await prisma.resetToken.deleteMany({
      where: { userId: user.id }
    });

    await prisma.resetToken.create({
      data: {
        userId: user.id,
        token: resetToken,
        expiry: expiresAt
      }
    });

    res.status(202).json({
      expiresAt: expiresAt.toISOString(),
      resetToken
    });
  } catch (error) {
    console.error('Reset request error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /auth/resets/:resetToken - Consume reset token and set new password
 */
router.post('/resets/:resetToken', async (req, res) => {
  try {
    const validation = validateRequest('POST /auth/resets/:resetToken', req.body);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    const { resetToken } = req.params;
    const { utorid, password } = req.body;

    const tokenRecord = await prisma.resetToken.findUnique({
      where: { token: resetToken },
      include: { user: true }
    });

    if (!tokenRecord) {
      return res.status(404).json({ error: 'Invalid reset token' });
    }

    if (new Date() > tokenRecord.expiry) {
      return res.status(410).json({ error: 'Reset token expired' });
    }

    if (tokenRecord.user.utorid !== utorid) {
      return res.status(401).json({ error: 'UTORid does not match reset token' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: tokenRecord.userId },
        data: { passwordBcrypt: passwordHash }
      }),
      prisma.resetToken.delete({
        where: { id: tokenRecord.id }
      })
    ]);

    res.json({ message: 'Password reset successful' });
  } catch (error) {
    console.error('Reset consumption error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
