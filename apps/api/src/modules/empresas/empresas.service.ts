import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
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
        '1 empresa incluida',
        'Acceso completo por 15 días',
        'Asistente IA integrado',
        'Catálogo de productos y clientes',
        'Sin tarjeta de crédito requerida',
      ],
    },
    {
      id: 'starter',
      nombre: 'Starter',
      descripcion: 'Para empezar a gestionar tu negocio.',
      precioMensual: 19,
      precioAnual: 17,
      caracteristicas: [
        '1 empresa incluida',
        'Hasta 5 usuarios incluidos',
        'Roles y permisos avanzados',
        'Catálogo de productos ilimitado',
        'Directorio de clientes y proveedores',
        'Asistente IA integrado',
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
        'Hasta 3 empresas incluidas',
        'Hasta 50 usuarios incluidos',
        'Hasta 5 sucursales por empresa',
        'Roles y permisos avanzados',
        'Catálogo de productos ilimitado',
        'Asistente IA con streaming',
        'Logs de auditoría y reportes',
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
        'Empresas ilimitadas (Multi-empresa)',
        'Usuarios y miembros ilimitados',
        'Sucursales ilimitadas',
        'Roles y permisos avanzados',
        'Catálogo de productos ilimitado',
        'Agente IA completo',
        'Soporte dedicado 24/7',
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

  async updateCurrent(userId: string, empresaId: string, data: any) {
    if (!empresaId) throw new BadRequestException('Empresa activa requerida');
    const empresa = await this.prisma.empresa.findUnique({
      where: { id: empresaId },
      select: { propietarioId: true },
    });
    if (!empresa) throw new NotFoundException('Empresa no encontrada');
    if (empresa.propietarioId !== userId)
      throw new ForbiddenException(
        'Solo el propietario puede actualizar la empresa',
      );
    const updateData: any = {};
    for (const field of [
      'razonSocial',
      'rnc',
      'pais',
      'direccion',
      'telefono',
      'email',
      'paginaWeb',
      'descripcion',
      'logo',
    ]) {
      if (data[field] !== undefined) updateData[field] = data[field];
    }
    return this.prisma.empresa.update({
      where: { id: empresaId },
      data: updateData,
      select: {
        id: true,
        razonSocial: true,
        rnc: true,
        pais: true,
        direccion: true,
        telefono: true,
        email: true,
        paginaWeb: true,
        descripcion: true,
        logo: true,
        estado: true,
        propietarioId: true,
        creadoEn: true,
      },
    });
  }

  async create(userId: string, data: any) {
    const {
      razonSocial,
      rnc,
      pais,
      direccion,
      telefono,
      email,
      paginaWeb,
      descripcion,
      logo,
    } = data;

    // Verificar límite de empresas según el plan del usuario
    const userOwnedCount = await this.prisma.empresa.count({
      where: { propietarioId: userId },
    });

    if (userOwnedCount > 0) {
      const existingEmpresas = await this.prisma.empresa.findMany({
        where: { propietarioId: userId },
        include: { suscripcion: true },
      });

      let maxEmpresas = 1;
      for (const emp of existingEmpresas) {
        const plan = emp.suscripcion?.planId?.toLowerCase();
        if (plan === 'enterprise') {
          maxEmpresas = 999999;
          break;
        } else if (plan === 'pro') {
          maxEmpresas = Math.max(maxEmpresas, 3);
        }
      }

      if (userOwnedCount >= maxEmpresas) {
        throw new BadRequestException(
          `Has alcanzado el límite de empresas permitidas para tu plan (${maxEmpresas} empresa${maxEmpresas > 1 ? 's' : ''}). Actualiza tu plan a Pro o Enterprise para crear más empresas.`,
        );
      }
    }

    // Calcular la fecha de expiración del trial: +15 días
    const trialExpiry = new Date();
    trialExpiry.setDate(trialExpiry.getDate() + 15);

    return this.prisma.empresa.create({
      data: {
        razonSocial: razonSocial || 'Nueva Empresa',
        rnc: rnc || null,
        pais: pais || 'DO',
        direccion: direccion || null,
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
      } as any,
    });
  }

  async update(userId: string, empresaId: string, data: any) {
    // Verificamos que el usuario sea el propietario de esta empresa
    const empresa = await this.prisma.empresa.findUnique({
      where: { id: empresaId },
    });
    if (!empresa) throw new NotFoundException('Empresa no encontrada');
    if (empresa.propietarioId !== userId) {
      throw new ForbiddenException(
        'No tienes permisos para editar esta empresa',
      );
    }

    const updateData: any = {};
    if (data.razonSocial !== undefined)
      updateData.razonSocial = data.razonSocial;
    if (data.rnc !== undefined) updateData.rnc = data.rnc;
    if (data.pais !== undefined) updateData.pais = data.pais;
    if (data.direccion !== undefined) updateData.direccion = data.direccion;
    if (data.telefono !== undefined) updateData.telefono = data.telefono;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.paginaWeb !== undefined) updateData.paginaWeb = data.paginaWeb;
    if (data.descripcion !== undefined)
      updateData.descripcion = data.descripcion;
    if (data.logo !== undefined) updateData.logo = data.logo;
    // FiscalBridge
    if (data.fiscalbridgeEnabled !== undefined)
      updateData.fiscalbridgeEnabled = data.fiscalbridgeEnabled;
    if (data.fiscalbridgeUrl !== undefined)
      updateData.fiscalbridgeUrl = data.fiscalbridgeUrl;
    if (data.fiscalbridgeAuthMethod !== undefined)
      updateData.fiscalbridgeAuthMethod = data.fiscalbridgeAuthMethod;
    if (data.fiscalbridgeToken !== undefined)
      updateData.fiscalbridgeToken = data.fiscalbridgeToken;
    if (data.fiscalbridgeEmail !== undefined)
      updateData.fiscalbridgeEmail = data.fiscalbridgeEmail;
    if (data.fiscalbridgePassword !== undefined)
      updateData.fiscalbridgePassword = data.fiscalbridgePassword;
    if (data.fiscalbridgeClientId !== undefined)
      updateData.fiscalbridgeClientId = data.fiscalbridgeClientId;
    if (data.fiscalbridgeClientSecret !== undefined)
      updateData.fiscalbridgeClientSecret = data.fiscalbridgeClientSecret;
    if (data.fiscalbridgeEnv !== undefined)
      updateData.fiscalbridgeEnv = data.fiscalbridgeEnv;
    if (data.fiscalbridgeWebhookSecret !== undefined)
      updateData.fiscalbridgeWebhookSecret =
        data.fiscalbridgeWebhookSecret || null;
    // SMTP fields were moved to User profile

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
      throw new ForbiddenException(
        'No tienes permisos para eliminar esta empresa',
      );
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
    owned.forEach((e) => map.set(e.id, e));
    membresias.forEach((m) => {
      if (!map.has(m.empresa.id)) {
        map.set(m.empresa.id, m.empresa);
      }
    });
    return Array.from(map.values());
  }
}
