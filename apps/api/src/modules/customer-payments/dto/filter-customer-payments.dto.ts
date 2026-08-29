import { IsOptional, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class FilterCustomerPaymentsDto {
  @ApiPropertyOptional({ description: 'Término de búsqueda (No. Recibo, Cliente, Referencia)' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filtrar por cliente específico' })
  @IsOptional()
  @IsString()
  clienteId?: string;

  @ApiPropertyOptional({ description: 'Filtrar por método de pago' })
  @IsOptional()
  @IsString()
  metodo?: string;

  @ApiPropertyOptional({ description: 'Filtrar por estado (REGISTRADO, ANULADO)' })
  @IsOptional()
  @IsString()
  estado?: string;

  @ApiPropertyOptional({ description: 'Fecha inicio de emisión (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  desde?: string;

  @ApiPropertyOptional({ description: 'Fecha fin de emisión (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  hasta?: string;

  @ApiPropertyOptional({ description: 'Página actual', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Elementos por página', default: 25 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 25;
}
