import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum PurchasePaymentType {
  CONTADO = 'CONTADO',
  CREDITO = 'CREDITO',
}

export enum PurchasePaymentMethod {
  EFECTIVO = 'EFECTIVO',
  TRANSFERENCIA = 'TRANSFERENCIA',
  CHEQUE = 'CHEQUE',
  TARJETA = 'TARJETA',
  OTRO = 'OTRO',
}

export class PurchaseItemDto {
  @IsOptional()
  @IsUUID()
  productoId?: string;

  @IsString()
  @IsNotEmpty({ message: 'La descripción del item es requerida.' })
  descripcion: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.0001, { message: 'La cantidad debe ser mayor a 0.' })
  cantidad: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0, { message: 'El costo unitario debe ser mayor o igual a 0.' })
  costoUnitario: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  descuento?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  tasaItbis?: number;

  @IsOptional()
  @IsBoolean()
  afectaInventario?: boolean;
}

export class CreatePurchaseDto {
  @IsUUID('4', { message: 'ID de proveedor inválido.' })
  @IsNotEmpty({ message: 'El proveedor es requerido.' })
  proveedorId: string;

  @IsOptional()
  @IsUUID('4')
  almacenId?: string;

  @IsOptional()
  @IsUUID('4')
  sucursalId?: string;

  @IsOptional()
  @IsString()
  numeroFactura?: string;

  @IsOptional()
  @IsString()
  ncf?: string;

  @IsOptional()
  @IsString()
  tipoNcf?: string;

  @IsOptional()
  @IsString()
  ncfModificado?: string;

  @IsOptional()
  @IsString()
  tipoGasto?: string; // Clasificación DGII 606 (01 a 11)

  @IsOptional()
  @IsString()
  fecha?: string;

  @IsOptional()
  @IsString()
  fechaVencimiento?: string;

  @IsEnum(PurchasePaymentType, {
    message: 'El tipo de pago debe ser CONTADO o CREDITO.',
  })
  tipoPago: PurchasePaymentType;

  @IsOptional()
  @IsEnum(PurchasePaymentMethod, {
    message: 'Método de pago inválido.',
  })
  metodoPago?: PurchasePaymentMethod;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  descuento?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  itbisRetenido?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  retencionRenta?: number;

  @IsOptional()
  @IsString()
  notas?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurchaseItemDto)
  @IsNotEmpty({ message: 'La compra debe incluir al menos un item.' })
  items: PurchaseItemDto[];
}
