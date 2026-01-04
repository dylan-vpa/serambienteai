/**
 * Seed script - Crear usuario administrador inicial
 */

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function seed() {
    console.log('🌱 Ejecutando seed...');

    // Crear usuario admin
    const adminEmail = 'admin@serambiente.com';
    const adminPassword = 'admin123';

    const existingAdmin = await prisma.user.findUnique({
        where: { email: adminEmail }
    });

    if (existingAdmin) {
        console.log('⏭️  Usuario admin ya existe');
    } else {
        const hashedPassword = await bcrypt.hash(adminPassword, 10);

        await prisma.user.create({
            data: {
                email: adminEmail,
                password: hashedPassword,
                name: 'Administrador',
                role: 'ADMIN'
            }
        });

        console.log('✅ Usuario admin creado:');
        console.log(`   📧 Email: ${adminEmail}`);
        console.log(`   🔑 Password: ${adminPassword}`);
    }

    // También crear usuario de prueba
    const testEmail = 'ingeniero@serambiente.com';
    const testPassword = 'ingeniero123';

    const existingTest = await prisma.user.findUnique({
        where: { email: testEmail }
    });

    if (!existingTest) {
        const hashedPassword = await bcrypt.hash(testPassword, 10);

        await prisma.user.create({
            data: {
                email: testEmail,
                password: hashedPassword,
                name: 'Ingeniero de Campo',
                role: 'ENGINEER'
            }
        });

        console.log('✅ Usuario ingeniero creado:');
        console.log(`   📧 Email: ${testEmail}`);
        console.log(`   🔑 Password: ${testPassword}`);
    }

    // Mostrar resumen de usuarios
    const users = await prisma.user.findMany({
        select: { email: true, name: true, role: true }
    });

    console.log('\n📊 USUARIOS EN EL SISTEMA:');
    users.forEach(u => {
        console.log(`   ${u.role}: ${u.email} (${u.name})`);
    });
}

seed()
    .then(() => {
        console.log('\n🎉 Seed completado');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Error en seed:', error);
        process.exit(1);
    })
    .finally(() => {
        prisma.$disconnect();
    });
