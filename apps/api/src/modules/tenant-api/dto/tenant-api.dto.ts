import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  ArrayMaxSize,
  IsUrl,
} from 'class-validator';

export class CreateTenantApiAppDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre de la aplicación es requerido.' })
  nombre: string;

  @IsString()
  @IsOptional()
  descripcion?: string;

  @IsArray({ message: 'Los orígenes permitidos deben ser una lista.' })
  @ArrayMaxSize(2, { message: 'Solo se permiten hasta 2 orígenes/sistemas externos.' })
  @IsString({ each: true })
  @IsOptional()
  allowedOrigins?: string[];
}

export class UpdateTenantApiAppDto {
  @IsString()
  @IsOptional()
  nombre?: string;

  @IsString()
  @IsOptional()
  descripcion?: string;

  @IsArray()
  @ArrayMaxSize(2, { message: 'Solo se permiten hasta 2 orígenes/sistemas externos.' })
  @IsString({ each: true })
  @IsOptional()
  allowedOrigins?: string[];
}

export class QueryPublicProductsDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  categoriaId?: string;

  @IsOptional()
  @IsString()
  tipo?: string;

  @IsOptional()
  page?: number = 1;

  @IsOptional()
  limit?: number = 25;
}

export class QueryPublicInvoicesDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  desde?: string;

  @IsOptional()
  @IsString()
  hasta?: string;

  @IsOptional()
  @IsString()
  estado?: string;

  @IsOptional()
  page?: number = 1;

  @IsOptional()
  limit?: number = 25;
}

export class QueryPublicClientsDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  page?: number = 1;

  @IsOptional()
  limit?: number = 25;
}
