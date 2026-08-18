import {
  IsArray,
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
  tasaItbis?: number = 18;
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
  @IsNotEmpty()
  tipoNcf: string; // E31, E32, E34, B01, B02, B14, B15

  @IsString()
  @IsOptional()
  tipoPago?: string = 'CONTADO'; // CONTADO | CREDITO

  @IsString()
  @IsOptional()
  metodoPago?: string = 'EFECTIVO'; // EFECTIVO | TARJETA | TRANSFERENCIA | CHEQUE

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
