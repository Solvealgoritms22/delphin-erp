import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class InvoiceItemDto {
  @IsString()
  @IsNotEmpty()
  productoId: string;

  @IsNumber()
  @Min(0.01)
  cantidad: number;

  @IsNumber()
  @Min(0)
  precioUnitario: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  tasaItbis?: number;

  @IsString()
  @IsOptional()
  impuestoId?: string;
}

export class CreateInvoiceDto {
  @IsString()
  @IsOptional()
  clienteId?: string;

  @IsString()
  @IsOptional()
  almacenId?: string;

  @IsString()
  @IsOptional()
  sucursalId?: string;

  @IsString()
  @IsOptional()
  tipoNcf?: string; // E31, E32, E34, B01, B02, B14, B15

  @IsBoolean()
  @IsOptional()
  esBorrador?: boolean;

  @IsString()
  @IsOptional()
  estado?: string; // BORRADOR | EMITIDA

  @IsString()
  @IsOptional()
  tipoPago?: string; // CONTADO | CREDITO

  @IsString()
  @IsOptional()
  metodoPago?: string; // EFECTIVO | TARJETA | TRANSFERENCIA | CHEQUE

  @IsString()
  @IsOptional()
  moneda?: string;

  @IsNumber()
  @Min(0.000001)
  @IsOptional()
  tasaCambio?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  descuento?: number;

  @IsString()
  @IsOptional()
  terminoPagoId?: string;

  @IsString()
  @IsOptional()
  fechaVencimiento?: string;

  @IsString()
  @IsOptional()
  ncfModificado?: string;

  @IsString()
  @IsOptional()
  motivoModificacion?: string;

  @IsString()
  @IsOptional()
  notas?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InvoiceItemDto)
  items: InvoiceItemDto[];
}

export class FilterInvoiceDto {
  @IsString()
  @IsOptional()
  search?: string;

  @IsString()
  @IsOptional()
  clienteId?: string;

  @IsString()
  @IsOptional()
  estado?: string;

  @IsString()
  @IsOptional()
  fiscalbridgeStatus?: string;

  @IsString()
  @IsOptional()
  tipoNcf?: string;

  @IsString()
  @IsOptional()
  tipoPago?: string;

  @IsString()
  @IsOptional()
  metodoPago?: string;

  @IsString()
  @IsOptional()
  desde?: string;

  @IsString()
  @IsOptional()
  hasta?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  minTotal?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  maxTotal?: number;

  // ---- Pagination ----
  @IsNumber()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @IsNumber()
  @Min(1)
  @Max(100)
  @IsOptional()
  @Type(() => Number)
  limit?: number;

  @IsString()
  @IsOptional()
  orderBy?: string; // fecha | total | numeroFactura

  @IsString()
  @IsOptional()
  orderDir?: 'asc' | 'desc';
}

