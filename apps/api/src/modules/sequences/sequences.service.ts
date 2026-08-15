import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSequenceDto, UpdateSequenceDto } from './dto/sequence.dto';

@Injectable()
export class SequencesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(empresaId: string, dto: CreateSequenceDto) {
    const existing = await this.prisma.secuenciaNCF.findUnique({
      where: {
        empresaId_prefijo_ambiente: {
          empresaId,
          prefijo: dto.prefijo.toUpperCase(),
          ambiente: dto.ambiente || 'TEST',
        },
      },
    });

    if (existing) {
      throw new BadRequestException(
        `Ya existe una secuencia con el prefijo ${dto.prefijo} para el ambiente ${dto.ambiente || 'TEST'}`,
      );
    }

    return this.prisma.secuenciaNCF.create({
      data: {
        empresaId,
        nombre: dto.nombre,
        tipo: dto.tipo.toUpperCase(),
        prefijo: dto.prefijo.toUpperCase(),
        numeroActual: dto.numeroActual || 1,
        numeroHasta: dto.numeroHasta || 99999999,
        fechaVencimiento: dto.fechaVencimiento ? new Date(dto.fechaVencimiento) : null,
        activa: dto.activa ?? true,
        ambiente: dto.ambiente || 'TEST',
      },
    });
  }

  async findAll(empresaId: string) {
    return this.prisma.secuenciaNCF.findMany({
      where: { empresaId },
      orderBy: [{ tipo: 'asc' }, { ambiente: 'asc' }],
    });
  }

  async findOne(empresaId: string, id: string) {
    const sequence = await this.prisma.secuenciaNCF.findFirst({
      where: { id, empresaId },
    });
    if (!sequence) {
      throw new NotFoundException('Secuencia NCF no encontrada');
    }
    return sequence;
  }

  async update(empresaId: string, id: string, dto: UpdateSequenceDto) {
    await this.findOne(empresaId, id);

    return this.prisma.secuenciaNCF.update({
      where: { id },
      data: {
        ...(dto.nombre && { nombre: dto.nombre }),
        ...(dto.numeroActual !== undefined && { numeroActual: dto.numeroActual }),
        ...(dto.numeroHasta !== undefined && { numeroHasta: dto.numeroHasta }),
        ...(dto.fechaVencimiento !== undefined && {
          fechaVencimiento: dto.fechaVencimiento ? new Date(dto.fechaVencimiento) : null,
        }),
        ...(dto.activa !== undefined && { activa: dto.activa }),
        ...(dto.ambiente && { ambiente: dto.ambiente }),
      },
    });
  }

  async delete(empresaId: string, id: string) {
    await this.findOne(empresaId, id);
    return this.prisma.secuenciaNCF.delete({ where: { id } });
  }

  /**
   * Obtiene y reserva atómicamente el siguiente NCF / e-NCF para una empresa y tipo de comprobante.
   */
  async getNextNCF(empresaId: string, tipoNcf: string, ambiente: string = 'TEST'): Promise<{ ncf: string; secuenciaId: string }> {
    const prefijo = tipoNcf.toUpperCase();
    const env = ambiente.toUpperCase();

    return this.prisma.$transaction(async (tx) => {
      const sequence = await tx.secuenciaNCF.findUnique({
        where: {
          empresaId_prefijo_ambiente: {
            empresaId,
            prefijo,
            ambiente: env,
          },
        },
      });

      if (!sequence || !sequence.activa) {
        throw new BadRequestException(
          `No hay una secuencia NCF activa configurada para el tipo ${prefijo} en ambiente ${env}. Configúrela en Ajustes > Comprobantes Fiscales.`,
        );
      }

      if (sequence.fechaVencimiento && sequence.fechaVencimiento < new Date()) {
        throw new BadRequestException(
          `La secuencia NCF ${prefijo} ha vencido el ${sequence.fechaVencimiento.toISOString().split('T')[0]}. Solicite una nueva autorización en la DGII.`,
        );
      }

      if (sequence.numeroActual > sequence.numeroHasta) {
        throw new BadRequestException(
          `La secuencia NCF ${prefijo} se encuentra agotada (Límite: ${sequence.numeroHasta}). Registre un nuevo rango autorizado por la DGII.`,
        );
      }

      const currentNum = sequence.numeroActual;

      // Formato NCF / e-CF DGII:
      // e-CF (E31, E32, E34, etc.): E + 2 dígitos tipo + 10 dígitos correlativo = 13 caracteres (ej: E310000000001)
      // NCF Tradicional (B01, B02, B04, etc.): B + 2 dígitos tipo + 8 dígitos correlativo = 11 caracteres (ej: B0100000001)
      let formattedNcf = '';
      if (prefijo.startsWith('E')) {
        const paddingLength = 10;
        formattedNcf = `${prefijo}${currentNum.toString().padStart(paddingLength, '0')}`;
      } else {
        const paddingLength = 8;
        formattedNcf = `${prefijo}${currentNum.toString().padStart(paddingLength, '0')}`;
      }

      // Incrementar secuencia
      await tx.secuenciaNCF.update({
        where: { id: sequence.id },
        data: { numeroActual: currentNum + 1 },
      });

      return {
        ncf: formattedNcf,
        secuenciaId: sequence.id,
      };
    });
  }
}
