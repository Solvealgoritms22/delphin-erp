import { PrismaService } from '../../prisma/prisma.service';

function createDelegates() {
  return {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    upsert: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn(),
    groupBy: jest.fn(),
    aggregate: jest.fn(),
    createMany: jest.fn(),
  };
}

export function createPrismaMock() {
  const prisma: any = {
    usuario: createDelegates(),
    empresa: createDelegates(),
    membresia: createDelegates(),
    role: createDelegates(),
    sucursal: createDelegates(),
    categoria: createDelegates(),
    marca: createDelegates(),
    unidadMedida: createDelegates(),
    producto: createDelegates(),
    cliente: createDelegates(),
    proveedor: createDelegates(),
    plan: createDelegates(),
    suscripcion: createDelegates(),
    factura: createDelegates(),
    facturaVenta: createDelegates(),
    facturaVentaDetalle: createDelegates(),
    facturaCompra: createDelegates(),
    cotizacion: createDelegates(),
    impuesto: createDelegates(),
    activityLog: createDelegates(),
    userSession: createDelegates(),
    notification: createDelegates(),
    notificationDelivery: createDelegates(),
    notificationPreference: createDelegates(),
    pushSubscription: createDelegates(),
    outboxEvent: createDelegates(),
    configuracionEmpresa: createDelegates(),
    googleDriveConnection: createDelegates(),
    backup: createDelegates(),
    almacen: createDelegates(),
    inventarioStock: createDelegates(),
    inventarioMovimiento: createDelegates(),
    movimientoInventario: createDelegates(),
    productoInsumo: createDelegates(),
    impuestoFactura: createDelegates(),
    authFlow: createDelegates(),
    billingAttempt: createDelegates(),
    $queryRaw: jest.fn(),
    $executeRaw: jest.fn(),
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    $transaction: jest.fn((work: any) => typeof work === 'function' ? work({ ...prisma }) : Promise.all(work)),
  };

  return {
    prisma,
    provider: {
      provide: PrismaService,
      useValue: prisma,
    },
  };
}
