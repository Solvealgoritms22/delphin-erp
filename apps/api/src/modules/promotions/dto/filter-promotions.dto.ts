import { IsOptional, IsString, IsIn } from 'class-validator';

export class FilterPromotionsDto {
  @IsString()
  @IsOptional()
  search?: string;

  @IsString()
  @IsIn(['TODOS', 'ACTIVO', 'INACTIVO', 'EXPIRADO', 'PAUSADO', 'PROGRAMADO'])
  @IsOptional()
  estado?: string;

  @IsString()
  @IsIn(['TODOS', 'CATEGORIA', 'MARCA', 'PRODUCTOS'])
  @IsOptional()
  alcance?: string;

  @IsString()
  @IsOptional()
  categoriaId?: string;

  @IsString()
  @IsOptional()
  marcaId?: string;

  @IsString()
  @IsOptional()
  productoId?: string;
}
