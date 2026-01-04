"use strict";
/**
 * Seed script - Crear usuario administrador inicial
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt = __importStar(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
function seed() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('🌱 Ejecutando seed...');
        // Crear usuario admin
        const adminEmail = 'admin@serambiente.com';
        const adminPassword = 'admin123';
        const existingAdmin = yield prisma.user.findUnique({
            where: { email: adminEmail }
        });
        if (existingAdmin) {
            console.log('⏭️  Usuario admin ya existe');
        }
        else {
            const hashedPassword = yield bcrypt.hash(adminPassword, 10);
            yield prisma.user.create({
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
        const existingTest = yield prisma.user.findUnique({
            where: { email: testEmail }
        });
        if (!existingTest) {
            const hashedPassword = yield bcrypt.hash(testPassword, 10);
            yield prisma.user.create({
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
        const users = yield prisma.user.findMany({
            select: { email: true, name: true, role: true }
        });
        console.log('\n📊 USUARIOS EN EL SISTEMA:');
        users.forEach(u => {
            console.log(`   ${u.role}: ${u.email} (${u.name})`);
        });
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
