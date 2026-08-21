import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
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
  tipoPago?: string = 'CONTADO'; // CONTADO | CREDITO

  @IsString()
  @IsOptional()
  metodoPago?: string = 'EFECTIVO'; // EFECTIVO | TARJETA | TRANSFERENCIA | CHEQUE

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
  desde?: string;

  @IsString()
  @IsOptional()
  hasta?: string;
}
