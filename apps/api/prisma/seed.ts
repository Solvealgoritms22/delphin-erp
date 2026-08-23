import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Seed base plans (required by Suscripcion FK)
  const plans = [
    { id: 'trial', nombre: 'Trial Gratuito', descripcion: 'Prueba gratuita de 15 días con acceso completo.', precioMensual: 0, precioAnual: 0, maxUsuarios: 9999, maxSucursales: 9999, maxProductos: 999999 },
    { id: 'starter', nombre: 'Starter', descripcion: 'Para empezar a gestionar tu negocio.', precioMensual: 19, precioAnual: 17, maxUsuarios: 5, maxSucursales: 1, maxProductos: 500 },
    { id: 'pro', nombre: 'Pro', descripcion: 'Para negocios en crecimiento.', precioMensual: 49, precioAnual: 44, maxUsuarios: 50, maxSucursales: 10, maxProductos: 9999 },
    { id: 'enterprise', nombre: 'Enterprise', descripcion: 'Para empresas con necesidades avanzadas.', precioMensual: 119, precioAnual: 107, maxUsuarios: 9999, maxSucursales: 9999, maxProductos: 999999 },
  ];

  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { id: plan.id },
      update: plan,
      create: plan,
    });
  }

  // Create Empresa 1 (main tenant)
  const empresa = await prisma.empresa.upsert({
    where: { rnc: '123456789' },
    update: {},
    create: {
      razonSocial: 'Dolphin ERP Corp',
      rnc: '123456789',
      estado: 'ACTIVA'
    }
  });

  // Create Empresa 2 (secondary tenant for the same user)
  const empresa2 = await prisma.empresa.upsert({
    where: { rnc: '987654321' },
    update: {},
    create: {
      razonSocial: 'Acme Corporation',
      rnc: '987654321',
      estado: 'ACTIVA'
    }
  });

  // Create the admin user (global, not tenant-bound)
  const passwordHash = await bcrypt.hash('admin123', 10);

  const user = await prisma.usuario.upsert({
    where: { email: 'admin@dolphin.com' },
    update: { passwordHash },
    create: {
      email: 'admin@dolphin.com',
      passwordHash,
    }
  });

  // Link user to Empresa 1 as owner
  await prisma.membresia.upsert({
    where: {
      usuarioId_empresaId: {
        usuarioId: user.id,
        empresaId: empresa.id
      }
    },
    update: { estado: 'ACTIVO' },
    create: {
      usuarioId: user.id,
      empresaId: empresa.id,
      estado: 'ACTIVO'
    }
  });
  await prisma.empresa.update({
    where: { id: empresa.id },
    data: { propietarioId: user.id }
  });

  // Link same user to Empresa 2
  await prisma.membresia.upsert({
    where: {
      usuarioId_empresaId: {
        usuarioId: user.id,
        empresaId: empresa2.id
      }
    },
    update: { estado: 'ACTIVO' },
    create: {
      usuarioId: user.id,
      empresaId: empresa2.id,
      estado: 'ACTIVO'
    }
  });
  await prisma.empresa.update({
    where: { id: empresa2.id },
    data: { propietarioId: user.id }
  });

  console.log('✅ Seeding complete.');
  console.log(`   User: admin@dolphin.com | Pass: admin123`);
  console.log(`   Tenants: "${empresa.razonSocial}" + "${empresa2.razonSocial}"`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
