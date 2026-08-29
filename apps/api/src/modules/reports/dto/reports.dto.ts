import { IsOptional, IsString, IsNumber, Min, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';

export class DateRangeReportDto {
  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;

  @IsOptional()
  @IsString()
  sucursalId?: string;

  @IsOptional()
  @IsString()
  groupBy?: 'day' | 'week' | 'month';
}

export class TopProductsReportDto extends DateRangeReportDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  limit?: number = 10;
}

export class InventoryReportDto {
  @IsOptional()
  @IsString()
  almacenId?: string;

  @IsOptional()
  @IsString()
  categoriaId?: string;
}

export class TaxReportDto {
  @ApiProperty({ description: 'Período fiscal en formato YYYYMM o YYYY-MM (ej: 202608 o 2026-08)' })
  @IsString()
  @IsNotEmpty()
  periodo: string;

  @ApiPropertyOptional({ description: 'Filtrar por sucursal específica' })
  @IsOptional()
  @IsString()
  sucursalId?: string;
}
