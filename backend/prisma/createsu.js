/*
 * Complete this script so that it is able to add a superuser to the database
 * Usage example: 
 *   node prisma/createsu.js clive123 clive.su@mail.utoronto.ca SuperUser123!
 *   or run without arguments for interactive mode
 */
'use strict';

require('dotenv').config();

const readline = require('readline');

function question(query) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise(resolve => rl.question(query, ans => {
        rl.close();
        resolve(ans);
    }));
}

(async () => {
    const args = process.argv;
    let username, email, password;

    if (args.length === 5) {
        [, , username, email, password] = args;
    } else {
        console.log('Interactive superuser creation mode');
        username = await question('Username: ');
        email = await question('Email: ');
        password = await question('Password: ');
    }

    if (!username || !email || !password) {
        console.error('Error: Username, email, and password are required');
        process.exit(1);
    }

    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    const bcrypt = require('bcrypt');

    try {
        const existingUser = await prisma.user.findFirst({
            where: {
                OR: [
                    { utorid: username },
                    { email: email }
                ]
            }
        });

        if (existingUser) {
            console.error(`Error: User with username "${username}" or email "${email}" already exists`);
            process.exit(1);
        }

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
    } catch (error) {
        console.error('Error creating superuser:', error.message);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
})();