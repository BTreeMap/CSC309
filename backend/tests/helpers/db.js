'use strict';

const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { prisma } = require('../..');

const clearDatabase = async () => {
    await prisma.transactionPromotion.deleteMany({});
    await prisma.userPromotionUse.deleteMany({});
    await prisma.eventGuest.deleteMany({});
    await prisma.eventOrganizer.deleteMany({});
    await prisma.transaction.deleteMany({});
    await prisma.resetToken.deleteMany({});
    await prisma.promotion.deleteMany({});
    await prisma.event.deleteMany({});
    await prisma.user.deleteMany({});
};

const createUserWithRole = async (role = 'regular', overrides = {}) => {
    const password = overrides.password || 'TestPass123!';
    const passwordBcrypt = await bcrypt.hash(password, 12);
    const uniqueSuffix = crypto.randomBytes(4).toString('hex');
    const rawUtorid = (overrides.utorid || `tester${uniqueSuffix}`).slice(0, 8);
    const utorid = rawUtorid.padEnd(7, '0');
    const email = overrides.email || `${utorid}@mail.utoronto.ca`;
    const name = overrides.name || 'Test User';

    const user = await prisma.user.create({
        data: {
            utorid,
            email,
            name,
            passwordBcrypt,
            role,
            isVerified: overrides.isVerified ?? true,
            suspicious: overrides.suspicious ?? false,
            points: overrides.points ?? 0
        }
    });

    return { user, password };
};

module.exports = {
    prisma,
    clearDatabase,
    createUserWithRole
};
