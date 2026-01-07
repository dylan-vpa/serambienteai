
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function generate() {
    const email = 'admin@serambiente.com';
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
        console.error('Admin user not found');
        return;
    }

    const token = jwt.sign(
        { userId: user.id },
        process.env.JWT_SECRET as string,
        { expiresIn: '365d' }
    );

    console.log('\n=== TOKEN DE 1 AÑO ===');
    console.log(token);
    console.log('======================\n');
}

generate()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
