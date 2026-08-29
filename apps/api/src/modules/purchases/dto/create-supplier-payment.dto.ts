import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PurchasePaymentMethod } from './create-purchase.dto';

export class CreateSupplierPaymentDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0.01, { message: 'El monto del pago debe ser mayor a 0.' })
  monto: number;

  @IsEnum(PurchasePaymentMethod, {
    message: 'Método de pago inválido.',
  })
  metodo: PurchasePaymentMethod;

  @IsOptional()
  @IsString()
  referencia?: string;

  @IsOptional()
  @IsString()
  fechaPago?: string;

  @IsOptional()
  @IsString()
  notas?: string;
}
