import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class EmpresasService {
  private static readonly PLANS = [
    {
      id: 'trial',
      nombre: 'Trial Gratuito',
      descripcion: 'Prueba gratuita de 15 días con acceso completo.',
      precioMensual: 0,
      precioAnual: 0,
      caracteristicas: [
        'Acceso completo por 15 días',
        'Sin tarjeta de crédito requerida',
        'Todos los módulos incluidos',
      ],
    },
    {
      id: 'starter',
      nombre: 'Starter',
      descripcion: 'Para empezar a gestionar tu negocio.',
      precioMensual: 19,
      precioAnual: 17,
      caracteristicas: [
        'Hasta 5 miembros',
        'Productos ilimitados',
        'Soporte por correo',
      ],
    },
    {
      id: 'pro',
      nombre: 'Pro',
      descripcion: 'Para negocios en crecimiento.',
      precioMensual: 49,
      precioAnual: 44,
      destacado: true,
      caracteristicas: [
        'Hasta 50 miembros',
        'Cuentas con sucursales',
        'Reportes de actividad',
        'Soporte prioritario',
      ],
    },
    {
      id: 'enterprise',
      nombre: 'Enterprise',
      descripcion: 'Para empresas con necesidades avanzadas.',
      precioMensual: 119,
      precioAnual: 107,
      caracteristicas: [
        'Miembros ilimitados',
        'Todo lo de Pro',
        'Soporte dedicado',
        'API avanzada',
      ],
    },
  ];

  constructor(private prisma: PrismaService) {}

  getPlans() {
    return EmpresasService.PLANS;
  }

  async findCurrent(empresaId: string) {
    const empresa = await this.prisma.empresa.findUnique({
      where: { id: empresaId },
      include: {
        propietario: {
          select: { id: true, email: true },
        },
      },
    });
    if (!empresa) throw new NotFoundException('Empresa no encontrada');
    return empresa;
  }

  async updateCurrent(empresaId: string, data: any) {
    return this.prisma.empresa.update({
      where: { id: empresaId },
      data,
    });
  }

  async create(userId: string, data: any) {
    const { razonSocial, rnc, telefono, email, paginaWeb, descripcion, logo } = data;

    // Calcular la fecha de expiración del trial: +15 días
    const trialExpiry = new Date();
    trialExpiry.setDate(trialExpiry.getDate() + 15);

    return this.prisma.empresa.create({
      data: {
        razonSocial: razonSocial || 'Nueva Empresa',
        rnc: rnc || null,
        telefono: telefono || null,
        email: email || null,
        paginaWeb: paginaWeb || null,
        descripcion: descripcion || null,
        logo: logo || null,
        propietarioId: userId,
        membresias: {
          create: {
            usuarioId: userId,
            estado: 'ACTIVO',
          },
        },
        // Trial gratuito de 15 días al crear la empresa
        suscripcion: {
          create: {
            planId: 'trial',
            estado: 'TRIAL',
            periodicidad: 'MONTHLY',
            fechaRenovacion: trialExpiry,
          },
        },
      },
    });
  }

  async update(userId: string, empresaId: string, data: any) {
    // Verificamos que el usuario sea el propietario de esta empresa
    const empresa = await this.prisma.empresa.findUnique({
      where: { id: empresaId },
    });
    if (!empresa) throw new NotFoundException('Empresa no encontrada');
    if (empresa.propietarioId !== userId) {
      throw new Error('No tienes permisos para editar esta empresa');
    }

    const updateData: any = {};
    if (data.razonSocial !== undefined)
      updateData.razonSocial = data.razonSocial;
    if (data.rnc !== undefined) updateData.rnc = data.rnc;
    if (data.telefono !== undefined) updateData.telefono = data.telefono;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.paginaWeb !== undefined) updateData.paginaWeb = data.paginaWeb;
    if (data.descripcion !== undefined)
      updateData.descripcion = data.descripcion;
    if (data.logo !== undefined) updateData.logo = data.logo;

    return this.prisma.empresa.update({
      where: { id: empresaId },
      data: updateData,
    });
  }

  async remove(userId: string, empresaId: string) {
    const empresa = await this.prisma.empresa.findUnique({
      where: { id: empresaId },
    });
    if (!empresa) throw new NotFoundException('Empresa no encontrada');
    if (empresa.propietarioId !== userId) {
      throw new Error('No tienes permisos para eliminar esta empresa');
    }

    return this.prisma.empresa.delete({
      where: { id: empresaId },
    });
  }

  async findAllForUser(userId: string) {
    // Companies owned by the main account + companies where the account has an active membership
    const [owned, membresias] = await Promise.all([
      this.prisma.empresa.findMany({ where: { propietarioId: userId } }),
      this.prisma.membresia.findMany({
        where: { usuarioId: userId, estado: 'ACTIVO' },
        include: { empresa: true },
      }),
    ]);

    const map = new Map<string, any>();
    owned.forEach((e) =>
      map.set(e.id, {
        id: e.id,
         razonSocial: e.razonSocial,
         rnc: e.rnc,
         logo: e.logo,
         estado: e.estado,
      }),
    );
    membresias.forEach((m) => {
      if (!map.has(m.empresa.id)) {
        map.set(m.empresa.id, {
          id: m.empresa.id,
           razonSocial: m.empresa.razonSocial,
           rnc: m.empresa.rnc,
           logo: m.empresa.logo,
           estado: m.estado,
        });
      }
    });
    return Array.from(map.values());
  }
}
