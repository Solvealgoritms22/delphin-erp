import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async create(empresaId: string, data: any) {
    const { imagenes, ...productData } = data;
    const tax = await this.resolveTax(empresaId, productData.impuestoId);
    return this.prisma.producto.create({
      data: {
        ...productData,
        ...(tax ? { taxRate: tax.tasa } : {}),
        ...(imagenes !== undefined
          ? { imagenes: this.normalizeImages(imagenes) }
          : {}),
        empresaId,
      },
    });
  }

  async findAll(empresaId: string) {
    return this.prisma.producto.findMany({
      where: { empresaId },
      include: {
        categoria: true,
        marca: true,
        unidadMedida: true,
        impuesto: true,
      },
    });
  }

  async findOne(empresaId: string, id: string) {
    const producto = await this.prisma.producto.findFirst({
      where: { id, empresaId },
      include: {
        categoria: true,
        marca: true,
        unidadMedida: true,
        impuesto: true,
      },
    });
    if (!producto) throw new NotFoundException('Producto no encontrado');
    return producto;
  }

  async update(empresaId: string, id: string, data: any) {
    await this.findOne(empresaId, id); // check existence
    const { imagenes, ...productData } = data;
    const tax = await this.resolveTax(empresaId, productData.impuestoId);
    return this.prisma.producto.update({
      where: { id },
      data: {
        ...productData,
        ...(imagenes !== undefined
          ? { imagenes: this.normalizeImages(imagenes) }
          : {}),
        ...(tax ? { taxRate: tax.tasa } : {}),
      },
    });
  }

  async remove(empresaId: string, id: string) {
    await this.findOne(empresaId, id);
    return this.prisma.producto.delete({
      where: { id },
    });
  }

  private normalizeImages(value: unknown): string | null {
    if (value === null || value === undefined || value === '') return null;
    let images: unknown = value;
    if (typeof value === 'string') {
      try {
        images = JSON.parse(value);
      } catch {
        images = [value];
      }
    }
    if (!Array.isArray(images))
      throw new BadRequestException(
        'Las imágenes deben enviarse como una lista',
      );
    if (images.length > 5)
      throw new BadRequestException(
        'Un producto puede tener como máximo 5 imágenes',
      );
    if (images.some((image) => typeof image !== 'string')) {
      throw new BadRequestException('El formato de las imágenes no es válido');
    }
    return JSON.stringify(images);
  }

  private async resolveTax(empresaId: string, impuestoId?: string) {
    if (!impuestoId) return null;
    const tax = await this.prisma.impuesto.findFirst({
      where: { id: impuestoId, empresaId, activo: true },
    });
    if (!tax)
      throw new BadRequestException(
        'El impuesto no pertenece a la empresa o está inactivo',
      );
    return tax;
  }
}
