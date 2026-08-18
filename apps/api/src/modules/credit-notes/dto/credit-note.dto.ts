import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreditNoteLineDto {
  @IsString()
  @IsNotEmpty()
  detalleOriginalId: string;

  @Min(0.0001)
  cantidad: number;
}

export class CreateCreditNoteDto {
  @IsString()
  @IsNotEmpty()
  facturaOriginalId: string;

  /** Código de modificación DGII: 1 Anulación, 2 Corrección, 3 Devolución, 4 Descuento, 5 Otro */
  @IsString()
  @IsNotEmpty()
  @MaxLength(4)
  motivoModificacion: string;

  @IsBoolean()
  @IsOptional()
  returnToInventory?: boolean;

  @IsString()
  @IsOptional()
  notas?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreditNoteLineDto)
  lines: CreditNoteLineDto[];
}
