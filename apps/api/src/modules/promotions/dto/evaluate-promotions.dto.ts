import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class EvaluateItemDto {
  @IsString()
  @IsNotEmpty()
  productoId: string;

  @IsNumber()
  @Min(0.0001)
  cantidad: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  precioUnitario?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  descuentoManual?: number; // Descuento ingresado manualmente por el cajero
}

export class EvaluatePromotionsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EvaluateItemDto)
  items: EvaluateItemDto[];

  @IsString()
  @IsOptional()
  codigoCupon?: string;

  @IsString()
  @IsOptional()
  clienteId?: string;
}
