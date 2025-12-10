'use strict';

const multer = require('multer');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const express = require('express');

const {
    ALLOWED_AVATAR_MIMES,
    SAFE_MIME_TYPES,
    MAX_AVATAR_SIZE
} = require('../config/constants');

/**
 * Create multer storage configuration for avatar uploads
 * @param {string} uploadDir - Directory to store uploads
 * @returns {multer.StorageEngine}
 */
const createAvatarStorage = (uploadDir) => {
    return multer.diskStorage({
        destination: (_req, _file, cb) => {
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }
            cb(null, uploadDir);
        },
        filename: (req, file, cb) => {
            const userId = req.auth && req.auth.sub ? req.auth.sub : 'anonymous';
            const uniqueName = `${userId}-${crypto.randomBytes(16).toString('hex')}${path.extname(file.originalname)}`;
            cb(null, uniqueName);
        }
    });
};

/**
 * File filter to only allow safe image types
 */
const avatarFileFilter = (_req, file, cb) => {
    if (ALLOWED_AVATAR_MIMES.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Only image files (JPEG, PNG, GIF, WebP, BMP) are allowed'), false);
    }
};

/**
 * Create configured multer instance for avatar uploads
 * @param {string} uploadDir - Directory to store uploads
 * @returns {multer.Multer}
 */
const createAvatarUpload = (uploadDir) => {
    return multer({
        storage: createAvatarStorage(uploadDir),
        fileFilter: avatarFileFilter,
        limits: {
            fileSize: MAX_AVATAR_SIZE
        }
    });
};

/**
 * Create express.static middleware with security headers for uploads
 * @param {string} uploadDir - Directory containing uploads
 * @returns {Function} Express middleware
 */
const createUploadsStatic = (uploadDir) => {
    return express.static(uploadDir, {
        setHeaders: (res, filePath) => {
            const ext = path.extname(filePath).toLowerCase();
            const safeMimeType = SAFE_MIME_TYPES[ext];

            if (safeMimeType) {
                res.set('Content-Type', safeMimeType);
            } else {
                res.set('Content-Type', 'application/octet-stream');
                res.set('Content-Disposition', 'attachment');
            }

            res.set('X-Content-Type-Options', 'nosniff');
            res.set('Cache-Control', 'public, max-age=31536000, immutable');
        }
    });
};

module.exports = {
    createAvatarUpload,
    createUploadsStatic,
    avatarFileFilter
};
