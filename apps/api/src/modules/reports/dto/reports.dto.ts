import { IsOptional, IsString, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

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
