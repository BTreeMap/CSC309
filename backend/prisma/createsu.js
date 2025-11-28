/*
 * Complete this script so that it is able to add a superuser to the database
 * Usage example: 
 *   node prisma/createsu.js clive123 clive.su@mail.utoronto.ca SuperUser123!
 */
'use strict';

require('dotenv').config();

(async () => {
    const args = process.argv;

    if (args.length !== 5) {
        console.error("usage: node prisma/createsu.js <username> <email> <password>");
        process.exit(1);
    }

    const [, , username, email, password] = args;

    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    const bcrypt = require('bcrypt');

    const superUser = await prisma.user.create({
        data: {
            utorid: username,
            name: username,
            email: email,
            isVerified: true,
            passwordBcrypt: await bcrypt.hash(password, 12),
            role: 'superuser',
            points: 0,
            suspicious: false
        }
    });

    console.log(`Created superuser: ${superUser.utorid} (${superUser.email})`);
    await prisma.$disconnect();
})();