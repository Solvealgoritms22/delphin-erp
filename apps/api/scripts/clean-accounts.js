const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanAccounts() {
  console.log('🔄 Iniciando limpieza de cuentas y datos asociados...');

  // Obtenemos todas las tablas de la base de datos excepto las protegidas
  const tables = await prisma.$queryRaw`
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public' 
      AND tablename NOT IN ('_prisma_migrations', 'planes');
  `;

  console.log(`📋 Encontradas ${tables.length} tablas para limpiar (conservando 'planes' y '_prisma_migrations').`);

  // Truncamos las tablas en bloque con CASCADE
  const tableNames = tables.map(t => `"${t.tablename}"`).join(', ');

  if (tableNames.length > 0) {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tableNames} RESTART IDENTITY CASCADE;`);
    console.log('✅ Tablas truncadas exitosamente con CASCADE.');
  }

  // Verificamos el resultado
  console.log('\n🔍 Verificación de registros restantes:');
  const checkTables = ['usuarios', 'empresas', 'membresias', 'user_sessions', 'planes'];
  for (const t of checkTables) {
    try {
      const result = await prisma.$queryRawUnsafe(`SELECT count(*)::int as count FROM "${t}";`);
      console.log(`   - ${t}: ${result[0]?.count ?? 0}`);
    } catch (e) {
      console.log(`   - ${t}: no existe o error (${e.message})`);
    }
  }

  console.log('\n🎉 Limpieza completada. La estructura de la base de datos y los planes se mantuvieron intactos.');
}

cleanAccounts()
  .catch((err) => {
    console.error('❌ Error durante la limpieza:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
